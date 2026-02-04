const pool = require("../config/db");
const bcrypt = require("bcryptjs");
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

exports.getAllTasks = async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    const {
      plant,
      plant_id,
      transaction_id,
      task_status,
      access_request_type,
      approver_id,
    } = req.query;

    // User should be available from authorize middleware
    const user = req.user;
    console.log("request user", user);

    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Handle approver-specific query
    if (approver_id && Number(approver_id) !== user.id) {
      return res
        .status(403)
        .json({ message: "Cannot view tasks for other approvers" });
    }

    const roleIds = Array.isArray(user.role_id) ? user.role_id : [user.role_id];
    const isApprover = user?.isApprover;
    const isSuperAdmin = roleIds.includes(1);

    // 🧩 Dynamic WHERE clause
    const whereClauses = [];
    const params = [];

    console.log("User info:", {
      id: user.id,
      email: user.email,
      isApprover,
      isSuperAdmin,
      isITBin: user?.isITBin,
      itPlantIds: user?.itPlantIds
    });

    // ===============================================
    // APPROVER FILTERS - CORRECTED VERSION
    // ===============================================
    console.log("Approver", isApprover);

    if (isApprover && !isSuperAdmin) {
      console.log("Applying approver filters for user:", user.id);
      const approverConditions = [];

      // Check 1: Approver by email (for both approver1 and approver2)
      if (user.email && typeof user.email === 'string' && user.email.trim() !== '') {
        // Push email FIRST, then use that index
        params.push(user.email);
        const emailParamIndex = params.length; // This is now the correct index

        // All email checks use the SAME parameter
        approverConditions.push(`ur.approver1_email = $${emailParamIndex}`);
        approverConditions.push(`tr.approver1_email = $${emailParamIndex}`);
        approverConditions.push(`ur.approver2_email = $${emailParamIndex}`);
        approverConditions.push(`tr.approver2_email = $${emailParamIndex}`);

        console.log("Added email-based approver conditions:", {
          email: user.email,
          paramIndex: emailParamIndex,
          conditionCount: 4
        });
      } else {
        console.warn("⚠️ User email is missing or invalid:", user.email);
      }

      // Check 2: Approver from workflow table (by plant assignment)
      try {
        const workflowResult = await client.query(
          `
            SELECT DISTINCT plant_id 
            FROM approval_workflow_master
            WHERE (
              approver_1_id LIKE $1 OR
              approver_2_id LIKE $1 OR
              approver_3_id LIKE $1 OR
              approver_4_id LIKE $1 OR
              approver_5_id LIKE $1
            )
            AND is_active = true
          `,
          [`%${user.id}%`]
        );

        if (workflowResult.rows.length > 0) {
          const workflowPlants = workflowResult.rows.map(r => r.plant_id);
          params.push(workflowPlants);
          approverConditions.push(`tr.location = ANY($${params.length}::int[])`);
          console.log("Workflow plants found:", workflowPlants);
        }
      } catch (workflowErr) {
        console.error("Error fetching workflow plants:", workflowErr);
      }

      // Add all approver conditions with OR logic
      if (approverConditions.length > 0) {
        whereClauses.push(`(${approverConditions.join(" OR ")})`);
        console.log("Final approver conditions:", approverConditions);
      } else {
        // If no approver conditions found, return empty results
        whereClauses.push("false");
        console.warn("⚠️ No approver conditions found - returning empty results");
      }
    }

    // ===============================================
    // REGULAR USER FILTERS
    // ===============================================
    // For regular users (non-approvers, non-superadmins), only show tasks for their plant
    if (!isSuperAdmin && !isApprover && user.plant_id) {
      params.push(user.plant_id);
      whereClauses.push(`tr.location = $${params.length}`);
    }

    // ===============================================
    // ADDITIONAL QUERY FILTERS
    // ===============================================
    if (plant) {
      params.push(plant);
      whereClauses.push(`p.plant_name = $${params.length}`);
    }

    if (plant_id) {
      params.push(plant_id);
      whereClauses.push(`tr.location = $${params.length}`);
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

    // ===============================================
    // IT BIN ADMIN FILTER
    // ===============================================
    console.log("user ITBin", user?.isITBin);
    console.log("user itPlantIds", user?.itPlantIds);

    if (user?.isITBin && user.itPlantIds?.length > 0) {
      params.push(user.itPlantIds);
      whereClauses.push(`p.id = ANY($${params.length})`);
      console.log("IT BIN filter applied for plants:", user.itPlantIds);
    }

    // ===============================================
    // VALIDATE PARAMS BEFORE QUERY
    // ===============================================
    if (params.includes(undefined) || params.includes(null)) {
      console.error("❌ ERROR: params array contains undefined/null values:", params);
      return res.status(500).json({
        error: "Invalid query parameters",
        details: "User authentication data is incomplete"
      });
    }

    // ===============================================
    // BUILD AND EXECUTE QUERY
    // ===============================================
    const whereSQL = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    console.log("WHERE clauses:", whereClauses);
    console.log("Executing query with params:", params);

    const query = `
      SELECT DISTINCT
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
        tr.approver1_name,
        tr.approver1_email,
        tr.approver2_name,
        tr.approver2_email,
        tr.approver1_action,
        tr.approver2_action,
        tr.approver1_action_timestamp,
        tr.approver2_action_timestamp,
        tc.assignment_group,
        tc.role_granted,
        tc.access,
        tc.assigned_to,
        tc.status,
        tc.from_date,
        tc.to_date,
        tc.updated_on,
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
      LEFT JOIN task_closure tc ON tc.ritm_number = ur.transaction_id
      LEFT JOIN user_master um ON tc.assigned_to = um.id
      ${whereSQL}
      ORDER BY tr.created_on DESC, ur.id;
    `;

    const { rows } = await client.query(query, params);
    console.table(
      rows.map(r => ({
        task_id: r.task_id,
        transaction_id: r.task_request_transaction_id,
        access: r.access,
        task_status: r.task_status,
        plant: r.plant_name,
        assigned_to: r.assigned_to_name
      }))
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching all tasks:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    if (client) {
      try {
        await client.release();
      } catch (releaseErr) {
        console.error("Error releasing client:", releaseErr);
      }
    }
  }
};

