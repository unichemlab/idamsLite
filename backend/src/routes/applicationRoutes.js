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

// You can add more routes (POST, PUT, DELETE) as needed

module.exports = router;
