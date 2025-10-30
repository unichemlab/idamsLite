// src/pages/ServerRequest/ServerRequestContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  fetchServiceRequests,
  addServiceRequestAPI,
  updateServiceRequestAPI,
  deleteServiceRequestAPI,
  fetchUserByEmployeeCode,
  API_BASE
} from "../../utils/api";


export type Manager = {
  dn: string;
  email: string;
  managerDN: string;
  displayName: string;
  employeeCode: string;
  sAMAccountName: string;
};

// types/ServiceRequest.ts
export type ServiceRequest = {
  id?: number;
  transaction_id?: string;          // e.g. TRANSR00000001
  ticket_id?: string;               // e.g. SR-2025-001

  request_type: "Service Request" | "Incident" | "Change";
  category?: string;
  subcategory?: string;
  system_asset_name?: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  impact: "High" | "Medium" | "Low";
  department?: string;
  requester_name: string;
  requester_location?: string;
  requester_department?: string;
  description?: string;
  attachment?: File | null;
  attachment_path?: string;

  // Approval
  approval_manager?: string;
  approval_manager_mgr?: string;
  adhoc_approval_from?: string;
  assigned_bin?: string;
  cab_assigned_to?: string;
  cab_final_approver?: string;

  // Status / Task info
  // status?: "New" | "Assigned" | "In Progress" | "Pending Approval" | "Resolved" | "Closed";
  // assigned_group?: string;
  // assigned_to?: string;
  // root_cause?: string;
  // resolution_details?: string;
  // closure_code?: "Resolved" | "Workaround" | "Cancelled";
  // business_justification?: string;

  created_by?: string;
  created_at?: string;
  updated_at?: string;
};


type ServiceRequestContextType = {
  serverrequests: ServiceRequest[];
  request: ServiceRequest;
  setRequest: React.Dispatch<React.SetStateAction<ServiceRequest>>;
  fetchServiceRequests: () => void;
  fetchUserByEmployeeCode: (employeeCode: string) => Promise<void>;
  addServiceRequest: (req: FormData) => Promise<void>;
  updateServiceRequest: (id: number, req: ServiceRequest) => Promise<void>;
  deleteServiceRequest: (id: number) => Promise<void>;
  loading: boolean;
  error: string | null;
};

const ServiceRequestContext = createContext<ServiceRequestContextType | undefined>(
  undefined
);

export const ServiceRequestProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [serverrequests, setUserRequests] = useState<ServiceRequest[]>([]);
  const [request, setRequest] = useState<ServiceRequest>({
  request_type: "Service Request",
  category: "",
  subcategory: "",
  system_asset_name: "",
  priority: "Medium",
  impact: "Medium",
  department: "",
  requester_name: "",
  requester_location: "",
  requester_department: "",
  description: "",
  attachment: null,
  approval_manager: "",
  approval_manager_mgr: "",
  adhoc_approval_from: "",
  assigned_bin: "",
  cab_assigned_to: "",
  cab_final_approver: "",
  // status: "New",
  // assigned_group: "",
  // assigned_to: "",
  // root_cause: "",
  // resolution_details: "",
  // closure_code: "Resolved",
  // business_justification: "",
  created_by: "",
});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServiceRequestsHandler = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchServiceRequests();
      setUserRequests(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addServiceRequest = async (req: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const newReq = await addServiceRequestAPI(req);
      setUserRequests((prev) => [...prev, newReq]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserByEmployeeCode = async (employeeCode: string) => {
    if (!employeeCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/users/${employeeCode}`
      );
      if (!res.ok) throw new Error("User not found");
      const data = await res.json();

      const managerNames: string[] = [];
      if (data.reporting_manager?.displayName)
        managerNames.push(data.reporting_manager.displayName);
      if (data.managers_manager?.displayName)
        managerNames.push(data.managers_manager.displayName);

      setRequest((prev) => ({
        ...prev,
        name: data.name || "",
        location: data.location || "",
        department: data.department || "",
        reportsTo: managerNames.join(", ") || "",
      }));
    } catch (err: any) {
      console.error(err);
      setRequest((prev) => ({
        ...prev,
        name: "",
        location: "",
        department: "",
        reportsTo: "",
      }));
    } finally {
      setLoading(false);
    }
  };

  const updateServiceRequest = async (id: number, req: ServiceRequest) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateServiceRequestAPI(id, req);
      setUserRequests((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteServiceRequest = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await deleteServiceRequestAPI(id);
      setUserRequests((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceRequestsHandler();
  }, []);

  return (
    <ServiceRequestContext.Provider
      value={{
        serverrequests,
        request,
        setRequest,
        fetchServiceRequests: fetchServiceRequestsHandler,
        fetchUserByEmployeeCode,
        addServiceRequest,
        updateServiceRequest,
        deleteServiceRequest,
        loading,
        error,
      }}
    >
      {children}
    </ServiceRequestContext.Provider>
  );
};

export function useServiceRequestContext() {
  const ctx = useContext(ServiceRequestContext);
  if (!ctx)
    throw new Error(
      "useServiceRequestContext must be used inside ServiceRequestProvider"
    );
  return ctx;
}