// Update task by ID
exports.updateTask = async (req, res) => {
  const { id } = req.params; // task_request ID
  const { requestStatus } = req.body;
  const task_data = req.body.task_data || req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log('Updating task:', { id, requestStatus, task_data });

    // 0️⃣ Get existing task and user request info
    const existingTaskQuery = `
      SELECT tr.*, ur.transaction_id as ritm_transaction_id,
             ur.request_for_by, ur.name, ur.employee_code, ur.employee_location,
             ur.access_request_type, ur.training_status, ur.vendor_firm,
             ur.vendor_code, ur.vendor_name, ur.vendor_allocated_id,
             ur.status as user_request_status, ur.approver1_status, ur.approver2_status,
             ur.approver1_email, ur.approver2_email, ur.completed_at,
             p.plant_name, d.department_name, r.role_name, app.display_name as application_name
      FROM task_requests tr
      LEFT JOIN user_requests ur ON tr.user_request_id = ur.id
      LEFT JOIN plant_master p ON tr.location = p.id
      LEFT JOIN department_master d ON tr.department = d.id
      LEFT JOIN role_master r ON tr.role = r.id
      LEFT JOIN application_master app ON tr.application_equip_id = app.id
      WHERE tr.id = $1
    `;

    const { rows: existingRows } = await client.query(existingTaskQuery, [id]);
    if (existingRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: 'Task not found' });
    }

    const existingTask = existingRows[0];

    // Check if both approvers have approved before allowing completion
    if (requestStatus === 'Closed' || requestStatus === 'Completed') {
      if (existingTask.approver1_status !== 'Approved' || existingTask.approver2_status !== 'Approved') {
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: 'Cannot complete task. Both approvers must approve first.',
          details: {
            approver1_status: existingTask.approver1_status,
            approver2_status: existingTask.approver2_status
          }
        });
      }
    }

    // 1️⃣ Update task_requests table
    const updateRequestQuery = `
      UPDATE task_requests
      SET task_status = $1, 
          remarks = $2,
          updated_on = NOW()
      WHERE id = $3
      RETURNING *;
    `;
    const { rows: updatedRequestRows } = await client.query(updateRequestQuery, [
      requestStatus || "Pending",
      task_data.remarks || existingTask.remarks,
      id,
    ]);

    const updatedRequest = updatedRequestRows[0];

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
      task_data.ritmNumber || existingTask.ritm_transaction_id,
      task_data.taskNumber || existingTask.transaction_id,
      task_data.requestBy || existingTask.request_for_by,
      task_data.employeeCode || existingTask.employee_code,
      task_data.name || existingTask.name,
      task_data.description || null,
      task_data.location || existingTask.location,
      task_data.plant_name || existingTask.plant_name,
      task_data.department || existingTask.department_name,
      task_data.applicationName || existingTask.application_name,
      task_data.requestedRole || existingTask.role_name,
      task_data.requestStatus || requestStatus,
      task_data.assignmentGroup || null,
      task_data.assignedTo || null,
      task_data.allocatedId || null,
      task_data.roleGranted || null,
      task_data.access || null,
      task_data.additionalInfo || null,
      task_data.task_created || existingTask.created_on,
      task_data.task_updated || updatedRequest.updated_on,
      task_data.remarks || updatedRequest.remarks,
      task_data.status || requestStatus,
      task_data.access_request_type || existingTask.access_request_type,
      task_data.userRequestType || null,
      task_data.fromDate || null,
      task_data.toDate || null,
      hashedPassword || null
    ];

    const { rows: closureRows } = await client.query(upsertClosureQuery, closureValues);

    // 4️⃣ UPSERT in access_log table
    const upsertAccessLogQuery = `
      INSERT INTO access_log (
        user_request_id,
        task_id,
        ritm_transaction_id,
        task_transaction_id,
        request_for_by,
        name,
        employee_code,
        employee_location,
        access_request_type,
        training_status,
        vendor_firm,
        vendor_code,
        vendor_name,
        vendor_allocated_id,
        user_request_status,
        task_status,
        application_equip_id,
        department,
        role,
        location,
        reports_to,
        approver1_status,
        approver2_status,
        approver1_email,
        approver2_email,
        created_on,
        updated_on,
        completed_at,
        remarks,
        approver1_name,
        approver2_name,
        approver1_action,
        approver2_action,
        approver1_timestamp,
        approver2_timestamp,
        approver1_comments,
        approver2_comments
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37
      )
      ON CONFLICT (user_request_id, task_id)
      DO UPDATE SET
        ritm_transaction_id = EXCLUDED.ritm_transaction_id,
        task_transaction_id = EXCLUDED.task_transaction_id,
        request_for_by = EXCLUDED.request_for_by,
        name = EXCLUDED.name,
        employee_code = EXCLUDED.employee_code,
        employee_location = EXCLUDED.employee_location,
        access_request_type = EXCLUDED.access_request_type,
        training_status = EXCLUDED.training_status,
        vendor_firm = EXCLUDED.vendor_firm,
        vendor_code = EXCLUDED.vendor_code,
        vendor_name = EXCLUDED.vendor_name,
        vendor_allocated_id = EXCLUDED.vendor_allocated_id,
        user_request_status = EXCLUDED.user_request_status,
        task_status = EXCLUDED.task_status,
        application_equip_id = EXCLUDED.application_equip_id,
        department = EXCLUDED.department,
        role = EXCLUDED.role,
        location = EXCLUDED.location,
        reports_to = EXCLUDED.reports_to,
        approver1_status = EXCLUDED.approver1_status,
        approver2_status = EXCLUDED.approver2_status,
        approver1_email = EXCLUDED.approver1_email,
        approver2_email = EXCLUDED.approver2_email,
        updated_on = EXCLUDED.updated_on,
        completed_at = EXCLUDED.completed_at,
        remarks = EXCLUDED.remarks,
        approver1_name = EXCLUDED.approver1_name,
        approver2_name = EXCLUDED.approver2_name,
        approver1_action = EXCLUDED.approver1_action,
        approver2_action = EXCLUDED.approver2_action,
        approver1_timestamp = EXCLUDED.approver1_timestamp,
        approver2_timestamp = EXCLUDED.approver2_timestamp,
        approver1_comments = EXCLUDED.approver1_comments,
        approver2_comments = EXCLUDED.approver2_comments
      RETURNING *;
    `;

    const accessLogValues = [
      existingTask.user_request_id,
      id,
      existingTask.ritm_transaction_id,
      existingTask.transaction_id,
      existingTask.request_for_by,
      existingTask.name,
      existingTask.employee_code,
      existingTask.employee_location,
      existingTask.access_request_type,
      existingTask.training_status,
      existingTask.vendor_firm,
      existingTask.vendor_code,
      existingTask.vendor_name,
      existingTask.vendor_allocated_id,
      existingTask.user_request_status,
      requestStatus || updatedRequest.task_status,
      existingTask.application_equip_id,
      existingTask.department,
      existingTask.role,
      existingTask.location,
      existingTask.reports_to,
      existingTask.approver1_status,
      existingTask.approver2_status,
      existingTask.approver1_email,
      existingTask.approver2_email,
      existingTask.created_on,
      updatedRequest.updated_on,
      existingTask.completed_at,
      updatedRequest.remarks,
      existingTask.approver1_name,
      existingTask.approver2_name,
      existingTask.approver1_action,
      existingTask.approver2_action,
      existingTask.approver1_action_timestamp,
      existingTask.approver2_action_timestamp,
      existingTask.approver1_comments,
      existingTask.approver2_comments
    ];

    const { rows: accessLogRows } = await client.query(upsertAccessLogQuery, accessLogValues);

    // 5️⃣ Check if all tasks under same user_request_id are Closed
    const userRequestId = updatedRequest.user_request_id;
    if (userRequestId) {
      const { rows: allTasks } = await client.query(
        `SELECT task_status FROM task_requests WHERE user_request_id = $1`,
        [userRequestId]
      );

      const allClosed = allTasks.every(t => t.task_status === "Closed" || t.task_status === "Completed");

      if (allClosed) {
        await client.query(
          `UPDATE user_requests
           SET status = 'Completed', 
               completed_at = NOW(),
               updated_on = NOW()
           WHERE id = $1`,
          [userRequestId]
        );
      }
    }

    await client.query("COMMIT");

    res.status(200).json({
      message: "✅ Task updated successfully - task_requests, task_closure, and access_log updated",
      updatedRequest,
      taskClosure: closureRows[0],
      accessLog: accessLogRows[0],
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
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query("DELETE FROM task WHERE id=$1", [id]);
    res.status(204).end();
  } catch (err) {
    console.error("❌ Error deleting task:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

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
          ur.user_request_type,
          ur.from_date AS user_request_from_date,
          ur.to_date AS user_request_to_date,
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
      userRequestType: rows[0].user_request_type,
      fromDate: rows[0].user_request_from_date,
      toDate: rows[0].user_request_to_date,
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

exports.getUserTaskRequestByEmployeeCOde = async (req, res) => {
  const { emp_code } = req.params;

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
       WHERE tr.approver1_id = $1
       ORDER BY tr.id`,
      [emp_code]
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

