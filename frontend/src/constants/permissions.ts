/**
 * Centralized permission constants
 * Single source of truth for RBAC
 */

export const PERMISSIONS = {
  APPLICATION: {
    CREATE: "create:application_master",
    READ: "read:application_master",
    UPDATE: "update:application_master",
    DELETE: "delete:application_master",
    APPROVE: "approve:application_master",
  },

  PLANT: {
    CREATE: "create:plant_master",
    READ: "read:plant_master",
    UPDATE: "update:plant_master",
    DELETE: "delete:plant_master",
    APPROVE: "approve:plant_master",
  },

  DEPARTMENT: {
    CREATE: "create:department_master",
    READ: "read:department_master",
    UPDATE: "update:department_master",
    DELETE: "delete:department_master",
    APPROVE: "approve:department_master",
  },

  ROLE: {
    CREATE: "create:role_master",
    READ: "read:role_master",
    UPDATE: "update:role_master",
    DELETE: "delete:role_master",
    APPROVE: "approve:role_master",
  },

  USER: {
    CREATE: "create:user",
    READ: "read:user",
    UPDATE: "update:user",
    DELETE: "delete:user",
    MANAGE: "manage:users",
  },

  DASHBOARD: {
    CREATE: "create:dashboard",
    READ: "read:dashboard",
    UPDATE: "update:dashboard",
    DELETE: "delete:dashboard",
  },

  TASK: {
    VIEW: "view:tasks",
    MANAGE: "manage:tasks",
    ASSIGN: "assign:tasks",
    COMPLETE: "complete:tasks",
  },

  REVIEWER: {
    CREATE: "create:reviewer",
    READ: "read:reviewer",
    UPDATE: "update:reviewer",
    DELETE: "delete:reviewer",
  },

  TASK_CLOSURE_BIN: {
    CREATE: "create:task_clouser_bin",
    READ: "read:task_clouser_bin",
    UPDATE: "update:task_clouser_bin",
    DELETE: "delete:task_clouser_bin",
  },

  VENDOR: {
    CREATE: "create:vendor_information",
    READ: "read:vendor_information",
    UPDATE: "update:vendor_information",
    DELETE: "delete:vendor_information",
  },

  APPROVAL: {
    CREATE: "create:approval_workflow",
    READ: "read:approval_workflow",
    UPDATE: "update:approval_workflow",
    DELETE: "delete:approval_workflow",
  },

  REPORT: {
    VIEW: "view:reports",
    EXPORT: "export:reports",
    GENERATE: "generate:reports",
  },

  SETTINGS: {
    VIEW: "view:settings",
    MANAGE: "manage:settings",
  },
} as const;

/* =======================================================
   DERIVED TYPES
======================================================= */

type PermissionMap = typeof PERMISSIONS;
export type PermissionModule = keyof PermissionMap;

export type Permission =
  PermissionMap[keyof PermissionMap][keyof PermissionMap[keyof PermissionMap]];

/* =======================================================
   HELPERS (TS-SAFE)
======================================================= */

/**
 * Get permissions for a module
 * TS-safe workaround for Object.values()
 */
export const getModulePermissions = (
  module: PermissionModule
): readonly Permission[] => {
  return Object.values(PERMISSIONS[module]) as unknown as Permission[];
};

/**
 * Type guard to validate permission strings
 */
export const isValidPermission = (
  permission: string
): permission is Permission => {
  const allPermissions = Object.values(PERMISSIONS).flatMap(
    (module) => Object.values(module)
  ) as Permission[];

  return allPermissions.includes(permission as Permission);
};

/* =======================================================
   ROLES
======================================================= */

export const ROLES = {
  SUPER_ADMIN: "superAdmin",
  APPROVER: "approver",
  IT_BIN: "itBin",
  USER: "user",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
