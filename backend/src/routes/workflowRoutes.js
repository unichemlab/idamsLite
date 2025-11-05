const express = require("express");
const router = express.Router();
const workflowController = require("../controllers/workflowController");
const authorize = require("../middleware/authorize");

// GET /api/workflows
router.get("/", authorize("read:workflows"), workflowController.getWorkflows);
// POST /api/workflows
router.post(
  "/",
  authorize("create:workflows"),
  workflowController.createWorkflow
);
// PUT /api/workflows/:id
router.put(
  "/:id",
  authorize("update:workflows"),
  workflowController.updateWorkflow
);

module.exports = router;
