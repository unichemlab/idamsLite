// System Inventory API
export async function fetchSystems(): Promise<any[]> {
  const res = await fetch("http://localhost:4000/api/systems");
  if (!res.ok) throw new Error("Failed to fetch systems");
  return await res.json();
}

// System Inventory API
export async function fetchActivityLog(): Promise<any[]> {
  const res = await fetch("http://localhost:4000/api/activity-logs");
  if (!res.ok) throw new Error("Failed to fetch systems");
  return await res.json();
}

export async function addSystemAPI(system: any): Promise<any> {
  const res = await fetch("http://localhost:4000/api/systems", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(system),
  });
  if (!res.ok) throw new Error("Failed to add system");
  return await res.json();
}

export async function updateSystemAPI(id: number, system: any): Promise<any> {
  const res = await fetch(`http://localhost:4000/api/systems/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(system),
  });
  if (!res.ok) throw new Error("Failed to update system");
  return await res.json();
}

export async function deleteSystemAPI(id: number): Promise<void> {
  const res = await fetch(`http://localhost:4000/api/systems/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete system");
}
// Fetch application master data from backend API
export async function fetchApplications(): Promise<any[]> {
  const res = await fetch("http://localhost:4000/api/applications");
  if (!res.ok) throw new Error("Failed to fetch applications");
  return await res.json();
}
// Fetch role master data from backend API
export async function fetchRoles(): Promise<any[]> {
  const res = await fetch("http://localhost:4000/api/roles");
  if (!res.ok) throw new Error("Failed to fetch roles");
  return await res.json();
}

// Add a new role
export async function addRoleAPI(role: any): Promise<any> {
  const res = await fetch("http://localhost:4000/api/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(role),
  });
  if (!res.ok) throw new Error("Failed to add role");
  return await res.json();
}

// Update a role
export async function updateRoleAPI(id: number, role: any): Promise<any> {
  const res = await fetch(`http://localhost:4000/api/roles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(role),
  });
  if (!res.ok) throw new Error("Failed to update role");
  return await res.json();
}

// Delete a role
export async function deleteRoleAPI(id: number): Promise<void> {
  const res = await fetch(`http://localhost:4000/api/roles/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete role");
}
// Fetch plant activity logs
export async function fetchPlantActivityLogs(): Promise<any[]> {
  const res = await fetch("http://localhost:4000/api/plants/activity-logs");
  if (!res.ok) throw new Error("Failed to fetch activity logs");
  return await res.json();
}
// Fetch plant master data from backend API
export async function fetchPlants(): Promise<any[]> {
  const res = await fetch("http://localhost:4000/api/plants");
  if (!res.ok) throw new Error("Failed to fetch plants");
  return await res.json();
}

// Add a new plant
export async function addPlantAPI(plant: any): Promise<any> {
  const res = await fetch("http://localhost:4000/api/plants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plant),
  });
  if (!res.ok) throw new Error("Failed to add plant");
  return await res.json();
}

// Update a plant
export async function updatePlantAPI(id: number, plant: any): Promise<any> {
  const res = await fetch(`http://localhost:4000/api/plants/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plant),
  });
  if (!res.ok) throw new Error("Failed to update plant");
  return await res.json();
}

// Delete a plant
export async function deletePlantAPI(id: number): Promise<void> {
  const res = await fetch(`http://localhost:4000/api/plants/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete plant");
}

/************************** api for vendor*********************************************** */
// Fetch vendor activity logs
export async function fetchVendorActivityLogs(): Promise<any[]> {
  const res = await fetch("http://localhost:4000/api/vendors/activity-logs");
  if (!res.ok) throw new Error("Failed to fetch activity logs");
  return await res.json();
}
// Fetch vendor master data from backend API
export async function fetchVendors(): Promise<any[]> {
  const res = await fetch("http://localhost:4000/api/vendors");
  if (!res.ok) throw new Error("Failed to fetch vendor");
  return await res.json();
}

// Add a new vendor
export async function addVendorAPI(vendor: any): Promise<any> {
  const res = await fetch("http://localhost:4000/api/vendors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vendor),
  });
  if (!res.ok) throw new Error("Failed to add vendor");
  return await res.json();
}

