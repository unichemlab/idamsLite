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
    // Join user_master with user_plant_permission and aggregate permissions per user
    const query = `
      SELECT um.*, 
        COALESCE(json_agg(
          CASE WHEN upp.user_id IS NOT NULL THEN
            json_build_object(
              'plant_id', upp.plant_id,
              'module_id', upp.module_id,
              'can_add', upp.can_add,
              'can_edit', upp.can_edit,
              'can_view', upp.can_view,
              'can_delete', upp.can_delete
            )
          ELSE NULL END
        ) FILTER (WHERE upp.user_id IS NOT NULL), '[]') AS permissions
      FROM user_master um
      LEFT JOIN user_plant_permission upp ON um.id = upp.user_id
      GROUP BY um.id
      ORDER BY um.id;
    `;
    const { rows } = await db.query(query);
    // Normalize user data for frontend display
    const users = rows.map((user) => ({
      ...user,
      department_id: user.department_id, // ensure department_id is present
      permissions: user.permissions || [],
      plants: Array.isArray(user.plants)
        ? user.plants
        : typeof user.plants === "string" && user.plants
        ? user.plants
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : [],
      centralMaster: Array.isArray(user.central_master)
        ? user.central_master
        : user.central_master
        ? typeof user.central_master === "string"
          ? user.central_master
              .split(",")
              .map((m) => m.trim())
              .filter(Boolean)
          : []
        : [],
      department: user.department || "-",
      fullName: user.full_name || user.fullName || user.username || "",
      empCode: user.emp_code || user.empCode || "",
      status: (user.status || "").toUpperCase(),
    }));
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
      password,
      status,
      plants,
      permissions,
      central_permission,
      comment,
      corporate_access_enabled,
    } = req.body;

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Insert user
    const insertQuery = `
      INSERT INTO user_master
        (username, full_name, email, emp_code, department_id, role_id, password_hash, status, plants, permissions, central_permission, comment, corporate_access_enabled)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const values = [
      username,
      full_name,
      email,
      emp_code,
      department_id,
      role_id,
      password_hash,
      status,
      plants,
      JSON.stringify(permissions),
      central_permission,
      comment,
      corporate_access_enabled,
    ];
    const { rows } = await db.query(insertQuery, values);
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error("[USER ADD ERROR]", err);
    res.status(500).json({ error: "Failed to add user" });
  }
};

// Edit user
exports.editUser = async (req, res) => {
  try {
    const user_id = req.params.id;
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

    const updateQuery = `
      UPDATE user_master SET
        full_name = $1,
        email = $2,
        emp_code = $3,
        department_id = $4,
        role_id = $5,
        status = $6,
        plants = $7,
        permissions = $8,
        central_permission = $9,
        comment = $10,
        corporate_access_enabled = $11
      WHERE user_id = $12
      RETURNING *;
    `;
    const values = [
      full_name,
      email,
      emp_code,
      department_id,
      role_id,
      status,
      plants,
      JSON.stringify(permissions),
      central_permission,
      comment,
      corporate_access_enabled,
      user_id,
    ];
    const { rows } = await db.query(updateQuery, values);
    res.json({ user: rows[0] });
  } catch (err) {
    console.error("[USER EDIT ERROR]", err);
    res.status(500).json({ error: "Failed to edit user" });
  }
};
