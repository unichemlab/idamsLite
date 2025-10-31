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
    const { rows } = await pool.query(
      `SELECT ur.id AS user_request_id,
        ur.transaction_id AS user_request_transaction_id,
        ur.request_for_by,
        ur.name,
        ur.employee_code,
        ur.employee_location,
        ur.access_request_type,
        ur.training_status,
        ur.training_attachment,
        ur.training_attachment_name,
        ur.vendor_name,
        ur.vendor_firm,
        ur.vendor_code,
        ur.vendor_allocated_id,
        ur.status AS user_request_status,
        ur.created_on,
        tr.id AS task_id,
        tr.transaction_id AS task_request_transaction_id,
        tr.application_equip_id,
        app.display_name AS application_name,
        tr.department,
        d.department_name,
        tr.role,
        r.role_name AS role_name,
        p.plant_name AS plant_name,
        tr.location,
        tr.reports_to,
        tr.task_status,
        tr.remarks
       FROM task_requests tr
       LEFT JOIN user_requests ur ON tr.user_request_id = ur.id
       LEFT JOIN department_master d ON tr.department = d.id
       LEFT JOIN role_master r ON tr.role = r.id
       LEFT JOIN plant_master p ON tr.location = p.id
       LEFT JOIN application_master app ON tr.application_equip_id = app.id
       ORDER BY tr.created_on DESC, ur.id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const {
    user_request_id,
    task_name,
    assigned_to,
    due_date,
    status,
    priority,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE task SET
      user_request_id=$1, task_name=$2, assigned_to=$3, due_date=$4, status=$5, priority=$6, updated_at=NOW()
      WHERE id=$7 RETURNING *`,
      [
        user_request_id,
        task_name,
        assigned_to,
        due_date || null,
        status || "Pending",
        priority || "Medium",
        id,
      ]
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

/**
 * Get a single user request with its tasks
 */
exports.getUserTaskRequestById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT ur.id AS user_request_id,
              ur.transaction_id AS user_request_transaction_id,
              ur.request_for_by,
              ur.name,
              ur.employee_code,
              ur.employee_location,
              ur.access_request_type,
              ur.training_status,
              ur.training_attachment,
              ur.training_attachment_name,
              ur.vendor_name,
              ur.vendor_firm,
              ur.vendor_code,
              ur.vendor_allocated_id,
              ur.status AS user_request_status,
              ur.approver1_status,
              ur.approver2_status,
              ur.created_on,
              tr.id AS task_id,
              tr.transaction_id AS task_request_transaction_id,
              tr.application_equip_id,
              app.display_name AS application_name,
              tr.department,
              d.department_name,
              tr.role,
              r.role_name AS role_name,
              p.plant_name AS plant_name,
              tr.location,
              tr.reports_to,
              tr.task_status,
              tr.remarks
       FROM task_requests tr
       LEFT JOIN user_requests ur ON tr.user_request_id = ur.id
       LEFT JOIN department_master d ON tr.department = d.id
       LEFT JOIN role_master r ON tr.role = r.id
       LEFT JOIN plant_master p ON tr.location = p.id
       LEFT JOIN application_master app ON tr.application_equip_id = app.id
       WHERE tr.id = $1
       ORDER BY tr.id`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User request not found" });
    }

    const userRequest = {
      id: rows[0].user_request_id,
      request_for_by: rows[0].request_for_by,
      ritmNumber: rows[0].user_request_transaction_id,
      name: rows[0].name,
      employee_code: rows[0].employee_code,
      employee_location: rows[0].employee_location,
      access_request_type: rows[0].access_request_type,
      training_status: rows[0].training_status,
      training_attachment: rows[0].training_attachment,
      training_attachment_name: rows[0].training_attachment_name,
      vendor_name: rows[0].vendor_name,
      vendor_firm: rows[0].vendor_firm,
      vendor_code: rows[0].vendor_code,
      vendor_allocated_id: rows[0].vendor_allocated_id,
      status: rows[0].user_request_status,
      tasks: rows
        .filter((r) => r.task_id)
        .map((row) => ({
          task_id: row.task_id,
          taskNumber: row.task_request_transaction_id,
          application_equip_id: row.application_equip_id,
          application_name: row.application_name,
          department_id: row.department,
          department_name: row.department_name,
          role_id: row.role,
          role_name: row.role_name,
          location: row.location,
          reports_to: row.reports_to,
          task_status: row.task_status,
        })),
    };

    res.json(userRequest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
