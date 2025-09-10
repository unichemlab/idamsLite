const express = require("express");
const router = express.Router();
const accessLogController = require("../controllers/accessLog");

// Get all access logs
router.get("/", accessLogController.getAllAccessLogs);

// Create a new access log entry
router.post("/", accessLogController.createAccessLog);

module.exports = router;