// Update a vendor
export async function updateVendorAPI(id: number, vendor: any): Promise<any> {
  const res = await fetch(`http://localhost:4000/api/vendors/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vendor),
  });
  if (!res.ok) throw new Error("Failed to update plant");
  return await res.json();
}

// Delete a vendor
export async function deleteVendorAPI(id: number): Promise<void> {
  const res = await fetch(`http://localhost:4000/api/vendors/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete vendor");
}

// Fetch document activity logs

// Add this if not already defined
// Department Activity Logs

// ✅ Department Activity Logs
export async function fetchDepartmentActivityLogs(): Promise<any[]> {
  const res = await fetch(
    "http://localhost:4000/api/departments/activity-logs"
  );
  if (!res.ok) throw new Error("Failed to fetch department activity logs");
  return await res.json();
}

// Fetch plant master data from backend API
export async function fetchDepartments(): Promise<any[]> {
  try {
    const res = await fetch("http://localhost:4000/api/departments");
    if (!res.ok) throw new Error("Failed to fetch departments");
    const data = await res.json();
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
  const res = await fetch("http://localhost:4000/api/departments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to add department");
  return await res.json();
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
  const res = await fetch(`http://localhost:4000/api/departments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update department");
  return await res.json();
}

// Delete a plant
export async function deleteDepartmentAPI(id: number): Promise<void> {
  const res = await fetch(`http://localhost:4000/api/departments/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete department");
}

/************************** API for User Request *****************************************/

// Fetch all user requests
export async function fetchUserRequests(): Promise<any[]> {
  const res = await fetch("http://localhost:4000/api/user-requests");
  if (!res.ok) throw new Error("Failed to fetch user requests");
  return await res.json();
}

// Add a new user request
export async function addUserRequestAPI(userRequest: FormData): Promise<any> {
  const res = await fetch("http://localhost:4000/api/user-requests", {
    method: "POST",
    body: userRequest, // <-- send FormData directly
  });
  if (!res.ok) throw new Error("Failed to add user request");
  return await res.json();
}

// Update a user request
export async function updateUserRequestAPI(
  id: number,
  userRequest: any
): Promise<any> {
  const res = await fetch(`http://localhost:4000/api/user-requests/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userRequest),
  });
  if (!res.ok) throw new Error("Failed to update user request");
  return await res.json();
}

// Delete a user request
export async function deleteUserRequestAPI(id: number): Promise<void> {
  const res = await fetch(`http://localhost:4000/api/user-requests/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete user request");
}

/************************** API for Task *****************************************/

// Fetch all tasks
export async function fetchTasks(): Promise<any[]> {
  const res = await fetch("http://localhost:4000/api/tasks");
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return await res.json();
}

// Add a new task
export async function addTaskAPI(task: any): Promise<any> {
  const res = await fetch("http://localhost:4000/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error("Failed to add task");
  return await res.json();
}

// Update a task
export async function updateTaskAPI(id: number, task: any): Promise<any> {
  const res = await fetch(`http://localhost:4000/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return await res.json();
}

// Delete a task
export async function deleteTaskAPI(id: number): Promise<void> {
  const res = await fetch(`http://localhost:4000/api/tasks/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete task");
}

/************************** API for Access Log *****************************************/

// Fetch all access logs
export async function fetchAccessLogs(): Promise<any[]> {
  const res = await fetch("http://localhost:4000/api/access-logs");
  if (!res.ok) throw new Error("Failed to fetch access logs");
  return await res.json();
}

// Add a new access log
export async function addAccessLogAPI(accessLog: any): Promise<any> {
  const res = await fetch("http://localhost:4000/api/access-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(accessLog),
  });
  if (!res.ok) throw new Error("Failed to add access log");
  return await res.json();
}

/************************** API for Application / Department / Role *****************************************/

// Fetch departments, roles, and applications by Plant ID
export async function fetchDepartmentsByPlantId(
  plantId: number
): Promise<{
  departments: { id: number; department_name: string }[];
}> {
  try {
    const res = await fetch(`http://localhost:4000/api/applications/${plantId}`);
    if (!res.ok) throw new Error("Failed to fetch data by plant ID");
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("API fetchDepartmentsRolesApplicationsByPlantId error:", error);
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
    const res = await fetch(`http://localhost:4000/api/applications/${plantId}/${deptId}`);
    if (!res.ok) throw new Error("Failed to fetch roles and applications");
    return await res.json();
  } catch (error) {
    console.error("API fetchRolesApplicationsByPlantAndDepartment error:", error);
    throw error;
  }
}





// Server Inventory API
export async function fetchServers(): Promise<any[]> {
  const res = await fetch("http://localhost:4000/api/servers");
  if (!res.ok) throw new Error("Failed to fetch servers");
  return await res.json();
}

export async function addServerAPI(server: any): Promise<any> {
  const res = await fetch("http://localhost:4000/api/servers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(server),
  });
  if (!res.ok) throw new Error("Failed to add server");
  return await res.json();
}

export async function updateServerAPI(id: number, server: any): Promise<any> {
  const res = await fetch(`http://localhost:4000/api/servers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(server),
  });
  if (!res.ok) throw new Error("Failed to update server");
  return await res.json();
}

export async function deleteServerAPI(id: number): Promise<void> {
  const res = await fetch(`http://localhost:4000/api/servers/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete server");
}


// Fetch employee details by employee code
export async function fetchUserByEmployeeCode(
  employeeCode: number
): Promise<{
  user: [];
}> {
  try {
    const res = await fetch(`http://localhost:4000/api/users/${employeeCode}`);
    if (!res.ok) throw new Error("Failed to fetch data by employeeCode");
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("API employeeCode error:", error);
    throw error;
  }
}