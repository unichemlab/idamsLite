/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

// Simple logger for debugging
function logDebug(...args) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[AUTH DEBUG]", ...args);
  }
}

exports.login = async (req, res) => {
  const { username, password } = req.body;
  logDebug("Login attempt", { username });
  try {
    const userQuery = "SELECT * FROM user_master WHERE username = $1";
    const { rows } = await db.query(userQuery, [username]);
    logDebug("DB query result", rows);
    if (rows.length === 0) {
      logDebug("No user found for username", username);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = rows[0];
    logDebug("User found", user);

    // Check if user is active
    if (user.status !== "ACTIVE") {
      logDebug("User not active", user.status);
      return res.status(403).json({ message: "User is not active" });
    }
    // Compare password
    logDebug("Comparing password", {
      input: password,
      hash: user.password_hash,
    });
    const isMatch = await bcrypt.compare(password, user.password_hash);
    logDebug("Password match result", isMatch);
    if (!isMatch) {
      logDebug("Password does not match");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );
    logDebug("JWT generated", token);
    // Respond with user info (omit password hash)
    res.json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        role_id: user.role_id,
        status: user.status,
        email: user.email,
        full_name: user.full_name,
      },
    });
    logDebug("Login success for", username);
  } catch (err) {
    console.error("[AUTH ERROR]", err);
    res.status(500).json({ message: "Server error" });
  }
};
