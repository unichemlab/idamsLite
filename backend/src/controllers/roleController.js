/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     responses:
 *       200:
 *         description: List of roles
 *   post:
 *     summary: Add a new role
 *     tags: [Roles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Role created
 * /api/roles/{id}:
 *   put:
 *     summary: Edit a role
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Role updated
 */
const pool = require("../config/db");

// Get all roles
exports.getAllRoles = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM role_master ORDER BY id");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new role
exports.createRole = async (req, res) => {
  const { role_name, description, status } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO role_master (role_name, description, status) VALUES ($1, $2, $3) RETURNING *",
      [role_name, description, status]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a role
exports.updateRole = async (req, res) => {
  const { id } = req.params;
  const { role_name, description, status } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE role_master SET role_name=$1, description=$2, status=$3, updated_on=NOW() WHERE id=$4 RETURNING *",
      [role_name, description, status, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a role
exports.deleteRole = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM role_master WHERE id=$1", [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
