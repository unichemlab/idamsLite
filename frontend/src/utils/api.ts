// Fetch plant master data from backend API
export async function fetchPlants(): Promise<any[]> {
  const res = await fetch("http://localhost:4000/api/plants");
  if (!res.ok) throw new Error("Failed to fetch plants");
  return await res.json();
}
