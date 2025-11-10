const express = require("express");
const router = express.Router();
const approvalsController = require("../controllers/approvalsController");
const authorize = require("../middleware/authorize");

// POST /api/approvals/:transaction/approve
router.post(
  "/:transaction/approve",
  authorize("approve:user-requests"),
  approvalsController.approveByTransaction
);

// POST /api/approvals/:transaction/reject
router.post(
  "/:transaction/reject",
  authorize("approve:user-requests"),
  approvalsController.rejectByTransaction
);

module.exports = router;
