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
const bcrypt = require("bcryptjs");
exports.getAllTasks = async (req, res) => {
  try {
    const { plant, plant_id, transaction_id, task_status, access_request_type } = req.query;
     const user = req.user;
    // 🧩 Dynamic WHERE clause
    const whereClauses = [];
    const params = [];

    if (plant) {
      params.push(plant);
      whereClauses.push(`p.plant_name = $${params.length}`);
    }

    if (plant_id) {
      params.push(plant_id);
      whereClauses.push(`p.id = $${params.length}`);
    }

    if (transaction_id) {
      params.push(transaction_id);
      whereClauses.push(`ur.transaction_id = $${params.length}`);
    }

    if (task_status) {
      params.push(task_status);
      whereClauses.push(`tr.task_status = $${params.length}`);
    }

    if (access_request_type) {
      params.push(access_request_type);
      whereClauses.push(`ur.access_request_type = $${params.length}`);
    }

    // 🔹 Apply restriction based on ITBIN flag
    // 🔹 Apply restriction based on ITBIN flag
if (user?.isITBin) {
  const plantIds = user?.itPlants?.map(p => p.plant_id) || []; 
  if (plantIds.length > 0) {
    params.push(plantIds);
    whereClauses.push(`p.id = ANY($${params.length})`);
  }
}


    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // 🧩 Main query
    const query = `
      SELECT 
          -- 🧩 User Request info
          ur.id AS user_request_id,
          ur.transaction_id AS user_request_transaction_id,
          ur.request_for_by,
          ur.name AS request_name,
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
          ur.created_on AS user_request_created_on,

          -- 🧩 Task Request info
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
          tr.remarks,
          tr.created_on AS task_created_on,

          -- 🧩 Task Closure info
          tc.assignment_group,
          tc.role_granted,
          tc.access,
          tc.assigned_to,
          tc.status,
          tc.from_date,
          tc.to_date,
          tc.updated_on,

          -- 🧩 Assigned User info (from user_master)
          um.employee_name AS assigned_to_name,
          um.email AS closure_assigned_to_email,
          um.department AS closure_assigned_to_department,
          um.location AS closure_assigned_to_location

      FROM task_requests tr
      LEFT JOIN user_requests ur 
        ON tr.user_request_id = ur.id
      LEFT JOIN department_master d 
        ON tr.department = d.id
      LEFT JOIN role_master r 
        ON tr.role = r.id
      LEFT JOIN plant_master p 
        ON tr.location = p.id
      LEFT JOIN application_master app 
        ON tr.application_equip_id = app.id
      LEFT JOIN task_closure tc 
        ON tc.ritm_number = ur.transaction_id
        AND tc.task_number = tr.transaction_id
      LEFT JOIN user_master um 
        ON tc.assigned_to = um.id

      ${whereSQL}
      ORDER BY tr.created_on DESC, ur.id;
    `;

    const { rows } = await pool.query(query, params);

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching all tasks:", err);
    res.status(500).json({ error: err.message });
  }
};



