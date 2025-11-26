const {
  getPendingApprovals,
  approveChange,
  rejectChange,
  getApprovalStats,
} = require("../utils/masterApprovalHelper");
const { sendApprovalDecisionEmail } = require("../utils/masterEmailHelper");
const pool = require("../config/db");

/**
 * Get all pending approvals (with optional filters)
 */
exports.getAllApprovals = async (req, res) => {
  try {
    const { module, status, limit } = req.query;

    const approvals = await getPendingApprovals({
      module: module || null,
      status: status || "PENDING",
      limit: limit ? parseInt(limit) : 100,
    });

    res.json(approvals);
  } catch (err) {
    console.error("Error fetching approvals:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get a single approval by ID
 */
exports.getApprovalById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT pa.*, 
              u1.employee_name as requested_by_name,
              u1.email as requested_by_email,
              u2.employee_name as approved_by_name
       FROM pending_approvals pa
       LEFT JOIN user_master u1 ON pa.requested_by = u1.id
       LEFT JOIN user_master u2 ON pa.approved_by = u2.id
       WHERE pa.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Approval not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching approval:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Approve a pending change
 */
exports.approveApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const approvedBy = req.user?.id || req.user?.user_id;
    const approvedByUsername = req.user?.username;

    if (!approvedBy) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const result = await approveChange({
      approvalId: parseInt(id),
      approvedBy,
      approvedByUsername,
      approvalComments: comments || "",
    });

    // Send notification email to requester (non-blocking)
    try {
      const approval = result.approval;
      const requesterResult = await pool.query(
        "SELECT email FROM user_master WHERE id = $1",
        [approval.requested_by]
      );

      if (requesterResult.rows[0]?.email) {
        await sendApprovalDecisionEmail({
          requesterEmail: requesterResult.rows[0].email,
          requesterName: approval.requested_by_username,
          module: approval.module,
          action: approval.action,
          decision: "APPROVED",
          approverName: approvedByUsername,
          comments: comments || "",
          recordData: approval.new_value || approval.old_value,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send decision email:", emailErr);
    }

    res.json({
      message: "Change approved successfully",
      ...result,
    });
  } catch (err) {
    console.error("Error approving change:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Reject a pending change
 */
exports.rejectApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const rejectedBy = req.user?.id || req.user?.user_id;
    const rejectedByUsername = req.user?.username;

    if (!rejectedBy) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!comments) {
      return res
        .status(400)
        .json({ error: "Rejection comments are required" });
    }

    const result = await rejectChange({
      approvalId: parseInt(id),
      rejectedBy,
      rejectedByUsername,
      rejectionComments: comments,
    });

    // Send notification email to requester (non-blocking)
    try {
      const approval = result.approval;
      const requesterResult = await pool.query(
        "SELECT email FROM user_master WHERE id = $1",
        [approval.requested_by]
      );

      if (requesterResult.rows[0]?.email) {
        await sendApprovalDecisionEmail({
          requesterEmail: requesterResult.rows[0].email,
          requesterName: approval.requested_by_username,
          module: approval.module,
          action: approval.action,
          decision: "REJECTED",
          approverName: rejectedByUsername,
          comments: comments,
          recordData: approval.new_value || approval.old_value,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send decision email:", emailErr);
    }

    res.json({
      message: "Change rejected successfully",
      ...result,
    });
  } catch (err) {
    console.error("Error rejecting change:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get approval statistics
 */
exports.getApprovalStats = async (req, res) => {
  try {
    const { module } = req.query;

    const stats = await getApprovalStats(module || null);

    res.json(stats);
  } catch (err) {
    console.error("Error fetching approval stats:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete/cancel a pending approval (only by requester before it's processed)
 */
exports.cancelApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.user_id;

    const result = await pool.query(
      `DELETE FROM pending_approvals 
       WHERE id = $1 AND requested_by = $2 AND status = 'PENDING'
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Approval not found or cannot be cancelled",
      });
    }

    res.json({
      message: "Approval cancelled successfully",
      approval: result.rows[0],
    });
  } catch (err) {
    console.error("Error cancelling approval:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = exports;