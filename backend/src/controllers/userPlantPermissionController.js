// ============================================
// UPDATED userPlantPermissionController.js
// This version includes detailed logging to debug the issue
// ============================================

const db = require("../config/db");

async function resolveCanonicalUserKey(rawKey) {
  try {
    const q = `SELECT id, employee_id, employee_code FROM user_master WHERE id::text = $1::text OR employee_id::text = $1::text OR employee_code::text = $1::text LIMIT 1`;
    const r = await db.query(q, [rawKey]);
    if (r.rows && r.rows.length > 0) {
      const u = r.rows[0];
      return u.id;
    }
  } catch (e) {
    console.warn("[resolveCanonicalUserKey] lookup failed:", e);
  }
  return rawKey;
}

const toSnakeCase = (str) => {
  return str.replace(/\s+/g, "_").toLowerCase();
};

const titleize = (s) =>
  String(s || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => String(c).toUpperCase())
    .trim();

// ✅ GET USER PERMISSIONS
exports.getUserPlantPermissions = async (req, res) => {
  const userId = req.params.userId;
  try {
    console.log("[GET USER PLANT PERMISSIONS] raw userId:", userId);
    const canonical = await resolveCanonicalUserKey(userId);
    console.log("[GET USER PLANT PERMISSIONS] resolved canonical key:", canonical);
    
    const query = `SELECT * FROM user_plant_permission WHERE user_id = $1 ORDER BY plant_id NULLS LAST, module_id;`;
    const { rows } = await db.query(query, [canonical]);

    console.log(`[GET] Found ${rows.length} permission rows`);

    // Build plant lookup
    const plantRes = await db.query(`SELECT id, plant_name FROM plant_master`);
    const plantById = {};
    for (const p of plantRes.rows || []) {
      plantById[String(p.id)] = p;
    }

    const mappedPermissions = {};

    for (const r of rows) {
      try {
        const moduleLabel = titleize(r.module_id || "");
        const actions = [];
        if (r.can_add) actions.push("Add");
        if (r.can_edit) actions.push("Edit");
        if (r.can_view) actions.push("View");
        if (r.can_delete) actions.push("Delete");
        if (actions.length === 0) continue;

        // Corporate permissions (plant_id is NULL)
        if (r.plant_id === null || r.plant_id === undefined) {
          mappedPermissions[moduleLabel] = actions;
          console.log(`[GET] Corporate: ${moduleLabel} -> [${actions.join(', ')}]`);
        }
        // Plant-wise permissions (plant_id is NOT NULL)
        else {
          const plant = plantById[String(r.plant_id)];
          const displayPlant = plant?.plant_name || String(r.plant_id);
          
          const key = `${displayPlant}-${moduleLabel}`;
          mappedPermissions[key] = actions;
          console.log(`[GET] Plant: ${key} -> [${actions.join(', ')}]`);
        }
      } catch (e) {
        console.warn("[GET] Error processing row:", e);
      }
    }

    console.log(`[GET] Total permission entries: ${Object.keys(mappedPermissions).length}`);
    res.json({ permissions: rows, mappedPermissions });
  } catch (err) {
    console.error("[GET USER PLANT PERMISSIONS ERROR]", err);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
};

// ✅ SAVE USER PERMISSIONS
exports.setUserPlantPermissions = async (req, res) => {
  const userId = req.params.userId;
  const { permissions } = req.body;
  
  console.log("[SET USER PLANT PERMISSIONS] ================");
  console.log("[SET] raw userId:", userId);
  console.log("[SET] req.body keys:", Object.keys(req.body));
  console.log("[SET] permissions type:", typeof permissions);
  console.log("[SET] permissions isArray:", Array.isArray(permissions));
  console.log("[SET] permissions length:", Array.isArray(permissions) ? permissions.length : 'N/A');
  
  if (Array.isArray(permissions) && permissions.length > 0) {
    console.log("[SET] First permission sample:", JSON.stringify(permissions[0], null, 2));
  }

  if (!Array.isArray(permissions)) {
    console.error("[SET] ERROR: permissions is not an array!");
    return res.status(400).json({ error: "permissions must be an array" });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    
    const canonical = await resolveCanonicalUserKey(userId);
    console.log("[SET] canonical key:", canonical);

    // Deduplicate permissions
    const uniquePermissionsMap = new Map();
    
    console.log("[SET] Processing permissions...");
    for (const perm of permissions) {
      const key = `${perm.plant_id}-${perm.module_id}`;
      
      console.log(`[SET] Processing: plant_id=${perm.plant_id}, module_id=${perm.module_id}`);
      
      if (uniquePermissionsMap.has(key)) {
        const existing = uniquePermissionsMap.get(key);
        uniquePermissionsMap.set(key, {
          plant_id: perm.plant_id,
          module_id: perm.module_id,
          can_add: existing.can_add || perm.can_add,
          can_edit: existing.can_edit || perm.can_edit,
          can_view: existing.can_view || perm.can_view,
          can_delete: existing.can_delete || perm.can_delete,
        });
        console.log(`[SET] Merged duplicate: ${key}`);
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

    const uniquePermissions = Array.from(uniquePermissionsMap.values());
    
    console.log(`[SET] After deduplication: ${uniquePermissions.length} permissions (was ${permissions.length})`);

    // Delete old permissions
    console.log("[SET] Deleting old permissions for user", canonical);
    const deleteResult = await client.query("DELETE FROM user_plant_permission WHERE user_id = $1", [canonical]);
    console.log(`[SET] Deleted ${deleteResult.rowCount} old permission rows`);

    console.log("[SET] Inserting", uniquePermissions.length, "new rows");
    
    let insertedCount = 0;
    
    // Insert new permissions
    for (const perm of uniquePermissions) {
      console.log(`[SET] Inserting: user_id=${canonical}, plant_id=${perm.plant_id}, module_id=${perm.module_id}, add=${perm.can_add}, edit=${perm.can_edit}, view=${perm.can_view}, delete=${perm.can_delete}`);
      
      try {
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
        insertedCount++;
        console.log(`[SET] ✅ Inserted successfully`);
      } catch (insertErr) {
        console.error(`[SET] ❌ Insert failed:`, insertErr.message);
        throw insertErr;
      }
    }

    await client.query("COMMIT");
    
    console.log(`[SET] SUCCESS: Saved ${insertedCount} permissions for user ${canonical}`);
    console.log("[SET] ================");
    
    res.json({ 
      success: true, 
      permissionsSet: insertedCount,
      duplicatesRemoved: permissions.length - uniquePermissions.length
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[SET USER PLANT PERMISSIONS ERROR]", err);
    console.log("[SET] ================");
    res.status(500).json({ 
      error: "Failed to set permissions",
      details: err.message 
    });
  } finally {
    client.release();
  }
};

// For JWT token generation
exports.getUserPermissionsForToken = async (req, res) => {
  const userId = req.params.userId;
  try {
    console.log("[GET USER PERMISSIONS FOR TOKEN] userId:", userId);
    
    const canonical = await resolveCanonicalUserKey(userId);
    console.log("[GET USER PERMISSIONS FOR TOKEN] canonical key:", canonical);
    
    const query = `SELECT * FROM user_plant_permission WHERE user_id = $1;`;
    const { rows } = await db.query(query, [canonical]);

    const permissionsSet = new Set();
    const plantPermissionsMap = new Map();
    const permittedPlantIdsSet = new Set();

    for (const row of rows) {
      const moduleId = row.module_id;
      const plantId = row.plant_id;

      if (plantId) permittedPlantIdsSet.add(plantId);

      if (row.can_add) permissionsSet.add(`create:${moduleId}`);
      if (row.can_view) permissionsSet.add(`read:${moduleId}`);
      if (row.can_edit) permissionsSet.add(`update:${moduleId}`);
      if (row.can_delete) permissionsSet.add(`delete:${moduleId}`);

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

// ============================================
// DEBUGGING CHECKLIST
// ============================================

/*
Run this query to verify data was saved:
SELECT * FROM user_plant_permission WHERE user_id = <your_user_id>;

Check the backend console logs for:
1. [SET] req.body keys: ['permissions']
2. [SET] permissions isArray: true
3. [SET] permissions length: 4
4. [SET] First permission sample: { plant_id: 15, module_id: "application_master", ... }
5. [SET] Processing: plant_id=15, module_id=application_master
6. [SET] ✅ Inserted successfully (x4)
7. [SET] SUCCESS: Saved 4 permissions

If you see:
- "permissions must be an array" → Frontend not sending array
- Insert failed → Check database constraints/types
- Saved 0 permissions → Check if uniquePermissions array is empty
*/