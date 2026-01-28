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
// CREATE VENDOR (WITH APPROVAL) - FIXED
exports.createVendor = async (req, res) => {
  const { vendor_name, vendor_code, description, status } = req.body;
  
  console.log("═══════════════════════════════════════════════════════════");
  console.log("CREATE VENDOR - DEBUG INFO");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Request Body:", req.body);
  console.log("Extracted Values:");
  console.log("  - vendor_name:", vendor_name);
  console.log("  - vendor_code:", vendor_code);
  console.log("  - description:", description);
  console.log("  - status:", status);
  console.log("═══════════════════════════════════════════════════════════");
  
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const newVendor = {
      vendor_name,
      vendor_code,
      description,
      status: status || "ACTIVE",
    };

    console.log("NEW VENDOR OBJECT:", newVendor);

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
      console.log("⚡ NO APPROVAL REQUIRED - INSERTING DIRECTLY");
      
      // ✅ FIXED: Use vendor_code instead of code
      const insertQuery = `
        INSERT INTO vendor_master (vendor_name, vendor_code, description, status) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `;
      
      const insertParams = [vendor_name, vendor_code, description, status || "ACTIVE"];
      
      console.log("SQL Query:", insertQuery);
      console.log("SQL Parameters:", insertParams);
      console.log("  $1 (vendor_name):", vendor_name);
      console.log("  $2 (vendor_code):", vendor_code);
      console.log("  $3 (description):", description);
      console.log("  $4 (status):", status || "ACTIVE");
      
      const { rows } = await pool.query(insertQuery, insertParams);

      console.log("✅ DATABASE INSERT SUCCESSFUL!");
      console.log("INSERTED ROW:", rows[0]);
      console.log("═══════════════════════════════════════════════════════════");

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
    console.log("📋 SUBMITTED FOR APPROVAL - ID:", approvalId);
    console.log("═══════════════════════════════════════════════════════════");
    
    res.status(202).json({
      message: "Vendor creation submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: newVendor,
    });
  } catch (err) {
    console.error("❌ ERROR CREATING VENDOR:", err);
    console.log("═══════════════════════════════════════════════════════════");
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------
// UPDATE VENDOR (WITH APPROVAL)
// -------------------------------
// UPDATE VENDOR (WITH APPROVAL) - FIXED
exports.updateVendor = async (req, res) => {
  const { id } = req.params;
  const { vendor_name, description, vendor_code, status } = req.body;
  
  console.log("═══════════════════════════════════════════════════════════");
  console.log("UPDATE VENDOR - DEBUG INFO");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Vendor ID:", id);
  console.log("Request Body:", req.body);
  console.log("Extracted Values:");
  console.log("  - vendor_name:", vendor_name);
  console.log("  - vendor_code:", vendor_code);
  console.log("  - description:", description);
  console.log("  - status:", status);
  console.log("═══════════════════════════════════════════════════════════");
  
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

    console.log("OLD VALUE FROM DATABASE:", oldValue);

    const updatedVendor = {
      vendor_name,
      vendor_code,
      description,
      status,
    };

    console.log("NEW VALUE TO UPDATE:", updatedVendor);

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

    // DIRECT UPDATE (NO APPROVAL REQUIRED)
    if (approvalId === null) {
      console.log("⚡ NO APPROVAL REQUIRED - UPDATING DIRECTLY");
      
      // ✅ FIXED: Correct parameter order
      const updateQuery = `
        UPDATE vendor_master 
        SET 
          vendor_name = $1, 
          vendor_code = $2, 
          description = $3, 
          status = $4, 
          updated_on = NOW() 
        WHERE id = $5 
        RETURNING *
      `;
      
      const updateParams = [vendor_name, vendor_code, description, status, id];
      
      console.log("SQL Query:", updateQuery);
      console.log("SQL Parameters:", updateParams);
      console.log("  $1 (vendor_name):", vendor_name);
      console.log("  $2 (vendor_code):", vendor_code);
      console.log("  $3 (description):", description);
      console.log("  $4 (status):", status);
      console.log("  $5 (id):", id);
      
      const { rows } = await pool.query(updateQuery, updateParams);

      console.log("✅ DATABASE UPDATE SUCCESSFUL!");
      console.log("UPDATED ROW:", rows[0]);
      console.log("═══════════════════════════════════════════════════════════");

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

    // APPROVAL FLOW
    console.log("📋 SUBMITTED FOR APPROVAL - ID:", approvalId);
    console.log("═══════════════════════════════════════════════════════════");
    
    res.status(202).json({
      message: "Vendor update submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: updatedVendor,
    });
  } catch (err) {
    console.error("❌ ERROR UPDATING VENDOR:", err);
    console.log("═══════════════════════════════════════════════════════════");
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
