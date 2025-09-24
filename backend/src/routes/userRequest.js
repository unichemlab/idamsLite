const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const userRequestController = require("../controllers/userRequest");

// 📂 Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    // Save with timestamp prefix
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/**
 * Routes
 */
router.get("/", userRequestController.getAllUserRequests);
// Search user requests
router.get("/search", userRequestController.searchUserRequests);
router.post("/", upload.single("training_attachment"), userRequestController.createUserRequest);
router.get("/:id", userRequestController.getUserRequestById);
router.put("/:id", upload.single("training_attachment"), userRequestController.updateUserRequest);
router.delete("/:id", userRequestController.deleteUserRequest);


// 📥 Download attachment
router.get("/:id/attachment", userRequestController.downloadAttachment);

module.exports = router;
