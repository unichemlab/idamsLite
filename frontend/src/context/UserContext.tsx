import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE, request } from "../utils/api";
// Backend API base URL
const API_URL = `${API_BASE}/api/users`;

export type UserForm = {
  fullName: string;
  email: string;
  empCode: string;
  department: string;
  location: string;
  status: string;
  plants: string[];
  permissions: {
    [key: string]: string[];
  };
  centralPermission: boolean;
  comment: string;
  corporateAccessEnabled: boolean;
};

export interface UserWithLogs extends UserForm {
  centralMaster: string[];
  activityLogs: any[];
}

interface UserContextType {
  users: UserWithLogs[];
  addUser: (user: UserForm) => Promise<void>;
  editUser: (userId: string, user: UserForm) => Promise<void>;
  deleteUser: (idx: number) => void;
  currentUser?: any;
}

// No initialUsers: always fetch from backend

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [users, setUsers] = useState<UserWithLogs[]>([]);
  // Get current user from localStorage (set by AuthContext)
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    const stored = localStorage.getItem("authUser");
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }
  }, []);

  // Fetch users from backend
  const fetchUsers = async () => {
    // use centralized request helper so Authorization header and base URL are applied
    const data: any = await request("/api/users");
    // Map backend fields to frontend camelCase fields
    const mapUser = (user: any) => ({
      id: user.id,
      fullName: user.full_name || user.employee_name || user.fullName || "",
      email: user.email,
      empCode: user.employee_code || user.empCode || "",
      department: user.department || "-", // Optionally map department_id to name
      department_id: user.department_id,
      status: user.status,
      plants: user.plants || [],
      centralMaster: user.centralMaster || [],
      permissions: user.permissions || {},
      centralPermission: user.central_permission || false,
      comment: user.comment || "",
      corporateAccessEnabled: user.corporate_access_enabled || false,
      activityLogs: user.activityLogs || [],
      // Add all backend fields for direct access if needed
      employee_name: user.employee_name,
      employee_code: user.employee_code,
      // expose employee_id so consumers can use it directly (e.g., WorkflowBuilder)
      employee_id: user.employee_id,
      location: user.location,
      designation: user.designation,
      company: user.company,
      mobile: user.mobile,
      role_id: user.role_id,
      created_on: user.created_on,
      updated_on: user.updated_on,
    });
    setUsers(Array.isArray(data.users) ? data.users.map(mapUser) : []);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Add user via backend
  const addUser = async (user: UserForm) => {
    // Convert frontend permission object into an array of permission tokens
    // Example token: "create:roles:3" meaning create on roles for plant id 3
    const permissionTokens: string[] = [];
    // Map human-friendly module names to backend subjects
    const moduleToSubject: Record<string, string> = {
      "Role Master": "roles",
      "Plant Master": "plants",
      "Vendor Master": "vendors",
      "Application Master": "applications",
      "Approval Workflow": "workflows",
      "Audit Review": "audit",
      Reports: "reports",
      "Plant IT Admin": "plant_it_admin",
    };

    const actionMap: Record<string, string> = {
      Add: "create",
      Edit: "update",
      View: "read",
      Delete: "delete",
    };

    // Try to map plant names (used in AddUserPanel) to plant ids via API
    let plantsByName: Record<string, number> = {};
    try {
      const plantList: any[] = await request("/api/plants");
      (plantList || []).forEach((p) => {
        const name = p.name || p.plant_name || "";
        if (name) plantsByName[String(name)] = p.id;
      });
    } catch (e) {
      // If mapping fails, continue and emit tokens without numeric plant id
      console.warn("Failed to fetch plants for permission mapping:", e);
    }

    Object.keys(user.permissions || {}).forEach((moduleKey) => {
      // moduleKey format: "PlantName-Module Name"
      const split = moduleKey.split("-");
      const plantName = split[0];
      const moduleName = split.slice(1).join("-") || "";
      const subject =
        moduleToSubject[moduleName] ||
        moduleName.toLowerCase().replace(/\s+/g, "_");
      const actions = user.permissions[moduleKey] || [];
      actions.forEach((act) => {
        const mapped = actionMap[act] || act.toLowerCase();
        const plantId = plantsByName[plantName];
        if (plantId) {
          permissionTokens.push(`${mapped}:${subject}:${plantId}`);
        } else {
          // fallback without plant id (global permission)
          permissionTokens.push(`${mapped}:${subject}`);
        }
      });
    });

    const payload: any = {
      username: user.email.split("@")[0],
      full_name: user.fullName,
      email: user.email,
      emp_code: user.empCode,
      department: user.department,
      password: "changeme123",
      status: user.status.toUpperCase(),
      plants: user.plants,
      // send transformed permission tokens to backend
      permissions: permissionTokens,
      central_permission: user.centralPermission,
      comment: user.comment,
      corporate_access_enabled: user.corporateAccessEnabled,
      location: user.location,
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to add user");
    await fetchUsers();
  };

  // Edit user via backend
  const editUser = async (userId: string, user: UserForm) => {
    // Transform permissions similar to addUser
    const permissionTokens: string[] = [];
    const moduleToSubject: Record<string, string> = {
      "Role Master": "roles",
      "Plant Master": "plants",
      "Vendor Master": "vendors",
      "Application Master": "applications",
      "Approval Workflow": "workflows",
      "Audit Review": "audit",
      Reports: "reports",
      "Plant IT Admin": "plant_it_admin",
    };
    const actionMap: Record<string, string> = {
      Add: "create",
      Edit: "update",
      View: "read",
      Delete: "delete",
    };

    let plantsByName: Record<string, number> = {};
    try {
      const plantList: any[] = await request("/api/plants");
      (plantList || []).forEach((p) => {
        const name = p.name || p.plant_name || "";
        if (name) plantsByName[String(name)] = p.id;
      });
    } catch (e) {
      console.warn("Failed to fetch plants for permission mapping:", e);
    }

    Object.keys(user.permissions || {}).forEach((moduleKey) => {
      const split = moduleKey.split("-");
      const plantName = split[0];
      const moduleName = split.slice(1).join("-") || "";
      const subject =
        moduleToSubject[moduleName] ||
        moduleName.toLowerCase().replace(/\s+/g, "_");
      const actions = user.permissions[moduleKey] || [];
      actions.forEach((act) => {
        const mapped = actionMap[act] || act.toLowerCase();
        const plantId = plantsByName[plantName];
        if (plantId) {
          permissionTokens.push(`${mapped}:${subject}:${plantId}`);
        } else {
          permissionTokens.push(`${mapped}:${subject}`);
        }
      });
    });

    const payload: any = {
      full_name: user.fullName,
      email: user.email,
      emp_code: user.empCode,
      department: user.department,
      status: user.status.toUpperCase(),
      plants: user.plants,
      permissions: permissionTokens,
      central_permission: user.centralPermission,
      comment: user.comment,
      corporate_access_enabled: user.corporateAccessEnabled,
      location: user.location,
    };

    const res = await fetch(`${API_URL}/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to edit user");
    await fetchUsers();
  };

  const deleteUser = (idx: number) => {
    setUsers((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <UserContext.Provider
      value={{ users, addUser, editUser, deleteUser, currentUser }}
    >
      {children}
    </UserContext.Provider>
  );
};

export function useUserContext() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUserContext must be used within UserProvider");
  return ctx;
}
