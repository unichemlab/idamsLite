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
    // ===============================================
    // 4. Fetch IT BIN Admin Status & Plant IDs
    // ===============================================
    let isITBin = false;
    let itPlantIds = [];
    let itPlants = [];

    logDebug("User login successful:", { username, roleIds });

     try
     {
      // Check if user is an IT BIN admin
      const itBinQuery = `
        SELECT 
          piau.plant_it_admin_id,
          pia.plant_id,
          pm.plant_name
        FROM plant_it_admin_users piau
        INNER JOIN plant_it_admin pia ON piau.plant_it_admin_id = pia.id
        INNER JOIN plant_master pm ON pia.plant_id = pm.id
        WHERE piau.user_id = $1 AND pia.status = 'ACTIVE'
      `;
      
      const itBinResult = await db.query(itBinQuery, [user.id]);
      
      if (itBinResult.rows.length > 0) {
        isITBin = true;
        itPlantIds = itBinResult.rows.map(row => row.plant_id);
        itPlants = itBinResult.rows.map(row => ({
          plant_id: row.plant_id,
          plant_name: row.plant_name,
          plant_it_admin_id: row.plant_it_admin_id
        }));
        
        logDebug(`User ${username} is IT BIN admin for plants:`, itPlantIds);
      }
     } catch (err) {
      console.error("[IT BIN CHECK ERROR]", err);
     }

    // ---------------- Generate JWT ----------------
    // Fetch user permissions
    // ---------------- Fetch roles dynamically ----------------
    const roleQuery = `
      SELECT rm.id, rm.role_name, rm.description, rm.status
      FROM role_master rm
      WHERE rm.id = ANY($1)
    `;
    const roleResult = await db.query(roleQuery, [roleIds]);
    user.roles = roleResult.rows.map((role) => ({
      id: role.id,
      name: role.role_name,
      description: role.description,
      status: role.status,
    }));

    // ---------------- Fetch approver status dynamically ----------------
    const approverStatusQuery = `
      SELECT COUNT(*) > 0 AS is_approver
      FROM access_log
      WHERE employee_code = $1
        AND (approver1_status = 'ACTIVE' OR approver2_status = 'ACTIVE')
    `;
    const approverStatusResult = await db.query(approverStatusQuery, [
      user.employee_code,
    ]);
    user.is_approver = approverStatusResult.rows[0]?.is_approver || false;

    logDebug("Roles and approver status fetched:", {
      roles: user.roles,
      isApprover: user.is_approver,
    });

    // ---------------- Dynamic Role Assignment ----------------
    const dynamicRoleQuery = `
      SELECT rm.id, rm.role_name
      FROM role_master rm
      WHERE rm.id = (
        SELECT role
        FROM access_log
        WHERE employee_code = $1
        ORDER BY created_on DESC
        LIMIT 1
      )
    `;
    const dynamicRoleResult = await db.query(dynamicRoleQuery, [
      user.employee_code,
    ]);
    if (dynamicRoleResult.rows.length > 0) {
      user.role_id = [dynamicRoleResult.rows[0].id];
      user.roles = [
        {
          id: dynamicRoleResult.rows[0].id,
          name: dynamicRoleResult.rows[0].role_name,
        },
      ];
    } else {
      logDebug("No dynamic role found for user:", user.employee_code);
    }

    logDebug("Dynamic role assigned:", {
      roleId: user.role_id,
      roles: user.roles,
    });

    // ---------------- Generate JWT ----------------
    // Fetch user permissions
    let permissions = [];
    try {
      const userPermsQuery = `
        SELECT module_id, can_add, can_edit, can_view, can_delete 
        FROM user_plant_permission 
        WHERE user_id = $1
      `;
      const userPerms = await db.query(userPermsQuery, [user.id]);

      permissions = userPerms.rows.flatMap((p) => {
        const perms = [];
        if (p.can_add) perms.push(`create:${p.module_id}`);
        if (p.can_edit) perms.push(`update:${p.module_id}`);
        if (p.can_view) perms.push(`read:${p.module_id}`);
        if (p.can_delete) perms.push(`delete:${p.module_id}`);
        return perms;
      });
       // Extract unique plant IDs from permissions
      permittedPlantIds = [...new Set(userPerms.rows.map(p => p.plant_id))];
      
      logDebug(`User has permissions for plants:`, permittedPlantIds);
    } catch (err) {
      console.error("[PERMISSIONS ERROR]", err);
      // Continue without permissions - they'll be fetched later if needed
    }

    // Add role-based permissions
    if (user.role_id.includes(1)) {
      // SuperAdmin
      permissions.push("manage:all");
    }

    // Check if user is an approver in any workflows
    try {
      // approval_workflow_master is the table used for workflows in this project.
      // Columns are approver_1_id ... approver_5_id and values may be comma-separated ids.
      const approverQuery = `
        SELECT DISTINCT id
        FROM approval_workflow_master
        WHERE (
          approver_1_id LIKE $1 OR
          approver_2_id LIKE $1 OR
          approver_3_id LIKE $1 OR
          approver_4_id LIKE $1 OR
          approver_5_id LIKE $1
        ) AND is_active = true
        LIMIT 1
      `;
      const approverResult = await db.query(approverQuery, [`%${user.id}%`]);

      if (
        approverResult &&
        approverResult.rows &&
        approverResult.rows.length > 0
      ) {
        permissions.push("approve:requests");
        permissions.push("view:approvals");
        permissions.push("read:workflows");
        permissions.push("update:workflows");
        // Add approver role if user is an approver but doesn't have role 4 (Manager)
        // Do NOT change user's numeric role_id when they are an approver.
        // Approver is a dynamic permission, not a static role assignment.
      }

      // Add workflow permissions for superadmins and plant admins
      if (user.role_id.includes(1) || user.role_id.includes(2)) {
        permissions.push("read:workflows");
        permissions.push("create:workflows");
        permissions.push("update:workflows");
      }
    } catch (err) {
      console.error("[APPROVER CHECK ERROR]", err);
    }

    // ===============================================
