import React, { createContext, useState, useEffect, ReactNode } from "react";
import {
  fetchServers,
  addServerAPI,
  updateServerAPI,
  deleteServerAPI,
} from "../../utils/api";

export const useServerContext = () => {
  const ctx = React.useContext(ServerContext);
  if (!ctx)
    throw new Error("useServerContext must be used within ServerProvider");
  return ctx;
};

// types.ts (or wherever Server is defined)
export interface Server {
  id: number;
  transaction_id: string;
  plant_location_id?: number;
  plant_name?:string;
  rack_number?: string;
  server_owner?: string;
  type_tower_rack_mounted?: string;
  server_rack_location_area?: string;
  asset_no?: string;
  host_name?: string;
  make?: string;
  model?: string;
  serial_no?: string;
  os?: string;
  physical_server_host_name?: string;
  idrac_ilo?: string;
  ip_address?: string;
  part_no?: boolean | string;
  application?: string;
  application_version?: string;
  application_oem?: string;
  application_vendor?: string;
  system_owner?: string;
  vm_display_name?: string;
  vm_type?: string;
  vm_os?: string;
  vm_version?: string;
  vm_server_ip?: string;
  domain_workgroup?: string;
  windows_activated?: number | string;
  backup_agent?: string;
  antivirus?: string;
  category_gxp?: string;
  current_status?: string;
  server_managed_by?: boolean | string;
  remarks_application_usage?: string;
  start_date?: string;
  end_date?: string;
  aging?: string;
  environment?: string;
  server_critility?: string;
  database_appplication?: string;
  current_rpo?: boolean | string;
  reduce_rpo_time?: string;
  server_to_so_timeline?: string;
  purchase_date?: string;
  purchase_po?: number;
  warranty_new_start_date?: string;
  amc_warranty_expiry_date?: string;
  sap_asset_no?: boolean | string;
  amc_vendor?: boolean | string;
  remarks?: string;
  status?: string;
  created_on?: string;
  updated_on?: string;
}

interface ServerContextType {
  servers: Server[];
  refreshServers: () => void;
  addServer: (server: Server) => Promise<void>;
  updateServer: (id: number, updated: Server) => Promise<void>;
  deleteServer: (id: number) => Promise<void>;
}

export const ServerContext = createContext<ServerContextType | undefined>(
  undefined
);

export const ServerProvider = ({ children }: { children: ReactNode }) => {
  const [servers, setServers] = useState<Server[]>([]);

  const fetchAndSetServers = () => {
    fetchServers()
      .then((data: any[]) => {
        // Normalize API data to match Server interface
        const normalized = data.map((p: any) => ({
          id: p.id,
          transaction_id: p.transaction_id,
          plant_location_id: p.plant_location_id,
          rack_number: p.rack_number,
          server_owner: p.server_owner,
          type_tower_rack_mounted: p.type_tower_rack_mounted,
          server_rack_location_area: p.server_rack_location_area,
          asset_no: p.asset_no,
          host_name: p.host_name,
          plant_name:p.plant_name,
          make: p.make,
          model: p.model,
          serial_no: p.serial_no,
          os: p.os,
          physical_server_host_name: p.physical_server_host_name,
          idrac_ilo: p.idrac_ilo,
          ip_address: p.ip_address,
          part_no: p.part_no,
          application: p.application,
          application_version: p.application_version,
          application_oem: p.application_oem,
          application_vendor: p.application_vendor,
          system_owner: p.system_owner,
          vm_display_name: p.vm_display_name,
          vm_type: p.vm_type,
          vm_os: p.vm_os,
          vm_version: p.vm_version,
          vm_server_ip: p.vm_server_ip,
          domain_workgroup: p.domain_workgroup,
          windows_activated: p.windows_activated,
          backup_agent: p.backup_agent,
          antivirus: p.antivirus,
          category_gxp: p.category_gxp,
          current_status: p.current_status,
          server_managed_by: p.server_managed_by,
          remarks_application_usage: p.remarks_application_usage,
          start_date: p.start_date,
          end_date: p.end_date,
          aging: p.aging,
          environment: p.environment,
          server_critility: p.server_critility,
          database_appplication: p.database_appplication,
          current_rpo: p.current_rpo,
          reduce_rpo_time: p.reduce_rpo_time,
          server_to_so_timeline: p.server_to_so_timeline,
          purchase_date: p.purchase_date,
          purchase_po: p.purchase_po,
          warranty_new_start_date: p.warranty_new_start_date,
          amc_warranty_expiry_date: p.amc_warranty_expiry_date,
          sap_asset_no: p.sap_asset_no,
          amc_vendor: p.amc_vendor,
          remarks: p.remarks,
          status: p.status,
          created_on: p.created_on,
          updated_on: p.updated_on,
        }));
        setServers(normalized as Server[]);
      })
      .catch((err: unknown) => {
        console.error("Error fetching servers:", err);
        setServers([]);
      });
  };
const normalizePayload = (obj: any) => {
  Object.keys(obj).forEach((k) => {
    if (obj[k] === "") obj[k] = null;
  });
  return obj;
};
  useEffect(() => {
    fetchAndSetServers();
  }, []);

  // Add server via API
  const addServer = async (server: Server) => {
  try {
    const { id, created_on, updated_on, transaction_id, ...payload } = server;

    normalizePayload(payload); // ✅ IMPORTANT

    await addServerAPI(payload);
    fetchAndSetServers();
  } catch (error) {
    console.error("Error adding server:", error);
    throw error;
  }
};


  // Update server via API - now accepts ID directly
  const updateServer = async (id: number, updated: Server) => {
  try {
    if (!id) {
      console.error("Invalid server ID");
      return;
    }

    const { id: _, created_on, updated_on, transaction_id, ...payload } = updated;

    normalizePayload(payload); // ✅ IMPORTANT

    console.log("Updating server with ID:", id, "Payload:", payload);
    await updateServerAPI(id, payload);
    fetchAndSetServers();
  } catch (error) {
    console.error("Error updating server:", error);
    throw error;
  }
};


  // Delete server via API - now accepts ID directly
  const deleteServer = async (id: number) => {
    try {
      if (!id) {
        console.error("Invalid server ID");
        return;
      }
      
      await deleteServerAPI(id);
      fetchAndSetServers();
    } catch (error) {
      console.error("Error deleting server:", error);
      throw error;
    }
  };

  return (
    <ServerContext.Provider
      value={{ servers,refreshServers: fetchAndSetServers, addServer, updateServer, deleteServer }}
    >
      {children}
    </ServerContext.Provider>
  );
};