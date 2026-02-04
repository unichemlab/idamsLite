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
// Helper: fetch user request and tasks
const getUserRequestWithTasks = async (id) => {
  const { rows: userRows } = await pool.query(
    `SELECT * FROM user_requests WHERE id=$1`,
    [id]
  );
  if (!userRows[0]) return null;
  const request = userRows[0];

  const { rows: taskRows } = await pool.query(
    `SELECT 
    tr.id,tr.transaction_id AS task_id,
            tr.application_equip_id,
            app.display_name AS application_name,
            tr.department,
            d.department_name,
            tr.role,
            r.role_name AS role_name,
            tr.location,
            p.plant_name AS location_name,
            tr.reports_to,
            tr.task_status
     FROM task_requests tr
     LEFT JOIN department_master d ON tr.department = d.id
     LEFT JOIN role_master r ON tr.role = r.id
     LEFT JOIN plant_master p ON tr.location = p.id
     LEFT JOIN application_master app ON tr.application_equip_id = app.id
     WHERE tr.user_request_id=$1
     ORDER BY tr.id`,
    [id]
  );

  const tasks = taskRows.map((t) => ({
    id: t.id,
    task_id: t.task_id,
    application_equip_id: t.application_equip_id,
    application_name: t.application_name,
    department_id: t.department,
    department_name: t.department_name,
    role_id: t.role,
    role_name: t.role_name,
    location: t.location_name,
    location_id: t.location,
    reports_to: t.reports_to,
    task_status: t.task_status,
  }));

  return { request, tasks };
};
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
          transaction_id: row.user_request_transaction_id,
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
          transaction_id: row.task_request_transaction_id,
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
      approver2_email, // send email to Approver 2
       user_request_type,
        from_date,
        to_date,
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
       approver1_email, approver1_status, approver2_email, approver2_status, created_on,
       user_request_type,from_date,to_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Pending',$15,'Pending',NOW(),$16,$17,$18)
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
        user_request_type || null,
        from_date || null,
        to_date || null,
      ]
    );

    const userRequest = rows[0];
