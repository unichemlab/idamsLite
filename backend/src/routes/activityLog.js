const express = require("express");
const router = express.Router();
const activityLogController = require("../controllers/activityLogs");

// Get all access logs
router.get("/", activityLogController.getAllActivityLogs);

module.exports = router;
