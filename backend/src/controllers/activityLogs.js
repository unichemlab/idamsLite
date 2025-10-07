/**
 * @swagger
 * /api/access-logs:
 *   get:
 *     summary: Get all activity logs
 *     tags: [ActivityLogs]
 *     responses:
 *       200:
 *         description: List of activity logs
 */

const pool = require("../config/db");
exports.getAllActivityLogs = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM activity_log ORDER BY date_time_ist DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
