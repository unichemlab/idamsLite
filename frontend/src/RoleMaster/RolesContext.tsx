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
  role_code?: string;
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
          role_code: r.role_code,
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
    await addRoleAPI({
      role_code: role.role_code,
      role_name: role.name,
      description: role.description,
      status: role.status,
    });
    fetchAndSetRoles();
  };

  const updateRole = async (id: number, role: Role) => {
    await updateRoleAPI(id, {
      role_code: role.role_code,
      role_name: role.name,
      description: role.description,
      status: role.status,
    });
    fetchAndSetRoles();
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
