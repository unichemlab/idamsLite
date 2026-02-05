// const express = require("express");
// const router = express.Router();

// // Import controller
// const { syncADUsers } = require("../controllers/employeeSync");

// // Route for syncing AD users
// router.get("/api/ad-users-sync", syncADUsers);

// module.exports = router;


// routes/adSync.routes.js

const express = require("express");
const router = express.Router();
const { 
  syncADUsers, 
  syncAllOUs, 
  getOUsWithEmployees 
} = require("../controllers/employeeSync");

/**
 * @route   GET /api/ad-sync
 * @desc    Sync employees from a single OU
 * @query   ou - OU path (default: "OU=COE-Ghaziabad")
 * @example /api/ad-sync?ou=OU=COE-Ghaziabad
 */
router.get("/ad-sync", syncADUsers);

/**
 * @route   GET /api/ad-sync-all
 * @desc    Sync employees from ALL OUs automatically
 * @example /api/ad-sync-all
 */
router.get("/ad-sync-all", syncAllOUs);

/**
 * @route   GET /api/ad-ous
 * @desc    Get list of all OUs with employee counts
 * @example /api/ad-ous
 */
router.get("/ad-ous", getOUsWithEmployees);

module.exports = router;