exports.updateTask = async (req, res) => {
  const { id } = req.params; // task_request ID
  const { requestStatus } = req.body;
  const task_data = req.body.task_data || req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Update task_requests table
    const updateRequestQuery = `
      UPDATE task_requests
      SET task_status = $1, updated_on = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const { rows: updatedRequestRows } = await client.query(updateRequestQuery, [
      requestStatus || "Pending",
      id,
    ]);

    const updatedRequest = updatedRequestRows[0];
    if (!updatedRequest) throw new Error("Task request not found");

    // 2️⃣ Hash password if provided
    let hashedPassword = null;
    if (task_data.password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(task_data.password, salt);
    }

    // 3️⃣ UPSERT in task_closure based on ritm_number + task_number
    const upsertClosureQuery = `
      INSERT INTO task_closure (
        ritm_number,
        task_number,
        request_by,
        employee_code,
        name,
        description,
        location,
        plant_name,
        department,
        application_name,
        requested_role,
        request_status,
        assignment_group,
        assigned_to,
        allocated_id,
        role_granted,
        access,
        additional_info,
        task_created,
        task_updated,
        remarks,
        status,
        access_request_type,
        user_request_type,
        from_date,
        to_date,
        password,
        created_on,
        updated_on
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,NOW(),NOW()
      )
      ON CONFLICT (ritm_number, task_number)
      DO UPDATE SET
        request_by = EXCLUDED.request_by,
        employee_code = EXCLUDED.employee_code,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        location = EXCLUDED.location,
        plant_name = EXCLUDED.plant_name,
        department = EXCLUDED.department,
        application_name = EXCLUDED.application_name,
        requested_role = EXCLUDED.requested_role,
        request_status = EXCLUDED.request_status,
        assignment_group = EXCLUDED.assignment_group,
        assigned_to = EXCLUDED.assigned_to,
        allocated_id = EXCLUDED.allocated_id,
        role_granted = EXCLUDED.role_granted,
        access = EXCLUDED.access,
        additional_info = EXCLUDED.additional_info,
        task_created = EXCLUDED.task_created,
        task_updated = EXCLUDED.task_updated,
        remarks = EXCLUDED.remarks,
        status = EXCLUDED.status,
        access_request_type = EXCLUDED.access_request_type,
        user_request_type = EXCLUDED.user_request_type,
        from_date = EXCLUDED.from_date,
        to_date = EXCLUDED.to_date,
        password = EXCLUDED.password,
        updated_on = NOW()
      RETURNING *;
    `;

    const closureValues = [
      task_data.ritmNumber || null,
      task_data.taskNumber || null,
      task_data.requestBy || null,
      task_data.employeeCode || null,
      task_data.name || null,
      task_data.description || null,
      task_data.location || null,
      task_data.plant_name || null,
      task_data.department || null,
      task_data.applicationName || null,
      task_data.requestedRole || null,
      task_data.requestStatus || null,
      task_data.assignmentGroup || null,
      task_data.assignedTo || null,
      task_data.allocatedId || null,
      task_data.roleGranted || null,
      task_data.access || null,
      task_data.additionalInfo || null,
      task_data.task_created || null,
      task_data.task_updated || null,
      task_data.remarks || null,
      task_data.status || null,
      task_data.access_request_type || null,
      task_data.userRequestType || null,
      task_data.fromDate || null,
      task_data.toDate || null,
      hashedPassword || null
    ];

    const { rows: closureRows } = await client.query(upsertClosureQuery, closureValues);

    // 4️⃣ Check if all tasks under same user_request_id are Closed
    const userRequestId = updatedRequest.user_request_id;
    if (userRequestId) {
      const { rows: allTasks } = await client.query(
        `SELECT task_status FROM task_requests WHERE user_request_id = $1`,
        [userRequestId]
      );

      const allClosed = allTasks.every(t => t.task_status === "Closed");

      if (allClosed) {
        await client.query(
          `UPDATE user_requests
           SET status = 'Closed', updated_on = NOW()
           WHERE id = $1`,
          [userRequestId]
        );
      }
    }

    await client.query("COMMIT");

    res.status(200).json({
      message: "✅ Task updated, task_closure inserted/updated (ritm_number + task_number), and parent request checked.",
      updatedRequest,
      taskClosure: closureRows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error in updateTask:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
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
 * Get a single user request with its tasks + IT admin group details
 */
/**
 * Get a single user request with its tasks + IT admin group details + task_closure info
 */
exports.getUserTaskRequestById = async (req, res) => {
  const { id } = req.params;

  try {
    // Step 1: Fetch user request + task info + task_closure
    const { rows } = await pool.query(
      `SELECT 
          ur.id AS user_request_id,
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
          tr.created_on AS task_created,
          tr.updated_on AS task_updated,
          app.display_name AS application_name,
          tr.department,
          d.department_name,
          tr.role,
          r.role_name AS role_name,
          p.id AS plant_id,
          p.plant_name AS plant_name,
          tr.location,
          tr.reports_to,
          tr.task_status,
          tr.remarks,

         -- 🧩 Task Closure info (if exists)
          tc.assignment_group,
          tc.role_granted,
          tc.access,
          tc.assigned_to,
          tc.status,
          tc.from_date,
          tc.to_date,
          tc.updated_on,

          -- 🧩 Assigned User info (from user_master)
          um.employee_name AS assigned_to_name,
          um.email AS closure_assigned_to_email,
          um.department AS closure_assigned_to_department,
          um.location AS closure_assigned_to_location

       FROM task_requests tr
       LEFT JOIN user_requests ur ON tr.user_request_id = ur.id
       LEFT JOIN department_master d ON tr.department = d.id
       LEFT JOIN role_master r ON tr.role = r.id
       LEFT JOIN plant_master p ON tr.location = p.id
       LEFT JOIN application_master app ON tr.application_equip_id = app.id
       LEFT JOIN task_closure tc 
              ON tc.ritm_number = ur.transaction_id 
             AND tc.task_number = tr.transaction_id
       LEFT JOIN user_master um 
        ON tc.assigned_to = um.id
       WHERE tr.id = $1
       ORDER BY tr.id`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User request not found" });
    }

    const plantId = rows[0].plant_id;
    let itAdminGroup = null;
    let itAdminUsers = [];

    // Step 2: Fetch assignment_it_group from plant_it_admin where status = ACTIVE
    const itAdminResult = await pool.query(
      `SELECT id, assignment_it_group
         FROM plant_it_admin
        WHERE plant_id = $1 
          AND status = 'ACTIVE'`,
      [plantId]
    );

    if (itAdminResult.rows.length > 0) {
      const plantItAdmin = itAdminResult.rows[0];
      itAdminGroup = plantItAdmin;

      // Step 3: Fetch all IT admin user IDs from plant_it_admin_users
      const adminUsersResult = await pool.query(
        `SELECT user_id
           FROM plant_it_admin_users
          WHERE plant_it_admin_id = $1`,
        [plantItAdmin.id]
      );

      const userIds = adminUsersResult.rows.map((row) => row.user_id);

      // Step 4: Fetch user details if user IDs exist
      if (userIds.length > 0) {
        const usersQuery = await pool.query(
          `SELECT id AS user_id, employee_name, employee_code, email, department, location
             FROM user_master
            WHERE id = ANY($1::int[])`,
          [userIds]
        );
        itAdminUsers = usersQuery.rows;
      }
    }

    // Step 5: Fetch assigned_to user details from user_master
    let assignedUserDetails = null;
    const assignedToId = rows[0].assigned_to;

    if (assignedToId) {
      const assignedUserQuery = await pool.query(
        `SELECT id AS user_id, employee_name, employee_code, email, department, location
           FROM user_master
          WHERE id = $1`,
        [assignedToId]
      );
      assignedUserDetails = assignedUserQuery.rows[0] || null;
    }

    // Step 6: Structure final response
    const userRequest = {
      id: rows[0].user_request_id,
      request_for_by: rows[0].request_for_by,
      ritmNumber: rows[0].user_request_transaction_id,
      name: rows[0].name,
      employee_code: rows[0].employee_code,
      request_created_on: rows[0].created_on,
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
          taskNumber: row.task_request_transaction_id,
          application_equip_id: row.application_equip_id,
          application_name: row.application_name,
          department_id: row.department,
          department_name: row.department_name,
          plant_name: row.plant_name,
          role_id: row.role,
          role_name: row.role_name,
          location: row.location,
          reports_to: row.reports_to,
          task_status: row.task_status,
          task_created: row.task_created,
          task_updated: row.task_updated,
          remarks: row.remarks,
          // Task Closure info
          assignment_it_group: row.assignment_group,
          granted_role: row.role_granted,
          assigned_to: row.assigned_to,
          assigned_user: assignedUserDetails,
          access: row.access,
        })),
      it_admin_group: itAdminGroup,
      it_admin_users: itAdminUsers,
    };
  console.log(res.json(userRequest));
    res.json(userRequest);
  } catch (err) {
    console.error("Error in getUserTaskRequestById:", err);
    res.status(500).json({ error: err.message });
  }
};


