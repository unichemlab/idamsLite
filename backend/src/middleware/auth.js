/**
 * authMiddleware.js - Fixed version with better error handling
 */

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

function logDebug(...args) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[AUTH MIDDLEWARE]", new Date().toISOString(), ...args);
  }
}

module.exports = function(req, res, next) {
  try {
    logDebug("=".repeat(60));
    logDebug("MIDDLEWARE: Authentication check");
    
    // Check if JWT_SECRET exists
    if (!JWT_SECRET) {
      console.error("[CRITICAL] JWT_SECRET is not defined!");
      return res.status(500).json({ 
        success: false,
        message: "Server configuration error" 
      });
    }

    // Extract token from Authorization header or cookie
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;

    logDebug("Request headers:", {
      authorization: authHeader ? "present" : "missing",
      cookie: req.headers.cookie ? "present" : "missing"
    });

    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
      logDebug("Token extracted from Authorization header");
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      logDebug("Token extracted from cookie");
    }

    // Check if token exists
    if (!token) {
      logDebug("NO TOKEN FOUND in request");
      return res.status(401).json({ 
        success: false,
        message: "Access denied. No authentication token provided." 
      });
    }

    logDebug("Token found, verifying...");

    // Verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      logDebug("Token verified successfully:", {
        user_id: decoded.user_id,
        username: decoded.username,
        role_id: decoded.role_id,
        exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : "no expiry"
      });

      // Attach decoded user info to request
      req.user = decoded;
      
      logDebug("User attached to request object");
      logDebug("=".repeat(60));
      
      // Continue to next middleware
      next();

    } catch (verifyError) {
      logDebug("TOKEN VERIFICATION FAILED:", verifyError.message);
      
      if (verifyError.name === "TokenExpiredError") {
        logDebug("Token expired at:", verifyError.expiredAt);
        return res.status(401).json({ 
          success: false,
          message: "Token has expired. Please login again.",
          expired: true
        });
      }
      
      if (verifyError.name === "JsonWebTokenError") {
        logDebug("Invalid token structure");
        return res.status(403).json({ 
          success: false,
          message: "Invalid authentication token" 
        });
      }

      // Other JWT errors
      return res.status(403).json({ 
        success: false,
        message: "Token verification failed",
        ...(process.env.NODE_ENV !== "production" && { error: verifyError.message })
      });
    }

  } catch (err) {
    console.error("[AUTH MIDDLEWARE ERROR]", err);
    logDebug("Unexpected error:", err.message);
    
    return res.status(500).json({ 
      success: false,
      message: "Authentication middleware error",
      ...(process.env.NODE_ENV !== "production" && { error: err.message })
    });
  }
};


/**
 * Optional middleware - allows both authenticated and unauthenticated requests
 * If token exists and is valid, req.user will be set
 * If no token or invalid token, req.user will be null
 */
module.exports.optionalAuth = function(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;

    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      req.user = null;
    }

    next();
  } catch (err) {
    req.user = null;
    next();
  }
};


/**
 * Role-based authorization middleware
 * Usage: requireRole(['admin', 'manager'])
 */
module.exports.requireRole = function(allowedRoleIds) {
  return function(req, res, next) {
    logDebug("Role check:", {
      userRoles: req.user?.role_id,
      allowedRoles: allowedRoleIds
    });

    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }

    const userRoles = Array.isArray(req.user.role_id) 
      ? req.user.role_id 
      : [req.user.role_id];

    const hasRequiredRole = userRoles.some(roleId => 
      allowedRoleIds.includes(roleId)
    );

    if (!hasRequiredRole) {
      logDebug("ROLE CHECK FAILED");
      return res.status(403).json({ 
        success: false,
        message: "Insufficient permissions. Required role not found." 
      });
    }

    logDebug("ROLE CHECK PASSED");
    next();
  };
};