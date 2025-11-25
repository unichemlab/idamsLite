const { logActivity } = require("../utils/activityLogger");
const { submitForApproval } = require("../utils/masterApprovalHelper");

// ------------------------------
// IN-MEMORY SYSTEM LIST
// ------------------------------
let systems = [{ id: 1, transaction_id: "SYS00000001", plant_location_id: "1", user_location: "", building_location: "", department_id: "1", allocated_to_user_name: "", host_name: "MES-GOA1-PROD-01", make: "", model: "", serial_no: "", processor: "", ram_capacity: "", hdd_capacity: "", ip_address: "", other_software: "", windows_activated: false, os_version_service_pack: "", architecture: "", type_of_asset: "", category_gxp: "", gamp_category: "", instrument_equipment_name: "", equipment_instrument_id: "EQP-GOA1-PROD-001", instrument_owner: "", service_tag: "", warranty_status: "", warranty_end_date: "", connected_no_of_equipments: 0, application_name: "Manufacturing Execution System", application_version: "v4.2.1", application_oem: "", application_vendor: "", user_management_applicable: false, application_onboard: "", system_process_owner: "", database_version: "", domain_workgroup: "", connected_through: "", specific_vlan: "", ip_address_type: "", date_time_sync_available: false, antivirus: "", antivirus_version: "", backup_type: "", backup_frequency_days: 0, backup_path: "", backup_tool: "", backup_procedure_available: false, folder_deletion_restriction: false, remote_tool_available: false, os_administrator: "", system_running_with: "", audit_trail_adequacy: "", user_roles_availability: false, user_roles_challenged: false, system_managed_by: "", planned_upgrade_fy2526: false, eol_eos_upgrade_status: "", system_current_status: "", purchase_po: "", purchase_vendor_name: "", amc_vendor_name: "", renewal_po: "", warranty_period: "", amc_start_date: "", amc_expiry_date: "", sap_asset_no: "", remarks: "", status: "ACTIVE", created_on: "2025-09-05 17:22:19.656851", updated_on: "2025-09-05 17:22:19.656851", system_name: "MES-GOA1-PROD-01", description: "Manufacturing Execution System", }, { id: 2, transaction_id: "SYS00000002", plant_location_id: "1", user_location: "", building_location: "", department_id: "2", allocated_to_user_name: "", host_name: "LIMS-GOA1-QC-01", make: "", model: "", serial_no: "", processor: "", ram_capacity: "", hdd_capacity: "", ip_address: "", other_software: "", windows_activated: false, os_version_service_pack: "", architecture: "", type_of_asset: "", category_gxp: "", gamp_category: "", instrument_equipment_name: "", equipment_instrument_id: "EQP-GOA1-QC-001", instrument_owner: "", service_tag: "", warranty_status: "", warranty_end_date: "", connected_no_of_equipments: 0, application_name: "Laboratory Information Management System", application_version: "v3.8.5", application_oem: "", application_vendor: "", user_management_applicable: false, application_onboard: "", system_process_owner: "", database_version: "", domain_workgroup: "", connected_through: "", specific_vlan: "", ip_address_type: "", date_time_sync_available: false, antivirus: "", antivirus_version: "", backup_type: "", backup_frequency_days: 0, backup_path: "", backup_tool: "", backup_procedure_available: false, folder_deletion_restriction: false, remote_tool_available: false, os_administrator: "", system_running_with: "", audit_trail_adequacy: "", user_roles_availability: false, user_roles_challenged: false, system_managed_by: "", planned_upgrade_fy2526: false, eol_eos_upgrade_status: "", system_current_status: "", purchase_po: "", purchase_vendor_name: "", amc_vendor_name: "", renewal_po: "", warranty_period: "", amc_start_date: "", amc_expiry_date: "", sap_asset_no: "", remarks: "", status: "ACTIVE", created_on: "2025-09-05 17:22:19.656851", updated_on: "2025-09-05 17:22:19.656851", system_name: "LIMS-GOA1-QC-01", description: "Laboratory Information Management System", }, { id: 3, transaction_id: "SYS00000003", plant_location_id: "11", user_location: "", building_location: "", department_id: "15", allocated_to_user_name: "", host_name: "ERP-CORP-FIN-01", make: "", model: "", serial_no: "", processor: "", ram_capacity: "", hdd_capacity: "", ip_address: "", other_software: "", windows_activated: false, os_version_service_pack: "", architecture: "", type_of_asset: "", category_gxp: "", gamp_category: "", instrument_equipment_name: "", equipment_instrument_id: "EQP-CORP-FIN-001", instrument_owner: "", service_tag: "", warranty_status: "", warranty_end_date: "", connected_no_of_equipments: 0, application_name: "Enterprise Resource Planning", application_version: "v12.2", application_oem: "", application_vendor: "", user_management_applicable: false, application_onboard: "", system_process_owner: "", database_version: "", domain_workgroup: "", connected_through: "", specific_vlan: "", ip_address_type: "", date_time_sync_available: false, antivirus: "", antivirus_version: "", backup_type: "", backup_frequency_days: 0, backup_path: "", backup_tool: "", backup_procedure_available: false, folder_deletion_restriction: false, remote_tool_available: false, os_administrator: "", system_running_with: "", audit_trail_adequacy: "", user_roles_availability: false, user_roles_challenged: false, system_managed_by: "", planned_upgrade_fy2526: false, eol_eos_upgrade_status: "", system_current_status: "", purchase_po: "", purchase_vendor_name: "", amc_vendor_name: "", renewal_po: "", warranty_period: "", amc_start_date: "", amc_expiry_date: "", sap_asset_no: "", remarks: "", status: "ACTIVE", created_on: "2025-09-05 17:22:19.656851", updated_on: "2025-09-05 17:22:19.656851", system_name: "ERP-CORP-FIN-01", description: "Enterprise Resource Planning", },];

