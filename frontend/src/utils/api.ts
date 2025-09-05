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
