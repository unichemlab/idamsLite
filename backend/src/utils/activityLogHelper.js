// backend/utils/activityLogHelper.js

const db = require("../config/db");

/**
 * Check if user is super admin
 */
const isSuperAdmin = (user) => {
  if (!user) return false;
  
  // Check role_id directly
  if (user.role_id === 1) return true;
  if (Array.isArray(user.role_id) && user.role_id.includes(1)) return true;
  
  // Check roles array
  if (Array.isArray(user.roles) && user.roles.includes(1)) return true;
  if (user.roles === 1) return true;
  
  return false;
};

/**
 * Safe plant access check - returns true for invalid/missing plant IDs
 */
const safeCanAccessPlant = (user, plantId, canAccessPlantFn) => {
  // Super admin has access to everything
  if (isSuperAdmin(user)) {
    return true;
  }

  // If no plant ID, allow access (system-level logs)
  if (!plantId || plantId === null || plantId === undefined) {
    return true;
  }

  try {
    // Convert to number and validate
    const numericPlantId = Number(plantId);
    
    // If invalid number, allow access (don't block system logs)
    if (isNaN(numericPlantId) || numericPlantId <= 0) {
      return true;
    }
    
    // Check actual plant access
    return canAccessPlantFn(user, numericPlantId);
  } catch (error) {
    console.error('Error in safeCanAccessPlant:', error);
    // On error, allow access to prevent blocking valid logs
    return true;
  }
};

/**
 * Extract plant ID from activity log record
 */
