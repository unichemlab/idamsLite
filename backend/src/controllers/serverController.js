const db = require("../config/db");

// Get all servers
exports.getAllServers = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM server_inventory_master ORDER BY id ASC"
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching servers:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get server by ID
exports.getServerById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const result = await db.query(
      "SELECT * FROM server_inventory_master WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Server not found" });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching server by id:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add server
exports.addServer = async (req, res) => {
  try {
    const fields = [
      "transaction_id",
      "plant_location_id",
      "rack_number",
      "server_owner",
      "type_tower_rack_mounted",
      "server_rack_location_area",
      "asset_no",
      "host_name",
      "make",
      "model",
      "serial_no",
      "os",
      "physical_server_host_name",
      "idrac_ilo",
      "ip_address",
      "part_no",
      "application",
      "application_version",
      "application_oem",
      "application_vendor",
      "system_owner",
      "vm_display_name",
      "vm_type",
      "vm_os",
      "vm_version",
      "vm_server_ip",
      "domain_workgroup",
      "windows_activated",
      "backup_agent",
      "antivirus",
      "category_gxp",
      "current_status",
      "server_managed_by",
      "remarks_application_usage",
      "start_date",
      "end_date",
      "aging",
      "environment",
      "server_criticality",
      "database_application",
      "current_rpo",
      "reduce_rpo_time",
      "server_to_so_timeline",
      "purchased_date",
      "purchased_po",
      "warranty_start_date",
      "amc_warranty_expiry_date",
      "sap_asset_no",
      "amc_vendor",
      "remarks",
      "status",
    ];
    const values = fields.map((f) => req.body[f]);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(",");
    const query = `INSERT INTO server_inventory_master (${fields.join(
      ","
    )},created_on,updated_on) VALUES (${placeholders},NOW(),NOW()) RETURNING *`;
    const result = await db.query(query, [...values]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding server:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update server
exports.updateServer = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const fields = [
      "transaction_id",
      "plant_location_id",
      "rack_number",
      "server_owner",
      "type_tower_rack_mounted",
      "server_rack_location_area",
      "asset_no",
      "host_name",
      "make",
      "model",
      "serial_no",
      "os",
      "physical_server_host_name",
      "idrac_ilo",
      "ip_address",
      "part_no",
      "application",
      "application_version",
      "application_oem",
      "application_vendor",
      "system_owner",
      "vm_display_name",
      "vm_type",
      "vm_os",
      "vm_version",
      "vm_server_ip",
      "domain_workgroup",
      "windows_activated",
      "backup_agent",
      "antivirus",
      "category_gxp",
      "current_status",
      "server_managed_by",
      "remarks_application_usage",
      "start_date",
      "end_date",
      "aging",
      "environment",
      "server_criticality",
      "database_application",
      "current_rpo",
      "reduce_rpo_time",
      "server_to_so_timeline",
      "purchased_date",
      "purchased_po",
      "warranty_start_date",
      "amc_warranty_expiry_date",
      "sap_asset_no",
      "amc_vendor",
      "remarks",
      "status",
    ];
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
    const values = fields.map((f) => req.body[f]);
    const query = `UPDATE server_inventory_master SET ${setClause}, updated_on = NOW() WHERE id = $${
      fields.length + 1
    } RETURNING *`;
    const result = await db.query(query, [...values, id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Server not found" });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error updating server:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete server
exports.deleteServer = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const result = await db.query(
      "DELETE FROM server_inventory_master WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Server not found" });
    res.status(200).json({ message: "Server deleted successfully" });
  } catch (err) {
    console.error("Error deleting server:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
