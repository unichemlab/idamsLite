/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: List of tasks
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Task created
 * /api/tasks/{id}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Task updated
 */

const pool = require("../config/db");
exports.getAllTasks = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM task ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createTask = async (req, res) => {
  const { user_request_id, task_name, assigned_to, due_date, status, priority } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO task
      (user_request_id, task_name, assigned_to, due_date, status, priority, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
      [user_request_id, task_name, assigned_to, due_date || null, status || "Pending", priority || "Medium"]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const { user_request_id, task_name, assigned_to, due_date, status, priority } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE task SET
      user_request_id=$1, task_name=$2, assigned_to=$3, due_date=$4, status=$5, priority=$6, updated_at=NOW()
      WHERE id=$7 RETURNING *`,
      [user_request_id, task_name, assigned_to, due_date || null, status || "Pending", priority || "Medium", id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM task WHERE id=$1", [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
