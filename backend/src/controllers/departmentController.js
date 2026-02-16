const pool = require("../config/db");
const { logActivity } = require("../utils/activityLogger");
const { submitForApproval } = require("../utils/masterApprovalHelper");

// ------------------------------
// Get Department Activity Logs
// ------------------------------
exports.getDepartmentActivityLogs = async (req, res) => {
  try {
    const { rows: rawRows } = await pool.query(
      `SELECT * FROM activity_log
       WHERE table_name = 'department_master'
          OR (details IS NOT NULL AND details LIKE '%"tableName":"department_master"%')
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
        } catch (e) {}
      }
      return r;
    });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// Get All Departments
// ------------------------------
exports.getAllDepartments = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM department_master where status='ACTIVE' ORDER BY id"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// Create Department (WITH APPROVAL)
// ------------------------------
exports.createDepartment = async (req, res) => {
  const { department_name, description, status } = req.body;

  try {
    const userId = req.user?.id || req.user?.user_id;
    const username = req.user?.username || "Unknown";

    const newData = {
      department_name,
      description,
      status: status ?? "ACTIVE",
    };

    // 🔥 SUBMIT FOR APPROVAL FIRST
    const approvalId = await submitForApproval({
      module: "department",
      tableName: "department_master",
      action: "create",
      recordId: null,
      oldValue: null,
      newValue: newData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Create department: ${department_name}`,
    });

    if (approvalId !== null) {
      return res.status(202).json({
        message: "Department creation submitted for approval",
        approvalId,
        status: "PENDING_APPROVAL",
        data: newData,
      });
    }

    // No approval → insert directly
    const { rows } = await pool.query(
      `INSERT INTO department_master (department_name, description, status, created_on, updated_on)
       VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
      [department_name, description, status ?? "ACTIVE"]
    );

    // Normal activity log
    await logActivity({
      userId,
      module: "department",
      tableName: "department_master",
      recordId: rows[0].id,
      action: "create",
      oldValue: null,
      newValue: rows[0],
      comments: `Created department: ${department_name}`,
      reqMeta: req._meta || {},
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating department:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// Update Department (WITH APPROVAL)
// ------------------------------
exports.updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { department_name, description, status } = req.body;

  try {
    const userId = req.user?.id || req.user?.user_id;
    const username = req.user?.username || "Unknown";

    // Fetch old value
    const oldRes = await pool.query(
      "SELECT * FROM department_master WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0] || null;

    if (!oldValue) {
      return res.status(404).json({ error: "Department not found" });
    }

    const newData = {
      department_name,
      description,
      status,
    };

    // 🔥 SUBMIT FOR APPROVAL
    const approvalId = await submitForApproval({
      module: "department",
      tableName: "department_master",
      action: "update",
      recordId: id,
      oldValue,
      newValue: newData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Update department: ${department_name}`,
    });

    if (approvalId !== null) {
      return res.status(202).json({
        message: "Department update submitted for approval",
        approvalId,
        status: "PENDING_APPROVAL",
        data: newData,
      });
    }

    // No approval → update DB
    const { rows } = await pool.query(
      `UPDATE department_master SET 
          department_name=$1, 
          description=$2, 
          status=$3, 
          updated_on=NOW()
       WHERE id=$4 
       RETURNING *`,
      [department_name, description, status, id]
    );

    await logActivity({
      userId,
      module: "department",
      tableName: "department_master",
      recordId: id,
      action: "update",
      oldValue,
      newValue: rows[0],
      comments: `Updated department: ${department_name}`,
      reqMeta: req._meta || {},
    });

    res.json(rows[0]);
  } catch (err) {
    console.error("Error updating department:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// Delete Department (WITH APPROVAL)
// ------------------------------
exports.deleteDepartment = async (req, res) => {
  const { id } = req.params;

  try {
    const userId = req.user?.id || req.user?.user_id;
    const username = req.user?.username || "Unknown";

    const oldRes = await pool.query(
      "SELECT * FROM department_master WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0] || null;

    if (!oldValue) {
      return res.status(404).json({ error: "Department not found" });
    }

    // 🔥 SUBMIT FOR APPROVAL
    const approvalId = await submitForApproval({
      module: "department",
      tableName: "department_master",
      action: "delete",
      recordId: id,
      oldValue,
      newValue: null,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Delete department: ${oldValue.department_name}`,
    });

    if (approvalId !== null) {
      return res.status(202).json({
        message: "Department deletion submitted for approval",
        approvalId,
        status: "PENDING_APPROVAL",
        data: oldValue,
      });
    }

    // No approval → delete directly
    await pool.query("DELETE FROM department_master WHERE id=$1", [id]);

    await logActivity({
      userId,
      module: "department",
      tableName: "department_master",
      recordId: id,
      action: "delete",
      oldValue,
      newValue: null,
      comments: `Deleted department id: ${id}`,
      reqMeta: req._meta || {},
    });

    res.status(204).end();
  } catch (err) {
    console.error("Error deleting department:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// BULK IMPORT DEPARTMENTS
// ------------------------------
exports.bulkImportDepartments = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";
  const { records } = req.body;

  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "No records provided" });
  }

  try {
    const approvalIds = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const record = { ...records[i] };
        
        // Set default status
        record.status = record.status || 'ACTIVE';

        // Submit for approval
        const approvalId = await submitForApproval({
          module: "department",
          tableName: "department_master",
          action: "create",
          recordId: null,
          oldValue: null,
          newValue: record,
          requestedBy: userId,
          requestedByUsername: username,
          comments: `Bulk import - Department: ${record.department_name || `Record ${i + 1}`}`,
        });

        if (approvalId) {
          approvalIds.push(approvalId);
        } else {
          approvalIds.push({ direct: true, record: i + 1 });
        }

      } catch (error) {
        console.error(`Error processing record ${i + 1}:`, error);
        errors.push({
          record: i + 1,
          error: error.message
        });
      }
    }

    await logActivity({
      userId,
      module: "department",
      tableName: "department_master",
      recordId: null,
      action: "bulk_import",
      oldValue: null,
      newValue: { recordCount: records.length, approvalCount: approvalIds.length },
      comments: `Bulk imported ${records.length} department records`,
      reqMeta: req._meta || {},
    });

    res.status(200).json({
      message: "Bulk import completed",
      totalRecords: records.length,
      successfulImports: approvalIds.length,
      failedImports: errors.length,
      approvalIds,
      errors
    });

  } catch (err) {
    console.error("Bulk import error:", err);
    res.status(500).json({ error: err.message });
  }
};
