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
    // Fetch only required columns from user_master
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
        role_id
      FROM user_master
      ORDER BY id;
    `;
    const { rows } = await db.query(query);
    // Map DB fields to UI fields (keep names as in DB)
    const users = rows.map((user) => ({
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
      INSERT INTO admin_master
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
      UPDATE admin_master SET
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
