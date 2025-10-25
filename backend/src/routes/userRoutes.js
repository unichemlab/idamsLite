const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Get all users
router.get("/", userController.getAllUsers);
// Add new user
router.post("/", userController.addUser);
// Edit user
router.put("/:id", userController.editUser);

router.get("/users/:employeeCode", userController.getUserByEmployeeCode);

router.get('/department', userController.getUserByDepartment);
router.get('/department/:department', userController.getUserByDepartment);

module.exports = router;
