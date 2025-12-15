const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task");
const authorize = require("../middleware/authorize");

// Get all tasks - Only requires authenticated user initially
router.get("/", authorize(), taskController.getAllTasks);

// Get specific task
router.get("/:id", authorize(["view:tasks", "approver", "admin"]), taskController.getUserTaskRequestById);


// Update a task - requires manage:tasks permission or admin role
router.put("/:id", authorize(["manage:tasks", "admin"]), taskController.updateTask);

module.exports = router;
