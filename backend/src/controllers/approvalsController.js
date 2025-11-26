const db = require("../config/db");
const { logActivity } = require("../utils/activityLogger");

// Helper to get task details by transaction
async function getTasksByTransaction(transaction) {
  const q = `SELECT * FROM task_requests WHERE transaction_id = $1`;
  const { rows } = await db.query(q, [transaction]);
  return rows;
}

// Approve task(s) by task_requests.transaction_id
exports.approveByTransaction = async (req, res) => {
  try {
    const { transaction } = req.params;
    const { approver_id, comments, user_request_id } = req.body;

    if (!transaction)
      return res.status(400).json({ error: "Transaction id required" });

    // Get the approver name from user_master
    let approverName = null;
    if (approver_id) {
      const approverResult = await db.query(
        `SELECT employee_name FROM user_master WHERE id = $1`,
        [approver_id]
      );
      if (approverResult.rows.length > 0) {
        approverName = approverResult.rows[0].employee_name;
      }
    }

    // Get old state (optionally scoped to a specific user_request_id)
    const oldTasksQ = user_request_id
      ? `SELECT * FROM task_requests WHERE transaction_id = $1 AND user_request_id = $2`
      : `SELECT * FROM task_requests WHERE transaction_id = $1`;
    const oldTasksParams = user_request_id
      ? [transaction, user_request_id]
      : [transaction];
    const { rows: oldTasks } = await db.query(oldTasksQ, oldTasksParams);

    // Build update query scoped to transaction and optionally the specific user_request
    let q;
    let params;
    if (user_request_id) {
      q = `UPDATE task_requests 
           SET task_status = 'Approved', remarks = $1, updated_on = NOW(),
               approver1_action = 'Approved', approver1_action_timestamp = NOW(),
               approver1_name = $4
           WHERE transaction_id = $2 AND user_request_id = $3 RETURNING *`;
      params = [comments || null, transaction, user_request_id, approverName];
    } else {
      q = `UPDATE task_requests 
           SET task_status = 'Approved', remarks = $1, updated_on = NOW(),
               approver1_action = 'Approved', approver1_action_timestamp = NOW(),
               approver1_name = $3
           WHERE transaction_id = $2 RETURNING *`;
      params = [comments || null, transaction, approverName];
    }
    const { rows } = await db.query(q, params);

    // Log the approval action for each task
    for (const task of rows) {
      const oldTask = oldTasks.find((t) => t.id === task.id);
      await logActivity({
        userId: req.user.id,
        module: "approvals",
        tableName: "task_requests",
        recordId: task.id,
        action: "approve",
        oldValue: oldTask,
        newValue: task,
        comments: `Task approved by ${
          approverName || `Approver ${approver_id}`
        } with comment: ${comments || "No comment provided"}`,
        reqMeta: req._meta,
      });
    }

    res.json({ success: true, updated: rows.length, rows });
  } catch (err) {
    console.error("[APPROVALS APPROVE ERROR]", err);
    res.status(500).json({ error: err.message });
  }
};

// Reject task(s) by task_requests.transaction_id
exports.rejectByTransaction = async (req, res) => {
  try {
    const { transaction } = req.params;
    const { approver_id, comments, user_request_id } = req.body;

    if (!transaction)
      return res.status(400).json({ error: "Transaction id required" });

    // Get the approver name from user_master
    let approverName = null;
    if (approver_id) {
      const approverResult = await db.query(
        `SELECT employee_name FROM user_master WHERE id = $1`,
        [approver_id]
      );
      if (approverResult.rows.length > 0) {
        approverName = approverResult.rows[0].employee_name;
      }
    }

    // Get old state (optionally scoped to a specific user_request_id)
    const oldTasksQ = user_request_id
      ? `SELECT * FROM task_requests WHERE transaction_id = $1 AND user_request_id = $2`
      : `SELECT * FROM task_requests WHERE transaction_id = $1`;
    const oldTasksParams = user_request_id
      ? [transaction, user_request_id]
      : [transaction];
    const { rows: oldTasks } = await db.query(oldTasksQ, oldTasksParams);

    // Build update query scoped to transaction and optionally the specific user_request
    let q;
    let params;
    if (user_request_id) {
      q = `UPDATE task_requests 
           SET task_status = 'Rejected', remarks = $1, updated_on = NOW(),
               approver1_action = 'Rejected', approver1_action_timestamp = NOW(),
               approver1_name = $4
           WHERE transaction_id = $2 AND user_request_id = $3 RETURNING *`;
      params = [comments || null, transaction, user_request_id, approverName];
    } else {
      q = `UPDATE task_requests 
           SET task_status = 'Rejected', remarks = $1, updated_on = NOW(),
               approver1_action = 'Rejected', approver1_action_timestamp = NOW(),
               approver1_name = $3
           WHERE transaction_id = $2 RETURNING *`;
      params = [comments || null, transaction, approverName];
    }
    const { rows } = await db.query(q, params);

    // Log the reject action for each task
    for (const task of rows) {
      const oldTask = oldTasks.find((t) => t.id === task.id);
      await logActivity({
        userId: req.user.id,
        module: "approvals",
        tableName: "task_requests",
        recordId: task.id,
        action: "reject",
        oldValue: oldTask,
        newValue: task,
        comments: `Task rejected by ${
          approverName || `Approver ${approver_id}`
        } with comment: ${comments || "No comment provided"}`,
        reqMeta: req._meta,
      });
    }

    res.json({ success: true, updated: rows.length, rows });
  } catch (err) {
    console.error("[APPROVALS REJECT ERROR]", err);
    res.status(500).json({ error: err.message });
  }
};