// 6.1 Add IT BIN Admin Extra Permissions
// ===============================================
if (isITBin) {
  permissions.push("view:tasks");
  permissions.push("manage:tasks");
}



    // ===============================================
    // 7. Fetch User's Location/Plant Details
    // ===============================================
    let userLocation = null;
    let userPlantName = null;
    
    if (user.location) {
      try {
        const locationQuery = `
          SELECT id, plant_name 
          FROM plant_master 
          WHERE id = $1
        `;
        const locationResult = await db.query(locationQuery, [user.location]);
        
        if (locationResult.rows.length > 0) {
          userLocation = locationResult.rows[0].id;
          userPlantName = locationResult.rows[0].plant_name;
        }
      } catch (err) {
        console.error("[LOCATION FETCH ERROR]", err);
      }
    }

    // Ensure we include a reliable user id and username in the token payload.
    // DB rows may have id, user_id or employee_id fields; prefer internal id and employee_id as username.
    const payload = {
      user_id: user.id || user.user_id || null,
      username: user.employee_id || user.username || null,
      employee_name: user.employee_name,
      employee_code: user.employee_code,
      email: user.email,
      
      // Role and permissions
      role_id: roleIds,
      permissions,
      permissions_version: 1, // Increment when permission structure changes
      isApprover:user.is_approver,
      // IT BIN Admin info
      isITBin,
      itPlants: isITBin ? itPlants : [], // Full plant details for IT BIN admins
      itPlantIds: isITBin ? itPlantIds : [], // Just IDs for quick checks
      
      // User's assigned plant/location
      location: userLocation,
      plant_name: userPlantName,
      department: user.department,
      designation: user.designation,
      
      // Plant access (from permissions)
      permittedPlantIds,
      
      // Metadata
      loginTime: new Date().toISOString(),
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });

    return res.json({
      token,
      user: {
        id: user.id || user.user_id,
        username: user.employee_id,
        name: user.employee_name,
        employee_code: user.employee_code,
         email: user.email,
        location: userLocation,
        plant_name: userPlantName,
        department: user.department,
        designation: user.designation,
        reporting_manager: user.reporting_manager ?? "",
        managers_manager: user.managers_manager ?? "",
        role_id: user.role_id,
        status: user.status,
        isApprover:user.is_approver,
         // IT BIN info
        isITBin,
        itPlants: isITBin ? itPlants : [],
        
        // Permissions summary
        permittedPlantIds,
        hasApproverAccess: permissions.includes("approve:requests"),
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
    logDebug("getPermissions called", {
      headers: req.headers && { authorization: req.headers.authorization },
      cookies: req.cookies ? Object.keys(req.cookies) : undefined,
    });
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

    if (!token) {
      logDebug("getPermissions: no token found on request");
      return res.status(401).json({ message: "Missing authentication token" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
      logDebug("getPermissions: token payload", payload);
    } catch (err) {
      logDebug("getPermissions: token verify failed", err && err.message);
      return res.status(401).json({ message: "Invalid token" });
    }

    // Determine user id from token payload or username
    let userId = payload.user_id || payload.id || null;
    if (!userId && payload.username) {
      // try to map username (employee_id) to internal id
      const userRes = await db.query(
        "SELECT id FROM manage:all WHERE employee_id = $1 LIMIT 1",
        [payload.username]
      );
      if (userRes && userRes.rows && userRes.rows.length)
        userId = userRes.rows[0].id;
    }

    if (!userId) {
      logDebug("getPermissions: unable to determine user id from token", {
        payload,
      });
      return res
        .status(400)
        .json({ message: "Unable to determine user id from token" });
    }

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
