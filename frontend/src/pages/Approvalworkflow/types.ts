// src/pages/Approvalworkflow/types.ts
export type User = {
  id: number;               // required
  employee_name: string;
  email?: string;
  profile_pic?: string;
};

export type Workflow = {
  id: number;
  plant_id: number;
  plant_name: string;
  transcation_id:string;
  department_id?: number;
  department_name?: string;
  status: "active" | "inactive";
  max_approvers?: number;
  is_active?: boolean;
  approver1?: User[];
  approver2?: User[];
  approver3?: User[];
  approver4?: User[];
  approver5?: User[];
  users?: User[];
  name?: string;
};

export type Plant = {
  id: number;
  name: string;
};
