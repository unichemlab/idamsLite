// utils/api.ts - Fixed TypeScript version

import { PlantPermission } from "shared/rbac/permissions";
import { MenuItem } from "../config/masterModules";
// Centralized API base
// Uses REACT_APP_API_URL from .env.local or .env.production
// Example: REACT_APP_API_URL=https://lucky-hope-production.up.railway.app
export const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:4000";

// Flag to prevent multiple simultaneous redirects
let isHandlingTokenExpiry = false;

/**
 * Main request function with automatic token injection
 */
export async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  //const headers = options.headers ? { ...options.headers } : {};
  
   // ✅ FIX: Properly type headers as Record<string, string>
  const headers: Record<string, string> = options.headers 
    ? { ...(options.headers as Record<string, string>) } 
    : {};

  // Attach Authorization header automatically if a token is present in localStorage.
  let token: string | null = null;
  try {
    token = localStorage.getItem("token");

    // Fallback: try to get token from authUser if not found in direct token key
    if (!token) {
      const au = localStorage.getItem("authUser");
      if (au) {
        try {
          const parsed = JSON.parse(au);
          token = parsed?.token || null;
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    // Only add Authorization header if we have a valid token and no header already exists
    if (token && token.trim()) {
      if (!(headers as any)["Authorization"]) {
        (headers as any)["Authorization"] = `Bearer ${token}`;
      }
    }
  } catch (e) {
    // ignore localStorage errors in non-browser environments
  }

  // Don't overwrite content-type when sending FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

  // Handle 401 Unauthorized
  // Only redirect to login if user HAD a token (was logged in) and now it's invalid/expired
  // Don't redirect if user never had a token (not logged in)
  if (res.status === 401) {
    const text = await res.text().catch(() => null);
    let errorMsg = "";

    try {
      const parsed = JSON.parse(text || "{}");
      errorMsg = parsed.message || "";
    } catch {
      errorMsg = text || "";
    }

    // Only handle redirect if user WAS authenticated (had a token in the request)
    // AND they're not already on the login page
    const isOnLoginPage =
      typeof window !== "undefined" && window.location.pathname === "/";

    if (token && !isHandlingTokenExpiry && !isOnLoginPage) {
      isHandlingTokenExpiry = true;

      // Clear authentication data from localStorage
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("authUser");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        localStorage.removeItem("superadmin_activeTab");
        localStorage.removeItem("initialRoute");
      } catch (e) {
        // ignore localStorage errors
      }

      // Redirect to login page after a small delay to allow cleanup
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.location.href = "/";
        }, 100);
      }

      throw new Error("Session expired. Please login again.");
    }

    // If no token or already on login page, just throw error without redirecting
    // This prevents redirect loops on login page
    const error = new Error(errorMsg || "Unauthorized");
    (error as any).status = 401;
    (error as any).isAuthError = true;
    throw error;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => null);
    throw new Error(text || res.statusText || "API request failed");
  }
  
  if (res.status === 204) return null;
  
  return await res.json().catch(() => null);
}

// ========================================
// System Inventory API
// ========================================

export async function fetchSystems(): Promise<any[]> {
  return request("/api/systems");
}

export async function fetchActivityLog(): Promise<any[]> {
  return request("/api/activity-logs");
}

export async function fetchTaskLog(): Promise<any[]> {
  return request("/api/task");
}

export async function addSystemAPI(system: any): Promise<any> {
  return request("/api/systems", {
    method: "POST",
    body: JSON.stringify(system),
  });
}

export async function updateSystemAPI(id: number, system: any): Promise<any> {
  return request(`/api/systems/${id}`, {
    method: "PUT",
    body: JSON.stringify(system),
  });
}

export async function deleteSystemAPI(id: number): Promise<void> {
  return request(`/api/systems/${id}`, { method: "DELETE" });
}

// ========================================
// Application Master API
// ========================================

export async function fetchApplications(): Promise<any[]> {
  return request("/api/applications");
}

export async function fetchApplicationActivityLogs(): Promise<any[]> {
  return request("/api/applications/activity-logs");
}

