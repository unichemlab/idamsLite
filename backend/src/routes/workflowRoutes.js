const express = require("express");
const router = express.Router();
const workflowController = require("../controllers/workflowController");
const authorize = require("../middleware/authorize");

// GET /api/workflows - allow any authenticated user to list workflows (we check membership inside controller)
router.get("/", authorize(), workflowController.getWorkflows);
// Debug endpoint: check if a user id appears as approver in any workflow
router.get("/is-approver/:id", authorize(), workflowController.isApprover);
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
