import { request } from './api';

export interface User {
  id: number;
  employee_code?: string;
  employee_id?: string;
  employee_name?: string;
  fullName?: string;
  email?: string;
}

export interface Workflow {
  id?: number;
  workflow_id?: number;
  transaction_id: string;
  workflow_type: 'PLANT' | 'CORPORATE';
  plant_id: number | null;
  department_id: number | null;
  approver_1_id: string | null;
  approver_2_id: string | null;
  approver_3_id: string | null;
  approver_4_id: string | null;
  approver_5_id: string | null;
  max_approvers: number;
  is_active: boolean;
  approvers?: User[][];
}

export interface WorkflowResponse {
  workflows?: Workflow[];
  workflow?: Workflow;
}

export async function fetchWorkflows(approverId?: number, plantId?: number): Promise<Workflow[]> {
  const params = [];
  if (approverId) params.push(`approver_id=${approverId}`);
  if (plantId) params.push(`plant_id=${plantId}`);
  const q = params.length ? `?${params.join('&')}` : '';
  
  const response = await request(`/api/workflows${q}`) as WorkflowResponse | Workflow[];
  
  // Handle both array and object responses from backend
  if (Array.isArray(response)) {
    return response;
  }
  if ('workflows' in response && Array.isArray(response.workflows)) {
    return response.workflows;
  }
  if ('workflow' in response && response.workflow) {
    return [response.workflow];
  }
  return [];
}

export async function createWorkflow(workflow: Workflow): Promise<Workflow> {
  const response = await request('/api/workflows', {
    method: 'POST',
    body: JSON.stringify(workflow),
    headers: {
      'Content-Type': 'application/json'
    }
  }) as Workflow;
  return response;
}

export async function updateWorkflow(id: number, workflow: Workflow): Promise<Workflow> {
  const response = await request(`/api/workflows/${id}`, {
    method: 'PUT',
    body: JSON.stringify(workflow),
    headers: {
      'Content-Type': 'application/json'
    }
  }) as Workflow;
  return response;
}

export async function deleteWorkflow(id: number): Promise<void> {
  await request(`/api/workflows/${id}`, {
    method: 'DELETE'
  });
}