console.log("Created user request:", userRequest);
    // Fetch approval workflow for this location/department to get approver details
    const workflowQuery = `
      SELECT awm.approver_1_id, awm.approver_2_id, 
             u1.employee_name AS approver1_name, u1.email AS approver1_email,
             u2.employee_name AS approver2_name, u2.email AS approver2_email
      FROM approval_workflow_master awm
      LEFT JOIN user_master u1 ON u1.id::text = awm.approver_1_id
      LEFT JOIN user_master u2 ON u2.id::text = awm.approver_2_id
      WHERE awm.plant_id = (
        SELECT id FROM plant_master WHERE id = $1 LIMIT 1
      )
      LIMIT 1
    `;

    // Get the location id from first task to find the approval workflow
    let approverDetails = null;
    if (tasks.length > 0 && tasks[0].location) {
      try {
        const workflowResult = await pool.query(workflowQuery, [
          tasks[0].location,
        ]);
        if (workflowResult.rows.length > 0) {
          approverDetails = workflowResult.rows[0];
        }
      } catch (err) {
        console.error("Error fetching workflow details:", err);
      }
    }

    // Insert tasks
    for (const task of tasks) {
      // Determine approver details - either from task or from workflow
      const approver1Id = task.approver1_id || approverDetails?.approver_1_id;
      const approver2Id = task.approver2_id || parseInt(approverDetails?.approver_2_id.split(",")[0], 10)|| null;
      const approver1Name =
        task.approver1_name || approverDetails?.approver1_name||null;
      const approver2Name =
        task.approver2_name || approverDetails?.approver2_name||null;
      const approver1Email =
        approverDetails?.approver1_email || approver1_email||null;
      const approver2Email =
        approverDetails?.approver2_email || approver2_email||null;
      await pool.query(
        `INSERT INTO task_requests
        (user_request_id, application_equip_id, department, role, location, reports_to, task_status,
         approver1_id, approver2_id, approver1_name, approver2_name, 
         approver1_email, approver2_email, created_on)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())`,
        [
          userRequest.id,
          task.application_equip_id,
          task.department,
          task.role,
          task.location,
          task.reports_to,
          task.task_status || "Pending",
          approver1Id,
          approver2Id,
          approver1Name,
          approver2Name,
          approver1Email,
          approver2Email,
        ]
      );
    }
    const { request: user_request, tasks: task_request } =
      await getUserRequestWithTasks(userRequest.id);
    // --- Send email to Approver 1 ---
    if (approver1_email) {
      const token = Buffer.from(
        `${userRequest.id}|${approver1_email}`
      ).toString("base64");

      const approveLink = `${process.env.FRONTEND_URL}/approve-request/${userRequest.id}?token=${token}&action=approve&approverEmail=${approver1_email}`;
      const rejectLink = `${process.env.FRONTEND_URL}/approve-request/${userRequest.id}?token=${token}&action=reject&approverEmail=${approver1_email}`;

      await sendEmail({
        to: approver1_email,
        subject: "New User Request Approval Required",
        html: getApprovalEmail({
          userRequest: user_request,
          tasks: task_request,
          approveLink,
          rejectLink,
          approverName: "Approver 1",
        }),
        attachments: training_attachment
          ? [
              // Inline logo
              {
                filename: "login_headTitle2.png",
                path: path.join(
                  __dirname,
                  "../../../frontend/src/assets/login_headTitle2.png"
                ),
                cid: "logo", // <img src="cid:logo">
              },
              {
                filename: training_attachment_name,
                path: path.join(__dirname, "../uploads", training_attachment),
              },
            ]
          : [],
      });
    }

    res.status(201).json({
      userTransactionId: userRequest.transaction_id,
      userRequest: user_request,
      tasks: task_request,
    });
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

    await pool.query("DELETE FROM task_requests WHERE user_request_id=$1", [
      id,
    ]);

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
              tr.transaction_id AS task_request_transaction_id,
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
          transaction_id: row.task_request_transaction_id,
          application_equip_id: row.application_equip_id,
          application_name: row.application_name,
          department_id: row.department,
          department_name: row.department_name,
          role_id: row.role,
          role_name: row.role_name,
          location: row.location,
          location_name: row.plant_name,
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

    const filePath = path.join(
      __dirname,
      "../uploads",
      rows[0].training_attachment
    );
    const originalName = rows[0].training_attachment_name || "attachment";
    console.log("filepath:", filePath);
    console.log("originalpath:", originalName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.download(filePath, originalName);
  } catch (err) {
    console.log("dfdfdf", err.message);
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
              ur.approver1_status,
              ur.approver2_status,
              ur.created_on,
              tr.id AS task_id,
              tr.transaction_id AS task_request_transaction_id,
              tr.application_equip_id,
              app.display_name AS application_name,
              tr.approver1_comments,
              tr.approver2_comments,
              tr.approver1_action_timestamp,
              tr.approver2_action_timestamp,
              tr.approver1_action,
              tr.approver2_action,
              tr.department,
              d.department_name,
              tr.role,
              r.role_name AS role_name,
              p.plant_name AS plant_name,
              tr.location,
              tr.reports_to,
              tr.task_status,
              tr.remarks,
              tr.approver1_comments,
              tr.approver2_comments
       FROM user_requests ur
       LEFT JOIN task_requests tr ON ur.id = tr.user_request_id
       LEFT JOIN department_master d ON tr.department = d.id
       LEFT JOIN role_master r ON tr.role = r.id
       LEFT JOIN plant_master p ON tr.location = p.id
       LEFT JOIN application_master app ON tr.application_equip_id = app.id
      ${whereClause}
      
    ORDER BY ur.id DESC
      `,
      values
    );

    const requestsMap = {};
    for (const row of rows) {
      if (!requestsMap[row.user_request_id]) {
        requestsMap[row.user_request_id] = {
          id: row.user_request_id,
          transaction_id: row.user_request_transaction_id,
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
          approver1_status: row.approver1_status,
          approver2_status: row.approver2_status,
          created_on: row.created_on,
          tasks: [],
        };
      }

      if (row.task_id) {
        requestsMap[row.user_request_id].tasks.push({
          task_id: row.task_id,
          transaction_id: row.task_request_transaction_id,
          application_equip_id: row.application_equip_id,
          application_name: row.application_name,
          department_id: row.department,
          department: row.department_name,
          role_id: row.role,
          role: row.role_name,
          location: row.plant_name,
          reports_to: row.reports_to,
          task_status: row.task_status,
          remarks: row.remarks,
          approver1_comments: row.approver1_comments,
          approver2_comments: row.approver2_comments,
          approver1_action: row.approver1_action,
          approver2_action: row.approver2_action,
          approver1_action_timestamp: row.approver1_action_timestamp,
          approver2_action_timestamp: row.approver2_action_timestamp,
        });
      }
    }

    res.json(Object.values(requestsMap));
  } catch (err) {
    console.error("Search failed:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.checkInFlightAndAccessLog = async (req, res) => {
  const {
    plant_location,
    department,
    applicationId,
    accessType,
  } = req.body;

  try {
    // 1️⃣ Check in-flight user requests
    const inFlight = await pool.query(
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
        WHERE tr.location = $1
        AND tr.department = $2
        AND tr.application_equip_id = $3
        AND tr.task_status IN ('Pending', 'Approved')
      LIMIT 1
      `,
      [plant_location, department, applicationId]
    );

    if (inFlight.rowCount > 0) {
      return res.status(409).json({
        conflict: true,
        source: "IN_FLIGHT",
        message: "Request already in progress",
      });
    }

    // 2️⃣ Check access log
    const accessLog = await pool.query(
      `
      SELECT 1
      FROM access_log
      WHERE location = $1
        AND department = $2
        AND application_equip_id = $3
        AND task_status IN ('Pending', 'In Progress', 'Approved')
      LIMIT 1
      `,
      [plant_location, department, applicationId]
    );

    if (accessLog.rowCount > 0) {
      return res.status(409).json({
        conflict: true,
        source: "ACCESS_LOG",
        message: "Access already exists or not closed",
      });
    }

    res.json({ conflict: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Validation failed" });
  }
};

