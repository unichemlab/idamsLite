const express = require("express");
const router = express.Router();
const approvalsController = require("../controllers/approvalsController");

// POST /api/approvals/:transaction/approve
router.post("/:transaction/approve", approvalsController.approveByTransaction);

// POST /api/approvals/:transaction/reject
router.post("/:transaction/reject", approvalsController.rejectByTransaction);

module.exports = router;
