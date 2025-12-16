const pool = require("../config/db");
const { logActivity } = require("../utils/activityLogger");
const { submitForApproval } = require("../utils/masterApprovalHelper");

// Get all access logs with related data
exports.getAllAccessLogs = async (req, res) => {
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
      ORDER BY al.created_on DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching access logs:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get single access log by ID
exports.getAccessLogById = async (req, res) => {
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

module.exports = exports;