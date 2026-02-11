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
function getClientInfo(req) {
  return {
    ip:
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      null,
    device: req.headers["user-agent"] || "UNKNOWN",
  };
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

  const { ip, device } = getClientInfo(req);

  await db.query(
    `
    INSERT INTO user_login_log
    (transaction_id, employee_code, action, description,
     ip_address, device, success, login_time)
    VALUES ($1,$2,'LOGIN','Invalid credentials',$3,$4,false,NOW())
    `,
    [
      `USRL${Date.now()}`,
      username,
      ip,
      device,
    ]
  );

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
    
    // ===============================================
// LOGIN AUDIT LOG (SUCCESS)
// ===============================================
const { ip, device } = getClientInfo(req);

const loginTxnId = `USRL${Date.now()}`;

await db.query(
  `
  INSERT INTO user_login_log
  (transaction_id, user_id, employee_code, action, description,
   ip_address, device, success, login_time, location)
  VALUES ($1,$2,$3,'LOGIN',$4,$5,$6,true,NOW(),$7)
  `,
  [
    loginTxnId,
    user.id,
    user.employee_code,
    "User logged in successfully",
    ip,
    device,
    user.location || null,
  ]
);


    // ===============================================
    // Fetch IT BIN Admin Status & Plant IDs
    // ===============================================
    let isITBin = false;
    let itPlantIds = [];
    let itPlants = [];

    try {
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

    logDebug("Roles fetched:", {
      roles: user.roles,
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

    // ---------------- Fetch user permissions ----------------
    let permissions = [];
    let plantPermissions = [];
    let permittedPlantIds = [];

    try {
      const userPermsQuery = `
    SELECT module_id, plant_id, can_add, can_edit, can_view, can_delete
    FROM user_plant_permission
    WHERE user_id = $1
  `;

      const { rows } = await db.query(userPermsQuery, [user.id]);

      // 1️⃣ Structured permissions (plant-wise)
      plantPermissions = rows.map(p => ({
        moduleId: p.module_id,
        plantId: p.plant_id,
        actions: {
          create: p.can_add,
          update: p.can_edit,
          read: p.can_view,
          delete: p.can_delete
        }
      }));

      // 2️⃣ Flattened permissions (NO plant_id here)
      permissions = rows.flatMap(p => {
        const perms = [];
        if (p.can_add) perms.push(`create:${p.module_id}`);
        if (p.can_edit) perms.push(`update:${p.module_id}`);
        if (p.can_view) perms.push(`read:${p.module_id}`);
        if (p.can_delete) perms.push(`delete:${p.module_id}`);
        return perms;
      });

      // 3️⃣ Unique plant IDs
      permittedPlantIds = [...new Set(rows.map(p => p.plant_id))];

      logDebug("Permitted plants:", permittedPlantIds);

    } catch (err) {
      console.error("[PERMISSIONS ERROR]", err);
      permissions = [];
      plantPermissions = [];
      permittedPlantIds = [];
    }


    // Add role-based permissions
    if (user.role_id.includes(1)) {
      // SuperAdmin
      permissions.push("manage:all");
    }

    // ===============================================
    // CORRECT APPROVER CHECK - Check both user_requests approver1_email and workflow assignments
    // ===============================================
    let isApprover = false;
    let isCorporateApprover = false;
    let approverTypes = []; // Track what type of approver the user is
    let pendingApproval1Count = 0;
    let pendingApproval2Count = 0;
    console.log("user info for approver check", user);
    try {
      // Check 1: Is user Approver 1 in any user_requests records?
      // Match by email since approver1_email stores the user's email
      const approver1Query = `
        SELECT COUNT(*) as count
        FROM user_requests
        WHERE LOWER(approver1_email) = LOWER($1)
          AND approver1_status = 'Pending'
          AND status NOT IN ('Completed', 'Rejected', 'Cancelled')
      `;
      const approver1Result = await db.query(approver1Query, [user.email]);

      if (approver1Result && approver1Result.rows && approver1Result.rows[0]) {
        const count = parseInt(approver1Result.rows[0].count, 10);
        if (count > 0) {
          isApprover = true;
          approverTypes.push('approver_1');
          pendingApproval1Count = count;
          logDebug(`User ${username} is Approver 1 for ${count} user requests`);
        }
      }

      // Also check if user has ever been approver1 (not just pending)
      const approver1HistoryQuery = `
        SELECT COUNT(*) as count
        FROM user_requests
        WHERE LOWER(approver1_email) = LOWER($1)
        LIMIT 1
      `;
      const approver1HistoryResult = await db.query(approver1HistoryQuery, [user.email]);

      if (approver1HistoryResult && approver1HistoryResult.rows && approver1HistoryResult.rows[0]) {
        const historyCount = parseInt(approver1HistoryResult.rows[0].count, 10);
        if (historyCount > 0 && !approverTypes.includes('approver_1')) {
          isApprover = true;
          approverTypes.push('approver_1');
          logDebug(`User ${username} has historical Approver 1 records`);
        }
      }

      // Check 2: Is user Approver 2 in any user_requests records?
      const approver2Query = `
        SELECT COUNT(*) as count
        FROM user_requests
        WHERE LOWER(approver2_email) = LOWER($1)
          AND approver2_status = 'Pending'
          AND status NOT IN ('Completed', 'Rejected', 'Cancelled')
      `;
      const approver2Result = await db.query(approver2Query, [user.email]);

      if (approver2Result && approver2Result.rows && approver2Result.rows[0]) {
        const count = parseInt(approver2Result.rows[0].count, 10);
        if (count > 0) {
          isApprover = true;
          if (!approverTypes.includes('workflow_approver')) {
            approverTypes.push('workflow_approver');
          }
          pendingApproval2Count = count;
          logDebug(`User ${username} is Approver 2 for ${count} user requests`);
        }
      }

      // Also check historical approver2 records
      const approver2HistoryQuery = `
        SELECT COUNT(*) as count
        FROM user_requests
        WHERE LOWER(approver2_email) = LOWER($1)
        LIMIT 1
      `;
      const approver2HistoryResult = await db.query(approver2HistoryQuery, [user.email]);

      if (approver2HistoryResult && approver2HistoryResult.rows && approver2HistoryResult.rows[0]) {
        const historyCount = parseInt(approver2HistoryResult.rows[0].count, 10);
        if (historyCount > 0 && !approverTypes.includes('workflow_approver')) {
          isApprover = true;
          approverTypes.push('workflow_approver');
          logDebug(`User ${username} has historical Approver 2 records`);
        }
      }

      // Check 3: Is user assigned in approval_workflow_master? (for other workflows)
      const workflowApproverQuery = `
        SELECT DISTINCT id
        FROM approval_workflow_master
        WHERE (
          approver_2_id LIKE $1 OR
          approver_3_id LIKE $1 OR
          approver_4_id LIKE $1 OR
          approver_5_id LIKE $1
        ) AND is_active = true
        LIMIT 1
      `;
      const workflowApproverResult = await db.query(workflowApproverQuery, [`%${user.id}%`]);

      if (workflowApproverResult && workflowApproverResult.rows && workflowApproverResult.rows.length > 0) {
        isApprover = true;
        if (!approverTypes.includes('workflow_approver')) {
          approverTypes.push('workflow_approver');
        }
        logDebug(`User ${username} is assigned in approval workflows`);
      }



      // Check 4: Is user assigned in approval_workflow_master? (for corporate)
      const workflowApproverCorporateQuery = `
        SELECT DISTINCT id
        FROM approval_workflow_master
        WHERE (
          approver_2_id LIKE $1 OR
          approver_3_id LIKE $1 OR
          approver_4_id LIKE $1 OR
          approver_5_id LIKE $1
        ) AND is_active = true AND corporate_type=$2
        LIMIT 1
      `;
      const workflowApproverCorporateResult = await db.query(workflowApproverCorporateQuery, [`%${user.id}%`,'Administration']);

      if (workflowApproverCorporateResult && workflowApproverCorporateResult.rows && workflowApproverCorporateResult.rows.length > 0) {
        isCorporateApprover = true;
        if (!approverTypes.includes('corporate_workflow_approver')) {
          approverTypes.push('corporate_workflow_approver');
        }
        logDebug(`User ${username} is assigned in  Corporate approval workflows`);
      }

      // Add approver permissions if user is any type of approver
      if (isCorporateApprover) {
        permissions.push("approve:requests");
        permissions.push("read:admin_approval");
        permissions.push("update:admin_approval");

        logDebug(`User ${username} has approver types:`, approverTypes);
        logDebug(`Pending approvals - Level 1: ${pendingApproval1Count}, Level 2: ${pendingApproval2Count}`);
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
    // Add IT BIN Admin Extra Permissions
    // ===============================================
    if (isITBin) {
      permissions.push("view:tasks");
      permissions.push("manage:tasks");
    }

    // ===============================================
    // Fetch User's Location/Plant Details
    // ===============================================
    let userLocation = null;
    let userPlantName = null;

    if (user.location) {
      try {
        const locationQuery = `
          SELECT id, plant_name 
          FROM plant_master 
          WHERE plant_name = $1
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

    // ===============================================
    // Generate JWT Token
    // ===============================================
    const payload = {
      user_id: user.id || user.user_id || null,
      username: user.employee_id || user.username || null,
      employee_name: user.employee_name,
      employee_code: user.employee_code,
      email: user.email,

      // Role and permissions
      role_id: roleIds,
      permissions,            // flat (menu / feature)
      plantPermissions,       // structured (logic)
      permittedPlantIds,      // quick filtering
      permissions_version: 2, // bump version
      isApprover: isApprover,
      isCorporateApprover:isCorporateApprover,
      approverTypes: approverTypes, // ['approver_1', 'workflow_approver'] or subset
      pendingApproval1Count: pendingApproval1Count,
      pendingApproval2Count: pendingApproval2Count,

      // IT BIN Admin info
      isITBin,
      itPlants: isITBin ? itPlants : [], // Full plant details for IT BIN admins
      itPlantIds: isITBin ? itPlantIds : [], // Just IDs for quick checks

      // User's assigned plant/location
      location: user.location,
      plant_name: userPlantName,
      department: user.department,
      designation: user.designation,
      // Metadata
      loginTime: new Date().toISOString(),
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });

    return res.json({
      token,
      login_transaction_id: loginTxnId, // 👈 ADD THIS
      user: {
        id: user.id || user.user_id,
        username: user.employee_id,
        name: user.employee_name,
        employee_code: user.employee_code,
        email: user.email,
        location: user.location,
        plant_name: userPlantName,
        department: user.department,
        designation: user.designation,
        reporting_manager: user.reporting_manager ?? "",
        managers_manager: user.managers_manager ?? "",
        role_id: user.role_id,
        status: user.status,
        isApprover: isApprover,
        isCorporateApprover:isCorporateApprover,
        approverTypes: approverTypes,
        pendingApproval1Count: pendingApproval1Count,
        pendingApproval2Count: pendingApproval2Count,

        // IT BIN info
        isITBin,
        itPlants: isITBin ? itPlants : [],

        // Permissions summary
        permittedPlantIds,
        plantPermissions,
        hasApproverAccess: permissions.includes("approve:requests"),
        full_name: user.employee_name,
      },
    });
  } catch (err) {
    console.error("[AUTH ERROR]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    const { transaction_id } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ message: "Transaction ID required" });
    }

    const result = await db.query(
      `
      UPDATE user_login_log
      SET 
        logout_time = NOW(),
        action = 'LOGOUT',
        description = 'User logged out successfully'
      WHERE transaction_id = $1
      `,
      [transaction_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Login record not found" });
    }

    return res.json({ message: "Logout recorded successfully" });
  } catch (err) {
    console.error("[LOGOUT ERROR]", err);
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
        "SELECT id FROM user_master WHERE employee_id = $1 LIMIT 1",
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
    
return res.json({
  plantPermissions: permissions,
  permittedPlantIds: [...new Set(permissions.map(p => p.plant_id))]
});

  } catch (err) {
    console.error("[GET PERMISSIONS ERROR]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = exports;