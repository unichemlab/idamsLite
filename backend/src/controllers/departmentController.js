const pool = require("../config/db");

// Get Department Activity Logs
exports.getDepartmentActivityLogs = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM activity_log WHERE table_name = 'department_master' ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Departments
exports.getAllDepartments = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM department_master ORDER BY id"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Department
exports.createDepartment = async (req, res) => {
  const { department_name, description, status } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO department_master (department_name, description, status) VALUES ($1, $2, $3) RETURNING *",
      [department_name, description, status ?? "ACTIVE"]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Department
exports.updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { department_name, description, status } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE department_master SET department_name=$1, description=$2, status=$3, updated_on=NOW() WHERE id=$4 RETURNING *",
      [department_name, description, status, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Department
exports.deleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM department_master WHERE id=$1", [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
