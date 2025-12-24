export interface Permission {
  action: "create" | "read" | "update" | "delete" | "approve" | "manage";
  subject: string;
}

export interface PlantPermission {
  moduleId: string;
  plantId: number;
  actions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
}


// Define canonical permission format strings
export const createPermission = (
  action: Permission["action"],
  subject: string
): string => {
  return `${action}:${subject}`;
};

// Core permission action types
export const Actions = {
  Create: "create" as const,
  Read: "read" as const,
  Update: "update" as const,
  Delete: "delete" as const,
  Approve: "approve" as const,
  Manage: "manage" as const,
};

// Role to permissions mapping
export const RolePermissions = {
  SuperAdmin: [createPermission(Actions.Manage, "all")],
  PlantITAdmin: [
    createPermission(Actions.Create, "user-requests"),
    createPermission(Actions.Read, "user-requests"),
    createPermission(Actions.Update, "user-requests"),
    createPermission(Actions.Read, "tasks"),
    createPermission(Actions.Update, "tasks"),
    createPermission(Actions.Read, "reports"),
    createPermission(Actions.Create, "plant-users"),
    createPermission(Actions.Update, "plant-users"),
    createPermission(Actions.Read, "plant-users"),
  ],
  Approver: [
    createPermission(Actions.Read, "user-requests"),
    createPermission(Actions.Approve, "user-requests"),
    createPermission(Actions.Read, "tasks"),
    createPermission(Actions.Update, "tasks"),
  ],
  PlantUser: [
    createPermission(Actions.Create, "user-requests"),
    createPermission(Actions.Read, "user-requests"),
    createPermission(Actions.Read, "tasks"),
  ],
  AuditReviewer: [
    createPermission(Actions.Read, "user-requests"),
    createPermission(Actions.Read, "tasks"),
    createPermission(Actions.Read, "reports"),
    createPermission(Actions.Read, "activity-logs"),
  ],
};

// Role hierarchy (higher index = higher priority)
export const RoleHierarchy = [
  "PlantUser",
  "AuditReviewer",
  "Approver",
  "PlantITAdmin",
  "SuperAdmin",
];
