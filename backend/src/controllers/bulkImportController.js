const { logActivity } = require("../utils/activityLogger");
const { submitForApproval } = require("../utils/masterApprovalHelper");
const pool = require("../config/db");

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



// // Export both functions
// module.exports = {
//   bulkImportSystemInventory,
//   bulkImportServerInventory
// };