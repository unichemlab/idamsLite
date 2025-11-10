const pool = require("../config/db");
const { logActivity } = require("../utils/activityLogger");

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

exports.createVendor = async (req, res) => {
  const { vendor_name, description } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO vendor_master (vendor_name, description) VALUES ($1, $2) RETURNING *",
      [vendor_name, description]
    );
    // Log creation (non-blocking)
    try {
      const logId = await logActivity({
        userId: req.user?.id || req.user?.user_id || null,
        module: "vendor",
        tableName: "vendor_master",
        recordId: rows[0].id,
        action: "create",
        oldValue: null,
        newValue: rows[0],
        comments: `Created vendor: ${vendor_name}`,
        reqMeta: req._meta || {},
      });
      if (!logId)
        console.warn(
          "Activity log (createVendor) did not insert a row for record:",
          rows[0].id
        );
      else console.log("Activity log (createVendor) inserted id:", logId);
    } catch (logErr) {
      console.warn(
        "Activity log (createVendor) failed:",
        logErr.message || logErr
      );
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateVendor = async (req, res) => {
  const { id } = req.params;
  const { vendor_name, description, location, status } = req.body;
  try {
    // fetch old value
    const oldRes = await pool.query("SELECT * FROM vendor_master WHERE id=$1", [
      id,
    ]);
    const oldValue = oldRes.rows[0] || null;

    const { rows } = await pool.query(
      "UPDATE vendor_master SET vendor_name=$1, description=$2, status=$3, updated_on=NOW() WHERE id=$4 RETURNING *",
      [vendor_name, description, status, id]
    );

    // Log update activity (non-blocking)
    try {
      const logId = await logActivity({
        userId: req.user?.id || req.user?.user_id || null,
        module: "vendor",
        tableName: "vendor_master",
        recordId: id,
        action: "update",
        oldValue,
        newValue: rows[0],
        comments: `Updated vendor: ${vendor_name}`,
        reqMeta: req._meta || {},
      });
      if (!logId)
        console.warn(
          "Activity log (updateVendor) did not insert a row for record:",
          id
        );
      else console.log("Activity log (updateVendor) inserted id:", logId);
    } catch (logErr) {
      console.warn(
        "Activity log (updateVendor) failed:",
        logErr.message || logErr
      );
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteVendor = async (req, res) => {
  const { id } = req.params;
  try {
    // get old value
    const oldRes = await pool.query("SELECT * FROM vendor_master WHERE id=$1", [
      id,
    ]);
    const oldValue = oldRes.rows[0] || null;

    await pool.query("DELETE FROM vendor_master WHERE id=$1", [id]);

    // Log deletion activity (non-blocking)
    try {
      const logId = await logActivity({
        userId: req.user?.id || req.user?.user_id || null,
        module: "vendor",
        tableName: "vendor_master",
        recordId: id,
        action: "delete",
        oldValue,
        newValue: null,
        comments: `Deleted vendor id: ${id}`,
        reqMeta: req._meta || {},
      });
      if (!logId)
        console.warn(
          "Activity log (deleteVendor) did not insert a row for record:",
          id
        );
      else console.log("Activity log (deleteVendor) inserted id:", logId);
    } catch (logErr) {
      console.warn(
        "Activity log (deleteVendor) failed:",
        logErr.message || logErr
      );
    }

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
