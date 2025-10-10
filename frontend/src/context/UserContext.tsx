import React, { createContext, useContext, useState, useEffect } from "react";
// Backend API base URL
const API_URL = "http://localhost:4000/api/users";

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
}

// No initialUsers: always fetch from backend

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [users, setUsers] = useState<UserWithLogs[]>([]);

  // Fetch users from backend
  const fetchUsers = async () => {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Failed to fetch users");
    const data = await res.json();
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
    const payload = {
      username: user.email.split("@")[0],
      full_name: user.fullName,
      email: user.email,
      emp_code: user.empCode,
      // send department name (DB stores department as name string)
      department: user.department,
      role_id: 4, // TODO: map role if needed
      password: "changeme123", // TODO: prompt or generate
      status: user.status.toUpperCase(),
      plants: user.plants,
      permissions: user.permissions,
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
    const payload = {
      full_name: user.fullName,
      email: user.email,
      emp_code: user.empCode,
      // send department name so backend stores the name
      department: user.department,
      role_id: 4, // TODO: map role if needed
      status: user.status.toUpperCase(),
      plants: user.plants,
      permissions: user.permissions,
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
    <UserContext.Provider value={{ users, addUser, editUser, deleteUser }}>
      {children}
    </UserContext.Provider>
  );
};

export function useUserContext() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUserContext must be used within UserProvider");
  return ctx;
}
