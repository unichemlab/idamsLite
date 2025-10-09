const db = require("../config/db");
// Get all applications (GET)
exports.getAllApplications = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM application_master ORDER BY id ASC"
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching applications:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


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
      role_lock = false,
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
          multiple_role_access, role_lock, status, created_on, updated_on
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
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
    console.log("[addApplication] Inserted row:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[addApplication] Error:", err);
    if (err && err.stack) {
      console.error("[addApplication] Error stack:", err.stack);
    }
    res.status(500).json({
      error: err && err.message ? err.message : "Internal server error",
    });
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
      role_lock = false,
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
          role_lock = $13,
          status = $14,
          updated_on = NOW()
        WHERE id = $15 RETURNING *`,
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
      `SELECT DISTINCT r.id AS role_id, r.role_name AS role_name, a.id AS application_id, a.display_name 
       FROM application_master a
       JOIN role_master r ON r.id = ANY(string_to_array(a.role_id, ',')::int[])
       WHERE a.plant_location_id = $1 AND a.department_id = $2 AND a.status='ACTIVE'
       ORDER BY r.role_name`,
      [plantID, departmentID]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No roles or applications found for this plant and department" });
    }

    // Unique roles
    const roles = Array.from(
      new Set(result.rows.map(row => JSON.stringify({ id: row.role_id, name: row.role_name })))
    ).map(item => JSON.parse(item));

    // Applications
    const applications = Array.from(new Set (result.rows.map(row => JSON.stringify({
      id: row.application_id,
      name: row.display_name
    })))).map(item => JSON.parse(item));

    res.status(200).json({ roles, applications });
  } catch (err) {
    console.error("Error fetching roles and applications:", err);
    res.status(500).json({ error: err.message });
  }
};


