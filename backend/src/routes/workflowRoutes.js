const express = require("express");
const router = express.Router();
const workflowController = require("../controllers/workflowController");

// GET /api/workflows
router.get("/", workflowController.getWorkflows);
// POST /api/workflows
router.post("/", workflowController.createWorkflow);
// PUT /api/workflows/:id
router.put("/:id", workflowController.updateWorkflow);

module.exports = router;
