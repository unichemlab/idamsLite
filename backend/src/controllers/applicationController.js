// backend/controllers/applicationController.js
const db = require("../config/db");
const { logCrud, ACTION, MODULE } = require("../utils/activityLogger");
const { submitForApproval } = require("../utils/masterApprovalHelper");
const { filterByPlantAccess, canAccessPlant } = require("../middleware/permissionMiddleware");

/**
 * Check if user is super admin
 */
const isSuperAdmin = (user) => {
  if (!user) return false;
  if (user.role_id === 1) return true;
  if (Array.isArray(user.role_id) && user.role_id.includes(1)) return true;
  if (Array.isArray(user.roles) && user.roles.includes(1)) return true;
  if (user.roles === 1) return true;
  return false;
};

/**
 * Generate unique transaction ID by checking both application_master and pending approvals
 */
const generateUniqueTransactionId = async () => {
  try {
    let maxNum = 0;

    const existingAppsResult = await db.query(
      `SELECT transaction_id FROM application_master
       WHERE transaction_id LIKE 'APP%'
       ORDER BY transaction_id DESC
       LIMIT 1`
    );

    if (existingAppsResult.rows.length > 0) {
      const lastId = existingAppsResult.rows[0].transaction_id;
      const match = lastId.match(/APP(\d+)/);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }

    const pendingApprovalsResult = await db.query(
      `SELECT new_value FROM pending_approvals
       WHERE module     = 'application'
         AND table_name = 'application_master'
         AND action     = 'create'
         AND status     = 'PENDING'`
    );

    for (const row of pendingApprovalsResult.rows) {
      try {
        const newValue =
          typeof row.new_value === "string"
            ? JSON.parse(row.new_value)
            : row.new_value;
        if (newValue?.transaction_id) {
          const match = newValue.transaction_id.match(/APP(\d+)/);
          if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
        }
      } catch (e) {
        console.warn("Error parsing new_value in pending approval:", e);
      }
    }

    const nextNum = maxNum + 1;
    return `APP${String(nextNum).padStart(7, "0")}`;
  } catch (err) {
    console.error("Error generating transaction_id:", err);
    const timestamp = Date.now().toString().slice(-7);
    return `APP${timestamp}`;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL APPLICATIONS
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllApplications = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM application_master WHERE status='ACTIVE' ORDER BY id ASC"
    );

    if (isSuperAdmin(req.user)) {
      return res.status(200).json(result.rows);
    }

    const filteredApps = filterByPlantAccess(result.rows, req.user);
    res.status(200).json(filteredApps);
  } catch (err) {
    console.error("Error fetching applications:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADD APPLICATION (POST)
// ─────────────────────────────────────────────────────────────────────────────
exports.addApplication = async (req, res) => {
  try {
    const userId   = req.user?.id || req.user?.user_id;
    const username = req.user?.username || req.user?.employee_name || "Unknown";

    const {
      plant_location_id,
      department_id,
      application_hmi_name,
      application_hmi_version,
      equipment_instrument_id,
      application_hmi_type,
      display_name,
      role_id,
      system_name,
      system_inventory_id,
      multiple_role_access,
      status,
      role_lock = false,
    } = req.body;

    if (!isSuperAdmin(req.user)) {
      if (!canAccessPlant(req.user, plant_location_id)) {
        return res.status(403).json({
          error: "You do not have permission to create applications for this plant",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }
    }

    const transaction_id = await generateUniqueTransactionId();

    const roleIdStr = Array.isArray(role_id) ? role_id.join(",") : String(role_id);

    const newData = {
      transaction_id,
      plant_location_id,
      department_id,
      application_hmi_name,
      application_hmi_version,
      equipment_instrument_id,
      application_hmi_type,
      display_name,
      role_id: roleIdStr,
      system_name,
      system_inventory_id,
      multiple_role_access,
      role_lock,
      status,
    };

    // ✅ Submit for approval — pass req so submitForApproval can log with full metadata
    const approvalId = await submitForApproval({
      module:               "application",
      tableName:            "application_master",
      action:               "create",
      recordId:             null,
      oldValue:             null,
      newValue:             newData,
      requestedBy:          userId,
      requestedByUsername:  username,
      comments:             `Create Application: ${display_name}`,
      req,                  // ✅ passed for audit trail
    });

    if (approvalId !== null) {
      return res.status(202).json({
        message: "Application creation submitted for approval",
        approvalId,
        status: "PENDING_APPROVAL",
        data: newData,
      });
    }

    // ── No approval workflow configured → insert directly ──
    const result = await db.query(
      `INSERT INTO application_master (
         transaction_id, plant_location_id, department_id, application_hmi_name,
         application_hmi_version, equipment_instrument_id, application_hmi_type,
         display_name, role_id, system_name, system_inventory_id,
         multiple_role_access, role_lock, status, created_on, updated_on
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW()
       ) RETURNING *`,
      [
        transaction_id, plant_location_id, department_id, application_hmi_name,
        application_hmi_version, equipment_instrument_id, application_hmi_type,
        display_name, roleIdStr, system_name, system_inventory_id,
        multiple_role_access, role_lock, status,
      ]
    );

    // ✅ Audit log for direct create (no approval workflow)
    await logCrud({
      userId,
      performedByRole: req.user?.role,
      module:          MODULE.APPLICATION,
      tableName:       "application_master",
      recordId:        result.rows[0].id,
      action:          ACTION.CREATE,
      oldValue:        null,
      newValue:        result.rows[0],
      subscription:    req.user?.subscription,
      req,
      transactionId:   result.rows[0].transaction_id,
      comments:        `Created application: ${display_name}`,
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[addApplication] Error:", err);

    if (err.code === "23505" && err.constraint === "application_master_transaction_id_key") {
      return res.status(409).json({
        error: "Transaction ID already exists. Please try again.",
        code: "DUPLICATE_TRANSACTION_ID",
      });
    }

    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EDIT APPLICATION (PUT)
// ─────────────────────────────────────────────────────────────────────────────
exports.editApplication = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid application ID" });

    const userId   = req.user?.id || req.user?.user_id;
    const username = req.user?.username || "Unknown";

    const oldRes  = await db.query("SELECT * FROM application_master WHERE id=$1", [id]);
    const oldValue = oldRes.rows[0] ?? null;

    if (!oldValue) return res.status(404).json({ error: "Application not found" });

    if (!isSuperAdmin(req.user)) {
      if (!canAccessPlant(req.user, oldValue.plant_location_id)) {
        return res.status(403).json({
          error: "You do not have permission to edit this application",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }
    }

    const {
      transaction_id,
      plant_location_id,
      department_id,
      application_hmi_name,
      application_hmi_version,
      equipment_instrument_id,
      application_hmi_type,
      display_name,
      role_id,
      system_name,
      system_inventory_id,
      multiple_role_access,
      status,
      role_lock = false,
    } = req.body;

    if (!isSuperAdmin(req.user)) {
      if (plant_location_id !== oldValue.plant_location_id) {
        if (!canAccessPlant(req.user, plant_location_id)) {
          return res.status(403).json({
            error: "You do not have permission to move this application to the selected plant",
            code: "INSUFFICIENT_PERMISSIONS",
          });
        }
      }
    }

    const roleIdStr = Array.isArray(role_id) ? role_id.join(",") : String(role_id);

    const newData = {
      transaction_id:         transaction_id || oldValue.transaction_id,
      plant_location_id,
      department_id,
      application_hmi_name,
      application_hmi_version,
      equipment_instrument_id,
      application_hmi_type,
      display_name,
      role_id:                roleIdStr,
      system_name,
      system_inventory_id,
      multiple_role_access,
      role_lock,
      status,
    };

    // ✅ Submit for approval — pass req for audit trail
    const approvalId = await submitForApproval({
      module:               "application",
      tableName:            "application_master",
      action:               "update",
      recordId:             id,
      oldValue,
      newValue:             newData,
      requestedBy:          userId,
      requestedByUsername:  username,
      comments:             `Update application: ${display_name}`,
      req,                  // ✅ passed for audit trail
    });

    if (approvalId !== null) {
      return res.status(202).json({
        message: "Application update submitted for approval",
        approvalId,
        status: "PENDING_APPROVAL",
        data: newData,
      });
    }

    // ── No approval workflow → update directly ──
    const result = await db.query(
      `UPDATE application_master SET
         transaction_id=$1, plant_location_id=$2, department_id=$3,
         application_hmi_name=$4, application_hmi_version=$5,
         equipment_instrument_id=$6, application_hmi_type=$7,
         display_name=$8, role_id=$9, system_name=$10,
         system_inventory_id=$11, multiple_role_access=$12,
         role_lock=$13, status=$14, updated_on=NOW()
       WHERE id=$15 RETURNING *`,
      [
        newData.transaction_id, plant_location_id, department_id, application_hmi_name,
        application_hmi_version, equipment_instrument_id, application_hmi_type,
        display_name, roleIdStr, system_name, system_inventory_id,
        multiple_role_access, role_lock, status, id,
      ]
    );

    // ✅ Audit log for direct update (no approval workflow)
    await logCrud({
      userId,
      performedByRole: req.user?.role,
      module:          MODULE.APPLICATION,
      tableName:       "application_master",
      recordId:        id,
      action:          ACTION.UPDATE,
      oldValue,
      newValue:        result.rows[0],
      subscription:    req.user?.subscription,
      req,
      comments:        `Updated application id: ${id}`,
    });

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error editing application:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE APPLICATION (DELETE)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteApplication = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid application ID" });

    const oldRow   = await db.query("SELECT * FROM application_master WHERE id=$1", [id]);
    const oldValue = oldRow.rows[0] ?? null;

    if (!oldValue) return res.status(404).json({ error: "Application not found" });

    if (!isSuperAdmin(req.user)) {
      if (!canAccessPlant(req.user, oldValue.plant_location_id)) {
        return res.status(403).json({
          error: "You do not have permission to delete applications for this plant",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }
    }

    const userId   = req.user?.id || req.user?.user_id;
    const username = req.user?.username || "Unknown";

    // ✅ Submit for approval — pass req for audit trail
    const approvalId = await submitForApproval({
      module:               "application",
      tableName:            "application_master",
      action:               "delete",
      recordId:             id,
      oldValue,
      newValue:             null,
      requestedBy:          userId,
      requestedByUsername:  username,
      comments:             `Delete application: ${oldValue.display_name}`,
      req,                  // ✅ passed for audit trail
    });

    if (approvalId !== null) {
      return res.status(202).json({
        message: "Application deletion submitted for approval",
        approvalId,
        status: "PENDING_APPROVAL",
        data: oldValue,
      });
    }

    // ── No approval workflow → delete directly ──
    const result = await db.query(
      "DELETE FROM application_master WHERE id = $1 RETURNING *",
      [id]
    );

    const deletedRow = result.rows[0];

    // ✅ Audit log for direct delete (no approval workflow)
    await logCrud({
      userId,
      performedByRole: req.user?.role,
      module:          MODULE.APPLICATION,
      tableName:       "application_master",
      recordId:        deletedRow.id,
      action:          ACTION.DELETE,
      oldValue:        deletedRow,
      newValue:        null,
      subscription:    req.user?.subscription,
      req,
      comments:        `Deleted application id: ${deletedRow.id}`,
    });

    res.status(200).json({ message: "Application deleted successfully" });
  } catch (err) {
    console.error("Error deleting application:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BULK IMPORT APPLICATIONS
// ─────────────────────────────────────────────────────────────────────────────
exports.bulkImportApplications = async (req, res) => {
  const userId   = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";
  const { records } = req.body;

  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "No records provided" });
  }

  try {
    const approvalIds = [];
    const errors      = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const record = { ...records[i] };
        const transaction_id = await generateUniqueTransactionId();
        record.transaction_id = transaction_id;

        if (record.plant_location_id)   record.plant_location_id   = parseInt(record.plant_location_id, 10);
        if (record.department_id)        record.department_id        = parseInt(record.department_id, 10);
        if (record.system_inventory_id)  record.system_inventory_id  = parseInt(record.system_inventory_id, 10);
        if (record.role_id)              record.role_id              = String(record.role_id);

        const booleanFields = ["multiple_role_access", "role_lock"];
        booleanFields.forEach((field) => {
          if (record[field] !== undefined && record[field] !== "") {
            const val = String(record[field]).toLowerCase();
            record[field] = ["true", "yes", "1"].includes(val);
          } else {
            record[field] = false;
          }
        });

        record.status                   = record.status || "ACTIVE";
        record.application_hmi_version  = record.application_hmi_version  || null;
        record.equipment_instrument_id  = record.equipment_instrument_id  || null;
        record.application_hmi_type     = record.application_hmi_type     || null;
        record.system_name              = record.system_name              || null;
        record.system_inventory_id      = record.system_inventory_id      || null;

        // ✅ Pass req for audit trail
        const approvalId = await submitForApproval({
          module:               "application",
          tableName:            "application_master",
          action:               "create",
          recordId:             null,
          oldValue:             null,
          newValue:             record,
          requestedBy:          userId,
          requestedByUsername:  username,
          comments:             `Bulk import - Application: ${record.display_name || record.application_hmi_name || `Record ${i + 1}`}`,
          req,
        });

        approvalIds.push(approvalId ?? { direct: true, record: i + 1 });
      } catch (error) {
        console.error(`Error processing record ${i + 1}:`, error);
        errors.push({
          record: i + 1,
          error:  error.message,
          data:   records[i].display_name || records[i].application_hmi_name,
        });
      }
    }

    // ✅ Single summary audit log for the whole bulk import
    await logCrud({
      userId,
      performedByRole: req.user?.role,
      module:          MODULE.APPLICATION,
      tableName:       "application_master",
      recordId:        null,
      action:          ACTION.CREATE,
      oldValue:        null,
      newValue:        { recordCount: records.length, approvalCount: approvalIds.length },
      subscription:    req.user?.subscription,
      req,
      comments:        `Bulk imported ${records.length} application records`,
    });

    res.status(200).json({
      message:          "Bulk import completed",
      totalRecords:     records.length,
      successfulImports: approvalIds.length,
      failedImports:    errors.length,
      approvalIds,
      errors,
    });
  } catch (err) {
    console.error("Bulk import error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET DEPARTMENT BY PLANT ID
// ─────────────────────────────────────────────────────────────────────────────
exports.getDepartmentByPlantId = async (req, res) => {
  try {
    const plantID = parseInt(req.params.id, 10);
    if (isNaN(plantID)) return res.status(400).json({ error: "Invalid plant ID" });

    const result = await db.query(
      `SELECT DISTINCT d.id, d.department_name
         FROM application_master a
         JOIN department_master d ON a.department_id = d.id
        WHERE a.plant_location_id = $1
        ORDER BY d.department_name`,
      [plantID]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No departments found for this plant" });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching departments:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ACTIVITY LOGS FOR APPLICATION_MASTER
// ─────────────────────────────────────────────────────────────────────────────
exports.getApplicationActivityLogs = async (req, res) => {
  try {
    const { rows: rawRows } = await db.query(
      `SELECT * FROM activity_log
        WHERE table_name = 'application_master'
           OR (details IS NOT NULL AND details LIKE '%"tableName":"application_master"%')
        ORDER BY COALESCE(date_time_ist, NOW()) DESC`
    );

    const rows = rawRows.map((r) => {
      if (r.details) {
        try {
          const parsed     = JSON.parse(r.details);
          r.table_name     = r.table_name || parsed.tableName || r.table_name;
          r.old_value      = r.old_value  || (parsed.old_value ? JSON.stringify(parsed.old_value) : null);
          r.new_value      = r.new_value  || (parsed.new_value ? JSON.stringify(parsed.new_value) : null);
          r.action         = r.action     || parsed.action || r.action;
          r.action_performed_by = r.action_performed_by || r.user_id || parsed.userId || null;
        } catch (e) { /* ignore parse errors */ }
      }
      return r;
    });

    if (isSuperAdmin(req.user)) {
      return res.json(rows);
    }

    const filteredRows = rows.filter((log) => {
      let plantId = null;

      if (log.old_value) {
        try {
          const oldVal = typeof log.old_value === "string" ? JSON.parse(log.old_value) : log.old_value;
          plantId = oldVal.plant_location_id;
        } catch (e) {}
      }

      if (!plantId && log.new_value) {
        try {
          const newVal = typeof log.new_value === "string" ? JSON.parse(log.new_value) : log.new_value;
          plantId = newVal.plant_location_id;
        } catch (e) {}
      }

      if (!plantId) return true;
      return canAccessPlant(req.user, plantId);
    });

    res.json(filteredRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ROLE + APPLICATION IDs BY PLANT + DEPARTMENT
// ─────────────────────────────────────────────────────────────────────────────
exports.getRoleApplicationIDByPlantIdandDepartment = async (req, res) => {
  try {
    const plantID      = parseInt(req.params.id, 10);
    const departmentID = parseInt(req.params.dept_id, 10);

    if (isNaN(plantID) || isNaN(departmentID)) {
      return res.status(400).json({ error: "Invalid plant or department ID" });
    }

    const result = await db.query(
      `SELECT DISTINCT
         r.id          AS role_id,
         r.role_name   AS role_name,
         a.id          AS application_id,
         a.display_name,
         a.multiple_role_access
       FROM application_master a
       JOIN role_master r ON r.id = ANY(string_to_array(a.role_id, ',')::int[])
       WHERE a.plant_location_id = $1
         AND a.department_id     = $2
         AND a.status            = 'ACTIVE'
       ORDER BY r.role_name`,
      [plantID, departmentID]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "No roles or applications found for this plant and department",
      });
    }

    const roles = Array.from(
      new Set(result.rows.map((row) => JSON.stringify({ id: row.role_id, name: row.role_name })))
    ).map((item) => JSON.parse(item));

    const applications = Array.from(
      new Set(
        result.rows.map((row) =>
          JSON.stringify({
            id:                  row.application_id,
            name:                row.display_name,
            multiple_role_access: row.multiple_role_access,
          })
        )
      )
    ).map((item) => JSON.parse(item));

    const appRoles = result.rows.map((row) => ({
      role_id:        row.role_id,
      role_name:      row.role_name,
      application_id: String(row.application_id),
    }));

    res.status(200).json({ roles, applications, appRoles });
  } catch (err) {
    console.error("Error fetching roles and applications:", err);
    res.status(500).json({ error: err.message });
  }
};
