import React, { createContext, useState, useEffect, ReactNode } from "react";
import {
  fetchSystems,
  addSystemAPI,
  updateSystemAPI,
  deleteSystemAPI,
} from "../../utils/api";

export const useSystemContext = () => {
  const ctx = React.useContext(SystemContext);
  if (!ctx)
    throw new Error("useSystemContext must be used within SystemProvider");
  return ctx;
};

// types.ts (or wherever System is defined)
export interface System {
  id: number;
  transaction_id: string;
  plant_location_id?: string;
  user_location?: string;
  building_location?: string;
  department_id?: string;
  allocated_to_user_name?: string;
  host_name?: string;
  make?: string;
  model?: string;
  serial_no?: string;
  processor?: string;
  ram_capacity?: string;
  hdd_capacity?: string;
  ip_address?: string;
  other_software?: string;
  windows_activated?: boolean;
  os_version_service_pack?: string;
  architecture?: string;
  type_of_asset?: string;
  category_gxp?: string;
  gamp_category?: string;
  instrument_equipment_name?: string;
  equipment_instrument_id?: string;
  instrument_owner?: string;
  service_tag?: string;
  warranty_status?: string;
  warranty_end_date?: string;
  connected_no_of_equipments?: number;
  application_name?: string;
  application_version?: string;
  application_oem?: string;
  application_vendor?: string;
  user_management_applicable?: boolean;
  application_onboard?: string;
  system_process_owner?: string;
  database_version?: string;
  domain_workgroup?: string;
  connected_through?: string;
  specific_vlan?: string;
  ip_address_type?: string;
  date_time_sync_available?: boolean;
  antivirus?: string;
  antivirus_version?: string;
  backup_type?: string;
  backup_frequency_days?: number;
  backup_path?: string;
  backup_tool?: string;
  backup_procedure_available?: boolean;
  folder_deletion_restriction?: boolean;
  remote_tool_available?: boolean;
  os_administrator?: string;
  system_running_with?: string;
  audit_trail_adequacy?: string;
  user_roles_availability?: boolean;
  user_roles_challenged?: boolean;
  system_managed_by?: string;
  planned_upgrade_fy2526?: boolean;
  eol_eos_upgrade_status?: string;
  system_current_status?: string;
  purchase_po?: string;
  purchase_vendor_name?: string;
  amc_vendor_name?: string;
  renewal_po?: string;
  warranty_period?: string;
  amc_start_date?: string;
  amc_expiry_date?: string;
  sap_asset_no?: string;
  remarks?: string;
  status?: string;
  created_on?: string;
  updated_on?: string;
  system_name?: string;
  description?: string;
}


interface SystemContextType {
  systems: System[];
  addSystem: (system: System) => void;
  updateSystem: (index: number, updated: System) => void;
  deleteSystem: (index: number) => void;
}

// No default systems, will fetch from API

export const SystemContext = createContext<SystemContextType | undefined>(
  undefined
);

export const SystemProvider = ({ children }: { children: ReactNode }) => {
  const [systems, setSystems] = useState<System[]>([]);

  const fetchAndSetSystems = () => {
    fetchSystems()
      .then((data) => {
        // Normalize API data to match System interface
        const normalized = data.map((p: any) => ({
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
          system_name: p.system_name,
          description: p.description,
        }));
        setSystems(normalized as System[]);
      })
      .catch((err) => {
        setSystems([]);
      });
  };

  useEffect(() => {
    fetchAndSetSystems();
  }, []);

  // Add system via API
  const addSystem = async (system: System) => {
    // Exclude id, created_on, updated_on from payload
    const { id, created_on, updated_on, ...payload } = system;
    await addSystemAPI(payload);
    fetchAndSetSystems();
  };

  // Update system via API
  const updateSystem = async (index: number, updated: System) => {
    const system = systems[index];
    if (!system || !system.id) return;
    // Exclude id, created_on, updated_on from payload
    const { id, created_on, updated_on, ...payload } = updated;
    await updateSystemAPI(system.id, payload);
    fetchAndSetSystems();
  };

  // Delete system via API
  const deleteSystem = async (index: number) => {
    const system = systems[index];
    if (!system || !system.id) return;
    await deleteSystemAPI(system.id);
    fetchAndSetSystems();
  };

  return (
    <SystemContext.Provider
      value={{ systems, addSystem, updateSystem, deleteSystem }}
    >
      {children}
    </SystemContext.Provider>
  );
};
