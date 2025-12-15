const express = require("express");
const router = express.Router();
const { handleApproval,approveRejectRequest  } = require("../controllers/approvalController");

router.get("/approve-request/:id", handleApproval);
// NEW API ENDPOINT
router.get("/api/approve-reject/:id", approveRejectRequest);

module.exports = router;
