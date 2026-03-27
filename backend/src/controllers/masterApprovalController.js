const {
  getPendingApprovals,
  approveChange,
  rejectChange,
  getApprovalStats,
} = require("../utils/masterApprovalHelper");
const { sendApprovalDecisionEmail } = require("../utils/masterEmailHelper");
const { isDuplicateName } = require("../utils/duplicateChecker");
const pool = require("../config/db");

/**
 * Get all pending approvals (with optional filters)
 */
exports.getAllApprovals = async (req, res) => {
  try {
    const { module, status, page, perPage, tableName, requestedBy } = req.query;

    const approvals = await getPendingApprovals({
      module:      module      || null,
      status:      status      || "PENDING",
      tableName:   tableName   || null,
      requestedBy: requestedBy || null,
      page:        page        ? parseInt(page)    : 1,
      perPage:     perPage     ? parseInt(perPage) : 25,
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
      approvalId:        parseInt(id),
      approvedBy,
      approvedByUsername,
      approvalComments:  comments || "",
      req,               // ← audit trail: ip, browser, lat/lng, subscription
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



exports.checkDuplicate = async (req, res) => {
  try {
    const { module, name, excludeId = null } = req.body;

    // Validate module
    const allowedModules = ["plant", "department", "roles", "vendors"];
    if (!module || !allowedModules.includes(module)) {
      return res.status(400).json({
        error: `Invalid module "${module}". Allowed: ${allowedModules.join(", ")}`,
        code:  "INVALID_MODULE",
      });
    }

    // Validate name
    if (!name || !String(name).trim()) {
      return res.status(400).json({
        error: "name is required",
        code:  "MISSING_NAME",
      });
    }

    const duplicate = await isDuplicateName({ module, name, excludeId });

    if (duplicate) {
      return res.status(409).json({
        duplicate: true,
        error: excludeId
          ? `Another ${module} with the name "${name}" already exists.`
          : `A ${module} with the name "${name}" already exists.`,
        code: "DUPLICATE_NAME",
      });
    }

    res.status(200).json({ duplicate: false });
  } catch (err) {
    console.error("Error checking duplicate:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// BULK DUPLICATE CHECK (FINAL)
// ------------------------------
exports.bulkCheckDuplicates = async (req, res) => {
  try {
    const { module, names = [], excludeId = null } = req.body;

    const allowedModules = ["plant", "department", "roles", "vendors"];
    if (!module || !allowedModules.includes(module)) {
      return res.status(400).json({
        error: `Invalid module "${module}"`,
      });
    }

    if (!Array.isArray(names) || names.length === 0) {
      return res.json({ duplicates: [], duplicateMap: {} });
    }

    // ✅ Normalize input
    const normalizedNames = names
      .map(n =>
        String(n)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ")
      )
      .filter(n => n);

    const duplicates = [];

    // ------------------------------
    // 🔥 USE EXISTING LOGIC
    // ------------------------------
    for (const name of normalizedNames) {
      const isDup = await isDuplicateName({
        module,
        name,
        excludeId
      });

      if (isDup) {
        duplicates.push(name);
      }
    }

    // ------------------------------
    // ✅ Response
    // ------------------------------
    const duplicateMap = Object.fromEntries(
      duplicates.map(name => [name, true])
    );

    res.status(200).json({
      duplicates,
      duplicateMap
    });

  } catch (err) {
    console.error("Bulk duplicate check error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = exports;