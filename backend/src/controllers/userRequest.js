/**
 * @swagger
 * /api/user-requests:
 *   get:
 *     summary: Get all user requests
 *     tags: [UserRequests]
 *     responses:
 *       200:
 *         description: List of user requests
 *   post:
 *     summary: Create a new user request
 *     tags: [UserRequests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: User request created
 * /api/user-requests/{id}:
 *   put:
 *     summary: Update a user request
 *     tags: [UserRequests]
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
 *         description: User request updated
 */

const pool = require("../config/db");
/**
 * Get all user requests with their tasks (department, role, application names)
 */
exports.getAllUserRequests = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ur.id AS user_request_id,
              ur.request_for_by,
              ur.name,
              ur.employee_code,
              ur.employee_location,
              ur.access_request_type,
              ur.training_status,
              ur.vendor_name,
              ur.vendor_firm,
              ur.vendor_code,
              ur.vendor_allocated_id,
              ur.status AS user_request_status,
              ur.created_on,
              tr.id AS task_id,
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
       FROM user_requests ur
       LEFT JOIN task_requests tr ON ur.id = tr.user_request_id
       LEFT JOIN department_master d ON tr.department = d.id
       LEFT JOIN role_master r ON tr.role = r.id
       LEFT JOIN plant_master p ON tr.location = p.id
       LEFT JOIN application_master app ON tr.application_equip_id = app.id
       ORDER BY ur.created_on DESC, tr.id`
    );

    if (rows.length === 0) {
      return res.json([]);
    }

    // Group rows by user_request_id
    const requestsMap = {};
    for (const row of rows) {
      if (!requestsMap[row.user_request_id]) {
        requestsMap[row.user_request_id] = {
          id: row.user_request_id,
          request_for_by: row.request_for_by,
          name: row.name,
          employee_code: row.employee_code,
          employee_location: row.employee_location,
          access_request_type: row.access_request_type,
          training_status: row.training_status,
          vendor_name: row.vendor_name,
          vendor_firm: row.vendor_firm,
          vendor_code: row.vendor_code,
          vendor_allocated_id: row.vendor_allocated_id,
          status: row.user_request_status,
          created_on: row.created_on,
          tasks: []
        };
      }

      if (row.task_id) {
        requestsMap[row.user_request_id].tasks.push({
          task_id: row.task_id,
          application_equip_id: row.application_equip_id,
          application_name: row.application_name,
          department_id: row.department,
          department_name: row.department_name,
          role_id: row.role,
          role_name: row.role_name,
          location: row.location,
          reports_to: row.reports_to,
          task_status: row.task_status
        });
      }
    }

    res.json(Object.values(requestsMap));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.createUserRequest = async (req, res) => {
  const {
    request_for_by,
    name,
    employee_code,
    employee_location,
    access_request_type,
    training_status,
    training_attachment,
    vendor_name,
    vendor_firm,
    vendor_code,
    vendor_allocated_id,
    status,
    tasks = [],
  } = req.body;

  try {
    // 1. Insert into user_requests
    const { rows } = await pool.query(
      `INSERT INTO user_requests
      (request_for_by, name, employee_code, employee_location, access_request_type,
       training_status, training_attachment, vendor_name, vendor_firm, vendor_code,
       vendor_allocated_id, status, created_on)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
      RETURNING *`,
      [
        request_for_by,
        name,
        employee_code || null,
        employee_location,
        access_request_type,
        training_status,
        training_attachment || null,
        vendor_name || null,
        vendor_firm || null,
        vendor_code || null,
        vendor_allocated_id || null,
        status || "Pending",
      ]
    );
    const userRequest = rows[0];

    // 2. Insert related tasks
    for (const task of tasks) {
      await pool.query(
        `INSERT INTO task_requests
        (user_request_id, application_equip_id, department, role, location, reports_to, task_status, created_on)
        VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [
          userRequest.id,
          task.application_equip_id,
          task.department,
          task.role,
          task.location,
          task.reports_to,
          task.task_status || "Pending",
        ]
      );
    }

    res.status(201).json(userRequest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUserRequest = async (req, res) => {
  const { id } = req.params;
  const {
    request_for_by,
    name,
    employee_code,
    employee_location,
    access_request_type,
    training_status,
    training_attachment,
    vendor_name,
    vendor_firm,
    vendor_code,
    vendor_allocated_id,
    status,
    tasks = [],
  } = req.body;

  try {
    // 1. Update user_requests
    const { rows } = await pool.query(
      `UPDATE user_requests SET
      request_for_by=$1, name=$2, employee_code=$3, employee_location=$4, access_request_type=$5,
      training_status=$6, training_attachment=$7, vendor_name=$8, vendor_firm=$9, vendor_code=$10,
      vendor_allocated_id=$11, status=$12, updated_on=NOW()
      WHERE id=$13 RETURNING *`,
      [
        request_for_by,
        name,
        employee_code || null,
        employee_location,
        access_request_type,
        training_status,
        training_attachment || null,
        vendor_name || null,
        vendor_firm || null,
        vendor_code || null,
        vendor_allocated_id || null,
        status || "Pending",
        id,
      ]
    );
    const updatedRequest = rows[0];

    // 2. Replace old tasks with new ones
    await pool.query("DELETE FROM task_requests WHERE user_request_id=$1", [id]);

    for (const task of tasks) {
      await pool.query(
        `INSERT INTO task_requests
        (user_request_id, application_equip_id, department, role, location, reports_to, task_status, created_on)
        VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [
          id,
          task.application_equip_id,
          task.department,
          task.role,
          task.location,
          task.reports_to,
          task.task_status || "Pending",
        ]
      );
    }

    res.json(updatedRequest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteUserRequest = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM user_requests WHERE id=$1", [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* /api/user-requests/{id}:
  get:
    summary: Get a single user request with its tasks
    tags: [UserRequests]
    parameters:
      - in: path
        name: id
        required: true
        schema:
          type: integer
    responses:
      200:
        description: A user request with tasks
*/

/**
 * Get a single user request with all tasks, department, role, and application details
 */
exports.getUserRequestById = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT ur.id AS user_request_id,
              ur.request_for_by,
              ur.name,
              ur.employee_code,
              ur.employee_location,
              ur.access_request_type,
              ur.training_status,
              ur.vendor_name,
              ur.vendor_firm,
              ur.vendor_code,
              ur.vendor_allocated_id,
              ur.status AS user_request_status,
              tr.id AS task_id,
              tr.application_equip_id,
              app.display_name AS application_name,
              tr.department,
              d.department_name,
              tr.role,
              r.role_name AS role_name,
              p.plant_name AS plant_name,
              tr.location,
              tr.reports_to,
              tr.task_status
       FROM user_requests ur
       LEFT JOIN task_requests tr ON ur.id = tr.user_request_id
       LEFT JOIN department_master d ON tr.department = d.id
       LEFT JOIN role_master r ON tr.role = r.id
       LEFT JOIN plant_master p ON tr.location = p.id
       LEFT JOIN application_master app ON tr.application_equip_id = app.id
       WHERE ur.id = $1
       ORDER BY tr.id`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User request not found" });
    }

    // Format result: 1 user_requests + array of tasks
    const userRequest = {
      id: rows[0].user_request_id,
      request_for_by: rows[0].request_for_by,
      name: rows[0].name,
      employee_code: rows[0].employee_code,
      employee_location: rows[0].employee_location,
      access_request_type: rows[0].access_request_type,
      training_status: rows[0].training_status,
      vendor_name: rows[0].vendor_name,
      vendor_firm: rows[0].vendor_firm,
      vendor_code: rows[0].vendor_code,
      vendor_allocated_id: rows[0].vendor_allocated_id,
      status: rows[0].user_request_status,
      tasks: rows.map(row => ({
        task_id: row.task_id,
        application_equip_id: row.application_equip_id,
        application_name: row.application_name,
        department_id: row.department,
        department_name: row.department_name,
        role_id: row.role,
        role_name: row.role_name,
        location: row.location,
        reports_to: row.reports_to,
        task_status: row.task_status
      }))
    };

    res.json(userRequest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

