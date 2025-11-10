const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/applicationController");
// Activity logs for applications
router.get("/activity-logs", applicationController.getApplicationActivityLogs);

/**
 * @swagger
 * tags:
 *   name: Applications
 *   description: Application master management
 */

/**
 * @swagger
 * /api/applications:
 *   get:
 *     summary: Get all applications
 *     tags: [Applications]
 *     responses:
 *       200:
 *         description: List of all applications
 */
router.get("/", applicationController.getAllApplications);

/**
 * @swagger
 * /api/applications:
 *   get:
 *     summary: Get role , department, applications_id according to plant id
 *     tags: [Applications]
 *     responses:
 *       200:
 *         description: Get role , department, applications_id
 */
router.get("/:id", applicationController.getDepartmentByPlantId);

/**
 * @swagger
 * /api/applications:
 *   get:
 *     summary: Get role , applications_id according to plant id
 *     tags: [Applications]
 *     responses:
 *       200:
 *         description: Get role , applications_id
 */
router.get(
  "/:id/:dept_id",
  applicationController.getRoleApplicationIDByPlantIdandDepartment
);

// Add Application
router.post("/", applicationController.addApplication);

// Edit Application
router.put("/:id", applicationController.editApplication);

// Delete Application
router.delete("/:id", applicationController.deleteApplication);

module.exports = router;
