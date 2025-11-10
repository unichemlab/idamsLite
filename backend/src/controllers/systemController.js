const { logActivity } = require("../utils/activityLogger");

// Dummy in-memory data for demonstration. Replace with DB logic as needed.
let systems = [
  {
    id: 1,
    transaction_id: "SYS00000001",
    plant_location_id: "1",
    user_location: "",
    building_location: "",
    department_id: "1",
    allocated_to_user_name: "",
    host_name: "MES-GOA1-PROD-01",
    make: "",
    model: "",
    serial_no: "",
    processor: "",
    ram_capacity: "",
    hdd_capacity: "",
    ip_address: "",
    other_software: "",
    windows_activated: false,
    os_version_service_pack: "",
    architecture: "",
    type_of_asset: "",
    category_gxp: "",
    gamp_category: "",
    instrument_equipment_name: "",
    equipment_instrument_id: "EQP-GOA1-PROD-001",
    instrument_owner: "",
    service_tag: "",
    warranty_status: "",
    warranty_end_date: "",
    connected_no_of_equipments: 0,
    application_name: "Manufacturing Execution System",
    application_version: "v4.2.1",
    application_oem: "",
    application_vendor: "",
    user_management_applicable: false,
    application_onboard: "",
    system_process_owner: "",
    database_version: "",
    domain_workgroup: "",
    connected_through: "",
    specific_vlan: "",
    ip_address_type: "",
    date_time_sync_available: false,
    antivirus: "",
    antivirus_version: "",
    backup_type: "",
    backup_frequency_days: 0,
    backup_path: "",
    backup_tool: "",
    backup_procedure_available: false,
    folder_deletion_restriction: false,
    remote_tool_available: false,
    os_administrator: "",
    system_running_with: "",
    audit_trail_adequacy: "",
    user_roles_availability: false,
    user_roles_challenged: false,
    system_managed_by: "",
    planned_upgrade_fy2526: false,
    eol_eos_upgrade_status: "",
    system_current_status: "",
    purchase_po: "",
    purchase_vendor_name: "",
    amc_vendor_name: "",
    renewal_po: "",
    warranty_period: "",
    amc_start_date: "",
    amc_expiry_date: "",
    sap_asset_no: "",
    remarks: "",
    status: "ACTIVE",
    created_on: "2025-09-05 17:22:19.656851",
    updated_on: "2025-09-05 17:22:19.656851",
    system_name: "MES-GOA1-PROD-01",
    description: "Manufacturing Execution System",
  },
  {
    id: 2,
    transaction_id: "SYS00000002",
    plant_location_id: "1",
    user_location: "",
    building_location: "",
    department_id: "2",
    allocated_to_user_name: "",
    host_name: "LIMS-GOA1-QC-01",
    make: "",
    model: "",
    serial_no: "",
    processor: "",
    ram_capacity: "",
    hdd_capacity: "",
    ip_address: "",
    other_software: "",
    windows_activated: false,
    os_version_service_pack: "",
    architecture: "",
    type_of_asset: "",
    category_gxp: "",
    gamp_category: "",
    instrument_equipment_name: "",
    equipment_instrument_id: "EQP-GOA1-QC-001",
    instrument_owner: "",
    service_tag: "",
    warranty_status: "",
    warranty_end_date: "",
    connected_no_of_equipments: 0,
    application_name: "Laboratory Information Management System",
    application_version: "v3.8.5",
    application_oem: "",
    application_vendor: "",
    user_management_applicable: false,
    application_onboard: "",
    system_process_owner: "",
    database_version: "",
    domain_workgroup: "",
    connected_through: "",
    specific_vlan: "",
    ip_address_type: "",
    date_time_sync_available: false,
    antivirus: "",
    antivirus_version: "",
    backup_type: "",
    backup_frequency_days: 0,
    backup_path: "",
    backup_tool: "",
    backup_procedure_available: false,
    folder_deletion_restriction: false,
    remote_tool_available: false,
    os_administrator: "",
    system_running_with: "",
    audit_trail_adequacy: "",
    user_roles_availability: false,
    user_roles_challenged: false,
    system_managed_by: "",
    planned_upgrade_fy2526: false,
    eol_eos_upgrade_status: "",
    system_current_status: "",
    purchase_po: "",
    purchase_vendor_name: "",
    amc_vendor_name: "",
    renewal_po: "",
    warranty_period: "",
    amc_start_date: "",
    amc_expiry_date: "",
    sap_asset_no: "",
    remarks: "",
    status: "ACTIVE",
    created_on: "2025-09-05 17:22:19.656851",
    updated_on: "2025-09-05 17:22:19.656851",
    system_name: "LIMS-GOA1-QC-01",
    description: "Laboratory Information Management System",
  },
  {
    id: 3,
    transaction_id: "SYS00000003",
    plant_location_id: "11",
    user_location: "",
    building_location: "",
    department_id: "15",
    allocated_to_user_name: "",
    host_name: "ERP-CORP-FIN-01",
    make: "",
    model: "",
    serial_no: "",
    processor: "",
    ram_capacity: "",
    hdd_capacity: "",
    ip_address: "",
    other_software: "",
    windows_activated: false,
    os_version_service_pack: "",
    architecture: "",
    type_of_asset: "",
    category_gxp: "",
    gamp_category: "",
    instrument_equipment_name: "",
    equipment_instrument_id: "EQP-CORP-FIN-001",
    instrument_owner: "",
    service_tag: "",
    warranty_status: "",
    warranty_end_date: "",
    connected_no_of_equipments: 0,
    application_name: "Enterprise Resource Planning",
    application_version: "v12.2",
    application_oem: "",
    application_vendor: "",
    user_management_applicable: false,
    application_onboard: "",
    system_process_owner: "",
    database_version: "",
    domain_workgroup: "",
    connected_through: "",
    specific_vlan: "",
    ip_address_type: "",
    date_time_sync_available: false,
    antivirus: "",
    antivirus_version: "",
    backup_type: "",
    backup_frequency_days: 0,
    backup_path: "",
    backup_tool: "",
    backup_procedure_available: false,
    folder_deletion_restriction: false,
    remote_tool_available: false,
    os_administrator: "",
    system_running_with: "",
    audit_trail_adequacy: "",
    user_roles_availability: false,
    user_roles_challenged: false,
    system_managed_by: "",
    planned_upgrade_fy2526: false,
    eol_eos_upgrade_status: "",
    system_current_status: "",
    purchase_po: "",
    purchase_vendor_name: "",
    amc_vendor_name: "",
    renewal_po: "",
    warranty_period: "",
    amc_start_date: "",
    amc_expiry_date: "",
    sap_asset_no: "",
    remarks: "",
    status: "ACTIVE",
    created_on: "2025-09-05 17:22:19.656851",
    updated_on: "2025-09-05 17:22:19.656851",
    system_name: "ERP-CORP-FIN-01",
    description: "Enterprise Resource Planning",
  },
];

