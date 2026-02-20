// activityLogger.js
// Enhanced Activity Logger — full Audit Trail support
// Covers: Login/Logout, CRUD, Task/Request, Approval workflow

const pool = require("../config/db");

/* ─────────────────────────────────────────────────────────────────────────────
 * Config
 * ───────────────────────────────────────────────────────────────────────────── */
const _requestInFlight = new Map();
const DEDUP_WINDOW_MS  = 2000;
const DEBUG            = process.env.ACTIVITY_LOG_DEBUG === "true";

/* ─────────────────────────────────────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────────────────────────────────────── */
const ACTION = {
  LOGIN:         "login",
  LOGOUT:        "logout",
  LOGIN_FAILED:  "login_failed",
  TOKEN_REFRESH: "token_refresh",
  CREATE:        "create",
  UPDATE:        "update",
  DELETE:        "delete",
  VIEW:          "view",
  SUBMIT:        "submit_for_approval",
  APPROVE:       "approve",
  REJECT:        "reject",
  TASK_OPEN:     "task_open",
  TASK_CLOSE:    "task_closure",
  TASK_REQUEST:  "task_request",
  USER_REQUEST:  "user_request",
};

const MODULE = {
  AUTH:              "auth",
  USER:              "user_master",
  VENDOR:            "vendor_information",
  PLANT:             "plant_master",
  ROLE:              "role_master",
  TASK_CLOSE:        "task_clouser",
  TASK_CLOSE_BIN:    "task_clouser_bin",
  DEPARTMENT:        "department_master",
  MASTER_APPROVAL:   "master_approval",
  APPROVAL_WORKFLOW: "approval_workflow",
  SYSTEM:            "system",
  SERVER:            "server",
  NETWORK:           "network",
  USER_REQUEST:      "user_request",
  APPLICATION:       "application",
};

/* ─────────────────────────────────────────────────────────────────────────────
 * Utility helpers
 * ───────────────────────────────────────────────────────────────────────────── */
function safeStringify(obj) {
  try { return JSON.stringify(obj); }
  catch { try { return String(obj); } catch { return null; } }
}

function sanitizeObject(obj, opts = {}) {
  if (!obj || typeof obj !== "object") return obj;
  const sensitive = new Set(
    (opts.extra || []).concat([
      "password", "pass", "pwd", "token", "secret", "authorization",
      "auth", "apiKey", "api_key", "ssn", "creditcard", "card_number",
      "refresh_token", "access_token",
    ])
  );
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const lk = k.toLowerCase();
    if (
      sensitive.has(k) || sensitive.has(lk) ||
      lk.includes("password") || lk.includes("token") ||
      lk.includes("secret")   || lk.includes("card")
    ) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = obj[k] && typeof obj[k] === "object"
        ? sanitizeObject(obj[k], opts)
        : obj[k];
    }
  }
  return out;
}