// exports.checkInFlightRequest = async (req, res) => {
//   const { applicationId,request_for_by,name,vendor_name,plant_location,department,accessType } = req.body;
// //console.log("Checking in-flight for:", req.body);
//   try {
//     const appIds = Array.isArray(applicationId)
//       ? applicationId
//       : [applicationId];

//  const inFlightParams =
//         request_for_by === "Vendor / OEM"
//           ? [plant_location, department, appIds, vendor_name]
//           : [plant_location, department, appIds, name];
//     const { rows } = await pool.query(
//       `SELECT ur.id AS user_request_id,
//               ur.transaction_id AS user_request_transaction_id,
//               ur.request_for_by,
//               ur.name,
//               ur.employee_code,
//               ur.employee_location,
//               ur.access_request_type,
//               ur.training_status,
//               ur.training_attachment,
//               ur.training_attachment_name,
//               ur.vendor_name,
//               ur.vendor_firm,
//               ur.vendor_code,
//               ur.vendor_allocated_id,
//               ur.status AS user_request_status,
//               ur.created_on,
//               tr.id AS task_id,
//               tr.transaction_id AS task_request_transaction_id,
//               tr.application_equip_id,
//               app.display_name AS application_name,
//               tr.department,
//               d.department_name,
//               tr.role,
//               r.role_name AS role_name,
//               p.plant_name AS plant_name,
//               tr.location,
//               tr.reports_to,
//               tr.task_status,
//               tr.remarks
//        FROM user_requests ur
//        LEFT JOIN task_requests tr ON ur.id = tr.user_request_id
//        LEFT JOIN department_master d ON tr.department = d.id
//        LEFT JOIN role_master r ON tr.role = r.id
//        LEFT JOIN plant_master p ON tr.location = p.id
//        LEFT JOIN application_master app ON tr.application_equip_id = app.id
//         WHERE tr.location = $1
//         AND tr.department = $2
//         AND tr.application_equip_id = ANY($3)
//         AND tr.task_status IN ('Pending', 'Approved')
//         AND ${
//             request_for_by === "Vendor / OEM"
//               ? "ur.vendor_name = $4"
//               : "ur.name = $4"
//           }
//       LIMIT 1
//       `,
//       inFlightParams
//     );
//     return res.json({ conflict: rows.length > 0 });
//   } catch (err) {
//     console.error("In-flight validation error:", err);
//     res.status(500).json({ error: "Validation failed" });
//   }
// };
/**
 * RULE 1 + RULE 3 + RULE 4: Check In-Flight Requests
 * 
 * Checks: Plant + Department + Application (Display Name)
 * - For ALL request types
 * - Matches by name/vendor_name
 * - Blocks if request is Pending, Approved, or In Progress
 */
