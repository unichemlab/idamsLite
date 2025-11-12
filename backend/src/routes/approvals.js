const express = require("express");
const router = express.Router();
const approvalsController = require("../controllers/approvalsController");
const authorize = require("../middleware/authorize");

// POST /api/approvals/:transaction/approve
router.post(
  "/:transaction/approve",
  // Allow either an explicit permission or the approver role to perform approvals
  authorize(["approve:user-requests", "approver"]),
  approvalsController.approveByTransaction
);

// POST /api/approvals/:transaction/reject
router.post(
  "/:transaction/reject",
  // Allow either an explicit permission or the approver role to perform approvals
  authorize(["approve:user-requests", "approver"]),
  approvalsController.rejectByTransaction
);

module.exports = router;
