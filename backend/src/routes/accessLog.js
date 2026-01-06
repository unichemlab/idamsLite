const express = require("express");
const router = express.Router();
const accessLogController = require("../controllers/accessLog");
const authorize = require("../middleware/authorize");

// Get all access logs with related master data
router.get("/", authorize(), accessLogController.getAllAccessLogs);

// Get single access log by ID
router.get("/:id", authorize(), accessLogController.getAccessLogById);

// Get access logs by vendor firm (specific route - must come before :id)
router.get("/firm/:vendor_firm", authorize(), accessLogController.getAccessLogByFirm);

// Get activity logs for access log module
router.get("/activity-logs/all", authorize(), accessLogController.getAccessLogActivityLogs);

// Create new access log (requires approval)
router.post("/", authorize(), accessLogController.createAccessLog);

// Update access log (requires approval)
router.put("/:id", authorize(), accessLogController.updateAccessLog);

// Delete access log (requires approval)
router.delete("/:id", authorize(), accessLogController.deleteAccessLog);

// Update approver status (approval action)
router.patch("/:id/approver-status", authorize(), accessLogController.updateApproverStatus);
router.post("/conflict-check",authorize(),accessLogController.checkAccessLogConflict);

module.exports = router;