exports.checkInFlightRequest = async (req, res) => {
  const { 
    applicationId, 
    request_for_by, 
    name, 
    vendor_name, 
    plant_location, 
    department, 
    accessType 
  } = req.body;

  console.log("[RULE 1/3/4 - IN-FLIGHT CHECK]", {
    request_for_by,
    name: name || vendor_name,
    plant_location,
    department,
    applicationId,
    accessType
  });

  try {
    const appIds = Array.isArray(applicationId) ? applicationId : [applicationId];
    const isVendor = request_for_by === "Vendor / OEM";

    // Build query to check user_requests + task_requests
    const params = [plant_location, department, appIds];
    if (isVendor) {
      params.push(vendor_name);
    } else {
      params.push(name);
    }

    const query = `
      SELECT 
        ur.id AS user_request_id,
        ur.transaction_id AS user_request_transaction_id,
        ur.request_for_by,
        ur.name,
        ur.vendor_name,
        ur.access_request_type,
        ur.status AS user_request_status,
        ur.approver1_status,
        ur.approver2_status,
        tr.id AS task_id,
        tr.transaction_id AS task_transaction_id,
        tr.application_equip_id,
        app.display_name AS application_display_name,
        tr.department,
        d.department_name,
        tr.location,
        p.plant_name,
        tr.task_status,
        tr.created_on
      FROM user_requests ur
      INNER JOIN task_requests tr ON ur.id = tr.user_request_id
      LEFT JOIN department_master d ON tr.department::text = d.id::text
      LEFT JOIN plant_master p ON tr.location::text = p.id::text
      LEFT JOIN application_master app ON tr.application_equip_id::text = app.id::text
      WHERE tr.location::text = $1::text
        AND tr.department::text = $2::text
        AND tr.application_equip_id::text = ANY($3::text[])
        AND tr.task_status IN ('Pending', 'Approved', 'In Progress')
        AND ${isVendor 
          ? "LOWER(TRIM(ur.vendor_name)) = LOWER(TRIM($4))" 
          : "LOWER(TRIM(ur.name)) = LOWER(TRIM($4))"
        }
      ORDER BY tr.created_on DESC
      LIMIT 1
    `;

    const { rows } = await pool.query(query, params);
    const hasConflict = rows.length > 0;

    if (hasConflict) {
      console.log("[RULE 1/3/4] ❌ CONFLICT - In-flight request found:", {
        transaction_id: rows[0].user_request_transaction_id,
        request_type: rows[0].access_request_type,
        status: rows[0].user_request_status,
        task_status: rows[0].task_status
      });
    } else {
      console.log("[RULE 1/3/4] ✅ PASS - No in-flight conflicts");
    }

    return res.json({ 
      conflict: hasConflict,
      rule: hasConflict ? "RULE_1_3_4" : null,
      message: hasConflict 
        ? "A request is already in progress for this combination (Plant + Department + Application)"
        : null,
      existingRequest: hasConflict ? rows[0] : null
    });

  } catch (err) {
    console.error("[RULE 1/3/4] ERROR:", err);
    res.status(500).json({ error: "Validation failed", details: err.message });
  }
};

