const pool = require("../config/db");
const { logActivity } = require("../utils/activityLogger");
const { submitForApproval } = require("../utils/masterApprovalHelper");

// -------------------------------
// GET VENDOR ACTIVITY LOGS
// -------------------------------
exports.getVendorActivityLogs = async (req, res) => {
  try {
    const { rows: rawRows } = await pool.query(
      `SELECT * FROM activity_log
       WHERE table_name = 'vendor_master'
          OR (details IS NOT NULL AND details LIKE '%"tableName":"vendor_master"%')
       ORDER BY COALESCE(date_time_ist, NOW()) DESC`
    );

    const rows = rawRows.map((r) => {
      if (r.details) {
        try {
          const parsed = JSON.parse(r.details);
          r.table_name = r.table_name || parsed.tableName;
          r.old_value =
            r.old_value ||
            (parsed.old_value ? JSON.stringify(parsed.old_value) : null);
          r.new_value =
            r.new_value ||
            (parsed.new_value ? JSON.stringify(parsed.new_value) : null);
          r.action = r.action || parsed.action;
          r.action_performed_by =
            r.action_performed_by || parsed.userId || r.user_id;
        } catch (e) {}
      }
      return r;
    });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------
// GET ALL VENDORS (approved only)
// -------------------------------
exports.getAllVendors = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM vendor_master ORDER BY id"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------
// CREATE VENDOR (WITH APPROVAL)
// -------------------------------
exports.createVendor = async (req, res) => {
  const { vendor_name,code, description, status } = req.body;
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const newVendor = {
      vendor_name,
      description,
      code,
      status: status || "ACTIVE",
    };

    const approvalId = await submitForApproval({
      module: "vendors",
      tableName: "vendor_master",
      action: "create",
      recordId: null,
      oldValue: null,
      newValue: newVendor,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Create vendor: ${vendor_name}`,
    });

    // DIRECT ENTRY (if no approval required)
    if (approvalId === null) {
      const { rows } = await pool.query(
        "INSERT INTO vendor_master (vendor_name,vendor_code, description, status) VALUES ($1, $2, $3,$4) RETURNING *",
        [vendor_name,code, description, status || "ACTIVE"]
      );

      await logActivity({
        userId,
        module: "vendors",
        tableName: "vendor_master",
        recordId: rows[0].id,
        action: "create",
        oldValue: null,
        newValue: rows[0],
        comments: `Created vendor: ${vendor_name}`,
        reqMeta: req._meta || {},
      });

      return res.status(201).json(rows[0]);
    }

    // APPROVAL FLOW
    res.status(202).json({
      message: "Vendor creation submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: newVendor,
    });
  } catch (err) {
    console.error("Error creating vendor:", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------
// UPDATE VENDOR (WITH APPROVAL)
// -------------------------------
exports.updateVendor = async (req, res) => {
  const { id } = req.params;
  const { vendor_name, description, status } = req.body;

  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const oldRes = await pool.query(
      "SELECT * FROM vendor_master WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0];

    if (!oldValue) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const updatedVendor = {
      vendor_name,
      code,
      description,
      status,
    };

    const approvalId = await submitForApproval({
      module: "vendors",
      tableName: "vendor_master",
      action: "update",
      recordId: parseInt(id),
      oldValue,
      newValue: updatedVendor,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Update vendor: ${vendor_name}`,
    });

    // DIRECT UPDATE
    if (approvalId === null) {
      const { rows } = await pool.query(
        "UPDATE vendor_master SET vendor_name=$1, description=$2, status=$3,vendor_code=$5, updated_on=NOW() WHERE id=$4 RETURNING *",
        [vendor_name, description, status, id,code]
      );

      await logActivity({
        userId,
        module: "vendors",
        tableName: "vendor_master",
        recordId: id,
        action: "update",
        oldValue,
        newValue: rows[0],
        comments: `Updated vendor: ${vendor_name}`,
        reqMeta: req._meta || {},
      });

      return res.json(rows[0]);
    }

    res.status(202).json({
      message: "Vendor update submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: updatedVendor,
    });
  } catch (err) {
    console.error("Error updating vendor:", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------
// DELETE VENDOR (WITH APPROVAL)
// -------------------------------
exports.deleteVendor = async (req, res) => {
  const { id } = req.params;

  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const oldRes = await pool.query(
      "SELECT * FROM vendor_master WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0];

    if (!oldValue) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const approvalId = await submitForApproval({
      module: "vendors",
      tableName: "vendor_master",
      action: "delete",
      recordId: parseInt(id),
      oldValue,
      newValue: null,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Delete vendor: ${oldValue.vendor_name}`,
    });

    // DIRECT DELETE
    if (approvalId === null) {
      await pool.query("DELETE FROM vendor_master WHERE id=$1", [id]);

      await logActivity({
        userId,
        module: "vendors",
        tableName: "vendor_master",
        recordId: id,
        action: "delete",
        oldValue,
        newValue: null,
        comments: `Deleted vendor: ${oldValue.vendor_name}`,
        reqMeta: req._meta || {},
      });

      return res.status(204).end();
    }

    res.status(202).json({
      message: "Vendor deletion submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: oldValue,
    });
  } catch (err) {
    console.error("Error deleting vendor:", err);
    res.status(500).json({ error: err.message });
  }
};
// ------------------------------
// BULK IMPORT VENDORS
// ------------------------------
exports.bulkImportVendors = async (req, res) => {
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
          module: "Vendor Information",
          tableName: "vendor_master",
          action: "create",
          recordId: null,
          oldValue: null,
          newValue: record,
          requestedBy: userId,
          requestedByUsername: username,
          comments: `Bulk import - Vendor: ${record.vendor_name || `Record ${i + 1}`}`,
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
      module: "Vendor Information",
      tableName: "vendor_master",
      recordId: null,
      action: "bulk_import",
      oldValue: null,
      newValue: { recordCount: records.length, approvalCount: approvalIds.length },
      comments: `Bulk imported ${records.length} Vendor records`,
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
