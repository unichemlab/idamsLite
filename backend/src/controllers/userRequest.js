/**
 * @swagger
 * /api/user-requests:
 *   get:
 *     summary: Get all user requests
 *     tags: [UserRequests]
 *     responses:
 *       200:
 *         description: List of user requests
 *   post:
 *     summary: Create a new user request
 *     tags: [UserRequests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: User request created
 * /api/user-requests/{id}:
 *   put:
 *     summary: Update a user request
 *     tags: [UserRequests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: User request updated
 */

const pool = require("../config/db");
exports.getAllUserRequests = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM user_request ORDER BY created_on DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createUserRequest = async (req, res) => {
  const {
    request_for,
    name,
    employee_code,
    location,
    access_type,
    application_id,
    department,
    role,
    reports_to,
    training_status,
    attachment_path,
    remarks,
    approver1,
    approver2,
    approver3,
    status,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO user_request
      (request_for, name, employee_code, location, access_type, application_id, department, role, reports_to, training_status, attachment_path, remarks, approver1, approver2, approver3, status, created_on)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
      RETURNING *`,
      [
        request_for,
        name,
        employee_code || null,
        location,
        access_type,
        application_id,
        department,
        role,
        reports_to,
        training_status,
        attachment_path || null,
        remarks || null,
        approver1,
        approver2 || null,
        approver3 || null,
        status || "Pending",
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUserRequest = async (req, res) => {
  const { id } = req.params;
  const {
    request_for,
    name,
    employee_code,
    location,
    access_type,
    application_id,
    department,
    role,
    reports_to,
    training_status,
    attachment_path,
    remarks,
    approver1,
    approver2,
    approver3,
    status,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE user_request SET
      request_for=$1, name=$2, employee_code=$3, location=$4, access_type=$5,
      application_id=$6, department=$7, role=$8, reports_to=$9, training_status=$10,
      attachment_path=$11, remarks=$12, approver1=$13, approver2=$14, approver3=$15,
      status=$16, updated_on=NOW()
      WHERE id=$17 RETURNING *`,
      [
        request_for,
        name,
        employee_code || null,
        location,
        access_type,
        application_id,
        department,
        role,
        reports_to,
        training_status,
        attachment_path || null,
        remarks || null,
        approver1,
        approver2 || null,
        approver3 || null,
        status || "Pending",
        id,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUserRequest = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM user_request WHERE id=$1", [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
