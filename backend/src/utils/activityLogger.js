const pool = require("../config/db");
const crypto = require("crypto");

// In-memory cache: track recently-logged actions to prevent duplicates
// Key: "userId|module|table|record|action"
// Value: timestamp of last log
const _requestInFlight = new Map();
const DEDUP_WINDOW_MS = 2000; // 2 seconds - if same action logged again, skip it
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
  // Normalize undefined to null for consistency
  if (oldObj === undefined) oldObj = null;
  if (newObj === undefined) newObj = null;

  const diff = {};

  // If either side is null or primitive, return a simple from/to diff when they differ
  const isOldObj = oldObj && typeof oldObj === "object";
  const isNewObj = newObj && typeof newObj === "object";

  if (!isOldObj || !isNewObj) {
    if (oldObj !== newObj) {
      return { from: oldObj, to: newObj };
    }
    return {};
  }

  // Both are objects — collect keys from both
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    // Skip sensitive fields
    if (["password", "token", "secret"].includes(key)) continue;

    const oldVal = oldObj[key];
    const newVal = newObj[key];

    const oldIsObj = oldVal && typeof oldVal === "object";
    const newIsObj = newVal && typeof newVal === "object";

    if (oldIsObj && newIsObj) {
      const nestedDiff = diffObjects(oldVal, newVal);
      if (nestedDiff && Object.keys(nestedDiff).length > 0) {
        diff[key] = nestedDiff;
      }
    } else if (oldVal !== newVal) {
      diff[key] = { from: oldVal, to: newVal };
    }
  }
  return diff;
};

// Normalize objects for deterministic hashing: sort keys and strip volatile fields
function normalizeForHash(value) {
  const volatileKeys = new Set([
    "updated_on",
    "created_on",
    "date_time_ist",
    "transaction_id",
  ]);

  function recurse(v) {
    if (v === null || v === undefined) return null;
    if (typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(recurse);
    // object: sort keys
    const keys = Object.keys(v)
      .filter((k) => !volatileKeys.has(k))
      .sort();
    const out = {};
    for (const k of keys) {
      out[k] = recurse(v[k]);
    }
    return out;
  }

  try {
    return JSON.stringify(recurse(value));
  } catch (e) {
    return safeStringify(value);
  }
}

// helper caches & config
let _cachedColumns = null;
let _cachedAt = 0;
const COLUMN_CACHE_TTL_MS = 60 * 1000; // 1 minute

// safe stringify helper used to normalize objects for storage/comparison
function safeStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    try {
      return String(obj);
    } catch (e2) {
      return null;
    }
  }
}

