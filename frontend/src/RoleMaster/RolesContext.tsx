import React, { createContext, useContext, useState } from "react";

export interface RoleActivityLog {
  action: string;
  oldValue?: string;
  newValue?: string;
  approver?: string;
  dateTime?: string;
  reason?: string;
}

export interface Role {
  name: string;
  description: string;
  status: string;
  activityLogs: RoleActivityLog[];
}

const initialRoles: Role[] = [
  {
    name: "Read Only",
    description: "View access to system data",
    status: "ACTIVE",
    activityLogs: [
      {
        action: "View",
        oldValue: "-",
        newValue: "-",
        approver: "Admin",
        dateTime: "2025-08-01 09:00",
        reason: "Viewed by Admin",
      },
    ],
  },
  {
    name: "User",
    description: "Standard user access with edit capabilities",
    status: "ACTIVE",
    activityLogs: [
      {
        action: "Edit",
        oldValue: "Role: Read Only",
        newValue: "Role: User",
        approver: "Admin1",
        dateTime: "2025-08-02 10:10",
        reason: "Role upgraded",
      },
    ],
  },
  {
    name: "Administrator",
    description: "Full administrative access",
    status: "ACTIVE",
    activityLogs: [
      {
        action: "Add",
        oldValue: "-",
        newValue: "Role: Administrator",
        approver: "SuperAdmin",
        dateTime: "2025-08-03 11:30",
        reason: "Created role",
      },
    ],
  },
  {
    name: "Super Admin",
    description: "Complete system control",
    status: "ACTIVE",
    activityLogs: [
      {
        action: "Edit",
        oldValue: "Status: INACTIVE",
        newValue: "Status: ACTIVE",
        approver: "Admin2",
        dateTime: "2025-08-04 14:25",
        reason: "Activated role",
      },
    ],
  },
  {
    name: "Operator",
    description: "Operational access for daily tasks",
    status: "INACTIVE",
    activityLogs: [
      {
        action: "Delete",
        oldValue: "Status: ACTIVE",
        newValue: "Status: INACTIVE",
        approver: "Admin3",
        dateTime: "2025-08-05 10:10",
        reason: "Role deactivated",
      },
    ],
  },
];

const RolesContext = createContext<
  | {
      roles: Role[];
      setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
    }
  | undefined
>(undefined);

export function RolesProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  return (
    <RolesContext.Provider value={{ roles, setRoles }}>
      {children}
    </RolesContext.Provider>
  );
}

export function useRoles() {
  const context = useContext(RolesContext);
  if (!context) throw new Error("useRoles must be used within a RolesProvider");
  return context;
}
