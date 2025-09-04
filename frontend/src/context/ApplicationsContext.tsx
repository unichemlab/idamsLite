import React, { createContext, useContext, useState } from "react";

export interface Application {
  name: string;
  version: string;
  equipmentId: string;
  computer: string;
  plant: string;
  status: string;
  activityLogs?: Array<{
    action: string;
    oldValue: any;
    newValue: any;
    approver: string;
    approvedOrRejectedBy?: string;
    approvalStatus?: string;
    dateTime: string;
    reason?: string;
  }>;
}

const initialApplications: Application[] = [
  {
    name: "SAP ERP",
    version: "v2.1",
    equipmentId: "EQ001",
    computer: "MUMAPP01",
    plant: "Mumbai Plant",
    status: "ACTIVE",
    activityLogs: [],
  },
  {
    name: "ZingHR",
    version: "v3.5",
    equipmentId: "EQ002",
    computer: "MUMAPP02",
    plant: "Mumbai Plant",
    status: "ACTIVE",
    activityLogs: [],
  },
  {
    name: "Manufacturing Execution System",
    version: "v1.8",
    equipmentId: "EQ003",
    computer: "GOAAPP01",
    plant: "Goa Plant",
    status: "ACTIVE",
    activityLogs: [],
  },
  {
    name: "Quality Management System",
    version: "v2.3",
    equipmentId: "EQ004",
    computer: "CHENAPP01",
    plant: "Chennai Plant",
    status: "ACTIVE",
    activityLogs: [],
  },
  {
    name: "Laboratory Information System",
    version: "v4.1",
    equipmentId: "EQ005",
    computer: "PUNAPP01",
    plant: "Pune Plant",
    status: "ACTIVE",
    activityLogs: [],
  },
];

const ApplicationsContext = createContext<
  | {
      applications: Application[];
      setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
    }
  | undefined
>(undefined);

export function ApplicationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [applications, setApplications] =
    useState<Application[]>(initialApplications);
  return (
    <ApplicationsContext.Provider value={{ applications, setApplications }}>
      {children}
    </ApplicationsContext.Provider>
  );
}

export function useApplications() {
  const context = useContext(ApplicationsContext);
  if (!context)
    throw new Error(
      "useApplications must be used within an ApplicationsProvider"
    );
  return context;
}
