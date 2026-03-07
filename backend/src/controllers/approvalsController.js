// controllers/approvalsController.js

const db = require("../config/db");
const { logActivity } = require("../utils/activityLogger");
const path = require("path");

// --------------------- HELPERS ---------------------

async function getUserRequestById(userRequestId) {
  const q = `SELECT * FROM user_requests WHERE id = $1`;
  const { rows } = await db.query(q, [userRequestId]);
  return rows[0];
}

async function getTasksByUserRequestId(userRequestId) {
  // Fetch tasks enriched with task_closure details so the modal can show
  // what was actually provisioned (role granted, assigned IT person, etc.)
  const q = `
    SELECT
      tr.*,
      d.department_name,
      r.role_name,
      p.plant_name,
      app.display_name AS application_name,
      -- Task closure details
      tc.assignment_group,
      tc.role_granted,
      tc.access,
      tc.assigned_to        AS closure_assigned_to_id,
      tc.allocated_id       AS closure_allocated_id,
      tc.status             AS closure_status,
      tc.from_date          AS closure_from_date,
      tc.to_date            AS closure_to_date,
      tc.updated_on         AS closure_updated_on,
      um_a.employee_name    AS assigned_to_name,
      um_a.email            AS assigned_to_email
    FROM task_requests tr
    LEFT JOIN department_master  d   ON tr.department           = d.id
    LEFT JOIN role_master        r   ON tr.role                 = r.id
    LEFT JOIN plant_master       p   ON tr.location             = p.id
    LEFT JOIN application_master app ON tr.application_equip_id = app.id
    LEFT JOIN task_closure       tc  ON tc.task_number          = tr.transaction_id
    LEFT JOIN user_master        um_a ON tc.assigned_to         = um_a.id
    WHERE tr.user_request_id = $1
    ORDER BY tr.id
  `;
  const { rows } = await db.query(q, [userRequestId]);
  return rows;
}

// Insert access log row for each task (used on final approval / rejection)
async function insertAccessLog(request, task, action, approverEmail, approverName) {
  const isApprover2 =
    request.approver2_emails?.includes(approverEmail) ||
    request.approver2_email?.includes(approverEmail);

  await db.query(
    `INSERT INTO access_log(
      user_request_id, task_id,
      ritm_transaction_id, task_transaction_id,
      request_for_by, name, employee_code, employee_location,
      access_request_type, training_status,
      vendor_firm, vendor_code, vendor_name, vendor_allocated_id,
      user_request_status, task_status,
      application_equip_id, department, role, location, reports_to,
      approver1_status, approver2_status, approver1_email, approver2_email,
      approver1_name, approver2_name,
      approver1_action, approver2_action,
      approver1_timestamp, approver2_timestamp,
      created_on, updated_on, completed_at, remarks
    ) VALUES(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,
      $17,$18,$19,$20,$21,
      $22,$23,$24,$25,
      $26,$27,$28,$29,
      $30,$31,
      $32,$33,$34,$35
    )`,
    [
      request.id,
      task.id,
      request.transaction_id,
      task.transaction_id || task.task_id,
      request.request_for_by,
      request.name,
      request.employee_code,
      request.employee_location,
      request.access_request_type,
      request.training_status,
      request.vendor_firm,
      request.vendor_code,
      request.vendor_name,
      request.vendor_allocated_id,
      request.status,
      task.task_status,
      task.application_equip_id,
      task.department,
      task.role,
      task.location,
      task.reports_to,
      request.approver1_status,
      request.approver2_status,
      request.approver1_email,
      request.approver2_email || request.approver2_emails,
      request.approver1_name || null,
      isApprover2 ? approverName : null,
      isApprover2 ? null : action,
      isApprover2 ? action : null,
      request.approver1_timestamp || null,
      isApprover2 ? new Date() : null,
      request.created_on,
      request.updated_on,
      request.completed_at,
      task.remarks,
    ]
  );
}

