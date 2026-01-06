/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *   post:
 *     summary: Add a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: User created
 *
 * /api/users/{id}:
 *   put:
 *     summary: Edit a user
 *     tags: [Users]
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
 *         description: User updated
 */
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Fetch required columns from user_master, include permissions/plants for frontend
    const query = `
      SELECT 
        id,
        transaction_id,
        employee_name,
        employee_id,
        employee_code,
        department,
        location,
        status,
        company,
        mobile,
        email,
        designation,
        last_sync,
        created_on,
        updated_on,
        role_id,
        permissions,
        plants,
        corporate_access_enabled
      FROM user_master
      ORDER BY id;
    `;
    const { rows } = await db.query(query);
    // Map DB fields to UI fields (keep names as in DB), parse JSON/text fields safely
    const users = rows.map((user) => {
      // permissions may be stored as JSON/JSONB or as a stringified JSON array
      let parsedPermissions = {};
      try {
        if (user.permissions === null || user.permissions === undefined) {
          parsedPermissions = {};
        } else if (typeof user.permissions === "string") {
          parsedPermissions = JSON.parse(user.permissions);
        } else {
          parsedPermissions = user.permissions;
        }
      } catch (e) {
        parsedPermissions = {};
      }

      let parsedPlants = [];
      try {
        if (user.plants === null || user.plants === undefined) {
          parsedPlants = [];
        } else if (typeof user.plants === "string") {
          parsedPlants = JSON.parse(user.plants);
        } else {
          parsedPlants = user.plants;
        }
      } catch (e) {
        parsedPlants = [];
      }

      return {
        id: user.id,
        transaction_id: user.transaction_id,
        employee_name: user.employee_name,
        employee_id: user.employee_id,
        employee_code: user.employee_code,
        department: user.department,
        location: user.location,
        status: user.status,
        company: user.company,
        mobile: user.mobile,
        email: user.email,
        designation: user.designation,
        last_sync: user.last_sync,
        created_on: user.created_on,
        updated_on: user.updated_on,
        role_id: user.role_id,
        permissions: parsedPermissions,
        plants: parsedPlants,
        corporate_access_enabled: !!user.corporate_access_enabled,
      };
    });
    res.json({ users });
  } catch (err) {
    console.error("[USER LIST ERROR]", err);
    // TEMP: send full error for debugging
    res.status(500).json({
      error: "Failed to fetch users",
      details: err.message,
      stack: err.stack,
    });
  }
};
const db = require("../config/db");
const bcrypt = require("bcrypt");
const { logActivity } = require("../utils/activityLogger");