async function getActivityLogColumns() {
  const now = Date.now();
  if (_cachedColumns && now - _cachedAt < COLUMN_CACHE_TTL_MS) {
    return _cachedColumns;
  }

  try {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='activity_log'`
    );
    const cols = new Set(rows.map((r) => r.column_name));
    _cachedColumns = cols;
    _cachedAt = now;
    return cols;
  } catch (e) {
    console.error("[ACTIVITY LOG INTROSPECTION ERROR]", e);
    // if introspection fails, return null so caller can decide fallback
    return null;
  }
}

const logActivity = async ({
  userId,
  module,
  tableName,
  recordId,
  action,
  oldValue = null,
  newValue = null,
  comments = "",
  reqMeta = {},
}) => {
  // Normalize action (avoid duplicates due to casing like 'UPDATE' vs 'update')
  try {
    if (action && typeof action === "string") action = action.toLowerCase();
  } catch (e) {
    /* ignore */
  }

  // ABSOLUTE DEDUP: If same user/module/table/record/action was logged within 2 seconds, SKIP
  // This is the ONLY check we need - simple and foolproof.
  try {
    const simpleKey = `${userId}|${module}|${tableName}|${recordId}|${action}`;
    const lastTime = _requestInFlight.get(simpleKey);
    const now = Date.now();

    console.log(
      `[ACTIVITY LOG] Check dedup - key=${simpleKey}, lastTime=${lastTime}, timeSince=${
        lastTime ? now - lastTime : "N/A"
      }ms`
    );

    if (lastTime && now - lastTime < 2000) {
      // Duplicate within 2 seconds - skip entirely
      console.log(
        `[ACTIVITY LOG] ✓ DUPLICATE BLOCKED (${simpleKey}) - last logged ${
          now - lastTime
        }ms ago`
      );
      return null;
    }

    // Update the timestamp for this key
    _requestInFlight.set(simpleKey, now);
    // Cleanup after 3 seconds
    setTimeout(() => _requestInFlight.delete(simpleKey), 3000);
    console.log(
      `[ACTIVITY LOG] Allowing insert - marked key in cache for dedup window`
    );
  } catch (e) {
    console.error("[ACTIVITY LOG DEDUP ERROR]", e);
  }

  // Calculate changes if both old and new values exist
  let changes = null;
  try {
    if (oldValue && newValue) {
      changes = diffObjects(oldValue, newValue);
    }

    const cols = await getActivityLogColumns();

    // Prefer canonical insert when full canonical columns are available
    const hasCanonical =
      cols &&
      cols.has("action_performed_by") &&
      cols.has("module") &&
      cols.has("table_name");

    if (hasCanonical) {
      // Debugging aid: when enabled, print call stack and payload so we can trace duplicate callers
      try {
        if (process.env.ACTIVITY_LOG_DEBUG === "true") {
          console.log("[ACTIVITY LOG DEBUG] payload:", {
            userId,
            module,
            tableName,
            recordId,
            action,
          });
          // include trimmed stack to help find the caller
          const st = new Error().stack || "";
          console.log(
            "[ACTIVITY LOG DEBUG] stack:\n",
            st.split("\n").slice(2, 8).join("\n")
          );
        }
      } catch (e) {
        // ignore debug logging failures
      }

      // Deduplication: Simple 2-second window to prevent duplicate logs
      // from same user/module/table/record/action within 2 seconds
      try {
        if (userId && module && tableName && recordId && action) {
          const simpleKey = `${userId}|${module}|${tableName}|${recordId}|${action}`;
          const lastTime = _requestInFlight.get(simpleKey);
          const now = Date.now();

          if (lastTime && now - lastTime < DEDUP_WINDOW_MS) {
            console.log(
              `[ACTIVITY LOG] DUPLICATE BLOCKED (${simpleKey}) - last logged ${
                now - lastTime
              }ms ago`
            );
            return null;
          }

          // Mark this action as just-logged
          _requestInFlight.set(simpleKey, now);
          // Auto-cleanup after 3 seconds
          setTimeout(() => _requestInFlight.delete(simpleKey), 3000);
        }
      } catch (dedupErr) {
        // Non-fatal: if dedup check fails, continue to insert normally
        console.warn(
          "[ACTIVITY LOG DEDUP ERROR]",
          dedupErr.message || dedupErr
        );
      }
      // Extra debug: print payload and stack right before insertion so we can
      // trace duplicate insert callers when ACTIVITY_LOG_DEBUG is enabled.
      try {
        if (process.env.ACTIVITY_LOG_DEBUG === "true") {
          const stInsert = new Error().stack || "";
          console.log("[ACTIVITY LOG DEBUG] Inserting activity log payload:", {
            userId,
            module,
            tableName,
            recordId,
            action,
            oldValue: oldValue ? safeStringify(oldValue) : null,
            newValue: newValue ? safeStringify(newValue) : null,
            comments,
            reqMeta,
            time: new Date().toISOString(),
          });
          console.log(
            "[ACTIVITY LOG DEBUG] stack at insert:\n",
            stInsert.split("\n").slice(2, 10).join("\n")
          );
        }
      } catch (debugErr) {
        /* ignore debug logging failures */
      }

      console.log(
        `[ACTIVITY LOG] Inserting canonical record - action=${action}, user=${userId}, module=${module}, table=${tableName}, record=${recordId}`
      );

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
        reqMeta.userAgent || null,
      ];

      const result = await pool.query(query, values);
      const insertedId = result.rows[0].id;
      return insertedId;
    }

    // If canonical not available, try to build an insert using whichever known
    // columns exist (legacy shapes). This avoids hard failing when columns like
    // 'module' or 'details' are missing in older DBs.
    if (cols) {
      // Known columns we can include if present
      const possible = {
        user_id: userId,
        action: action,
        details: safeStringify({
          module,
          tableName,
          recordId: recordId?.toString(),
          action,
          old_value: oldValue || null,
          new_value: newValue || null,
          changes: changes || null,
          comments,
        }),
        ip_address: reqMeta.ip || null,
        user_agent: reqMeta.userAgent || null,
        date_time_ist: null, // will use NOW() in query if column exists
      };

      // Build insert columns and values only for columns that exist
      const insertCols = [];
      const insertParams = [];
      const values = [];
      let paramIndex = 1;

      for (const key of [
        "user_id",
        "action",
        "details",
        "ip_address",
        "user_agent",
      ]) {
        if (cols.has(key)) {
          insertCols.push(key);
          insertParams.push(`$${paramIndex++}`);
          values.push(possible[key]);
        }
      }

      // If activity_log has date_time_ist column, append it as NOW()
      let appendNow = false;
      if (cols.has("date_time_ist")) {
        appendNow = true;
      }

      if (insertCols.length > 0) {
        console.log(
          `[ACTIVITY LOG] Inserting via fallback path 1 - columns=${insertCols.join(
            ","
          )}, user=${userId}`
        );
        const query = `INSERT INTO activity_log (${insertCols.join(
          ","
        )}) VALUES (${insertParams.join(",")}${
          appendNow ? ", NOW()" : ""
        }) RETURNING id`;
        const result = await pool.query(query, values);
        return result.rows[0].id;
      }
    }

    // As a last resort, try the previous fallback that uses 'details' column
    try {
      console.log(
        `[ACTIVITY LOG] Inserting via fallback path 2 (details column) - action=${action}, user=${userId}`
      );

      const fallbackQuery = `
        INSERT INTO activity_log (
          user_id,
          action,
          details,
          ip_address,
          user_agent,
          date_time_ist
        ) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id
      `;

      const detailsObj = {
        module,
        tableName,
        recordId: recordId?.toString(),
        action,
        old_value: oldValue || null,
        new_value: newValue || null,
        changes: changes || null,
        comments,
      };

      const fallbackValues = [
        userId,
        action,
        safeStringify(detailsObj),
        reqMeta.ip || null,
        reqMeta.userAgent || null,
      ];

      const fallbackResult = await pool.query(fallbackQuery, fallbackValues);
      return fallbackResult.rows[0].id;
    } catch (fallbackErr) {
      console.error("[ACTIVITY LOG FALLBACK ERROR]", fallbackErr);
      return null;
    }
  } catch (error) {
    console.error("[ACTIVITY LOG ERROR]", error);
    // Do not throw to avoid breaking main flows
    return null;
  }
};

module.exports = {
  logActivity,
  diffObjects, // Exported for testing
  safeStringify, // Exported for testing
};
