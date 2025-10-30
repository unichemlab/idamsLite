const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const serviceRequestController = require("../controllers/serviceRequestController");

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
router.get("/", serviceRequestController.getAllUserRequests);
// Search user requests
router.get("/search", serviceRequestController.searchUserRequests);
router.post("/", upload.single("training_attachment"), serviceRequestController.createUserRequest);
router.get("/:id", serviceRequestController.getUserRequestById);
router.put("/:id", upload.single("training_attachment"), serviceRequestController.updateUserRequest);
router.delete("/:id", serviceRequestController.deleteUserRequest);


// 📥 Download attachment
router.get("/:id/attachment", serviceRequestController.downloadAttachment);

module.exports = router;
