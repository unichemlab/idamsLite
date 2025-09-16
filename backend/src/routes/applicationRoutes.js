const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/applicationController");

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
router.get("/:id/:dept_id", applicationController.getRoleApplicationIDByPlantIdandDepartment);

// You can add more routes (POST, PUT, DELETE) as needed

module.exports = router;
