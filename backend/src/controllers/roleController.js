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
  const { role_code, role_name, description, status } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO role_master (role_code, role_name, description, status) VALUES ($1, $2, $3, $4) RETURNING *",
      [role_code, role_name, description, status]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a role
exports.updateRole = async (req, res) => {
  const { id } = req.params;
  const { role_code, role_name, description, status } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE role_master SET role_code=$1, role_name=$2, description=$3, status=$4, updated_on=NOW() WHERE id=$5 RETURNING *",
      [role_code, role_name, description, status, id]
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
