const db = require("../config/db");

/**
 * @swagger
 * components:
 *   schemas:
 *     Application:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         transaction_id:
 *           type: string
 *         plant_location_id:
 *           type: integer
 *         department_id:
 *           type: integer
 *         application_hmi_name:
 *           type: string
 *         application_hmi_version:
 *           type: string
 *         equipment_instrument_id:
 *           type: string
 *         application_hmi_type:
 *           type: string
 *         display_name:
 *           type: string
 *         role_id:
 *           type: integer
 *         system_name:
 *           type: string
 *         system_inventory_id:
 *           type: integer
 *         multiple_role_access:
 *           type: boolean
 *         status:
 *           type: string
 *         created_on:
 *           type: string
 *         updated_on:
 *           type: string
 */

exports.getAllApplications = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM application_master");
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


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
      return res.status(404).json({ error: "No departments found for this plant" });
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching departments:", err);
    res.status(500).json({ error: "Internal server error" });
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
      `SELECT DISTINCT r.id AS role_id, r.role_name AS role_name, a.id,a.display_name 
       FROM application_master a
       JOIN role_master r ON a.role_id = r.id
       WHERE a.plant_location_id = $1 AND a.department_id = $2
       ORDER BY r.role_name`,
      [plantID, departmentID]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No roles or applications found for this plant and department" });
    }

    // Extract unique roles
    const roles = Array.from(
      new Set(result.rows.map(row => JSON.stringify({ id: row.role_id, name: row.role_name })))
    ).map(item => JSON.parse(item));

    // Extract applications
    const applications = result.rows.map(row => ({
      id: row.application_id,
      name: row.display_name
    }));

    res.status(200).json({ roles, applications });
  } catch (err) {
    console.error("Error fetching roles and applications:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


