import React, { createContext, useContext, useState, useEffect } from "react";
import {
  fetchDepartments,
  addDepartmentAPI,
  updateDepartmentAPI,
  deleteDepartmentAPI,
} from "../../utils/api";

// ── Interfaces ────────────────────────────────────────────────────────────────

export type Department = {
  id: number;
  name: string;
  department_name?: string;
  description?: string;
  status?: string;
};

export interface ApprovalResponse {
  message: string;
  approvalId: number;
  status: "PENDING_APPROVAL";
  data: any;
}

// ── Context type ──────────────────────────────────────────────────────────────

export type DepartmentContextType = {
  departments: Department[];
  fetchDepartments: () => void;
  addDepartment:    (department: Department)             => Promise<ApprovalResponse | Department>;
  updateDepartment: (id: number, department: Department) => Promise<ApprovalResponse | Department>;
  deleteDepartment: (id: number)                         => Promise<void>;
};

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export const DepartmentProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);

  const fetchDepartmentsHandler = async () => {
    try {
      const data = await fetchDepartments();
      console.log("Fetched departments data:", data);
      setDepartments(data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  useEffect(() => {
    fetchDepartmentsHandler();
  }, []);

  // ── Add Department ──────────────────────────────────────────────────────────
  const addDepartment = async (
    department: Department
  ): Promise<ApprovalResponse | Department> => {
    try {
      const response = await addDepartmentAPI(department);

      if (response?.status === "PENDING_APPROVAL") {
        return response as ApprovalResponse;
      }

      await fetchDepartmentsHandler();
      return response as Department;
    } catch (error: any) {
      alert(error?.message || "Failed to add department");
      throw error;
    }
  };

  // ── Update Department ───────────────────────────────────────────────────────
  const updateDepartment = async (
    id: number,
    department: Department
  ): Promise<ApprovalResponse | Department> => {
    try {
      const response = await updateDepartmentAPI(id, department);

      if (response?.status === "PENDING_APPROVAL") {
        return response as ApprovalResponse;
      }

      await fetchDepartmentsHandler();
      return response as Department;
    } catch (error: any) {
      alert(error?.message || "Failed to update department");
      throw error;
    }
  };

  // ── Delete Department ───────────────────────────────────────────────────────
  const deleteDepartment = async (id: number): Promise<void> => {
    try {
      await deleteDepartmentAPI(id);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch (error: any) {
      alert(error?.message || "Failed to delete department");
      throw error;
    }
  };

  return (
    <DepartmentContext.Provider
      value={{
        departments,
        fetchDepartments: fetchDepartmentsHandler,
        addDepartment,
        updateDepartment,
        deleteDepartment,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDepartmentContext() {
  const ctx = useContext(DepartmentContext);
  if (!ctx)
    throw new Error("useDepartmentContext must be used inside DepartmentProvider");
  return ctx;
}