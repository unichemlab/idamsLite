// Delete Application (DELETE)
exports.deleteApplication = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid application ID" });
    }
    const result = await db.query(
      `DELETE FROM application_master WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.status(200).json({ message: "Application deleted successfully" });
  } catch (err) {
    console.error("Error deleting application:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
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
    // Fetch all applications
    const result = await db.query("SELECT * FROM application_master");
    // Fetch all roles for mapping
    const rolesResult = await db.query("SELECT id, role_name FROM role_master");
    const roleMap = {};
    rolesResult.rows.forEach((r) => {
      roleMap[r.id] = r.role_name;
    });
    // Map role_id (comma-separated) to role names array
    const applications = result.rows.map((app) => {
      let roleNames = [];
      if (app.role_id) {
        const ids = String(app.role_id)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        roleNames = ids.map((id) => roleMap[id] || id);
      }
      return { ...app, role_names: roleNames };
    });
    res.status(200).json(applications);
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

exports.getRoleApplicationIDByPlantIdandDepartment = async (req, res) => {
  try {
    const plantID = parseInt(req.params.id, 10);
    const departmentID = parseInt(req.params.dept_id, 10);

    if (isNaN(plantID) || isNaN(departmentID)) {
      return res.status(400).json({ error: "Invalid plant or department ID" });
    }

    // Fetch all roles
    const rolesResult = await db.query("SELECT id, role_name FROM role_master");
    const allRoles = rolesResult.rows.map((r) => ({
      id: String(r.id),
      name: r.role_name,
    }));
    // Fetch applications for plant and department
    const appsResult = await db.query(
      `SELECT id, display_name, role_id FROM application_master WHERE plant_location_id = $1 AND department_id = $2`,
      [plantID, departmentID]
    );
    // Extract unique role IDs from all applications
    const roleIdSet = new Set();
    appsResult.rows.forEach((app) => {
      if (app.role_id) {
        String(app.role_id)
          .split(",")
          .map((s) => s.trim())
          .forEach((id) => roleIdSet.add(id));
      }
    });
    // Filter roles to only those used in these applications
    const roles = allRoles.filter((r) => roleIdSet.has(r.id));
    // Applications list
    const applications = appsResult.rows.map((row) => ({
      id: row.id,
      name: row.display_name,
    }));
    res.status(200).json({ roles, applications });
  } catch (err) {
    console.error("Error fetching roles and applications:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add Application (POST)
exports.addApplication = async (req, res) => {
  try {
    console.log("[addApplication] Incoming body:", req.body);
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
    } = req.body;
    // Accept role_id as array or string, store as comma-separated string
    let roleIdStr = Array.isArray(role_id)
      ? role_id.join(",")
      : String(role_id);
    console.log("[addApplication] roleIdStr:", roleIdStr);
    const result = await db.query(
      `INSERT INTO application_master (
          transaction_id, plant_location_id, department_id, application_hmi_name, application_hmi_version,
          equipment_instrument_id, application_hmi_type, display_name, role_id, system_name, system_inventory_id,
          multiple_role_access, status, created_on, updated_on
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
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
        status,
      ]
    );
    console.log("[addApplication] Inserted row:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[addApplication] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Edit Application (PUT)
exports.editApplication = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid application ID" });
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
    } = req.body;
    // Accept role_id as array or string, store as comma-separated string
    let roleIdStr = Array.isArray(role_id)
      ? role_id.join(",")
      : String(role_id);
    const result = await db.query(
      `UPDATE application_master SET
          transaction_id = $1,
          plant_location_id = $2,
          department_id = $3,
          application_hmi_name = $4,
          application_hmi_version = $5,
          equipment_instrument_id = $6,
          application_hmi_type = $7,
          display_name = $8,
          role_id = $9,
          system_name = $10,
          system_inventory_id = $11,
          multiple_role_access = $12,
          status = $13,
          updated_on = NOW()
        WHERE id = $14 RETURNING *`,
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
        status,
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error editing application:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
