// backend/middleware/authorize.js
const jwt = require("jsonwebtoken");
const { logActivity } = require("../utils/activityLogger");

const { JWT_SECRET } = process.env;

/**
 * 🔐 Robust Super Admin Check
 */
const isSuperAdmin = (user) => {
  if (!user) return false;

  const roles = Array.isArray(user.role_id)
    ? user.role_id.map(Number)
    : [Number(user.role_id)];

  return roles.includes(1);
};

/**
 * 🔍 Permission check for plant
 */
const hasPermissionForPlant = (user, permission, plantId = null) => {
  if (!user) return false;

  if (user.isSuperAdmin) return true;

  const hasGlobal = Array.isArray(user.permissions) &&
    user.permissions.includes(permission);

  if (!plantId) return hasGlobal;

  if (Array.isArray(user.plantPermissions)) {
    const match = user.plantPermissions.find(
      (p) => Number(p.plantId || p.plant_id) === Number(plantId)
    );

    if (match?.actions) {
      const action = permission.split(":")[0];
      return match.actions[action] === true;
    }
  }

  return hasGlobal;
};

/**
 * 🌱 Plant access check
 */
const canAccessPlant = (user, plantId) => {
  if (!user) return false;
  if (user.isSuperAdmin) return true;

  const pid = Number(plantId);

  if (Array.isArray(user.permittedPlantIds)) {
    return user.permittedPlantIds.map(Number).includes(pid);
  }

  if (user.isITBin && Array.isArray(user.itPlantIds)) {
    return user.itPlantIds.map(Number).includes(pid);
  }

  return false;
};

/**
 * 🔐 Authorization Middleware
 */
const authorize = (requiredPermissions, options = {}) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      const normalizedUser = {
        id: decoded.user_id,
        user_id: decoded.user_id,
        username: decoded.username,
        employee_name:decoded.employee_name,
        role_id: decoded.role_id,
        roles: Array.isArray(decoded.role_id)
          ? decoded.role_id.map(Number)
          : [Number(decoded.role_id)],
        permissions: decoded.permissions || [],
        plantPermissions: decoded.plantPermissions || [],
        permittedPlantIds: (decoded.permittedPlantIds || []).map(Number),
        isITBin: !!decoded.isITBin,
        itPlantIds: (decoded.itPlantIds || []).map(Number),
        isApprover: !!decoded.isApprover,
        email: decoded.email,
        isSuperAdmin: isSuperAdmin(decoded),
      };

      req.user = normalizedUser;

      req._meta = {
        userId: normalizedUser.id,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      };

      if (!requiredPermissions) return next();

      const required = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // 🔥 Check plant in body
      if (options.checkPlantInBody && req.body.plant_location_id) {
        const plantId = Number(req.body.plant_location_id);

        const allowed = required.some((perm) =>
          hasPermissionForPlant(normalizedUser, perm, plantId)
        );

        if (!allowed) {
          return res.status(403).json({
            message: "No permission for selected plant",
            plantId,
          });
        }
      }

      return next();
    } catch (err) {
      console.error("Authorize error:", err);
      return res.status(401).json({ message: "Invalid token" });
    }
  };
};

module.exports = authorize;
