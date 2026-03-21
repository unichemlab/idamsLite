import React, { createContext, useContext, useState, useEffect } from "react";
import {
  fetchRoles,
  addRoleAPI,
  updateRoleAPI,
  deleteRoleAPI,
} from "../../utils/api";

// ── Interfaces ────────────────────────────────────────────────────────────────

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

export interface ApprovalResponse {
  message: string;
  approvalId: number;
  status: "PENDING_APPROVAL";
  data: any;
}

// ── Context type ──────────────────────────────────────────────────────────────

interface RolesContextType {
  roles: Role[];
  refreshRoles: () => void;
  fetchAndSetRoles: () => void;
  addRole:    (role: Role)             => Promise<ApprovalResponse | Role>;
  updateRole: (id: number, role: Role) => Promise<ApprovalResponse | Role>;
  deleteRole: (id: number)             => Promise<void>;
}

const RolesContext = createContext<RolesContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function RolesProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<Role[]>([]);

  const fetchAndSetRoles = async () => {
    try {
      const data = await fetchRoles();
      setRoles(
        data.map((r: any) => ({
          id:          r.id,
          name:        r.role_name,
          description: r.description,
          status:      r.status,
        }))
      );
    } catch {
      setRoles([]);
    }
  };

  useEffect(() => {
    fetchAndSetRoles();
  }, []);

  // ── Add Role ────────────────────────────────────────────────────────────────
  const addRole = async (role: Role): Promise<ApprovalResponse | Role> => {
    try {
      const response = await addRoleAPI({
        role_name:   role.name,
        description: role.description,
        status:      role.status,
      });

      if (response?.status === "PENDING_APPROVAL") {
        return response as ApprovalResponse;
      }

      fetchAndSetRoles();
      return response as Role;
    } catch (error: any) {
      alert(error?.message || "Failed to add role");
      throw error;
    }
  };

  // ── Update Role ─────────────────────────────────────────────────────────────
  const updateRole = async (
    id: number,
    role: Role
  ): Promise<ApprovalResponse | Role> => {
    try {
      const response = await updateRoleAPI(id, {
        role_name:   role.name,
        description: role.description,
        status:      role.status,
      });

      if (response?.status === "PENDING_APPROVAL") {
        return response as ApprovalResponse;
      }

      fetchAndSetRoles();
      return response as Role;
    } catch (error: any) {
      alert(error?.message || "Failed to update role");
      throw error;
    }
  };

  // ── Delete Role ─────────────────────────────────────────────────────────────
  const deleteRole = async (id: number): Promise<void> => {
    await deleteRoleAPI(id);
    fetchAndSetRoles();
  };

  return (
    <RolesContext.Provider
      value={{
        roles,
        refreshRoles:    fetchAndSetRoles,
        fetchAndSetRoles,
        addRole,
        updateRole,
        deleteRole,
      }}
    >
      {children}
    </RolesContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRoles() {
  const context = useContext(RolesContext);
  if (!context) throw new Error("useRoles must be used within a RolesProvider");
  return context;
}