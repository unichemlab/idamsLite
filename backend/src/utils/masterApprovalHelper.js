const pool = require("../config/db");
const { sendApprovalEmail } = require("../utils/masterEmailHelper");

/**
 * Submit a change for approval
 * @param {Object} params - Approval parameters
 * @param {string} params.module - Module name (e.g., 'plant')
 * @param {string} params.tableName - Database table name
 * @param {string} params.action - 'create', 'update', or 'delete'
 * @param {number|null} params.recordId - ID of existing record (null for create)
 * @param {Object|null} params.oldValue - Original data (null for create)
 * @param {Object|null} params.newValue - New data (null for delete)
 * @param {number} params.requestedBy - User ID making the request
 * @param {string} params.requestedByUsername - Username for display
 * @param {string} params.comments - Description of the change
 * @returns {Promise<number>} - ID of the pending approval record
 */
async function submitForApproval({
  module,
  tableName,
  action,
  recordId = null,
  oldValue = null,
  newValue = null,
  requestedBy,
  requestedByUsername,
  comments = "",
}) {
  try {
    // Check if approval is required for this module
    const settingsResult = await pool.query(
      "SELECT requires_approval, notification_emails FROM approval_settings WHERE module = $1",
      [module]
    );

    const requiresApproval = settingsResult.rows[0]?.requires_approval ?? true;

    if (!requiresApproval) {
      // If approval not required, return null (caller should apply directly)
      return null;
    }

    // Insert pending approval record
    const result = await pool.query(
      `INSERT INTO pending_approvals 
       (module, table_name, action, record_id, old_value, new_value, 
        requested_by, requested_by_username, comments, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
       RETURNING id`,
      [
        module,
        tableName,
        action,
        recordId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        requestedBy,
        requestedByUsername,
        comments,
      ]
    );

    const approvalId = result.rows[0].id;

    // Send email notification (non-blocking)
    try {
      const notificationEmails = settingsResult.rows[0]?.notification_emails || [];
      await sendApprovalEmail({
        approvalId,
        module,
        action,
        requestedBy: requestedByUsername,
        comments,
        recipientEmails: notificationEmails,
        recordData: newValue || oldValue,
      });
    } catch (emailErr) {
      console.error("Failed to send approval email:", emailErr.message);
    }

    return approvalId;
  } catch (err) {
    console.error("Error submitting for approval:", err);
    throw err;
  }
}

/**
 * Get all pending approvals (optionally filtered)
 * @param {Object} filters - Filter options
 * @param {string} filters.module - Filter by module
 * @param {string} filters.status - Filter by status (default: 'PENDING')
 * @param {number} filters.limit - Limit results
 * @returns {Promise<Array>} - Array of pending approval records
 */
async function getPendingApprovals({
  module = null,
  status = "PENDING",
  limit = 100,
} = {}) {
  try {
    let query = `
      SELECT pa.*, u.employee_name as requested_by_name
      FROM pending_approvals pa
      LEFT JOIN user_master u ON pa.requested_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (module) {
      params.push(module);
      query += ` AND pa.module = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND pa.status = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY pa.created_at DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    console.error("Error fetching pending approvals:", err);
    throw err;
  }
}

/**
 * Approve a pending change and apply it to the master table
 * @param {Object} params - Approval parameters
 * @param {number} params.approvalId - ID of the pending approval
 * @param {number} params.approvedBy - User ID approving the change
 * @param {string} params.approvedByUsername - Username of approver
 * @param {string} params.approvalComments - Comments from approver
 * @returns {Promise<Object>} - Result of the approval
 */
