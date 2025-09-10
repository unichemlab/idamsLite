const express = require("express");
const router = express.Router();
const userRequestController = require("../controllers/userRequest");

// Get all user requests
router.get("/", userRequestController.getAllUserRequests);

// Create a new user request
router.post("/", userRequestController.createUserRequest);

// Update a user request
router.put("/:id", userRequestController.updateUserRequest);

// Delete a user request
router.delete("/:id", userRequestController.deleteUserRequest);

module.exports = router;