// ------------------------------
// GET ALL SYSTEMS
// ------------------------------
exports.getAllSystems = (req, res) => {
  res.json(systems);
};

// ------------------------------
// GET SYSTEM BY ID
// ------------------------------
exports.getSystemById = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const system = systems.find((s) => s.id === id);
  if (!system) return res.status(404).json({ error: "System not found" });
  res.json(system);
};

// ------------------------------
// CREATE SYSTEM  (WITH APPROVAL)
// ------------------------------
exports.createSystem = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";

  try {
    const payload = { ...req.body };

    // Prepare new unapproved data
    const newSystemData = {
      ...payload,
      status: payload.status || "ACTIVE",
    };

    // Submit for approval
    const approvalId = await submitForApproval({
      module: "system",
      tableName: "system_master",
      action: "create",
      recordId: null,
      oldValue: null,
      newValue: newSystemData,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Create system: ${payload.system_name || ""}`,
    });

    // If approval workflow is OFF → create immediately
    if (approvalId === null) {
      const maxId = systems.reduce((m, s) => Math.max(m, s.id || 0), 0);
      const newId = maxId + 1;
      const now = new Date().toISOString();

      const newSystem = {
        id: newId,
        ...newSystemData,
        created_on: now,
        updated_on: now,
      };

      systems.push(newSystem);

      await logActivity({
        userId,
        module: "system",
        tableName: "system_master",
        recordId: newId,
        action: "create",
        oldValue: null,
        newValue: newSystem,
        comments: `Created system id ${newId}`,
        reqMeta: req._meta || {},
      });

      return res.status(201).json(newSystem);
    }

    // Otherwise → pending approval
    res.status(202).json({
      message: "System creation submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: newSystemData,
    });

  } catch (err) {
    console.error("Error creating system:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// UPDATE SYSTEM  (WITH APPROVAL)
// ------------------------------
exports.updateSystem = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";
  const id = parseInt(req.params.id, 10);

  try {
    const idx = systems.findIndex((s) => s.id === id);
    if (idx === -1) return res.status(404).json({ error: "System not found" });

    const oldValue = { ...systems[idx] };
    const newValue = { ...systems[idx], ...req.body };

    // Submit for approval
    const approvalId = await submitForApproval({
      module: "system",
      tableName: "system_master",
      action: "update",
      recordId: id,
      oldValue,
      newValue,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Update system id ${id}`,
    });

    // If approval workflow is OFF → update immediately
    if (approvalId === null) {
      systems[idx] = {
        ...systems[idx],
        ...req.body,
        updated_on: new Date().toISOString(),
      };

      await logActivity({
        userId,
        module: "system",
        tableName: "system_master",
        recordId: id,
        action: "update",
        oldValue,
        newValue: systems[idx],
        comments: `Updated system id ${id}`,
        reqMeta: req._meta || {},
      });

      return res.json(systems[idx]);
    }

    res.status(202).json({
      message: "System update submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: newValue,
    });

  } catch (err) {
    console.error("Error updating system:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------
// DELETE SYSTEM (WITH APPROVAL)
// ------------------------------
exports.deleteSystem = async (req, res) => {
  const userId = req.user?.id || req.user?.user_id;
  const username = req.user?.username || "Unknown";
  const id = parseInt(req.params.id, 10);

  try {
    const idx = systems.findIndex((s) => s.id === id);
    if (idx === -1) return res.status(404).json({ error: "System not found" });

    const oldValue = { ...systems[idx] };

    // Submit for approval
    const approvalId = await submitForApproval({
      module: "system",
      tableName: "system_master",
      action: "delete",
      recordId: id,
      oldValue,
      newValue: null,
      requestedBy: userId,
      requestedByUsername: username,
      comments: `Delete system id ${id}`,
    });

    // If approval workflow is OFF → delete immediately
    if (approvalId === null) {
      systems.splice(idx, 1);

      await logActivity({
        userId,
        module: "system",
        tableName: "system_master",
        recordId: id,
        action: "delete",
        oldValue,
        newValue: null,
        comments: `Deleted system id ${id}`,
        reqMeta: req._meta || {},
      });

      return res.json({ success: true });
    }

    res.status(202).json({
      message: "System deletion submitted for approval",
      approvalId,
      status: "PENDING_APPROVAL",
      data: oldValue,
    });

  } catch (err) {
    console.error("Error deleting system:", err);
    res.status(500).json({ error: err.message });
  }
};
