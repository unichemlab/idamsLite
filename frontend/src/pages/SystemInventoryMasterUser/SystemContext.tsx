import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";
import {
  fetchSystems,
  addSystemAPI,
  updateSystemAPI,
  deleteSystemAPI,
} from "../../utils/api";
import { System } from "../../types/system";

/* =========================
   CONTEXT HOOK
========================= */
export const useSystemContext = () => {
  const ctx = useContext(SystemContext);
  if (!ctx) {
    throw new Error("useSystemContext must be used within SystemProvider");
  }
  return ctx;
};

// Re-export System type
export type { System };

/* =========================
   CONTEXT TYPE
========================= */
interface SystemContextType {
  systems: System[];
  addSystem: (system: System) => Promise<void>;
  updateSystem: (index: number, updated: System) => Promise<void>;
  deleteSystem: (index: number) => Promise<void>;
}

/* =========================
   CONTEXT
========================= */
export const SystemContext = createContext<SystemContextType | undefined>(
  undefined
);

/* =========================
   PROVIDER
========================= */
export const SystemProvider = ({ children }: { children: ReactNode }) => {
  const [systems, setSystems] = useState<System[]>([]);

  /* =========================
     FETCH + NORMALIZE
  ========================= */
  const fetchAndSetSystems = async () => {
    try {
      const data = await fetchSystems();

      const normalized: System[] = data.map((p: any) => ({
        id: p.id,

        transaction_id: p.transaction_id,
        plant_location_id: p.plant_location_id,
        user_location: p.user_location,
        building_location: p.building_location,
        department_id: p.department_id,
        allocated_to_user_name: p.allocated_to_user_name,
        host_name: p.host_name,

        make: p.make,
        model: p.model,
        serial_no: p.serial_no,
        processor: p.processor,
        ram_capacity: p.ram_capacity,
        hdd_capacity: p.hdd_capacity,
        ip_address: p.ip_address,
        other_software: p.other_software,

        windows_activated: p.windows_activated,
        os_version_service_pack: p.os_version_service_pack,
        architecture: p.architecture,
        type_of_asset: p.type_of_asset,
        category_gxp: p.category_gxp,
        gamp_category: p.gamp_category,

        instrument_equipment_name: p.instrument_equipment_name,
        equipment_instrument_id: p.equipment_instrument_id,
        instrument_owner: p.instrument_owner,

        service_tag: p.service_tag,
        warranty_status: p.warranty_status,
        warranty_end_date: p.warranty_end_date,

        connected_no_of_equipments: p.connected_no_of_equipments,

        application_name: p.application_name,
        application_version: p.application_version,
        application_oem: p.application_oem,
        application_vendor: p.application_vendor,
        user_management_applicable: p.user_management_applicable,
        application_onboard: p.application_onboard,

        system_process_owner: p.system_process_owner,
        database_version: p.database_version,
        domain_workgroup: p.domain_workgroup,
        connected_through: p.connected_through,
        specific_vlan: p.specific_vlan,
        ip_address_type: p.ip_address_type,
        date_time_sync_available: p.date_time_sync_available,

        antivirus: p.antivirus,
        antivirus_version: p.antivirus_version,

        backup_type: p.backup_type,
        backup_frequency_days: p.backup_frequency_days,
        backup_path: p.backup_path,
        backup_tool: p.backup_tool,
        backup_procedure_available: p.backup_procedure_available,

        folder_deletion_restriction: p.folder_deletion_restriction,
        remote_tool_available: p.remote_tool_available,

        os_administrator: p.os_administrator,
        system_running_with: p.system_running_with,
        audit_trail_adequacy: p.audit_trail_adequacy,

        user_roles_availability: p.user_roles_availability,
        user_roles_challenged: p.user_roles_challenged,

        system_managed_by: p.system_managed_by,
        planned_upgrade_fy2526: p.planned_upgrade_fy2526,
        eol_eos_upgrade_status: p.eol_eos_upgrade_status,
        system_current_status: p.system_current_status,

        purchase_po: p.purchase_po,
        purchase_vendor_name: p.purchase_vendor_name,
        amc_vendor_name: p.amc_vendor_name,
        renewal_po: p.renewal_po,
        warranty_period: p.warranty_period,

        amc_start_date: p.amc_start_date,
        amc_expiry_date: p.amc_expiry_date,

        sap_asset_no: p.sap_asset_no,
        remarks: p.remarks,

        status: p.status,
        created_on: p.created_on,
        updated_on: p.updated_on,
      }));

      setSystems(normalized);
    } catch (err) {
      console.error("Error fetching systems:", err);
      setSystems([]);
    }
  };

  useEffect(() => {
    fetchAndSetSystems();
  }, []);

  /* =========================
     ADD SYSTEM
  ========================= */
  const addSystem = async (system: System) => {
    try {
      const {
        id,
        created_on,
        updated_on,
        ...payload
      } = system;

      await addSystemAPI(payload);
      await fetchAndSetSystems();
    } catch (err) {
      console.error("Error adding system:", err);
      throw err;
    }
  };

  /* =========================
     UPDATE SYSTEM
  ========================= */
  const updateSystem = async (index: number, updated: System) => {
    try {
      const current = systems[index];
      if (!current?.id) return;

      const {
        id,
        created_on,
        updated_on,
        ...payload
      } = updated;

      await updateSystemAPI(current.id, payload);
      await fetchAndSetSystems();
    } catch (err) {
      console.error("Error updating system:", err);
      throw err;
    }
  };

  /* =========================
     DELETE SYSTEM
  ========================= */
  const deleteSystem = async (index: number) => {
    try {
      const system = systems[index];
      if (!system?.id) return;

      await deleteSystemAPI(system.id);
      await fetchAndSetSystems();
    } catch (err) {
      console.error("Error deleting system:", err);
      throw err;
    }
  };

  return (
    <SystemContext.Provider
      value={{ systems, addSystem, updateSystem, deleteSystem }}
    >
      {children}
    </SystemContext.Provider>
  );
};
