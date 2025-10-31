const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const pool = require("../config/db");
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


// ✅ Approvers route must come first (above any "/:param" routes)
router.get("/approvers", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email is required" });
console.log(email);
  try {
    console.log("➡️ [Approvers API] Checking approver email:", email);
    const result = await pool.query(
      `SELECT * FROM user_requests WHERE approver1_email = $1 OR approver2_email = $1`,
      [email]
    );
    res.json(result.rows || []);
  } catch (err) {
    console.error("❌ Error fetching approver requests:", err);
    res.status(500).json({ error: err });
  }
});



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
