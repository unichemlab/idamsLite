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
    const { approver_id, comments } = req.body;

    if (!transaction) return res.status(400).json({ error: "Transaction id required" });

    // Get old state
    const oldTasks = await getTasksByTransaction(transaction);

    const q = `UPDATE task_requests SET task_status = 'Approved', remarks = $1, updated_on = NOW() WHERE transaction_id = $2 RETURNING *`;
    const params = [comments || null, transaction];
    const { rows } = await db.query(q, params);

    // Log the approval action for each task
    for (const task of rows) {
      const oldTask = oldTasks.find(t => t.id === task.id);
      await logActivity({
        userId: req.user.id,
        module: 'approvals',
        tableName: 'task_requests',
        recordId: task.id,
        action: 'approve',
        oldValue: oldTask,
        newValue: task,
        comments: `Task approved with comment: ${comments || 'No comment provided'}`,
        reqMeta: req._meta
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
    const { approver_id, comments } = req.body;

    if (!transaction) return res.status(400).json({ error: "Transaction id required" });

    // Get old state
    const oldTasks = await getTasksByTransaction(transaction);

    const q = `UPDATE task_requests SET task_status = 'Rejected', remarks = $1, updated_on = NOW() WHERE transaction_id = $2 RETURNING *`;
    const params = [comments || null, transaction];
    const { rows } = await db.query(q, params);

    // Log the reject action for each task
    for (const task of rows) {
      const oldTask = oldTasks.find(t => t.id === task.id);
      await logActivity({
        userId: req.user.id,
        module: 'approvals',
        tableName: 'task_requests',
        recordId: task.id,
        action: 'reject',
        oldValue: oldTask,
        newValue: task,
        comments: `Task rejected with comment: ${comments || 'No comment provided'}`,
        reqMeta: req._meta
      });
    }

    res.json({ success: true, updated: rows.length, rows });
  } catch (err) {
    console.error("[APPROVALS REJECT ERROR]", err);
    res.status(500).json({ error: err.message });
  }
};
