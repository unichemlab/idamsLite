// backend/middleware/authorize.js
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { logActivity } = require("../utils/activityLogger");
const { JWT_SECRET } = process.env;

/**
 * Check if user has a specific permission for a plant
 * @param {Object} user - User object from req.user
 * @param {string} permission - Permission string (e.g., 'create:application_master')
 * @param {number} plantId - Optional plant ID for plant-specific checks
 * @returns {boolean}
 */
const hasPermissionForPlant = (user, permission, plantId = null) => {
  if (!user) return false;

  // Super admin (role_id includes 1) has all permissions
  if (Array.isArray(user.roles) && user.roles.includes(1)) return true;
  if (user.roles === 1) return true;

  // Check global permissions
  const hasGlobalPermission = Array.isArray(user.permissions) && 
    user.permissions.includes(permission);

  // If no plant-specific check needed, return global permission
  if (!plantId) return hasGlobalPermission;

  // Check plant-specific permissions
  if (user.plantPermissions && Array.isArray(user.plantPermissions)) {
    const plantPermission = user.plantPermissions.find(
      pp => pp.plantId === plantId || pp.plant_id === plantId
    );

    if (plantPermission && plantPermission.actions) {
      // Extract action from permission string (e.g., 'create:application_master' -> 'create')
      const action = permission.split(':')[0];
      return plantPermission.actions[action] === true;
    }
  }

  return hasGlobalPermission;
};

/**
 * Check if user can access a specific plant
 * @param {Object} user - User object from req.user
 * @param {number} plantId - Plant ID to check
 * @returns {boolean}
 */
const canAccessPlant = (user, plantId) => {
  if (!user) return false;

  // Super admin has access to all plants
  if (Array.isArray(user.roles) && user.roles.includes(1)) return true;
  if (user.roles === 1) return true;

  // Check permitted plant IDs
  if (Array.isArray(user.permittedPlantIds) && user.permittedPlantIds.includes(plantId)) {
    return true;
  }

  // Check IT bin plants
  if (user.isITBin && Array.isArray(user.itPlantIds) && user.itPlantIds.includes(plantId)) {
    return true;
  }

  return false;
};

/**
 * Filter array of records based on user's plant access
 * @param {Array} records - Array of records to filter
 * @param {Object} user - User object
 * @returns {Array} - Filtered records
 */
const filterByPlantAccess = (records, user) => {
  if (!user) return [];
  
  // Super admin sees all records
  if (Array.isArray(user.roles) && user.roles.includes(1)) return records;
  if (user.roles === 1) return records;

  return records.filter(record => {
    const plantId = record.plant_location_id || record.plantId || record.plant_id;
    if (!plantId) return true; // Include records without plant ID
    return canAccessPlant(user, plantId);
  });
};

/**
 * Authorization middleware to protect routes based on permissions
 * @param {string|string[]} requiredPermissions - Required permission(s) or role(s)
 * @param {Object} options - Additional options
 * @param {boolean} options.checkPlantInBody - Check permission for plant in req.body
 * @param {boolean} options.checkPlantInRecord - Check permission for plant in existing record
 * @param {Function} options.fetchRecord - Function to fetch existing record
 */
