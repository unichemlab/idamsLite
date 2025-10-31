export interface AccessRequest {
  id: string;
  user: string;
  employeeCode?: string;
  plant?: string;
  department?: string;
  application: string;
  equipmentId?: string;
  role: string;
  accessStatus: string;
  requestStatus: "Pending" | "Approved" | "Rejected";
}

export interface ApprovalAction {
  approverName: string;
  approverRole: string;
  plant: string;
  corporate: string;
  action: "Approved" | "Rejected";
  timestamp: string;
  comments: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  roleIds: number[];
}