// --------------------- COMBINED logActivity HELPER ---------------------
// Creates ONE activity log entry embedding both user_request + all tasks.
// This replaces the old pattern of one logActivity per user_request PLUS
// one per task — which caused duplicate/confusing entries in the audit trail.
const logApprovalActivity = async ({
  userId,
  action,         // "approve" | "reject"
  approverName,
  approverLevel,  // 1 | 2
  comments,
  userRequestId,
  oldRequest,
  updatedRequest,
  oldTasks,
  updatedTasks,
  reqMeta,
}) => {
  await logActivity({
    userId,
    module: "approvals",
    tableName: "user_requests",   // single primary table — keeps audit trail clean
    recordId: userRequestId,
    action,
    oldValue: {
      user_request: oldRequest,
      tasks: oldTasks.map((t) => ({
        id: t.id,
        transaction_id: t.transaction_id,
        task_status: t.task_status,
        application_name: t.application_name,
        role_name: t.role_name,
        department_name: t.department_name,
        plant_name: t.plant_name,
        approver1_action: t.approver1_action,
        approver2_action: t.approver2_action,
      })),
    },
    newValue: {
      user_request: updatedRequest,
      tasks: updatedTasks.map((t) => ({
        id: t.id,
        transaction_id: t.transaction_id,
        task_status: t.task_status,
        application_name: t.application_name,
        role_name: t.role_name,
        department_name: t.department_name,
        plant_name: t.plant_name,
        approver1_action: t.approver1_action,
        approver2_action: t.approver2_action,
        approver1_name: t.approver1_name,
        approver2_name: t.approver2_name,
        approver1_comments: t.approver1_comments,
        approver2_comments: t.approver2_comments,
        approver1_action_timestamp: t.approver1_action_timestamp,
        approver2_action_timestamp: t.approver2_action_timestamp,
        remarks: t.remarks,
      })),
      // Extra context visible in activity log modal
      approval_summary: {
        approver_name: approverName,
        approver_level: approverLevel,
        approver_type: approverLevel === 1 ? "approver1" : "approver2",
        action,
        comments: comments || null,
        task_count: updatedTasks.length,
        ritm_number: updatedRequest?.transaction_id || userRequestId,
        task_numbers: updatedTasks.map((t) => t.transaction_id || t.id),
        task_applications: [...new Set(updatedTasks.map((t) => t.application_name).filter(Boolean))],
        task_statuses: updatedTasks.map((t) => ({
          task_number: t.transaction_id || t.id,
          status: t.task_status,
          application: t.application_name,
        })),
        // Task closure data (visible when task has been provisioned)
        task_closures: updatedTasks
          .filter((t) => t.closure_status || t.role_granted)
          .map((t) => ({
            task_number: t.transaction_id || t.id,
            application: t.application_name,
            role_granted: t.role_granted,
            access: t.access,
            assignment_group: t.assignment_group,
            closure_allocated_id: t.closure_allocated_id,
            closure_status: t.closure_status,
            assigned_to_name: t.assigned_to_name,
            assigned_to_email: t.assigned_to_email,
            from_date: t.closure_from_date,
            to_date: t.closure_to_date,
          })),
      },
    },
    comments: `${action === "approve" ? "Approved" : "Rejected"} by ${approverName} (Approver ${approverLevel}) | RITM: ${updatedRequest?.transaction_id || userRequestId} | Tasks: ${updatedTasks.length}${comments ? ` | Reason: ${comments}` : ""}`,
    reqMeta,
  });
};