const authorize = (requiredPermissions, options = {}) => {
  return async (req, res, next) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ 
          message: "No token provided",
          code: "NO_TOKEN"
        });
      }

      const token = authHeader.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log("token_decode", decoded);

      // Extract user info from token
      const { 
        user_id, 
        role_id, 
        permissions, 
        itPlants, 
        isITBin, 
        itPlantIds, 
        isApprover,
        isSuperAdmin,
        email,
        plantPermissions,
        permittedPlantIds
      } = decoded;

      if (!user_id || role_id === undefined) {
        return res.status(401).json({ 
          message: "Invalid token structure",
          code: "INVALID_TOKEN_STRUCTURE"
        });
      }

      // Normalize and attach a consistent user object on req.user
      const normalizedUser = {
        user_id: user_id,
        id: user_id,
        roles: Array.isArray(role_id) ? role_id : [role_id],
        permissions: permissions || [],
        plantPermissions: plantPermissions || [],
        permittedPlantIds: permittedPlantIds || [],
        isITBin: isITBin || false,
        itPlants: itPlants || [],
        itPlantIds: itPlantIds || [],
        isApprover: isApprover || false,
        isSuperAdmin: isSuperAdmin || (Array.isArray(role_id) && role_id.includes(1)) || role_id === 1,
        email: email,
      };

      // Attach user info to request
      req.user = normalizedUser;

      // Attach metadata for logging
      req._meta = {
        userId: user_id,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers["user-agent"],
      };

      // If no permissions required, just validate token
      if (!requiredPermissions) {
        return next();
      }

      // Convert single permission to array
      const required = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // 🔥 NEW: Check plant-specific permissions
      
      // For create/update operations, check plant in body
      if (options.checkPlantInBody && req.body.plant_location_id) {
        const plantId = parseInt(req.body.plant_location_id);
        
        const hasAccess = required.some(permission => {
          // Super admin bypass
          if (normalizedUser.isSuperAdmin) return true;
          
          // Check plant-specific permission
          return hasPermissionForPlant(normalizedUser, permission, plantId);
        });
        
        if (!hasAccess) {
          try {
            await logActivity({
              userId: user_id,
              module: "authorization",
              tableName: req.originalUrl || "authorization",
              recordId: null,
              action: "access_denied",
              oldValue: null,
              newValue: { plantId, permission: required },
              comments: `Denied: No permission for plant ${plantId}. Required: ${required.join(", ")}`,
              reqMeta: req._meta,
            });
          } catch (logErr) {
            console.warn("Authorization logging failed:", logErr.message);
          }

          return res.status(403).json({
            message: "You do not have permission to perform this action for this plant",
            code: "INSUFFICIENT_PLANT_PERMISSIONS",
            requiredPermissions: required,
            plantId
          });
        }
      }
      
      // For update/delete operations, check plant in existing record
      if (options.checkPlantInRecord && req.params.id && options.fetchRecord) {
        const recordId = parseInt(req.params.id);
        
        try {
          const existingRecord = await options.fetchRecord(recordId);
          
          if (!existingRecord) {
            return res.status(404).json({ 
              message: "Record not found",
              code: "RECORD_NOT_FOUND"
            });
          }

          const plantId = existingRecord.plant_location_id || existingRecord.plant_id;
          
          if (plantId) {
            const hasAccess = required.some(permission => {
              // Super admin bypass
              if (normalizedUser.isSuperAdmin) return true;
              
              // Check plant-specific permission
              return hasPermissionForPlant(normalizedUser, permission, plantId);
            });
            
            if (!hasAccess) {
              try {
                await logActivity({
                  userId: user_id,
                  module: "authorization",
                  tableName: req.originalUrl || "authorization",
                  recordId: recordId,
                  action: "access_denied",
                  oldValue: existingRecord,
                  newValue: null,
                  comments: `Denied: No permission for plant ${plantId}. Required: ${required.join(", ")}`,
                  reqMeta: req._meta,
                });
              } catch (logErr) {
                console.warn("Authorization logging failed:", logErr.message);
              }

              return res.status(403).json({
                message: "You do not have permission to access this record",
                code: "INSUFFICIENT_PLANT_PERMISSIONS",
                requiredPermissions: required,
                plantId
              });
            }
          }
          
          // Attach existing record to request for later use
          req.existingRecord = existingRecord;
        } catch (err) {
          console.error("Error fetching record for permission check:", err);
          return res.status(500).json({
            message: "Error validating permissions",
            code: "PERMISSION_CHECK_ERROR"
          });
        }
      }

      // Special handling for approvers
      if (
        normalizedUser.isApprover &&
        (required.includes("read:workflows") ||
          required.includes("read:tasks") ||
          required.includes("read:roles") ||
          required.includes("approver"))
      ) {
        return next();
      }

      // Check if user has any of the required permissions
      const hasPermission = required.some((permission) => {
        // Special case for superadmin
        if (normalizedUser.isSuperAdmin) return true;

        // Special case for approver role
        if (permission === "approver" && normalizedUser.isApprover) return true;

        // Check if user has the specific permission string
        return Array.isArray(normalizedUser.permissions) &&
          normalizedUser.permissions.includes(permission);
      });

      if (!hasPermission) {
        // Log the access denial
        try {
          await logActivity({
            userId: user_id || null,
            module: "authorization",
            tableName: req.originalUrl || "authorization",
            recordId: null,
            action: "access_denied",
            oldValue: null,
            newValue: null,
            comments: `Unauthorized access attempt to ${req.originalUrl}. Required permissions: ${required.join(", ")}`,
            reqMeta: req._meta,
          });
        } catch (logErr) {
          console.warn("Authorization logging failed (non-blocking):", logErr.message || logErr);
        }

        return res.status(403).json({
          message: "You do not have permission to perform this action",
          code: "INSUFFICIENT_PERMISSIONS",
          requiredPermissions: required
        });
      }

      next();
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ 
          message: "Invalid token",
          code: "INVALID_TOKEN"
        });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ 
          message: "Token expired",
          code: "TOKEN_EXPIRED"
        });
      }
      console.error("Authorization error:", error);
      res.status(500).json({ 
        message: "Internal server error during authorization",
        code: "AUTH_ERROR"
      });
    }
  };
};

// Export helper functions
authorize.hasPermissionForPlant = hasPermissionForPlant;
authorize.canAccessPlant = canAccessPlant;
authorize.filterByPlantAccess = filterByPlantAccess;

module.exports = authorize;