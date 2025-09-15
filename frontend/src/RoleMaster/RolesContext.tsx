import React, { createContext, useContext, useState, useEffect } from "react";
import {
  fetchRoles,
  addRoleAPI,
  updateRoleAPI,
  deleteRoleAPI,
} from "../utils/api";

export interface RoleActivityLog {
  action: string;
  oldValue?: string;
  newValue?: string;
  approver?: string;
  dateTime?: string;
  reason?: string;
}

export interface Role {
  id?: number;
  name: string;
  description: string;
  status: string;
  activityLogs?: RoleActivityLog[];
}

const RolesContext = createContext<
  | {
      roles: Role[];
      fetchAndSetRoles: () => void;
      addRole: (role: Role) => Promise<void>;
      updateRole: (id: number, role: Role) => Promise<void>;
      deleteRole: (id: number) => Promise<void>;
    }
  | undefined
>(undefined);

export function RolesProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<Role[]>([]);

  const fetchAndSetRoles = async () => {
    try {
      const data = await fetchRoles();
      // Normalize backend fields to match Role interface
      setRoles(
        data.map((r: any) => ({
          id: r.id,
          name: r.role_name,
          description: r.description,
          status: r.status,
        }))
      );
    } catch {
      setRoles([]);
    }
  };

  useEffect(() => {
    fetchAndSetRoles();
  }, []);

  const addRole = async (role: Role) => {
    try {
      // Only send required fields to backend
      await addRoleAPI({
        role_name: role.name,
        description: role.description,
        status: role.status,
      });
      fetchAndSetRoles();
    } catch (error: any) {
      // Optionally, show error to user
      alert(error?.message || "Failed to add role");
      throw error;
    }
  };

  const updateRole = async (id: number, role: Role) => {
    try {
      // Only send required fields to backend
      await updateRoleAPI(id, {
        role_name: role.name,
        description: role.description,
        status: role.status,
      });
      fetchAndSetRoles();
    } catch (error: any) {
      alert(error?.message || "Failed to update role");
      throw error;
    }
  };

  const deleteRole = async (id: number) => {
    await deleteRoleAPI(id);
    fetchAndSetRoles();
  };

  return (
    <RolesContext.Provider
      value={{ roles, fetchAndSetRoles, addRole, updateRole, deleteRole }}
    >
      {children}
    </RolesContext.Provider>
  );
}

export function useRoles() {
  const context = useContext(RolesContext);
  if (!context) throw new Error("useRoles must be used within a RolesProvider");
  return context;
}
