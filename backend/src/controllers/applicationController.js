// backend/controllers/applicationController.js
const db = require("../config/db");
const auditLog = require("../utils/audit");
const { logActivity } = require("../utils/activityLogger");
const { submitForApproval } = require("../utils/masterApprovalHelper");
const { filterByPlantAccess, canAccessPlant } = require("../middleware/permissionMiddleware");

/**
 * Check if user is super admin
 */
const isSuperAdmin = (user) => {
  if (!user) return false;
  
  // Check role_id directly
  if (user.role_id === 1) return true;
  if (Array.isArray(user.role_id) && user.role_id.includes(1)) return true;
  
  // Check roles array
  if (Array.isArray(user.roles) && user.roles.includes(1)) return true;
  if (user.roles === 1) return true;
  
  return false;
};

/**
 * Generate unique transaction ID by checking both application_master and pending approvals
 */
const generateUniqueTransactionId = async () => {
  try {
    let maxNum = 0;

    // 1. Check existing applications in application_master
    const existingAppsResult = await db.query(
      `SELECT transaction_id FROM application_master 
       WHERE transaction_id LIKE 'APP%' 
       ORDER BY transaction_id DESC 
       LIMIT 1`
    );
    
    if (existingAppsResult.rows.length > 0) {
      const lastId = existingAppsResult.rows[0].transaction_id;
      const match = lastId.match(/APP(\d+)/);
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1], 10));
      }
    }

    // 2. Check pending approvals in master_approvals table
    const pendingApprovalsResult = await db.query(
      `SELECT new_value FROM master_approvals 
       WHERE module = 'application' 
       AND table_name = 'application_master' 
       AND action = 'create'
       AND status = 'PENDING'`
    );

    if (pendingApprovalsResult.rows.length > 0) {
      for (const row of pendingApprovalsResult.rows) {
        try {
          const newValue = typeof row.new_value === 'string' 
            ? JSON.parse(row.new_value) 
            : row.new_value;
          
          if (newValue?.transaction_id) {
            const match = newValue.transaction_id.match(/APP(\d+)/);
            if (match) {
              maxNum = Math.max(maxNum, parseInt(match[1], 10));
            }
          }
        } catch (e) {
          console.warn("Error parsing new_value in pending approval:", e);
        }
      }
    }

    // Generate next transaction ID
    const nextNum = maxNum + 1;
    const transactionId = `APP${String(nextNum).padStart(7, "0")}`;
    
    console.log(`📝 Generated transaction_id: ${transactionId} (max found: ${maxNum})`);
    return transactionId;
  } catch (err) {
    console.error("Error generating transaction_id:", err);
    // Fallback to timestamp-based ID
    const timestamp = Date.now().toString().slice(-7);
    return `APP${timestamp}`;
  }
};

