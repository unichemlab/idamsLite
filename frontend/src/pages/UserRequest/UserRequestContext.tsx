// src/pages/UserRequest/UserRequestContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  fetchUserRequests,
  addUserRequestAPI,
  updateUserRequestAPI,
  deleteUserRequestAPI,
  fetchUserByEmployeeCode,
  API_BASE
} from "../../utils/api";

export type TaskRequest = {
  task_id?: number;
  transaction_id?: string; // ✅ add this
  access_request_type?: string;
  application_equip_id: string;
  application_name?: string;
  department: string;
  role: string;
  location: string;
  reports_to: string;
  task_status: string;
  approver1_id: string;
  approver2_id: string;
};

export type Manager = {
  dn: string;
  email: string;
  managerDN: string;
  displayName: string;
  employeeCode: string;
  sAMAccountName: string;
};

export type UserRequest = {
  id?: number;
  request_for_by: "Self" | "Others" | "Vendor / OEM";
  transaction_id?: string;
  name: string;
  employeeCode?: string;
  location: string;
  plant_location: string;
  accessType: string;
  applicationId: string;
  department: string;
  role: string;
  reportsTo: string;
  reportsToOptions: Manager[];
  trainingStatus: "Yes" | "No";
  attachment?: File | null; // file uploaded
  attachmentPath?: string; // saved server path
  attachmentName?: string; // original filename
  remarks?: string;
  approver1_email: string;
  approver2_email: string[];
  approver1_status: string;
  approver2_status: string;
  status?: "Pending" | "Approved" | "Rejected";
  vendorName: string[];
  vendorFirm: string[];
  vendorCode: string[];
  allocatedId: string[];
  bulkEntries?: {
    location: string;
    department: string;
    applicationId: string;
    role: string;
  }[];
  tasks?: TaskRequest[];
  created_on?: string;
  updated_on?: string;
};

type UserRequestContextType = {
  userrequests: UserRequest[];
  request: UserRequest;
  setRequest: React.Dispatch<React.SetStateAction<UserRequest>>;
  fetchUserRequests: () => void;
  fetchUserByEmployeeCode: (employeeCode: string) => Promise<void>;
  addUserRequest: (req: FormData) => Promise<void>;
  updateUserRequest: (id: number, req: UserRequest) => Promise<void>;
  deleteUserRequest: (id: number) => Promise<void>;
  loading: boolean;
  error: string | null;
};

const UserRequestContext = createContext<UserRequestContextType | undefined>(
  undefined
);

export const UserRequestProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userrequests, setUserRequests] = useState<UserRequest[]>([]);
  const [request, setRequest] = useState<UserRequest>({
    request_for_by: "Self",
    transaction_id: "",
    name: "",
    location: "",
    plant_location: "",
    accessType: "",
    applicationId: "",
    department: "",
    role: "",
    reportsTo: "",
    reportsToOptions: [],
    trainingStatus: "Yes",
    attachment: null,
    remarks: "",
    approver1_email: "",
    approver2_email: [],
    approver1_status: "",
    approver2_status: "",
    vendorName: [],
    vendorFirm: [],
    vendorCode: [],
    allocatedId: [],
    status: "Pending",
    tasks: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserRequestsHandler = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserRequests();
      setUserRequests(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addUserRequest = async (req: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const newReq = await addUserRequestAPI(req);
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
        `${API_BASE}/api/users/users/${employeeCode}`
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

  const updateUserRequest = async (id: number, req: UserRequest) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateUserRequestAPI(id, req);
      setUserRequests((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteUserRequest = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await deleteUserRequestAPI(id);
      setUserRequests((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRequestsHandler();
  }, []);

  return (
    <UserRequestContext.Provider
      value={{
        userrequests,
        request,
        setRequest,
        fetchUserRequests: fetchUserRequestsHandler,
        fetchUserByEmployeeCode,
        addUserRequest,
        updateUserRequest,
        deleteUserRequest,
        loading,
        error,
      }}
    >
      {children}
    </UserRequestContext.Provider>
  );
};

export function useUserRequestContext() {
  const ctx = useContext(UserRequestContext);
  if (!ctx)
    throw new Error(
      "useUserRequestContext must be used inside UserRequestProvider"
    );
  return ctx;
}
