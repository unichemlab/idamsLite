import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchApplications } from "../utils/api";

export interface Application {
  id: number;
  transaction_id: string;
  plant_location_id: number;
  department_id: number;
  application_hmi_name: string;
  application_hmi_version: string;
  equipment_instrument_id: string;
  application_hmi_type: string;
  display_name: string;
  role_id: string; // comma-separated string of IDs
  role_names?: string[]; // for display
  system_name: string;
  system_inventory_id: number;
  multiple_role_access: boolean;
  status: string;
  created_on: string;
  updated_on: string;
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
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    fetchApplications()
      .then((data) => {
        // Directly use API fields, and format display_name if not present
        const mapped = data.map((app: any) => ({
          id: app.id,
          transaction_id: app.transaction_id,
          plant_location_id: app.plant_location_id,
          department_id: app.department_id,
          application_hmi_name: app.application_hmi_name,
          application_hmi_version: app.application_hmi_version,
          equipment_instrument_id: app.equipment_instrument_id,
          application_hmi_type: app.application_hmi_type,
          display_name:
            app.display_name ||
            `${app.application_hmi_name || ""} | ${
              app.application_hmi_version || ""
            } | ${app.equipment_instrument_id || ""}`,
          role_id: String(app.role_id),
          role_names: app.role_names || [],
          system_name: app.system_name,
          system_inventory_id: app.system_inventory_id,
          multiple_role_access: app.multiple_role_access,
          status: app.status,
          created_on: app.created_on,
          updated_on: app.updated_on,
          activityLogs: [], // You can enhance this if you add logs in backend
        }));
        setApplications(mapped);
      })
      .catch(() => setApplications([]));
  }, []);

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
