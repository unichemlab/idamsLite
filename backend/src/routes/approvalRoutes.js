const express = require("express");
const router = express.Router();
const { handleApproval } = require("../controllers/approvalController");

router.get("/approve-request/:id", handleApproval);

module.exports = router;
