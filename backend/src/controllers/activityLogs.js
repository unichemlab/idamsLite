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
    const { rows } = await pool.query(`
      SELECT 
        al.*,
        um.employee_name AS action_user_name
      FROM activity_log al
      LEFT JOIN user_master um ON um.id = al.action_performed_by
      WHERE action <> 'access_denied'
      ORDER BY date_time_ist DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getParticularIDActivityLogs = async (req, res) => {
  try {
    const { table_name, record_id } = req.query;

    if (!table_name || !record_id) {
      return res.status(400).json({ message: "table_name and record_id are required" });
    }

    const logs = await pool.query(
      `
      SELECT 
        al.*,
        u.username,
        u.employee_name
      FROM access_log al
      LEFT JOIN user_master u 
        ON u.id = al.action_performed_by
      WHERE al.table_name = $1
      AND al.record_id = $2
      ORDER BY al.date_time_ist DESC
      `,
      [table_name, record_id]
    );

    res.json(logs.rows);
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    res.status(500).json({ message: "Failed to fetch activity logs" });
  }
};


