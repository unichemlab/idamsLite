/**
 * @swagger
 * /api/access-logs:
 *   get:
 *     summary: Get all plant id admin
 *     tags: [PlantITAdmin]
 *     responses:
 *       200:
 *         description: List of plant id admin
 *   post:
 *     summary: Create a new access log entry
 *     tags: [PlantITAdmin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: plant id admin created
 */

const pool = require("../config/db");
exports.getAllPlantITAdmin = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM plant_it_admin ORDER BY timestamp DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAccessLog = async (req, res) => {
  const { plant_id, record_id, action, performed_by, details } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO plant_it_admin
      (plant_id, record_id, action, performed_by, details, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`,
      [table_name, record_id, action, performed_by, details || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
