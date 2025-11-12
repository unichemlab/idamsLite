/**
 * authController.js - Fixed version with complete user data in JWT
 */

const jwt = require("jsonwebtoken");
const db = require("../config/db");
const ActiveDirectory = require("activedirectory2");

const AD_SERVER = process.env.AD_SERVER;
const AD_USER = process.env.AD_USER;
const AD_PASSWORD = process.env.AD_PASSWORD;
const AD_DOMAIN = process.env.AD_DOMAIN;
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
    return res.status(400).json({ 
      message: "Username and password are required" 
    });
  }

  try {
    // ===============================================
    // 1. Fetch user from database
    // ===============================================
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

    // ===============================================
    // 2. AD Authentication (optional)
    // ===============================================
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

    // Fallback: default DB password
    if (!authenticated && password === DEFAULT_PASSWORD) {
      logDebug(`Default password used for ${username}`);
      authenticated = true;
    }

    if (!authenticated) {
      logDebug(`Authentication failed for ${username}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ===============================================
    // 3. Normalize role_id
    // ===============================================
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
      // Continue without IT BIN info
    }

    // ===============================================
    // 5. Fetch User Permissions
    // ===============================================
    let permissions = [];
    let permittedPlantIds = [];
    
    try {
      const userPermsQuery = `
        SELECT 
          plant_id, 
          module_id, 
          can_add, 
          can_edit, 
          can_view, 
          can_delete 
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
    }

    // Add role-based permissions
    if (roleIds.includes(1)) {
      // SuperAdmin - full access
      permissions.push("manage:all");
    }

    // ===============================================
    // 6. Check if User is an Approver
    // ===============================================
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
        
        // Add approver role if not already present
        if (!roleIds.includes(4)) {
          roleIds.push(4);
        }
        
        logDebug(`User ${username} is an approver`);
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

    // ===============================================
    // 8. Generate JWT with ALL user data
    // ===============================================
    const payload = {
      // Core user identification
      user_id: user.id,
      username: user.employee_id,
      employee_name: user.employee_name,
      employee_code: user.employee_code,
      email: user.email,
      
      // Role and permissions
      role_id: roleIds,
      permissions,
      permissions_version: 1,
      
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

    logDebug("JWT payload created:", {
      user_id: payload.user_id,
      username: payload.username,
      role_id: payload.role_id,
      isITBin: payload.isITBin,
      itPlantIds: payload.itPlantIds,
      permittedPlantIds: payload.permittedPlantIds
    });

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });

    // ===============================================
    // 9. Return response with user info
    // ===============================================
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
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
        role_id: roleIds,
        status: user.status,
        
        // IT BIN info
        isITBin,
        itPlants: isITBin ? itPlants : [],
        
        // Permissions summary
        permittedPlantIds,
        hasApproverAccess: permissions.includes("approve:requests"),
      },
    });

  } catch (err) {
    console.error("[AUTH ERROR]", err);
    logDebug("Error stack:", err.stack);
    
    return res.status(500).json({ 
      success: false,
      message: "Server error during authentication" 
    });
  }
};

/**
 * GET /api/auth/permissions
 */
exports.getPermissions = async (req, res) => {
  try {
    logDebug("getPermissions called");
    
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;
    
    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      logDebug("No token found");
      return res.status(401).json({ message: "Missing authentication token" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
      logDebug("Token verified:", {
        user_id: payload.user_id,
        username: payload.username,
        isITBin: payload.isITBin
      });
    } catch (err) {
      logDebug("Token verification failed:", err.message);
      return res.status(401).json({ message: "Invalid token" });
    }

    let userId = payload.user_id || payload.id || null;
    
    if (!userId && payload.username) {
      const userRes = await db.query(
        "SELECT id FROM user_master WHERE employee_id = $1 LIMIT 1",
        [payload.username]
      );
      if (userRes?.rows?.length) {
        userId = userRes.rows[0].id;
      }
    }

    if (!userId) {
      logDebug("Unable to determine user id");
      return res.status(400).json({ 
        message: "Unable to determine user id from token" 
      });
    }

    // Fetch permissions
    let permissions = [];
    try {
      const q = `
        SELECT 
          id, transaction_id, user_id, plant_id, module_id, 
          can_add, can_edit, can_view, can_delete, 
          created_on, updated_on
        FROM user_plant_permission 
        WHERE user_id = $1 
        ORDER BY id
      `;
      const { rows } = await db.query(q, [userId]);
      permissions = rows || [];
      
      logDebug(`Found ${permissions.length} permissions`);
    } catch (err) {
      console.error("[PERMISSIONS FETCH ERROR]", err);
      permissions = [];
    }

    return res.json({ 
      success: true,
      permissions,
      user: {
        user_id: payload.user_id,
        username: payload.username,
        isITBin: payload.isITBin,
        itPlants: payload.itPlants,
      }
    });
    
  } catch (err) {
    console.error("[GET PERMISSIONS ERROR]", err);
    return res.status(500).json({ 
      message: "Server error" 
    });
  }
};

/**
 * GET /api/auth/me - Get current user details
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;
    
    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Missing authentication token" 
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Return all data from token
    return res.json({
      success: true,
      user: {
        user_id: payload.user_id,
        username: payload.username,
        employee_name: payload.employee_name,
        employee_code: payload.employee_code,
        email: payload.email,
        role_id: payload.role_id,
        location: payload.location,
        plant_name: payload.plant_name,
        department: payload.department,
        designation: payload.designation,
        
        // IT BIN info
        isITBin: payload.isITBin,
        itPlants: payload.itPlants,
        itPlantIds: payload.itPlantIds,
        
        // Permissions
        permissions: payload.permissions,
        permittedPlantIds: payload.permittedPlantIds,
        
        // Metadata
        loginTime: payload.loginTime,
        tokenExpiry: payload.exp,
      }
    });
    
  } catch (err) {
    console.error("[GET CURRENT USER ERROR]", err);
    
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ 
        success: false,
        message: "Token expired" 
      });
    }
    
    return res.status(401).json({ 
      success: false,
      message: "Invalid token" 
    });
  }
};

module.exports = exports;