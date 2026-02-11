const pool = require("../config/db");
const { logActivity } = require("../utils/activityLogger");
const { submitForApproval } = require("../utils/masterApprovalHelper");
const { filterByPlantAccess, canAccessPlant } = require("../middleware/permissionMiddleware");


const isSuperAdmin = (user) => {
  if (!user) return false;
  
  // Check role_id directly
  if (user.role_id === 1) return true;
  if (Array.isArray(user.role_id) && user.role_id.includes(1)) return true;
  
  // Check roles array
  if (Array.isArray(user.roles) && user.roles.includes(1)) return true;
  if (user.roles === 1) return true;
  
  return false;
};
// -------------------------------
// GET ALL SERVERS (approved only)
// -------------------------------
exports.getAllServers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, p.plant_name FROM server_inventory_master s
      LEFT JOIN plant_master p ON s.plant_location_id = p.id
      ORDER BY id ASC`
    );
    if (isSuperAdmin(req.user)) {
          return res.status(200).json(result.rows);
        }
        
        // 🔥 Filter by user's plant access for non-super-admins
        const filteredApps = filterByPlantAccess(result.rows, req.user);
        
        res.status(200).json(filteredApps);
  } catch (err) {
    console.error("Error fetching servers:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// -------------------------------
// GET SERVER BY ID
// -------------------------------
exports.getServerById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const result = await pool.query(
      "SELECT * FROM server_inventory_master WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Server not found" });

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching server by id:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// COMMON FIELDS
const fields = [
  "transaction_id",
  "plant_location_id",
  "rack_number",
  "server_owner",
  "type_tower_rack_mounted",
  "server_rack_location_area",
  "asset_no",
  "host_name",
  "make",
  "model",
  "serial_no",
  "os",
  "physical_server_host_name",
  "idrac_ilo",
  "ip_address",
  "part_no",
  "application",
  "application_version",
  "application_oem",
  "application_vendor",
  "system_owner",
  "vm_display_name",
  "vm_type",
  "vm_os",
  "vm_version",
  "vm_server_ip",
  "domain_workgroup",
  "windows_activated",
  "backup_agent",
  "antivirus",
  "category_gxp",
  "current_status",
  "server_managed_by",
  "remarks_application_usage",
  "start_date",
  "end_date",
  "aging",
  "environment",
  "server_criticality",
  "database_application",
  "current_rpo",
  "reduce_rpo_time",
  "server_to_so_timeline",
  "purchased_date",
  "purchased_po",
  "warranty_start_date",
  "amc_warranty_expiry_date",
  "sap_asset_no",
  "amc_vendor",
  "remarks",
  "status",
];

// -------------------------------
// CREATE SERVER (with approval)
// -------------------------------
exports.addServer = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const newServerData = {};
    fields.forEach((f) => (newServerData[f] = req.body[f]));

    // Submit for approval
    const approvalId = await submitForApproval({
      module: "server-inventory",
      tableName: "server_inventory_master",
      action: "create",
      recordId: null,
      oldValue: null,
      newValue: newServerData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Create server: ${req.body.host_name || "N/A"}`,
    });

    // If approval NOT required → insert directly
    if (approvalId === null) {
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(",");
      const values = fields.map((f) => req.body[f]);

      const query = `
        INSERT INTO server_inventory_master 
        (${fields.join(",")}, created_on, updated_on)
        VALUES (${placeholders}, NOW(), NOW())
        RETURNING *`;

      const result = await pool.query(query, [...values]);

      await logActivity({
        userId,
        module: "server-inventory",
        tableName: "server_inventory_master",
        recordId: result.rows[0].id,
        action: "create",
        oldValue: null,
        newValue: result.rows[0],
        comments: `Created server: ${result.rows[0].host_name}`,
        reqMeta: req._meta || {},
      });

      return res.status(201).json(result.rows[0]);
    }

    // Approval pending
    res.status(202).json({
      message: "Server creation submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: newServerData,
    });
  } catch (err) {
    console.error("Error adding server:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// -------------------------------
// UPDATE SERVER (with approval)
// -------------------------------
exports.updateServer = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    // Fetch old record
    const oldRes = await pool.query(
      "SELECT * FROM server_inventory_master WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0];

    if (!oldValue)
      return res.status(404).json({ error: "Server not found" });

    const updatedServerData = {};
    fields.forEach((f) => (updatedServerData[f] = req.body[f]));

    // Submit for approval
    const approvalId = await submitForApproval({
      module: "server-inventory",
      tableName: "server_inventory_master",
      action: "update",
      recordId: id,
      oldValue,
      newValue: updatedServerData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Update server: ${req.body.host_name || oldValue.host_name}`,
    });

    // Approval NOT required → update directly
    if (approvalId === null) {
      const setClause = fields
        .map((f, i) => `${f} = $${i + 1}`)
        .join(", ");
      const values = fields.map((f) => req.body[f]);

      const query = `
        UPDATE server_inventory_master
        SET ${setClause}, updated_on = NOW()
        WHERE id = $${fields.length + 1}
        RETURNING *`;

      const result = await pool.query(query, [...values, id]);

      await logActivity({
        userId,
        module: "server-inventory",
        tableName: "server_inventory_master",
        recordId: id,
        action: "update",
        oldValue,
        newValue: result.rows[0],
        comments: `Updated server: ${result.rows[0].host_name}`,
        reqMeta: req._meta || {},
      });

      return res.status(200).json(result.rows[0]);
    }

    // Approval pending
    res.status(202).json({
      message: "Server update submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: updatedServerData,
    });
  } catch (err) {
    console.error("Error updating server:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// -------------------------------
// DELETE SERVER (with approval)
// -------------------------------
exports.deleteServer = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const oldRes = await pool.query(
      "SELECT * FROM server_inventory_master WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0];

    if (!oldValue)
      return res.status(404).json({ error: "Server not found" });

    const approvalId = await submitForApproval({
      module: "server-inventory",
      tableName: "server_inventory_master",
      action: "delete",
      recordId: id,
      oldValue,
      newValue: null,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Delete server: ${oldValue.host_name}`,
    });

    // If no approval required → delete directly
    if (approvalId === null) {
      await pool.query(
        "DELETE FROM server_inventory_master WHERE id = $1",
        [id]
      );

      await logActivity({
        userId,
        module: "server-inventory",
        tableName: "server_inventory_master",
        recordId: id,
        action: "delete",
        oldValue,
        newValue: null,
        comments: `Deleted server: ${oldValue.host_name}`,
        reqMeta: req._meta || {},
      });

      return res.status(200).json({ message: "Server deleted successfully" });
    }

    res.status(202).json({
      message: "Server deletion submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: oldValue,
    });
  } catch (err) {
    console.error("Error deleting server:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ------------------------------
// BULK IMPORT SERVER INVENTORY
// ------------------------------
exports.bulkImportServerInventory = async (req, res) => {
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
        delete record.transaction_id;

        // Convert empty strings to null for date fields
        const dateFields = ['start_date', 'end_date', 'purchase_date', 'warranty_new_start_date', 'amc_warranty_expiry_date'];
        dateFields.forEach(field => {
          if (record[field] === '' || record[field] === null || record[field] === undefined) {
            record[field] = null;
          }
        });

        // Convert string IDs to integers
        if (record.plant_location_id) {
          record.plant_location_id = parseInt(record.plant_location_id, 10);
        }
        if (record.purchase_po) {
          record.purchase_po = parseInt(record.purchase_po, 10);
        }
        if (record.windows_activated !== undefined) {
          record.windows_activated = parseInt(record.windows_activated, 10);
        }

        // Convert boolean strings to actual booleans
        const booleanFields = [
          'part_no',
          'server_managed_by',
          'current_rpo',
          'sap_asset_no',
          'amc_vendor'
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
          module: "server",
          tableName: "server_inventory_master",
          action: "create",
          recordId: null,
          oldValue: null,
          newValue: record,
          requestedBy: userId,
          requestedByUsername: username,
          comments: `Bulk import - Server: ${record.host_name || `Record ${i + 1}`}`,
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
      module: "server",
      tableName: "server_inventory_master",
      recordId: null,
      action: "bulk_import",
      oldValue: null,
      newValue: { recordCount: records.length, approvalCount: approvalIds.length },
      comments: `Bulk imported ${records.length} server inventory records`,
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

module.exports = exports;