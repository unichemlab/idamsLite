/**
 * @swagger
 * /api/plants:
 *   get:
 *     summary: Get all plants
 *     tags: [Plants]
 *     responses:
 *       200:
 *         description: List of plants
 *   post:
 *     summary: Add a new plant
 *     tags: [Plants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Plant created
 * /api/plants/{id}:
 *   put:
 *     summary: Edit a plant
 *     tags: [Plants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Plant updated
 */
const pool = require("../config/db");
const { logActivity } = require("../utils/activityLogger");

exports.getPlantActivityLogs = async (req, res) => {
  try {
    // Return rows that either have canonical table_name='plant_master'
    // or legacy/fallback rows where the details JSON contains tableName:'plant_master'.
    const { rows: rawRows } = await pool.query(
      `SELECT * FROM activity_log
       WHERE table_name = 'plant_master'
          OR (details IS NOT NULL AND details LIKE '%"tableName":"plant_master"%')
       ORDER BY COALESCE(date_time_ist, NOW()) DESC`
    );

    // Normalize rows: if a fallback 'details' column was used, extract old/new values
    const rows = rawRows.map((r) => {
      if (r.details) {
        try {
          const parsed = JSON.parse(r.details);
          // populate canonical-like fields so frontend filtering works
          r.table_name = r.table_name || parsed.tableName || r.table_name;
          r.old_value =
            r.old_value ||
            (parsed.old_value ? JSON.stringify(parsed.old_value) : null);
          r.new_value =
            r.new_value ||
            (parsed.new_value ? JSON.stringify(parsed.new_value) : null);
          r.action = r.action || parsed.action || r.action;
          // unify actor field
          r.action_performed_by =
            r.action_performed_by || r.user_id || parsed.userId || null;
        } catch (e) {
          // ignore parse errors and return raw row
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
    const { rows } = await pool.query("SELECT * FROM plant_master ORDER BY id");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPlant = async (req, res) => {
  const { plant_name, description, location } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO plant_master (plant_name, description, location) VALUES ($1, $2, $3) RETURNING *",
      [plant_name, description, location]
    );

    // Log creation activity (non-blocking)
    try {
      const logId = await logActivity({
        userId: req.user?.id || req.user?.user_id || null,
        module: "plant",
        tableName: "plant_master",
        recordId: rows[0].id,
        action: "create",
        oldValue: null,
        newValue: rows[0],
        comments: `Created plant: ${plant_name}`,
        reqMeta: req._meta || {},
      });
      if (!logId) {
        console.warn(
          "Activity log (createPlant) did not insert a row for record:",
          rows[0].id
        );
      } else {
        console.log("Activity log (createPlant) inserted id:", logId);
      }
    } catch (logErr) {
      console.warn(
        "Activity log (createPlant) failed:",
        logErr.message || logErr
      );
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePlant = async (req, res) => {
  const { id } = req.params;
  const { plant_name, description, location, status } = req.body;
  try {
    // fetch old value
    const oldRes = await pool.query("SELECT * FROM plant_master WHERE id=$1", [
      id,
    ]);
    const oldValue = oldRes.rows[0] || null;

    const { rows } = await pool.query(
      "UPDATE plant_master SET plant_name=$1, description=$2, location=$3, status=$4, updated_on=NOW() WHERE id=$5 RETURNING *",
      [plant_name, description, location, status, id]
    );

    // Log update activity (non-blocking)
    try {
      const logId = await logActivity({
        userId: req.user?.id || req.user?.user_id || null,
        module: "plant",
        tableName: "plant_master",
        recordId: id,
        action: "update",
        oldValue,
        newValue: rows[0],
        comments: `Updated plant: ${plant_name}`,
        reqMeta: req._meta || {},
      });
      if (!logId) {
        console.warn(
          "Activity log (updatePlant) did not insert a row for record:",
          id
        );
      } else {
        console.log("Activity log (updatePlant) inserted id:", logId);
      }
    } catch (logErr) {
      console.warn(
        "Activity log (updatePlant) failed:",
        logErr.message || logErr
      );
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePlant = async (req, res) => {
  const { id } = req.params;
  try {
    // fetch old value first
    const oldRes = await pool.query("SELECT * FROM plant_master WHERE id=$1", [
      id,
    ]);
    const oldValue = oldRes.rows[0] || null;

    await pool.query("DELETE FROM plant_master WHERE id=$1", [id]);

    // Log deletion activity (non-blocking)
    try {
      const logId = await logActivity({
        userId: req.user?.id || req.user?.user_id || null,
        module: "plant",
        tableName: "plant_master",
        recordId: id,
        action: "delete",
        oldValue,
        newValue: null,
        comments: `Deleted plant id: ${id}`,
        reqMeta: req._meta || {},
      });
      if (!logId) {
        console.warn(
          "Activity log (deletePlant) did not insert a row for record:",
          id
        );
      } else {
        console.log("Activity log (deletePlant) inserted id:", logId);
      }
    } catch (logErr) {
      console.warn(
        "Activity log (deletePlant) failed:",
        logErr.message || logErr
      );
    }

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
