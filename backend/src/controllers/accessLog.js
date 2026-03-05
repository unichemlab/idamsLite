const pool = require("../config/db");
const { logActivity } = require("../utils/activityLogger");
const { submitForApproval } = require("../utils/masterApprovalHelper");

// Get all access logs with related data
exports.getAllAccessLogs = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
  -- Access Log core fields
  al.id,
  al.user_request_id,
  al.task_id,
  al.ritm_transaction_id,
  al.task_transaction_id,
  al.request_for_by,
  al.name,
  al.employee_code,
  al.employee_location,
  al.access_request_type,
  al.training_status,
  al.vendor_firm,
  al.vendor_code,
  al.vendor_name,
  al.vendor_allocated_id,
  al.user_request_status,
  al.task_status,
  al.reports_to,
  al.approver1_status,
  al.approver2_status,
  al.approver1_email,
  al.approver2_email,
  al.approver1_name,
  al.approver2_name,
  al.approver1_action,
  al.approver2_action,
  al.approver1_timestamp,
  al.approver2_timestamp,
  al.approver1_comments,
  al.approver2_comments,
  al.requested_role,
  al.assignment_group,
  al.assigned_to,
  al.allocated_id,
  al.role_granted,
  al.access,
  al.user_request_type,
  al.from_date,
  al.to_date,
  al.password,
  al.task_action,
  al.request_raised_by,
  al.request_raised_by_emp_code,
  al.remarks,
  al.created_on,

  -- Lookup master names
  am.display_name       AS application_name,
  dm.department_name,
  rm.role_name,
  pm.plant_name         AS location_name,

  -- From task_request: updated_on + approver timestamps formatted
  tr.updated_on         AS task_updated_on,
  TO_CHAR(tr.approver1_action_timestamp, 'DD-Mon-YYYY HH24:MI') AS approver1_action_date,
  TO_CHAR(tr.approver2_action_timestamp, 'DD-Mon-YYYY HH24:MI') AS approver2_action_date,

  -- From user_requests: completed_at
  ur.completed_at       AS request_completed_at,
    ur.created_on       AS request_created_on,
  -- Assigned user name from user_master
  um.employee_name      AS assigned_to_name

FROM access_log al

LEFT JOIN application_master am  ON al.application_equip_id = am.id
LEFT JOIN department_master  dm  ON al.department            = dm.id
LEFT JOIN role_master        rm  ON al.role                  = rm.id
LEFT JOIN plant_master       pm  ON al.location              = pm.id

LEFT JOIN task_requests       tr  ON al.task_id               = tr.id
LEFT JOIN user_requests      ur  ON al.user_request_id       = ur.id

LEFT JOIN user_master        um  ON al.assigned_to           = um.id

ORDER BY al.created_on DESC;
`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching access logs:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get single access log by ID
exports.getAccessLogById = async (req, res) => {
  console.log("request params",req.params);
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT 
        al.*,
        am.display_name as application_name,
        dm.department_name,
        rm.role_name,
        pm.plant_name as location_name
      FROM access_log al
      LEFT JOIN application_master am ON al.application_equip_id = am.id
      LEFT JOIN department_master dm ON al.department = dm.id
      LEFT JOIN role_master rm ON al.role = rm.id
      LEFT JOIN plant_master pm ON al.location = pm.id
      WHERE al.id = $1`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Access log not found" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching access log:", err);
    res.status(500).json({ error: err.message });
  }
};


