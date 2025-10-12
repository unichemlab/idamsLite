const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task");

// Get all tasks
router.get("/", taskController.getAllTasks);

router.get("/:id", taskController.getUserTaskRequestById);
// Update a task
router.put("/:id", taskController.updateTask);



module.exports = router;
