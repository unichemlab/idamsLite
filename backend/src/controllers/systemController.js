const { logActivity } = require("../utils/activityLogger");
const { submitForApproval } = require("../utils/masterApprovalHelper");
const pool = require("../config/db");

// ------------------------------
// GET ALL SYSTEMS WITH RELATIONS
// ------------------------------
exports.getAllSystems = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.*,
        p.plant_name,
        d.department_name
      FROM system_inventory_master s
      LEFT JOIN plant_master p ON s.plant_location_id = p.id
      LEFT JOIN department_master d ON s.department_id = d.id
      WHERE s.status = 'ACTIVE'
      ORDER BY s.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching systems:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// GET SYSTEM BY ID WITH RELATIONS
// ------------------------------
exports.getSystemById = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await pool.query(`
      SELECT 
        s.*,
        p.plant_name,
        d.department_name
      FROM system_inventory_master s
      LEFT JOIN plant_master p ON s.plant_location_id = p.id
      LEFT JOIN department_master d ON s.department_id = d.id
      WHERE s.id = $1 
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "System not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching system:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// CREATE SYSTEM (WITH APPROVAL)
// ------------------------------
exports.createSystem = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const payload = { ...req.body };

    // Remove read-only/derived fields
    delete payload.id;
    delete payload.created_on;
    delete payload.updated_on;
    delete payload.plant_name;
    delete payload.department_name;
    delete payload.transaction_id;

    // Convert empty strings to null for date fields
    const dateFields = ['warranty_end_date', 'amc_start_date', 'amc_expiry_date'];
    dateFields.forEach(field => {
      if (payload[field] === '' || payload[field] === null || payload[field] === undefined) {
        payload[field] = null;
      }
    });

    // Convert empty strings to null for optional string fields
    const optionalFields = [
      'gamp_category', 'instrument_equipment_name', 'equipment_instrument_id',
      'instrument_owner', 'service_tag', 'application_name', 'application_version',
      'application_oem', 'application_vendor', 'application_onboard',
      'system_process_owner', 'database_version', 'domain_workgroup',
      'specific_vlan', 'antivirus', 'antivirus_version', 'backup_type',
      'backup_frequency_days', 'backup_path', 'backup_tool',
      'audit_trail_adequacy', 'eol_eos_upgrade_status', 'system_current_status',
      'sap_asset_no', 'warranty_period', 'other_software', 'os_version_service_pack'
    ];
    
    optionalFields.forEach(field => {
      if (payload[field] === '') {
        payload[field] = null;
      }
    });

    // Convert string IDs to integers for foreign keys
    if (payload.plant_location_id) {
      payload.plant_location_id = parseInt(payload.plant_location_id, 10);
    }
    if (payload.department_id) {
      payload.department_id = parseInt(payload.department_id, 10);
    }

    // Validate foreign keys exist
    if (payload.plant_location_id) {
      const plantCheck = await pool.query(
        'SELECT id FROM plant_master WHERE id = $1',
        [payload.plant_location_id]
      );
      if (plantCheck.rows.length === 0) {
        return res.status(400).json({ error: "Invalid plant location ID" });
      }
    }

    if (payload.department_id) {
      const deptCheck = await pool.query(
        'SELECT id FROM department_master WHERE id = $1',
        [payload.department_id]
      );
      if (deptCheck.rows.length === 0) {
        return res.status(400).json({ error: "Invalid department ID" });
      }
    }

    // Prepare new unapproved data
    const newSystemData = {
      ...payload,
      status: payload.status || "ACTIVE",
    };

    // Submit for approval
    const approvalId = await submitForApproval({
      module: "system",
      tableName: "system_inventory_master",
      action: "create",
      recordId: null,
      oldValue: null,
      newValue: newSystemData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Create system: ${payload.host_name || ""}`,
    });

    // If approval workflow is OFF → create immediately
    if (approvalId === null) {
      // Build column names and values dynamically
      const columns = Object.keys(newSystemData);
      const values = columns.map(k => newSystemData[k]);
      const placeholders = columns.map((_, i) => `${i + 1}`).join(', ');
      const columnList = columns.join(', ');

      const result = await pool.query(`
        INSERT INTO system_inventory_master (${columnList})
        VALUES (${placeholders})
        RETURNING *
      `, values);

      const newSystem = result.rows[0];

      await logActivity({
        userId,
        module: "system",
        tableName: "system_inventory_master",
        recordId: newSystem.id,
        action: "create",
        oldValue: null,
        newValue: newSystem,
        comments: `Created system id ${newSystem.id}`,
        reqMeta: req._meta || {},
      });

      return res.status(201).json(newSystem);
    }

    // Otherwise → pending approval
    res.status(202).json({
      message: "System creation submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: newSystemData,
    });

  } catch (err) {
    console.error("Error creating system:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// UPDATE SYSTEM (WITH APPROVAL)
// ------------------------------
exports.updateSystem = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";
  const id = parseInt(req.params.id, 10);

  try {
    // Get existing system
    const existing = await pool.query(
      'SELECT * FROM system_inventory_master WHERE id = $1',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "System not found" });
    }

    const oldValue = existing.rows[0];
    const payload = { ...req.body };

    // Remove read-only/derived fields
    delete payload.id;
    delete payload.created_on;
    delete payload.updated_on;
    delete payload.plant_name;
    delete payload.department_name;
    delete payload.transaction_id;

    // Convert empty strings to null for date fields
    const dateFields = ['warranty_end_date', 'amc_start_date', 'amc_expiry_date'];
    dateFields.forEach(field => {
      if (payload[field] === '' || payload[field] === null || payload[field] === undefined) {
        payload[field] = null;
      }
    });

    // Convert empty strings to null for optional string fields
    const optionalFields = [
      'gamp_category', 'instrument_equipment_name', 'equipment_instrument_id',
      'instrument_owner', 'service_tag', 'application_name', 'application_version',
      'application_oem', 'application_vendor', 'application_onboard',
      'system_process_owner', 'database_version', 'domain_workgroup',
      'specific_vlan', 'antivirus', 'antivirus_version', 'backup_type',
      'backup_frequency_days', 'backup_path', 'backup_tool',
      'audit_trail_adequacy', 'eol_eos_upgrade_status', 'system_current_status',
      'sap_asset_no', 'warranty_period', 'other_software', 'os_version_service_pack'
    ];
    
    optionalFields.forEach(field => {
      if (payload[field] === '') {
        payload[field] = null;
      }
    });

    // Convert string IDs to integers for foreign keys
    if (payload.plant_location_id) {
      payload.plant_location_id = parseInt(payload.plant_location_id, 10);
    }
    if (payload.department_id) {
      payload.department_id = parseInt(payload.department_id, 10);
    }

    // Validate foreign keys if changed
    if (payload.plant_location_id && payload.plant_location_id !== oldValue.plant_location_id) {
      const plantCheck = await pool.query(
        'SELECT id FROM plant_master WHERE id = $1',
        [payload.plant_location_id]
      );
      if (plantCheck.rows.length === 0) {
        return res.status(400).json({ error: "Invalid plant location ID" });
      }
    }

    if (payload.department_id && payload.department_id !== oldValue.department_id) {
      const deptCheck = await pool.query(
        'SELECT id FROM department_master WHERE id = $1',
        [payload.department_id]
      );
      if (deptCheck.rows.length === 0) {
        return res.status(400).json({ error: "Invalid department ID" });
      }
    }

    const newValue = { ...oldValue, ...payload };

    // Submit for approval
    const approvalId = await submitForApproval({
      module: "system",
      tableName: "system_inventory_master",
      action: "update",
      recordId: id,
      oldValue,
      newValue,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Update system id ${id}`,
    });

    // If approval workflow is OFF → update immediately
    if (approvalId === null) {
      // Build dynamic UPDATE query
      const fields = Object.keys(payload);
      const setClause = fields.map((f, i) => `${f} = ${i + 1}`).join(', ');
      const values = fields.map(f => payload[f]);
      values.push(id);

      const result = await pool.query(
        `UPDATE system_inventory_master 
         SET ${setClause}, updated_on = NOW() 
         WHERE id = ${values.length} 
         RETURNING *`,
        values
      );

      const updated = result.rows[0];

      await logActivity({
        userId,
        module: "system",
        tableName: "system_inventory_master",
        recordId: id,
        action: "update",
        oldValue,
        newValue: updated,
        comments: `Updated system id ${id}`,
        reqMeta: req._meta || {},
      });

      return res.json(updated);
    }

    res.status(202).json({
      message: "System update submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: newValue,
    });

  } catch (err) {
    console.error("Error updating system:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// DELETE SYSTEM (WITH APPROVAL)
// ------------------------------
exports.deleteSystem = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";
  const id = parseInt(req.params.id, 10);

  try {
    const existing = await pool.query(
      'SELECT * FROM system_inventory_master WHERE id = $1',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "System not found" });
    }

    const oldValue = existing.rows[0];

    // Submit for approval
    const approvalId = await submitForApproval({
      module: "system",
      tableName: "system_inventory_master",
      action: "delete",
      recordId: id,
      oldValue,
      newValue: null,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Delete system id ${id}`,
    });

    // If approval workflow is OFF → delete immediately
    if (approvalId === null) {
      await pool.query('DELETE FROM system_inventory_master WHERE id = $1', [id]);

      await logActivity({
        userId,
        module: "system",
        tableName: "system_inventory_master",
        recordId: id,
        action: "delete",
        oldValue,
        newValue: null,
        comments: `Deleted system id ${id}`,
        reqMeta: req._meta || {},
      });

      return res.json({ success: true });
    }

    res.status(202).json({
      message: "System deletion submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: oldValue,
    });

  } catch (err) {
    console.error("Error deleting system:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// BULK IMPORT SYSTEM INVENTORY
// ------------------------------
exports.bulkImportSystemInventory = async (req, res) => {
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

        // Remove read-only fields
        delete record.id;
        delete record.created_on;
        delete record.updated_on;
        delete record.plant_name;
        delete record.department_name;
        delete record.transaction_id;

        // Convert empty strings to null for date fields
        const dateFields = ['warranty_end_date', 'amc_start_date', 'amc_expiry_date'];
        dateFields.forEach(field => {
          if (record[field] === '' || record[field] === null || record[field] === undefined) {
            record[field] = null;
          }
        });

        // Convert string IDs to integers
        if (record.plant_location_id) {
          record.plant_location_id = parseInt(record.plant_location_id, 10);
        }
        if (record.department_id) {
          record.department_id = parseInt(record.department_id, 10);
        }

        // Convert boolean strings to actual booleans
        const booleanFields = [
          'windows_activated',
          'user_management_applicable',
          'date_time_sync_available',
          'backup_procedure_available',
          'folder_deletion_restriction',
          'remote_tool_available',
          'user_roles_availability',
          'user_roles_challenged',
          'planned_upgrade_fy2526'
        ];

        booleanFields.forEach(field => {
          if (record[field] !== undefined && record[field] !== '') {
            const val = String(record[field]).toLowerCase();
            record[field] = ['true', 'yes', '1'].includes(val);
          }
        });

        // Set default status if not provided
        record.status = record.status || 'ACTIVE';

        // Submit for approval
        const approvalId = await submitForApproval({
          module: "system",
          tableName: "system_inventory_master",
          action: "create",
          recordId: null,
          oldValue: null,
          newValue: record,
          requestedBy: userId,
          requestedByUsername: username,
          comments: `Bulk import - System: ${record.host_name || `Record ${i + 1}`}`,
        });

        if (approvalId) {
          approvalIds.push(approvalId);
        } else {
          // If no approval workflow, record was created directly
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
      module: "system",
      tableName: "system_inventory_master",
      recordId: null,
      action: "bulk_import",
      oldValue: null,
      newValue: { recordCount: records.length, approvalCount: approvalIds.length },
      comments: `Bulk imported ${records.length} system inventory records`,
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

// GET /api/system-inventory/list
exports.getSystemInventoryList = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        equipment_instrument_id,
        host_name
      FROM system_inventory_master
      WHERE status = 'ACTIVE'
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching system inventory:", err);
    console.log("error error",err);
    res.status(500).json({ error: "Failed to load system inventory" });
  }
};


module.exports=exports;