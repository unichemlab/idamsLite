const pool = require("../config/db");
const { logActivity } = require("../utils/activityLogger");

// Get Department Activity Logs (normalizes legacy `details` rows)
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

// Get All Departments
exports.getAllDepartments = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM department_master ORDER BY id"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Department
exports.createDepartment = async (req, res) => {
  const { department_name, description, status } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO department_master (department_name, description, status) VALUES ($1, $2, $3) RETURNING *",
      [department_name, description, status ?? "ACTIVE"]
    );
    // Log creation (non-blocking)
    try {
      const logId = await logActivity({
        userId: req.user?.id || req.user?.user_id || null,
        module: "department",
        tableName: "department_master",
        recordId: rows[0].id,
        action: "create",
        oldValue: null,
        newValue: rows[0],
        comments: `Created department: ${department_name}`,
        reqMeta: req._meta || {},
      });
      if (!logId)
        console.warn(
          "Activity log (createDepartment) did not insert a row for record:",
          rows[0].id
        );
      else console.log("Activity log (createDepartment) inserted id:", logId);
    } catch (logErr) {
      console.warn(
        "Activity log (createDepartment) failed:",
        logErr.message || logErr
      );
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Department
exports.updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { department_name, description, status } = req.body;
  try {
    // fetch old value
    const oldRes = await pool.query(
      "SELECT * FROM department_master WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0] || null;

    const { rows } = await pool.query(
      "UPDATE department_master SET department_name=$1, description=$2, status=$3, updated_on=NOW() WHERE id=$4 RETURNING *",
      [department_name, description, status, id]
    );

    // Log update activity (non-blocking)
    try {
      const logId = await logActivity({
        userId: req.user?.id || req.user?.user_id || null,
        module: "department",
        tableName: "department_master",
        recordId: id,
        action: "update",
        oldValue,
        newValue: rows[0],
        comments: `Updated department: ${department_name}`,
        reqMeta: req._meta || {},
      });
      if (!logId)
        console.warn(
          "Activity log (updateDepartment) did not insert a row for record:",
          id
        );
      else console.log("Activity log (updateDepartment) inserted id:", logId);
    } catch (logErr) {
      console.warn(
        "Activity log (updateDepartment) failed:",
        logErr.message || logErr
      );
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Department
exports.deleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    // get old value
    const oldRes = await pool.query(
      "SELECT * FROM department_master WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0] || null;

    await pool.query("DELETE FROM department_master WHERE id=$1", [id]);

    // Log deletion activity (non-blocking)
    try {
      const logId = await logActivity({
        userId: req.user?.id || req.user?.user_id || null,
        module: "department",
        tableName: "department_master",
        recordId: id,
        action: "delete",
        oldValue,
        newValue: null,
        comments: `Deleted department id: ${id}`,
        reqMeta: req._meta || {},
      });
      if (!logId)
        console.warn(
          "Activity log (deleteDepartment) did not insert a row for record:",
          id
        );
      else console.log("Activity log (deleteDepartment) inserted id:", logId);
    } catch (logErr) {
      console.warn(
        "Activity log (deleteDepartment) failed:",
        logErr.message || logErr
      );
    }

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