// Add new user
exports.addUser = async (req, res) => {
  try {
    const {
      username,
      full_name,
      email,
      emp_code,
      department_id,
      role_id,
      status,
      plants,
      permissions,
      comment,
      corporate_access_enabled,
    } = req.body;

    // Accept location as sent by frontend (e.g., react-select)
    const location = req.body.location || null;

    // Accept department as either `department` (frontend) or `department_id` (older clients)
    const department = req.body.department || department_id || null;

    // Normalize role_id into a JS array so node-postgres can send it as an int[]
    // This is more robust than building a literal string like "{1,2}" which
    // can sometimes be interpreted incorrectly.
    let roleIdArray = null;
    if (role_id !== undefined && role_id !== null) {
      if (Array.isArray(role_id)) {
        roleIdArray = role_id.map((r) => Number(r)).filter((n) => !isNaN(n));
      } else if (typeof role_id === "number" || !isNaN(parseInt(role_id))) {
        roleIdArray = [Number(role_id)];
      } else if (typeof role_id === "string") {
        // Allow string like "[4]" or "4" or "{4}" by extracting digits
        const cleaned = role_id.replace(/[^0-9,]/g, "");
        roleIdArray = cleaned
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n));
      }
      // If the resulting array is empty, treat as null
      if (Array.isArray(roleIdArray) && roleIdArray.length === 0)
        roleIdArray = null;
    }

    // Insert user into user_master (include location)
    const insertQuery = `
      INSERT INTO user_master
        (employee_id, employee_name, email, employee_code, department, location, role_id, status, plants, permissions, comment, corporate_access_enabled)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const values = [
      username,
      full_name,
      email,
      emp_code,
      department,
      location,
      roleIdArray, // Pass a JS array (or null) - node-postgres will convert to int[]
      status,
      JSON.stringify(plants), // Ensure plants is stored as JSON
      JSON.stringify(permissions),
      comment,
      corporate_access_enabled,
    ];
    const { rows } = await db.query(insertQuery, values);

    // Log creation activity (non-blocking)
    try {
      const created = rows[0];
      const logId = await logActivity({
        userId: req.user?.id || req.user?.user_id || null,
        module: "user",
        tableName: "user_master",
        recordId: created.id,
        action: "create",
        oldValue: null,
        newValue: created,
        comments: `Created user: ${
          created.employee_name ||
          created.full_name ||
          created.username ||
          created.email
        }`,
        reqMeta: req._meta || {},
      });
      if (!logId)
        console.warn(
          "Activity log (addUser) did not insert a row for record:",
          created.id
        );
      else console.log("Activity log (addUser) inserted id:", logId);
    } catch (logErr) {
      console.warn("Activity log (addUser) failed:", logErr.message || logErr);
    }

    res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error("[USER ADD ERROR]", err);
    res.status(500).json({ error: "Failed to add user" });
  }
};

// Edit user
exports.editUser = async (req, res) => {
  // Debug: log permissions before saving
  const {
    full_name,
    email,
    emp_code,
    department_id,
    role_id,
    status,
    plants,
    permissions,
    central_permission,
    comment,
    corporate_access_enabled,
  } = req.body;
  console.log("[DEBUG] Permissions to save:", permissions);
  console.log("[DEBUG] Plants to save:", plants);

  // Map incoming fields to the actual user_master table columns.
  // Frontend may send department (name) or department_id; prefer `department` if provided.
  try {
    const user_id = req.params.id;
    const department = req.body.department || department_id || null;
    const updateQuery = `
      UPDATE user_master SET
        employee_name = $1,
        email = $2,
        employee_code = $3,
        department = $4,
        location = $5,
        status = $6,
        role_id = $7,
        plants = $8,
        permissions = $9,
        updated_on = NOW()
      WHERE id = $10
      RETURNING *;
    `;
    // Ensure role_id is passed as an array when DB column is integer[]
    const roleArray = Array.isArray(role_id)
      ? role_id
      : role_id !== undefined && role_id !== null
        ? [role_id]
        : null;

    // Normalize plants into an array (frontend may send names or objects)
    let normalizedPlants = [];
    try {
      if (Array.isArray(plants)) {
        normalizedPlants = plants;
      } else if (typeof plants === "string") {
        // try to parse stringified JSON
        try {
          const parsed = JSON.parse(plants);
          if (Array.isArray(parsed)) normalizedPlants = parsed;
        } catch (e) {
          // fallback: single plant name string
          normalizedPlants = [plants];
        }
      }
    } catch (e) {
      normalizedPlants = [];
    }

    // Clean malformed permission tokens like "create:" (empty subject)
    let cleanedPermissions = [];
    try {
      if (Array.isArray(permissions)) {
        cleanedPermissions = permissions.filter((t) => {
          if (!t || typeof t !== "string") return false;
          const parts = t.split(":");
          return parts.length > 1 && parts[1] && parts[1].trim() !== "";
        });
      } else if (typeof permissions === "string") {
        try {
          const parsed = JSON.parse(permissions);
          if (Array.isArray(parsed)) {
            cleanedPermissions = parsed.filter((t) => {
              if (!t || typeof t !== "string") return false;
              const parts = t.split(":");
              return parts.length > 1 && parts[1] && parts[1].trim() !== "";
            });
          }
        } catch (e) {
          cleanedPermissions = [];
        }
      }
    } catch (e) {
      cleanedPermissions = [];
    }

    // Save plants and permissions as JSON
    const plantsJson = JSON.stringify(normalizedPlants || []);
    const permissionsJson = JSON.stringify(cleanedPermissions || []);

    const values = [
      full_name,
      email,
      emp_code,
      department,
      req.body.location || null,
      status,
      roleArray,
      plantsJson,
      permissionsJson,
      user_id,
    ];
    // fetch old value for diffing
    let oldValue = null;
    try {
      const oldRes = await db.query("SELECT * FROM user_master WHERE id=$1", [
        user_id,
      ]);
      oldValue = oldRes.rows[0] || null;
    } catch (e) {
      // ignore
    }

    const { rows } = await db.query(updateQuery, values);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    // Log update activity (non-blocking)
    try {
      const updated = rows[0];
      const logId = await logActivity({
        userId: req.user?.id || req.user?.user_id || null,
        module: "user",
        tableName: "user_master",
        recordId: user_id,
        action: "update",
        oldValue: oldValue,
        newValue: updated,
        comments: `Updated user id: ${user_id}`,
        reqMeta: req._meta || {},
      });
      if (!logId)
        console.warn(
          "Activity log (editUser) did not insert a row for record:",
          user_id
        );
      else console.log("Activity log (editUser) inserted id:", logId);
    } catch (logErr) {
      console.warn("Activity log (editUser) failed:", logErr.message || logErr);
    }
    res.json({ user: rows[0] });
  } catch (err) {
    console.error("[USER EDIT ERROR]", err);
    res.status(500).json({ error: "Failed to edit user" });
  }
};

/**
 * GET /api/users/:employeeCode
 * Returns user info including manager and manager's manager
 */

exports.getUserByEmployeeCode = async (req, res) => {
  try {
    const employeeCode = req.params.employeeCode;

    const query = `
      SELECT 
      id,
        employee_name AS name,
        employee_code,
        location,
        department,
        reporting_manager,
        managers_manager
      FROM user_master
      WHERE employee_code = $1
      LIMIT 1`;

    const { rows } = await db.query(query, [employeeCode]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];

    res.json({
      id:user.id,
      name: user.name,
      employee_code: user.employee_code,
      location: user.location,
      department: user.department,
      reporting_manager: user.reporting_manager,
      managers_manager: user.managers_manager,
    });
  } catch (err) {
    console.error("[GET USER ERROR]", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};



exports.getUserByDepartment = async (req, res) => {
  try {
    const departmentParam = req.params.department?.trim();
    const department = departmentParam || "Information Technology";

    const query = `
      SELECT 
      id,
        employee_name,
        employee_code,
        location,
        department,
        reporting_manager,
        managers_manager,
        email
      FROM public.user_master
      WHERE LOWER(department) = LOWER($1)
        AND employee_code IS NOT NULL
        AND TRIM(employee_code) <> ''
      ORDER BY employee_name ASC;
    `;

    const result = await db.query(query, [department]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "No users found in this department" });
    }
      // ✅ Return all users, not just one
    res.json(result.rows);
  } catch (err) {
    console.error("[GET USER BY DEPARTMENT ERROR]", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

exports.getUsersById = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT id, name, email FROM user_master WHERE id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};





