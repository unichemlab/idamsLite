const express = require("express");
const router = express.Router();
const approvalController = require("../controllers/masterApprovalController");
const authorize = require("../middleware/authorize");
// const { authenticate } = require("../middleware/auth"); // Add auth middleware if needed

// Get all approvals (with filters)
router.get("/",authorize(), approvalController.getAllApprovals);

// Get approval statistics
router.get("/stats",authorize(), approvalController.getApprovalStats);

// Get single approval by ID
router.get("/:id",authorize(), approvalController.getApprovalById);

// Approve a pending change
router.post("/:id/approve",authorize(), approvalController.approveApproval);

// Reject a pending change
router.post("/:id/reject",authorize(), approvalController.rejectApproval);

// Cancel a pending approval (by requester)
router.delete("/:id",authorize(), approvalController.cancelApproval);

module.exports = router;