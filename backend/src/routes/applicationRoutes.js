// backend/routes/applicationRoutes.js
const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/applicationController");
const  authorize  = require("../middleware/authorize");
const { requirePermission } = require("../middleware/permissionMiddleware");

// Helper function to fetch application record
const fetchApplicationRecord = async (id) => {
  const db = require("../config/db");
  const result = await db.query(
    "SELECT * FROM application_master WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
};

/**
 * GET /api/applications
 * Get all applications (filtered by user's plant access)
 * Permission: read:application_master
 */
router.get(
  "/",
  authorize("read:application_master"),
  applicationController.getAllApplications
);

/**
 * POST /api/applications
 * Create new application
 * Permission: create:application_master (checked for specific plant)
 */
router.post(
  "/",
  authorize("create:application_master", {
    checkPlantInBody: true
  }),
  applicationController.addApplication
);

/**
 * PUT /api/applications/:id
 * Update application
 * Permission: update:application_master (checked for specific plant)
 */
router.put(
  "/:id",
  authorize("update:application_master", {
    checkPlantInRecord: true,
    fetchRecord: fetchApplicationRecord
  }),
  applicationController.editApplication
);

/**
 * DELETE /api/applications/:id
 * Delete application
 * Permission: delete:application_master (checked for specific plant)
 */
router.delete(
  "/:id",
  authorize("delete:application_master", {
    checkPlantInRecord: true,
    fetchRecord: fetchApplicationRecord
  }),
  applicationController.deleteApplication
);

/**
 * GET /api/applications/departments/:id
 * Get departments for a specific plant
 * Permission: read:application_master (checked for specific plant)
 */
router.get(
  "/departments/:id",
  authorize("read:application_master"),
  applicationController.getDepartmentByPlantId
);

/**
 * GET /api/applications/activity-logs
 * Get activity logs for applications (filtered by user's plant access)
 * Permission: read:application_master
 */
router.get(
  "/activity-logs",
  authorize("read:application_master"),
  applicationController.getApplicationActivityLogs
);

/**
 * GET /api/applications/roles/:id/:dept_id
 * Get roles and applications for plant and department
 * Permission: read:application_master (checked for specific plant)
 */
router.get(
  "/roles/:id/:dept_id",
  authorize("read:application_master"),
  applicationController.getRoleApplicationIDByPlantIdandDepartment
);

module.exports = router;