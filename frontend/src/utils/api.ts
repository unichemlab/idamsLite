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
  const res = await fetch("http://localhost:4000/api/departments/activity-logs");
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
export async function updateDepartmentAPI(id: number, department: any): Promise<any> {
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
