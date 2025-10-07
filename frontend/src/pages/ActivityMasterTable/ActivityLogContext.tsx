import React, { createContext, useState, useEffect, ReactNode } from "react";
import { fetchActivityLog } from "../../utils/api";

// TypeScript interface matching your activity_logs table
export interface ActivityLog {
  id: number;
  transaction_id: string;
  user_id: number;
  plant_id: number;
  module_id: string;
  table_name: string;
  record_id: number;
  action: string;
  old_value?: string | null;
  new_value?: string | null;
  action_performed_by: number;
  approve_status?: string | null;
  date_time_ist: string; // timestamp as ISO string
  comments?: string | null;
  ip_address?: string | null;
  device?: string | null;
  created_on: string; // timestamp as ISO string
}

// Context type
interface ActivityLogContextType {
  activityLogs: ActivityLog[];
  setActivityLogs: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
  fetchAndSetActivityLogs: () => void;
}

// Create context
export const ActivityLogContext = createContext<ActivityLogContextType | undefined>(
  undefined
);

// Custom hook
export const useActivityLogContext = () => {
  const ctx = React.useContext(ActivityLogContext);
  if (!ctx) throw new Error("useActivityLogContext must be used within ActivityLogProvider");
  return ctx;
};

// Provider
export const ActivityLogProvider = ({ children }: { children: ReactNode }) => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const fetchAndSetActivityLogs = () => {
    fetchActivityLog()
      .then((data) => {
        const normalized: ActivityLog[] = data.map((p: any) => ({
          id: p.id,
          transaction_id: p.transaction_id,
          user_id: p.user_id,
          plant_id: p.plant_id,
          module_id: p.module_id,
          table_name: p.table_name,
          record_id: p.record_id,
          action: p.action,
          old_value: p.old_value,
          new_value: p.new_value,
          action_performed_by: p.action_performed_by,
          approve_status: p.approve_status,
          date_time_ist: p.date_time_ist,
          comments: p.comments,
          ip_address: p.ip_address,
          device: p.device,
          created_on: p.created_on,
        }));
        setActivityLogs(normalized);
      })
      .catch(() => {
        setActivityLogs([]);
      });
  };

  useEffect(() => {
    fetchAndSetActivityLogs();
  }, []);

  return (
    <ActivityLogContext.Provider
      value={{ activityLogs, setActivityLogs, fetchAndSetActivityLogs }}
    >
      {children}
    </ActivityLogContext.Provider>
  );
};
