// controllers/networkController.js

const { logActivity } = require("../utils/activityLogger");
const { submitForApproval } = require("../utils/masterApprovalHelper");
const pool = require("../config/db");

// ------------------------------
// GET ALL NETWORKS WITH RELATIONS
// ------------------------------
exports.getAllNetworks = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        n.*,
        p.plant_name
      FROM network_inventory_master n
      LEFT JOIN plant_master p ON n.plant_location_id = p.id
      WHERE n.status = 'ACTIVE'
      ORDER BY n.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching networks:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// GET NETWORK BY ID WITH RELATIONS
// ------------------------------
exports.getNetworkById = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await pool.query(`
      SELECT 
        n.*,
        p.plant_name
      FROM network_inventory_master n
      LEFT JOIN plant_master p ON n.plant_location_id = p.id
      WHERE n.id = $1 
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Network device not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching network device:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// CREATE NETWORK (WITH APPROVAL)
// ------------------------------
exports.createNetwork = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const payload = { ...req.body };

    // Remove read-only/derived fields
    delete payload.id;
    delete payload.created_on;
    delete payload.updated_on;
    delete payload.plant_name;
    delete payload.transaction_id;

    // Convert empty strings to null for date fields
    const dateFields = ['purchased_date', 'verify_date', 'warranty_start_date', 'amc_warranty_expiry_date'];
    dateFields.forEach(field => {
      if (payload[field] === '' || payload[field] === null || payload[field] === undefined) {
        payload[field] = null;
      }
    });

    // Convert empty strings to null for optional string fields
    const optionalFields = [
      'area', 'rack', 'host_name', 'device_ip', 'device_model', 'device_type',
      'make_vendor', 'trunk_port', 'neighbor_switch_ip', 'neighbor_port',
      'sfp_fiber_tx', 'poe_non_poe', 'serial_no', 'ios_version', 'uptime',
      'stack_switch_details', 'purchase_vendor', 'purchased_po', 'sap_asset_no',
      'service_type', 'amc_vendor', 'remarks'
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

    // Convert boolean strings to actual booleans
    // ✅ Boolean fields (keep as-is)
const booleanFields = ['stack', 'under_amc'];
booleanFields.forEach(field => {
  if (payload[field] !== undefined && payload[field] !== '') {
    const val = String(payload[field]).toLowerCase();
    payload[field] = ['true', 'yes', '1'].includes(val);
  }
});

// ✅ dual_power_source as STRING enum (YES / NO / ATS)
if (payload.dual_power_source !== undefined && payload.dual_power_source !== null) {
  payload.dual_power_source = String(payload.dual_power_source).trim().toUpperCase();
}


    // Prepare new unapproved data
    const newNetworkData = {
      ...payload,
      status: payload.status || "ACTIVE",
    };

    // Submit for approval
    const approvalId = await submitForApproval({
      module: "network",
      tableName: "network_inventory_master",
      action: "create",
      recordId: null,
      oldValue: null,
      newValue: newNetworkData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Create network device: ${payload.host_name || payload.device_ip || ""}`,
    });

    // If approval workflow is OFF → create immediately
    if (approvalId === null) {
      // Build column names and values dynamically
      const columns = Object.keys(newNetworkData);
      const values = columns.map(k => newNetworkData[k]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const columnList = columns.join(', ');

      const result = await pool.query(`
        INSERT INTO network_inventory_master (${columnList})
        VALUES (${placeholders})
        RETURNING *
      `, values);

      const newNetwork = result.rows[0];

      await logActivity({
        userId,
        module: "network",
        tableName: "network_inventory_master",
        recordId: newNetwork.id,
        action: "create",
        oldValue: null,
        newValue: newNetwork,
        comments: `Created network device id ${newNetwork.id}`,
        reqMeta: req._meta || {},
      });

      return res.status(201).json(newNetwork);
    }

    // Otherwise → pending approval
    res.status(202).json({
      message: "Network device creation submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: newNetworkData,
    });

  } catch (err) {
    console.error("Error creating network device:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// UPDATE NETWORK (WITH APPROVAL)
// ------------------------------
exports.updateNetwork = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";
  const id = parseInt(req.params.id, 10);

  try {
    // Get existing network device
    const existing = await pool.query(
      'SELECT * FROM network_inventory_master WHERE id = $1',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Network device not found" });
    }

    const oldValue = existing.rows[0];
    const payload = { ...req.body };

    // Remove read-only/derived fields
    delete payload.id;
    delete payload.created_on;
    delete payload.updated_on;
    delete payload.plant_name;
    delete payload.transaction_id;

    // Convert empty strings to null for date fields
    const dateFields = ['purchased_date', 'verify_date', 'warranty_start_date', 'amc_warranty_expiry_date'];
    dateFields.forEach(field => {
      if (payload[field] === '' || payload[field] === null || payload[field] === undefined) {
        payload[field] = null;
      }
    });

    // Convert empty strings to null for optional string fields
    const optionalFields = [
      'area', 'rack', 'host_name', 'device_ip', 'device_model', 'device_type',
      'make_vendor', 'trunk_port', 'neighbor_switch_ip', 'neighbor_port',
      'sfp_fiber_tx', 'poe_non_poe', 'serial_no', 'ios_version', 'uptime',
      'stack_switch_details', 'purchase_vendor', 'purchased_po', 'sap_asset_no',
      'service_type', 'amc_vendor', 'remarks'
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

    // Convert boolean strings to actual booleans
   // ✅ Boolean fields (keep as-is)
const booleanFields = ['stack', 'under_amc'];
booleanFields.forEach(field => {
  if (payload[field] !== undefined && payload[field] !== '') {
    const val = String(payload[field]).toLowerCase();
    payload[field] = ['true', 'yes', '1'].includes(val);
  }
});

// ✅ dual_power_source as STRING enum (YES / NO / ATS)
if (payload.dual_power_source !== undefined && payload.dual_power_source !== null) {
  payload.dual_power_source = String(payload.dual_power_source).trim().toUpperCase();
}


    const newValue = { ...oldValue, ...payload };

    // Submit for approval
    const approvalId = await submitForApproval({
      module: "network",
      tableName: "network_inventory_master",
      action: "update",
      recordId: id,
      oldValue,
      newValue,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Update network device id ${id}`,
    });

    // If approval workflow is OFF → update immediately
    if (approvalId === null) {
      // Build dynamic UPDATE query
      const fields = Object.keys(payload);
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      const values = fields.map(f => payload[f]);
      values.push(id);

      const result = await pool.query(
        `UPDATE network_inventory_master 
         SET ${setClause}, updated_on = NOW() 
         WHERE id = $${values.length} 
         RETURNING *`,
        values
      );

      const updated = result.rows[0];

      await logActivity({
        userId,
        module: "network",
        tableName: "network_inventory_master",
        recordId: id,
        action: "update",
        oldValue,
        newValue: updated,
        comments: `Updated network device id ${id}`,
        reqMeta: req._meta || {},
      });

      return res.json(updated);
    }

    res.status(202).json({
      message: "Network device update submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: newValue,
    });

  } catch (err) {
    console.error("Error updating network device:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// DELETE NETWORK (WITH APPROVAL)
// ------------------------------
exports.deleteNetwork = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";
  const id = parseInt(req.params.id, 10);

  try {
    const existing = await pool.query(
      'SELECT * FROM network_inventory_master WHERE id = $1',
      [id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Network device not found" });
    }

    const oldValue = existing.rows[0];

    // Submit for approval
    const approvalId = await submitForApproval({
      module: "network",
      tableName: "network_inventory_master",
      action: "delete",
      recordId: id,
      oldValue,
      newValue: null,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Delete network device id ${id}`,
    });

    // If approval workflow is OFF → delete immediately
    if (approvalId === null) {
      await pool.query('DELETE FROM network_inventory_master WHERE id = $1', [id]);

      await logActivity({
        userId,
        module: "network",
        tableName: "network_inventory_master",
        recordId: id,
        action: "delete",
        oldValue,
        newValue: null,
        comments: `Deleted network device id ${id}`,
        reqMeta: req._meta || {},
      });

      return res.json({ success: true });
    }

    res.status(202).json({
      message: "Network device deletion submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: oldValue,
    });

  } catch (err) {
    console.error("Error deleting network device:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// BULK IMPORT NETWORK DEVICES
// ------------------------------
exports.bulkImportNetwork = async (req, res) => {
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
        delete record.transaction_id;

        // Convert empty strings to null for date fields
        const dateFields = ['purchased_date', 'verify_date', 'warranty_start_date', 'amc_warranty_expiry_date'];
        dateFields.forEach(field => {
          if (record[field] === '' || record[field] === null || record[field] === undefined) {
            record[field] = null;
          }
        });

        // Convert string IDs to integers
        if (record.plant_location_id) {
          record.plant_location_id = parseInt(record.plant_location_id, 10);
        }

        // Convert boolean strings to actual booleans
       // ✅ Boolean fields (keep as-is)
const booleanFields = ['stack', 'under_amc'];
booleanFields.forEach(field => {
  if (record[field] !== undefined && record[field] !== '') {
    const val = String(record[field]).toLowerCase();
    record[field] = ['true', 'yes', '1'].includes(val);
  }
});

// ✅ dual_power_source as STRING enum (YES / NO / ATS)
if (record.dual_power_source !== undefined && record.dual_power_source !== null) {
  record.dual_power_source = String(record.dual_power_source).trim().toUpperCase();
}


        // Set default status if not provided
        record.status = record.status || 'ACTIVE';

        // Submit for approval
        const approvalId = await submitForApproval({
          module: "network",
          tableName: "network_inventory_master",
          action: "create",
          recordId: null,
          oldValue: null,
          newValue: record,
          requestedBy: userId,
          requestedByUsername: username,
          comments: `Bulk import - Network: ${record.host_name || record.device_ip || `Record ${i + 1}`}`,
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
      module: "network",
      tableName: "network_inventory_master",
      recordId: null,
      action: "bulk_import",
      oldValue: null,
      newValue: { recordCount: records.length, approvalCount: approvalIds.length },
      comments: `Bulk imported ${records.length} network device records`,
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