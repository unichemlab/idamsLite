// Mock user store for demo purposes
export type Role = "superAdmin" | "approver" | "plantAdmin" | "user" | "vendor";

export interface MockUser {
  id: number;
  username: string;
  password: string;
  role: Role;
  permissions: string[];
  // Vendor-specific fields (optional for other roles)
  fullName?: string;
  email?: string;
  empCode?: string;
  department?: string;
  status?: string;
  plants?: string[];
  centralPermission?: boolean;
  comment?: string;
  corporateAccessEnabled?: boolean;
}

function ensureViewPermissions(perms: string[]): string[] {
  const set = new Set(perms);
  perms.forEach((p) => {
    if (p.endsWith(":add") || p.endsWith(":edit") || p.endsWith(":update")) {
      set.add(p.replace(/:(add|edit|update)$/, ":view"));
    }
  });
  return Array.from(set);
}

export const mockUsers: MockUser[] = [
  // Vendor users for VendorMasterTable demo
  {
    id: 101,
    username: "vendor1",
    password: "vendor123",
    role: "vendor",
    permissions: [
      "vendorMaster:view",
      "vendorMaster:add",
      "vendorMaster:edit",
      "vendorMaster:delete",
    ],
    fullName: "Acme Corp",
    email: "contact@acme.com",
    empCode: "VEND001",
    department: "Procurement",
    status: "Active",
    plants: ["GOA", "Mumbai"],
    centralPermission: true,
    comment: "Preferred vendor",
    corporateAccessEnabled: true,
  },
  {
    id: 102,
    username: "vendor2",
    password: "vendor456",
    role: "vendor",
    permissions: ["vendorMaster:view", "vendorMaster:add", "vendorMaster:edit"],
    fullName: "Beta Supplies",
    email: "info@betasupplies.com",
    empCode: "VEND002",
    department: "Logistics",
    status: "Inactive",
    plants: ["Delhi"],
    centralPermission: false,
    comment: "Onboarding",
    corporateAccessEnabled: false,
  },
  {
    id: 1,
    username: "superadmin1",
    password: "superadmin123",
    role: "superAdmin",
    permissions: ensureViewPermissions([
      "dashboard:view",
      "users:create",
      "users:edit",
      "requests:view",
      "requests:approve",
      "settings:edit",
    ]),
  },
  {
    id: 2,
    username: "approver1",
    password: "approver123",
    role: "approver",
    permissions: ensureViewPermissions([
      "dashboard:view",
      "requests:view",
      "requests:approve",
    ]),
  },
  {
    id: 3,
    username: "plantadmin1",
    password: "plantadmin123",
    role: "plantAdmin",
    permissions: ensureViewPermissions(["dashboard:view", "plants:edit"]),
  },

  {
    id: 4,
    username: "user1",
    password: "user123",
    role: "user",
    permissions: ensureViewPermissions(["userform:submit"]),
  },
  // Plant Admin with limited permissions
  {
    id: 5,
    username: "plantadmin2",
    password: "plantadmin456",
    role: "plantAdmin",
    permissions: ensureViewPermissions([
      "dashboard:view",
      "plantMaster:view",
      "plantMaster:edit",
      "roleMaster:view",
      "roleMaster:edit",
    ]),
  },
  // User Master Admin with all userMaster permissions only
  {
    id: 6,
    username: "usermaster1",
    password: "usermaster123",
    role: "plantAdmin",
    permissions: ensureViewPermissions([
      "dashboard:view",
      "userMaster:view",
      "userMaster:add",
      "userMaster:edit",
      "userMaster:update",
      "userMaster:delete",
    ]),
  },
];
