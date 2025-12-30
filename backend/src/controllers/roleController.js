/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     responses:
 *       200:
 *         description: List of roles
 *   post:
 *     summary: Add a new role
 *     tags: [Roles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Role created
 * /api/roles/{id}:
 *   put:
 *     summary: Edit a role
 *     tags: [Roles]
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
 *         description: Role updated
 */
const pool = require("../config/db");
const { logActivity } = require("../utils/activityLogger");
const { submitForApproval } = require("../utils/masterApprovalHelper");

// -------------------------------
// GET ROLE ACTIVITY LOGS
// -------------------------------
exports.getRoleActivityLogs = async (req, res) => {
  try {
    const { rows: rawRows } = await pool.query(
      `SELECT * FROM activity_log
       WHERE table_name = 'role_master'
          OR (details IS NOT NULL AND details LIKE '%"tableName":"role_master"%')
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
// GET ALL ROLES (approved only)
// -------------------------------
exports.getAllRoles = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM role_master where status='ACTIVE' ORDER BY id");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------
// CREATE ROLE
// -------------------------------
exports.createRole = async (req, res) => {
  const { role_name, description, status } = req.body;
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const newRoleData = {
      role_name,
      description,
      status: status || "ACTIVE",
    };

    // Submit for approval workflow
    const approvalId = await submitForApproval({
      module: "roles",
      tableName: "role_master",
      action: "create",
      recordId: null,
      oldValue: null,
      newValue: newRoleData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Create role: ${role_name}`,
    });

    if (approvalId === null) {
      // Create directly
      const { rows } = await pool.query(
        "INSERT INTO role_master (role_name, description, status) VALUES ($1, $2, $3) RETURNING *",
        [role_name, description, status || "ACTIVE"]
      );

      await logActivity({
        userId,
        module: "roles",
        tableName: "role_master",
        recordId: rows[0].id,
        action: "create",
        oldValue: null,
        newValue: rows[0],
        comments: `Created role: ${role_name}`,
        reqMeta: req._meta || {},
      });

      return res.status(201).json(rows[0]);
    }

    res.status(202).json({
      message: "Role creation submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: newRoleData,
    });
  } catch (err) {
    console.error("Error creating role:", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------
// UPDATE ROLE
// -------------------------------
exports.updateRole = async (req, res) => {
  const { id } = req.params;
  const { role_name, description, status } = req.body;

  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const oldRes = await pool.query(
      "SELECT * FROM role_master WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0];

    if (!oldValue) {
      return res.status(404).json({ error: "Role not found" });
    }

    const updatedRoleData = {
      role_name,
      description,
      status,
    };

    const approvalId = await submitForApproval({
      module: "roles",
      tableName: "role_master",
      action: "update",
      recordId: parseInt(id),
      oldValue,
      newValue: updatedRoleData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Update role: ${role_name}`,
    });

    if (approvalId === null) {
      const { rows } = await pool.query(
        "UPDATE role_master SET role_name=$1, description=$2, status=$3, updated_on=NOW() WHERE id=$4 RETURNING *",
        [role_name, description, status, id]
      );

      await logActivity({
        userId,
        module: "roles",
        tableName: "role_master",
        recordId: id,
        action: "update",
        oldValue,
        newValue: rows[0],
        comments: `Updated role: ${role_name}`,
        reqMeta: req._meta || {},
      });

      return res.json(rows[0]);
    }

    res.status(202).json({
      message: "Role update submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: updatedRoleData,
    });
  } catch (err) {
    console.error("Error updating role:", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------
// DELETE ROLE
// -------------------------------
exports.deleteRole = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const oldRes = await pool.query(
      "SELECT * FROM role_master WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0];

    if (!oldValue) {
      return res.status(404).json({ error: "Role not found" });
    }

    const approvalId = await submitForApproval({
      module: "roles",
      tableName: "role_master",
      action: "delete",
      recordId: parseInt(id),
      oldValue,
      newValue: null,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Delete role: ${oldValue.role_name}`,
    });

    if (approvalId === null) {
      await pool.query("DELETE FROM role_master WHERE id=$1", [id]);

      await logActivity({
        userId,
        module: "roles",
        tableName: "role_master",
        recordId: id,
        action: "delete",
        oldValue,
        newValue: null,
        comments: `Deleted role: ${oldValue.role_name}`,
        reqMeta: req._meta || {},
      });

      return res.status(204).end();
    }

    res.status(202).json({
      message: "Role deletion submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: oldValue,
    });
  } catch (err) {
    console.error("Error deleting role:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = exports;