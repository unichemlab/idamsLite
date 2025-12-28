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
      const columns = Object.keys(newSystemData).filter(k => k !== 'id' && k !== 'created_on' && k !== 'updated_on');
      const values = columns.map(k => newSystemData[k]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
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
      const fields = Object.keys(payload).filter(k => k !== 'id' && k !== 'created_on' && k !== 'updated_on');
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      const values = fields.map(f => payload[f]);
      values.push(id);

      const result = await pool.query(
        `UPDATE system_inventory_master 
         SET ${setClause}, updated_on = NOW() 
         WHERE id = $${values.length} 
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