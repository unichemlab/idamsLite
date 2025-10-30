const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task");

// Update a task
router.put("/tasks/:id", taskController.updateTask);
// Get all tasks
router.get("/", taskController.getAllTasks);

router.get("/:id", taskController.getUserTaskRequestById);




module.exports = router;
