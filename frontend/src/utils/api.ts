// Centralized API base
// Uses REACT_APP_API_URL from .env.local or .env.production
// Example: REACT_APP_API_URL=https://lucky-hope-production.up.railway.app
export const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:4000";

async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const headers = options.headers || {};

  // don't overwrite content-type when sending FormData
  if (!(options.body instanceof FormData)) {
    (headers as any)["Content-Type"] =
      (headers as any)["Content-Type"] || "application/json";
  }

  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => null);
    throw new Error(text || res.statusText || "API request failed");
  }
  if (res.status === 204) return null;
  return await res.json().catch(() => null);
}

// System Inventory API
export async function fetchSystems(): Promise<any[]> {
  return request("/api/systems");
}

// System Inventory API
export async function fetchActivityLog(): Promise<any[]> {
  return request("/api/activity-logs");
}

// Task API
export async function fetchTaskLog(): Promise<any[]> {
  const res = await fetch("http://localhost:4000/api/task");
  if (!res.ok) throw new Error("Failed to fetch systems");
  return await res.json();
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
// Fetch application master data from backend API
export async function fetchApplications(): Promise<any[]> {
  return request("/api/applications");
}
// Fetch role master data from backend API
export async function fetchRoles(): Promise<any[]> {
  return request("/api/roles");
}

// Add a new role
export async function addRoleAPI(role: any): Promise<any> {
  return request("/api/roles", { method: "POST", body: JSON.stringify(role) });
}

// Update a role
export async function updateRoleAPI(id: number, role: any): Promise<any> {
  return request(`/api/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(role),
  });
}

// Delete a role
export async function deleteRoleAPI(id: number): Promise<void> {
  return request(`/api/roles/${id}`, { method: "DELETE" });
}
// Fetch plant activity logs
export async function fetchPlantActivityLogs(): Promise<any[]> {
  return request("/api/plants/activity-logs");
}
// Fetch plant master data from backend API
export async function fetchPlants(): Promise<any[]> {
  return request("/api/plants");
}

// Add a new plant
export async function addPlantAPI(plant: any): Promise<any> {
  return request("/api/plants", {
    method: "POST",
    body: JSON.stringify(plant),
  });
}

// Update a plant
export async function updatePlantAPI(id: number, plant: any): Promise<any> {
  return request(`/api/plants/${id}`, {
    method: "PUT",
    body: JSON.stringify(plant),
  });
}

// Delete a plant
export async function deletePlantAPI(id: number): Promise<void> {
  return request(`/api/plants/${id}`, { method: "DELETE" });
}

/************************** api for vendor*********************************************** */
// Fetch vendor activity logs
export async function fetchVendorActivityLogs(): Promise<any[]> {
  return request("/api/vendors/activity-logs");
}
// Fetch vendor master data from backend API
export async function fetchVendors(): Promise<any[]> {
  return request("/api/vendors");
}

// Add a new vendor
export async function addVendorAPI(vendor: any): Promise<any> {
  return request("/api/vendors", {
    method: "POST",
    body: JSON.stringify(vendor),
  });
}

// Update a vendor
export async function updateVendorAPI(id: number, vendor: any): Promise<any> {
  return request(`/api/vendors/${id}`, {
    method: "PUT",
    body: JSON.stringify(vendor),
  });
}

// Delete a vendor
export async function deleteVendorAPI(id: number): Promise<void> {
  return request(`/api/vendors/${id}`, { method: "DELETE" });
}

// Fetch document activity logs

// Add this if not already defined
// Department Activity Logs

// ✅ Department Activity Logs
export async function fetchDepartmentActivityLogs(): Promise<any[]> {
  return request("/api/departments/activity-logs");
}

// Fetch plant master data from backend API
export async function fetchDepartments(): Promise<any[]> {
  try {
    const data = await request("/api/departments");
    // Map API fields to frontend model, fallback for missing department_name
    return data.map((dept: any) => ({
      id: dept.id,
      name: dept.department_name || dept.name || "", // always provide name
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

// Add a new plant
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

// Update a plant
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

// Delete a plant
export async function deleteDepartmentAPI(id: number): Promise<void> {
  return request(`/api/departments/${id}`, { method: "DELETE" });
}

/************************** API for User Request *****************************************/

// Fetch all user requests
export async function fetchUserRequests(): Promise<any[]> {
  return request("/api/user-requests");
}

// Add a new user request
export async function addUserRequestAPI(userRequest: FormData): Promise<any> {
  // when sending FormData the request wrapper preserves FormData content-type
  return request(`/api/user-requests`, { method: "POST", body: userRequest });
}

// Update a user request
export async function updateUserRequestAPI(
  id: number,
  userRequest: any
): Promise<any> {
  return request(`/api/user-requests/${id}`, {
    method: "PUT",
    body: JSON.stringify(userRequest),
  });
}

// Delete a user request
export async function deleteUserRequestAPI(id: number): Promise<void> {
  return request(`/api/user-requests/${id}`, { method: "DELETE" });
}

/************************** API for Task *****************************************/

// Fetch all tasks
export async function fetchTasks(): Promise<any[]> {
  return request(`/api/tasks`);
}

export async function fetchTaskById(id: string): Promise<any> {
  const res = await fetch(`http://localhost:4000/api/tasks/${id}`);
  if (!res.ok) throw new Error("Failed to fetch task by ID");
  return await res.json();
}

// Add a new task
export async function addTaskAPI(task: any): Promise<any> {
  return request(`/api/tasks`, { method: "POST", body: JSON.stringify(task) });
}

// Update a task
export async function updateTaskAPI(id: number, task: any): Promise<any> {
  return request(`/api/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(task),
  });
}

// Delete a task
export async function deleteTaskAPI(id: number): Promise<void> {
  return request(`/api/tasks/${id}`, { method: "DELETE" });
}

/************************** API for Access Log *****************************************/

// Fetch all access logs
export async function fetchAccessLogs(): Promise<any[]> {
  return request(`/api/access-logs`);
}

// Add a new access log
export async function addAccessLogAPI(accessLog: any): Promise<any> {
  return request(`/api/access-logs`, {
    method: "POST",
    body: JSON.stringify(accessLog),
  });
}

/************************** API for Application / Department / Role *****************************************/

// Fetch departments, roles, and applications by Plant ID
export async function fetchDepartmentsByPlantId(plantId: number): Promise<{
  departments: { id: number; department_name: string }[];
}> {
  try {
    return request(`/api/applications/${plantId}`);
  } catch (error) {
    console.error(
      "API fetchDepartmentsRolesApplicationsByPlantId error:",
      error
    );
    throw error;
  }
}

/************************** API for Applications, Roles by Plant and Department *****************************************/

// Fetch roles and applications by plant ID and department ID
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
    console.error(
      "API fetchRolesApplicationsByPlantAndDepartment error:",
      error
    );
    throw error;
  }
}

// Server Inventory API
export async function fetchServers(): Promise<any[]> {
  return request(`/api/servers`);
}

export async function addServerAPI(server: any): Promise<any> {
  return request(`/api/servers`, {
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

// Fetch employee details by employee code
export async function fetchUserByEmployeeCode(employeeCode: number): Promise<{
  user: [];
}> {
  try {
    return request(`/api/users/${employeeCode}`);
  } catch (error) {
    console.error("API employeeCode error:", error);
    throw error;
  }
}

// Authentication
export async function loginAPI(credentials: {
  email: string;
  password: string;
}) {
  return request(`/api/auth/login`, {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}
