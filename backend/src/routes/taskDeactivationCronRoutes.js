const express = require("express");
const router = express.Router();
const accessMonitorController = require("../controllers/taskDeactivationCron");

// GET endpoint for testing
router.get("/run-monitor", accessMonitorController.runAccessMonitor);

module.exports = router;