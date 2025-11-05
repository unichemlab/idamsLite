const pool = require("../config/db");

/**
 * @typedef {Object} ActivityLogEntry
 * @property {number} userId - The ID of the user performing the action
 * @property {string} module - The module/section where the action occurred (e.g., 'roles', 'users', 'workflow')
 * @property {string} tableName - The database table being modified
 * @property {string|number} recordId - The ID of the record being modified
 * @property {string} action - The type of action (e.g., 'create', 'update', 'delete', 'approve')
 * @property {Object|null} oldValue - The previous state of the record (for updates)
 * @property {Object|null} newValue - The new state of the record
 * @property {string} comments - Additional context about the action
 * @property {Object} reqMeta - Request metadata (IP, user agent, etc)
 */

/**
 * Create a deep diff between two objects
 * @param {Object} oldObj - Original object
 * @param {Object} newObj - Modified object
 * @returns {Object} Object containing only changed fields
 */
const diffObjects = (oldObj, newObj) => {
  const diff = {};
  
  if (oldObj === null || newObj === null) {
    return newObj === null ? oldObj : newObj;
  }

  // Track all fields from both objects
  const allKeys = new Set([
    ...Object.keys(oldObj || {}),
    ...Object.keys(newObj || {})
  ]);

  for (const key of allKeys) {
    // Skip certain fields we don't want to log
    if (['password', 'token', 'secret'].includes(key)) {
      continue;
    }

    const oldVal = oldObj?.[key];
    const newVal = newObj?.[key];

    if (typeof oldVal === 'object' && typeof newVal === 'object') {
      const nestedDiff = diffObjects(oldVal, newVal);
      if (Object.keys(nestedDiff).length > 0) {
        diff[key] = nestedDiff;
      }
    } else if (oldVal !== newVal) {
      diff[key] = {
        from: oldVal,
        to: newVal
      };
    }
  }

  return diff;
};

/**
 * Safely stringify and truncate objects for logging
 * @param {Object} obj - Object to stringify
 * @param {number} maxLength - Maximum length for the string
 * @returns {string} Truncated JSON string
 */
const safeStringify = (obj, maxLength = 4000) => {
  try {
    const str = JSON.stringify(obj);
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  } catch (e) {
    return '[Unstringifiable Object]';
  }
};

/**
 * Log an activity in the activity_log table
 */
const logActivity = async ({
  userId,
  module,
  tableName,
  recordId,
  action,
  oldValue = null,
  newValue = null,
  comments = '',
  reqMeta = {}
}) => {
  try {
    // Calculate changes if both old and new values exist
    let changes = null;
    if (oldValue && newValue) {
      changes = diffObjects(oldValue, newValue);
    }

    // Prepare values for insertion
    const query = `
      INSERT INTO activity_log (
        action_performed_by,
        module,
        table_name,
        record_id,
        action,
        old_value,
        new_value,
        changes,
        comments,
        ip_address,
        user_agent,
        date_time_ist
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING id
    `;

    const values = [
      userId,
      module,
      tableName,
      recordId?.toString(),
      action,
      oldValue ? safeStringify(oldValue) : null,
      newValue ? safeStringify(newValue) : null,
      changes ? safeStringify(changes) : null,
      comments,
      reqMeta.ip || null,
      reqMeta.userAgent || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    console.error('[ACTIVITY LOG ERROR]', error);
    // Don't throw - logging should not break the main flow
    return null;
  }
};

module.exports = {
  logActivity,
  diffObjects, // Exported for testing
  safeStringify // Exported for testing
};