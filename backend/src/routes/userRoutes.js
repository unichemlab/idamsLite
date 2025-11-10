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

module.exports = router;