// Get all applications (GET) - WITH PERMISSION FILTERING
exports.getAllApplications = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM application_master WHERE status='ACTIVE' ORDER BY id ASC"
    );
    console.log('Total applications fetched:', result.rows.length);
    console.log('User:', req.user ? { id: req.user.user_id, role_id: req.user.role_id } : 'undefined');
    
    // 🔥 Super Admin sees ALL data - no filtering
    if (isSuperAdmin(req.user)) {
      console.log("✅ Super admin - returning all applications:", result.rows.length);
      return res.status(200).json(result.rows);
    }
    
    // 🔥 Filter by user's plant access for non-super-admins
    const filteredApps = filterByPlantAccess(result.rows, req.user);
    console.log("📊 Filtered applications:", filteredApps.length, "of", result.rows.length);
    
    res.status(200).json(filteredApps);
  } catch (err) {
    console.error("Error fetching applications:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete Application (DELETE) - WITH PERMISSION CHECK
exports.deleteApplication = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid application ID" });
    }

    const oldRow = await db.query(
      "SELECT * FROM application_master WHERE id=$1",
      [id]
    );

    const oldValue = oldRow.rows[0] || null;
    if (!oldValue) {
      return res.status(404).json({ error: "Application not found" });
    }

    // 🔥 Super Admin bypass plant check
    if (!isSuperAdmin(req.user)) {
      if (!canAccessPlant(req.user, oldValue.plant_location_id)) {
        return res.status(403).json({ 
          error: "You do not have permission to delete applications for this plant",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }
    }

    const userId = req.user?.id || req.user?.user_id;
    const username = req.user?.username || "Unknown";

    // Submit for approval
    const approvalId = await submitForApproval({
      module: "application",
      tableName: "application_master",
      action: "delete",
      recordId: id,
      oldValue,
      newValue: null,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Delete application: ${oldValue.display_name}`,
    });

    if (approvalId !== null) {
      return res.status(202).json({
        message: "Application deletion submitted for approval",
        approvalId,
        status: "PENDING_APPROVAL",
        data: oldValue,
      });
    }

    // No approval required → delete directly
    const result = await db.query(
      "DELETE FROM application_master WHERE id = $1 RETURNING *",
      [id]
    );

    const deletedRow = result.rows[0];

    auditLog(
      req,
      "application_master",
      id,
      "DELETE",
      oldValue,
      {},
      "application deleted"
    );

    await logActivity({
      userId,
      module: "application",
      tableName: "application_master",
      recordId: deletedRow.id,
      action: "delete",
      oldValue: deletedRow,
      newValue: null,
      comments: `Deleted application id: ${deletedRow.id}`,
      reqMeta: req._meta || {},
    });

    res.status(200).json({ message: "Application deleted successfully" });
  } catch (err) {
    console.error("Error deleting application:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add Application (POST) - WITH PERMISSION CHECK
exports.addApplication = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const username = req.user?.username || "Unknown";

    const {
      plant_location_id,
      department_id,
      application_hmi_name,
      application_hmi_version,
      equipment_instrument_id,
      application_hmi_type,
      display_name,
      role_id,
      system_name,
      system_inventory_id,
      multiple_role_access,
      status,
      role_lock = false,
    } = req.body;

    // 🔥 Super Admin bypass plant check
    if (!isSuperAdmin(req.user)) {
      if (!canAccessPlant(req.user, plant_location_id)) {
        return res.status(403).json({ 
          error: "You do not have permission to create applications for this plant",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }
    }

    // 🔥 Generate unique transaction ID (checks both existing records and pending approvals)
    const transaction_id = await generateUniqueTransactionId();

    let roleIdStr = Array.isArray(role_id)
      ? role_id.join(",")
      : String(role_id);

    const newData = {
      transaction_id,
      plant_location_id,
      department_id,
      application_hmi_name,
      application_hmi_version,
      equipment_instrument_id,
      application_hmi_type,
      display_name,
      role_id: roleIdStr,
      system_name,
      system_inventory_id,
      multiple_role_access,
      role_lock,
      status,
    };

    console.log("📤 Creating application with transaction_id:", transaction_id);

    // Submit for approval
    const approvalId = await submitForApproval({
      module: "application",
      tableName: "application_master",
      action: "create",
      recordId: null,
      oldValue: null,
      newValue: newData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Create Application: ${display_name}`,
    });

    if (approvalId !== null) {
      console.log("✅ Application submitted for approval with ID:", approvalId);
      return res.status(202).json({
        message: "Application creation submitted for approval",
        approvalId,
        status: "PENDING_APPROVAL",
        data: newData,
      });
    }

    // No approval required → Insert directly
    const result = await db.query(
      `INSERT INTO application_master (
        transaction_id, plant_location_id, department_id, application_hmi_name, application_hmi_version,
        equipment_instrument_id, application_hmi_type, display_name, role_id, system_name, system_inventory_id,
        multiple_role_access, role_lock, status, created_on, updated_on
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW()
      ) RETURNING *`,
      [
        transaction_id,
        plant_location_id,
        department_id,
        application_hmi_name,
        application_hmi_version,
        equipment_instrument_id,
        application_hmi_type,
        display_name,
        roleIdStr,
        system_name,
        system_inventory_id,
        multiple_role_access,
        role_lock,
        status,
      ]
    );

    console.log("✅ Application created directly with ID:", result.rows[0].id);

    auditLog(req, "application_master", result.rows[0].id, "INSERT", {}, result.rows[0], "new application");

    await logActivity({
      userId,
      module: "application",
      tableName: "application_master",
      recordId: result.rows[0].id,
      action: "create",
      oldValue: null,
      newValue: result.rows[0],
      comments: `Created application: ${display_name}`,
      reqMeta: req._meta || {},
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[addApplication] Error:", err);
    
    // Handle duplicate key error specifically
    if (err.code === '23505' && err.constraint === 'application_master_transaction_id_key') {
      console.error("❌ Duplicate transaction_id detected:", err.detail);
      return res.status(409).json({ 
        error: "Transaction ID already exists. Please try again.",
        code: "DUPLICATE_TRANSACTION_ID"
      });
    }
    
    res.status(500).json({ error: err.message });
  }
};

// Edit Application (PUT) - WITH PERMISSION CHECK
exports.editApplication = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid application ID" });
    }

    const userId = req.user?.id || req.user?.user_id;
    const username = req.user?.username || "Unknown";

    const oldRes = await db.query(
      "SELECT * FROM application_master WHERE id=$1",
      [id]
    );
    const oldValue = oldRes.rows[0] || null;

    if (!oldValue) {
      return res.status(404).json({ error: "Application not found" });
    }

    // 🔥 Super Admin bypass plant check for existing record
    if (!isSuperAdmin(req.user)) {
      if (!canAccessPlant(req.user, oldValue.plant_location_id)) {
        return res.status(403).json({ 
          error: "You do not have permission to edit this application",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }
    }

    const {
      transaction_id,
      plant_location_id,
      department_id,
      application_hmi_name,
      application_hmi_version,
      equipment_instrument_id,
      application_hmi_type,
      display_name,
      role_id,
      system_name,
      system_inventory_id,
      multiple_role_access,
      status,
      role_lock = false,
    } = req.body;

    // 🔥 Super Admin bypass plant check for new plant
    if (!isSuperAdmin(req.user)) {
      if (plant_location_id !== oldValue.plant_location_id) {
        if (!canAccessPlant(req.user, plant_location_id)) {
          return res.status(403).json({ 
            error: "You do not have permission to move this application to the selected plant",
            code: "INSUFFICIENT_PERMISSIONS"
          });
        }
      }
    }

    let roleIdStr = Array.isArray(role_id)
      ? role_id.join(",")
      : String(role_id);

    const newData = {
      transaction_id: transaction_id || oldValue.transaction_id, // Keep existing if not provided
      plant_location_id,
      department_id,
      application_hmi_name,
      application_hmi_version,
      equipment_instrument_id,
      application_hmi_type,
      display_name,
      role_id: roleIdStr,
      system_name,
      system_inventory_id,
      multiple_role_access,
      role_lock,
      status,
    };

    // Submit for approval
    const approvalId = await submitForApproval({
      module: "application",
      tableName: "application_master",
      action: "update",
      recordId: id,
      oldValue,
      newValue: newData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Update application: ${display_name}`,
    });

    if (approvalId !== null) {
      return res.status(202).json({
        message: "Application update submitted for approval",
        approvalId,
        status: "PENDING_APPROVAL",
        data: newData,
      });
    }

    // No approval required → Update directly
    const result = await db.query(
      `UPDATE application_master SET
        transaction_id=$1,
        plant_location_id=$2,
        department_id=$3,
        application_hmi_name=$4,
        application_hmi_version=$5,
        equipment_instrument_id=$6,
        application_hmi_type=$7,
        display_name=$8,
        role_id=$9,
        system_name=$10,
        system_inventory_id=$11,
        multiple_role_access=$12,
        role_lock=$13,
        status=$14,
        updated_on=NOW()
      WHERE id=$15 RETURNING *`,
      [
        newData.transaction_id,
        plant_location_id,
        department_id,
        application_hmi_name,
        application_hmi_version,
        equipment_instrument_id,
        application_hmi_type,
        display_name,
        roleIdStr,
        system_name,
        system_inventory_id,
        multiple_role_access,
        role_lock,
        status,
        id,
      ]
    );

    auditLog(req, "application_master", id, "UPDATE", oldValue, result.rows[0], "updated application");

    await logActivity({
      userId,
      module: "application",
      tableName: "application_master",
      recordId: id,
      action: "update",
      oldValue,
      newValue: result.rows[0],
      comments: `Updated application id: ${id}`,
      reqMeta: req._meta || {},
    });

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error editing application:", err);
    res.status(500).json({ error: err.message });
  }
};

// exports.getDepartmentByPlantId = async (req, res) => {
//   try {
//     const plantID = parseInt(req.params.id, 10);

//     if (isNaN(plantID)) {
//       return res.status(400).json({ error: "Invalid plant ID" });
//     }

//     // 🔥 Super Admin bypass plant check
//     if (!isSuperAdmin(req.user)) {
//       if (!canAccessPlant(req.user, plantID)) {
//         return res.status(403).json({ 
//           error: "You do not have permission to access departments for this plant",
//           code: "INSUFFICIENT_PERMISSIONS"
//         });
//       }
//     }

//     const result = await db.query(
//       `SELECT DISTINCT d.id, d.department_name 
//        FROM application_master a
//        JOIN department_master d ON a.department_id = d.id
//        WHERE a.plant_location_id = $1
//        ORDER BY d.department_name`,
//       [plantID]
//     );

//     if (result.rows.length === 0) {
//       return res
//         .status(404)
//         .json({ error: "No departments found for this plant" });
//     }

//     res.status(200).json(result.rows);
//   } catch (err) {
//     console.error("Error fetching departments:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

exports.getDepartmentByPlantId = async (req, res) => {
  try {
    const plantID = parseInt(req.params.id, 10);

    if (isNaN(plantID)) {
      return res.status(400).json({ error: "Invalid plant ID" });
    }

    const result = await db.query(
      `SELECT DISTINCT d.id, d.department_name 
       FROM application_master a
       JOIN department_master d ON a.department_id = d.id
       WHERE a.plant_location_id = $1
       ORDER BY d.department_name`,
      [plantID]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No departments found for this plant" });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching departments:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};



// Get activity logs - WITH PERMISSION FILTERING
exports.getApplicationActivityLogs = async (req, res) => {
  try {
    const { rows: rawRows } = await db.query(
      `SELECT * FROM activity_log
       WHERE table_name = 'application_master'
          OR (details IS NOT NULL AND details LIKE '%"tableName":"application_master"%')
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

    // 🔥 Super Admin sees ALL logs - no filtering
    if (isSuperAdmin(req.user)) {
      console.log("✅ Super admin - returning all activity logs:", rows.length);
      return res.json(rows);
    }

    // 🔥 Filter logs - only show logs for accessible plants
    const filteredRows = rows.filter(log => {
      // Try to extract plant_location_id from old_value or new_value
      let plantId = null;
      
      if (log.old_value) {
        try {
          const oldVal = typeof log.old_value === 'string' 
            ? JSON.parse(log.old_value) 
            : log.old_value;
          plantId = oldVal.plant_location_id;
        } catch (e) {}
      }
      
      if (!plantId && log.new_value) {
        try {
          const newVal = typeof log.new_value === 'string' 
            ? JSON.parse(log.new_value) 
            : log.new_value;
          plantId = newVal.plant_location_id;
        } catch (e) {}
      }
      
      // If no plant ID found, include the log (might be system-level)
      if (!plantId) return true;
      
      // Check if user can access this plant
      return canAccessPlant(req.user, plantId);
    });

    console.log("📊 Filtered activity logs:", filteredRows.length, "of", rows.length);
    res.json(filteredRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRoleApplicationIDByPlantIdandDepartment = async (req, res) => {
  try {
    const plantID = parseInt(req.params.id, 10);
    const departmentID = parseInt(req.params.dept_id, 10);

    if (isNaN(plantID) || isNaN(departmentID)) {
      return res.status(400).json({ error: "Invalid plant or department ID" });
    }

    const result = await db.query(
      `SELECT DISTINCT r.id AS role_id, r.role_name AS role_name, a.id AS application_id, a.display_name,a.multiple_role_access 
       FROM application_master a
       JOIN role_master r ON r.id = ANY(string_to_array(a.role_id, ',')::int[])
       WHERE a.plant_location_id = $1 AND a.department_id = $2 AND a.status='ACTIVE'
       ORDER BY r.role_name`,
      [plantID, departmentID]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "No roles or applications found for this plant and department",
      });
    }

    // Unique roles
    const roles = Array.from(
      new Set(
        result.rows.map((row) =>
          JSON.stringify({ id: row.role_id, name: row.role_name })
        )
      )
    ).map((item) => JSON.parse(item));

    // Applications
    const applications = Array.from(
      new Set(
        result.rows.map((row) =>
          JSON.stringify({
            id: row.application_id,
            name: row.display_name,
            multiple_role_access:row.multiple_role_access
          })
        )
      )
    ).map((item) => JSON.parse(item));

    res.status(200).json({ roles, applications });
  } catch (err) {
    console.error("Error fetching roles and applications:", err);
    res.status(500).json({ error: err.message });
  }
};


// exports.getRoleApplicationIDByPlantIdandDepartment = async (req, res) => {
//   try {
//     const plantID = parseInt(req.params.id, 10);
//     const departmentID = parseInt(req.params.dept_id, 10);

//     if (isNaN(plantID) || isNaN(departmentID)) {
//       return res.status(400).json({ error: "Invalid plant or department ID" });
//     }

//     // 🔥 Super Admin bypass plant check
//     if (!isSuperAdmin(req.user)) {
//       if (!canAccessPlant(req.user, plantID)) {
//         return res.status(403).json({ 
//           error: "You do not have permission to access data for this plant",
//           code: "INSUFFICIENT_PERMISSIONS"
//         });
//       }
//     }

//     const result = await db.query(
//       `SELECT DISTINCT r.id AS role_id, r.role_name AS role_name, a.id AS application_id, a.display_name 
//        FROM application_master a
//        JOIN role_master r ON r.id = ANY(string_to_array(a.role_id, ',')::int[])
//        WHERE a.plant_location_id = $1 AND a.department_id = $2 AND a.status='ACTIVE'
//        ORDER BY r.role_name`,
//       [plantID, departmentID]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         error: "No roles or applications found for this plant and department",
//       });
//     }

//     // Unique roles
//     const roles = Array.from(
//       new Set(
//         result.rows.map((row) =>
//           JSON.stringify({ id: row.role_id, name: row.role_name })
//         )
//       )
//     ).map((item) => JSON.parse(item));

//     // Applications
//     const applications = Array.from(
//       new Set(
//         result.rows.map((row) =>
//           JSON.stringify({
//             id: row.application_id,
//             name: row.display_name,
//           })
//         )
//       )
//     ).map((item) => JSON.parse(item));

//     res.status(200).json({ roles, applications });
//   } catch (err) {
//     console.error("Error fetching roles and applications:", err);
//     res.status(500).json({ error: err.message });
//   }
// };