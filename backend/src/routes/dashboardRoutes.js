const express = require("express");
const router = express.Router();

// Import the dashboard controller
const dashboardController = require("../controllers/dashboardController");

// GET dashboard counts
router.get("/counts", dashboardController.getDashboardCounts);

module.exports = router;