// ========================================
// Role Master API
// ========================================

export async function fetchRoles(): Promise<any[]> {
  return request("/api/roles");
}

export async function addRoleAPI(role: any): Promise<any> {
  return request("/api/roles", { 
    method: "POST", 
    body: JSON.stringify(role) 
  });
}

export async function updateRoleAPI(id: number, role: any): Promise<any> {
  return request(`/api/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(role),
  });
}

export async function deleteRoleAPI(id: number): Promise<void> {
  return request(`/api/roles/${id}`, { method: "DELETE" });
}

export async function fetchRoleActivityLogs(): Promise<any[]> {
  return request("/api/roles/activity-logs");
}

// ========================================
// Plant Master API
// ========================================

export async function fetchPlants(): Promise<any[]> {
  return request("/api/plants");
}

export async function fetchPlantActivityLogs(): Promise<any[]> {
  return request("/api/plants/activity-logs");
}

export async function addPlantAPI(plant: any): Promise<any> {
  return request("/api/plants", {
    method: "POST",
    body: JSON.stringify(plant),
  });
}

export async function updatePlantAPI(id: number, plant: any): Promise<any> {
  return request(`/api/plants/${id}`, {
    method: "PUT",
    body: JSON.stringify(plant),
  });
}

export async function deletePlantAPI(id: number): Promise<void> {
  return request(`/api/plants/${id}`, { method: "DELETE" });
}

// ========================================
// Vendor Master API
// ========================================

export async function fetchVendors(): Promise<any[]> {
  return request("/api/vendors");
}

export async function fetchVendorActivityLogs(): Promise<any[]> {
  return request("/api/vendors/activity-logs");
}

export async function addVendorAPI(vendor: any): Promise<any> {
  return request("/api/vendors", {
    method: "POST",
    body: JSON.stringify(vendor),
  });
}

export async function updateVendorAPI(id: number, vendor: any): Promise<any> {
  return request(`/api/vendors/${id}`, {
    method: "PUT",
    body: JSON.stringify(vendor),
  });
}

export async function deleteVendorAPI(id: number): Promise<void> {
  return request(`/api/vendors/${id}`, { method: "DELETE" });
}

// ========================================
// Department Master API
// ========================================

export async function fetchDepartments(): Promise<any[]> {
  try {
    const data = await request("/api/departments");
    // Map API fields to frontend model
    return data.map((dept: any) => ({
      id: dept.id,
      name: dept.department_name || dept.name || "",
      description: dept.description || "",
      status: dept.status || "",
      transaction_id: dept.transaction_id,
      created_on: dept.created_on,
      updated_on: dept.updated_on,
    }));
  } catch (error) {
    console.error("API fetchDepartments error:", error);
    throw error;
  }
}

export async function fetchDepartmentActivityLogs(): Promise<any[]> {
  return request("/api/departments/activity-logs");
}

export async function addDepartmentAPI(department: any): Promise<any> {
  // Map 'name' to 'department_name' for backend
  const payload = {
    ...department,
    department_name: department.name,
  };
  delete payload.name;
  
  return request("/api/departments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDepartmentAPI(
  id: number,
  department: any
): Promise<any> {
  // Map 'name' to 'department_name' for backend
  const payload = {
    ...department,
    department_name: department.name,
  };
  delete payload.name;
  
  return request(`/api/departments/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteDepartmentAPI(id: number): Promise<void> {
  return request(`/api/departments/${id}`, { method: "DELETE" });
}

// ========================================
// User Request API
// ========================================

export async function fetchUserRequests(): Promise<any[]> {
  return request("/api/user-requests");
}

export async function addUserRequestAPI(userRequest: FormData): Promise<any> {
  return request("/api/user-requests", { 
    method: "POST", 
    body: userRequest 
  });
}

export async function updateUserRequestAPI(
  id: number,
  userRequest: any
): Promise<any> {
  return request(`/api/user-requests/${id}`, {
    method: "PUT",
    body: JSON.stringify(userRequest),
  });
}

export async function deleteUserRequestAPI(id: number): Promise<void> {
  return request(`/api/user-requests/${id}`, { method: "DELETE" });
}

// ========================================
// Task API
// ========================================

export async function fetchTasks(): Promise<any[]> {
  return request("/api/task");
}

export async function fetchTasksForApprover(
  approverId?: number
): Promise<any[]> {
  const q = approverId ? `?approver_id=${encodeURIComponent(approverId)}` : "";
  return request(`/api/task${q}`);
}


export async function fetchTaskById(id: string): Promise<any> {
  return request(`/api/task/${id}`);
}

export async function addTaskAPI(task: any): Promise<any> {
  return request("/api/tasks", { 
    method: "POST", 
    body: JSON.stringify(task) 
  });
}

export async function updateTaskAPI(id: string, task: any): Promise<any> {
  return request(`/api/task/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(task),
  });
}

export async function deleteTaskAPI(id: number): Promise<void> {
  return request(`/api/tasks/${id}`, { method: "DELETE" });
}

// ========================================
// Workflow & Approval API
// ========================================

export async function fetchWorkflows(approverId?: number): Promise<any[]> {
  const q = approverId ? `?approver_id=${encodeURIComponent(approverId)}` : "";
  const data: any = await request(`/api/workflows${q}`);
  // Backend may return { workflows: [...] } or an array directly. Normalize to array.
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.workflows)) return data.workflows;
  if (Array.isArray(data?.data?.workflows)) return data.data.workflows;
  return [];
}



export async function fetchCorporateWorkflows(type?: string,corporate_type?: string): Promise<any[]> {
  const params = [];
  if (type) params.push(`workflow_type=${type}`);
  if (corporate_type) params.push(`corporate_type=${corporate_type}`);
  const q = params.length ? `?${params.join('&')}` : '';
  const data: any = await request(`/api/workflows${q}`);
  // Backend may return { workflows: [...] } or an array directly. Normalize to array.
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.workflows)) return data.workflows;
  if (Array.isArray(data?.data?.workflows)) return data.data.workflows;
  return [];
}

export async function postApprovalAction(
  id: string,
  action: "approve" | "reject",
  payload: any
): Promise<any> {
  return request(`/api/approvals/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ========================================
// Access Log API
// ========================================

export async function fetchAccessLogs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  value?: string;
}) {
  const query = new URLSearchParams();

  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.search) query.append("search", params.search);
  if (params?.value) query.append("value", params.value);

  return request(`/api/access-logs?${query.toString()}`);
}

export async function fetchActivityLogs(ritm: string) {
  return request(`/api/access-logs/${ritm}/activity`);
}

export async function addAccessLogAPI(accessLog: any): Promise<any> {
  return request("/api/access-logs", {
    method: "POST",
    body: JSON.stringify(accessLog),
  });
}

// ========================================
// Department/Role/Application by Plant
// ========================================

export async function fetchDepartmentsByPlantId(plantId: number): Promise<{
  departments: { id: number; department_name: string }[];
}> {
  try {
    return request(`/api/applications/${plantId}`);
  } catch (error) {
    console.error("API fetchDepartmentsByPlantId error:", error);
    throw error;
  }
}

export async function fetchRolesApplicationsByPlantAndDepartment(
  plantId: number,
  deptId: number
): Promise<{
  roles: string[];
  applications: { id: string; name: string }[];
}> {
  try {
    return request(`/api/applications/${plantId}/${deptId}`);
  } catch (error) {
    console.error("API fetchRolesApplicationsByPlantAndDepartment error:", error);
    throw error;
  }
}

// ========================================
// Server Inventory API
// ========================================

export async function fetchServers(): Promise<any[]> {
  return request("/api/servers");
}

export async function addServerAPI(server: any): Promise<any> {
  return request("/api/servers", {
    method: "POST",
    body: JSON.stringify(server),
  });
}

export async function updateServerAPI(id: number, server: any): Promise<any> {
  return request(`/api/servers/${id}`, {
    method: "PUT",
    body: JSON.stringify(server),
  });
}

export async function deleteServerAPI(id: number): Promise<void> {
  return request(`/api/servers/${id}`, { method: "DELETE" });
}

// ========================================
// User API
// ========================================

export async function fetchUserByEmployeeCode(employeeCode: number): Promise<{
  user: any[];
}> {
  try {
    return request(`/api/users/${employeeCode}`);
  } catch (error) {
    console.error("API fetchUserByEmployeeCode error:", error);
    throw error;
  }
}

// ========================================
// Authentication API
// ========================================

export async function loginAPI(credentials: {
  username: string;
  password: string;
}): Promise<any> {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function fetchPermissionsAPI(): Promise<any> {
  return request("/api/auth/permissions");
}

// ========================================
// Service Request API
// ========================================

export async function fetchServiceRequests(): Promise<any[]> {
  return request("/api/service-requests");
}

export async function addServiceRequestAPI(
  serviceRequest: FormData
): Promise<any> {
  return request("/api/service-requests", { 
    method: "POST", 
    body: serviceRequest 
  });
}

export async function updateServiceRequestAPI(
  id: number,
  serviceRequest: any
): Promise<any> {
  return request(`/api/service-requests/${id}`, {
    method: "PUT",
    body: JSON.stringify(serviceRequest),
  });
}

export async function deleteServiceRequestAPI(id: number): Promise<void> {
  return request(`/api/service-requests/${id}`, { method: "DELETE" });
}

// ===============================
// RBAC - Roles
// ===============================
export async function getRoles() {
  return request("/api/rbac/roles");
}

export async function createRole(payload: { role_name: string; description?: string }) {
  return request("/api/rbac/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRole(id: number, payload: any) {
  return request(`/api/rbac/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteRole(id: number) {
  return request(`/api/rbac/roles/${id}`, {
    method: "DELETE",
  });
}

// ===============================
// RBAC - Permissions
// ===============================
export async function getPermissions() {
  return request("/api/rbac/permissions");
}

export async function createPermission(payload: { module_name: string }) {
  return request("/api/rbac/permissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deletePermission(id: number) {
  return request(`/api/rbac/permissions/${id}`, {
    method: "DELETE",
  });
}

// ===============================
// Role → Permission Mapping
// ===============================
export async function getRolePermissions() {
  return request("/api/rbac/role-permissions");
}

export async function assignRolePermission(payload: {
  role_id: number;
  permission_id: number;
  can_add: boolean;
  can_edit: boolean;
  can_view: boolean;
  can_delete: boolean;
}) {
  return request(`/api/rbac/role-permissions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeRolePermission(id: number) {
  return request(`/api/rbac/role-permissions/${id}`, {
    method: "DELETE",
  });
}

// ===============================
// User → Plant Permission Mapping
// ===============================
export async function getUserPlantPermissions(userId: number) {
  return request(`/api/rbac/user/${userId}/plant-permissions`);
}

export async function saveUserPlantPermissions(userId: number, payload: any) {
  return request(`/api/rbac/user/${userId}/plant-permissions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ===============================
// My Permissions (AbilityContext)
// ===============================
export async function getMyPermissions() {
  return request("/api/rbac/my-permissions");
}

// ===============================
// Approvals API (Rewritten to use request())
// ===============================

/**
 * Fetch all approvals with optional filters
 */
export const fetchApprovals = async (queryParams?: string): Promise<any[]> => {
  const q = queryParams ? `?${queryParams}` : "";
  return request(`/api/master-approvals${q}`);
};

/**
 * Fetch a single approval by ID
 */
export const fetchApprovalById = async (id: number): Promise<any> => {
  return request(`/api/master-approvals/${id}`);
};

/**
 * Approve a pending change
 */
export const approveApproval = async (
  id: number,
  comments?: string
): Promise<any> => {
  return request(`/api/master-approvals/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ comments }),
  });
};

/**
 * Reject a pending change
 */
export const rejectApproval = async (
  id: number,
  comments: string
): Promise<any> => {
  return request(`/api/master-approvals/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ comments }),
  });
};

/**
 * Get approval statistics
 */
export const fetchApprovalStats = async (module?: string): Promise<any> => {
  const q = module ? `?module=${encodeURIComponent(module)}` : "";
  return request(`/api/master-approvals/stats${q}`);
};

/**
 * Cancel a pending approval (by requester only)
 */
export const cancelApproval = async (id: number): Promise<any> => {
  return request(`/api/master-approvals/${id}`, {
    method: "DELETE",
  });
};

export const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(",", "");

export const getRelativeTime = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

export const getStatusStyle = (status?: string) => {
  switch (status) {
    case "Approved":
      return { bg: "#16a34a", color: "#fff" };
    case "Rejected":
      return { bg: "#dc2626", color: "#fff" };
    case "Pending":
      return { bg: "#f59e0b", color: "#fff" };
    default:
      return { bg: "#94a3b8", color: "#fff" }; // N/A
  }
};

export const renderApprovalStatus = (
  status?: string,
  timestamp?: string,
  isNA = false
) => {
  if (isNA) return "N/A";

  if ((status === "Approved" || status === "Rejected") && timestamp) {
    return `${status}–${formatDateTime(timestamp)}`;
  }

  return status || "Pending";
};


export const canShowMenu = (menu: any, user: any): boolean => {
  if (!user) return false;

  // 🔒 CONDITION (ALWAYS FIRST)
  if (menu.condition && !menu.condition(user)) {
    return false;
  }

  // 🔥 SUPER ADMIN → bypass PERMISSIONS only
  const isSuperAdmin =
    user.role_id === 1 ||
    (Array.isArray(user.role_id) && user.role_id.includes(1));

  if (isSuperAdmin) return true;

  // 🔐 PERMISSION
  if (menu.permission) {
    return Array.isArray(user.permissions)
      ? user.permissions.includes(menu.permission)
      : false;
  }

  return true;
};

export const hasPermission = (
  user: any,
  permission?: string
): boolean => {
  if (!permission) return true;
  if (!user) return false;

  // 🔥 SuperAdmin override
  const isSuperAdmin =
    user.role_id === 1 ||
    (Array.isArray(user.role_id) && user.role_id.includes(1));

  if (isSuperAdmin) return true;

  return Array.isArray(user.permissions)
    ? user.permissions.includes(permission)
    : false;
};


export const hasModulePermission = (
  permissions: string[],
  action: "create" | "read" | "update" | "delete",
  module: string
) => permissions.includes(`${action}:${module}`);

export const hasPlantPermission = (
  plantPermissions: PlantPermission[],
  plantId: number,
  module: string,
  action: "create" | "read" | "update" | "delete"
) => {
  return plantPermissions.some(
    p =>
      p.plantId === plantId &&
      p.moduleId === module &&
      p.actions[action]
  );
};


export const MASTER_PERMISSIONS = {
  plant: "read:plant_master",
  role: "read:role_master",
  application: "read:application_master",
  workflow: "read:approval_workflow",
  dashboard:" read:dashboard",
  reviewer:" read:"
};


export const getRolePriority = (user: any) => {
  if (user?.role_id === 1) return "SUPER_ADMIN";
  if (user?.isApprover) return "APPROVER";
  if (user?.isITBin) return "IT";
  return "USER";
};

export const sortMenuByRole = (menu: MenuItem[], user: any) => {
  const role = getRolePriority(user);

  const priorityMap: Record<string, string[]> = {
    SUPER_ADMIN: ["Master", "Approval", "Task Closure"],
    APPROVER: ["Approval", "Pending Approval", "Approval History"],
    IT: ["Task Closure", "Task Closure Bin", "Master"],
    USER: ["Home", "User Request Management"],
  };

  const priority = priorityMap[role] || [];

  return [...menu].sort((a, b) => {
    const ai = priority.indexOf(a.label);
    const bi = priority.indexOf(b.label);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
};
export const fetchUserById = async (id: number) => {
  try {
    return await request(`/api/users/${id}`);
  } catch {
    return null; // IMPORTANT: do not throw
  }
};