function diffObjects(oldObj, newObj) {
  if (!oldObj || typeof oldObj !== "object" || !newObj || typeof newObj !== "object")
    return oldObj !== newObj ? { from: oldObj, to: newObj } : {};
  const diff    = {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  for (const key of allKeys) {
    if (["password", "token", "secret"].includes(key)) continue;
    const oldVal = oldObj[key], newVal = newObj[key];
    if (oldVal && typeof oldVal === "object" && newVal && typeof newVal === "object") {
      const nested = diffObjects(oldVal, newVal);
      if (Object.keys(nested).length > 0) diff[key] = nested;
    } else if (oldVal !== newVal) {
      diff[key] = { from: oldVal, to: newVal };
    }
  }
  return diff;
}

function parseUserAgent(ua) {
  if (!ua || typeof ua !== "string") return { browser: null, os: null };
  let browser = "Unknown", osName = "Unknown";
  if (/chrome\/\d+/i.test(ua)   && !/edg\//i.test(ua))       browser = "Chrome";
  if (/edg\//i.test(ua))                                       browser = "Edge";
  if (/firefox\/\d+/i.test(ua))                                browser = "Firefox";
  if (/safari\/\d+/i.test(ua)   && !/chrome\/\d+/i.test(ua)) browser = "Safari";
  if (/opr\/|opera\//i.test(ua))                               browser = "Opera";
  if      (/windows nt 10/i.test(ua))    osName = "Windows 10";
  else if (/windows nt 6\./i.test(ua))   osName = "Windows";
  else if (/android/i.test(ua))          osName = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) osName = "iOS";
  else if (/mac os x/i.test(ua))         osName = "macOS";
  else if (/linux/i.test(ua))            osName = "Linux";
  return { browser, os: osName };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Dedup
 * ───────────────────────────────────────────────────────────────────────────── */
function buildDedupKey({ userId, module, tableName, recordId, action, reqMeta = {} }) {
  return [
    userId   ?? reqMeta.userId   ?? "anonymous",
    module   ?? "unknown",
    tableName ?? reqMeta.tableName ?? "unknown",
    recordId == null ? "null" : String(recordId),
    action   ?? "unknown",
  ].join("|");
}

function isDuplicateAndMark(key) {
  try {
    const now = Date.now(), last = _requestInFlight.get(key);
    if (last && now - last < DEDUP_WINDOW_MS) {
      if (DEBUG) console.log(`[DEBUG] Duplicate detected: ${key}`);
      return true;
    }
    _requestInFlight.set(key, now);
    setTimeout(() => _requestInFlight.delete(key), DEDUP_WINDOW_MS + 500);
    return false;
  } catch (e) { console.warn("[ACTIVITY LOG DEDUP ERROR]", e); return false; }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * buildEnrichedMeta
 *
 * Field priority for EVERY field:
 *   1. reqMeta snapshot value   ← pre-captured before req can become null
 *   2. Live req header / property
 *   3. null
 *
 * This is critical for the approval path where req is null inside closures.
 * masterApprovalHelper snapshots all headers eagerly and passes them as
 * reqMeta fields, so they survive even when req = null.
 * ───────────────────────────────────────────────────────────────────────────── */
function buildEnrichedMeta(reqMeta = {}) {
  const req = reqMeta.req;

  // IP — proxy-aware
  const forwardedFor = (req?.headers?.["x-forwarded-for"] || "").split(",").shift()?.trim() || null;
  const ip           = reqMeta.ip ?? forwardedFor ?? req?.connection?.remoteAddress ?? null;

  // User-Agent
  const ua       = reqMeta.userAgent ?? req?.get?.("User-Agent") ?? null;
  const uaParsed = parseUserAgent(ua);

  // Geolocation — snapshot wins, then x-lat/x-lng headers (NOT body)
  const latitude  = reqMeta.latitude  != null
    ? reqMeta.latitude
    : (req?.headers?.["x-lat"] != null ? Number(req.headers["x-lat"]) : null);
  const longitude = reqMeta.longitude != null
    ? reqMeta.longitude
    : (req?.headers?.["x-lng"] != null ? Number(req.headers["x-lng"]) : null);

  // Subscription — snapshot wins, then x-subscription header, then req.user
  const subscription = reqMeta.subscription
    ?? req?.headers?.["x-subscription"]
    ?? req?.user?.subscription
    ?? null;

  return {
    ip_address:    ip,
    server_ip:     reqMeta.server_ip ?? process.env.SERVER_IP ?? null,
    user_agent:    ua,
    browser:       uaParsed.browser,
    os:            uaParsed.os,
    device_id:     reqMeta.device_id     ?? req?.headers?.["x-device-id"]     ?? null,
    device_type:   reqMeta.device_type   ?? req?.headers?.["x-device-type"]   ?? null,
    mac_address:   reqMeta.mac_address   ?? req?.headers?.["x-mac-address"]   ?? null,
    computer_name: reqMeta.computer_name ?? req?.headers?.["x-computer-name"] ?? null,
    latitude,
    longitude,
    location:      reqMeta.location   ?? req?.headers?.["x-location"]    ?? null,
    app_version:   reqMeta.app_version ?? req?.headers?.["x-app-version"] ?? null,
    source:        reqMeta.source      ?? req?.headers?.["x-source"]      ?? "web",
    subscription,
    plant_id:      reqMeta.plant_id ?? req?.user?.plant_id ?? null,
    transaction_id:reqMeta.transaction_id ?? req?.headers?.["x-transaction-id"] ?? null,
    referrer:      req?.headers?.["referer"] ?? req?.headers?.["referrer"] ?? null,
    endpoint:      req ? `${req.method} ${req.originalUrl}` : null,
    timestamp:     new Date().toISOString(),
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Core logActivity
 * ───────────────────────────────────────────────────────────────────────────── */
async function logActivity({
  userId,
  performedByRole      = null,
  module,
  module_id            = null,
  tableName,
  recordId,
  action,
  actionType           = null,
  oldValue             = null,
  newValue             = null,
  comments             = "",
  approveStatus        = null,
  approvedBy           = null,
  requestTransactionId = null,
  reqMeta              = {},
  options              = {},
}) {
  action = typeof action === "string" ? action.toLowerCase() : action;

  const dedupKey = buildDedupKey({ userId, module, tableName, recordId, action, reqMeta });
  if (isDuplicateAndMark(dedupKey)) return null;
  if (process.env.ACTIVITY_LOG_DRY_RUN === "true") return null;

  const sanitizeExtras = Array.isArray(options.sanitizeExtraKeys) ? options.sanitizeExtraKeys : [];
  const safeOld        = oldValue ? sanitizeObject(oldValue, { extra: sanitizeExtras }) : null;
  const safeNew        = newValue ? sanitizeObject(newValue, { extra: sanitizeExtras }) : null;
  const changes        = safeOld && safeNew ? diffObjects(safeOld, safeNew) : null;

  const meta              = buildEnrichedMeta(reqMeta);
  const performed_by      = userId ?? reqMeta.userId ?? null;
  const performed_by_role = performedByRole ?? reqMeta.role ?? null;

  if (DEBUG) {
    console.log("[DEBUG] logActivity:", { dedupKey, action, module, tableName, performed_by, meta });
  }

  // Full JSONB blob — complete audit record
  const details = safeStringify({
    user_id:                performed_by,
    performed_by_role,
    module,
    tableName,
    recordId,
    action,
    action_type:            actionType,
    old_value:              safeOld,
    new_value:              safeNew,
    changes,
    approve_status:         approveStatus,
    approved_by:            approvedBy,
    request_transaction_id: requestTransactionId,
    comments,
    ...meta,
  });

  const insertData = {
    transaction_id:          meta.transaction_id,
    user_id:                 performed_by,
    plant_id:                meta.plant_id,
    module_id,
    table_name:              tableName,
    record_id:               recordId == null ? null : String(recordId),
    action:                  action ?? null,
    action_type:             actionType ?? null,
    old_value:               safeOld ? safeStringify(safeOld) : null,
    new_value:               safeNew ? safeStringify(safeNew) : null,
    changes:                 changes ? safeStringify(changes) : null,
    action_performed_by:     performed_by,
    performed_by_role,
    approve_status:          approveStatus ?? null,
    approved_by:             approvedBy    ?? null,
    request_transaction_id:  requestTransactionId ?? null,
    comments:                comments || null,
    ip_address:              meta.ip_address,
    server_ip:               meta.server_ip,
    user_agent:              meta.user_agent,
    browser:                 meta.browser,
    device:                  meta.os,
    device_id:               meta.device_id,
    device_type:             meta.device_type,
    mac_address:             meta.mac_address,
    computer_name:           meta.computer_name,
    latitude:                meta.latitude,
    longitude:               meta.longitude,
    location:                meta.location,
    app_version:             meta.app_version,
    source:                  meta.source,
    subscription:            meta.subscription,
    details,
  };
console.log("insert data",insertData);
  const cols         = Object.keys(insertData);
  const sqlValues    = [];
  const placeholders = [];
  let   paramIndex   = 1;

  for (const col of cols) {
    placeholders.push(`$${paramIndex++}`);
    sqlValues.push(insertData[col]);
  }

  const allCols         = [...cols, "date_time_ist", "created_on"];
  const allPlaceholders = [...placeholders, "NOW()", "NOW()"];

  try {
    const r = await pool.query(
      `INSERT INTO activity_log (${allCols.join(",")}) VALUES (${allPlaceholders.join(",")}) RETURNING id`,
      sqlValues
    );
    if (DEBUG) console.log(`[DEBUG] Inserted activity_log id: ${r.rows?.[0]?.id}`);
    return r.rows?.[0]?.id ?? null;
  } catch (err) {
    console.error("[ACTIVITY LOG ERROR]", err);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * logLogin
 *
 * Call after successful authentication.
 * subscription should be `${user.plant_id}+${user.location}` (e.g. "9+Mumbai, MH")
 *
 * @example
 * await logLogin({ userId: user.id, performedByRole: user.role,
 *                  subscription: `${user.plant_id}+${user.location}`, req });
 * ───────────────────────────────────────────────────────────────────────────── */
async function logLogin({ userId, performedByRole, subscription, token, req, extra = {} }) {
  // extra.requestTransactionId = loginTxnId from authController
  // This links the activity_log row back to user_login_log via request_transaction_id
  return logActivity({
    userId,
    performedByRole,
    module:    MODULE.AUTH,
    tableName: "user_master",
    recordId:  userId,
    action:    ACTION.LOGIN,
    actionType:"auth",
    comments:  "User logged in",
    // requestTransactionId links this row to user_login_log.transaction_id
    requestTransactionId: extra.requestTransactionId ?? null,
    // Never store raw token — store only a masked 8-char hint
    newValue:  { login: true, token_hint: token ? `${token.substring(0, 8)}…` : null },
    reqMeta: {
      req,
      ip:            req?.ip,
      userAgent:     req?.get?.("User-Agent"),
      subscription,
      plant_id:      req?.user?.plant_id,
      device_id:     req?.headers?.["x-device-id"],
      device_type:   req?.headers?.["x-device-type"],
      mac_address:   req?.headers?.["x-mac-address"],
      computer_name: req?.headers?.["x-computer-name"],
      latitude:      extra.latitude  ?? (req?.headers?.["x-lat"] != null ? Number(req.headers["x-lat"]) : null),
      longitude:     extra.longitude ?? (req?.headers?.["x-lng"] != null ? Number(req.headers["x-lng"]) : null),
      location:      extra.location  ?? req?.headers?.["x-location"] ?? null,
      app_version:   req?.headers?.["x-app-version"],
      source:        req?.headers?.["x-source"] ?? "web",
      server_ip:     process.env.SERVER_IP,
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * logLogout
 * ───────────────────────────────────────────────────────────────────────────── */
async function logLogout({ userId, performedByRole, subscription, req }) {
  return logActivity({
    userId,
    performedByRole,
    module:    MODULE.AUTH,
    tableName: "user_master",
    recordId:  userId,
    action:    ACTION.LOGOUT,
    actionType:"auth",
    comments:  "User logged out",
    reqMeta: {
      req,
      ip:            req?.ip,
      userAgent:     req?.get?.("User-Agent"),
      subscription,
      plant_id:      req?.user?.plant_id,
      device_id:     req?.headers?.["x-device-id"],
      mac_address:   req?.headers?.["x-mac-address"],
      computer_name: req?.headers?.["x-computer-name"],
      latitude:      req?.headers?.["x-lat"] != null ? Number(req.headers["x-lat"]) : null,
      longitude:     req?.headers?.["x-lng"] != null ? Number(req.headers["x-lng"]) : null,
      location:      req?.headers?.["x-location"] ?? null,
      app_version:   req?.headers?.["x-app-version"],
      source:        req?.headers?.["x-source"] ?? "web",
      server_ip:     process.env.SERVER_IP,
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * logCrud
 *
 * Supports TWO calling patterns:
 *
 * Pattern A — Live request (submit, direct save, reject):
 *   await logCrud({ userId, module, tableName, action, oldValue, newValue, req });
 *   → req is present, headers are read live.
 *
 * Pattern B — Approve path (req may be null inside commitLog closures):
 *   await logCrud({
 *     userId, module, tableName, action, oldValue, newValue,
 *     req:           reqMeta.req,
 *     subscription:  reqMeta.subscription,
 *     ip:            reqMeta.ip,
 *     latitude:      reqMeta.latitude,
 *     longitude:     reqMeta.longitude,
 *     location:      reqMeta.location,
 *     device_id:     reqMeta.device_id,
 *     device_type:   reqMeta.device_type,
 *     mac_address:   reqMeta.mac_address,
 *     computer_name: reqMeta.computer_name,
 *     plant_id:      reqMeta.plant_id,
 *     app_version:   reqMeta.app_version,
 *     source:        reqMeta.source,
 *     requestTransactionId: inserted.transaction_id,   // e.g. "APP0000001"
 *   });
 *   → Pre-snapshotted fields always take priority over live req reads.
 *
 * ───────────────────────────────────────────────────────────────────────────── */
async function logCrud({
  userId,
  performedByRole,
  module,
  tableName,
  recordId,
  action,
  oldValue,
  newValue,
  approveStatus,
  approvedBy,
  comments,
  // Both accepted; requestTransactionId preferred (e.g. "APP0000001" / "ROLE000018")
  transactionId,
  requestTransactionId,
  // Live req object
  req,
  // ── Pre-snapshotted fields from masterApprovalHelper reqMeta ──────────────
  // Passed explicitly so they survive when req = null on the approve path.
  // Each one wins over the equivalent live req header read.
  subscription   = null,
  ip             = null,
  latitude       = null,
  longitude      = null,
  location       = null,
  device_id      = null,
  device_type    = null,
  mac_address    = null,
  computer_name  = null,
  plant_id       = null,
  app_version    = null,
  source         = null,
}) {
  return logActivity({
    userId,
    performedByRole,
    module,
    tableName,
    recordId,
    action,
    actionType:           "crud",
    oldValue,
    newValue,
    approveStatus,
    approvedBy,
    requestTransactionId: requestTransactionId ?? transactionId ?? null,
    comments,
    reqMeta: {
      req,
      // Network — snapshot wins
      ip:            ip            ?? req?.ip                           ?? null,
      userAgent:     req?.get?.("User-Agent")                          ?? null,
      server_ip:     process.env.SERVER_IP                             ?? null,
      // Tenant — snapshot wins
      subscription:  subscription  ?? req?.user?.subscription          ?? null,
      plant_id:      plant_id      ?? req?.user?.plant_id              ?? null,
      // Device — snapshot wins
      device_id:     device_id     ?? req?.headers?.["x-device-id"]    ?? null,
      device_type:   device_type   ?? req?.headers?.["x-device-type"]  ?? null,
      mac_address:   mac_address   ?? req?.headers?.["x-mac-address"]  ?? null,
      computer_name: computer_name ?? req?.headers?.["x-computer-name"] ?? null,
      // Geolocation — snapshot wins; fallback to x-lat/x-lng headers (NOT body)
      latitude:      latitude  != null ? latitude  : (req?.headers?.["x-lat"] != null ? Number(req.headers["x-lat"]) : null),
      longitude:     longitude != null ? longitude : (req?.headers?.["x-lng"] != null ? Number(req.headers["x-lng"]) : null),
      location:      location  ?? req?.headers?.["x-location"]         ?? null,
      // App — snapshot wins
      app_version:   app_version   ?? req?.headers?.["x-app-version"]  ?? null,
      source:        source        ?? req?.headers?.["x-source"]       ?? "web",
      // Transaction
      transaction_id: req?.headers?.["x-transaction-id"]               ?? null,
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * logTaskOrRequest
 * For task open, close, user request, task request events.
 * ───────────────────────────────────────────────────────────────────────────── */
async function logTaskOrRequest({
  userId,
  performedByRole,
  module = MODULE.TASK_CLOSE,
  tableName,
  recordId,
  action,
  oldValue,
  newValue,
  approveStatus,
  approvedBy,
  requestTransactionId,
  subscription,
  req,
  comments,
}) {
  return logActivity({
    userId,
    performedByRole,
    module,
    tableName,
    recordId,
    action,
    actionType:          "task",
    oldValue,
    newValue,
    approveStatus,
    approvedBy,
    requestTransactionId,
    comments,
    reqMeta: {
      req,
      ip:            req?.ip,
      userAgent:     req?.get?.("User-Agent"),
      subscription:  subscription ?? req?.user?.subscription ?? null,
      plant_id:      req?.user?.plant_id,
      device_id:     req?.headers?.["x-device-id"],
      mac_address:   req?.headers?.["x-mac-address"],
      computer_name: req?.headers?.["x-computer-name"],
      latitude:      req?.headers?.["x-lat"] != null ? Number(req.headers["x-lat"]) : null,
      longitude:     req?.headers?.["x-lng"] != null ? Number(req.headers["x-lng"]) : null,
      location:      req?.headers?.["x-location"] ?? null,
      app_version:   req?.headers?.["x-app-version"],
      source:        req?.headers?.["x-source"] ?? "web",
      server_ip:     process.env.SERVER_IP,
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Middleware (auto-log HTTP methods)
 * ───────────────────────────────────────────────────────────────────────────── */
function activityLoggerMiddleware(opts = {}) {
  const {
    autoLogMethods    = ["POST", "PUT", "DELETE"],
    autoLogPaths      = null,
    sanitizeExtraKeys = [],
    attachToReqName   = "logActivity",
    autoLog           = true,
  } = opts;

  return function (req, res, next) {
    // Attach manual logger to req so controllers can call req.logActivity({...})
    req[attachToReqName] = async function (params = {}) {
      const final = {
        ...params,
        reqMeta: {
          ip:            req.ip,
          userAgent:     req.get?.("User-Agent"),
          req,
          userId:        req.user?.id ?? req.user?.userId,
          role:          req.user?.role ?? req.user?.roles ?? null,
          plant_id:      req.user?.plant_id,
          subscription:  req.user?.subscription,
          device_id:     req.headers?.["x-device-id"],
          mac_address:   req.headers?.["x-mac-address"],
          computer_name: req.headers?.["x-computer-name"],
          latitude:      req.headers?.["x-lat"] != null ? Number(req.headers["x-lat"]) : null,
          longitude:     req.headers?.["x-lng"] != null ? Number(req.headers["x-lng"]) : null,
          location:      req.headers?.["x-location"] ?? null,
          app_version:   req.headers?.["x-app-version"],
          source:        req.headers?.["x-source"],
          server_ip:     process.env.SERVER_IP,
          ...params.reqMeta,
        },
      };
      final.userId = final.userId ?? final.reqMeta.userId ?? null;
      return logActivity(final);
    };

    if (!autoLog || !autoLogMethods.includes(req.method)) return next();
    if (
      Array.isArray(autoLogPaths) && autoLogPaths.length > 0 &&
      !autoLogPaths.some(p => p instanceof RegExp ? p.test(req.path) : req.path.includes(p))
    ) return next();

    res.on("finish", async () => {
      try {
        await req[attachToReqName]({
          userId:          req.user?.id ?? req.user?.userId,
          performedByRole: req.user?.role ?? req.user?.roles,
          module:          req.baseUrl?.split("/").filter(Boolean).join("_") ?? "http",
          tableName:       req.path?.split("/").filter(Boolean)[0] ?? null,
          recordId:        req.params?.id ?? req.params?.recordId ?? null,
          action:          req.method.toLowerCase(),
          actionType:      "crud",
          oldValue:        req.oldResource ? sanitizeObject(req.oldResource, { extra: sanitizeExtraKeys }) : null,
          newValue:        req.body        ? sanitizeObject(req.body,        { extra: sanitizeExtraKeys }) : null,
          comments:        `HTTP ${req.method} ${req.originalUrl} → ${res.statusCode}`,
          options:         { sanitizeExtraKeys },
        });
      } catch (e) { console.warn("[ACTIVITY LOG AUTO-LOG ERROR]", e); }
    });

    return next();
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * getActivityLogs — paginated query endpoint
 * ───────────────────────────────────────────────────────────────────────────── */
async function getActivityLogs(req, res) {
  try {
    const {
      module, action, actionType, userId, role, tableName,
      q, page = 1, perPage = 25, from, to,
      sort = "date_time_ist", order = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10)    || 1);
    const limit   = Math.max(1, Math.min(200, parseInt(perPage, 10) || 25));
    const offset  = (pageNum - 1) * limit;

    const wheres = [], vals = [];
    let idx = 1;
    if (module)     { wheres.push(`module=$${idx++}`);             vals.push(module); }
    if (action)     { wheres.push(`action=$${idx++}`);             vals.push(action); }
    if (actionType) { wheres.push(`action_type=$${idx++}`);        vals.push(actionType); }
    if (userId)     { wheres.push(`(action_performed_by=$${idx} OR user_id=$${idx})`); idx++; vals.push(userId); }
    if (role)       { wheres.push(`performed_by_role=$${idx++}`);  vals.push(role); }
    if (tableName)  { wheres.push(`table_name=$${idx++}`);         vals.push(tableName); }
    if (from)       { wheres.push(`date_time_ist >= $${idx++}`);   vals.push(from); }
    if (to)         { wheres.push(`date_time_ist <= $${idx++}`);   vals.push(to); }
    if (q)          { wheres.push(`(COALESCE(details::text,'') ILIKE $${idx++})`); vals.push(`%${q}%`); }

    const whereSql  = wheres.length ? `WHERE ${wheres.join(" AND ")}` : "";
    const countRes  = await pool.query(`SELECT COUNT(*)::int AS total FROM activity_log ${whereSql}`, vals);
    const total     = countRes.rows?.[0]?.total ?? 0;

    const allowedSort = ["date_time_ist", "created_on", "id"];
    const sortCol     = allowedSort.includes(sort) ? sort : "date_time_ist";
    const ord         = order?.toLowerCase() === "asc" ? "ASC" : "DESC";

    vals.push(limit, offset);
    const dataRes = await pool.query(
      `SELECT * FROM activity_log ${whereSql} ORDER BY ${sortCol} ${ord} LIMIT $${idx++} OFFSET $${idx++}`,
      vals
    );

    return res.json({
      meta: { total, page: pageNum, perPage: limit, pages: Math.ceil(total / limit) },
      data: dataRes.rows,
    });
  } catch (err) {
    console.error("[ACTIVITY LOG LIST ERROR]", err);
    return res.status(500).json({ error: "Failed to fetch activity logs" });
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Exports
 * ───────────────────────────────────────────────────────────────────────────── */
module.exports = {
  logActivity,
  logLogin,
  logLogout,
  logCrud,
  logTaskOrRequest,
  activityLoggerMiddleware,
  getActivityLogs,
  diffObjects,
  safeStringify,
  sanitizeObject,
  buildEnrichedMeta,
  ACTION,
  MODULE,
};