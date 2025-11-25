// backend/controllers/rbac.js (CommonJS Version)
const db = require("../config/db");
const { sendEmail } = require("../utils/email");
const { getApprovalEmail } = require("../utils/emailTemplate");
const path = require("path");

/* -------------------------------------------------
   CANONICAL USER RESOLVER (employee_code → employee_id → id)
-------------------------------------------------- */
async function resolveCanonicalUserKey(rawKey) {
  try {
    const q = `
      SELECT 
        id, 
        employee_id, 
        employee_code, 
        transaction_id
      FROM user_master
      WHERE id::text = $1::text
         OR employee_id::text = $1::text
         OR employee_code::text = $1::text
         OR transaction_id::text = $1::text
      LIMIT 1
    `;

    // ⬅️ PRINT QUERY + VALUE
    console.log("resolveCanonicalUserKey() QUERY:");
    console.log(q);
    console.log("PARAM:", rawKey);

    const r = await db.query(q, [rawKey]);

    console.log("User Lookup Result:", r.rows);

    if (r.rows?.length > 0) {
      console.log("Resolved User Key:", r.rows[0]);
      return r.rows[0].id;
    }
  } catch (e) {
    console.warn("[resolveCanonicalUserKey] lookup failed:", e);
  }

  return rawKey; // fallback
}


/* -------------------------------------------------
   ROLE MASTER
-------------------------------------------------- */
exports.getRoles = async (req, res) => {
  try {
    const q = `SELECT * FROM rbac_role_master ORDER BY id`;
    const r = await db.query(q);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to fetch roles" });
  }
};

exports.createRole = async (req, res) => {
  try {
    const { role_name, description } = req.body;
    const q = `
      INSERT INTO rbac_role_master (role_name, description)
      VALUES ($1,$2)
      RETURNING *
    `;
    const r = await db.query(q, [role_name, description || null]);
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to create role" });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const id = req.params.id;
    const { role_name, description } = req.body;

    const q = `
      UPDATE rbac_role_master 
      SET role_name=$1, description=$2, updated_on=NOW()
      WHERE id=$3
      RETURNING *
    `;
    const r = await db.query(q, [role_name, description || null, id]);
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to update role" });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query(`DELETE FROM rbac_role_master WHERE id=$1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to delete role" });
  }
};

/* -------------------------------------------------
   PERMISSION MASTER
-------------------------------------------------- */
exports.getPermissions = async (req, res) => {
  try {
    const q = `SELECT * FROM rbac_permission_master ORDER BY id`;
    const r = await db.query(q);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to fetch permissions" });
  }
};

exports.createPermission = async (req, res) => {
  try {
    const { module_name } = req.body;
    const q = `
      INSERT INTO rbac_permission_master (module_name)
      VALUES ($1)
      RETURNING *
    `;
    const r = await db.query(q, [module_name]);
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to create permission" });
  }
};

exports.deletePermission = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query(`DELETE FROM rbac_permission_master WHERE id=$1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to delete permission" });
  }
};

/* -------------------------------------------------
   ROLE → PERMISSION (MATRIX)
-------------------------------------------------- */
exports.getRolePermissions = async (req, res) => {
  try {
    const q = `
      SELECT rpm.*, r.role_name, p.module_name
      FROM rbac_role_permission_map rpm
      JOIN rbac_role_master r ON r.id = rpm.role_id
      JOIN rbac_permission_master p ON p.id = rpm.permission_id
      ORDER BY rpm.id
    `;
    const r = await db.query(q);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to fetch role-permissions" });
  }
};

exports.assignRolePermission = async (req, res) => {
  try {
    const { role_id, permission_id, can_add, can_edit, can_view, can_delete } = req.body;

    const q = `
      INSERT INTO rbac_role_permission_map
      (role_id, permission_id, can_add, can_edit, can_view, can_delete)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (role_id, permission_id) DO UPDATE SET
        can_add = EXCLUDED.can_add,
        can_edit = EXCLUDED.can_edit,
        can_view = EXCLUDED.can_view,
        can_delete = EXCLUDED.can_delete,
        updated_on = NOW()
      RETURNING *
    `;

    const r = await db.query(q, [
      role_id,
      permission_id,
      !!can_add,
      !!can_edit,
      !!can_view,
      !!can_delete,
    ]);

    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to assign role permission" });
  }
};

exports.removeRolePermission = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query(`DELETE FROM rbac_role_permission_map WHERE id=$1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to remove role permission" });
  }
};

