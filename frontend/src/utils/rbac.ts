import { Role } from "../context/AuthContext";

// Define permissions for each role
const permissions: Record<Role, string[]> = {
  admin: [
    "dashboard:view",
    "requests:view",
    "requests:approve",
    "users:view",
    "users:edit",
    "compliance:view",
    "compliance:export",
    "system:view",
    "settings:view",
  ],
  auditor: [
    "dashboard:view",
    "requests:view",
    "compliance:view",
    "system:view",
  ],
  manager: [
    "dashboard:view",
    "requests:view",
    "requests:approve",
    "users:view",
    "compliance:view",
    "compliance:export",
  ],
  user: ["dashboard:view"],
};

export function can(role: Role, permission: string) {
  return permissions[role]?.includes(permission);
}