const extractPlantIdFromLog = (log) => {
  let plantId = null;
  
  // Try old_value
  if (log.old_value) {
    try {
      const oldVal = typeof log.old_value === 'string' 
        ? JSON.parse(log.old_value) 
        : log.old_value;
      plantId = oldVal?.plant_location_id || oldVal?.plant_id || oldVal?.plantId;
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // Try new_value if not found
  if (!plantId && log.new_value) {
    try {
      const newVal = typeof log.new_value === 'string' 
        ? JSON.parse(log.new_value) 
        : log.new_value;
      plantId = newVal?.plant_location_id || newVal?.plant_id || newVal?.plantId;
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  return plantId;
};

/**
 * Parse and enrich activity log details
 */
const enrichLogData = (log) => {
  if (log.details) {
    try {
      const parsed = JSON.parse(log.details);
      log.table_name = log.table_name || parsed.tableName || log.table_name;
      log.old_value = log.old_value || (parsed.old_value ? JSON.stringify(parsed.old_value) : null);
      log.new_value = log.new_value || (parsed.new_value ? JSON.stringify(parsed.new_value) : null);
      log.action = log.action || parsed.action || log.action;
      log.action_performed_by = log.action_performed_by || log.user_id || parsed.userId || null;
    } catch (e) {
      // Ignore parse errors
    }
  }
  return log;
};

/**
 * Filter activity logs based on user permissions
 */
const filterLogsByPermission = (logs, user, canAccessPlantFn) => {
  // Super admin sees all logs
  if (isSuperAdmin(user)) {
    return logs;
  }

  return logs.filter(log => {
    const plantId = extractPlantIdFromLog(log);
    return safeCanAccessPlant(user, plantId, canAccessPlantFn);
  });
};

/**
 * Get activity logs for a specific table
 * @param {string} tableName - Name of the table (e.g., 'application_master')
 * @param {object} user - User object with permissions
 * @param {function} canAccessPlantFn - Function to check plant access
 * @returns {Promise<Array>} - Array of activity logs
 */
exports.getActivityLogsByTable = async (tableName, user, canAccessPlantFn) => {
  try {
    const { rows: rawRows } = await db.query(
      `SELECT * FROM activity_log
       WHERE table_name = $1
          OR (details IS NOT NULL AND details LIKE $2)
       ORDER BY COALESCE(date_time_ist, NOW()) DESC`,
      [tableName, `%"tableName":"${tableName}"%`]
    );

    // Enrich log data
    const enrichedRows = rawRows.map(enrichLogData);

    // Filter by permissions
    return filterLogsByPermission(enrichedRows, user, canAccessPlantFn);
  } catch (error) {
    console.error('Error fetching activity logs by table:', error);
    throw error;
  }
};

/**
 * Get activity logs for a specific record ID
 * @param {string} tableName - Name of the table (e.g., 'application_master')
 * @param {number} recordId - ID of the specific record
 * @param {object} user - User object with permissions
 * @param {function} canAccessPlantFn - Function to check plant access
 * @returns {Promise<Array>} - Array of activity logs for the record
 */
exports.getActivityLogsByRecordId = async (tableName, recordId, user, canAccessPlantFn) => {
  try {
    // First, verify the record exists and user has access to it
    const recordQuery = await db.query(
      `SELECT * FROM ${tableName} WHERE id = $1`,
      [recordId]
    );

    if (recordQuery.rows.length === 0) {
      throw new Error('Record not found');
    }

    const record = recordQuery.rows[0];
    const plantId = record.plant_location_id || record.plant_id || record.plantId;

    // Check if user has access to this plant (unless super admin)
    if (!isSuperAdmin(user) && plantId) {
      if (!safeCanAccessPlant(user, plantId, canAccessPlantFn)) {
        throw new Error('You do not have permission to view activity logs for this record');
      }
    }

    // Query activity logs for this specific record
    const { rows: rawRows } = await db.query(
      `SELECT * FROM activity_log
       WHERE table_name = $1 
       AND record_id = $2
       ORDER BY COALESCE(date_time_ist, NOW()) DESC`,
      [tableName, recordId]
    );

    // Also check for logs in details JSON field
    const { rows: detailRows } = await db.query(
      `SELECT * FROM activity_log
       WHERE details IS NOT NULL 
       AND details LIKE $1
       AND details LIKE $2
       ORDER BY COALESCE(date_time_ist, NOW()) DESC`,
      [`%"tableName":"${tableName}"%`, `%"recordId":${recordId}%`]
    );

    // Combine and deduplicate
    const allRows = [...rawRows];
    detailRows.forEach(row => {
      if (!allRows.find(r => r.id === row.id)) {
        allRows.push(row);
      }
    });

    // Sort by date
    allRows.sort((a, b) => {
      const dateA = a.date_time_ist || new Date();
      const dateB = b.date_time_ist || new Date();
      return new Date(dateB) - new Date(dateA);
    });

    // Enrich log data
    return allRows.map(enrichLogData);
  } catch (error) {
    console.error('Error fetching activity logs by record ID:', error);
    throw error;
  }
};

/**
 * Get activity logs for multiple record IDs
 * @param {string} tableName - Name of the table
 * @param {Array<number>} recordIds - Array of record IDs
 * @param {object} user - User object with permissions
 * @param {function} canAccessPlantFn - Function to check plant access
 * @returns {Promise<Object>} - Object mapping record IDs to their logs
 */
exports.getActivityLogsByRecordIds = async (tableName, recordIds, user, canAccessPlantFn) => {
  try {
    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return {};
    }

    // Get all logs for these records
    const placeholders = recordIds.map((_, i) => `$${i + 2}`).join(',');
    const { rows: rawRows } = await db.query(
      `SELECT * FROM activity_log
       WHERE table_name = $1 
       AND record_id IN (${placeholders})
       ORDER BY COALESCE(date_time_ist, NOW()) DESC`,
      [tableName, ...recordIds]
    );

    // Enrich log data
    const enrichedRows = rawRows.map(enrichLogData);

    // Filter by permissions
    const filteredRows = filterLogsByPermission(enrichedRows, user, canAccessPlantFn);

    // Group by record ID
    const logsByRecordId = {};
    filteredRows.forEach(log => {
      if (!logsByRecordId[log.record_id]) {
        logsByRecordId[log.record_id] = [];
      }
      logsByRecordId[log.record_id].push(log);
    });

    return logsByRecordId;
  } catch (error) {
    console.error('Error fetching activity logs by record IDs:', error);
    throw error;
  }
};

/**
 * Get recent activity logs (last N logs)
 * @param {string} tableName - Name of the table
 * @param {number} limit - Maximum number of logs to return
 * @param {object} user - User object with permissions
 * @param {function} canAccessPlantFn - Function to check plant access
 * @returns {Promise<Array>} - Array of recent activity logs
 */
exports.getRecentActivityLogs = async (tableName, limit = 50, user, canAccessPlantFn) => {
  try {
    const { rows: rawRows } = await db.query(
      `SELECT * FROM activity_log
       WHERE table_name = $1
       ORDER BY COALESCE(date_time_ist, NOW()) DESC
       LIMIT $2`,
      [tableName, limit]
    );

    // Enrich log data
    const enrichedRows = rawRows.map(enrichLogData);

    // Filter by permissions
    return filterLogsByPermission(enrichedRows, user, canAccessPlantFn);
  } catch (error) {
    console.error('Error fetching recent activity logs:', error);
    throw error;
  }
};

/**
 * Get activity logs by user ID
 * @param {string} tableName - Name of the table
 * @param {number} userId - ID of the user
 * @param {object} user - User object with permissions
 * @param {function} canAccessPlantFn - Function to check plant access
 * @returns {Promise<Array>} - Array of activity logs by user
 */
exports.getActivityLogsByUser = async (tableName, userId, user, canAccessPlantFn) => {
  try {
    const { rows: rawRows } = await db.query(
      `SELECT * FROM activity_log
       WHERE table_name = $1
       AND (user_id = $2 OR action_performed_by = $2)
       ORDER BY COALESCE(date_time_ist, NOW()) DESC`,
      [tableName, userId]
    );

    // Enrich log data
    const enrichedRows = rawRows.map(enrichLogData);

    // Filter by permissions
    return filterLogsByPermission(enrichedRows, user, canAccessPlantFn);
  } catch (error) {
    console.error('Error fetching activity logs by user:', error);
    throw error;
  }
};

/**
 * Get activity logs by date range
 * @param {string} tableName - Name of the table
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {object} user - User object with permissions
 * @param {function} canAccessPlantFn - Function to check plant access
 * @returns {Promise<Array>} - Array of activity logs within date range
 */
exports.getActivityLogsByDateRange = async (tableName, startDate, endDate, user, canAccessPlantFn) => {
  try {
    const { rows: rawRows } = await db.query(
      `SELECT * FROM activity_log
       WHERE table_name = $1
       AND COALESCE(date_time_ist, NOW()) BETWEEN $2 AND $3
       ORDER BY COALESCE(date_time_ist, NOW()) DESC`,
      [tableName, startDate, endDate]
    );

    // Enrich log data
    const enrichedRows = rawRows.map(enrichLogData);

    // Filter by permissions
    return filterLogsByPermission(enrichedRows, user, canAccessPlantFn);
  } catch (error) {
    console.error('Error fetching activity logs by date range:', error);
    throw error;
  }
};

/**
 * Get activity logs by action type
 * @param {string} tableName - Name of the table
 * @param {string} action - Action type (create, update, delete)
 * @param {object} user - User object with permissions
 * @param {function} canAccessPlantFn - Function to check plant access
 * @returns {Promise<Array>} - Array of activity logs by action
 */
exports.getActivityLogsByAction = async (tableName, action, user, canAccessPlantFn) => {
  try {
    const { rows: rawRows } = await db.query(
      `SELECT * FROM activity_log
       WHERE table_name = $1
       AND action = $2
       ORDER BY COALESCE(date_time_ist, NOW()) DESC`,
      [tableName, action]
    );

    // Enrich log data
    const enrichedRows = rawRows.map(enrichLogData);

    // Filter by permissions
    return filterLogsByPermission(enrichedRows, user, canAccessPlantFn);
  } catch (error) {
    console.error('Error fetching activity logs by action:', error);
    throw error;
  }
};

/**
 * Search activity logs with filters
 * @param {string} tableName - Name of the table
 * @param {object} filters - Filter options
 * @param {object} user - User object with permissions
 * @param {function} canAccessPlantFn - Function to check plant access
 * @returns {Promise<Array>} - Array of filtered activity logs
 */
exports.searchActivityLogs = async (tableName, filters = {}, user, canAccessPlantFn) => {
  try {
    let query = `SELECT * FROM activity_log WHERE table_name = $1`;
    const params = [tableName];
    let paramCount = 1;

    // Add filters
    if (filters.recordId) {
      paramCount++;
      query += ` AND record_id = $${paramCount}`;
      params.push(filters.recordId);
    }

    if (filters.userId) {
      paramCount++;
      query += ` AND (user_id = $${paramCount} OR action_performed_by = $${paramCount})`;
      params.push(filters.userId);
    }

    if (filters.action) {
      paramCount++;
      query += ` AND action = $${paramCount}`;
      params.push(filters.action);
    }

    if (filters.startDate && filters.endDate) {
      paramCount++;
      query += ` AND COALESCE(date_time_ist, NOW()) BETWEEN $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
      query += ` AND $${paramCount}`;
      params.push(filters.endDate);
    }

    if (filters.searchTerm) {
      paramCount++;
      query += ` AND (comments ILIKE $${paramCount} OR details ILIKE $${paramCount})`;
      params.push(`%${filters.searchTerm}%`);
    }

    query += ` ORDER BY COALESCE(date_time_ist, NOW()) DESC`;

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const { rows: rawRows } = await db.query(query, params);

    // Enrich log data
    const enrichedRows = rawRows.map(enrichLogData);

    // Filter by permissions
    return filterLogsByPermission(enrichedRows, user, canAccessPlantFn);
  } catch (error) {
    console.error('Error searching activity logs:', error);
    throw error;
  }
};

/**
 * Export helper functions for direct use
 */
module.exports = {
  getActivityLogsByTable: exports.getActivityLogsByTable,
  getActivityLogsByRecordId: exports.getActivityLogsByRecordId,
  getActivityLogsByRecordIds: exports.getActivityLogsByRecordIds,
  getRecentActivityLogs: exports.getRecentActivityLogs,
  getActivityLogsByUser: exports.getActivityLogsByUser,
  getActivityLogsByDateRange: exports.getActivityLogsByDateRange,
  getActivityLogsByAction: exports.getActivityLogsByAction,
  searchActivityLogs: exports.searchActivityLogs,
  
  // Also export utility functions
  isSuperAdmin,
  safeCanAccessPlant,
  extractPlantIdFromLog,
  enrichLogData,
  filterLogsByPermission
};