// Get data of vendor firm
// Supports optional query params: plant, department, application
// Returns one entry per allocated_id, with all roles from the latest user_request_id grouped together.
exports.getAccessLogByFirm = async (req, res) => {
  const { vendor_firm } = req.params;
  const { plant, department, application } = req.query;

  try {
    const conditions = [
      `al.vendor_firm = $1`,
      `al.task_status = 'Closed'`,
      `al.request_for_by = 'Vendor / OEM'`,
    ];
    const values = [vendor_firm];
    let idx = 2;

    if (plant) {
      conditions.push(`al.location = $${idx++}`);
      values.push(plant);
    }
    if (department) {
      conditions.push(`al.department = $${idx++}`);
      values.push(department);
    }
    if (application) {
      conditions.push(`al.application_equip_id = $${idx++}`);
      values.push(application);
    }

    const { rows } = await pool.query(
      `SELECT 
        al.*,
        am.display_name as application_name,
        dm.department_name,
        rm.role_name,
        pm.plant_name as location_name
      FROM access_log al
      LEFT JOIN application_master am ON al.application_equip_id = am.id
      LEFT JOIN department_master dm ON al.department = dm.id
      LEFT JOIN role_master rm ON al.role = rm.id
      LEFT JOIN plant_master pm ON al.location = pm.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY al.vendor_allocated_id, al.user_request_id DESC, al.id DESC`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "No closed access logs found for this vendor firm"
      });
    }

    // Group by vendor_allocated_id → pick the latest user_request_id per allocated ID
    // then collect ALL roles from that latest request.
    const latestRequestPerAllocId = {};
    for (const row of rows) {
      const key = row.vendor_allocated_id;
      if (!latestRequestPerAllocId[key]) {
        // First occurrence is the latest (rows sorted DESC by user_request_id)
        latestRequestPerAllocId[key] = {
          latestRequestId: row.user_request_id,
          rows: [],
        };
      }
      // Only collect rows belonging to the latest request for this allocated ID
      if (row.user_request_id === latestRequestPerAllocId[key].latestRequestId) {
        latestRequestPerAllocId[key].rows.push(row);
      }
    }

    // Build one response entry per allocated_id:
    // - Use first row for all scalar fields (vendor_name, vendor_code, location, etc.)
    // - Collect role IDs and role names from all rows of the latest request
    const grouped = Object.values(latestRequestPerAllocId).map(({ rows: groupRows }) => {
      const base = groupRows[0];
      const roles = groupRows
        .map(r => ({ role_id: r.role, role_name: r.role_name }))
        .filter(r => r.role_id !== null && r.role_id !== undefined);

      return {
        ...base,
        // roles array — all roles granted in the latest request
        roles,
        // keep legacy `role` as the first role for backward compatibility
        role: roles[0]?.role_id ?? base.role,
        role_name: roles[0]?.role_name ?? base.role_name,
      };
    });

    res.json(grouped);
  } catch (err) {
    console.error("Error fetching access logs by firm:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get activity logs for access log module
exports.getAccessLogActivityLogs = async (req, res) => {
  try {
    const { rows: rawRows } = await pool.query(
      `SELECT * FROM activity_log
       WHERE table_name = 'access_log'
          OR (details IS NOT NULL AND details LIKE '%"tableName":"access_log"%')
       ORDER BY COALESCE(date_time_ist, NOW()) DESC`
    );

    const rows = rawRows.map((r) => {
      if (r.details) {
        try {
          const parsed = JSON.parse(r.details);
          r.table_name = r.table_name || parsed.tableName || r.table_name;
          r.old_value =
            r.old_value ||
            (parsed.old_value ? JSON.stringify(parsed.old_value) : null);
          r.new_value =
            r.new_value ||
            (parsed.new_value ? JSON.stringify(parsed.new_value) : null);
          r.action = r.action || parsed.action || r.action;
          r.action_performed_by =
            r.action_performed_by || r.user_id || parsed.userId || null;
        } catch (e) {
          // ignore parse errors
        }
      }
      return r;
    });

    res.json(rows);
  } catch (err) {
    console.error("Error fetching access log activity logs:", err);
    res.status(500).json({ error: err.message });
  }
};

// Create new access log
exports.createAccessLog = async (req, res) => {
  const {
    user_request_id,
    task_id,
    ritm_transaction_id,
    task_transaction_id,
    request_for_by,
    name,
    employee_code,
    employee_location,
    access_request_type,
    training_status,
    vendor_firm,
    vendor_code,
    vendor_name,
    vendor_allocated_id,
    user_request_status,
    task_status,
    application_equip_id,
    department,
    role,
    location,
    reports_to,
    approver1_status,
    approver2_status,
    approver1_email,
    approver2_email,
    remarks,
    approver1_name,
    approver2_name
  } = req.body;

  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const newAccessLogData = {
      user_request_id,
      task_id,
      ritm_transaction_id,
      task_transaction_id,
      request_for_by,
      name,
      employee_code,
      employee_location,
      access_request_type,
      training_status,
      vendor_firm,
      vendor_code,
      vendor_name,
      vendor_allocated_id,
      user_request_status: user_request_status || "Pending",
      task_status: task_status || "Pending",
      application_equip_id,
      department,
      role,
      location,
      reports_to,
      approver1_status: approver1_status || "Pending",
      approver2_status: approver2_status || "Pending",
      approver1_email,
      approver2_email,
      remarks,
      approver1_name,
      approver2_name
    };

    // Submit for approval instead of direct creation
    const approvalId = await submitForApproval({
      module: "access_log",
      tableName: "access_log",
      action: "create",
      recordId: null,
      oldValue: null,
      newValue: newAccessLogData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Create new access log: ${ritm_transaction_id}`,
    });

    if (approvalId === null) {
      // Approval not required, create directly
      const { rows } = await pool.query(
        `INSERT INTO access_log (
          user_request_id, task_id, ritm_transaction_id, task_transaction_id,
          request_for_by, name, employee_code, employee_location, access_request_type,
          training_status, vendor_firm, vendor_code, vendor_name, vendor_allocated_id,
          user_request_status, task_status, application_equip_id, department, role, location,
          reports_to, approver1_status, approver2_status, approver1_email, approver2_email,
          remarks, approver1_name, approver2_name
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28
        ) RETURNING *`,
        [
          user_request_id, task_id, ritm_transaction_id, task_transaction_id,
          request_for_by, name, employee_code, employee_location, access_request_type,
          training_status, vendor_firm, vendor_code, vendor_name, vendor_allocated_id,
          user_request_status || "Pending", task_status || "Pending", 
          application_equip_id, department, role, location,
          reports_to, approver1_status || "Pending", approver2_status || "Pending", 
          approver1_email, approver2_email, remarks, approver1_name, approver2_name
        ]
      );

      // Log creation activity
      try {
        await logActivity({
          userId,
          module: "access_log",
          tableName: "access_log",
          recordId: rows[0].id,
          action: "create",
          oldValue: null,
          newValue: rows[0],
          comments: `Created access log: ${ritm_transaction_id}`,
          reqMeta: req._meta || {},
        });
      } catch (logErr) {
        console.warn("Activity log failed:", logErr.message);
      }

      return res.status(201).json(rows[0]);
    }

    // Return approval pending response
    res.status(202).json({
      message: "Access log creation submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: newAccessLogData,
    });
  } catch (err) {
    console.error("Error creating access log:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update access log
exports.updateAccessLog = async (req, res) => {
  const { id } = req.params;
  const {
    user_request_id,
    task_id,
    ritm_transaction_id,
    task_transaction_id,
    request_for_by,
    name,
    employee_code,
    employee_location,
    access_request_type,
    training_status,
    vendor_firm,
    vendor_code,
    vendor_name,
    vendor_allocated_id,
    user_request_status,
    task_status,
    application_equip_id,
    department,
    role,
    location,
    reports_to,
    approver1_status,
    approver2_status,
    approver1_email,
    approver2_email,
    remarks,
    approver1_name,
    approver2_name,
    approver1_action,
    approver2_action,
    approver1_timestamp,
    approver2_timestamp,
    approver1_comments,
    approver2_comments,
    completed_at
  } = req.body;

  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    // Fetch old value
    const oldRes = await pool.query(
      "SELECT * FROM access_log WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0] || null;

    if (!oldValue) {
      return res.status(404).json({ error: "Access log not found" });
    }

    const updatedAccessLogData = {
      user_request_id,
      task_id,
      ritm_transaction_id,
      task_transaction_id,
      request_for_by,
      name,
      employee_code,
      employee_location,
      access_request_type,
      training_status,
      vendor_firm,
      vendor_code,
      vendor_name,
      vendor_allocated_id,
      user_request_status,
      task_status,
      application_equip_id,
      department,
      role,
      location,
      reports_to,
      approver1_status,
      approver2_status,
      approver1_email,
      approver2_email,
      remarks,
      approver1_name,
      approver2_name,
      approver1_action,
      approver2_action,
      approver1_timestamp,
      approver2_timestamp,
      approver1_comments,
      approver2_comments,
      completed_at
    };

    // Submit for approval instead of direct update
    const approvalId = await submitForApproval({
      module: "access_log",
      tableName: "access_log",
      action: "update",
      recordId: parseInt(id),
      oldValue,
      newValue: updatedAccessLogData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Update access log: ${ritm_transaction_id}`,
    });

    if (approvalId === null) {
      // Approval not required, update directly
      const { rows } = await pool.query(
        `UPDATE access_log SET 
          user_request_id=$1, task_id=$2, ritm_transaction_id=$3, task_transaction_id=$4,
          request_for_by=$5, name=$6, employee_code=$7, employee_location=$8, access_request_type=$9,
          training_status=$10, vendor_firm=$11, vendor_code=$12, vendor_name=$13, vendor_allocated_id=$14,
          user_request_status=$15, task_status=$16, application_equip_id=$17, department=$18, role=$19, location=$20,
          reports_to=$21, approver1_status=$22, approver2_status=$23, approver1_email=$24, approver2_email=$25,
          remarks=$26, approver1_name=$27, approver2_name=$28, approver1_action=$29, approver2_action=$30,
          approver1_timestamp=$31, approver2_timestamp=$32, approver1_comments=$33, approver2_comments=$34,
          completed_at=$35, updated_on=NOW()
        WHERE id=$36 RETURNING *`,
        [
          user_request_id, task_id, ritm_transaction_id, task_transaction_id,
          request_for_by, name, employee_code, employee_location, access_request_type,
          training_status, vendor_firm, vendor_code, vendor_name, vendor_allocated_id,
          user_request_status, task_status, application_equip_id, department, role, location,
          reports_to, approver1_status, approver2_status, approver1_email, approver2_email,
          remarks, approver1_name, approver2_name, approver1_action, approver2_action,
          approver1_timestamp, approver2_timestamp, approver1_comments, approver2_comments,
          completed_at, id
        ]
      );

      // Log update activity
      try {
        await logActivity({
          userId,
          module: "access_log",
          tableName: "access_log",
          recordId: id,
          action: "update",
          oldValue,
          newValue: rows[0],
          comments: `Updated access log: ${ritm_transaction_id}`,
          reqMeta: req._meta || {},
        });
      } catch (logErr) {
        console.warn("Activity log failed:", logErr.message);
      }

      return res.json(rows[0]);
    }

    // Return approval pending response
    res.status(202).json({
      message: "Access log update submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: updatedAccessLogData,
    });
  } catch (err) {
    console.error("Error updating access log:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete access log
exports.deleteAccessLog = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    // Fetch old value first
    const oldRes = await pool.query(
      "SELECT * FROM access_log WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0] || null;

    if (!oldValue) {
      return res.status(404).json({ error: "Access log not found" });
    }

    // Submit for approval instead of direct deletion
    const approvalId = await submitForApproval({
      module: "access_log",
      tableName: "access_log",
      action: "delete",
      recordId: parseInt(id),
      oldValue,
      newValue: null,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Delete access log: ${oldValue.ritm_transaction_id}`,
    });

    if (approvalId === null) {
      // Approval not required, delete directly
      await pool.query("DELETE FROM access_log WHERE id=$1", [id]);

      // Log deletion activity
      try {
        await logActivity({
          userId,
          module: "access_log",
          tableName: "access_log",
          recordId: id,
          action: "delete",
          oldValue,
          newValue: null,
          comments: `Deleted access log id: ${id}`,
          reqMeta: req._meta || {},
        });
      } catch (logErr) {
        console.warn("Activity log failed:", logErr.message);
      }

      return res.status(204).end();
    }

    // Return approval pending response
    res.status(202).json({
      message: "Access log deletion submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: oldValue,
    });
  } catch (err) {
    console.error("Error deleting access log:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update approver status
exports.updateApproverStatus = async (req, res) => {
  const { id } = req.params;
  const { approver_level, status, comments } = req.body; // approver_level: 1 or 2
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const oldRes = await pool.query("SELECT * FROM access_log WHERE id=$1", [id]);
    const oldValue = oldRes.rows[0];

    if (!oldValue) {
      return res.status(404).json({ error: "Access log not found" });
    }

    let updateQuery, params;
    
    if (approver_level === 1) {
      updateQuery = `
        UPDATE access_log 
        SET approver1_status=$1, approver1_action=$2, approver1_timestamp=NOW(), 
            approver1_comments=$3, updated_on=NOW()
        WHERE id=$4 RETURNING *`;
      params = [status, status, comments, id];
    } else {
      updateQuery = `
        UPDATE access_log 
        SET approver2_status=$1, approver2_action=$2, approver2_timestamp=NOW(), 
            approver2_comments=$3, updated_on=NOW()
        WHERE id=$4 RETURNING *`;
      params = [status, status, comments, id];
    }

    const { rows } = await pool.query(updateQuery, params);

    // Log approval activity
    try {
      await logActivity({
        userId,
        module: "access_log",
        tableName: "access_log",
        recordId: id,
        action: `approver${approver_level}_${status.toLowerCase()}`,
        oldValue,
        newValue: rows[0],
        comments: `Approver ${approver_level} ${status}: ${comments || 'No comments'}`,
        reqMeta: req._meta || {},
      });
    } catch (logErr) {
      console.warn("Activity log failed:", logErr.message);
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error updating approver status:", err);
    res.status(500).json({ error: err.message });
  }
};

// exports.checkAccessLogConflict = async (req, res) => {
//   const { applicationId,request_for_by,name,vendor_name,plant_location,department,accessType } = req.body;

//   try {
//     const appIds = Array.isArray(applicationId)
//       ? applicationId
//       : [applicationId];
//  const inFlightParams =
//         request_for_by === "Vendor / OEM"
//           ? [plant_location, department, appIds, vendor_name]
//           : [plant_location, department, appIds, name];
//     const { rows } = await pool.query(
//       `
//       SELECT
//         MAX(CASE WHEN task_status = 'Closed' THEN 1 ELSE 0 END) AS exists,
//         MAX(CASE WHEN task_status IN ('Pending','In Progress','Approved') THEN 1 ELSE 0 END) AS task_not_closed
//       FROM access_log
//       WHERE location = $1
//         AND department = $2
//         AND application_equip_id = ANY($3)
//         AND ${
//             request_for_by === "Vendor / OEM"
//               ? "vendor_name = $4"
//               : "name = $4"
//           }
//       `,
//       inFlightParams
//     );

//     res.json({
//       exists: rows[0]?.exists === 1,
//       taskNotClosed: rows[0]?.task_not_closed === 1,
//     });
//   } catch (err) {
//     console.error("Access log validation error:", err);
//     res.status(500).json({ error: "Validation failed" });
//   }
// };

/**
 * RULE 2: Check Access Log for Modify Access
 * RULE 3: Check Access Log for New User Creation
 * 
 * Checks: Plant + Department + Application (Display Name) + task_status
 */
// exports.checkAccessLogConflict = async (req, res) => {
//   const { 
//     applicationId, 
//     request_for_by, 
//     name, 
//     vendor_name, 
//     plant_location, 
//     department, 
//     accessType 
//   } = req.body;

//   console.log("[RULE 2/3 - ACCESS LOG CHECK]", {
//     request_for_by,
//     name: name || vendor_name,
//     plant_location,
//     department,
//     applicationId,
//     accessType
//   });

//   try {
//     const appIds = Array.isArray(applicationId) ? applicationId : [applicationId];
//     const isVendor = request_for_by === "Vendor / OEM";

//     const params = [plant_location, department, appIds];
//     if (isVendor) {
//       params.push(vendor_name);
//     } else {
//       params.push(name);
//     }

//     // Check access_log for existing records
//     const query = `
//       SELECT
//         COUNT(*) FILTER (WHERE task_status = 'Closed') AS closed_count,
//         COUNT(*) FILTER (WHERE task_status IN ('Pending','In Progress','Approved')) AS active_count,
//         COUNT(*) AS total_count,
//         MAX(CASE WHEN task_status = 'Closed' THEN 1 ELSE 0 END) AS has_closed,
//         MAX(CASE WHEN task_status IN ('Pending','In Progress','Approved') THEN 1 ELSE 0 END) AS has_active,
//         STRING_AGG(DISTINCT app.display_name, ', ') AS application_names
//       FROM access_log al
//       LEFT JOIN application_master app ON al.application_equip_id::text = app.id::text
//       WHERE al.location::text = $1::text
//         AND al.department::text = $2::text
//         AND al.application_equip_id::text = ANY($3::text[])
//         AND ${isVendor 
//           ? "LOWER(TRIM(al.vendor_name)) = LOWER(TRIM($4))" 
//           : "LOWER(TRIM(al.name)) = LOWER(TRIM($4))"
//         }
//     `;

//     const { rows } = await pool.query(query, params);
//     console.log("access log active user",  query);
//     const result = {
//       exists: rows[0]?.has_closed === 1,              // Has closed access
//       taskNotClosed: rows[0]?.has_active === 1,       // Has active/unclosed tasks
//       closedCount: parseInt(rows[0]?.closed_count || '0', 10),
//       activeCount: parseInt(rows[0]?.active_count || '0', 10),
//       totalCount: parseInt(rows[0]?.total_count || '0', 10),
//       applicationNames: rows[0]?.application_names || ''
//     };

//     // Apply rules based on access type
//     let ruleViolation = null;

//     // RULE 2: Modify Access requires existing closed access
//     if (accessType === "Modify Access") {
//       if (!result.exists) {
//         ruleViolation = {
//           rule: "RULE_2",
//           message: "Cannot modify access - No existing closed access found in Access Log for this combination."
//         };
//       } else if (result.taskNotClosed) {
//         ruleViolation = {
//           rule: "RULE_4",
//           message: "Cannot modify access - An active/unclosed task already exists. Please wait for it to complete."
//         };
//       }
//     }

//     // RULE 3: New User Creation blocked if access exists
//     if (accessType === "New User Creation" || accessType === "Bulk New User Creation") {
//       if (result.exists) {
//         ruleViolation = {
//           rule: "RULE_3",
//           message: "Duplicate request not allowed - Access already exists in Access Log for this combination."
//         };
//       } else if (result.taskNotClosed) {
//         ruleViolation = {
//           rule: "RULE_4",
//           message: "Duplicate request not allowed - An active/unclosed task already exists."
//         };
//       }
//     }

//     // Other access types - just check for active tasks
//     if (!["Modify Access", "New User Creation", "Bulk New User Creation"].includes(accessType)) {
//       if (result.taskNotClosed) {
//         ruleViolation = {
//           rule: "RULE_4",
//           message: "Cannot proceed - An active/unclosed task already exists for this combination."
//         };
//       }
//     }

//     console.log("[RULE 2/3] Result:", {
//       ...result,
//       ruleViolation: ruleViolation ? ruleViolation.rule : "PASS"
//     });

//     res.json({
//       ...result,
//       conflict: !!ruleViolation,
//       ...ruleViolation
//     });

//   } catch (err) {
//     console.error("[RULE 2/3] ERROR:", err);
//     res.status(500).json({ error: "Validation failed", details: err.message });
//   }
// };


// exports.getAccessLogsByUser = async (req, res) => {
//   const {
//     employee_code,
//     plant,
//     department,
//     application,
//     name = ""
//   } = req.query;

//   if (!employee_code || !plant || !department) {
//     return res.status(400).json({
//       success: false,
//       message: "Missing required query parameters"
//     });
//   }

//   try {
//     const query = `
//       SELECT 
//         al.id AS access_log_id,
//         al.vendor_name,
//         al.vendor_allocated_id,
//         al.application_equip_id,
//         al.department,
//         al.location,
//         al.role,
//         al.task_status,
//         app.display_name AS application_name,
//         d.department_name,
//         p.plant_name,
//         r.role_name
//       FROM access_log al
//       LEFT JOIN application_master app 
//         ON al.application_equip_id::text = app.id::text
//       LEFT JOIN department_master d 
//         ON al.department::text = d.id::text
//       LEFT JOIN plant_master p 
//         ON al.location::text = p.id::text
//       LEFT JOIN role_master r 
//         ON al.role::text = r.id::text
//       WHERE al.location::text = $1::text
//         AND al.department::text = $2::text
//         AND al.employee_code ILIKE $3
//         AND ($4::text IS NULL OR al.application_equip_id::text = $4::text)
//       ORDER BY al.id DESC
//     `;

//     const values = [
//       plant,
//       department,
//       `%${employee_code}%`,
//       application || null
//     ];

//     const { rows } = await pool.query(query, values);

//     return res.status(200).json({
//       success: true,
//       count: rows.length,
//       data: rows
//     });
//   } catch (error) {
//     console.error("ACCESS LOG FETCH ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch access logs"
//     });
//   }
// };

// In your API route
// exports.getAllActiveUserLogs = async (req, res) => {
//   console.log("=== DEBUG START ===");
//   console.log("Full URL:", req.originalUrl);
//   console.log("Query params:", req.query);
//   console.log("plant_id:", req.query.plant_id, "Type:", typeof req.query.plant_id);
//   console.log("department_id:", req.query.department_id, "Type:", typeof req.query.department_id);
//   console.log("application_id:", req.query.application_id, "Type:", typeof req.query.application_id);
//   console.log("=== DEBUG END ===");

//   const { plant_id, department_id, application_id, page = 1, limit = 10, search, value } = req.query;

//   // Validation - check if required parameters are present
//   if (!plant_id || !department_id || !application_id) {
//     console.log("❌ Validation failed - missing params");
//     return res.status(400).json({ 
//       success: false, 
//       message: "Missing required query parameters: plant_id, department_id, application_id",
//       received: { plant_id, department_id, application_id }
//     });
//   }

//   console.log("✅ Validation passed");

//   try {
//     let query = `
//       SELECT DISTINCT ON (
//         CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_name ELSE al.name END,
//         CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_code ELSE al.employee_code END,
//         al.location,
//         al.department,
//         al.application_equip_id,
//         al.role
//       )
//         al.*,
//         tc.assigned_to,
//         tc.allocated_id,
//         tc.ritm_number,
//         tc.task_number,
//         am.display_name AS application_name,
//         dm.department_name,
//         rm.role_name,
//         pm.plant_name AS location_name,
//         um.employee_name AS assigned_to_name

//       FROM access_log al

//       LEFT JOIN application_master am ON al.application_equip_id = am.id
//       LEFT JOIN department_master dm ON al.department = dm.id
//       LEFT JOIN role_master rm ON al.role = rm.id
//       LEFT JOIN plant_master pm ON al.location = pm.id

//       LEFT JOIN task_closure tc 
//         ON al.task_transaction_id = tc.task_number
//         AND al.ritm_transaction_id = tc.ritm_number

//       LEFT JOIN user_master um 
//         ON tc.assigned_to = um.id

//       WHERE al.location = $1 
//         AND al.department = $2 
//         AND al.application_equip_id = $3
//     `;

//     const params = [plant_id, department_id, application_id];
//     let paramIndex = 4;

//     // Add search filter if provided
//     if (search && value) {
//       query += ` AND al.${search} ILIKE $${paramIndex}`;
//       params.push(`%${value}%`);
//       paramIndex++;
//     }

//     query += `
//       ORDER BY 
//         CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_name ELSE al.name END,
//         CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_code ELSE al.employee_code END,
//         al.location,
//         al.department,
//         al.application_equip_id,
//         al.role,
//         al.id DESC
//     `;

//     // Add pagination
//     const offset = (parseInt(page) - 1) * parseInt(limit);
//     query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
//     params.push(parseInt(limit), offset);

//     console.log("📊 Executing query with params:", params);

//     const result = await pool.query(query, params);
    
//     console.log("✅ Query successful, rows returned:", result.rows.length);

//     res.json({
//       success: true,
//       data: result.rows,
//       total: result.rows.length,
//       page: parseInt(page),
//       limit: parseInt(limit)
//     });
    
//   } catch (error) {
//     console.error('❌ Error fetching access logs:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to fetch access logs',
//       message: error.message 
//     });
//   }
// };

exports.checkAccessLogConflict = async (req, res) => {
  const { 
    applicationId, 
    request_for_by, 
    name, 
    employee_code,
    vendor_name, 
    plant_location, 
    department, 
    accessType 
  } = req.body;

  console.log("[RULE 2/3 - ACCESS LOG CHECK]", {
    request_for_by,
    name: name || vendor_name,
    employee_code,
    plant_location,
    department,
    applicationId,
    accessType
  });

  try {
    const appIds = Array.isArray(applicationId) ? applicationId : [applicationId];
    const isVendor = request_for_by === "Vendor / OEM";

    let query;
    let params;

    if (isVendor) {
      // Vendor: match on vendor_name only
      params = [plant_location, department, appIds, vendor_name];
      query = `
        SELECT
          COUNT(*) FILTER (WHERE task_status = 'Closed') AS closed_count,
          COUNT(*) FILTER (WHERE task_status IN ('Pending','In Progress','Approved')) AS active_count,
          COUNT(*) AS total_count,
          MAX(CASE WHEN task_status = 'Closed' THEN 1 ELSE 0 END) AS has_closed,
          MAX(CASE WHEN task_status IN ('Pending','In Progress','Approved') THEN 1 ELSE 0 END) AS has_active,
          STRING_AGG(DISTINCT app.display_name, ', ') AS application_names
        FROM access_log al
        LEFT JOIN application_master app ON al.application_equip_id::text = app.id::text
        WHERE al.location::text = $1::text
          AND al.department::text = $2::text
          AND al.application_equip_id::text = ANY($3::text[])
          AND LOWER(TRIM(al.vendor_name)) = LOWER(TRIM($4))
      `;
    } else {
      // Self / Others: match on name + employee_code, exclude vendor rows
      params = [plant_location, department, appIds, name, employee_code];
      query = `
        SELECT
          COUNT(*) FILTER (WHERE task_status = 'Closed') AS closed_count,
          COUNT(*) FILTER (WHERE task_status IN ('Pending','In Progress','Approved')) AS active_count,
          COUNT(*) AS total_count,
          MAX(CASE WHEN task_status = 'Closed' THEN 1 ELSE 0 END) AS has_closed,
          MAX(CASE WHEN task_status IN ('Pending','In Progress','Approved') THEN 1 ELSE 0 END) AS has_active,
          STRING_AGG(DISTINCT app.display_name, ', ') AS application_names
        FROM access_log al
        LEFT JOIN application_master app ON al.application_equip_id::text = app.id::text
        WHERE al.location::text = $1::text
          AND al.department::text = $2::text
          AND al.application_equip_id::text = ANY($3::text[])
          AND LOWER(TRIM(al.name)) = LOWER(TRIM($4))
          AND LOWER(TRIM(al.employee_code::text)) = LOWER(TRIM($5::text))
          AND LOWER(TRIM(al.request_for_by)) != 'vendor / oem'
      `;
    }

    const { rows } = await pool.query(query, params);
    const result = {
      exists: rows[0]?.has_closed === 1,
      taskNotClosed: rows[0]?.has_active === 1,
      closedCount: parseInt(rows[0]?.closed_count || '0', 10),
      activeCount: parseInt(rows[0]?.active_count || '0', 10),
      totalCount: parseInt(rows[0]?.total_count || '0', 10),
      applicationNames: rows[0]?.application_names || ''
    };

    // Apply rules based on access type
    let ruleViolation = null;

    // RULE 2: Modify Access requires existing closed access
    if (accessType === "Modify Access") {
      if (!result.exists) {
        ruleViolation = {
          rule: "RULE_2",
          message: "Cannot modify access - No existing closed access found in Access Log for this combination."
        };
      } else if (result.taskNotClosed) {
        ruleViolation = {
          rule: "RULE_4",
          message: "Cannot modify access - An active/unclosed task already exists. Please wait for it to complete."
        };
      }
    }

    // RULE 3: New User Creation blocked if access exists
    if (accessType === "New User Creation" || accessType === "Bulk New User Creation") {
      if (result.exists) {
        ruleViolation = {
          rule: "RULE_3",
          message: "Duplicate request not allowed - Access already exists in Access Log for this combination."
        };
      } else if (result.taskNotClosed) {
        ruleViolation = {
          rule: "RULE_4",
          message: "Duplicate request not allowed - An active/unclosed task already exists."
        };
      }
    }

    // Other access types - just check for active tasks
    if (!["Modify Access", "New User Creation", "Bulk New User Creation"].includes(accessType)) {
      if (result.taskNotClosed) {
        ruleViolation = {
          rule: "RULE_4",
          message: "Cannot proceed - An active/unclosed task already exists for this combination."
        };
      }
    }

    console.log("[RULE 2/3] Result:", {
      ...result,
      ruleViolation: ruleViolation ? ruleViolation.rule : "PASS"
    });

    res.json({
      ...result,
      conflict: !!ruleViolation,
      ...ruleViolation
    });

  } catch (err) {
    console.error("[RULE 2/3] ERROR:", err);
    res.status(500).json({ error: "Validation failed", details: err.message });
  }
};


// coment on 4 march 2026
// exports.getAllActiveUserLogs = async (req, res) => {
//   console.log("=== DEBUG START ===");
//   console.log("Full URL:", req.originalUrl);
//   console.log("Query params:", req.query);
//   console.log("plant_id:", req.query.plant_id, "Type:", typeof req.query.plant_id);
//   console.log("department_id:", req.query.department_id, "Type:", typeof req.query.department_id);
//   console.log("application_id:", req.query.application_id, "Type:", typeof req.query.application_id);
//   console.log("=== DEBUG END ===");

//   const { plant_id, department_id, application_id, page = 1, limit = 10, search, value } = req.query;

//   // Validation - check if required parameters are present
//   if (!plant_id || !department_id || !application_id) {
//     console.log("❌ Validation failed - missing params");
//     return res.status(400).json({
//       success: false,
//       message: "Missing required query parameters: plant_id, department_id, application_id",
//       received: { plant_id, department_id, application_id }
//     });
//   }

//   console.log("✅ Validation passed");

//   try {
//     // Use a CTE to determine query type based on latest entries per user+location+dept+app
//     let query = `
//       WITH latest_entries AS (
//         SELECT DISTINCT ON (
//           CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_name ELSE al.name END,
//           CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_code ELSE al.employee_code END,
//           al.location,
//           al.department,
//           al.application_equip_id
//         )
//           CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_name ELSE al.name END AS user_name,
//           CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_code ELSE al.employee_code END AS user_code,
//           al.location,
//           al.department,
//           al.application_equip_id,
//            al.request_raised_by,
//           al.request_raised_by_emp_code,
//           al.access_request_type
//         FROM access_log al
//         WHERE al.location             = $1
//           AND al.department           = $2
//           AND al.application_equip_id = $3
//           AND (al.task_status != 'Revoked' OR al.task_status IS NULL)
//         ORDER BY
//           CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_name ELSE al.name END,
//           CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_code ELSE al.employee_code END,
//           al.location,
//           al.department,
//           al.application_equip_id,
//           al.id DESC
//       ),

//       regular_users AS (
//         SELECT DISTINCT ON (
//           CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_name ELSE al.name END,
//           CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_code ELSE al.employee_code END,
//           al.location,
//           al.department,
//           al.application_equip_id,
//           al.role
//         )
//           al.id,
//           al.user_request_id,
//           al.task_id,
//           al.ritm_transaction_id,
//           al.task_transaction_id,
//           al.request_for_by,
//           al.request_raised_by,
//           al.request_raised_by_emp_code,
//           al.name,
//           al.employee_code,
//           al.employee_location,
//           al.access_request_type,
//           al.training_status,
//           al.vendor_firm,
//           al.vendor_code,
//           al.vendor_name,
//           al.vendor_allocated_id,
//           al.user_request_status,
//           al.task_status,
//           al.application_equip_id,
//           al.department,
//           al.role,
//           al.location,
//           al.reports_to,
//           al.approver1_status,
//           al.approver2_status,
//           al.approver1_email,
//           al.approver2_email,
//           al.created_on,
//           al.updated_on,
//           al.completed_at,
//           al.remarks,
//           al.approver1_name,
//           al.approver2_name,
//           al.approver1_action,
//           al.approver2_action,
//           al.approver1_timestamp,
//           al.approver2_timestamp,
//           al.approver1_comments,
//           al.approver2_comments,
//           al.requested_role,
//           al.allocated_id,
//           al.role_granted,
//           al.access,
//           al.user_request_type,
//           al.from_date,
//           al.to_date,
//           al.password,
//           al.task_action,
//           tc.assigned_to,
//           tc.assignment_group,
//           tc.ritm_number,
//           tc.task_number,
//           am.display_name  AS application_name,
//           dm.department_name,
//           rm.role_name,
//           pm.plant_name    AS location_name,
//           um.employee_name AS assigned_to_name
//         FROM access_log al
//         LEFT JOIN application_master am  ON al.application_equip_id = am.id
//         LEFT JOIN department_master  dm  ON al.department            = dm.id
//         LEFT JOIN role_master        rm  ON al.role                  = rm.id
//         LEFT JOIN plant_master       pm  ON al.location              = pm.id
//         LEFT JOIN task_closure       tc  ON al.task_transaction_id   = tc.task_number
//                                         AND al.ritm_transaction_id   = tc.ritm_number
//         LEFT JOIN user_master        um  ON tc.assigned_to           = um.id
//         INNER JOIN latest_entries le ON
//           (CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_name ELSE al.name END) = le.user_name
//           AND (CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_code ELSE al.employee_code END) = le.user_code
//           AND al.location             = le.location
//           AND al.department           = le.department
//           AND al.application_equip_id = le.application_equip_id
//         WHERE al.location             = $1
//           AND al.department           = $2
//           AND al.application_equip_id = $3
//           AND le.access_request_type != 'Modify Access'
//           AND (al.task_status != 'Revoked' OR al.task_status IS NULL)
//           AND (LOWER(al.access) = 'granted' OR al.access IS NULL)
//         ORDER BY
//           CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_name ELSE al.name END,
//           CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_code ELSE al.employee_code END,
//           al.location,
//           al.department,
//           al.application_equip_id,
//           al.role,
//           al.id DESC
//       ),

//       modification_users AS (
//         SELECT DISTINCT ON (
//           CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_name ELSE al.name END,
//           CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_code ELSE al.employee_code END,
//           al.location,
//           al.department,
//           al.application_equip_id,
//           al.role
//         )
//           al.id,
//           al.user_request_id,
//           al.task_id,
//           al.ritm_transaction_id,
//           al.task_transaction_id,
//           al.request_for_by,
//           al.request_raised_by,
//           al.request_raised_by_emp_code,
//           al.name,
//           al.employee_code,
//           al.employee_location,
//           al.access_request_type,
//           al.training_status,
//           al.vendor_firm,
//           al.vendor_code,
//           al.vendor_name,
//           al.vendor_allocated_id,
//           al.user_request_status,
//           al.task_status,
//           al.application_equip_id,
//           al.department,
//           al.role,
//           al.location,
//           al.reports_to,
//           al.approver1_status,
//           al.approver2_status,
//           al.approver1_email,
//           al.approver2_email,
//           al.created_on,
//           al.updated_on,
//           al.completed_at,
//           al.remarks,
//           al.approver1_name,
//           al.approver2_name,
//           al.approver1_action,
//           al.approver2_action,
//           al.approver1_timestamp,
//           al.approver2_timestamp,
//           al.approver1_comments,
//           al.approver2_comments,
//           al.requested_role,
//           al.allocated_id,
//           al.role_granted,
//           al.access,
//           al.user_request_type,
//           al.from_date,
//           al.to_date,
//           al.password,
//           al.task_action,
//           tc.assigned_to,
//           tc.assignment_group,
//           tc.ritm_number,
//           tc.task_number,
//           am.display_name  AS application_name,
//           dm.department_name,
//           rm.role_name,
//           pm.plant_name    AS location_name,
//           um.employee_name AS assigned_to_name
//         FROM access_log al
//         LEFT JOIN application_master am  ON al.application_equip_id = am.id
//         LEFT JOIN department_master  dm  ON al.department            = dm.id
//         LEFT JOIN role_master        rm  ON al.role                  = rm.id
//         LEFT JOIN plant_master       pm  ON al.location              = pm.id
//         LEFT JOIN task_closure       tc  ON al.task_transaction_id   = tc.task_number
//                                         AND al.ritm_transaction_id   = tc.ritm_number
//         LEFT JOIN user_master        um  ON tc.assigned_to           = um.id
//         INNER JOIN latest_entries le ON
//           (CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_name ELSE al.name END) = le.user_name
//           AND (CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_code ELSE al.employee_code END) = le.user_code
//           AND al.location             = le.location
//           AND al.department           = le.department
//           AND al.application_equip_id = le.application_equip_id
//         WHERE al.location             = $1
//           AND al.department           = $2
//           AND al.application_equip_id = $3
//           AND le.access_request_type  = 'Modify Access'
//           AND (al.task_status != 'Revoked' OR al.task_status IS NULL)
//           AND (LOWER(al.access) = 'granted' OR al.access IS NULL)
//         ORDER BY
//           CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_name ELSE al.name END,
//           CASE WHEN al.request_for_by = 'Vendor' THEN al.vendor_code ELSE al.employee_code END,
//           al.location,
//           al.department,
//           al.application_equip_id,
//           al.role,
//           al.id DESC
//       )

//       SELECT * FROM (
//         SELECT * FROM regular_users
//         UNION ALL
//         SELECT * FROM modification_users
//       ) AS combined_results
//       WHERE (combined_results.task_status != 'Deactivated' OR combined_results.task_status IS NULL)
//     `;

//     const params = [plant_id, department_id, application_id];
//     let paramIndex = 4;

//     // Add search filter if provided
//     if (search && value) {
//       query += ` AND combined_results.${search} ILIKE $${paramIndex}`;
//       params.push(`%${value}%`);
//       paramIndex++;
//     }

//     query += ` ORDER BY combined_results.id DESC`;

//     // Add pagination
//     const offset = (parseInt(page) - 1) * parseInt(limit);
//     query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
//     params.push(parseInt(limit), offset);

//     console.log("📊 Executing query with params:", params);
//     const result = await pool.query(query, params);

//     console.log("✅ Query successful, rows returned:", result.rows.length);

//     res.json({
//       success: true,
//       data: result.rows,
//       total: result.rows.length,
//       page: parseInt(page),
//       limit: parseInt(limit)
//     });

//   } catch (error) {
//     console.error('❌ Error fetching access logs:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch access logs',
//       message: error.message
//     });
//   }
// };


exports.getAllActiveUserLogs = async (req, res) => {
  console.log("=== DEBUG START ===");
  console.log("Full URL:", req.originalUrl);
  console.log("Query params:", req.query);
  console.log("plant_id:", req.query.plant_id, "Type:", typeof req.query.plant_id);
  console.log("department_id:", req.query.department_id, "Type:", typeof req.query.department_id);
  console.log("application_id:", req.query.application_id, "Type:", typeof req.query.application_id);
  console.log("=== DEBUG END ===");

  const { plant_id, department_id, application_id, page = 1, limit = 10, search, value } = req.query;

  if (!plant_id || !department_id || !application_id) {
    console.log("❌ Validation failed - missing params");
    return res.status(400).json({
      success: false,
      message: "Missing required query parameters: plant_id, department_id, application_id",
      received: { plant_id, department_id, application_id }
    });
  }

  console.log("✅ Validation passed");

  try {
    let query = `
      WITH latest_entries AS (
        SELECT DISTINCT ON (
          CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_name ELSE al.name END,
          CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_code ELSE al.employee_code END,
          al.location,
          al.department,
          al.application_equip_id
        )
          CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_name ELSE al.name END AS user_name,
          CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_code ELSE al.employee_code END AS user_code,
          al.location,
          al.department,
          al.application_equip_id,
          al.request_raised_by,
          al.request_raised_by_emp_code,
          al.access_request_type
        FROM access_log al
        WHERE al.location             = $1
          AND al.department           = $2
          AND al.application_equip_id = $3
          AND (al.task_status != 'Revoked' OR al.task_status IS NULL)
        ORDER BY
          CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_name ELSE al.name END,
          CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_code ELSE al.employee_code END,
          al.location,
          al.department,
          al.application_equip_id,
          al.id DESC
      ),

      regular_users AS (
        SELECT DISTINCT ON (
          CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_name ELSE al.name END,
          CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_code ELSE al.employee_code END,
          al.location,
          al.department,
          al.application_equip_id,
          al.role
        )
          al.id,
          al.user_request_id,
          al.task_id,
          al.ritm_transaction_id,
          al.task_transaction_id,
          al.request_for_by,
          al.request_raised_by,
          al.request_raised_by_emp_code,
          al.name,
          al.employee_code,
          al.employee_location,
          al.access_request_type,
          al.training_status,
          al.vendor_firm,
          al.vendor_code,
          al.vendor_name,
          al.vendor_allocated_id,
          al.user_request_status,
          al.task_status,
          al.application_equip_id,
          al.department,
          al.role,
          al.location,
          al.reports_to,
          al.approver1_status,
          al.approver2_status,
          al.approver1_email,
          al.approver2_email,
          al.created_on,
          al.updated_on,
          al.completed_at,
          al.remarks,
          al.approver1_name,
          al.approver2_name,
          al.approver1_action,
          al.approver2_action,
          al.approver1_timestamp,
          al.approver2_timestamp,
          al.approver1_comments,
          al.approver2_comments,
          al.requested_role,
          al.assignment_group,
          al.assigned_to,
          al.allocated_id,
          al.role_granted,
          al.access,
          al.user_request_type,
          al.from_date,
          al.to_date,
          al.password,
          al.task_action,
          rm.role_name
        FROM access_log al
        LEFT JOIN role_master rm ON al.role = rm.id
        INNER JOIN latest_entries le ON
          (CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_name ELSE al.name END) = le.user_name
          AND (CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_code ELSE al.employee_code END) = le.user_code
          AND al.location             = le.location
          AND al.department           = le.department
          AND al.application_equip_id = le.application_equip_id
        WHERE al.location             = $1
          AND al.department           = $2
          AND al.application_equip_id = $3
          AND le.access_request_type != 'Modify Access'
          AND (al.task_status != 'Revoked' OR al.task_status IS NULL)
          AND (LOWER(al.access) = 'granted' OR al.access IS NULL)
        ORDER BY
          CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_name ELSE al.name END,
          CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_code ELSE al.employee_code END,
          al.location,
          al.department,
          al.application_equip_id,
          al.role,
          al.id DESC
      ),

      modification_users AS (
        SELECT DISTINCT ON (
          CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_name ELSE al.name END,
          CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_code ELSE al.employee_code END,
          al.location,
          al.department,
          al.application_equip_id,
          al.role
        )
          al.id,
          al.user_request_id,
          al.task_id,
          al.ritm_transaction_id,
          al.task_transaction_id,
          al.request_for_by,
          al.request_raised_by,
          al.request_raised_by_emp_code,
          al.name,
          al.employee_code,
          al.employee_location,
          al.access_request_type,
          al.training_status,
          al.vendor_firm,
          al.vendor_code,
          al.vendor_name,
          al.vendor_allocated_id,
          al.user_request_status,
          al.task_status,
          al.application_equip_id,
          al.department,
          al.role,
          al.location,
          al.reports_to,
          al.approver1_status,
          al.approver2_status,
          al.approver1_email,
          al.approver2_email,
          al.created_on,
          al.updated_on,
          al.completed_at,
          al.remarks,
          al.approver1_name,
          al.approver2_name,
          al.approver1_action,
          al.approver2_action,
          al.approver1_timestamp,
          al.approver2_timestamp,
          al.approver1_comments,
          al.approver2_comments,
          al.requested_role,
          al.assignment_group,
          al.assigned_to,
          al.allocated_id,
          al.role_granted,
          al.access,
          al.user_request_type,
          al.from_date,
          al.to_date,
          al.password,
          al.task_action,
          rm.role_name
        FROM access_log al
        LEFT JOIN role_master rm ON al.role = rm.id
        INNER JOIN latest_entries le ON
          (CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_name ELSE al.name END) = le.user_name
          AND (CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_code ELSE al.employee_code END) = le.user_code
          AND al.location             = le.location
          AND al.department           = le.department
          AND al.application_equip_id = le.application_equip_id
        WHERE al.location             = $1
          AND al.department           = $2
          AND al.application_equip_id = $3
          AND le.access_request_type  = 'Modify Access'
          AND (al.task_status != 'Revoked' OR al.task_status IS NULL)
          AND (LOWER(al.access) = 'granted' OR al.access IS NULL)
        ORDER BY
          CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_name ELSE al.name END,
          CASE WHEN al.request_for_by = 'Vendor / OEM' THEN al.vendor_code ELSE al.employee_code END,
          al.location,
          al.department,
          al.application_equip_id,
          al.role,
          al.id DESC
      )

      SELECT * FROM (
        SELECT * FROM regular_users
        UNION ALL
        SELECT * FROM modification_users
      ) AS combined_results
      WHERE (combined_results.task_status != 'Deactivated' OR combined_results.task_status IS NULL)
    `;

    const params = [plant_id, department_id, application_id];
    let paramIndex = 4;

    if (search && value) {
      query += ` AND combined_results.${search} ILIKE $${paramIndex}`;
      params.push(`%${value}%`);
      paramIndex++;
    }

    query += ` ORDER BY combined_results.id DESC`;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    console.log("📊 Executing query with params:", params);
    const result = await pool.query(query, params);

    console.log("✅ Query successful, rows returned:", result.rows.length);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('❌ Error fetching access logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch access logs',
      message: error.message
    });
  }
};


exports.getAccessLogsByUser = async (req, res) => {
  const {
    employee_code,
    plant,
    department,
    application,
    name = ""
  } = req.query;

  if (!employee_code || !plant || !department) {
    return res.status(400).json({
      success: false,
      message: "Missing required query parameters"
    });
  }

  try {
    const query = `
      SELECT 
        al.id,
        al.employee_code,
        al.vendor_name,
        al.vendor_allocated_id,
        al.application_equip_id,
        al.department,
        al.location,
        al.role,
        al.task_status,
        al.access_request_type,
        al.access,
        al.task_action,
        al.user_request_status,
        al.created_on,
        al.completed_at,
        app.display_name AS application_name,
        d.department_name,
        p.plant_name,
        r.role_name
      FROM access_log al
      LEFT JOIN application_master app 
        ON al.application_equip_id::text = app.id::text
      LEFT JOIN department_master d 
        ON al.department::text = d.id::text
      LEFT JOIN plant_master p 
        ON al.location::text = p.id::text
      LEFT JOIN role_master r 
        ON al.role::text = r.id::text
      WHERE al.location::text    = $1::text
        AND al.department::text  = $2::text
        AND al.employee_code     = $3
        AND ($4::text IS NULL OR al.application_equip_id::text = $4::text)
        AND al.task_status        = 'Closed'
        AND al.user_request_status = 'Completed'
      ORDER BY al.id DESC
    `;

    const values = [
      plant,
      department,
      employee_code,
      application || null
    ];

    const { rows } = await pool.query(query, values);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (error) {
    console.error("ACCESS LOG FETCH ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch access logs"
    });
  }
};


exports.getAccessLogsForVendorModify = async (req, res) => {
  const { plant, department, application } = req.query;

  if (!plant || !department || !application) {
    return res.status(400).json({
      error: "plant, department, and application are required"
    });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        al.*,
        am.display_name AS application_name,
        dm.department_name,
        rm.role_name,
        pm.plant_name   AS location_name
      FROM access_log al
      LEFT JOIN application_master am ON al.application_equip_id = am.id
      LEFT JOIN department_master  dm ON al.department            = dm.id
      LEFT JOIN role_master        rm ON al.role                  = rm.id
      LEFT JOIN plant_master       pm ON al.location              = pm.id
      WHERE al.location::text              = $1::text
        AND al.department::text            = $2::text
        AND al.application_equip_id::text  = $3::text
        AND al.task_status                 = 'Closed'
        AND al.request_for_by              = 'Vendor / OEM'
      ORDER BY al.allocated_id, al.application_equip_id DESC, al.id DESC`,
      [plant, department, application]
    );

    if (rows.length === 0) {
      return res.json([]); // return empty array, not 404
    }

    // Group by vendor_allocated_id → pick latest user_request_id per allocated ID
    // then collect ALL roles from that latest request
    const latestRequestPerAllocId = {};
    for (const row of rows) {
      const key = row.vendor_allocated_id;
      if (!latestRequestPerAllocId[key]) {
        latestRequestPerAllocId[key] = {
          latestRequestId: row.user_request_id,
          rows: [],
        };
      }
      if (row.user_request_id === latestRequestPerAllocId[key].latestRequestId) {
        latestRequestPerAllocId[key].rows.push(row);
      }
    }

    const groupedMap = {};

for (const row of rows) {

  // fallback safe allocated id
  const allocId = row.vendor_allocated_id || row.allocated_id;

  if (!allocId) continue;

  const key = `${allocId}_${row.location}_${row.department}_${row.application_equip_id}`;

  if (!groupedMap[key]) {
    groupedMap[key] = {
      ...row,
      roles: []
    };
  }

  if (row.role) {
    const exists = groupedMap[key].roles.find(
      r => r.role_id === row.role
    );

    if (!exists) {
      groupedMap[key].roles.push({
        role_id: row.role,
        role_name: row.role_name
      });
    }
  }
}

const grouped = Object.values(groupedMap);

    res.json(grouped);
  } catch (err) {
    console.error("[getAccessLogsForVendorModify] Error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = exports;