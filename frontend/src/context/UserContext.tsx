import React, { createContext, useContext, useState } from "react";

export type UserForm = {
  fullName: string;
  email: string;
  empCode: string;
  department: string;
  status: string;
  plants: string[];
  permissions: {
    [key: string]: string[];
  };
  centralPermission: boolean;
  comment: string;
  corporateAccessEnabled: boolean;
};

export interface UserWithLogs extends UserForm {
  centralMaster: string[];
  activityLogs: any[];
}

interface UserContextType {
  users: UserWithLogs[];
  addUser: (user: UserForm) => void;
  editUser: (idx: number, user: UserForm) => void;
  deleteUser: (idx: number) => void;
}

const initialUsers: UserWithLogs[] = [
  {
    fullName: "Krishna Patel",
    email: "krishna.patel@unichem.com",
    empCode: "EMP001",
    department: "IT",
    status: "Active",
    plants: ["GOA", "GOA-1", "Mumbai"],
    permissions: {
      "GOA-Role Master": ["Add", "Edit", "View"],
      "GOA-1-Role Master": ["View"],
      "Mumbai-Role Master": ["View"],
      "GOA-Vendor Master": ["Add", "View"],
      "GOA-1-Vendor Master": [],
      "Mumbai-Vendor Master": [],
      "GOA-Plant Master": ["Add", "Edit", "View"],
      "GOA-1-Plant Master": ["View"],
      "Mumbai-Plant Master": ["View"],
      "GOA-Application Master": ["View"],
      "GOA-1-Application Master": [],
      "Mumbai-Application Master": [],
      "GOA-Approval Workflow": ["View"],
      "GOA-1-Approval Workflow": [],
      "Mumbai-Approval Workflow": [],
      "Role Master": ["Add", "Edit", "View"],
      "Vendor Master": [],
      "Plant Master": [],
      "Approval Workflow1": [],
      "Approval Workflow2": [],
    },
    centralPermission: true,
    comment: "Role upgraded for audit",
    corporateAccessEnabled: true,
    centralMaster: ["Role Master"],
    activityLogs: [
      {
        action: "Edit",
        oldValue: "Role: User",
        newValue: "Role: Admin",
        approver: "Admin1",
        approvedOrRejectedBy: "SuperAdmin",
        approvalStatus: "Approved",
        dateTime: "2025-08-04 14:25",
        reason: "Role upgraded for audit",
      },
      {
        action: "Delete",
        oldValue: "Status: Active",
        newValue: "Status: Deleted",
        approver: "Admin2",
        approvedOrRejectedBy: "SuperAdmin",
        approvalStatus: "Rejected",
        dateTime: "2025-08-05 10:10",
        reason: "User left organization",
      },
    ],
  },
  {
    fullName: "Sneha Desai",
    email: "sneha.desai@unichemlab.com",
    empCode: "EMP002",
    department: "HR",
    status: "Inactive",
    plants: ["GOA", "Mumbai"],
    permissions: {
      "GOA-Role Master": ["View"],
      "Mumbai-Role Master": ["Add", "Edit", "View"],
      "GOA-Vendor Master": [],
      "Mumbai-Vendor Master": ["View"],
      "GOA-Plant Master": ["View"],
      "Mumbai-Plant Master": ["Add", "Edit", "View"],
      "GOA-Application Master": [],
      "Mumbai-Application Master": ["View"],
      "GOA-Approval Workflow": [],
      "Mumbai-Approval Workflow": ["View"],
      "Role Master": ["Add", "Edit", "View"],
      "Vendor Master": [],
      "Plant Master": ["Add", "Edit", "View"],
      "Approval Workflow1": [],
      "Approval Workflow2": [],
    },
    centralPermission: true,
    comment: "Transferred department",
    corporateAccessEnabled: true,
    centralMaster: ["Role Master", "Plant Master"],
    activityLogs: [
      {
        action: "Edit",
        oldValue: "Department: HR",
        newValue: "Department: Admin",
        approver: "Admin2",
        approvedOrRejectedBy: "SuperAdmin",
        approvalStatus: "Approved",
        dateTime: "2025-08-01 10:10",
        reason: "Transferred department",
      },
    ],
  },
  {
    fullName: "Amit Nagpure",
    email: "amit.nagpure@unichem.com",
    empCode: "EMP003",
    department: "Finance",
    status: "Active",
    plants: ["Mumbai"],
    permissions: {
      "Mumbai-Role Master": ["View"],
      "Mumbai-Vendor Master": [],
      "Mumbai-Plant Master": ["Add", "Edit", "View"],
      "Mumbai-Application Master": ["View"],
      "Mumbai-Approval Workflow": [],
      "Role Master": ["Add", "Edit", "View"],
      "Vendor Master": [],
      "Plant Master": ["Add", "Edit", "View"],
      "Approval Workflow1": [],
      "Approval Workflow2": [],
    },
    centralPermission: true,
    comment: "Granted central access",
    corporateAccessEnabled: true,
    centralMaster: ["Plant Master"],
    activityLogs: [
      {
        action: "Edit",
        oldValue: "Central Master: No",
        newValue: "Central Master: Yes",
        approver: "Admin1",
        approvedOrRejectedBy: "SuperAdmin",
        approvalStatus: "Approved",
        dateTime: "2025-08-04 14:25",
        reason: "Granted central access",
      },
      {
        action: "Delete",
        oldValue: "Status: Active",
        newValue: "Status: Deleted",
        approver: "Admin2",
        approvedOrRejectedBy: "SuperAdmin",
        approvalStatus: "Rejected",
        dateTime: "2025-08-05 10:10",
        reason: "User removed",
      },
    ],
  },
  {
    fullName: "Pankaj Singh",
    email: "pankaj.patel@unichem.com",
    empCode: "EMP004",
    department: "QA",
    status: "Inactive",
    plants: ["Delhi", "Mumbai"],
    permissions: {
      "Delhi-Role Master": ["View"],
      "Mumbai-Role Master": ["Add", "Edit", "View"],
      "Delhi-Vendor Master": [],
      "Mumbai-Vendor Master": ["View"],
      "Delhi-Plant Master": ["View"],
      "Mumbai-Plant Master": ["Add", "Edit", "View"],
      "Delhi-Application Master": [],
      "Mumbai-Application Master": ["View"],
      "Delhi-Approval Workflow": [],
      "Mumbai-Approval Workflow": ["View"],
      "Role Master": ["Add", "Edit", "View"],
      "Vendor Master": [],
      "Plant Master": ["Add", "Edit", "View"],
      "Approval Workflow1": [],
      "Approval Workflow2": [],
    },
    centralPermission: true,
    comment: "No view actions, only add/edit/delete",
    corporateAccessEnabled: true,
    centralMaster: ["Role Master", "Plant Master"],
    activityLogs: [],
  },
];

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [users, setUsers] = useState<UserWithLogs[]>(initialUsers);

  function getEnabledCentralModules(permissions: { [key: string]: string[] }) {
    const centralModules = [
      "Role Master",
      "Vendor Master",
      "Plant Master",
      "Approval Workflow1",
      "Approval Workflow2",
    ];
    return centralModules.filter((mod) => permissions[mod]?.length > 0);
  }

  const addUser = (user: UserForm) => {
    setUsers((prev) => [
      ...prev,
      {
        ...user,
        centralMaster: getEnabledCentralModules(user.permissions),
        activityLogs: [
          {
            action: "Add",
            oldValue: "-",
            newValue: JSON.stringify({
              department: user.department,
              plants: user.plants,
              status: user.status,
              centralMaster: getEnabledCentralModules(user.permissions),
            }),
            approver: "Admin",
            approvedOrRejectedBy: "SuperAdmin",
            approvalStatus: "Approved",
            dateTime: new Date().toISOString().slice(0, 16).replace("T", " "),
            reason: user.comment || "No reason provided",
          },
        ],
      },
    ]);
  };

  const editUser = (idx: number, user: UserForm) => {
    setUsers((prev) =>
      prev.map((u, i) => {
        if (i !== idx) return u;
        const newCentralMaster = getEnabledCentralModules(user.permissions);
        let logs = Array.isArray(u.activityLogs) ? [...u.activityLogs] : [];
        let oldVals = [];
        let newVals = [];
        if (u.department !== user.department) {
          oldVals.push(`Department: ${u.department}`);
          newVals.push(`Department: ${user.department}`);
        }
        if (u.status !== user.status) {
          oldVals.push(`Status: ${u.status}`);
          newVals.push(`Status: ${user.status}`);
        }
        if (u.plants.join(", ") !== user.plants.join(", ")) {
          oldVals.push(`Plants: ${u.plants.join(", ")}`);
          newVals.push(`Plants: ${user.plants.join(", ")}`);
        }
        if (u.centralMaster.join(", ") !== newCentralMaster.join(", ")) {
          oldVals.push(`Central Master: ${u.centralMaster.join(", ")}`);
          newVals.push(`Central Master: ${newCentralMaster.join(", ")}`);
        }
        if (oldVals.length > 0 || newVals.length > 0) {
          logs.push({
            action: "Edit",
            oldValue: oldVals.length > 0 ? oldVals.join(" | ") : "-",
            newValue: newVals.length > 0 ? newVals.join(" | ") : "-",
            approver: "Admin",
            approvedOrRejectedBy: "SuperAdmin",
            approvalStatus: "Approved",
            dateTime: new Date().toISOString().slice(0, 16).replace("T", " "),
            reason: user.comment || "No reason provided",
          });
        }
        return {
          ...user,
          centralMaster: newCentralMaster,
          activityLogs: logs,
        };
      })
    );
  };

  const deleteUser = (idx: number) => {
    setUsers((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <UserContext.Provider value={{ users, addUser, editUser, deleteUser }}>
      {children}
    </UserContext.Provider>
  );
};

export function useUserContext() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUserContext must be used within UserProvider");
  return ctx;
}
