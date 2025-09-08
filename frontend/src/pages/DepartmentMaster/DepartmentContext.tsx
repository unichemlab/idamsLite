// src/context/DepartmentContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchDepartments, addDepartmentAPI, updateDepartmentAPI, deleteDepartmentAPI } from "../../utils/api";

export type Department = {
  id: number;
  name: string;
  description?: string;
  status?: string;
};

export type DepartmentContextType = {
  departments: Department[];
  fetchDepartments: () => void;
  addDepartment: (department: Department) => void;
  updateDepartment: (id: number, department: Department) => void;
  deleteDepartment: (id: number) => void;
};

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export const DepartmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [departments, setDepartments] = useState<Department[]>([]);

  const fetchDepartmentsHandler = async () => {
    try {
      const data = await fetchDepartments();
      console.log("Fetched departments data:", data); // Debug log for fetched data
      setDepartments(data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const addDepartment = async (department: Department) => {
    const newDept = await addDepartmentAPI(department);
    setDepartments([...departments, newDept]);
  };

  const updateDepartment = async (id: number, department: Department) => {
    const updated = await updateDepartmentAPI(id, department);
    setDepartments(departments.map((d) => (d.id === id ? updated : d)));
  };

  const deleteDepartment = async (id: number) => {
    await deleteDepartmentAPI(id);
    setDepartments(departments.filter((d) => d.id !== id));
  };

  useEffect(() => {
    fetchDepartmentsHandler();
  }, []);

  return (
    <DepartmentContext.Provider
      value={{ departments, fetchDepartments: fetchDepartmentsHandler, addDepartment, updateDepartment, deleteDepartment }}
    >
      {children}
    </DepartmentContext.Provider>
  );
};

export function useDepartmentContext() {
  const ctx = useContext(DepartmentContext);
  if (!ctx) throw new Error("useDepartmentContext must be used inside DepartmentProvider");
  return ctx;
}


