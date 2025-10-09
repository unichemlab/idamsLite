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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: User request created
 * /api/user-requests/{id}:
 *   get:
 *     summary: Get a single user request with its tasks
 *     tags: [UserRequests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A user request with tasks
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: User request updated
 *   delete:
 *     summary: Delete a user request
 *     tags: [UserRequests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: User request deleted
 * /api/user-requests/{id}/attachment:
 *   get:
 *     summary: Download attachment for a user request
 *     tags: [UserRequests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File downloaded
 */

const { sendEmail } = require("../utils/email");
const { getApprovalEmail } = require("../utils/emailTemplate");
const pool = require("../config/db");
const path = require("path");
const fs = require("fs");

/**
 * Get all user requests with tasks
 */
exports.getAllUserRequests = async (req, res) => {
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
       FROM user_requests ur
       LEFT JOIN task_requests tr ON ur.id = tr.user_request_id
       LEFT JOIN department_master d ON tr.department = d.id
       LEFT JOIN role_master r ON tr.role = r.id
       LEFT JOIN plant_master p ON tr.location = p.id
       LEFT JOIN application_master app ON tr.application_equip_id = app.id
       ORDER BY ur.created_on DESC, tr.id`
    );

    const requestsMap = {};
    for (const row of rows) {
      if (!requestsMap[row.user_request_id]) {
        requestsMap[row.user_request_id] = {
          id: row.user_request_id,
          transaction_id:row.user_request_transaction_id,
          request_for_by: row.request_for_by,
          name: row.name,
          employee_code: row.employee_code,
          employee_location: row.employee_location,
          access_request_type: row.access_request_type,
          training_status: row.training_status,
          training_attachment: row.training_attachment,
          training_attachment_name: row.training_attachment_name,
          vendor_name: row.vendor_name,
          vendor_firm: row.vendor_firm,
          vendor_code: row.vendor_code,
          vendor_allocated_id: row.vendor_allocated_id,
          status: row.user_request_status,
          created_on: row.created_on,
          tasks: [],
        };
      }

      if (row.task_id) {
        requestsMap[row.user_request_id].tasks.push({
          task_id: row.task_id,
          transaction_id:row.task_request_transaction_id,
          application_equip_id: row.application_equip_id,
          application_name: row.application_name,
          department_id: row.department,
          department_name: row.department_name,
          role_id: row.role,
          role_name: row.role_name,
          location: row.plant_name,
          reports_to: row.reports_to,
          task_status: row.task_status,
        });
      }
    }

    res.json(Object.values(requestsMap));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Inside your existing exports.createUserRequest
exports.createUserRequest = async (req, res) => {
  try {
    const {
      request_for_by,
      name,
      employee_code,
      employee_location,
      access_request_type,
      training_status,
      vendor_name,
      vendor_firm,
      vendor_code,
      vendor_allocated_id,
      status,
      approver1_email, // send email to Approver 1
      approver2_email  // send email to Approver 2
    } = req.body;

    // Parse tasks safely
    let tasks = [];
    if (req.body.tasks) {
      try {
        tasks = JSON.parse(req.body.tasks);
      } catch (err) {
        return res.status(400).json({ error: "Invalid tasks JSON" });
      }
    }

    const training_attachment = req.file ? req.file.filename : null;
    const training_attachment_name = req.file ? req.file.originalname : null;

    // Insert user_request
    const { rows } = await pool.query(
      `INSERT INTO user_requests
      (request_for_by, name, employee_code, employee_location, access_request_type,
       training_status, training_attachment, training_attachment_name,
       vendor_name, vendor_firm, vendor_code, vendor_allocated_id, status,
       approver1_email, approver1_status, approver2_email, approver2_status, created_on)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Pending',$15,'Pending',NOW())
      RETURNING *`,
      [
        request_for_by,
        name,
        employee_code || null,
        employee_location,
        access_request_type,
        training_status,
        training_attachment,
        training_attachment_name,
        vendor_name || null,
        vendor_firm || null,
        vendor_code || null,
        vendor_allocated_id || null,
        status || "Pending",
        approver1_email,
        approver2_email,
      ]
    );

    const userRequest = rows[0];

    // Insert tasks
    for (const task of tasks) {
      await pool.query(
        `INSERT INTO task_requests
        (user_request_id, application_equip_id, department, role, location, reports_to, task_status,approver1_id,approver2_id, created_on)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
        [
          userRequest.id,
          task.application_equip_id,
          task.department,
          task.role,
          task.location,
          task.reports_to,
          task.task_status || "Pending",
          task.approver1_id,
          task.approver2_id,
          
        ]
      );
    }

    // --- Send email to Approver 1 ---
    if (approver1_email) {
      const token = Buffer.from(`${userRequest.id}|${approver1_email}`).toString("base64");

      const approveLink = `${process.env.FRONTEND_URL}/approve-request/${userRequest.id}?token=${token}&action=approve&approverEmail=${approver1_email}`;
      const rejectLink = `${process.env.FRONTEND_URL}/approve-request/${userRequest.id}?token=${token}&action=reject&approverEmail=${approver1_email}`;

      await sendEmail({
        to: approver1_email,
        subject: "New User Request Approval Required",
        html: getApprovalEmail({
          userRequest,
          approveLink,
          rejectLink,
          approverName: "Approver 1"
        }),
        attachments: training_attachment ? [
          {
            filename: training_attachment_name,
            path: path.join(__dirname, "../uploads", training_attachment),
          },
        ] : [],
      });
    }

    res.status(201).json(userRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


/**
 * Update a user request and replace tasks
 */
exports.updateUserRequest = async (req, res) => {
  const { id } = req.params;
  const {
    request_for_by,
    name,
    employee_code,
    employee_location,
    access_request_type,
    training_status,
    vendor_name,
    vendor_firm,
    vendor_code,
    vendor_allocated_id,
    status,
  } = req.body;

  const tasks = req.body.tasks ? JSON.parse(req.body.tasks) : [];

  const training_attachment = req.file ? req.file.filename : null;
  const training_attachment_name = req.file ? req.file.originalname : null;

  try {
    const { rows } = await pool.query(
      `UPDATE user_requests SET
      request_for_by=$1, name=$2, employee_code=$3, employee_location=$4, access_request_type=$5,
      training_status=$6, training_attachment=COALESCE($7, training_attachment),
      training_attachment_name=COALESCE($8, training_attachment_name),
      vendor_name=$9, vendor_firm=$10, vendor_code=$11, vendor_allocated_id=$12,
      status=$13, updated_on=NOW()
      WHERE id=$14 RETURNING *`,
      [
        request_for_by,
        name,
        employee_code || null,
        employee_location,
        access_request_type,
        training_status,
        training_attachment,
        training_attachment_name,
        vendor_name || null,
        vendor_firm || null,
        vendor_code || null,
        vendor_allocated_id || null,
        status || "Pending",
        id,
      ]
    );
    const updatedRequest = rows[0];

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

/**
 * Delete a user request
 */
exports.deleteUserRequest = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM user_requests WHERE id=$1", [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get a single user request with its tasks
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
              ur.training_attachment,
              ur.training_attachment_name,
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

    const userRequest = {
      id: rows[0].user_request_id,
      request_for_by: rows[0].request_for_by,
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

/**
 * Download training attachment
 */
exports.downloadAttachment = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT training_attachment, training_attachment_name FROM user_requests WHERE id=$1",
      [id]
    );
    if (rows.length === 0 || !rows[0].training_attachment) {
      return res.status(404).json({ error: "File not found" });
    }

    const filePath = path.join(__dirname, "../uploads", rows[0].training_attachment);
    const originalName = rows[0].training_attachment_name || "attachment";
console.log("filepath:",filePath);
console.log("originalpath:",originalName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.download(filePath, originalName);
  } catch (err) {
    console.log("dfdfdf",err.message);
    res.status(500).json({ error: err.message });
  }
};


exports.searchUserRequests = async (req, res) => {
  console.log("req.query:", req.query);
  const {
    transactionId,
    employeeCode,
    plant_location,
    department,
    applicationId,
  } = req.query;

  try {
    const conditions = [];
    const values = [];

    // Transaction Id
    if (transactionId) {
      values.push(`%${transactionId.toLowerCase()}%`);
      conditions.push(`LOWER(ur.transaction_id) LIKE $${values.length}`);
    }

    // Employee Code
    if (employeeCode) {
      values.push(`%${employeeCode.toLowerCase()}%`);
      conditions.push(`LOWER(ur.employee_code) LIKE $${values.length}`);
    }

    // Plant location (integer)
    if (plant_location) {
      const plantId = parseInt(plant_location, 10);
      if (isNaN(plantId)) {
        return res
          .status(400)
          .json({ error: "plant_location must be an integer" });
      }
      values.push(plantId);
      conditions.push(`tr.location = $${values.length}`);
    }

    // Department (integer)
    if (department) {
      const deptId = parseInt(department, 10);
      if (isNaN(deptId)) {
        return res.status(400).json({ error: "department must be an integer" });
      }
      values.push(deptId);
      conditions.push(`tr.department = $${values.length}`);
    }

    // Application Id (integer)
    if (applicationId) {
      const appId = parseInt(applicationId, 10);
      if (isNaN(appId)) {
        return res
          .status(400)
          .json({ error: "applicationId must be an integer" });
      }
      values.push(appId);
      conditions.push(`tr.application_equip_id = $${values.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // Debug query:
    console.log("WHERE:", whereClause, "values:", values);

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
       FROM user_requests ur
       LEFT JOIN task_requests tr ON ur.id = tr.user_request_id
       LEFT JOIN department_master d ON tr.department = d.id
       LEFT JOIN role_master r ON tr.role = r.id
       LEFT JOIN plant_master p ON tr.location = p.id
       LEFT JOIN application_master app ON tr.application_equip_id = app.id
      ${whereClause}
      
      ORDER BY ur.created_on DESC
      `,
      values
    );

   const requestsMap = {};
    for (const row of rows) {
      if (!requestsMap[row.user_request_id]) {
        requestsMap[row.user_request_id] = {
          id: row.user_request_id,
          transaction_id:row.user_request_transaction_id,
          request_for_by: row.request_for_by,
          name: row.name,
          employeeCode: row.employee_code,
          employee_location: row.employee_location,
          accessType: row.access_request_type,
          training_status: row.training_status,
          training_attachment: row.training_attachment,
          training_attachment_name: row.training_attachment_name,
          vendor_name: row.vendor_name,
          vendor_firm: row.vendor_firm,
          vendor_code: row.vendor_code,
          vendor_allocated_id: row.vendor_allocated_id,
          status: row.user_request_status,
          created_on: row.created_on,
          tasks: [],
        };
      }

      if (row.task_id) {
        requestsMap[row.user_request_id].tasks.push({
          task_id: row.task_id,
          transaction_id:row.task_request_transaction_id,
          application_equip_id: row.application_equip_id,
          application_name: row.application_name,
          department_id: row.department,
          department: row.department_name,
          role_id: row.role,
          role: row.role_name,
          location: row.plant_name,
          reports_to: row.reports_to,
          task_status: row.task_status,
        });
      }
    }

    res.json(Object.values(requestsMap));
  } catch (err) {
    console.error("Search failed:", err);
    res.status(500).json({ error: err.message });
  }
};



