// src/context/NetworkContext.tsx

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";
import { Network } from ".././types/network";
import { API_BASE } from "../utils/api";

// API Functions
const fetchNetworks = async (): Promise<Network[]> => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}/api/networks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch networks");
  return response.json();
};

const addNetworkAPI = async (network: Partial<Network>): Promise<Network> => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}/api/networks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(network),
  });
  if (!response.ok) throw new Error("Failed to add network");
  return response.json();
};

const updateNetworkAPI = async (
  id: number,
  network: Partial<Network>
): Promise<Network> => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}/api/networks/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(network),
  });
  if (!response.ok) throw new Error("Failed to update network");
  return response.json();
};

const deleteNetworkAPI = async (id: number): Promise<void> => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}/api/networks/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to delete network");
};

/* =========================
   CONTEXT HOOK
========================= */
export const useNetworkContext = () => {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error("useNetworkContext must be used within NetworkProvider");
  }
  return ctx;
};

// Re-export Network type
export type { Network };

/* =========================
   CONTEXT TYPE
========================= */
interface NetworkContextType {
  networks: Network[];
  refreshNetworks: () => Promise<void>;   // ✅ ADD
  addNetwork: (network: Network) => Promise<void>;
  updateNetwork: (index: number, updated: Network) => Promise<void>;
  deleteNetwork: (index: number) => Promise<void>;
}


/* =========================
   CONTEXT
========================= */
export const NetworkContext = createContext<NetworkContextType | undefined>(
  undefined
);

/* =========================
   PROVIDER
========================= */
export const NetworkProvider = ({ children }: { children: ReactNode }) => {
  const [networks, setNetworks] = useState<Network[]>([]);

  /* =========================
     FETCH + NORMALIZE
  ========================= */
  const fetchAndSetNetworks = async () => {
    try {
      const data = await fetchNetworks();

      const normalized: Network[] = data.map((n: any) => ({
        id: n.id,
        transaction_id: n.transaction_id,
        plant_location_id: n.plant_location_id,
        plant_name: n.plant_name,
        area: n.area,
        rack: n.rack,
        host_name: n.host_name,
        device_ip: n.device_ip,
        device_model: n.device_model,
        device_type: n.device_type,
        make_vendor: n.make_vendor,
        trunk_port: n.trunk_port,
        neighbor_switch_ip: n.neighbor_switch_ip,
        neighbor_port: n.neighbor_port,
        sfp_fiber_tx: n.sfp_fiber_tx,
        poe_non_poe: n.poe_non_poe,
        serial_no: n.serial_no,
        ios_version: n.ios_version,
        uptime: n.uptime,
        verify_date: n.verify_date,
        stack: n.stack,
        stack_switch_details: n.stack_switch_details,
        dual_power_source: n.dual_power_source,
        purchase_vendor: n.purchase_vendor,
        purchased_date: n.purchased_date,
        purchased_po: n.purchased_po,
        sap_asset_no: n.sap_asset_no,
        service_type: n.service_type,
        warranty_start_date: n.warranty_start_date,
        amc_warranty_expiry_date: n.amc_warranty_expiry_date,
        under_amc: n.under_amc,
        amc_vendor: n.amc_vendor,
        remarks: n.remarks,
        status: n.status,
        created_on: n.created_on,
        updated_on: n.updated_on,
      }));

      setNetworks(normalized);
    } catch (err) {
      console.error("Error fetching networks:", err);
      setNetworks([]);
    }
  };

  useEffect(() => {
    fetchAndSetNetworks();
  }, []);

  /* =========================
     ADD NETWORK
  ========================= */
  const addNetwork = async (network: Network) => {
    try {
      const { id, created_on, updated_on, ...payload } = network;

      await addNetworkAPI(payload);
      await fetchAndSetNetworks();
    } catch (err) {
      console.error("Error adding network:", err);
      throw err;
    }
  };

  /* =========================
     UPDATE NETWORK
  ========================= */
  const updateNetwork = async (index: number, updated: Network) => {
    try {
      const current = networks[index];
      if (!current?.id) return;

      const { id, created_on, updated_on, ...payload } = updated;

      await updateNetworkAPI(current.id, payload);
      await fetchAndSetNetworks();
    } catch (err) {
      console.error("Error updating network:", err);
      throw err;
    }
  };

  /* =========================
     DELETE NETWORK
  ========================= */
  const deleteNetwork = async (index: number) => {
    try {
      const network = networks[index];
      if (!network?.id) return;

      await deleteNetworkAPI(network.id);
      await fetchAndSetNetworks();
    } catch (err) {
      console.error("Error deleting network:", err);
      throw err;
    }
  };

  return (
    <NetworkContext.Provider
  value={{
    networks,
    refreshNetworks: fetchAndSetNetworks,   // ✅ ADD
    addNetwork,
    updateNetwork,
    deleteNetwork,
  }}
>

      {children}
    </NetworkContext.Provider>
  );
};