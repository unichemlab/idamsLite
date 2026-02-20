// masterApprovalHelper.js
// Approval workflow engine — submit, approve, reject
// Produces exactly 3 audit entries per full approval cycle:
//   1. submit_for_approval  (submitForApproval)
//   2. create/update/delete (applyCreate/Update/Delete commitLog, post-COMMIT)
//   3. approve              (approveChange Entry 2, post-COMMIT)

const pool = require("../config/db");
const { logCrud, ACTION } = require("./activityLogger");

/* ─────────────────────────────────────────────────────────────────────────────
 * generateTransactionId
 * Returns the next sequential transaction ID for a given prefix.
 * e.g. prefix="APP" → "APP0000001", prefix="ROLE" → "ROLE000018"
 * ───────────────────────────────────────────────────────────────────────────── */
async function generateTransactionId(prefix = "ACT") {
  const result = await pool.query(
    `SELECT transaction_id
       FROM activity_log
      WHERE transaction_id LIKE $1
      ORDER BY id DESC
      LIMIT 1`,
    [`${prefix}%`]
  );
  if (!result.rows.length) return `${prefix}000001`;
  const last   = result.rows[0].transaction_id;
  const num    = parseInt(last.replace(prefix, ""), 10) || 0;
  const padLen = Math.max(6, last.replace(prefix, "").length);
  return `${prefix}${String(num + 1).padStart(padLen, "0")}`;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * submitForApproval
 *
 * Inserts a pending_approvals row and writes an audit log entry.
 * req is always present here (called from HTTP controller).
 *
 * @param {object} params
 *   tableName        - target table, e.g. "application_master"
 *   action           - "create" | "update" | "delete"
 *   requestedBy      - user id of submitter
 *   requestedByUsername
 *   module           - module name, e.g. "application"
 *   oldValue         - current DB state (null for create)
 *   newValue         - proposed new state
 *   recordId         - target record id (null for create)
 *   comments         - submitter comments
 *   req              - Express request object
 * ───────────────────────────────────────────────────────────────────────────── */
async function submitForApproval({
  tableName,
  action,
  requestedBy,
  requestedByUsername,
  module,
  oldValue   = null,
  newValue,
  recordId   = null,
  comments   = "",
  req,
}) {
  /* ── 1. Validate ── */
  if (!tableName || !action || !requestedBy || !newValue) {
    throw new Error("submitForApproval: tableName, action, requestedBy, newValue are required");
  }

  /* ── 2. Insert pending_approvals row ── */
  const result = await pool.query(
    `INSERT INTO pending_approvals
       (table_name, action, requested_by, requested_by_username, module,
        old_value, new_value, record_id, comments, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING', NOW())
     RETURNING id`,
    [
      tableName, action, requestedBy, requestedByUsername, module,
      oldValue   ? JSON.stringify(oldValue) : null,
      newValue   ? JSON.stringify(newValue) : null,
      recordId,
      comments,
    ]
  );

  const approvalId = result.rows[0].id;

  /* ── 3. Audit log — ACTION.SUBMIT ── */
  /* subscription: plant_id + location (e.g. "9+Mumbai, MH")             */
  const subscription = req?.user?.subscription
    ?? (req?.user?.plant_id != null && req?.user?.location
         ? `${req.user.plant_id}+${req.user.location}`
         : req?.user?.plant_id != null
           ? String(req.user.plant_id)
           : null);

  try {
    await logCrud({
      userId:          requestedBy,
      performedByRole: req?.user?.role ?? null,
      module,
      tableName,
      recordId,
      action:          ACTION.SUBMIT,
      oldValue,
      newValue,
      approveStatus:   "pending",
      approvedBy:      null,
      subscription,
      req,
      comments:        comments || `Submitted for approval by ${requestedByUsername}`,
    });
  } catch (logErr) {
    console.error("Audit log (submit) failed:", logErr.message);
  }

  return approvalId;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * approveChange
 *
 * Approves a pending_approvals row:
 *   1. Fetches the pending approval
 *   2. Applies the change (create/update/delete) inside a DB transaction
 *   3. Marks pending_approvals as APPROVED
 *   4. COMMITs
 *   5. Fires two audit log entries POST-COMMIT (safe — log failures never
 *      roll back the approval):
 *        Entry 1 → data operation (CREATE/UPDATE/DELETE on target table)
 *        Entry 2 → workflow event (APPROVE on pending_approvals)
 *
 * @param {object} params
 *   approvalId          - pending_approvals.id
 *   approvedBy          - user id of approver
 *   approvedByUsername
 *   approvalComments    - approver comments
 *   req                 - Express request object (may be null if called internally)
 * ───────────────────────────────────────────────────────────────────────────── */
async function approveChange({
  approvalId,
  approvedBy,
  approvedByUsername,
  approvalComments = "",
  req,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* ── 1. Fetch pending approval ── */
    const approvalRes = await client.query(
      `SELECT * FROM pending_approvals WHERE id = $1 AND status = 'PENDING'`,
      [approvalId]
    );
    if (!approvalRes.rows.length) {
      throw new Error(`Approval ${approvalId} not found or already processed`);
    }

    const approval = approvalRes.rows[0];

    /* ── 2. Eagerly snapshot ALL request metadata NOW ────────────────────────
       req can be null or become stale inside async closures.
       Every field is captured here so commitLog closures always have
       full audit context, even when req = null on the approve path.
       ──────────────────────────────────────────────────────────────────────── */
    const reqMeta = {
      // Identity
      performedByRole: req?.user?.role ?? null,
      // subscription: plant_id + location (e.g. "9+Mumbai, MH")
      subscription:    req?.user?.subscription
                         ?? (req?.user?.plant_id != null && req?.user?.location
                              ? `${req.user.plant_id}+${req.user.location}`
                              : req?.user?.plant_id != null
                                ? String(req.user.plant_id)
                                : null),
      plant_id:        req?.user?.plant_id ?? null,

      // Network
      ip:              req?.ip
                         ?? (req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || null),
      server_ip:       process.env.SERVER_IP ?? null,

      // Device / Browser (sent by frontend as custom headers on every request)
      userAgent:       req?.get?.("User-Agent")            ?? null,
      device_id:       req?.headers?.["x-device-id"]       ?? null,
      device_type:     req?.headers?.["x-device-type"]     ?? null,
      mac_address:     req?.headers?.["x-mac-address"]     ?? null,
      computer_name:   req?.headers?.["x-computer-name"]   ?? null,

      // Geolocation — frontend sends x-lat / x-lng headers on every request
      latitude:        req?.headers?.["x-lat"]  != null ? Number(req.headers["x-lat"])  : null,
      longitude:       req?.headers?.["x-lng"]  != null ? Number(req.headers["x-lng"])  : null,
      location:        req?.headers?.["x-location"]         ?? null,

      // App
      app_version:     req?.headers?.["x-app-version"]     ?? null,
      source:          req?.headers?.["x-source"]           ?? "web",
      transaction_id:  req?.headers?.["x-transaction-id"]  ?? null,

      // Raw req — kept so logCrud can derive endpoint/referrer when req is live
      req,
    };

    /* ── 3. Build logCtx passed to each apply helper ── */
    const logCtx = {
      approvedBy,
      approvedByUsername,
      module: approval.module,
      reqMeta,
    };

    /* ── 4. Apply the change ─────────────────────────────────────────────────
       Each helper runs inside the transaction and returns a commitLog closure.
       The closure captures all log params from the transaction scope.
       It is called AFTER COMMIT so a log failure never rolls back the approval.
       ──────────────────────────────────────────────────────────────────────── */
    let applyResult = null;

    if (approval.action === "create") {
      applyResult = await applyCreate(client, approval.table_name, approval.new_value, logCtx);
    }
    if (approval.action === "update") {
      applyResult = await applyUpdate(
        client, approval.table_name, approval.record_id, approval.new_value, approvedBy, logCtx
      );
    }
    if (approval.action === "delete") {
      applyResult = await applyDelete(client, approval.table_name, approval.record_id, approvedBy, logCtx);
    }

    /* ── 5. Mark pending_approvals as APPROVED ── */
    await client.query(
      `UPDATE pending_approvals
          SET status               = 'APPROVED',
              approved_by          = $1,
              approved_by_username = $2,
              approved_at          = NOW(),
              approval_comments    = $3
        WHERE id = $4`,
      [approvedBy, approvedByUsername, approvalComments, approvalId]
    );

    await client.query("COMMIT");

    /* ── 6. Audit logs — fired AFTER COMMIT ─────────────────────────────────
       Entry 1 → delegated to apply function's own commitLog closure
                  (ACTION.CREATE / UPDATE / DELETE on the target table)
                  All log params captured inside transaction scope.

       Entry 2 → workflow event (ACTION.APPROVE on pending_approvals)
                  requestTransactionId = target row's transaction_id
                  (e.g. "ROLE000018", "APP0000001")
       ──────────────────────────────────────────────────────────────────────── */

    // Entry 1 — data operation
    if (applyResult?.commitLog) {
      await applyResult.commitLog();
    }

    // Entry 2 — workflow approval event
    try {
      await logCrud({
        userId:               approvedBy,
        performedByRole:      reqMeta.performedByRole,
        module:               approval.module,
        tableName:            "pending_approvals",
        recordId:             approvalId,
        action:               ACTION.APPROVE,
        oldValue:             { status: "PENDING", pending_approval_id: approvalId },
        newValue:             {
          status:              "APPROVED",
          pending_approval_id: approvalId,
          target_table:        approval.table_name,
          target_action:       approval.action,
          target_record_id:    applyResult?.recordId ?? approval.record_id,
          approval_comments:   approvalComments,
        },
        approveStatus:        "approved",
        approvedBy,
        requestTransactionId: applyResult?.newValue?.transaction_id ?? null,
        comments:             approvalComments || `Approved by ${approvedByUsername}`,
        // Pre-snapshotted fields — survive when req is null
        req:                  reqMeta.req,
        subscription:         reqMeta.subscription,
        ip:                   reqMeta.ip,
        latitude:             reqMeta.latitude,
        longitude:            reqMeta.longitude,
        location:             reqMeta.location,
        device_id:            reqMeta.device_id,
        device_type:          reqMeta.device_type,
        mac_address:          reqMeta.mac_address,
        computer_name:        reqMeta.computer_name,
        plant_id:             reqMeta.plant_id,
        app_version:          reqMeta.app_version,
        source:               reqMeta.source,
      });
    } catch (logErr) {
      console.error("Audit log (approve workflow) failed:", logErr.message);
    }

    return { success: true, approval, appliedResult: applyResult?.newValue ?? null };

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Approve error:", err);
    throw err;
  } finally {
    client.release();
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * rejectChange
 *
 * Rejects a pending_approvals row and writes a REJECT audit entry.
 * ───────────────────────────────────────────────────────────────────────────── */
async function rejectChange({
  approvalId,
  rejectedBy,
  rejectedByUsername,
  rejectionComments = "",
  req,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const approvalRes = await client.query(
      `SELECT * FROM pending_approvals WHERE id = $1 AND status = 'PENDING'`,
      [approvalId]
    );
    if (!approvalRes.rows.length) {
      throw new Error(`Approval ${approvalId} not found or already processed`);
    }

    const approval = approvalRes.rows[0];

    await client.query(
      `UPDATE pending_approvals
          SET status               = 'REJECTED',
              approved_by          = $1,
              approved_by_username = $2,
              approved_at          = NOW(),
              approval_comments    = $3
        WHERE id = $4`,
      [rejectedBy, rejectedByUsername, rejectionComments, approvalId]
    );

    await client.query("COMMIT");

    /* Audit log — rejection; req is live here so use it directly */
    const subscription = req?.user?.subscription
      ?? (req?.user?.plant_id != null && req?.user?.location
           ? `${req.user.plant_id}+${req.user.location}`
           : req?.user?.plant_id != null ? String(req.user.plant_id) : null);

    try {
      await logCrud({
        userId:          rejectedBy,
        performedByRole: req?.user?.role ?? null,
        module:          approval.module,
        tableName:       approval.table_name,
        recordId:        approval.record_id,
        action:          ACTION.REJECT,
        oldValue:        approval.old_value
                           ? (typeof approval.old_value === "string"
                               ? JSON.parse(approval.old_value)
                               : approval.old_value)
                           : null,
        newValue:        null,
        approveStatus:   "rejected",
        approvedBy:      rejectedBy,
        subscription,
        req,
        comments:        rejectionComments || `Rejected by ${rejectedByUsername}`,
      });
    } catch (logErr) {
      console.error("Audit log (reject) failed:", logErr.message);
    }

    return { success: true, approval };

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Reject error:", err);
    throw err;
  } finally {
    client.release();
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * applyCreate
 *
 * INSERTs a new row into tableName inside an existing transaction.
 * Returns { recordId, newValue, commitLog } where commitLog is an async
 * closure that fires ACTION.CREATE after the caller COMMITs.
 *
 * requestTransactionId = inserted row's own transaction_id (e.g. "APP0000001")
 * ───────────────────────────────────────────────────────────────────────────── */
async function applyCreate(client, tableName, newValue, { approvedBy, approvedByUsername, module, reqMeta = {} } = {}) {
  // ── 0. SQL-injection guard ───────────────────────────────────────────────
  if (!/^[a-zA-Z_]+$/.test(tableName)) {
    throw new Error("applyCreate: invalid table name");
  }

  // ── 1. Sanitise payload ──────────────────────────────────────────────────
  let data = typeof newValue === "string" ? JSON.parse(newValue) : { ...newValue };

  const forbiddenCols = ["id", "created_on", "created_by", "updated_on", "updated_by", "approved_on", "approved_by"];
  if (tableName !== "plant_master") delete data.plant_name;
  forbiddenCols.forEach((col) => delete data[col]);
  Object.keys(data).forEach((k) => { if (data[k] === "") data[k] = null; });

  const columns = Object.keys(data);
  if (!columns.length) throw new Error("applyCreate: no valid columns after cleanup");

  const values       = columns.map((k) => data[k]);
  const placeholders = columns.map((_, i) => `$${i + 1}`);

  // ── 2. INSERT ────────────────────────────────────────────────────────────
  const result = await client.query(
    `INSERT INTO ${tableName} (${columns.join(", ")})
     VALUES (${placeholders.join(", ")})
     RETURNING *`,
    values
  );

  const inserted = result.rows[0];

  // ── 3. Build log closure ─────────────────────────────────────────────────
  //    All reqMeta fields are captured NOW (pre-snapshot) so this closure
  //    is safe to call after COMMIT even when req is long gone.
  //    requestTransactionId = the inserted row's own transaction_id.
  const commitLog = async () => {
    try {
      await logCrud({
        userId:               approvedBy,
        performedByRole:      reqMeta.performedByRole,
        module,
        tableName,
        recordId:             inserted.id,
        action:               ACTION.CREATE,
        oldValue:             null,
        newValue:             inserted,
        approveStatus:        "approved",
        approvedBy,
        requestTransactionId: inserted.transaction_id ?? null,
        comments:             `[Approved] Created record in ${tableName} — approved by ${approvedByUsername}`,
        // Pre-snapshotted fields
        req:                  reqMeta.req,
        subscription:         reqMeta.subscription,
        ip:                   reqMeta.ip,
        latitude:             reqMeta.latitude,
        longitude:            reqMeta.longitude,
        location:             reqMeta.location,
        device_id:            reqMeta.device_id,
        device_type:          reqMeta.device_type,
        mac_address:          reqMeta.mac_address,
        computer_name:        reqMeta.computer_name,
        plant_id:             reqMeta.plant_id,
        app_version:          reqMeta.app_version,
        source:               reqMeta.source,
      });
    } catch (err) {
      console.error("applyCreate commitLog failed:", err.message);
    }
  };

  return { recordId: inserted.id, newValue: inserted, commitLog };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * applyUpdate
 *
 * UPDATEs an existing row inside an existing transaction.
 * Captures beforeRow in the same transaction for accurate diff.
 * Returns { recordId, newValue, commitLog }.
 * ───────────────────────────────────────────────────────────────────────────── */
async function applyUpdate(client, tableName, recordId, newValue, approvedBy, { approvedByUsername, module, reqMeta = {} } = {}) {
  // ── 0. Guards ────────────────────────────────────────────────────────────
  if (!/^[a-zA-Z_]+$/.test(tableName)) throw new Error("applyUpdate: invalid table name");
  if (!recordId) throw new Error("applyUpdate: recordId is required");

  // ── 1. Capture before-state (inside same transaction for consistency) ────
  let beforeRow = null;
  try {
    const beforeRes = await client.query(`SELECT * FROM ${tableName} WHERE id = $1`, [recordId]);
    beforeRow = beforeRes.rows[0] ?? null;
  } catch (_) { /* best-effort */ }

  // ── 2. Sanitise payload ──────────────────────────────────────────────────
  let data = typeof newValue === "string" ? JSON.parse(newValue) : { ...newValue };

  const forbiddenCols = ["id", "created_on", "created_by", "approved_on", "approved_by", "updated_by"];
  if (tableName !== "plant_master") delete data.plant_name;
  forbiddenCols.forEach((col) => delete data[col]);
  Object.keys(data).forEach((k) => { if (data[k] === "") data[k] = null; });

  const columns = Object.keys(data);
  if (!columns.length) throw new Error("applyUpdate: no valid columns after cleanup");

  const values      = columns.map((k) => data[k]);
  const setClauses  = columns.map((k, i) => `${k} = $${i + 1}`);

  // ── 3. Detect which optional audit columns this table actually has ────────
  const colCheck = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = $1 AND column_name = ANY($2)`,
    [tableName, ["updated_on", "approved_by"]]
  );
  const existingCols = new Set(colCheck.rows.map((r) => r.column_name));

  // ── 4. UPDATE — only append columns the table actually has ───────────────
  const extraClauses = [];
  const extraValues  = [];
  if (existingCols.has("updated_on"))  extraClauses.push("updated_on  = NOW()");
  if (existingCols.has("approved_by")) { extraClauses.push(`approved_by = $${columns.length + 1 + extraValues.length}`); extraValues.push(approvedBy); }

  const allSet = [...setClauses, ...extraClauses].join(", ");
  const recordIdPlaceholder = `$${columns.length + 1 + extraValues.length}`;

  const result = await client.query(
    `UPDATE ${tableName} SET ${allSet} WHERE id = ${recordIdPlaceholder} RETURNING *`,
    [...values, ...extraValues, recordId]
  );

  if (result.rowCount === 0) throw new Error("applyUpdate: record not found");

  const updated = result.rows[0];

  // ── 4. Build log closure ─────────────────────────────────────────────────
  const commitLog = async () => {
    try {
      await logCrud({
        userId:               approvedBy,
        performedByRole:      reqMeta.performedByRole,
        module,
        tableName,
        recordId:             updated?.id ?? recordId,
        action:               ACTION.UPDATE,
        oldValue:             beforeRow,
        newValue:             updated,
        approveStatus:        "approved",
        approvedBy,
        requestTransactionId: updated?.transaction_id ?? null,
        comments:             `[Approved] Updated record in ${tableName} — approved by ${approvedByUsername}`,
        req:                  reqMeta.req,
        subscription:         reqMeta.subscription,
        ip:                   reqMeta.ip,
        latitude:             reqMeta.latitude,
        longitude:            reqMeta.longitude,
        location:             reqMeta.location,
        device_id:            reqMeta.device_id,
        device_type:          reqMeta.device_type,
        mac_address:          reqMeta.mac_address,
        computer_name:        reqMeta.computer_name,
        plant_id:             reqMeta.plant_id,
        app_version:          reqMeta.app_version,
        source:               reqMeta.source,
      });
    } catch (err) {
      console.error("applyUpdate commitLog failed:", err.message);
    }
  };

  return { recordId: updated?.id ?? recordId, newValue: updated, commitLog };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * applyDelete
 *
 * Soft-deletes a row (status → INACTIVE) inside an existing transaction.
 * Returns { recordId, newValue, commitLog }.
 * ───────────────────────────────────────────────────────────────────────────── */
async function applyDelete(client, tableName, recordId, approvedBy, { approvedByUsername, module, reqMeta = {} } = {}) {
  // ── 0. Guards ────────────────────────────────────────────────────────────
  if (!/^[a-zA-Z_]+$/.test(tableName)) throw new Error("applyDelete: invalid table name");

  // ── 1. Capture before-state ──────────────────────────────────────────────
  let beforeRow = null;
  try {
    const beforeRes = await client.query(`SELECT * FROM ${tableName} WHERE id = $1`, [recordId]);
    beforeRow = beforeRes.rows[0] ?? null;
  } catch (_) { /* best-effort */ }

  // ── 2. Enforce soft-delete only (table must have a status column) ────────
  const statusCheck = await client.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_name = $1 AND column_name = 'status'`,
    [tableName]
  );
  if (statusCheck.rowCount === 0) {
    throw new Error(`applyDelete: soft delete not supported for "${tableName}" — no status column`);
  }

  // ── 3. Detect optional audit columns ─────────────────────────────────────
  const delColCheck = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = $1 AND column_name = ANY($2)`,
    [tableName, ["updated_on", "approved_by"]]
  );
  const delExistingCols = new Set(delColCheck.rows.map((r) => r.column_name));

  // ── 4. Soft-delete — only set columns the table has ──────────────────────
  const delSet    = ["status = 'INACTIVE'"];
  const delValues = [recordId];
  if (delExistingCols.has("updated_on"))  delSet.push("updated_on = NOW()");
  if (delExistingCols.has("approved_by")) { delSet.push(`approved_by = $${delValues.length + 1}`); delValues.push(approvedBy); }

  const result = await client.query(
    `UPDATE ${tableName} SET ${delSet.join(", ")} WHERE id = $1 RETURNING *`,
    delValues
  );

  if (result.rowCount === 0) throw new Error("applyDelete: record not found");

  const afterRow = result.rows[0];

  // ── 4. Build log closure ─────────────────────────────────────────────────
  const commitLog = async () => {
    try {
      await logCrud({
        userId:               approvedBy,
        performedByRole:      reqMeta.performedByRole,
        module,
        tableName,
        recordId:             afterRow.id,
        action:               ACTION.DELETE,
        oldValue:             beforeRow,
        newValue:             afterRow,
        approveStatus:        "approved",
        approvedBy,
        requestTransactionId: afterRow.transaction_id ?? null,
        comments:             `[Approved] Soft-deleted record in ${tableName} — approved by ${approvedByUsername}`,
        req:                  reqMeta.req,
        subscription:         reqMeta.subscription,
        ip:                   reqMeta.ip,
        latitude:             reqMeta.latitude,
        longitude:            reqMeta.longitude,
        location:             reqMeta.location,
        device_id:            reqMeta.device_id,
        device_type:          reqMeta.device_type,
        mac_address:          reqMeta.mac_address,
        computer_name:        reqMeta.computer_name,
        plant_id:             reqMeta.plant_id,
        app_version:          reqMeta.app_version,
        source:               reqMeta.source,
      });
    } catch (err) {
      console.error("applyDelete commitLog failed:", err.message);
    }
  };

  return { recordId: afterRow.id, newValue: afterRow, commitLog };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * getApprovalStats
 * ───────────────────────────────────────────────────────────────────────────── */
async function getApprovalStats(module = null) {
  let query = `
    SELECT
      COUNT(*) FILTER (WHERE status = 'PENDING')  AS pending_count,
      COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved_count,
      COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected_count,
      COUNT(*)                                    AS total_count
    FROM pending_approvals
  `;
  const vals = [];
  if (module) {
    query += " WHERE module = $1";
    vals.push(module);
  }
  const result = await pool.query(query, vals);
  return result.rows[0];
}

/* ─────────────────────────────────────────────────────────────────────────────
 * getPendingApprovals
 * ───────────────────────────────────────────────────────────────────────────── */
async function getPendingApprovals({ module, tableName, requestedBy, status = "PENDING", page = 1, perPage = 25 } = {}) {
  const wheres = [], vals = [];
  let idx = 1;
  // status filter — 'all' means no status filter; default is 'PENDING'
  if (status && status !== "all") { wheres.push(`status = $${idx++}`);       vals.push(status.toUpperCase()); }
  if (module)      { wheres.push(`module = $${idx++}`);       vals.push(module); }
  if (tableName)   { wheres.push(`table_name = $${idx++}`);   vals.push(tableName); }
  if (requestedBy) { wheres.push(`requested_by = $${idx++}`); vals.push(requestedBy); }

  const pageNum = Math.max(1, parseInt(page, 10)    || 1);
  const limit   = Math.max(1, Math.min(200, parseInt(perPage, 10) || 25));
  const offset  = (pageNum - 1) * limit;

  const whereSql = wheres.length ? `WHERE ${wheres.join(" AND ")}` : "";
  const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM pending_approvals ${whereSql}`, vals);
  const total    = countRes.rows?.[0]?.total ?? 0;

  vals.push(limit, offset);
  const dataRes = await pool.query(
    `SELECT * FROM pending_approvals ${whereSql} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    vals
  );

  return {
    meta: { total, page: pageNum, perPage: limit, pages: Math.ceil(total / limit) },
    data: dataRes.rows,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Exports
 * ───────────────────────────────────────────────────────────────────────────── */
module.exports = {
  submitForApproval,
  approveChange,
  rejectChange,
  getApprovalStats,
  getPendingApprovals,
  generateTransactionId,
  // Exposed for unit testing
  _applyCreate: applyCreate,
  _applyUpdate: applyUpdate,
  _applyDelete: applyDelete,
};