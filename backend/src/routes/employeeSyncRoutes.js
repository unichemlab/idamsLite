const express = require("express");
const router = express.Router();

// Import controller
const { syncADUsers } = require("../controllers/employeeSync");

// Route for syncing AD users
router.get("/api/ad-users-sync", syncADUsers);

module.exports = router;
