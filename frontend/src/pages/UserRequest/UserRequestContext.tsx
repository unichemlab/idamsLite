// src/pages/UserRequest/UserRequestContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  fetchUserRequests,
  addUserRequestAPI,
  updateUserRequestAPI,
  deleteUserRequestAPI,
} from "../../utils/api";

export type UserRequest = {
  id?: number;
  requestFor: "Self" | "Others" | "Vendor / OEM";
  name: string;
  employeeCode?: string;
  location: string;
  plant_location: string;
  accessType: string;
  applicationId: string;
  department: string;
  role: string;
  reportsTo: string;
  trainingStatus: "Yes" | "No";
  attachment?: File | null;
  attachmentPath?: string;
  remarks?: string;
  approver1: string;
  approver2: string[];
  approver3: string[];
  status?: "Pending" | "Approved" | "Rejected";
  // Vendor fields
    vendorName: string[];
    vendorFirm: string[];
    vendorCode: string[];
    allocatedId:string[],
  created_at?: string;
  updated_at?: string;
};

type UserRequestContextType = {
  userrequests: UserRequest[];
  request: UserRequest;
  setRequest: React.Dispatch<React.SetStateAction<UserRequest>>;
  fetchUserRequests: () => void;
  addUserRequest: (req: UserRequest) => Promise<void>;
  updateUserRequest: (id: number, req: UserRequest) => Promise<void>;
  deleteUserRequest: (id: number) => Promise<void>;
  loading: boolean;
  error: string | null;
};

const UserRequestContext = createContext<UserRequestContextType | undefined>(undefined);

export const UserRequestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userrequests, setUserRequests] = useState<UserRequest[]>([]);
  const [request, setRequest] = useState<UserRequest>({
    requestFor: "Self",
    name: "",
    location: "",
    plant_location : "",
    accessType: "",
    applicationId: "",
    department: "",
    role: "",
    reportsTo: "",
    trainingStatus: "Yes",
    attachment: null,
    remarks: "",
    approver1: "",
    approver2: [],
    approver3: [],
       vendorName: [],
    vendorFirm: [],
    vendorCode: [],
    allocatedId:[],
    status: "Pending",
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

  const addUserRequest = async (req: UserRequest) => {
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
  if (!ctx) throw new Error("useUserRequestContext must be used inside UserRequestProvider");
  return ctx;
}
