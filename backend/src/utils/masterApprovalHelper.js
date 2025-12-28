const pool = require("../config/db");
const { sendApprovalEmail } = require("../utils/masterEmailHelper");

/* ======================================================
   SUBMIT FOR APPROVAL
====================================================== */
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
    const settingsResult = await pool.query(
      "SELECT requires_approval, notification_emails FROM approval_settings WHERE module = $1",
      [module]
    );

    const requiresApproval = settingsResult.rows[0]?.requires_approval ?? true;

    if (!requiresApproval) return null;

    const result = await pool.query(
      `INSERT INTO pending_approvals
       (module, table_name, action, record_id, old_value, new_value,
        requested_by, requested_by_username, comments, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING')
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

    try {
      await sendApprovalEmail({
        approvalId,
        module,
        action,
        requestedBy: requestedByUsername,
        comments,
        recipientEmails: settingsResult.rows[0]?.notification_emails || [],
        recordData: newValue || oldValue,
      });
    } catch (err) {
      console.error("Approval email failed:", err.message);
    }

    return approvalId;
  } catch (err) {
    console.error("Submit approval error:", err);
    throw err;
  }
}

/* ======================================================
   GET PENDING APPROVALS
====================================================== */
async function getPendingApprovals({ module = null, status = "PENDING", limit = 100 } = {}) {
  let query = `
    SELECT pa.*, u.employee_name AS requested_by_name
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
}

/* ======================================================
   APPROVE CHANGE
====================================================== */
async function approveChange({
  approvalId,
  approvedBy,
  approvedByUsername,
  approvalComments = "",
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const approvalRes = await client.query(
      "SELECT * FROM pending_approvals WHERE id = $1 AND status = 'PENDING'",
      [approvalId]
    );

    if (!approvalRes.rows.length) {
      throw new Error("Approval not found or already processed");
    }

    const approval = approvalRes.rows[0];
    let appliedResult = null;

    if (approval.action === "create") {
      appliedResult = await applyCreate(client, approval.table_name, approval.new_value);
    }

    if (approval.action === "update") {
      appliedResult = await applyUpdate(client, approval.table_name, approval.record_id, approval.new_value, approvedBy);
    }

    if (approval.action === "delete") {
      appliedResult = await applyDelete(client, approval.table_name, approval.record_id);
    }

    await client.query(
      `UPDATE pending_approvals
       SET status='APPROVED',
           approved_by=$1,
           approved_by_username=$2,
           approved_at=NOW(),
           approval_comments=$3
       WHERE id=$4`,
      [approvedBy, approvedByUsername, approvalComments, approvalId]
    );

    await client.query("COMMIT");

    return { success: true, approval, appliedResult };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Approve error:", err);
    throw err;
  } finally {
    client.release();
  }
}

/* ======================================================
   REJECT CHANGE
====================================================== */
async function rejectChange({
  approvalId,
  rejectedBy,
  rejectedByUsername,
  rejectionComments,
}) {
  const result = await pool.query(
    `UPDATE pending_approvals
     SET status='REJECTED',
         approved_by=$1,
         approved_by_username=$2,
         approved_at=NOW(),
         approval_comments=$3
     WHERE id=$4 AND status='PENDING'
     RETURNING *`,
    [rejectedBy, rejectedByUsername, rejectionComments, approvalId]
  );

  if (!result.rows.length) {
    throw new Error("Approval not found or already processed");
  }

  return { success: true, approval: result.rows[0] };
}

/* ======================================================
   APPLY HELPERS
====================================================== */

const SYSTEM_COLUMNS = [
  "id",
  "created_on",
  "created_by",
  "updated_on",
  "updated_by",
  "approved_on",
  "approved_by",
];

async function applyCreate(client, tableName, newValue) {
  const data = typeof newValue === "string" ? JSON.parse(newValue) : newValue;

  SYSTEM_COLUMNS.forEach(col => delete data[col]);

  const columns = Object.keys(data);
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

async function applyUpdate(client, tableName, recordId, newValue, approvedBy) {
  const data = typeof newValue === "string" ? JSON.parse(newValue) : newValue;

  /* -----------------------------------------
     Remove system/audit fields from payload
  ------------------------------------------ */
  [
    "id",
    "created_on",
    "created_by",
    "updated_on",
    "updated_by",
    "approved_on",
    "approved_by",
  ].forEach(k => delete data[k]);

  const columns = Object.keys(data);
  if (!columns.length) {
    throw new Error("No valid columns to update");
  }

  /* -----------------------------------------
     Detect optional audit columns dynamically
  ------------------------------------------ */
  const auditCols = await client.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1
      AND column_name IN ('updated_on', 'updated_by')
    `,
    [tableName]
  );

  const hasUpdatedOn = auditCols.rows.some(r => r.column_name === "updated_on");
  const hasUpdatedBy = auditCols.rows.some(r => r.column_name === "updated_by");

  /* -----------------------------------------
     Build SET clause
  ------------------------------------------ */
  const setClauses = [];
  const values = [];

  columns.forEach(col => {
    setClauses.push(`${col} = $${values.length + 1}`);
    values.push(data[col]);
  });

  if (hasUpdatedOn) {
    setClauses.push(`updated_on = NOW()`);
  }

  if (hasUpdatedBy) {
    setClauses.push(`updated_by = $${values.length + 1}`);
    values.push(approvedBy);
  }

  /* -----------------------------------------
     Final query
  ------------------------------------------ */
  const query = `
    UPDATE ${tableName}
    SET ${setClauses.join(", ")}
    WHERE id = $${values.length + 1}
    RETURNING *
  `;

  values.push(recordId);

  const result = await client.query(query, values);
  return result.rows[0];
}


async function applyDelete(client, tableName, recordId, approvedBy) {

  // Check if table has "status" column (soft delete support)
  const statusColCheck = await client.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = $1
      AND column_name = 'status'
    `,
    [tableName]
  );

  const hasStatus = statusColCheck.rowCount > 0;

  if (hasStatus) {
    // ✅ Soft delete
    const query = `
      UPDATE ${tableName}
      SET status = 'INACTIVE',
          updated_on = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await client.query(query, [recordId]);
    return result.rows[0];
  }

  // ❌ Hard delete only if no FK dependency exists
  const fkCheck = await client.query(
    `
    SELECT conname
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = $1::regclass
    `,
    [tableName]
  );

  if (fkCheck.rowCount > 0) {
    throw new Error(
      `Cannot delete record: dependent records exist in other tables`
    );
  }

  // Last resort hard delete
  const result = await client.query(
    `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`,
    [recordId]
  );

  return result.rows[0];
}


/* ======================================================
   STATS
====================================================== */
async function getApprovalStats(module = null) {
  let query = `
    SELECT
      COUNT(*) FILTER (WHERE status='PENDING') AS pending_count,
      COUNT(*) FILTER (WHERE status='APPROVED') AS approved_count,
      COUNT(*) FILTER (WHERE status='REJECTED') AS rejected_count,
      COUNT(*) AS total_count
    FROM pending_approvals
  `;

  const params = [];
  if (module) {
    params.push(module);
    query += ` WHERE module = $1`;
  }

  const result = await pool.query(query, params);
  return result.rows[0];
}

module.exports = {
  submitForApproval,
  getPendingApprovals,
  approveChange,
  rejectChange,
  getApprovalStats,
};
