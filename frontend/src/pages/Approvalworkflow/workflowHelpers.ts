// src/pages/Approvalworkflow/workflowHelpers.ts
export const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

export type User = { id: number; employee_name: string; email?: string };
export type Workflow = {
  id?: number;
  transaction_id?: string;
  workflow_type?: string;
  plant_id?: number;
  plant_name?: string;
  department_id?: number;
  department_name?: string;
  max_approvers?: number;
  is_active?: boolean;
  approver1?: User[];
  approver2?: User[];
  approver3?: User[];
  approver4?: User[];
  approver5?: User[];
  users?: User[];
  name?: string;
  status?: "active" | "inactive";
};

// Fetch all plant workflows
export async function fetchPlantWorkflows(): Promise<Workflow[]> {
  const res = await fetch(`${API_BASE}/api/workflows/plants`);
  if (!res.ok) return [];
  return res.json();
}

// Fetch all distinct plants
export async function fetchPlants(): Promise<{ id: number; name: string }[]> {
  const workflows = await fetchPlantWorkflows();
  const plantMap = new Map<number, { id: number; name: string }>();
  workflows.forEach((w) => {
    if (w.plant_id && w.plant_name && !plantMap.has(w.plant_id)) {
      plantMap.set(w.plant_id, { id: w.plant_id, name: w.plant_name });
    }
  });
  return Array.from(plantMap.values());
}

// Fetch corporate workflows
export async function fetchCorporateWorkflows(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/workflows/corporate`);
  if (!res.ok) return [];
  return res.json();
}

// Save or update plant workflow
export async function savePlantWorkflow(payload: Workflow) {
  const isEdit = !!payload.id;
  const url = isEdit
    ? `${API_BASE}/api/workflows/plants/${payload.id}`
    : `${API_BASE}/api/workflows/plants`;
  const res = await fetch(url, {
    method: isEdit ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save plant workflow");
  return res.json();
}

// Save or update corporate workflow
export async function saveCorporateWorkflow(payload: any) {
  const isEdit = !!payload.id;
  const url = isEdit
    ? `${API_BASE}/api/workflows/corporate/${payload.id}`
    : `${API_BASE}/api/workflows/corporate`;
  const res = await fetch(url, {
    method: isEdit ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save corporate workflow");
  return res.json();
}

/**
 * Exclude any plant that already has an active workflow.
 */
export function filterInactivePlants(
  plants: { id: number; name: string }[],
  workflows: Workflow[]
) {
  const activePlantIds = new Set(
    workflows.filter((w) => w.status === "active" && w.plant_id).map((w) => w.plant_id)
  );
  return plants.filter((p) => !activePlantIds.has(p.id));
}