exports.getAllSystems = (req, res) => {
  res.json(systems);
};

exports.getSystemById = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const system = systems.find((s) => s.id === id);
  if (!system) return res.status(404).json({ error: "System not found" });
  res.json(system);
};

exports.updateSystem = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = systems.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: "System not found" });
  const oldRec = { ...systems[idx] };
  systems[idx] = {
    ...systems[idx],
    ...req.body,
    updated_on: new Date().toISOString(),
  };

  // non-blocking activity log
  try {
    const userId = req.user && req.user.id ? req.user.id : null;
    const reqMeta = {
      ip:
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection?.remoteAddress ||
        null,
      userAgent: req.headers["user-agent"] || null,
    };
    logActivity({
      userId,
      module: "system",
      tableName: "system_master",
      recordId: id,
      action: "update",
      oldValue: oldRec,
      newValue: systems[idx],
      comments: `Updated system id ${id}`,
      reqMeta,
    })
      .then((insertedId) => {
        if (insertedId)
          console.log(`Activity log (updateSystem) inserted id: ${insertedId}`);
      })
      .catch((e) => console.warn("Activity log failed (updateSystem)", e));
  } catch (e) {
    console.warn("Activity log exception (updateSystem)", e);
  }

  res.json(systems[idx]);
};

// Create system
exports.createSystem = (req, res) => {
  const payload = { ...req.body };
  const maxId = systems.reduce((m, s) => Math.max(m, s.id || 0), 0);
  const newId = maxId + 1;
  const now = new Date().toISOString();
  const newSystem = { id: newId, ...payload, created_on: now, updated_on: now };
  systems.push(newSystem);

  // non-blocking activity log
  try {
    const userId = req.user && req.user.id ? req.user.id : null;
    const reqMeta = {
      ip:
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection?.remoteAddress ||
        null,
      userAgent: req.headers["user-agent"] || null,
    };
    logActivity({
      userId,
      module: "system",
      tableName: "system_master",
      recordId: newId,
      action: "create",
      oldValue: null,
      newValue: newSystem,
      comments: `Created system id ${newId}`,
      reqMeta,
    })
      .then((insertedId) => {
        if (insertedId)
          console.log(`Activity log (createSystem) inserted id: ${insertedId}`);
      })
      .catch((e) => console.warn("Activity log failed (createSystem)", e));
  } catch (e) {
    console.warn("Activity log exception (createSystem)", e);
  }

  res.status(201).json(newSystem);
};

// Delete system
exports.deleteSystem = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = systems.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: "System not found" });
  const oldRec = { ...systems[idx] };
  systems.splice(idx, 1);

  // non-blocking activity log
  try {
    const userId = req.user && req.user.id ? req.user.id : null;
    const reqMeta = {
      ip:
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection?.remoteAddress ||
        null,
      userAgent: req.headers["user-agent"] || null,
    };
    logActivity({
      userId,
      module: "system",
      tableName: "system_master",
      recordId: id,
      action: "delete",
      oldValue: oldRec,
      newValue: null,
      comments: `Deleted system id ${id}`,
      reqMeta,
    })
      .then((insertedId) => {
        if (insertedId)
          console.log(`Activity log (deleteSystem) inserted id: ${insertedId}`);
      })
      .catch((e) => console.warn("Activity log failed (deleteSystem)", e));
  } catch (e) {
    console.warn("Activity log exception (deleteSystem)", e);
  }

  res.json({ success: true });
};
