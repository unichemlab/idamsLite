const db = require("../config/db");

// Approve task(s) by task_requests.transaction_id
exports.approveByTransaction = async (req, res) => {
  try {
    const { transaction } = req.params;
    const { approver_id, comments } = req.body;

    if (!transaction) return res.status(400).json({ error: "Transaction id required" });

    const q = `UPDATE task_requests SET task_status = 'Approved', remarks = $1, updated_on = NOW() WHERE transaction_id = $2 RETURNING *`;
    const params = [comments || null, transaction];
    const { rows } = await db.query(q, params);

    // Optionally, update user_requests approver status if needed (omitted for now)

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

    const q = `UPDATE task_requests SET task_status = 'Rejected', remarks = $1, updated_on = NOW() WHERE transaction_id = $2 RETURNING *`;
    const params = [comments || null, transaction];
    const { rows } = await db.query(q, params);

    res.json({ success: true, updated: rows.length, rows });
  } catch (err) {
    console.error("[APPROVALS REJECT ERROR]", err);
    res.status(500).json({ error: err.message });
  }
};
