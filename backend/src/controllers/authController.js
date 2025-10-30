/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login (AD auth, fetch user info from DB)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */

const jwt = require("jsonwebtoken");
const db = require("../config/db");
const ActiveDirectory = require("activedirectory2");

const AD_SERVER = process.env.AD_SERVER;
const AD_USER = process.env.AD_USER; // Service account
const AD_PASSWORD = process.env.AD_PASSWORD;
const AD_DOMAIN = process.env.AD_DOMAIN; // e.g., UNIWIN
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || "Admin@123";

function logDebug(...args) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[AUTH DEBUG]", ...args);
  }
}

exports.login = async (req, res) => {
  const { username, password } = req.body;
  logDebug("Login attempt", { username });

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    // ---------------- Fetch user from DB ----------------
    const userQuery = "SELECT * FROM user_master WHERE employee_id = $1";
    const { rows } = await db.query(userQuery, [username]);

    if (!rows.length) {
      logDebug(`User not found in database: ${username}`);
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];
    user.status = (user.status ?? "").toUpperCase();

    if (user.status !== "ACTIVE") {
      logDebug(`User is not active: ${username}`);
      return res.status(403).json({ message: "User is not active" });
    }

    // ---------------- AD Authentication (optional) ----------------
    let authenticated = false;
    const useAdAuth = process.env.USE_AD_AUTH === "true";

    if (useAdAuth && AD_SERVER && AD_USER && AD_PASSWORD && AD_DOMAIN) {
      try {
        const baseDN = "DC=uniwin,DC=local";
        const ad = new ActiveDirectory({
          url: AD_SERVER,
          username: AD_USER,
          password: AD_PASSWORD,
          baseDN,
        });

        const adUsernameOptions = [
          `${AD_DOMAIN}\\${username}`,
          `${username}@${AD_DOMAIN}.local`,
        ];

        for (const adUsername of adUsernameOptions) {
          authenticated = await new Promise((resolve) => {
            ad.authenticate(adUsername, password, (err, auth) => {
              if (err) {
                logDebug(
                  `AD authentication failed for ${adUsername}`,
                  err.message || err.lde_message
                );
                return resolve(false);
              }
              return resolve(auth);
            });
          });
          if (authenticated) {
            logDebug(`AD authentication successful for ${adUsername}`);
            break;
          }
        }
      } catch (adErr) {
        logDebug("AD service unavailable or failed:", adErr.message);
      }
    }

    // ---------------- Fallback: default DB password ----------------
    if (!authenticated && password === DEFAULT_PASSWORD) {
      logDebug(
        `AD failed or unavailable, default password used for ${username}`
      );
      authenticated = true;
    }

    if (!authenticated) {
      logDebug(`Authentication failed for ${username}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ---------------- Normalize role_id ----------------
    let roleIds = [];
    if (Array.isArray(user.role_id)) roleIds = user.role_id;
    else if (typeof user.role_id === "number") roleIds = [user.role_id];
    else if (typeof user.role_id === "string") {
      roleIds = user.role_id
        .replace(/[{}]/g, "")
        .split(",")
        .map((r) => parseInt(r.trim(), 10))
        .filter((n) => !isNaN(n));
    }
    user.role_id = roleIds;

    logDebug("User login successful:", { username, roleIds });

    // ---------------- Generate JWT ----------------
    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      user: {
        id: user.id || user.user_id,
        username: user.employee_id,
        name: user.employee_name,
        employee_code: user.employee_code,
        location: user.location,
        department: user.department,
        designation: user.designation,
        reporting_manager: user.reporting_manager ?? "",
        managers_manager: user.managers_manager ?? "",
        role_id: user.role_id,
        status: user.status,
        email: user.email,
        full_name: user.employee_name,
      },
    });
  } catch (err) {
    console.error("[AUTH ERROR]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/auth/permissions
 * Returns permission rows for the authenticated user.
 * Looks for admin_plant_permission first then falls back to user_plant_permission.
 */
exports.getPermissions = async (req, res) => {
  try {
    // Extract token from Authorization header or cookie
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;
    if (
      authHeader &&
      typeof authHeader === "string" &&
      authHeader.startsWith("Bearer ")
    ) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token)
      return res.status(401).json({ message: "Missing authentication token" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Determine user id from token payload or username
    let userId = payload.user_id || payload.id || null;
    if (!userId && payload.username) {
      // try to map username (employee_id) to internal id
      const userRes = await db.query(
        "SELECT id FROM user_master WHERE employee_id = $1 LIMIT 1",
        [payload.username]
      );
      if (userRes && userRes.rows && userRes.rows.length)
        userId = userRes.rows[0].id;
    }

    if (!userId)
      return res
        .status(400)
        .json({ message: "Unable to determine user id from token" });

    // Try to fetch from admin_plant_permission, fallback to user_plant_permission
    let permissions = [];
    try {
      const q = `SELECT id, transaction_id, user_id, plant_id, module_id, can_add, can_edit, can_view, can_delete, created_on, updated_on
                 FROM admin_plant_permission WHERE user_id = $1 ORDER BY id`;
      const { rows } = await db.query(q, [userId]);
      permissions = rows || [];
    } catch (err) {
      // Table might not exist or query failed; try alternative table
      try {
        const q2 = `SELECT id, transaction_id, user_id, plant_id, module_id, can_add, can_edit, can_view, can_delete, created_on, updated_on
                    FROM user_plant_permission WHERE user_id = $1 ORDER BY id`;
        const { rows } = await db.query(q2, [userId]);
        permissions = rows || [];
      } catch (err2) {
        // No permissions table found or other DB error - return empty list
        console.error("[PERMISSIONS FETCH ERROR]", err, err2);
        return res.json({ permissions: [] });
      }
    }

    return res.json({ permissions });
  } catch (err) {
    console.error("[GET PERMISSIONS ERROR]", err);
    return res.status(500).json({ message: "Server error" });
  }
};
