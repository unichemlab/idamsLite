// src/utils/activityLogUtils.ts

import { API_BASE } from "./api";

interface ActivityLog {
  id?: number;
  action?: string;
  oldValue?: any;
  old_value?: any;
  newValue?: any;
  new_value?: any;
  approver?: string;
  action_performed_by?: string;
  approvalStatus?: string;
  approval_status?: string;
  dateTime?: string;
  date_time_ist?: string;
  comments?: string;
  user_id?: number;
  table_name?: string;
  record_id?: number | string;
  details?: string;
}

/**
 * Fetch activity logs for a SPECIFIC RECORD ID
 * 
 * This function fetches ONLY the activity logs for the specific record you provide.
 * It filters on the backend by table_name and record_id.
 * 
 * @param tableName - The name of the table (e.g., 'application_master', 'department_master')
 * @param recordId - The SPECIFIC ID of the record you want logs for
 * @returns Promise with filtered activity logs for ONLY that record
 * 
 * @example
 * ```typescript
 * // Get activity logs for application with ID 123
 * const logs = await fetchActivityLogsByRecordId('application_master', 123);
 * console.log(logs); // Only logs for record ID 123
 * ```
 */
export const fetchActivityLogsByRecordId = async (
  tableName: string,
  recordId: number | string
): Promise<ActivityLog[]> => {
  try {
    const token = localStorage.getItem("token");
    
    if (!token) {
      throw new Error("No authentication token found");
    }

    console.log(`📋 Fetching activity logs for ${tableName} with record ID: ${recordId}`);

    // Call the specific endpoint for a single record
    const response = await fetch(
      `${API_BASE}/api/activity-logs/${tableName}/${recordId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch activity logs: ${response.statusText}`);
    }

    const logs: ActivityLog[] = await response.json();
    
    console.log(`✅ Found ${logs.length} activity logs for record ID ${recordId}`);
    
    return logs;
  } catch (error) {
    console.error("❌ Error fetching activity logs:", error);
    throw error;
  }
};

/**
 * Fetch activity logs for a specific table and THEN filter by record ID (client-side)
 * 
 * Use this if you want to fetch all logs for a table first, then filter.
 * For better performance, use fetchActivityLogsByRecordId instead.
 * 
 * @param tableName - The name of the table
 * @param recordId - The ID of the record to filter for
 * @returns Promise with filtered activity logs
 */
export const fetchActivityLogs = async (
  tableName: string,
  recordId: number | string
): Promise<ActivityLog[]> => {
  try {
    const token = localStorage.getItem("token");
    
    if (!token) {
      throw new Error("No authentication token found");
    }

    // Fetch all activity logs for the table
    const response = await fetch(`${API_BASE}/api/activity-logs/${tableName}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch activity logs: ${response.statusText}`);
    }

    const allLogs: ActivityLog[] = await response.json();

    // Filter logs for the specific record (client-side filtering)
    const filteredLogs = allLogs.filter((log) => {
      // Direct match on table_name and record_id
      if (
        log.table_name === tableName &&
        String(log.record_id) === String(recordId)
      ) {
        return true;
      }

      // Fallback: check details field for embedded table and record info
      if (log.details && typeof log.details === "string") {
        try {
          const details = JSON.parse(log.details);
          return (
            details.tableName === tableName &&
            String(details.recordId) === String(recordId)
          );
        } catch (err) {
          // Check as plain string
          return (
            log.details.includes(`"tableName":"${tableName}"`) &&
            log.details.includes(`"recordId":"${recordId}"`)
          );
        }
      }

      return false;
    });

    console.log(`✅ Filtered ${filteredLogs.length} logs for record ID ${recordId} from ${allLogs.length} total logs`);

    return filteredLogs;
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    throw error;
  }
};

/**
 * Fetch all activity logs for a specific table (without filtering by record)
 * Useful for displaying all logs in a table view
 * 
 * @param tableName - The name of the table
 * @returns Promise with all activity logs for the table
 */
export const fetchAllActivityLogsForTable = async (
  tableName: string
): Promise<ActivityLog[]> => {
  try {
    const token = localStorage.getItem("token");
    
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${API_BASE}/api/activity-logs/${tableName}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch activity logs: ${response.statusText}`);
    }

    const logs: ActivityLog[] = await response.json();
    return logs;
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    throw error;
  }
};

/**
 * Parse and normalize activity log data
 * Handles different formats of old_value and new_value
 * 
 * @param log - Raw activity log object
 * @returns Normalized activity log object
 */
export const normalizeActivityLog = (log: ActivityLog): ActivityLog => {
  const normalized = { ...log };

  // Parse old_value if it's a string
  if (normalized.old_value && typeof normalized.old_value === "string") {
    try {
      normalized.old_value = JSON.parse(normalized.old_value);
    } catch (err) {
      // Keep as string if parsing fails
    }
  }

  // Parse new_value if it's a string
  if (normalized.new_value && typeof normalized.new_value === "string") {
    try {
      normalized.new_value = JSON.parse(normalized.new_value);
    } catch (err) {
      // Keep as string if parsing fails
    }
  }

  // Ensure we use consistent field names
  normalized.oldValue = normalized.oldValue || normalized.old_value;
  normalized.newValue = normalized.newValue || normalized.new_value;
  normalized.dateTime = normalized.dateTime || normalized.date_time_ist;
  normalized.approvalStatus = normalized.approvalStatus || normalized.approval_status;

  return normalized;
};

/**
 * Get the latest activity log for a specific record
 * Useful for showing the most recent change
 * 
 * @param tableName - The name of the table
 * @param recordId - The ID of the record
 * @returns Promise with the most recent activity log or null
 */
export const getLatestActivityLog = async (
  tableName: string,
  recordId: number | string
): Promise<ActivityLog | null> => {
  try {
    const logs = await fetchActivityLogsByRecordId(tableName, recordId);
    
    if (logs.length === 0) {
      return null;
    }

    // Sort by date (most recent first)
    const sortedLogs = logs.sort((a, b) => {
      const dateA = new Date(a.dateTime || a.date_time_ist || 0).getTime();
      const dateB = new Date(b.dateTime || b.date_time_ist || 0).getTime();
      return dateB - dateA;
    });

    return sortedLogs[0];
  } catch (error) {
    console.error("Error fetching latest activity log:", error);
    return null;
  }
};

/**
 * Get activity logs count for a specific record
 * Useful for displaying badge counts
 * 
 * @param tableName - The name of the table
 * @param recordId - The ID of the record
 * @returns Promise with count of activity logs
 */
export const getActivityLogCount = async (
  tableName: string,
  recordId: number | string
): Promise<number> => {
  try {
    const logs = await fetchActivityLogsByRecordId(tableName, recordId);
    return logs.length;
  } catch (error) {
    console.error("Error fetching activity log count:", error);
    return 0;
  }
};