/* -------------------------------------------------
   USER PLANT PERMISSIONS
-------------------------------------------------- */
exports.getUserPlantPermissions = async (req, res) => {
  const rawUserId = req.params.userId;

  try {
    const canonical = await resolveCanonicalUserKey(rawUserId);

    const query = `
      SELECT upp.*, p.module_name
      FROM rbac_user_plant_permission upp
      JOIN rbac_permission_master p ON p.id = upp.module_id
      WHERE user_id = $1
      ORDER BY plant_id, module_id
    `;

    const { rows } = await db.query(query, [canonical]);
    res.json(rows);
  } catch (err) {
    console.error("[GET USER PLANT PERMISSIONS ERROR]", err);
    res.status(500).json({ error: "Failed to fetch plant permissions" });
  }
};

exports.saveUserPlantPermissions = async (req, res) => {
  const rawUserId = req.params.id;
  console.log("Raw User ID:", req.params);
  const permissions = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: "permissions must be an array" });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const canonical = await resolveCanonicalUserKey(rawUserId);
    console.log("Canonical User ID:", canonical);
    await client.query(
      `DELETE FROM rbac_user_plant_permission WHERE user_id = $1`,
      [canonical]
    );

    for (const perm of permissions) {
      await client.query(
        `
        INSERT INTO rbac_user_plant_permission
        (user_id, plant_id, module_id, can_add, can_edit, can_view, can_delete, created_on, updated_on)
        VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      `,
        [
          canonical,
          perm.plant_id,
          perm.module_id,
          !!perm.can_add,
          !!perm.can_edit,
          !!perm.can_view,
          !!perm.can_delete,
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[SAVE USER PLANT PERMISSIONS ERROR]", err);
    res.status(500).json({ error: "Failed to save plant permissions" });
  } finally {
    client.release();
  }
};

/* -------------------------------------------------
   GET ALL PERMISSIONS FOR LOGGED-IN USER (AbilityContext)
-------------------------------------------------- */
exports.getMyPermissions = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1) find role for user
    const roleQ = `
      SELECT r.id AS role_id, r.role_name
      FROM rbac_user_role_map urm
      JOIN rbac_role_master r ON r.id = urm.role_id
      WHERE urm.user_id = $1
      LIMIT 1
    `;

    const roleResult = await db.query(roleQ, [userId]);
    const role = roleResult.rows[0] || null;

    // 2) role permissions
    let rolePermissions = [];

    if (role) {
      const rpQ = `
        SELECT p.module_name, rpm.can_add, rpm.can_edit, rpm.can_view, rpm.can_delete
        FROM rbac_role_permission_map rpm
        JOIN rbac_permission_master p ON p.id = rpm.permission_id
        WHERE rpm.role_id = $1
      `;

      const rpR = await db.query(rpQ, [role.role_id]);

      rpR.rows.forEach((r) => {
        if (r.can_add) rolePermissions.push(`${r.module_name}:add`);
        if (r.can_edit) rolePermissions.push(`${r.module_name}:edit`);
        if (r.can_view) rolePermissions.push(`${r.module_name}:view`);
        if (r.can_delete) rolePermissions.push(`${r.module_name}:delete`);
      });
    }

    // 3) plant-level permissions
    const plantQ = `
      SELECT upp.plant_id, p.module_name, upp.can_add, upp.can_edit, upp.can_view, upp.can_delete
      FROM rbac_user_plant_permission upp
      JOIN rbac_permission_master p ON p.id = upp.module_id
      WHERE upp.user_id = $1
    `;

    const plantR = await db.query(plantQ, [userId]);

    const plants = {};
    plantR.rows.forEach((p) => {
      if (!plants[p.plant_id]) plants[p.plant_id] = { plant_id: p.plant_id, modules: {} };
      plants[p.plant_id].modules[p.module_name] = {
        can_add: p.can_add,
        can_edit: p.can_edit,
        can_view: p.can_view,
        can_delete: p.can_delete,
      };
    });

    res.json({
      user: { id: userId },
      role_code: role ? role.role_name : null,
      role_permissions: rolePermissions,
      plants: Object.values(plants),
    });
  } catch (err) {
    console.error("[GET MY PERMISSIONS ERROR]", err);
    res.status(500).json({ error: "Failed to read permissions" });
  }
};
