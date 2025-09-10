/**
 * @swagger
 * /api/access-logs:
 *   get:
 *     summary: Get all access logs
 *     tags: [AccessLogs]
 *     responses:
 *       200:
 *         description: List of access logs
 *   post:
 *     summary: Create a new access log entry
 *     tags: [AccessLogs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Access log created
 */

const pool = require("../config/db");
exports.getAllAccessLogs = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM access_log ORDER BY timestamp DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAccessLog = async (req, res) => {
  const { table_name, record_id, action, performed_by, details } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO access_log
      (table_name, record_id, action, performed_by, details, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`,
      [table_name, record_id, action, performed_by, details || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