/**
 * RULE 6: Validate Bulk New User Creation
 * - Maximum 7 applications from same Plant + Department
 */
exports.validateBulkCreation = async (req, res) => {
  const { plant_location, department } = req.body;

// remove duplicates
const applicationIds = [...new Set(req.body.applicationIds)];

 console.log("[RULE 6 - BULK VALIDATION]", {
  plant_location,
  department,
  receivedCount: req.body.applicationIds?.length,
  uniqueCount: applicationIds.length,
  applicationIds
});


  try {
    // Check count
    if (!Array.isArray(applicationIds)) {
      return res.status(400).json({ 
        valid: false,
        rule: "RULE_6",
        message: "Application IDs must be an array" 
      });
    }

    if (applicationIds.length === 0) {
      return res.status(400).json({ 
        valid: false,
        rule: "RULE_6",
        message: "At least one application is required" 
      });
    }

    if (applicationIds.length > 7) {
      console.log("[RULE 6] ❌ FAIL - More than 7 applications");
      return res.json({ 
        valid: false,
        rule: "RULE_6",
        message: "Maximum 7 applications allowed per bulk request" 
      });
    }

    // Verify all applications belong to same department
    const { rows } = await pool.query(
      `SELECT 
        app.id,
        app.display_name,
        app.department_id,
        d.department_name
      FROM application_master app
      LEFT JOIN department_master d ON app.department_id::text = d.id::text
      WHERE app.id::text = ANY($1::text[])
        AND app.department_id::text = $2::text`,
      [applicationIds, department]
    );
console.log("Fetched applications for validation:", rows); 
console.log("Expected application IDs:", applicationIds);
   if (rows.length !== applicationIds.length) {
  return res.json({
    valid: false,
    rule: "RULE_6",
    message: "All applications must belong to the same department"
  });
}


    console.log("[RULE 6] ✅ PASS - Bulk validation successful");
    res.json({ 
      valid: true,
      applications: rows
    });

  } catch (err) {
    console.error("[RULE 6] ERROR:", err);
    res.status(500).json({ error: "Validation failed", details: err.message });
  }
};


// ============================================================================
// ADD THIS TO: backend/controllers/userRequest.js
// ============================================================================

/**
 * Create Bulk De-activation Request and Tasks
 * Step 1: Create user_request
 * Step 2: Create task_requests from active access logs
 * Step 3: Update access_log status to 'Deactivated'
 * NO approval workflow - tasks are auto-approved
 */