async function approveChange({
  approvalId,
  approvedBy,
  approvedByUsername,
  approvalComments = "",
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get the pending approval
    const approvalResult = await client.query(
      "SELECT * FROM pending_approvals WHERE id = $1 AND status = 'PENDING'",
      [approvalId]
    );

    if (approvalResult.rows.length === 0) {
      throw new Error("Approval not found or already processed");
    }

    const approval = approvalResult.rows[0];
    const { table_name, action, record_id, new_value, old_value } = approval;

    // Apply the change based on action type
    let appliedResult = null;

    if (action === "create") {
      appliedResult = await applyCreate(client, table_name, new_value);
    } else if (action === "update") {
      appliedResult = await applyUpdate(client, table_name, record_id, new_value);
    } else if (action === "delete") {
      appliedResult = await applyDelete(client, table_name, record_id);
    }

    // Update approval status
    await client.query(
      `UPDATE pending_approvals 
       SET status = 'APPROVED', 
           approved_by = $1, 
           approved_by_username = $2,
           approved_at = NOW(),
           approval_comments = $3
       WHERE id = $4`,
      [approvedBy, approvedByUsername, approvalComments, approvalId]
    );

    await client.query("COMMIT");

    return {
      success: true,
      approval,
      appliedResult,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error approving change:", err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Reject a pending change
 * @param {Object} params - Rejection parameters
 * @param {number} params.approvalId - ID of the pending approval
 * @param {number} params.rejectedBy - User ID rejecting the change
 * @param {string} params.rejectedByUsername - Username of rejector
 * @param {string} params.rejectionComments - Reason for rejection
 * @returns {Promise<Object>} - Result of the rejection
 */
async function rejectChange({
  approvalId,
  rejectedBy,
  rejectedByUsername,
  rejectionComments = "",
}) {
  try {
    const result = await pool.query(
      `UPDATE pending_approvals 
       SET status = 'REJECTED', 
           approved_by = $1, 
           approved_by_username = $2,
           approved_at = NOW(),
           approval_comments = $3
       WHERE id = $4 AND status = 'PENDING'
       RETURNING *`,
      [rejectedBy, rejectedByUsername, rejectionComments, approvalId]
    );

    if (result.rows.length === 0) {
      throw new Error("Approval not found or already processed");
    }

    return {
      success: true,
      approval: result.rows[0],
    };
  } catch (err) {
    console.error("Error rejecting change:", err);
    throw err;
  }
}

// Helper functions to apply changes to master tables

async function applyCreate(client, tableName, newValue) {
  const data = typeof newValue === "string" ? JSON.parse(newValue) : newValue;

  // Build dynamic INSERT query based on table
  const columns = Object.keys(data).filter(k => k !== 'id');
  const values = columns.map(k => data[k]);
  const placeholders = columns.map((_, i) => `$${i + 1}`);

  const query = `
    INSERT INTO ${tableName} (${columns.join(", ")})
    VALUES (${placeholders.join(", ")})
    RETURNING *
  `;

  const result = await client.query(query, values);
  return result.rows[0];
}

async function applyUpdate(client, tableName, recordId, newValue) {
  const data = typeof newValue === "string" ? JSON.parse(newValue) : newValue;

  // Build dynamic UPDATE query
  const columns = Object.keys(data).filter(k => k !== 'id');
  const setClauses = columns.map((col, i) => `${col} = $${i + 1}`);
  const values = [...columns.map(k => data[k]), recordId];

  const query = `
    UPDATE ${tableName}
    SET ${setClauses.join(", ")}, updated_on = NOW()
    WHERE id = $${values.length}
    RETURNING *
  `;

  const result = await client.query(query, values);
  return result.rows[0];
}

async function applyDelete(client, tableName, recordId) {
  const query = `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`;
  const result = await client.query(query, [recordId]);
  return result.rows[0];
}

/**
 * Get approval statistics
 * @param {string} module - Module name (optional)
 * @returns {Promise<Object>} - Statistics object
 */
async function getApprovalStats(module = null) {
  try {
    let query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved_count,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected_count,
        COUNT(*) as total_count
      FROM pending_approvals
    `;

    const params = [];
    if (module) {
      params.push(module);
      query += ` WHERE module = $1`;
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  } catch (err) {
    console.error("Error fetching approval stats:", err);
    throw err;
  }
}

module.exports = {
  submitForApproval,
  getPendingApprovals,
  approveChange,
  rejectChange,
  getApprovalStats,
};