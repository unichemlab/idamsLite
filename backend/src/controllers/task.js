const pool = require("../config/db");

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
    const isApprover = roleIds.includes(4);
    const isSuperAdmin = roleIds.includes(1);

    // Get approver's assigned plants from workflow
    let approverPlantIds = [];
    if (isApprover && !isSuperAdmin) {
      try {
        const workflowQuery = `
          SELECT DISTINCT plant_id 
          FROM approval_workflow_master 
          WHERE 
            (approver_1_id LIKE $1 OR
             approver_2_id LIKE $1 OR
             approver_3_id LIKE $1 OR
             approver_4_id LIKE $1 OR
             approver_5_id LIKE $1)
            AND is_active = true
        `;
        const workflowResult = await client.query(workflowQuery, [
          `%${user.id}%`,
        ]);
        approverPlantIds = workflowResult.rows.map((r) => r.plant_id);
      } catch (err) {
        console.error("Error fetching approver plants:", err);
      }
    }

    // 🧩 Dynamic WHERE clause
    const whereClauses = [];
    const params = [];

    // Filter for approvers - show tasks from their assigned plants based on approval_workflow_master
    if (isApprover && !isSuperAdmin) {
      // Get plants where this user is an approver from approval workflow
      const approverResult = await client.query(
        `
        SELECT DISTINCT plant_id 
        FROM approval_workflow_master 
        WHERE (
          approver_1_id LIKE $1 OR
          approver_2_id LIKE $1 OR
          approver_3_id LIKE $1 OR
          approver_4_id LIKE $1 OR
          approver_5_id LIKE $1
        ) AND is_active = true
      `,
        [`%${user.id}%`]
      );

      console.log(
        "User ID:",
        user.id,
        "Approver query results:",
        approverResult.rows
      );

      if (approverResult.rows.length > 0) {
        const approverPlants = approverResult.rows
          .map((row) => row.plant_id)
          .filter((p) => p != null);
        // Pass as an array param and use ANY($n::int[])
        params.push(approverPlants);
        whereClauses.push(`tr.location = ANY($${params.length}::int[])`);
        console.log("Approver plants:", approverPlants);
      } else {
        // If no plants found but user is an approver, return no results rather than all tasks
        whereClauses.push("false");
      }
    }

    // For regular users, only show tasks for user's plant
    if (!isSuperAdmin && !isApprover && user.plant_id) {
      params.push(user.plant_id);
      whereClauses.push(`tr.location = $${params.length}`);
    }

    // Additional filters
    if (plant) {
      params.push(plant);
      whereClauses.push(`p.plant_name = $${params.length}`);
    }

    if (plant_id) {
      params.push(plant_id);
      whereClauses.push(`tr.location = $${params.length}`);
    }

    // Note: For approvers, we already added plant filter above.
    // Removed hard-coded "Pending" filter to allow frontend to show both pending and completed tasks.

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
    console.log("user ITBin", user?.isITBin);
    console.log("user itPlantIds", user.itPlantIds);
    console.log("user ITBin", user?.isITBin);
    console.log("user itPlantIds", user.itPlantIds);
    // Apply restriction based on ITBIN flag
    if (user?.isITBin && user.itPlantIds?.length > 0) {
      params.push(user.itPlantIds);
      whereClauses.push(`p.id = ANY($${params.length})`);
    }

    const whereSQL = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    console.log("WHERE clauses:", whereClauses);

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
      LEFT JOIN task_closure tc ON tc.transaction_id = ur.transaction_id
      LEFT JOIN user_master um ON tc.assigned_to = um.id
      ${whereSQL}
      ORDER BY tr.created_on DESC, ur.id;
    `;

    console.log("Executing query with params:", params);
    const { rows } = await client.query(query, params);
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

exports.updateTask = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      user_request_id,
      task_name,
      assigned_to,
      due_date,
      status,
      priority,
    } = req.body;

    const { rows } = await client.query(
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
    console.error("❌ Error updating task:", err);
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

