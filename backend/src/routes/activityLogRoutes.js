// backend/routes/activityLogRoutes.js
const express = require("express");
const router = express.Router();
const activityLogController = require("../controllers/activityLogController");
const { authenticate } = require("../middleware/authMiddleware");

/**
 * Activity Log Routes
 * 
 * All routes require authentication and will automatically filter
 * based on user's plant permissions
 */

// 🔧 DEBUG ENDPOINT - Check what record_ids exist for a table
// Example: GET /api/activity-logs/debug/application_master
router.get(
  "/debug/:tableName",
  authenticate,
  activityLogController.debugActivityLogs
);

// Get all activity logs (admin view, limited to 1000 recent logs)
router.get(
  "/",
  authenticate,
  activityLogController.getAllActivityLogs
);

// Get activity logs for a specific table
// Example: GET /api/activity-logs/application_master
router.get(
  "/:tableName",
  authenticate,
  activityLogController.getActivityLogsByTable
);

// Get activity logs for a specific record in a table
// Example: GET /api/activity-logs/application_master/123
router.get(
  "/:tableName/:recordId",
  authenticate,
  activityLogController.getActivityLogsByRecord
);

module.exports = router;