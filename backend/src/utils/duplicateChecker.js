/**
 * duplicateChecker.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Universal duplicate-name checker for master tables.
 *
 * Checks TWO layers:
 *   1. The actual master table  (status = 'ACTIVE')
 *   2. pending_approvals rows   (status = 'PENDING', action = create | update)
 *
 * Supported modules (extend CONFIG to add more):
 *   plant      → plant_master      → plant_name
 *   department → department_master → department_name
 *   roles      → role_master       → role_name
 *   vendors    → vendor_master     → vendor_name
 * ─────────────────────────────────────────────────────────────────────────────
 */

const pool = require("../config/db");

/* ── Module configuration ────────────────────────────────────────────────── */
const CONFIG = {
  plant: {
    tableName: "plant_master",
    nameField: "plant_name",
    module:    "plant",
  },
  department: {
    tableName: "department_master",
    nameField: "department_name",
    module:    "department",
  },
  roles: {
    tableName: "role_master",
    nameField: "role_name",
    module:    "roles",
  },
  vendors: {
    tableName: "vendor_master",
    nameField: "vendor_name",
    module:    "vendors",
  },
};

/**
 * isDuplicateName
 *
 * @param {object} params
 *   module     - one of: "plant" | "department" | "roles" | "vendors"
 *   name       - the value to check (case-insensitive + trimmed)
 *   excludeId  - (optional) record id to skip — set when editing an existing record
 *
 * @returns {Promise<boolean>} true if a duplicate exists
 *
 * @example
 *   // CREATE — no excludeId
 *   const dup = await isDuplicateName({ module: "plant", name: "GOA Plant" });
 *
 *   // EDIT — pass excludeId to skip current record
 *   const dup = await isDuplicateName({ module: "roles", name: "Admin", excludeId: 5 });
 */
const isDuplicateName = async ({ module, name, excludeId = null }) => {
  const cfg = CONFIG[module];
  if (!cfg) throw new Error(`isDuplicateName: unknown module "${module}"`);

  // Normalize: trim + lowercase for comparison
  const normalizedName = String(name).trim().toLowerCase();
  if (!normalizedName) return false;

  // ── 1. Check master table (ACTIVE rows) ────────────────────────────────
  let dbQuery, dbParams;

  if (excludeId !== null) {
    dbQuery = `
      SELECT id FROM ${cfg.tableName}
      WHERE LOWER(TRIM(${cfg.nameField}::TEXT)) = $1
        AND status = 'ACTIVE'
        AND id    <> $2
      LIMIT 1`;
    dbParams = [normalizedName, excludeId];
  } else {
    dbQuery = `
      SELECT id FROM ${cfg.tableName}
      WHERE LOWER(TRIM(${cfg.nameField}::TEXT)) = $1
        AND status = 'ACTIVE'
      LIMIT 1`;
    dbParams = [normalizedName];
  }

  const dbResult = await pool.query(dbQuery, dbParams);
  if (dbResult.rows.length > 0) return true;

  // ── 2. Check pending_approvals (PENDING create + update) ───────────────
  const pendingResult = await pool.query(
    `SELECT id, record_id, new_value
       FROM pending_approvals
      WHERE module     = $1
        AND table_name = $2
        AND action     IN ('create', 'update')
        AND status     = 'PENDING'`,
    [cfg.module, cfg.tableName]
  );

  for (const row of pendingResult.rows) {
    // When editing — skip the pending row that belongs to the record being edited
    if (excludeId !== null && Number(row.record_id) === Number(excludeId)) {
      continue;
    }

    try {
      const nv =
        typeof row.new_value === "string"
          ? JSON.parse(row.new_value)
          : row.new_value;

      if (
        nv &&
        String(nv[cfg.nameField] ?? "").trim().toLowerCase() === normalizedName
      ) {
        return true;
      }
    } catch (e) {
      console.warn(
        `isDuplicateName: error parsing pending_approvals.new_value (id=${row.id}):`,
        e.message
      );
    }
  }

  return false;
};

module.exports = { isDuplicateName };