exports.createBulkDeactivationRequest = async (req, res) => {
  const {
    request_for_by,
    name,
    employee_code,
    employee_location,
    plant_location,
    department,
    remarks,
  } = req.body;

  console.log("[BULK DEACTIVATION] Creating request for:", {
    plant_location,
    department,
    name,
    employee_code,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // =====================================================
    // STEP 1: Fetch Active Access Logs
    // =====================================================
   const { rows: accessLogs } = await client.query(
  `SELECT 
    al.id AS access_log_id,
    al.vendor_name,
    al.vendor_allocated_id,
    al.application_equip_id,
    al.department,
    al.location,
    al.role,
    al.task_status,
    app.display_name AS application_name,
    d.department_name,
    p.plant_name,
    r.role_name
  FROM access_log al
  LEFT JOIN application_master app ON al.application_equip_id::text = app.id::text
  LEFT JOIN department_master d ON al.department::text = d.id::text
  LEFT JOIN plant_master p ON al.location::text = p.id::text
  LEFT JOIN role_master r ON al.role::text = r.id::text
  WHERE al.location::text = $1::text
    AND al.department::text = $2::text
    AND al.name ILIKE $3
    AND al.employee_code ILIKE $4
  ORDER BY al.id`,
  [
    plant_location,
    department,
    `%${name}%`,
    `%${employee_code}%`
  ]
);


    if (accessLogs.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "No active access logs found for bulk deactivation",
      });
    }

    console.log(`[BULK DEACTIVATION] Found ${accessLogs.length} active access logs`);

    // =====================================================
    // STEP 2: Create User Request (Auto-Approved)
    // =====================================================
    const { rows: userRequestRows } = await client.query(
      `INSERT INTO user_requests (
        request_for_by,
        name,
        employee_code,
        employee_location,
        access_request_type,
        training_status,
        status,
        approver1_email,
        approver1_status,
        approver2_email,
        approver2_status,
        created_on
      ) VALUES ($1, $2, $3, $4, 'Bulk De-activation', 'No', 'Approved', '', 'Approved', '', 'Approved', NOW())
      RETURNING *`,
      [request_for_by, name, employee_code || null, employee_location]
    );

    const userRequest = userRequestRows[0];
    console.log("[BULK DEACTIVATION] ✅ User Request Created:", {
      id: userRequest.id,
      transaction_id: userRequest.transaction_id,
      status: userRequest.status
    });

    // =====================================================
    // STEP 3: Create Task Requests from Access Logs
    // =====================================================
    const createdTasks = [];
    
    for (const log of accessLogs) {
      console.log(`[BULK DEACTIVATION] Creating task for access log ID: ${log.access_log_id}`);

      // Insert task_request
      const { rows: taskRows } = await client.query(
  `INSERT INTO task_requests (
    user_request_id,
    application_equip_id,
    department,
    role,
    location,
    reports_to,
    task_status,
    remarks,
    approver1_id,
    approver2_id,
    approver1_name,
    approver2_name,
    approver1_email,
    approver2_email,
    approver1_action,
    approver2_action,
    approver1_action_timestamp,
    approver2_action_timestamp,
    created_on
  ) VALUES (
    $1, $2, $3, $4, $5, $6,
    'Approved', $7,
    NULL, NULL,        -- ✅ FIXED
    'System', 'System',
    NULL, NULL,        -- ✅ FIXED
    'Approved', 'Approved',
    NOW(), NOW(), NOW()
  )
  RETURNING *`,
  [
    userRequest.id,
    log.application_equip_id,
    log.department,
    log.role,
    log.location,
    name,
    remarks || `Bulk deactivation for ${log.vendor_name} - ${log.application_name}`
  ]
);


      const task = taskRows[0];
      createdTasks.push({
        task_id: task.id,
        transaction_id: task.transaction_id,
        application: log.application_name,
        vendor: log.vendor_name,
        allocated_id: log.vendor_allocated_id,
        access_log_id: log.access_log_id
      });

      console.log(`[BULK DEACTIVATION] ✅ Task Created:`, {
        task_id: task.id,
        transaction_id: task.transaction_id,
        status: task.task_status
      });

      // =====================================================
      // STEP 4: Update Access Log Status
      // =====================================================
      await client.query(
        `UPDATE access_log 
         SET task_status = 'Deactivated',
             updated_on = NOW()
         WHERE id = $1`,
        [log.access_log_id]
      );

      console.log(`[BULK DEACTIVATION] ✅ Access Log Deactivated: ${log.access_log_id}`);
    }

    await client.query("COMMIT");

    console.log(`[BULK DEACTIVATION] 🎉 SUCCESS - Deactivated ${createdTasks.length} access logs`);

    // Return complete response
    res.status(201).json({
      success: true,
      message: `Bulk deactivation completed successfully`,
      userRequest: {
        id: userRequest.id,
        transaction_id: userRequest.transaction_id,
        status: userRequest.status,
        created_on: userRequest.created_on
      },
      summary: {
        totalDeactivated: createdTasks.length,
        plant: plant_location,
        department: department
      },
      tasks: createdTasks
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[BULK DEACTIVATION] ❌ ERROR:", err);
    res.status(500).json({ 
      error: "Failed to create bulk deactivation request",
      details: err.message 
    });
  } finally {
    client.release();
  }
};


