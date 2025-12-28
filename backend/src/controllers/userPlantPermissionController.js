// backend/controllers/userPlantPermissionController.js - FIXED VERSION
const db = require("../config/db");

/**
 * Try to resolve a canonical user key to use in user_plant_permission.user_id.
 * We prefer employee_code, then employee_id, then id. If no user_master row
 * is found, return the original input so existing behaviour is preserved.
 */
async function resolveCanonicalUserKey(rawKey) {
  try {
    const q = `SELECT id, employee_id, employee_code FROM user_master WHERE id::text = $1::text OR employee_id::text = $1::text OR employee_code::text = $1::text LIMIT 1`;
    const r = await db.query(q, [rawKey]);
    if (r.rows && r.rows.length > 0) {
      const u = r.rows[0];
      // Always return the numeric id to store in user_plant_permission.user_id
      return u.id;
    }
  } catch (e) {
    console.warn("[resolveCanonicalUserKey] lookup failed:", e);
  }
  return rawKey;
}

// Get all permissions for a user
exports.getUserPlantPermissions = async (req, res) => {
  const userId = req.params.userId;
  try {
    console.log("[GET USER PLANT PERMISSIONS] raw userId:", userId);
    // Always resolve canonical id using employee_code, employee_id, or id
    const canonical = await resolveCanonicalUserKey(userId);
    console.log("[GET USER PLANT PERMISSIONS] resolved canonical key:", canonical);
    
    // Fetch all permission rows for this canonical id
    const query = `SELECT * FROM user_plant_permission WHERE user_id = $1 ORDER BY plant_id, module_id;`;
    const { rows } = await db.query(query, [canonical]);

    // Build a plant lookup to resolve display names
    const plantRes = await db.query(
      `SELECT id, name, plant_name, plant_code, code FROM plant_master`,
      []
    );
    const plantById = {};
    for (const p of plantRes.rows || []) {
      plantById[String(p.id)] = p;
    }

    // Normalize module_id to lowercase for frontend mapping and build mappedPermissions
    const normalizedRows = rows.map((row) => ({
      ...row,
      module_id:
        typeof row.module_id === "string"
          ? row.module_id.toLowerCase()
          : row.module_id,
    }));

    const mappedPermissions = {};
    const titleize = (s) =>
      String(s || "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => String(c).toUpperCase())
        .trim();

    for (const r of normalizedRows) {
      try {
        const plant = plantById[String(r.plant_id)];
        const displayPlant = plant
          ? plant.name || plant.plant_name || String(plant.id)
          : String(r.plant_id);
        const moduleLabel = titleize(r.module_id || "");
        const actions = [];
        if (r.can_add) actions.push("Add");
        if (r.can_edit) actions.push("Edit");
        if (r.can_view) actions.push("View");
        if (r.can_delete) actions.push("Delete");
        if (actions.length === 0) continue;

        // Build variants
        mappedPermissions[`${displayPlant}-${moduleLabel}`] = actions;
        mappedPermissions[`${r.plant_id}-${moduleLabel}`] = actions;
        mappedPermissions[`${displayPlant}-${r.module_id}`] = actions;
        mappedPermissions[`${r.plant_id}-${r.module_id}`] = actions;
        // Also include module-only keys
        mappedPermissions[`${moduleLabel}`] =
          mappedPermissions[`${moduleLabel}`] || actions;
        mappedPermissions[`${r.module_id}`] =
          mappedPermissions[`${r.module_id}`] || actions;
      } catch (e) {
        // ignore per-row errors
      }
    }

    res.json({ permissions: normalizedRows, mappedPermissions });
  } catch (err) {
    console.error("[GET USER PLANT PERMISSIONS ERROR]", err);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
};

// Set permissions for a user (replace all)
exports.setUserPlantPermissions = async (req, res) => {
  const userId = req.params.userId;
  const permissions = req.body.permissions;
  
  console.log("[SET USER PLANT PERMISSIONS] raw userId:", userId);
  console.log("[SET USER PLANT PERMISSIONS] incoming permissions:", permissions);
  
  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: "permissions must be an array" });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    
    const canonical = await resolveCanonicalUserKey(userId);
    console.log("[SET USER PLANT PERMISSIONS] canonical key to use:", canonical);

    // 🔥 DEDUPLICATE PERMISSIONS
    // Create a map to store unique combinations of plant_id + module_id
    const uniquePermissionsMap = new Map();
    
    for (const perm of permissions) {
      const key = `${perm.plant_id}-${perm.module_id}`;
      
      if (uniquePermissionsMap.has(key)) {
        // If duplicate exists, merge permissions (OR logic - keep if any is true)
        const existing = uniquePermissionsMap.get(key);
        uniquePermissionsMap.set(key, {
          plant_id: perm.plant_id,
          module_id: perm.module_id,
          can_add: existing.can_add || perm.can_add,
          can_edit: existing.can_edit || perm.can_edit,
          can_view: existing.can_view || perm.can_view,
          can_delete: existing.can_delete || perm.can_delete,
        });
        console.log(`[SET USER PLANT PERMISSIONS] Merged duplicate: ${key}`);
      } else {
        uniquePermissionsMap.set(key, {
          plant_id: perm.plant_id,
          module_id: perm.module_id,
          can_add: !!perm.can_add,
          can_edit: !!perm.can_edit,
          can_view: !!perm.can_view,
          can_delete: !!perm.can_delete,
        });
      }
    }

    // Convert map back to array
    const uniquePermissions = Array.from(uniquePermissionsMap.values());
    
    console.log(
      `[SET USER PLANT PERMISSIONS] After deduplication: ${uniquePermissions.length} unique permissions (was ${permissions.length})`
    );

    // Delete old permissions for canonical key
    console.log("[SET USER PLANT PERMISSIONS] deleting old permissions for user", canonical);
    await client.query("DELETE FROM user_plant_permission WHERE user_id = $1", [canonical]);

    console.log("[SET USER PLANT PERMISSIONS] inserting", uniquePermissions.length, "rows");
    
    // Insert new permissions (now deduplicated)
    for (const perm of uniquePermissions) {
      console.log("[SET USER PLANT PERMISSIONS] inserting row:", perm);
      await client.query(
        `INSERT INTO user_plant_permission
          (user_id, plant_id, module_id, can_add, can_edit, can_view, can_delete, created_on, updated_on)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          canonical,
          perm.plant_id,
          perm.module_id,
          perm.can_add,
          perm.can_edit,
          perm.can_view,
          perm.can_delete,
        ]
      );
    }

    await client.query("COMMIT");
    
    console.log(`[SET USER PLANT PERMISSIONS] SUCCESS: Saved ${uniquePermissions.length} permissions for user ${canonical}`);
    
    res.json({ 
      success: true, 
      permissionsSet: uniquePermissions.length,
      duplicatesRemoved: permissions.length - uniquePermissions.length
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[SET USER PLANT PERMISSIONS ERROR]", err);
    res.status(500).json({ 
      error: "Failed to set permissions",
      details: err.message 
    });
  } finally {
    client.release();
  }
};

// 🔥 NEW: Get permissions formatted for JWT token
exports.getUserPermissionsForToken = async (req, res) => {
  const userId = req.params.userId;
  try {
    console.log("[GET USER PERMISSIONS FOR TOKEN] userId:", userId);
    
    const canonical = await resolveCanonicalUserKey(userId);
    console.log("[GET USER PERMISSIONS FOR TOKEN] canonical key:", canonical);
    
    // Fetch all permission rows
    const query = `SELECT * FROM user_plant_permission WHERE user_id = $1;`;
    const { rows } = await db.query(query, [canonical]);

    // Build permissions array for JWT (format: 'action:module_name')
    const permissionsSet = new Set();
    
    // Build plantPermissions array for JWT
    const plantPermissionsMap = new Map();
    
    // Build permittedPlantIds array
    const permittedPlantIdsSet = new Set();

    for (const row of rows) {
      const moduleId = row.module_id;
      const plantId = row.plant_id;

      // Add to permitted plants
      permittedPlantIdsSet.add(plantId);

      // Add global permissions
      if (row.can_add) permissionsSet.add(`create:${moduleId}`);
      if (row.can_view) permissionsSet.add(`read:${moduleId}`);
      if (row.can_edit) permissionsSet.add(`update:${moduleId}`);
      if (row.can_delete) permissionsSet.add(`delete:${moduleId}`);

      // Build plant-specific permissions
      const key = `${moduleId}-${plantId}`;
      if (!plantPermissionsMap.has(key)) {
        plantPermissionsMap.set(key, {
          moduleId: moduleId,
          plantId: plantId,
          actions: {
            create: !!row.can_add,
            read: !!row.can_view,
            update: !!row.can_edit,
            delete: !!row.can_delete,
          }
        });
      }
    }

    const response = {
      permissions: Array.from(permissionsSet),
      plantPermissions: Array.from(plantPermissionsMap.values()),
      permittedPlantIds: Array.from(permittedPlantIdsSet),
    };

    console.log("[GET USER PERMISSIONS FOR TOKEN] response:", {
      permissionsCount: response.permissions.length,
      plantPermissionsCount: response.plantPermissions.length,
      permittedPlantsCount: response.permittedPlantIds.length,
    });

    res.json(response);
  } catch (err) {
    console.error("[GET USER PERMISSIONS FOR TOKEN ERROR]", err);
    res.status(500).json({ error: "Failed to fetch permissions for token" });
  }
};