// --------------------- APPROVE REQUEST ---------------------
exports.approveByTransaction = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { transaction: userRequestId } = req.params;
    const { approver_id, comments } = req.body;

    if (!userRequestId)
      return res.status(400).json({ error: "User request ID required" });

    // Resolve approver identity from JWT or fallback to approver_id
    let approverName  = null;
    let approverEmail = null;

    if (req.user && req.user.email) {
      approverEmail = req.user.email;
      approverName  = req.user.employee_name || req.user.name || req.user.username;
    } else if (approver_id) {
      const approverResult = await client.query(
        `SELECT employee_name, email FROM user_master WHERE id = $1`,
        [approver_id]
      );
      if (approverResult.rows.length > 0) {
        approverName  = approverResult.rows[0].employee_name;
        approverEmail = approverResult.rows[0].email;
      }
    }

    if (!approverEmail) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Approver email not found" });
    }

    console.log("Approver attempting action:", { approverEmail, approverName, approver_id });

    const userRequest = await getUserRequestById(userRequestId);
    if (!userRequest) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User request not found" });
    }

    console.log("User request approvers:", {
      approver1_email: userRequest.approver1_email,
      approver2_email: userRequest.approver2_email,
      approver1_status: userRequest.approver1_status,
      approver2_status: userRequest.approver2_status,
    });

    const isApprover1 =
      userRequest.approver1_email?.toLowerCase() === approverEmail?.toLowerCase();

    let isApprover2 = false;
    if (!isApprover1 && userRequest.approver1_status === "Approved") {
      const taskResult = await client.query(
        `SELECT location FROM task_requests WHERE user_request_id = $1 LIMIT 1`,
        [userRequestId]
      );
      if (taskResult.rows.length > 0) {
        const plantId = taskResult.rows[0].location;
        const workflowResult = await client.query(
          `SELECT approver_2_id FROM approval_workflow_master 
           WHERE plant_id = $1 AND is_active = true`,
          [plantId]
        );
        if (workflowResult.rows.length > 0) {
          const approver2Ids    = workflowResult.rows[0].approver_2_id;
          const approver2IdArray = approver2Ids
            ? approver2Ids.split(",").map((id) => id.trim())
            : [];
          isApprover2 = approver2IdArray.includes(
            String(approver_id || req.user?.id)
          );
          console.log("Approver 2 check:", { plantId, approver2Ids, approver2IdArray, isApprover2 });
        }
      }
    }

    console.log("Authorization check:", { isApprover1, isApprover2 });

    if (!isApprover1 && !isApprover2) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "You are not authorized to approve this request",
        details: {
          yourEmail: approverEmail,
          approver1Email: userRequest.approver1_email,
          isApprover1,
          isApprover2,
          approver1Status: userRequest.approver1_status,
        },
      });
    }

    if (isApprover2 && userRequest.approver1_status !== "Approved") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Approver 1 must approve before Approver 2 can act" });
    }

    if (
      isApprover2 &&
      userRequest.approver2_status &&
      userRequest.approver2_status !== "Pending"
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `This request has already been ${userRequest.approver2_status.toLowerCase()} by another Approver 2`,
        actedBy: userRequest.approver2_email,
      });
    }

    // Snapshot old state for logging (enriched with task closure details)
    const oldTasks = await getTasksByUserRequestId(userRequestId);

    // Update user_requests
    let userRequestUpdateQuery, userRequestParams;
    if (isApprover1) {
      userRequestUpdateQuery = `
        UPDATE user_requests 
        SET approver1_status = 'Approved', updated_on = NOW()
        WHERE id = $1 
        RETURNING *`;
      userRequestParams = [userRequestId];
    } else {
      userRequestUpdateQuery = `
        UPDATE user_requests 
        SET approver2_status = 'Approved',
            approver2_email  = $2,
            status           = 'Completed',
            completed_at     = NOW(),
            updated_on       = NOW()
        WHERE id = $1 
        RETURNING *`;
      userRequestParams = [userRequestId, approverEmail];
    }
    const { rows: [updatedUserRequest] } = await client.query(
      userRequestUpdateQuery,
      userRequestParams
    );

    // Update task_requests
    let taskUpdateQuery, taskParams;
    if (isApprover1) {
      taskUpdateQuery = `
        UPDATE task_requests 
        SET approver1_action          = 'Approved',
            approver1_action_timestamp = NOW(),
            approver1_name            = $1,
            approver1_comments        = $2,
            updated_on                = NOW()
        WHERE user_request_id = $3 
        RETURNING *`;
      taskParams = [approverName, comments || null, userRequestId];
    } else {
      taskUpdateQuery = `
        UPDATE task_requests 
        SET approver2_action          = 'Approved',
            approver2_action_timestamp = NOW(),
            approver2_name            = $1,
            approver2_email           = $4,
            approver2_id              = $5,
            approver2_comments        = $2,
            task_status               = 'Approved',
            remarks                   = $2,
            updated_on                = NOW()
        WHERE user_request_id = $3 
        RETURNING *`;
      taskParams = [
        approverName,
        comments || null,
        userRequestId,
        approverEmail,
        approver_id || req.user?.id,
      ];
    }
    const { rows: updatedTasks } = await client.query(taskUpdateQuery, taskParams);

    // ✅ COMBINED: one log entry — user_request + all tasks + closure details
    await logApprovalActivity({
      userId: req.user?.id || approver_id,
      action: "approve",
      approverName,
      approverLevel: isApprover1 ? 1 : 2,
      comments,
      userRequestId,
      oldRequest: userRequest,
      updatedRequest: updatedUserRequest,
      oldTasks,
      updatedTasks,
      reqMeta: req._meta,
    });

    // Insert access log rows when approver 2 finalises (request completed)
    if (isApprover2) {
      for (const task of updatedTasks) {
        await insertAccessLog(
          { ...updatedUserRequest, approver2_emails: updatedUserRequest.approver2_email },
          task,
          "approve",
          approverEmail,
          approverName
        );
      }
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      message: `Approved by ${isApprover1 ? "Approver 1" : "Approver 2"}`,
      userRequest: updatedUserRequest,
      tasksUpdated: updatedTasks.length,
      tasks: updatedTasks,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[APPROVALS APPROVE ERROR]", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// --------------------- REJECT REQUEST ---------------------
exports.rejectByTransaction = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { transaction: userRequestId } = req.params;
    const { approver_id, comments } = req.body;

    if (!userRequestId)
      return res.status(400).json({ error: "User request ID required" });

    if (!comments || comments.trim() === "") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Comments are required for rejection" });
    }

    let approverName  = null;
    let approverEmail = null;

    if (req.user && req.user.email) {
      approverEmail = req.user.email;
      approverName  = req.user.employee_name || req.user.name || req.user.username;
    } else if (approver_id) {
      const approverResult = await client.query(
        `SELECT employee_name, email FROM user_master WHERE id = $1`,
        [approver_id]
      );
      if (approverResult.rows.length > 0) {
        approverName  = approverResult.rows[0].employee_name;
        approverEmail = approverResult.rows[0].email;
      }
    }

    if (!approverEmail) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Approver email not found" });
    }

    console.log("Approver attempting rejection:", { approverEmail, approverName, approver_id });

    const userRequest = await getUserRequestById(userRequestId);
    if (!userRequest) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User request not found" });
    }

    console.log("User request approvers:", {
      approver1_email: userRequest.approver1_email,
      approver2_email: userRequest.approver2_email,
      approver1_status: userRequest.approver1_status,
      approver2_status: userRequest.approver2_status,
    });

    const isApprover1 =
      userRequest.approver1_email?.toLowerCase() === approverEmail?.toLowerCase();

    let isApprover2 = false;
    if (!isApprover1 && userRequest.approver1_status === "Approved") {
      const taskResult = await client.query(
        `SELECT location FROM task_requests WHERE user_request_id = $1 LIMIT 1`,
        [userRequestId]
      );
      if (taskResult.rows.length > 0) {
        const plantId = taskResult.rows[0].location;
        const workflowResult = await client.query(
          `SELECT approver_2_id FROM approval_workflow_master 
           WHERE plant_id = $1 AND is_active = true`,
          [plantId]
        );
        if (workflowResult.rows.length > 0) {
          const approver2Ids    = workflowResult.rows[0].approver_2_id;
          const approver2IdArray = approver2Ids
            ? approver2Ids.split(",").map((id) => id.trim())
            : [];
          isApprover2 = approver2IdArray.includes(
            String(approver_id || req.user?.id)
          );
          console.log("Approver 2 check:", { plantId, approver2Ids, approver2IdArray, isApprover2 });
        }
      }
    }

    console.log("Authorization check:", { isApprover1, isApprover2 });

    if (!isApprover1 && !isApprover2) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "You are not authorized to reject this request",
        details: {
          yourEmail: approverEmail,
          approver1Email: userRequest.approver1_email,
          isApprover1,
          isApprover2,
          approver1Status: userRequest.approver1_status,
        },
      });
    }

    if (isApprover2 && userRequest.approver1_status !== "Approved") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Approver 1 must approve before Approver 2 can act" });
    }

    // Snapshot old state (enriched with task closure details for modal)
    const oldTasks = await getTasksByUserRequestId(userRequestId);

    // Update user_requests
    let userRequestUpdateQuery, userRequestParams;
    if (isApprover1) {
      userRequestUpdateQuery = `
        UPDATE user_requests 
        SET approver1_status = 'Rejected',
            status           = 'Rejected',
            updated_on       = NOW()
        WHERE id = $1 
        RETURNING *`;
      userRequestParams = [userRequestId];
    } else {
      userRequestUpdateQuery = `
        UPDATE user_requests 
        SET approver2_status = 'Rejected',
            approver2_email  = $2,
            status           = 'Rejected',
            updated_on       = NOW()
        WHERE id = $1 
        RETURNING *`;
      userRequestParams = [userRequestId, approverEmail];
    }
    const { rows: [updatedUserRequest] } = await client.query(
      userRequestUpdateQuery,
      userRequestParams
    );

    // Update task_requests
    let taskUpdateQuery, taskParams;
    if (isApprover1) {
      taskUpdateQuery = `
        UPDATE task_requests 
        SET approver1_action          = 'Rejected',
            approver1_action_timestamp = NOW(),
            approver1_name            = $1,
            approver1_comments        = $2,
            task_status               = 'Rejected',
            remarks                   = $2,
            updated_on                = NOW()
        WHERE user_request_id = $3 
        RETURNING *`;
      taskParams = [approverName, comments, userRequestId];
    } else {
      taskUpdateQuery = `
        UPDATE task_requests 
        SET approver2_action          = 'Rejected',
            approver2_action_timestamp = NOW(),
            approver2_name            = $1,
            approver2_email           = $4,
            approver2_id              = $5,
            approver2_comments        = $2,
            task_status               = 'Rejected',
            remarks                   = $2,
            updated_on                = NOW()
        WHERE user_request_id = $3 
        RETURNING *`;
      taskParams = [
        approverName,
        comments,
        userRequestId,
        approverEmail,
        approver_id || req.user?.id,
      ];
    }
    const { rows: updatedTasks } = await client.query(taskUpdateQuery, taskParams);

    // ✅ COMBINED: one log entry — user_request + all tasks + closure details
    await logApprovalActivity({
      userId: req.user?.id || approver_id,
      action: "reject",
      approverName,
      approverLevel: isApprover1 ? 1 : 2,
      comments,
      userRequestId,
      oldRequest: userRequest,
      updatedRequest: updatedUserRequest,
      oldTasks,
      updatedTasks,
      reqMeta: req._meta,
    });

    // Insert access log rows on any rejection
    for (const task of updatedTasks) {
      await insertAccessLog(
        { ...updatedUserRequest, approver2_emails: updatedUserRequest.approver2_email },
        task,
        "reject",
        approverEmail,
        approverName
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      message: `Rejected by ${isApprover1 ? "Approver 1" : "Approver 2"}`,
      userRequest: updatedUserRequest,
      tasksUpdated: updatedTasks.length,
      tasks: updatedTasks,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[APPROVALS REJECT ERROR]", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};