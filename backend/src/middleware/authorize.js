const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { logActivity } = require("../utils/activityLogger");
const { JWT_SECRET } = process.env;

/**
 * Authorization middleware to protect routes based on permissions
 * @param {string|string[]} requiredPermissions - Required permission(s) or role(s)
 */
const authorize = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = authHeader.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Extract user info from token
      const { user_id, role_id, permissions } = decoded;

      if (!user_id || !role_id) {
        return res.status(401).json({ message: "Invalid token structure" });
      }

      // Check if user is an approver
      const isApprover = Array.isArray(role_id) && role_id.includes(4); // Role ID 4 is for approvers

      // If user is an approver, they should have access to workflows
      if (
        isApprover &&
        (requiredPermissions === "read:workflows" ||
          requiredPermissions === "read:tasks" ||
          requiredPermissions === "read:roles")
      ) {
        req.user = { user_id, role_id, permissions, isApprover };
        return next();
      }

      // Attach user info to request
      req.user = {
        id: user_id,
        roles: role_id,
        permissions: permissions || [], // May be empty if using role-based checks
      };

      // If no permissions required, just validate token
      if (!requiredPermissions) {
        return next();
      }

      // Convert single permission to array
      const required = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // Check if user has any of the required permissions
      const hasPermission = required.some((permission) => {
        // Special case for superadmin
        if (role_id.includes(1)) return true;

        // Check if user has the specific permission
        return req.user.permissions.includes(permission);
      });

      if (!hasPermission) {
        // Try to log the access denial but do NOT let logging failures block authorization flow.
        try {
          // Use centralized logActivity helper for consistent schema and safe handling
          await logActivity({
            userId: user_id || null,
            module: "authorization",
            tableName: req.originalUrl || "authorization",
            recordId: null,
            action: "access_denied",
            oldValue: null,
            newValue: null,
            comments: `Unauthorized access attempt to ${
              req.originalUrl
            }. Required permissions: ${required.join(", ")}`,
            reqMeta: req._meta || {
              ip: req.ip || null,
              userAgent: req.headers["user-agent"] || null,
            },
          });
        } catch (logErr) {
          // log a warning and continue to respond with 403
          console.warn(
            "Authorization logging failed (non-blocking):",
            logErr.message || logErr
          );
        }

        return res.status(403).json({
          message: "You do not have permission to perform this action",
        });
      }

      next();
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Invalid token" });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      console.error("Authorization error:", error);
      res
        .status(500)
        .json({ message: "Internal server error during authorization" });
    }
  };
};

module.exports = authorize;
