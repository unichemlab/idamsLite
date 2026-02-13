const pool = require("../config/db");
const { logActivity } = require("../utils/activityLogger");
const { submitForApproval } = require("../utils/masterApprovalHelper");

exports.getPlantActivityLogs = async (req, res) => {
  try {
    const { rows: rawRows } = await pool.query(
      `SELECT * FROM activity_log
       WHERE table_name = 'plant_master'
          OR (details IS NOT NULL AND details LIKE '%"tableName":"plant_master"%')
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
    res.status(500).json({ error: err.message });
  }
};

exports.getAllPlants = async (req, res) => {
  try {
    // Only return approved plants (not those pending approval)
    const { rows } = await pool.query(
      "SELECT * FROM plant_master where status='ACTIVE' ORDER BY plant_name ASC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPlant = async (req, res) => {
  const { plant_name, description, location, status } = req.body;
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const newPlantData = {
      plant_name,
      description,
      location,
      status: status || "ACTIVE",
    };

    // Submit for approval instead of direct creation
    const approvalId = await submitForApproval({
      module: "plant",
      tableName: "plant_master",
      action: "create",
      recordId: null,
      oldValue: null,
      newValue: newPlantData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Create new plant: ${plant_name}`,
    });

    if (approvalId === null) {
      // Approval not required, create directly
      const { rows } = await pool.query(
        "INSERT INTO plant_master (plant_name, description, location, status) VALUES ($1, $2, $3, $4) RETURNING *",
        [plant_name, description, location, status || "ACTIVE"]
      );

      // Log creation activity
      try {
        await logActivity({
          userId,
          module: "plant",
          tableName: "plant_master",
          recordId: rows[0].id,
          action: "create",
          oldValue: null,
          newValue: rows[0],
          comments: `Created plant: ${plant_name}`,
          reqMeta: req._meta || {},
        });
      } catch (logErr) {
        console.warn("Activity log failed:", logErr.message);
      }

      return res.status(201).json(rows[0]);
    }

    // Return approval pending response
    res.status(202).json({
      message: "Plant creation submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: newPlantData,
    });
  } catch (err) {
    console.error("Error creating plant:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.updatePlant = async (req, res) => {
  const { id } = req.params;
  const { plant_name, description, location, status } = req.body;
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    // Fetch old value
    const oldRes = await pool.query(
      "SELECT * FROM plant_master WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0] || null;

    if (!oldValue) {
      return res.status(404).json({ error: "Plant not found" });
    }

    const updatedPlantData = {
      plant_name,
      description,
      location,
      status,
    };

    // Submit for approval instead of direct update
    const approvalId = await submitForApproval({
      module: "plant",
      tableName: "plant_master",
      action: "update",
      recordId: parseInt(id),
      oldValue,
      newValue: updatedPlantData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Update plant: ${plant_name}`,
    });

    if (approvalId === null) {
      // Approval not required, update directly
      const { rows } = await pool.query(
        "UPDATE plant_master SET plant_name=$1, description=$2, location=$3, status=$4, updated_on=NOW() WHERE id=$5 RETURNING *",
        [plant_name, description, location, status, id]
      );

      // Log update activity
      try {
        await logActivity({
          userId,
          module: "plant",
          tableName: "plant_master",
          recordId: id,
          action: "update",
          oldValue,
          newValue: rows[0],
          comments: `Updated plant: ${plant_name}`,
          reqMeta: req._meta || {},
        });
      } catch (logErr) {
        console.warn("Activity log failed:", logErr.message);
      }

      return res.json(rows[0]);
    }

    // Return approval pending response
    res.status(202).json({
      message: "Plant update submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: updatedPlantData,
    });
  } catch (err) {
    console.error("Error updating plant:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.deletePlant = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    // Fetch old value first
    const oldRes = await pool.query(
      "SELECT * FROM plant_master WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0] || null;

    if (!oldValue) {
      return res.status(404).json({ error: "Plant not found" });
    }

    // Submit for approval instead of direct deletion
    const approvalId = await submitForApproval({
      module: "plant",
      tableName: "plant_master",
      action: "delete",
      recordId: parseInt(id),
      oldValue,
      newValue: null,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Delete plant: ${oldValue.plant_name}`,
    });

    if (approvalId === null) {
      // Approval not required, delete directly
      await pool.query("DELETE FROM plant_master WHERE id=$1", [id]);

      // Log deletion activity
      try {
        await logActivity({
          userId,
          module: "plant",
          tableName: "plant_master",
          recordId: id,
          action: "delete",
          oldValue,
          newValue: null,
          comments: `Deleted plant id: ${id}`,
          reqMeta: req._meta || {},
        });
      } catch (logErr) {
        console.warn("Activity log failed:", logErr.message);
      }

      return res.status(204).end();
    }

    // Return approval pending response
    res.status(202).json({
      message: "Plant deletion submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: oldValue,
    });
  } catch (err) {
    console.error("Error deleting plant:", err);
    res.status(500).json({ error: err.message });
  }
};
// ------------------------------
// BULK IMPORT PLANTS
// ------------------------------
exports.bulkImportPlants = async (req, res) => {
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
          module: "PLANT",
          tableName: "plant_master",
          action: "create",
          recordId: null,
          oldValue: null,
          newValue: record,
          requestedBy: userId,
          requestedByUsername: username,
          comments: `Bulk import - Plant: ${record.plant_name || `Record ${i + 1}`}`,
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
      module: "plant",
      tableName: "plant_master",
      recordId: null,
      action: "bulk_import",
      oldValue: null,
      newValue: { recordCount: records.length, approvalCount: approvalIds.length },
      comments: `Bulk imported ${records.length} plant records`,
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