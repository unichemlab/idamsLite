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
