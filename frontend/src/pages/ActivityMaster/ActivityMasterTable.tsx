import React, { useEffect, useState, useMemo, useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AppHeader from "../../components/Common/AppHeader";
import { fetchActivityLog } from "../../utils/api";
import addStyle from "../Plant/PlantMasterTable.module.css";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface ActivityLog {
  id: number;
  transaction_id?: string;
  table_name?: string;
  module?: string;
  module_label?: string;
  module_id?: string | number;
  record_id?: number | string;
  action?: string;
  old_value?: string | null;
  new_value?: string | null;
  changes?: string | null;
  action_performed_by?: number | string;
  user_id?: number | string;
  action_user_name?: string;
  approve_status?: string | null;
  date_time_ist?: string;
  created_on?: string;
  comments?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  device?: string | null;
  details?: string | null;
  plant_id?: number | string;
  request_transaction_id?: string | null;
  summary?: string | null;
  // Enriched by backend JOINs
  performed_by_name?: string | null;
  performed_by_email?: string | null;
  performed_by_role?: string | null;
  performed_by_designation?: string | null;
  subject_user_name?: string | null;
  subject_user_code?: string | null;
  subject_user_email?: string | null;
  subject_department_name?: string | null;
  subject_plant_name?: string | null;
  plant_name?: string | null;
  department_name?: string | null;
  role_name?: string | null;
  application_name?: string | null;
  browser?: string | null;
  browser_version?: string | null;
  os?: string | null;
  source?: string | null;
  endpoint?: string | null;
  // Device & network details
  device_type?: string | null;
  device_id?: string | null;
  mac_address?: string | null;
  computer_name?: string | null;
  server_ip?: string | null;
  // Geo / location
  latitude?: number | string | null;
  longitude?: number | string | null;
  location?: string | null;
  geo_city?: string | null;
  geo_region?: string | null;
  geo_country?: string | null;
  geo_country_code?: string | null;
  geo_timezone?: string | null;
  geo_isp?: string | null;
  geo_org?: string | null;
  geo_public_ip?: string | null;
  // Windows / OS context
  windows_username?: string | null;
  windows_domain?: string | null;
  windows_version?: string | null;
  os_release?: string | null;
  os_platform_raw?: string | null;
  platform?: string | null;
  platform_version?: string | null;
  architecture?: string | null;
  cpu_model?: string | null;
  total_mem_mb?: number | string | null;
  free_mem_mb?: number | string | null;
  homedir?: string | null;
  // Subscription / session
  subscription?: string | null;
  action_type?: string | null;
}

interface ChangeRow { field: string; from: string; to: string; }

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
const MODULE_MAP: Record<string, string> = {
  plant_master: "Plant", application_master: "Application",
  user_master: "User", user_requests: "User Request",
  task_requests: "Task Request", vendor_master: "Vendor",
  role_master: "Role", department_master: "Department",
  approvals: "Approvals", auth: "Auth",
};

const prettify = (s: string) =>
  (s || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const resolveModule = (log: ActivityLog): string => {
  if (log.module_label) return log.module_label;
  const m = log.module || ""; const t = log.table_name || "";
  return MODULE_MAP[m] || MODULE_MAP[t] || prettify(m || t) || "—";
};

const normalizeAction = (a?: string) => (a || "").toUpperCase();

const formatDate = (d?: string): string => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
  } catch { return d; }
};

const cleanIP = (ip?: string | null) => ip ? ip.replace("::ffff:", "").replace("::1", "localhost") : "—";

const parseDevice = (device?: string | null, ua?: string | null): string => {
  if (device) {
    try {
      const d = JSON.parse(device);
      if (d.isMobile) return "Mobile";
      if (d.isTablet) return "Tablet";
      if (d.isDesktop) return "Desktop";
      return device;
    } catch { return device; }
  }
  if (ua) {
    if (/mobile/i.test(ua)) return "Mobile";
    if (/tablet/i.test(ua)) return "Tablet";
    return "Desktop";
  }
  return "—";
};

const parseBrowser = (ua?: string | null): string => {
  if (!ua) return "";
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Browser";
};

const parseOS = (ua?: string | null): string => {
  if (!ua) return "";
  if (/Windows NT 10/i.test(ua)) return "Win 10";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "";
};

const safeVal = (v: unknown): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") {
    const s = JSON.stringify(v);
    return s === "{}" || s === "[]" ? "—" : s;
  }
  return String(v);
};

// Short version for table cells
const safeShort = (v: unknown, max = 20): string => {
  const s = safeVal(v);
  return s.length > max ? s.substring(0, max) + "…" : s;
};

const resolvePerformer = (log: ActivityLog): string => {
  // Use backend-joined name first (most reliable)
  if (log.performed_by_name) return log.performed_by_name;
  // Try details JSON
  if (log.details) {
    try {
      const d = JSON.parse(log.details);
      const name = d.performed_by_name || d.action_user_name;
      if (name) return String(name);
    } catch { }
  }
  return String(log.action_user_name || log.action_performed_by || log.user_id || "—");
};

/* Build a plain-English sentence describing what happened.
   Uses backend-enriched name fields so no raw IDs are shown. */
const buildHumanSummary = (log: ActivityLog): string => {
  const who    = resolvePerformer(log);
  const action = (log.action || "").toLowerCase();
  const mod    = resolveModule(log);
  const txn    = log.request_transaction_id || "";

  // Prefer backend summary if provided
  if (log.summary) return log.summary;

  // Parse new_value for context (already enriched by backend)
  let nv: any = {};
  try { nv = log.new_value ? JSON.parse(log.new_value) : {}; } catch {}

  const target   = log.subject_user_name || nv.name || nv.employee_name || "";
  const appName  = log.application_name  || nv.application_name || nv.application_hmi_name || "";
  const roleName = log.role_name         || nv.role_name || (Array.isArray(nv.role_names) ? nv.role_names.join(", ") : "");
  const dept     = log.subject_department_name || nv.department_name || "";
  const plant    = log.plant_name        || log.subject_plant_name || nv.location_name || nv.plant_name || "";
  const reqType  = nv.access_request_type || "";
  const status   = nv.status || nv.task_status || "";

  const parts: string[] = [];

  // Core: WHO did WHAT
  const actionLabel: Record<string, string> = {
    approve: "approved", reject: "rejected", update: "updated",
    insert: "created", create: "created", delete: "deleted",
    login: "logged in", logout: "logged out", view: "viewed",
  };
  parts.push(`${who} ${actionLabel[action] || action}${mod ? " " + mod : ""}${txn ? " [" + txn + "]" : ""}`);

  // Subject
  if (target)   parts.push(`for ${target}`);
  if (reqType)  parts.push(`(${reqType})`);
  if (appName)  parts.push(`on ${appName}`);
  if (roleName) parts.push(`as ${roleName}`);
  if (dept)     parts.push(`in ${dept}`);
  if (plant)    parts.push(`@ ${plant}`);
  if (status)   parts.push(`→ Status: ${status}`);

  return parts.join(" ");
};

const SKIP_KEYS = new Set([
  "created_on", "updated_on", "last_sync", "last_seen_in_ad",
  "date_time_ist", "approver1_action_timestamp", "approver2_action_timestamp",
]);

const resolveChanges = (log: ActivityLog): ChangeRow[] => {
  const action = normalizeAction(log.action);
  if (log.changes) {
    try {
      const parsed = JSON.parse(log.changes);
      return Object.keys(parsed).filter(k => !SKIP_KEYS.has(k)).map(k => ({
        field: prettify(k),
        from: safeVal(parsed[k]?.from),
        to: safeVal(parsed[k]?.to),
      }));
    } catch { }
  }
  try {
    const oldObj = log.old_value ? JSON.parse(log.old_value) : {};
    const newObj = log.new_value ? JSON.parse(log.new_value) : {};
    if (action === "UPDATE" || action === "APPROVE" || action === "REJECT") {
      return Object.keys({ ...oldObj, ...newObj })
        .filter(k => !SKIP_KEYS.has(k) && JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]))
        .map(k => ({ field: prettify(k), from: safeVal(oldObj[k]), to: safeVal(newObj[k]) }));
    }
    if (action === "DELETE") {
      return Object.keys(oldObj).filter(k => !SKIP_KEYS.has(k))
        .map(k => ({ field: prettify(k), from: safeVal(oldObj[k]), to: "Deleted" }));
    }
    if (action === "INSERT" || action === "CREATE") {
      const PRIORITY = ["transaction_id","display_name","application_hmi_name","vendor_name","role_name","department_name","employee_name","name","status"];
      const allKeys = Object.keys(newObj).filter(k => !SKIP_KEYS.has(k));
      const sorted = [...allKeys.filter(k => PRIORITY.includes(k)), ...allKeys.filter(k => !PRIORITY.includes(k))];
      return sorted.slice(0, 6).map(k => ({ field: prettify(k), from: "—", to: safeVal(newObj[k]) }));
    }
  } catch { }
  return [];
};

/* ─────────────────────────────────────────────────────────────────────────────
   SUBJECT EXTRACTOR  — parses details/new_value/old_value to show WHAT was acted on
   Based on real data structure: details has {old_value:{...}, new_value:{...}, ...}
───────────────────────────────────────────────────────────────────────────── */

// Fields to surface in "Record Acted On" panel — ordered by importance
const SUBJECT_PRIORITY: { key: string; label: string }[] = [
  // Identity
  { key: "transaction_id",        label: "Transaction ID" },
  { key: "ritm_transaction_id",   label: "RITM No." },
  { key: "task_transaction_id",   label: "Task No." },
  // Person
  { key: "employee_name",         label: "Employee Name" },
  { key: "name",                  label: "Name" },
  { key: "display_name",          label: "Display Name" },
  { key: "employee_code",         label: "Emp Code" },
  { key: "employee_id",           label: "Emp ID" },
  { key: "employee_location",     label: "Location" },
  { key: "email",                 label: "Email" },
  { key: "designation",           label: "Designation" },
  { key: "department",            label: "Department" },
  // Request specifics
  { key: "access_request_type",   label: "Access Type" },
  { key: "request_for_by",        label: "Requested For" },
  { key: "user_request_type",     label: "User Type" },
  { key: "task_action",           label: "Task Action" },
  // Vendor
  { key: "vendor_firm",           label: "Vendor Firm" },
  { key: "vendor_code",           label: "Vendor Code" },
  { key: "vendor_name",           label: "Vendor Name" },
  // Approvers
  { key: "approver1_name",        label: "Approver 1" },
  { key: "approver2_name",        label: "Approver 2" },
  { key: "reports_to",            label: "Reports To" },
  // Status
  { key: "status",                label: "Status" },
  { key: "task_status",           label: "Task Status" },
  { key: "approver1_status",      label: "Appr 1 Status" },
  { key: "approver2_status",      label: "Appr 2 Status" },
  // App/Role/Scope
  { key: "application_hmi_name",  label: "Application" },
  { key: "role_name",             label: "Role" },
  { key: "location",              label: "Plant / Location" },
];

interface SubjectField { label: string; value: string; }

const extractSubject = (log: ActivityLog): SubjectField[] => {
  // Try to get new_value or old_value from inside details JSON first (most reliable)
  const candidates: any[] = [];
  if (log.details) {
    try {
      const d = JSON.parse(log.details);
      if (d.new_value && typeof d.new_value === "object") candidates.push(d.new_value);
      if (d.old_value && typeof d.old_value === "object") candidates.push(d.old_value);
    } catch { }
  }
  // Fallback to top-level new_value / old_value
  if (log.new_value) {
    try { candidates.push(JSON.parse(log.new_value)); } catch { }
  }
  if (log.old_value) {
    try { candidates.push(JSON.parse(log.old_value)); } catch { }
  }

  const result: SubjectField[] = [];
  const seen = new Set<string>();

  for (const { key, label } of SUBJECT_PRIORITY) {
    for (const obj of candidates) {
      const val = obj?.[key];
      if (val !== null && val !== undefined && val !== "" && typeof val !== "object") {
        const sv = String(val);
        if (!seen.has(key) && sv !== "—") {
          seen.add(key);
          result.push({ label, value: sv });
          break;
        }
      }
    }
  }
  return result;
};

/* Merge top-level fields + details JSON so all fields are accessible uniformly */
const enrichLog = (log: ActivityLog): ActivityLog => {
  if (!log.details) return log;
  try {
    const d = JSON.parse(log.details);
    return {
      // details fields as fallback for anything missing at top level
      mac_address:      log.mac_address      || d.mac_address      || null,
      computer_name:    log.computer_name    || d.computer_name    || null,
      device_type:      log.device_type      || d.device_type      || null,
      latitude:         log.latitude         ?? d.latitude         ?? null,
      longitude:        log.longitude        ?? d.longitude        ?? null,
      location:         log.location         || d.location         || null,
      geo_city:         log.geo_city         || d.geo_city         || null,
      geo_region:       log.geo_region       || d.geo_region       || null,
      geo_country:      log.geo_country      || d.geo_country      || null,
      geo_country_code: log.geo_country_code || d.geo_country_code || null,
      geo_timezone:     log.geo_timezone     || d.geo_timezone     || null,
      geo_isp:          log.geo_isp          || d.geo_isp          || null,
      geo_org:          log.geo_org          || d.geo_org          || null,
      geo_public_ip:    log.geo_public_ip    || d.geo_public_ip    || null,
      windows_username: log.windows_username || d.windows_username || null,
      windows_domain:   log.windows_domain   || d.windows_domain   || null,
      windows_version:  log.windows_version  || d.windows_version  || null,
      os_release:       log.os_release       || d.os_release       || null,
      os_platform_raw:  log.os_platform_raw  || d.os_platform_raw  || null,
      platform:         log.platform         || d.platform         || null,
      platform_version: log.platform_version || d.platform_version || null,
      architecture:     log.architecture     || d.architecture     || null,
      cpu_model:        log.cpu_model        || d.cpu_model        || null,
      total_mem_mb:     log.total_mem_mb     ?? d.total_mem_mb     ?? null,
      free_mem_mb:      log.free_mem_mb      ?? d.free_mem_mb      ?? null,
      homedir:          log.homedir          || d.homedir          || null,
      server_ip:        log.server_ip        || d.server_ip        || null,
      subscription:     log.subscription     || d.subscription     || null,
      browser_version:  log.browser_version  || d.browser_version  || null,
      action_type:      log.action_type      || d.action_type      || null,
      ...log,
    };
  } catch { return log; }
};


const ACTION_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  INSERT:       { bg: "#DCFCE7", color: "#15803D", border: "#86EFAC" },
  CREATE:       { bg: "#DCFCE7", color: "#15803D", border: "#86EFAC" },
  UPDATE:       { bg: "#DBEAFE", color: "#1D4ED8", border: "#93C5FD" },
  DELETE:       { bg: "#FEE2E2", color: "#B91C1C", border: "#FCA5A5" },
  APPROVE:      { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
  REJECT:       { bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5" },
  LOGIN:        { bg: "#E0F2FE", color: "#0369A1", border: "#7DD3FC" },
  LOGOUT:       { bg: "#FEF9C3", color: "#854D0E", border: "#FDE047" },
  VIEW:         { bg: "#F1F5F9", color: "#475569", border: "#CBD5E1" },
  TASK_CLOSE:   { bg: "#FEF3C7", color: "#B45309", border: "#FCD34D" },
  TASK_OPEN:    { bg: "#E0F2FE", color: "#0369A1", border: "#7DD3FC" },
  USER_REQUEST: { bg: "#F5F3FF", color: "#6D28D9", border: "#C4B5FD" },
  TASK_REQUEST: { bg: "#FDF4FF", color: "#7E22CE", border: "#E9D5FF" },
};
const getActionStyle = (a?: string) =>
  ACTION_STYLE[normalizeAction(a)] || { bg: "#F8FAFC", color: "#64748B", border: "#CBD5E1" };

/* Human-readable label shown on the action badge */
const ACTION_LABEL: Record<string, string> = {
  LOGIN:        "🔐 Signed In",
  LOGOUT:       "🔓 Signed Out",
  INSERT:       "➕ Created",
  CREATE:       "➕ Created",
  UPDATE:       "✏️ Updated",
  DELETE:       "🗑️ Deleted",
  APPROVE:      "✅ Approved",
  REJECT:       "❌ Rejected",
  VIEW:         "👁️ Viewed",
  TASK_CLOSE:   "🔒 Task Closed",
  TASK_OPEN:    "📂 Task Opened",
  USER_REQUEST: "📝 User Request",
  TASK_REQUEST: "📋 Task Request",
};
const getActionLabel = (a?: string): string =>
  ACTION_LABEL[normalizeAction(a)] || prettify(a || "Unknown");

/* ─────────────────────────────────────────────────────────────────────────────
   PHARMA COMPLIANCE HELPERS  (21 CFR Part 11 / EU Annex 11)
───────────────────────────────────────────────────────────────────────────── */

/* 1. RISK CLASSIFICATION — every action gets a risk level */
type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
interface RiskMeta { level: RiskLevel; label: string; color: string; bg: string; border: string; icon: string; }

const RISK_MAP: Record<string, RiskMeta> = {
  DELETE:       { level:"CRITICAL", label:"Critical", color:"#991B1B", bg:"#FEF2F2", border:"#FECACA", icon:"🔴" },
  REJECT:       { level:"CRITICAL", label:"Critical", color:"#991B1B", bg:"#FEF2F2", border:"#FECACA", icon:"🔴" },
  APPROVE:      { level:"HIGH",     label:"High",     color:"#92400E", bg:"#FFFBEB", border:"#FDE68A", icon:"🟠" },
  INSERT:       { level:"HIGH",     label:"High",     color:"#92400E", bg:"#FFFBEB", border:"#FDE68A", icon:"🟠" },
  CREATE:       { level:"HIGH",     label:"High",     color:"#92400E", bg:"#FFFBEB", border:"#FDE68A", icon:"🟠" },
  UPDATE:       { level:"MEDIUM",   label:"Medium",   color:"#1D4ED8", bg:"#EFF6FF", border:"#BFDBFE", icon:"🟡" },
  USER_REQUEST: { level:"MEDIUM",   label:"Medium",   color:"#1D4ED8", bg:"#EFF6FF", border:"#BFDBFE", icon:"🟡" },
  TASK_REQUEST: { level:"MEDIUM",   label:"Medium",   color:"#1D4ED8", bg:"#EFF6FF", border:"#BFDBFE", icon:"🟡" },
  LOGIN:        { level:"LOW",      label:"Low",      color:"#065F46", bg:"#F0FDF4", border:"#BBF7D0", icon:"🟢" },
  LOGOUT:       { level:"LOW",      label:"Low",      color:"#065F46", bg:"#F0FDF4", border:"#BBF7D0", icon:"🟢" },
  VIEW:         { level:"LOW",      label:"Low",      color:"#065F46", bg:"#F0FDF4", border:"#BBF7D0", icon:"🟢" },
  TASK_CLOSE:   { level:"MEDIUM",   label:"Medium",   color:"#1D4ED8", bg:"#EFF6FF", border:"#BFDBFE", icon:"🟡" },
  TASK_OPEN:    { level:"MEDIUM",   label:"Medium",   color:"#1D4ED8", bg:"#EFF6FF", border:"#BFDBFE", icon:"🟡" },
};
const getRisk = (a?: string): RiskMeta =>
  RISK_MAP[normalizeAction(a)] || { level:"LOW", label:"Low", color:"#065F46", bg:"#F0FDF4", border:"#BBF7D0", icon:"🟢" };

/* 2. INTEGRITY HASH — lightweight client-side hash for tamper-evidence display
   NOTE: In production this MUST be a backend-generated SHA-256 chain hash.
   This client function creates a deterministic fingerprint for UI display only. */
const simpleHash = (s: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0").toUpperCase();
};
const buildIntegrityHash = (log: ActivityLog): string => {
  const payload = [
    log.id, log.transaction_id, log.action, log.user_id,
    log.date_time_ist || log.created_on, log.ip_address,
    log.old_value, log.new_value,
  ].map(v => String(v ?? "")).join("|");
  const h = simpleHash(payload);
  return `${h.slice(0,4)}-${h.slice(4,8)}`;
};

/* 3. SHARED LOGIN DETECTOR — flags where Windows username ≠ app login pattern */
const detectSharedLogin = (log: ActivityLog): boolean => {
  const el = enrichLog(log);
  if (!el.windows_username) return false;
  const performer = resolvePerformer(log).toLowerCase().replace(/\s/g, "").replace(/\./g, "");
  const winUser   = (el.windows_username || "").toLowerCase().replace(/\s/g, "").replace(/\./g, "");
  if (!performer || !winUser) return false;
  // Flag if they share no common 4-char substring — likely different users
  for (let i = 0; i <= performer.length - 4; i++) {
    if (winUser.includes(performer.slice(i, i + 4))) return false;
  }
  return true;
};

/* 4. RETENTION POLICY — pharma standard: 5 years from record date */
const RETENTION_YEARS = 5;
const getRetentionInfo = (log: ActivityLog): { expiresOn: string; daysLeft: number; isExpiringSoon: boolean } => {
  const created = new Date(log.date_time_ist || log.created_on || Date.now());
  const expires = new Date(created);
  expires.setFullYear(expires.getFullYear() + RETENTION_YEARS);
  const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 86400000);
  return {
    expiresOn: expires.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }),
    daysLeft,
    isExpiringSoon: daysLeft < 180,
  };
};

/* 5. ACTION TYPE label (System vs User) */
const getActionSource = (log: ActivityLog): string => {
  const el = enrichLog(log);
  const at = (el.action_type || log.action_type || "").toLowerCase();
  if (at === "auth") return "Auth";
  if (at === "system" || at === "auto") return "System";
  return "User";
};

const STATUS_COLOR: Record<string, string> = {
  approved: "#15803D", completed: "#15803D", rejected: "#B91C1C",
  pending: "#D97706", active: "#0369A1", inactive: "#64748B",
};
const statusColor = (s?: string | null) => STATUS_COLOR[(s || "").toLowerCase()] || "#64748B";

/* ─────────────────────────────────────────────────────────────────────────────
   LINKED TRANSACTION IDs  — collects every distinct txn / RITM / TASK id
   found in: request_transaction_id, details JSON (top-level + new_value /
   old_value), new_value JSON, old_value JSON.
   Returns array of { id, label } pairs de-duped against log.transaction_id.
───────────────────────────────────────────────────────────────────────────── */
// ── Transaction ID keys to look for in any JSON object ───────────────────────
const TXN_ID_KEYS: { key: string; label: string }[] = [
  { key: "transaction_id",              label: "TXN"  },
  { key: "ritm_transaction_id",         label: "RITM" },
  { key: "task_transaction_id",         label: "TASK" },
  { key: "request_transaction_id",      label: "REF"  },
  { key: "user_request_transaction_id", label: "RITM" },
];

interface LinkedTxn {
  id:     string;
  label:  string;   // RITM / TASK / TXN / REF
  source: string;   // "OLD VALUE" | "NEW VALUE" | "DETAILS" | "REF"
}

/** Pull all recognised txn-id fields from one JSON object */
const extractTxnIdsFromObj = (obj: any, source: string): LinkedTxn[] => {
  if (!obj || typeof obj !== "object") return [];
  return TXN_ID_KEYS
    .filter(({ key }) => obj[key] && typeof obj[key] === "string" && obj[key].trim())
    .map(({ key, label }) => ({ id: obj[key].trim(), label, source }));
};

/**
 * Collect every distinct transaction-id found in the log row:
 *   old_value  → labelled "OLD VALUE"
 *   new_value  → labelled "NEW VALUE"
 *   details.old_value / details.new_value / details top-level → labelled accordingly
 *   request_transaction_id top-level column → labelled "REF"
 *
 * The row's own ACT… id is never included.
 * Both old and new ids are returned even if they are the same string,
 * so the caller can always see BEFORE and AFTER ids.
 */
const resolveLinkedTxnIds = (log: ActivityLog): LinkedTxn[] => {
  const actId = log.transaction_id || "";   // exclude own ACT… id
  const results: LinkedTxn[] = [];
  const seen = new Set<string>();             // de-dup same id+source combos

  const push = (items: LinkedTxn[]) => {
    for (const item of items) {
      const key = `${item.source}::${item.id}`;
      if (item.id && item.id !== actId && !seen.has(key)) {
        seen.add(key);
        results.push(item);
      }
    }
  };

  // 1. Top-level request_transaction_id column
  if (log.request_transaction_id) {
    push([{ id: log.request_transaction_id, label: "REF", source: "REF" }]);
  }

  // 2. Top-level old_value / new_value columns
  try {
    if (log.old_value) push(extractTxnIdsFromObj(JSON.parse(log.old_value), "OLD VALUE"));
  } catch { /* ignore */ }
  try {
    if (log.new_value) push(extractTxnIdsFromObj(JSON.parse(log.new_value), "NEW VALUE"));
  } catch { /* ignore */ }

  // 3. details JSON — may contain its own top-level ids + nested old/new
  if (log.details) {
    try {
      const d = JSON.parse(log.details);
      push(extractTxnIdsFromObj(d,           "DETAILS"));
      push(extractTxnIdsFromObj(d.old_value, "OLD VALUE"));
      push(extractTxnIdsFromObj(d.new_value, "NEW VALUE"));
    } catch { /* ignore */ }
  }

  return results;
};

/* ─────────────────────────────────────────────────────────────────────────────
   DETAIL MODAL
───────────────────────────────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════════
   HUMAN DIFF  — builds a clean Before / After table from enriched JSON
   (Backend has already replaced numeric IDs with names, so we just display)
═══════════════════════════════════════════════════════════════════════════ */

/** Fields we never want to show in the diff table — they're noise */
const DIFF_SKIP = new Set([
  "id","created_on","updated_on","last_sync","last_seen_in_ad",
  "date_time_ist","approver1_action_timestamp","approver2_action_timestamp",
  "direct_reporting","reporting_manager","managers_manager",
  "ou_path","last_seen_in_ad","training_attachment",
]);

/** Fields whose raw IDs should have been resolved by backend */
const ID_FIELD_HINTS: Record<string,string> = {
  role_id_raw:       "Role (raw id)", department_id_raw: "Department (raw id)",
  location_id_raw:   "Location (raw id)", plant_id_raw: "Plant (raw id)",
  app_id_raw:        "Application (raw id)",
};

interface DiffRow { field: string; before: string; after: string; changed: boolean; }

const buildDiff = (log: ActivityLog): DiffRow[] => {
  // Priority 1 — pre-computed changes column (already name-resolved by backend)
  if (log.changes) {
    try {
      const c = JSON.parse(log.changes);
      return Object.keys(c)
        .filter(k => !DIFF_SKIP.has(k))
        .map(k => {
          const from = c[k]?.from; const to = c[k]?.to;
          const fStr = from == null || JSON.stringify(from) === '{}' ? '—' :
            typeof from === 'object' ? JSON.stringify(from) : String(from);
          const tStr = to   == null || JSON.stringify(to)   === '{}' ? '—' :
            typeof to   === 'object' ? JSON.stringify(to)   : String(to);
          return {
            field:   prettify(ID_FIELD_HINTS[k] || k),
            before:  fStr,
            after:   tStr,
            changed: fStr !== tStr,
          };
        });
    } catch {}
  }

  // Priority 2 — diff old vs new (both enriched by backend)
  const action = normalizeAction(log.action);
  try {
    const ov: any = log.old_value ? JSON.parse(log.old_value) : {};
    const nv: any = log.new_value ? JSON.parse(log.new_value) : {};
    const allKeys = [...new Set([...Object.keys(ov), ...Object.keys(nv)])]
      .filter(k => !DIFF_SKIP.has(k));

    if (action === 'INSERT' || action === 'CREATE') {
      const PRIO = ['transaction_id','employee_name','name','display_name',
                    'application_name','role_name','department_name','status'];
      const sorted = [...allKeys.filter(k=>PRIO.includes(k)), ...allKeys.filter(k=>!PRIO.includes(k))];
      return sorted.slice(0,14).map(k => ({
        field:   prettify(ID_FIELD_HINTS[k] || k),
        before:  '— (new record)',
        after:   nv[k] == null || JSON.stringify(nv[k]) === '{}' ? '—' :
                 typeof nv[k] === 'object' ? JSON.stringify(nv[k]) : String(nv[k]),
        changed: true,
      }));
    }

    if (action === 'DELETE') {
      return allKeys.map(k => ({
        field:   prettify(ID_FIELD_HINTS[k] || k),
        before:  ov[k] == null ? '—' : typeof ov[k] === 'object' ? JSON.stringify(ov[k]) : String(ov[k]),
        after:   '— (deleted)',
        changed: true,
      }));
    }

    // UPDATE / APPROVE / REJECT — show only changed fields
    return allKeys
      .filter(k => JSON.stringify(ov[k]) !== JSON.stringify(nv[k]))
      .map(k => {
        const fStr = ov[k] == null || JSON.stringify(ov[k]) === '{}' ? '—' :
          typeof ov[k] === 'object' ? JSON.stringify(ov[k]) : String(ov[k]);
        const tStr = nv[k] == null || JSON.stringify(nv[k]) === '{}' ? '—' :
          typeof nv[k] === 'object' ? JSON.stringify(nv[k]) : String(nv[k]);
        return { field: prettify(ID_FIELD_HINTS[k] || k), before: fStr, after: tStr, changed: true };
      });
  } catch {}
  return [];
};

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL  — Tabbed, fully informative, GMP-grade detail view
═══════════════════════════════════════════════════════════════════════════ */
const Modal: React.FC<{ log: ActivityLog; onClose: () => void }> = ({ log: rawLog, onClose }) => {
  const [activeTab, setActiveTab] = React.useState<'overview'|'changes'|'device'|'raw'>('overview');
  const log     = enrichLog(rawLog);
  const action   = normalizeAction(log.action);
  const isInsert = action === 'INSERT' || action === 'CREATE';
  const isDelete = action === 'DELETE';
  const astyle   = getActionStyle(log.action);
  const risk     = getRisk(log.action);
  const diff     = buildDiff(log);
  const retention = getRetentionInfo(log);
  const integrityHash = buildIntegrityHash(log);
  const sharedLogin = detectSharedLogin(log);

  // Parse new_value for subject fields (names already resolved by backend)
  let nv: any = {}; let ov: any = {};
  try { nv = log.new_value ? JSON.parse(log.new_value) : {}; } catch {}
  try { ov = log.old_value ? JSON.parse(log.old_value) : {}; } catch {}
  const rec = isDelete ? ov : nv;

  // Extra from details JSON
  let dex: any = {};
  try { dex = log.details ? JSON.parse(log.details) : {}; } catch {}

  // ── Build performer card data ──────────────────────────────────────────
  const performerName  = log.performed_by_name  || resolvePerformer(log);
  const performerRole  = log.performed_by_role  || dex.performed_by_role || "";
  const performerDesig = log.performed_by_designation || "";
  const performerEmail = log.performed_by_email || "";

  // ── Build subject card (who / what was acted on) ──────────────────────
  // For APPROVE/REJECT the payload nests data inside new_value.user_request
  let nvInner: any = {};
  try { nvInner = log.new_value ? JSON.parse(log.new_value) : {}; } catch {}
  const ur       = nvInner.user_request || {};
  const taskArr: any[] = nvInner.tasks || [];

  const subjectName  = log.subject_user_name || rec.employee_name || ur.employee_name || rec.name || ur.name || rec.display_name || rec.application_hmi_name || rec.application_name || ur.application_name || "";
  const subjectCode  = log.subject_user_code || rec.employee_code || ur.employee_code || rec.vendor_code || ur.vendor_code || "";
  const subjectEmail = log.subject_user_email || rec.email || ur.email || "";
  const subjectDept  = log.subject_department_name || rec.department_name || ur.department_name || rec.department || "";
  const subjectPlant = log.subject_plant_name || log.plant_name || rec.location_name || ur.location_name || rec.plant_name || ur.plant_name || rec.location || "";

  // ── Access request specific fields (from user_requests) ───────────────
  const accessType   = rec.access_request_type || ur.access_request_type || "";
  const requestedFor = rec.request_for_by      || ur.request_for_by      || "";
  const vendorFirm   = rec.vendor_firm         || ur.vendor_firm         || "";
  const vendorCode   = rec.vendor_code         || ur.vendor_code         || "";
  const vendorName   = rec.vendor_name         || ur.vendor_name         || "";
  const appName      = log.application_name    || rec.application_name   || ur.application_name || rec.application_hmi_name || (taskArr[0]?.application_name) || "";
  const roleName     = log.role_name || rec.role_name || ur.role_name || (Array.isArray(rec.role_names) ? rec.role_names.join(", ") : "") || (taskArr[0]?.role_name) || "";
  const reqStatus    = rec.status    || ur.status    || ur.user_request_status || rec.task_status || "";
  const appr1        = rec.approver1_name || ur.approver1_name || ""; const appr1Action = rec.approver1_action || ur.approver1_action || "";
  const appr2        = rec.approver2_name || ur.approver2_name || ""; const appr2Action = rec.approver2_action || ur.approver2_action || "";
  const txnRef       = log.request_transaction_id || ur.transaction_id || String(log.record_id || "");

  // ── Plain-English what-happened sentence ─────────────────────────────
  const buildSentence = (): string => {
    if (log.summary) return log.summary;
    const actionWords: Record<string,string> = {
      approve: "approved", reject: "rejected", update: "updated",
      insert: "created", create: "created", delete: "deleted",
      login: "logged in to", logout: "logged out of",
    };
    const verb = actionWords[action.toLowerCase()] || action.toLowerCase();
    let s = `${performerName} ${verb} ${resolveModule(log)}`;
    if (txnRef)       s += ` [${txnRef}]`;
    if (subjectName)  s += ` for ${subjectName}`;
    if (accessType)   s += ` — ${accessType}`;
    if (appName)      s += ` on ${appName}`;
    if (roleName)     s += ` as ${roleName}`;
    if (reqStatus)    s += `  →  ${reqStatus}`;
    return s;
  };

  const sentence = buildSentence();

  // ── colour helpers for linked txn badges ─────────────────────────────
  const labelBg    = (lbl:string) => lbl==="RITM"?"#EDE9FE":lbl==="TASK"?"#DBEAFE":lbl==="TXN"?"#D1FAE5":"#F1F5F9";
  const labelColor = (lbl:string) => lbl==="RITM"?"#6D28D9":lbl==="TASK"?"#1D4ED8":lbl==="TXN"?"#065F46":"#475569";
  const srcBg      = (s:string)   => s==="OLD VALUE"?"#FEF2F2":s==="NEW VALUE"?"#F0FDF4":s==="REF"?"#EFF6FF":"#F8FAFC";
  const srcBorder  = (s:string)   => s==="OLD VALUE"?"#FECACA":s==="NEW VALUE"?"#BBF7D0":s==="REF"?"#BFDBFE":"#E2E8F0";
  const srcColor   = (s:string)   => s==="OLD VALUE"?"#B91C1C":s==="NEW VALUE"?"#15803D":s==="REF"?"#1D4ED8":"#64748B";

  // ── Shared row helper ─────────────────────────────────────────────────
  const InfoRow = ({ label, value, mono=false, highlight="" }: { label:string; value:string|null|undefined; mono?:boolean; highlight?:string }) => {
    if (!value || value === "—") return null;
    return (
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, paddingTop:6, marginTop:5, borderTop:"1px solid #F1F5F9" }}>
        <span style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase" as const, letterSpacing:"0.07em", flexShrink:0, paddingTop:1 }}>{label}</span>
        <span style={{ fontSize:12, color: highlight || "#1E293B", textAlign:"right" as const, wordBreak:"break-word" as const, fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit", fontWeight: highlight ? 600 : 400, maxWidth:"60%" }}>{value}</span>
      </div>
    );
  };

  // ── Task details parser (reused from previous version) ───────────────
  let nvObj:any={}, ovObj:any={};
  try { nvObj = log.new_value ? JSON.parse(log.new_value) : {}; } catch {}
  try { ovObj = log.old_value ? JSON.parse(log.old_value) : {}; } catch {}
  const task       = nvObj.task        || null;
  const urObj      = nvObj.user_request || null;
  const closureObj = nvObj.task_closure || null;
  const accessLogObj = nvObj.access_log || null;
  const approvalSum  = nvObj.approval_summary || null;
  const oldTask    = ovObj.task        || null;
  const oldUR      = ovObj.user_request || null;
  const sc = (s?:string|null) => STATUS_COLOR[(s||"").toLowerCase()] || "#64748B";
  const v  = (x:any) => (x===null||x===undefined||x==="")?"—":String(x);

  const hasTaskSection = (
    ["TASK_CLOSE","TASK_OPEN","UPDATE"].includes(normalizeAction(log.action)) && !!(task||closureObj||approvalSum)
  ) || (
    ["APPROVE","REJECT"].includes(normalizeAction(log.action)) && !!(approvalSum||nvObj.tasks)
  );

  const tabs = [
    { id: 'overview', label: '📋 Overview' },
    { id: 'changes',  label: diff.length ? `Changes (${diff.length})` : 'Changes' },
    // { id: 'device',   label: '🖥 Device & Network' },
    // { id: 'raw',      label: '{ } Raw Data' },
  ];

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.box} onClick={e => e.stopPropagation()}>

        {/* ══ HEADER ══════════════════════════════════════════════════════ */}
        <div style={ms.hdr}>
          <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0, flex:1 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:5 }}>
                <code style={{ background:"rgba(255,255,255,0.15)", borderRadius:5, padding:"2px 10px", fontSize:11, color:"#BAE6FD", fontWeight:700, border:"1px solid rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace" }}>
                  {log.transaction_id || `#${log.id}`}
                </code>
                <span style={{ ...ms.actionBadge, background:astyle.bg, color:astyle.color, border:`1.5px solid ${astyle.border}` }}>{getActionLabel(log.action)}</span>
                <span style={{ padding:"3px 10px", borderRadius:5, fontSize:11, fontWeight:700, background:risk.bg, color:risk.color, border:`1.5px solid ${risk.border}` }}>
                  {risk.icon} {risk.label} Risk
                </span>
                {sharedLogin && (
                  <span style={{ padding:"3px 10px", borderRadius:5, fontSize:11, fontWeight:700, background:"#FEF2F2", color:"#B91C1C", border:"1.5px solid #FECACA" }}>
                    ⚠️ Shared Login Flag
                  </span>
                )}
              </div>
              <div style={{ fontSize:11, color:"#93C5FD" }}>
                {resolveModule(log)} · {formatDate(log.date_time_ist || log.created_on)}
                {/* {integrityHash && <span style={{ marginLeft:10, fontFamily:"'JetBrains Mono',monospace", opacity:0.75 }}>hash: {integrityHash}</span>} */}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            {/* <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:9, color:"#BAE6FD", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>21 CFR Part 11</div>
              <div style={{ fontSize:10, color: retention.isExpiringSoon ? "#FCD34D":"#6EE7B7", fontWeight:600 }}>
                Expires {retention.expiresOn}
              </div>
            </div> */}
            <button onClick={onClose} style={ms.closeBtn}>✕</button>
          </div>
        </div>

        {/* ══ SUMMARY BANNER ═══════════════════════════════════════════ */}
        <div style={{ background:"linear-gradient(135deg,#EFF6FF,#F0FDF4)", borderBottom:"1px solid #BFDBFE", padding:"10px 22px", display:"flex", alignItems:"flex-start", gap:10, flexShrink:0 }}>
          <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>📋</span>
          <span style={{ fontSize:13, color:"#1E3A8A", fontWeight:500, lineHeight:1.55 }}>{sentence}</span>
        </div>

        {/* ══ TABS ═════════════════════════════════════════════════════ */}
        <div style={{ display:"flex", gap:0, borderBottom:"2px solid #E2E8F0", background:"#F8FAFC", flexShrink:0, overflowX:"auto" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              style={{ padding:"10px 20px", fontSize:12, fontWeight:600, border:"none", background:"transparent", cursor:"pointer", borderBottom:`2px solid ${activeTab===tab.id?"#2563EB":"transparent"}`, color:activeTab===tab.id?"#1D4ED8":"#64748B", marginBottom:-2, fontFamily:"'DM Sans',sans-serif", transition:"all .15s", whiteSpace:"nowrap" }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={ms.body}>


        {/* ════════════ OVERVIEW TAB ════════════ */}
        {activeTab === 'overview' && (<>

          {/* ── TRANSACTION IDs BAR ──────────────────────────────────── */}
          {(() => {
            const linked = resolveLinkedTxnIds(rawLog);
            const selfTxn = rawLog.transaction_id || `#${rawLog.id}`;

            // colour helpers (same as table cell)
            const labelBg = (lbl: string) =>
              lbl === "RITM" ? "#EDE9FE" : lbl === "TASK" ? "#DBEAFE" :
              lbl === "TXN"  ? "#D1FAE5" : "#F1F5F9";
            const labelColor = (lbl: string) =>
              lbl === "RITM" ? "#6D28D9" : lbl === "TASK" ? "#1D4ED8" :
              lbl === "TXN"  ? "#065F46" : "#475569";
            const srcBg = (s: string) =>
              s === "OLD VALUE" ? "#FEF2F2" : s === "NEW VALUE" ? "#F0FDF4" :
              s === "REF"       ? "#EFF6FF" : "#F8FAFC";
            const srcBorder = (s: string) =>
              s === "OLD VALUE" ? "#FECACA" : s === "NEW VALUE" ? "#BBF7D0" :
              s === "REF"       ? "#BFDBFE" : "#E2E8F0";
            const srcColor = (s: string) =>
              s === "OLD VALUE" ? "#B91C1C" : s === "NEW VALUE" ? "#15803D" :
              s === "REF"       ? "#1D4ED8" : "#64748B";

            return (
              <div style={{ marginBottom: 18 }}>
                <div style={ms.secHdr}>
                  <span style={ms.secDot("#2563EB")} />Transaction IDs
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, background: "#F8FAFC", borderRadius: 10, padding: "12px 16px", border: "1px solid #E2E8F0" }}>

                  {/* Own Activity Log ID — always shown */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 160 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Activity Log ID
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: "#1B3A6B" }}>
                      {selfTxn}
                    </div>
                    <div style={{ fontSize: 9, color: "#15803D", fontWeight: 600 }}>✅ Recorded &amp; Saved</div>
                  </div>

                  {/* Divider */}
                  {linked.length > 0 && (
                    <div style={{ width: 1, background: "#E2E8F0", alignSelf: "stretch", margin: "0 4px" }} />
                  )}

                  {/* Linked IDs — one pill per id, grouped by source */}
                  {linked.map((t, i) => (
                    <div key={i} style={{
                      display: "flex", flexDirection: "column", gap: 4, minWidth: 160,
                      background: srcBg(t.source), border: `1px solid ${srcBorder(t.source)}`,
                      borderRadius: 8, padding: "8px 12px",
                    }}>
                      {/* source + type header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{
                          fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 3,
                          background: srcColor(t.source), color: "#fff",
                          letterSpacing: "0.05em", textTransform: "uppercase" as const,
                        }}>
                          {t.source}
                        </span>
                        <span style={{
                          fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                          background: labelBg(t.label), color: labelColor(t.label),
                          letterSpacing: "0.05em", textTransform: "uppercase" as const,
                        }}>
                          {t.label}
                        </span>
                      </div>
                      {/* the id value */}
                      <div style={{
                        fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
                        fontWeight: 700, color: "#1E293B", wordBreak: "break-all",
                      }}>
                        {t.id}
                      </div>
                    </div>
                  ))}

                  {linked.length === 0 && (
                    <div style={{ fontSize: 11, color: "#94A3B8", alignSelf: "center" }}>
                      No linked RITM / TASK IDs found in this record.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── TWO CARDS: WHO DID IT  +  WHAT WAS ACTED ON ──────────── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>

            {/* Card A — Performed By */}
            <div style={ms.card}>
              <div style={{ ...ms.cardHdr, background:"linear-gradient(135deg,#7C3AED,#A855F7)" }}>
                <span style={ms.cardIcon}>👤</span>
                <span>Performed By</span>
              </div>
              <div style={ms.cardBody}>
                <div style={ms.bigName}>{performerName}</div>
                {performerRole  && <div style={ms.cardTag}>{performerRole}</div>}
                {performerDesig && <div style={ms.cardSub}>{performerDesig}</div>}
                {performerEmail && <div style={ms.cardMono}>{performerEmail}</div>}
                <div style={{ ...ms.cardRow, marginTop:10 }}>
                  <span style={ms.cardLabel}>Date / Time</span>
                  <span style={ms.cardVal}>{formatDate(log.date_time_ist || log.created_on)}</span>
                </div>
                <div style={ms.cardRow}>
                  <span style={ms.cardLabel}>IP Address</span>
                  <span style={{ ...ms.cardVal, fontFamily:"'JetBrains Mono',monospace" }}>{cleanIP(log.ip_address)}</span>
                </div>
                <div style={ms.cardRow}>
                  <span style={ms.cardLabel}>Device / Browser</span>
                  <span style={ms.cardVal}>
                    {parseDevice(log.device, log.user_agent)}
                    {(log.browser || parseBrowser(log.user_agent)) && ` · ${log.browser || parseBrowser(log.user_agent)}`}
                    {(log.os     || parseOS(log.user_agent))       && ` · ${log.os     || parseOS(log.user_agent)}`}
                  </span>
                </div>
                {log.source && (
                  <div style={ms.cardRow}>
                    <span style={ms.cardLabel}>Source</span>
                    <span style={ms.cardVal}>{log.source}</span>
                  </div>
                )}
                {log.windows_username && (
                  <div style={ms.cardRow}>
                    <span style={ms.cardLabel}>Windows Login</span>
                    <span style={{ ...ms.cardVal, fontFamily:"'JetBrains Mono',monospace", color:"#7C3AED" }}>{log.windows_username}</span>
                  </div>
                )}
                {log.computer_name && (
                  <div style={ms.cardRow}>
                    <span style={ms.cardLabel}>Computer Name</span>
                    <span style={{ ...ms.cardVal, fontFamily:"'JetBrains Mono',monospace" }}>{log.computer_name}</span>
                  </div>
                )}
                {log.mac_address && (
                  <div style={ms.cardRow}>
                    <span style={ms.cardLabel}>MAC Address</span>
                    <span style={{ ...ms.cardVal, fontFamily:"'JetBrains Mono',monospace", fontSize:10 }}>{log.mac_address}</span>
                  </div>
                )}
                {log.device_type && (
                  <div style={ms.cardRow}>
                    <span style={ms.cardLabel}>Device Type</span>
                    <span style={ms.cardVal}>{log.device_type}</span>
                  </div>
                )}
               {log.geo_city && (
                    <div style={ms.cardRow}><span style={ms.cardLabel}>City</span><span style={ms.cardVal}>{log.geo_city}</span></div>
                  )}
              </div>
            </div>

            {/* Card B — Record Acted On (hidden when no data) */}
            {(subjectName || subjectCode || subjectEmail || subjectDept || subjectPlant || accessType || requestedFor || appName || roleName || reqStatus || vendorFirm || vendorName) && (
              <div style={ms.card}>
                <div style={{ ...ms.cardHdr, background:"linear-gradient(135deg,#0B4380,#2563EB)" }}>
                  <span style={ms.cardIcon}>📁</span>
                  <span>Record Acted On</span>
                </div>
                <div style={ms.cardBody}>
                  {subjectName  && <div style={ms.bigName}>{subjectName}</div>}
                  {subjectCode  && <div style={ms.cardMono}>{subjectCode}</div>}
                  {subjectEmail && <div style={ms.cardSub}>{subjectEmail}</div>}
                  {(subjectDept || subjectPlant) && (
                    <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                      {subjectDept  && <span style={ms.pill}>{subjectDept}</span>}
                      {subjectPlant && <span style={{ ...ms.pill, background:"#FEF3C7", color:"#92400E" }}>{subjectPlant}</span>}
                    </div>
                  )}
                  {accessType   && <div style={ms.cardRow2}><span style={ms.cardLabel}>Access Type</span><span style={ms.cardVal}>{accessType}</span></div>}
                  {requestedFor && <div style={ms.cardRow2}><span style={ms.cardLabel}>Requested For</span><span style={ms.cardVal}>{requestedFor}</span></div>}
                  {appName      && <div style={ms.cardRow2}><span style={ms.cardLabel}>Application</span><span style={{ ...ms.cardVal, fontWeight:600, color:"#1D4ED8" }}>{appName}</span></div>}
                  {roleName     && <div style={ms.cardRow2}><span style={ms.cardLabel}>Role</span><span style={{ ...ms.cardVal, fontWeight:600 }}>{roleName}</span></div>}
                  {vendorFirm   && <div style={ms.cardRow2}><span style={ms.cardLabel}>Vendor Firm</span><span style={ms.cardVal}>{vendorFirm}</span></div>}
                  {vendorName   && <div style={ms.cardRow2}><span style={ms.cardLabel}>Vendor</span><span style={ms.cardVal}>{vendorName}</span></div>}
                  {reqStatus    && <div style={ms.cardRow2}><span style={ms.cardLabel}>Status</span><span style={{ ...ms.cardVal, fontWeight:700, color:statusColor(reqStatus) }}>● {reqStatus}</span></div>}
                </div>
              </div>
            )}
          </div>

          {/* ── VENDOR INFO (when present) ───────────────────────────────── */}
          {(vendorFirm || vendorCode) && (
            <div style={{ marginBottom:18 }}>
              <div style={ms.secHdr}><span style={ms.secDot("#F59E0B")} />Vendor Information</div>
              <div style={{ display:"flex", gap:24, background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, padding:"12px 16px" }}>
                {vendorFirm && <div style={ms.infoCell}><div style={ms.infoLabel}>Vendor Firm</div><div style={ms.infoVal}>{vendorFirm}</div></div>}
                {vendorCode && <div style={ms.infoCell}><div style={ms.infoLabel}>Vendor Code</div><div style={{ ...ms.infoVal, fontFamily:"'JetBrains Mono',monospace" }}>{vendorCode}</div></div>}
                {vendorName && <div style={ms.infoCell}><div style={ms.infoLabel}>Vendor Contact</div><div style={ms.infoVal}>{vendorName}</div></div>}
              </div>
            </div>
          )}

          {/* ── APPROVAL CHAIN ───────────────────────────────────────────── */}
          {(appr1 || appr2) && (
            <div style={{ marginBottom:18 }}>
              <div style={ms.secHdr}><span style={ms.secDot("#10B981")} />Approval Chain</div>
              <div style={{ display:"flex", gap:14 }}>
                {appr1 && (
                  <div style={{ flex:1, background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:10, padding:"12px 16px" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#065F46", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Level 1 Approver</div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#064E3B" }}>{appr1}</div>
                    {appr1Action && <div style={{ marginTop:6, display:"inline-block", padding:"2px 10px", borderRadius:5, fontSize:11, fontWeight:600, background: appr1Action.toLowerCase()==="approved"?"#DCFCE7":"#FEE2E2", color: appr1Action.toLowerCase()==="approved"?"#15803D":"#B91C1C" }}>{appr1Action}</div>}
                  </div>
                )}
                {appr2 && (
                  <div style={{ flex:1, background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:10, padding:"12px 16px" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#065F46", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Level 2 Approver</div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#064E3B" }}>{appr2}</div>
                    {appr2Action && <div style={{ marginTop:6, display:"inline-block", padding:"2px 10px", borderRadius:5, fontSize:11, fontWeight:600, background: appr2Action.toLowerCase()==="approved"?"#DCFCE7":"#FEE2E2", color: appr2Action.toLowerCase()==="approved"?"#15803D":"#B91C1C" }}>{appr2Action}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TASK REQUEST + CLOSURE DETAILS ──────────────────────────── */}
          {/* Shown for task_close / task_open / update on task_requests table,
              and also for approvals that embed task details in new_value.      */}
          {(() => {
            // ── 1. Parse new_value & old_value ──────────────────────────────
            let nvObj: any  = {};
            let ovObj: any  = {};
            try { nvObj = log.new_value ? JSON.parse(log.new_value) : {}; } catch {}
            try { ovObj = log.old_value ? JSON.parse(log.old_value) : {}; } catch {}

            // The new_value shape logged by updateTask:
            //   { task, user_request, task_closure, access_log }
            // The new_value shape logged by logApprovalActivity:
            //   { user_request, tasks[], approval_summary: { task_closures[] } }
            const task          = nvObj.task          || null;
            const urObj         = nvObj.user_request  || null;
            const closureObj    = nvObj.task_closure   || null;
            const accessLogObj  = nvObj.access_log     || null;
            const approvalSum   = nvObj.approval_summary || null;

            // For old_value — task before update
            const oldTask       = ovObj.task          || null;
            const oldUR         = ovObj.user_request  || null;

            // Determine if we have anything task-related to show
            const isTaskAction  = ["TASK_CLOSE","TASK_OPEN","UPDATE"].includes(
              normalizeAction(log.action)
            ) && !!(task || closureObj || approvalSum);

            const isApprovalWithTasks = (
              normalizeAction(log.action) === "APPROVE" ||
              normalizeAction(log.action) === "REJECT"
            ) && !!(approvalSum || nvObj.tasks);

            if (!isTaskAction && !isApprovalWithTasks) return null;

            // ── Helper renderers ─────────────────────────────────────────────
            const Row = ({ label, value, mono = false, color }: {
              label: string; value: string; mono?: boolean; color?: string;
            }) => value && value !== "—" ? (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                gap:8, paddingTop:5, marginTop:4, borderTop:"1px solid #F1F5F9" }}>
                <span style={{ fontSize:10, fontWeight:700, color:"#94A3B8",
                  textTransform:"uppercase", letterSpacing:"0.07em", flexShrink:0 }}>{label}</span>
                <span style={{ fontSize:11, color: color || "#1E293B", textAlign:"right",
                  wordBreak:"break-word", fontFamily: mono?"'JetBrains Mono',monospace":"inherit",
                  fontWeight: color ? 700 : 400 }}>{value}</span>
              </div>
            ) : null;

            const v = (x: any) => (x === null || x === undefined || x === "") ? "—" : String(x);
            const sc = (s?: string | null) => STATUS_COLOR[(s||"").toLowerCase()] || "#64748B";

            return (
              <div style={{ marginBottom:18 }}>
                <div style={ms.secHdr}>
                  <span style={ms.secDot("#F59E0B")} />
                  {isTaskAction ? "Task Request Details" : "Task & Approval Details"}
                </div>

                {/* ── A. User Request Info ──────────────────────────────────── */}
                {(urObj || oldUR) && (() => {
                  const ur = urObj || oldUR;
                  return (
                    <div style={{ background:"#F0F9FF", border:"1px solid #BAE6FD",
                      borderRadius:10, padding:"12px 16px", marginBottom:10 }}>
                      <div style={{ fontSize:10, fontWeight:800, color:"#0369A1",
                        textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:8 }}>
                        🗂 User Request (RITM)
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
                        <div>
                          {ur.transaction_id && (
                            <Row label="RITM No." value={v(ur.transaction_id)} mono />
                          )}
                          <Row label="Employee" value={v(ur.name || ur.employee_name)} />
                          <Row label="Emp Code" value={v(ur.employee_code)} mono />
                          <Row label="Request For" value={v(ur.request_for_by)} />
                          <Row label="Access Type" value={v(ur.access_request_type)} />
                        </div>
                        <div>
                          <Row label="User Request Status"
                            value={v(ur.status || ur.user_request_status)}
                            color={sc(ur.status || ur.user_request_status)} />
                          <Row label="Approver 1 Status"
                            value={v(ur.approver1_status)}
                            color={sc(ur.approver1_status)} />
                          <Row label="Approver 2 Status"
                            value={v(ur.approver2_status)}
                            color={sc(ur.approver2_status)} />
                          <Row label="Request Type" value={v(ur.userRequestType || ur.user_request_type)} />
                          <Row label="From Date" value={v(ur.fromDate || ur.from_date)} />
                          <Row label="To Date" value={v(ur.toDate || ur.to_date)} />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── B. Task Request Info ─────────────────────────────────── */}
                {task && (
                  <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A",
                    borderRadius:10, padding:"12px 16px", marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"#B45309",
                      textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:8 }}>
                      📋 Task Request
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
                      <div>
                        {task.transaction_id && (
                          <Row label="Task No." value={v(task.transaction_id)} mono />
                        )}
                        <Row label="Application" value={v(task.application_name)}
                          color="#1D4ED8" />
                        <Row label="Role" value={v(task.role_name)} />
                        <Row label="Department" value={v(task.department_name)} />
                        <Row label="Plant / Location" value={v(task.plant_name)} />
                        <Row label="Task Action"
                          value={v(task.task_action || nvObj.task_closure?.task_action || closureObj?.task_action)}
                          color="#7C3AED" />
                      </div>
                      <div>
                        <Row label="Task Status"
                          value={v(task.task_status)}
                          color={sc(task.task_status)} />
                        {/* Show before → after status change */}
                        {oldTask?.task_status && oldTask.task_status !== task.task_status && (
                          <div style={{ display:"flex", justifyContent:"space-between",
                            alignItems:"center", gap:8, paddingTop:5, marginTop:4,
                            borderTop:"1px solid #F1F5F9" }}>
                            <span style={{ fontSize:10, fontWeight:700, color:"#94A3B8",
                              textTransform:"uppercase", letterSpacing:"0.07em" }}>Status Change</span>
                            <span style={{ fontSize:11 }}>
                              <span style={{ color:sc(oldTask.task_status), fontWeight:600 }}>
                                {oldTask.task_status}
                              </span>
                              {" → "}
                              <span style={{ color:sc(task.task_status), fontWeight:700 }}>
                                {task.task_status}
                              </span>
                            </span>
                          </div>
                        )}
                        <Row label="Approver 1" value={v(task.approver1_name)} />
                        <Row label="Approver 2" value={v(task.approver2_name)} />
                        <Row label="Appr 1 Action"
                          value={v(task.approver1_action)}
                          color={sc(task.approver1_action)} />
                        <Row label="Appr 2 Action"
                          value={v(task.approver2_action)}
                          color={sc(task.approver2_action)} />
                        <Row label="Remarks" value={v(task.remarks)} />
                      </div>
                    </div>
                    {(task.approver1_comments || task.approver2_comments) && (
                      <div style={{ marginTop:10, display:"flex", gap:10, flexWrap:"wrap" }}>
                        {task.approver1_comments && (
                          <div style={{ flex:1, background:"#F0FDF4", border:"1px solid #BBF7D0",
                            borderRadius:8, padding:"8px 12px", minWidth:160 }}>
                            <div style={{ fontSize:9, fontWeight:700, color:"#065F46",
                              textTransform:"uppercase", marginBottom:3 }}>Appr 1 Comment</div>
                            <div style={{ fontSize:11, color:"#064E3B" }}>{task.approver1_comments}</div>
                          </div>
                        )}
                        {task.approver2_comments && (
                          <div style={{ flex:1, background:"#F0FDF4", border:"1px solid #BBF7D0",
                            borderRadius:8, padding:"8px 12px", minWidth:160 }}>
                            <div style={{ fontSize:9, fontWeight:700, color:"#065F46",
                              textTransform:"uppercase", marginBottom:3 }}>Appr 2 Comment</div>
                            <div style={{ fontSize:11, color:"#064E3B" }}>{task.approver2_comments}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── C. Task Closure — what IT provisioned ────────────────── */}
                {closureObj && (
                  <div style={{ background:"#F0FDF4", border:"1px solid #6EE7B7",
                    borderRadius:10, padding:"12px 16px", marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"#065F46",
                      textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:8 }}>
                      🔒 Task Closure — Provisioned Details
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
                      <div>
                        <Row label="RITM No."       value={v(closureObj.ritm_number)} mono />
                        <Row label="Task No."        value={v(closureObj.task_number)} mono />
                        <Row label="Application"     value={v(closureObj.application_name)} color="#1D4ED8" />
                        <Row label="Requested Role"  value={v(closureObj.requested_role)} />
                        <Row label="Role Granted"    value={v(closureObj.role_granted)} color="#15803D" />
                        <Row label="Access"          value={v(closureObj.access)} />
                        <Row label="Task Action"     value={v(closureObj.task_action)} color="#7C3AED" />
                      </div>
                      <div>
                        <Row label="Assignment Group" value={v(closureObj.assignment_group)} />
                        <Row label="Allocated ID"    value={v(closureObj.allocated_id)} mono />
                        <Row label="Closure Status"  value={v(closureObj.status)} color={sc(closureObj.status)} />
                        <Row label="From Date"       value={v(closureObj.from_date)} />
                        <Row label="To Date"         value={v(closureObj.to_date)} />
                        <Row label="Plant"           value={v(closureObj.plant_name)} />
                        <Row label="Department"      value={v(closureObj.department)} />
                        <Row label="Raised By"       value={v(closureObj.request_raised_by)} />
                      </div>
                    </div>
                    {/* Access log cross-ref */}
                    {accessLogObj && (
                      <div style={{ marginTop:10, background:"#ECFDF5", border:"1px solid #A7F3D0",
                        borderRadius:8, padding:"8px 12px" }}>
                        <div style={{ fontSize:9, fontWeight:700, color:"#065F46",
                          textTransform:"uppercase", marginBottom:3 }}>
                          Access Log Entry Created
                        </div>
                        <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                          {accessLogObj.id && (
                            <span style={{ fontSize:11, color:"#064E3B" }}>
                              ID: <strong style={{ fontFamily:"'JetBrains Mono',monospace" }}>
                                #{accessLogObj.id}
                              </strong>
                            </span>
                          )}
                          {accessLogObj.task_status && (
                            <span style={{ fontSize:11, color: sc(accessLogObj.task_status), fontWeight:600 }}>
                              Status: {accessLogObj.task_status}
                            </span>
                          )}
                          {accessLogObj.access && (
                            <span style={{ fontSize:11, color:"#065F46" }}>
                              Access: <strong>{accessLogObj.access}</strong>
                            </span>
                          )}
                          {accessLogObj.role_granted && (
                            <span style={{ fontSize:11, color:"#065F46" }}>
                              Role: <strong>{accessLogObj.role_granted}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── D. Approval Summary (from combined approval log) ─────── */}
                {approvalSum && (
                  <div style={{ background:"#F5F3FF", border:"1px solid #C4B5FD",
                    borderRadius:10, padding:"12px 16px", marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"#6D28D9",
                      textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:8 }}>
                      ✅ Approval Summary
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px", marginBottom:8 }}>
                      <div>
                        <Row label="Approver"       value={v(approvalSum.approver_name)} color="#6D28D9" />
                        <Row label="Approver Level" value={v(approvalSum.approver_level ? `Level ${approvalSum.approver_level}` : null)} />
                        <Row label="Action"         value={v(approvalSum.action)} color={sc(approvalSum.action)} />
                        <Row label="RITM No."       value={v(approvalSum.ritm_number)} mono />
                      </div>
                      <div>
                        <Row label="Task Count"     value={v(approvalSum.task_count ? `${approvalSum.task_count} task(s)` : null)} />
                        <Row label="Comments"       value={v(approvalSum.comments)} />
                        {approvalSum.task_applications?.length > 0 && (
                          <Row label="Applications" value={approvalSum.task_applications.join(", ")} />
                        )}
                      </div>
                    </div>

                    {/* Per-task statuses */}
                    {approvalSum.task_statuses?.length > 0 && (
                      <div style={{ marginTop:8 }}>
                        <div style={{ fontSize:9, fontWeight:700, color:"#6D28D9",
                          textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
                          Task Statuses After Action
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {approvalSum.task_statuses.map((ts: any, i: number) => (
                            <div key={i} style={{ background:"#EDE9FE", border:"1px solid #C4B5FD",
                              borderRadius:7, padding:"5px 10px", fontSize:11 }}>
                              <span style={{ fontFamily:"'JetBrains Mono',monospace",
                                fontWeight:600, color:"#4C1D95" }}>
                                {ts.task_number || ts.id}
                              </span>
                              {ts.application && (
                                <span style={{ color:"#7C3AED", marginLeft:6, fontSize:10 }}>
                                  · {ts.application}
                                </span>
                              )}
                              <span style={{ marginLeft:8, fontWeight:700,
                                color:sc(ts.status) }}>
                                {ts.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Task closures within approval (if tasks already closed) */}
                    {approvalSum.task_closures?.length > 0 && (
                      <div style={{ marginTop:10 }}>
                        <div style={{ fontSize:9, fontWeight:700, color:"#065F46",
                          textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
                          Provisioning Details (Closed Tasks)
                        </div>
                        {approvalSum.task_closures.map((tc: any, i: number) => (
                          <div key={i} style={{ background:"#F0FDF4",
                            border:"1px solid #BBF7D0", borderRadius:8,
                            padding:"8px 12px", marginBottom:6 }}>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:12, fontSize:11 }}>
                              <span style={{ fontFamily:"'JetBrains Mono',monospace",
                                fontWeight:600, color:"#064E3B" }}>
                                {tc.task_number}
                              </span>
                              {tc.application && (
                                <span style={{ color:"#1D4ED8" }}>App: <strong>{tc.application}</strong></span>
                              )}
                              {tc.role_granted && (
                                <span style={{ color:"#065F46" }}>Role: <strong>{tc.role_granted}</strong></span>
                              )}
                              {tc.access && (
                                <span style={{ color:"#065F46" }}>Access: <strong>{tc.access}</strong></span>
                              )}
                              {tc.assignment_group && (
                                <span style={{ color:"#374151" }}>Group: <strong>{tc.assignment_group}</strong></span>
                              )}
                              {tc.closure_status && (
                                <span style={{ color:sc(tc.closure_status), fontWeight:700 }}>
                                  {tc.closure_status}
                                </span>
                              )}
                              {tc.assigned_to_name && (
                                <span style={{ color:"#374151" }}>
                                  Assigned To: <strong>{tc.assigned_to_name}</strong>
                                </span>
                              )}
                              {tc.from_date && tc.to_date && (
                                <span style={{ color:"#374151" }}>
                                  {tc.from_date} → {tc.to_date}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── E. Tasks list (approval new_value.tasks array) ────────── */}
                {!approvalSum && nvObj.tasks?.length > 0 && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:"#B45309",
                      textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>
                      Tasks Involved ({nvObj.tasks.length})
                    </div>
                    {nvObj.tasks.map((t: any, i: number) => (
                      <div key={i} style={{ display:"flex", flexWrap:"wrap", gap:10,
                        background:"#FFFBEB", border:"1px solid #FDE68A",
                        borderRadius:8, padding:"8px 12px", marginBottom:6, fontSize:11 }}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",
                          fontWeight:600, color:"#92400E" }}>
                          {t.transaction_id || `Task #${i+1}`}
                        </span>
                        {t.application_name && (
                          <span style={{ color:"#1D4ED8" }}>{t.application_name}</span>
                        )}
                        {t.role_name && (
                          <span style={{ color:"#374151" }}>Role: {t.role_name}</span>
                        )}
                        {t.task_status && (
                          <span style={{ color:sc(t.task_status), fontWeight:700 }}>
                            {t.task_status}
                          </span>
                        )}
                        {t.approver1_action && (
                          <span style={{ color:sc(t.approver1_action), fontSize:10 }}>
                            Appr1: {t.approver1_action}
                          </span>
                        )}
                        {t.approver2_action && (
                          <span style={{ color:sc(t.approver2_action), fontSize:10 }}>
                            Appr2: {t.approver2_action}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              </div>
            );
          })()}

          {/* ── EVENT METADATA ───────────────────────────────────────────── */}
          <div style={{ marginBottom:18 }}>
            <div style={ms.secHdr}><span style={ms.secDot("#94A3B8")} />Comments &amp; References</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px 16px", background:"#F8FAFC", borderRadius:10, padding:"12px 16px", border:"1px solid #E2E8F0" }}>
              {([
                ["Module",          resolveModule(log)],
                ["Table",           log.table_name || "—"],
                ["Approval Status", log.approve_status || "—"],
                ["Comments",        log.comments || "—"],
                ...(dex.source     ? [["Source",     dex.source]]     : []),
                ...(dex.endpoint   ? [["Endpoint",   dex.endpoint]]   : []),
              ] as [string,string][]).filter(([,v]) => v && v !== "—").map(([k,v]) => (
                <div key={k}>
                  <div style={{ fontSize:9, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:12, color:"#1E293B", wordBreak:"break-word", fontFamily: k.includes("IP")||k.includes("Endpoint")||k.includes("ID")?"'JetBrains Mono',monospace":"inherit" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── USER AGENT (collapsed by default) ───────────────────────── */}
          {log.user_agent && (
            <details style={{ marginBottom:6 }}>
              <summary style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.08em", cursor:"pointer", padding:"4px 0" }}>
                ▶ User Agent String
              </summary>
              <div style={ms.uaBox}>{log.user_agent}</div>
            </details>
          )}
        </>)}

        {/* ════════════ CHANGES TAB ════════════ */}
        {activeTab === 'changes' && (<>
          {diff.length > 0 ? (
            <div>
              <div style={ms.secHdr}>
                <span style={ms.secDot(isInsert?"#15803D":isDelete?"#B91C1C":"#D97706")} />
                {isInsert ? `${diff.length} Fields Set on Creation` : isDelete ? `${diff.length} Fields at Deletion` : `${diff.length} Field${diff.length>1?"s":""} Changed`}
              </div>
              <div style={{ borderRadius:10, overflow:"hidden", border:"1px solid #E2E8F0" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ background:"#0B4380" }}>
                      <th style={{ padding:"11px 16px", textAlign:"left", color:"#fff", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", width:"22%" }}>Field</th>
                      {!isInsert && <th style={{ padding:"11px 16px", textAlign:"left", color:"#FCA5A5", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", width:"39%" }}>Before (Old Value)</th>}
                      <th style={{ padding:"11px 16px", textAlign:"left", color:isInsert?"#6EE7B7":"#86EFAC", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", width:isInsert?"78%":"39%" }}>
                        {isInsert?"Value Set":isDelete?"Deleted Value":"After (New Value)"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.map((d, i) => (
                      <tr key={i} style={{ background: i%2===0?"#F8FAFC":"#fff" }}>
                        <td style={{ padding:"10px 16px", fontWeight:700, color:"#334155", fontSize:13, borderBottom:"1px solid #F1F5F9", verticalAlign:"top" }}>{d.field}</td>
                        {!isInsert && (
                          <td style={{ padding:"10px 16px", color:"#B91C1C", fontFamily:"'JetBrains Mono',monospace", fontSize:12, borderBottom:"1px solid #F1F5F9", verticalAlign:"top", wordBreak:"break-word", maxWidth:260 }}>
                            {d.before === "—" ? <span style={{ color:"#CBD5E1" }}>—</span> : d.before}
                          </td>
                        )}
                        <td style={{ padding:"10px 16px", color:isInsert?"#065F46":"#15803D", fontFamily:"'JetBrains Mono',monospace", fontSize:12, borderBottom:"1px solid #F1F5F9", verticalAlign:"top", fontWeight:d.changed?600:400, wordBreak:"break-word", maxWidth:260 }}>
                          {d.after === "—" ? <span style={{ color:"#CBD5E1" }}>—</span> : d.after}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"48px 24px", color:"#94A3B8" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>No field changes recorded</div>
              <div style={{ fontSize:12 }}>This event ({getActionLabel(log.action)}) does not produce a before/after diff — e.g. login, logout, or view actions.</div>
            </div>
          )}
        </>)}

        {/* ════════════ DEVICE & NETWORK TAB ════════════ */}
        {activeTab === 'device' && (<>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

            {/* Network Card */}
            <div style={{ borderRadius:12, border:"1px solid #BFDBFE", overflow:"hidden" }}>
              <div style={{ background:"linear-gradient(135deg,#0369A1,#0EA5E9)", padding:"10px 16px", display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:16 }}>🌐</span>
                <span style={{ fontSize:12, fontWeight:700, color:"#fff", textTransform:"uppercase", letterSpacing:"0.07em" }}>Network & Access</span>
              </div>
              <div style={{ background:"#F0F9FF", padding:"14px 16px" }}>
                {[
                  ["Internal IP",    cleanIP(log.ip_address), true],
                  ["Server IP",      cleanIP(log.server_ip), true],
                  ["Public IP",      log.geo_public_ip, true],
                  ["MAC Address",    log.mac_address, true],
                  ["ISP",            log.geo_isp, false],
                  ["Organisation",   log.geo_org, false],
                  ["Source",         log.source, false],
                  ["Endpoint",       dex.endpoint || log.endpoint, true],
                ].filter(([,v]) => v && v !== "—").map(([label, val, mono], i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, paddingTop:7, marginTop:i>0?6:0, borderTop:i>0?"1px solid #BAE6FD":"none" }}>
                    <span style={{ fontSize:10, fontWeight:700, color:"#0369A1", textTransform:"uppercase", letterSpacing:"0.07em", flexShrink:0 }}>{String(label)}</span>
                    <span style={{ fontSize:12, color:"#0C4A6E", fontWeight:600, textAlign:"right", wordBreak:"break-all", fontFamily:mono?"'JetBrains Mono',monospace":"inherit" }}>{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Geo Location Card */}
            <div style={{ borderRadius:12, border:"1px solid #BBF7D0", overflow:"hidden" }}>
              <div style={{ background:"linear-gradient(135deg,#065F46,#10B981)", padding:"10px 16px", display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:16 }}>📍</span>
                <span style={{ fontSize:12, fontWeight:700, color:"#fff", textTransform:"uppercase", letterSpacing:"0.07em" }}>Geo Location</span>
              </div>
              <div style={{ background:"#F0FDF4", padding:"14px 16px" }}>
                {log.geo_city && (
                  <div style={{ fontSize:18, fontWeight:700, color:"#064E3B", marginBottom:10 }}>
                    📍 {[log.geo_city, log.geo_region, log.geo_country].filter(Boolean).join(", ")}
                  </div>
                )}
                {[
                  ["Country Code", log.geo_country_code],
                  ["Timezone",     log.geo_timezone],
                  ["Latitude",     log.latitude ? String(log.latitude) : null],
                  ["Longitude",    log.longitude ? String(log.longitude) : null],
                  ["Location Tag", log.location],
                ].filter(([,v]) => v && v !== "—").map(([label, val], i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, paddingTop:6, marginTop:6, borderTop:"1px solid #BBF7D0" }}>
                    <span style={{ fontSize:10, fontWeight:700, color:"#065F46", textTransform:"uppercase", letterSpacing:"0.07em" }}>{String(label)}</span>
                    <span style={{ fontSize:12, color:"#064E3B", fontWeight:600 }}>{String(val)}</span>
                  </div>
                ))}
                {!log.geo_city && <div style={{ color:"#94A3B8", fontSize:12, textAlign:"center", padding:"20px 0" }}>No geo data available</div>}
              </div>
            </div>

            {/* Device & OS Card */}
            <div style={{ borderRadius:12, border:"1px solid #DDD6FE", overflow:"hidden" }}>
              <div style={{ background:"linear-gradient(135deg,#5B21B6,#7C3AED)", padding:"10px 16px", display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:16 }}>💻</span>
                <span style={{ fontSize:12, fontWeight:700, color:"#fff", textTransform:"uppercase", letterSpacing:"0.07em" }}>Device & Operating System</span>
              </div>
              <div style={{ background:"#F5F3FF", padding:"14px 16px" }}>
                {log.computer_name && (
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, fontWeight:700, color:"#4C1D95", marginBottom:10 }}>
                    🖥 {log.computer_name}
                  </div>
                )}
                {[
                  ["Device Type",     log.device_type],
                  ["Windows Login",   log.windows_username],
                  ["Windows Domain",  log.windows_domain],
                  ["Windows Version", log.windows_version],
                  ["OS Build",        log.os_release],
                  ["Platform",        log.platform ? `${log.platform} ${log.platform_version||""}`.trim() : null],
                  ["Architecture",    log.architecture],
                  ["Browser",         log.browser ? `${log.browser} ${log.browser_version||""}`.trim() : null],
                  ["OS (UA)",         log.os || parseOS(log.user_agent) || null],
                ].filter(([,v]) => v && v !== "—").map(([label, val], i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, paddingTop:6, marginTop:i>0?6:0, borderTop:i>0?"1px solid #DDD6FE":"none" }}>
                    <span style={{ fontSize:10, fontWeight:700, color:"#6D28D9", textTransform:"uppercase", letterSpacing:"0.07em", flexShrink:0 }}>{String(label)}</span>
                    <span style={{ fontSize:12, color:"#4C1D95", fontWeight:500, textAlign:"right", wordBreak:"break-word", fontFamily:["Windows Login","Windows Domain","OS Build"].includes(String(label))?"'JetBrains Mono',monospace":"inherit" }}>{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hardware Card */}
            <div style={{ borderRadius:12, border:"1px solid #FDE68A", overflow:"hidden" }}>
              <div style={{ background:"linear-gradient(135deg,#92400E,#D97706)", padding:"10px 16px", display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:16 }}>⚙️</span>
                <span style={{ fontSize:12, fontWeight:700, color:"#fff", textTransform:"uppercase", letterSpacing:"0.07em" }}>Hardware Specs</span>
              </div>
              <div style={{ background:"#FFFBEB", padding:"14px 16px" }}>
                {log.cpu_model && (
                  <div style={{ fontSize:13, fontWeight:700, color:"#78350F", marginBottom:10 }}>
                    🔧 {log.cpu_model}
                  </div>
                )}
                {[
                  ["Total RAM",   log.total_mem_mb ? `${Math.round(Number(log.total_mem_mb)/1024*10)/10} GB (${log.total_mem_mb} MB)` : null],
                  ["Free RAM",    log.free_mem_mb  ? `${Math.round(Number(log.free_mem_mb)/1024*10)/10} GB (${log.free_mem_mb} MB)`  : null],
                  ["Home Dir",    log.homedir],
                  ["Subscription",log.subscription],
                ].filter(([,v]) => v && v !== "—").map(([label, val], i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, paddingTop:6, marginTop:i>0?6:0, borderTop:i>0?"1px solid #FDE68A":"none" }}>
                    <span style={{ fontSize:10, fontWeight:700, color:"#92400E", textTransform:"uppercase", letterSpacing:"0.07em", flexShrink:0 }}>{String(label)}</span>
                    <span style={{ fontSize:12, color:"#78350F", fontWeight:500, textAlign:"right", wordBreak:"break-word", fontFamily:["Home Dir"].includes(String(label))?"'JetBrains Mono',monospace":"inherit" }}>{String(val)}</span>
                  </div>
                ))}
                {!log.cpu_model && !log.total_mem_mb && (
                  <div style={{ color:"#94A3B8", fontSize:12, textAlign:"center", padding:"20px 0" }}>Hardware data not captured for this event</div>
                )}
              </div>
            </div>

          </div>

          {/* User Agent */}
          {log.user_agent && (
            <div style={{ marginTop:16, borderRadius:10, border:"1px solid #E2E8F0", overflow:"hidden" }}>
              <div style={{ background:"#F8FAFC", padding:"9px 16px", fontSize:10, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid #E2E8F0" }}>
                Full User Agent String
              </div>
              <div style={{ padding:"12px 16px", fontSize:11, color:"#64748B", fontFamily:"'JetBrains Mono',monospace", wordBreak:"break-all", lineHeight:1.7, background:"#fff" }}>
                {log.user_agent}
              </div>
            </div>
          )}

          {/* Shared login warning */}
          {sharedLogin && (
            <div style={{ marginTop:16, background:"#FEF2F2", border:"1.5px solid #FECACA", borderRadius:10, padding:"14px 18px" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#B91C1C", marginBottom:4 }}>⚠️ Possible Shared Login Detected</div>
              <div style={{ fontSize:12, color:"#7F1D1D", lineHeight:1.6 }}>
                The Windows username <code style={{ fontFamily:"'JetBrains Mono',monospace", background:"#FEE2E2", padding:"1px 5px", borderRadius:3 }}>{log.windows_username}</code> does not match the application user performing this action. This may indicate credential sharing, which is a 21 CFR Part 11 compliance violation. QA review is recommended.
              </div>
            </div>
          )}
        </>)}

        {/* ════════════ RAW DATA TAB ════════════ */}
        {activeTab === 'raw' && (<>
          {[
            { label:"New Value", data: log.new_value, color:"#065F46", bg:"#F0FDF4", border:"#BBF7D0" },
            { label:"Old Value", data: log.old_value, color:"#B91C1C", bg:"#FEF2F2", border:"#FECACA" },
            { label:"Changes",   data: log.changes,   color:"#D97706", bg:"#FFFBEB", border:"#FDE68A" },
          ].map(({ label, data, color, bg, border }) => {
            if (!data) return null;
            let pretty = data;
            try { pretty = JSON.stringify(JSON.parse(data), null, 2); } catch {}
            return (
              <details key={label} open={label==="New Value"} style={{ marginBottom:12 }}>
                <summary style={{ padding:"10px 16px", background:bg, border:`1px solid ${border}`, borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, color, display:"flex", alignItems:"center", gap:8, listStyle:"none" }}>
                  <span>▶</span> {label} <span style={{ fontSize:10, fontWeight:400, color:"#94A3B8" }}>({pretty.length.toLocaleString()} chars)</span>
                </summary>
                <pre style={{ margin:"4px 0 0", background:"#0F172A", color:"#94A3B8", padding:"16px", borderRadius:"0 0 8px 8px", fontSize:11, fontFamily:"'JetBrains Mono',monospace", overflowX:"auto", lineHeight:1.65, whiteSpace:"pre-wrap", wordBreak:"break-word", border:`1px solid ${border}`, borderTop:"none" }}>
                  {pretty}
                </pre>
              </details>
            );
          })}
          <div style={{ marginTop:16, background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:8, padding:"12px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Record Metadata</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px 20px" }}>
              {([
                ["Audit ID",       log.id],
                ["Transaction ID", log.transaction_id],
                ["Table",          log.table_name],
                ["Module",         log.module],
                ["Action Type",    log.action_type],
                ["User ID",        log.user_id],
                ["Approve Status", log.approve_status],
                ["Integrity Hash", integrityHash],
                ["Record Created", formatDate(log.created_on)],
              ] as [string,any][]).map(([k,v]) => v ? (
                <div key={k}>
                  <div style={{ fontSize:9, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:11, color:"#1E293B", fontFamily:"'JetBrains Mono',monospace", wordBreak:"break-word" }}>{String(v)}</div>
                </div>
              ) : null)}
            </div>
          </div>
        </>)}

        </div>
      </div>
    </div>
  );
};

const ms: Record<string,any> = {
  overlay:      { position:"fixed", inset:0, background:"rgba(10,20,45,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(4px)" },
  box:          { background:"#fff", borderRadius:16, width:"100%", maxWidth:1080, maxHeight:"94vh", display:"flex", flexDirection:"column", boxShadow:"0 40px 100px rgba(0,0,0,0.45)", border:"1px solid #E2E8F0" },
  hdr:          { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 22px", background:"linear-gradient(135deg,#0B4380 0%,#1D4ED8 100%)", borderRadius:"16px 16px 0 0", flexShrink:0 },
  txnBadge:     { background:"rgba(255,255,255,0.15)", borderRadius:7, padding:"5px 12px", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"#fff", fontWeight:600, border:"1px solid rgba(255,255,255,0.2)", flexShrink:0 },
  hdrTitle:     { fontSize:14, fontWeight:700, color:"#fff", fontFamily:"'DM Sans',sans-serif" },
  hdrSub:       { fontSize:11, color:"#93C5FD", marginTop:2 },
  actionBadge:  { padding:"4px 14px", borderRadius:6, fontSize:11, fontWeight:700, letterSpacing:"0.04em" },
  closeBtn:     { background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", cursor:"pointer", borderRadius:7, padding:"4px 12px", fontSize:15, fontWeight:700, lineHeight:1 },
  body:         { overflowY:"auto", padding:"18px 22px", flex:1 },
  // Plain-English sentence banner
  sentenceBox:  { display:"flex", alignItems:"flex-start", gap:10, background:"linear-gradient(135deg,#EFF6FF,#F0FDF4)", border:"1px solid #BFDBFE", borderRadius:10, padding:"12px 16px", marginBottom:18 },
  sentenceIcon: { fontSize:16, flexShrink:0 },
  sentenceText: { fontSize:13, color:"#1E3A8A", fontWeight:500, lineHeight:1.55 },
  // Two-up cards
  card:         { borderRadius:12, border:"1px solid #E2E8F0", overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
  cardHdr:      { display:"flex", alignItems:"center", gap:8, padding:"10px 16px", color:"#fff", fontWeight:700, fontSize:11, textTransform:"uppercase" as const, letterSpacing:"0.07em" },
  cardIcon:     { fontSize:14 },
  cardBody:     { padding:"14px 16px" },
  bigName:      { fontSize:15, fontWeight:700, color:"#1E293B", marginBottom:3 },
  cardTag:      { display:"inline-block", background:"#EDE9FE", color:"#6D28D9", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, marginBottom:4 },
  cardSub:      { fontSize:11, color:"#64748B", marginBottom:2 },
  cardMono:     { fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:"#475569", marginBottom:6 },
  cardRow:      { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, paddingTop:6, borderTop:"1px solid #F1F5F9", marginTop:4 },
  cardRow2:     { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, paddingTop:5, marginTop:4 },
  cardLabel:    { fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase" as const, letterSpacing:"0.07em", flexShrink:0 },
  cardVal:      { fontSize:11, color:"#1E293B", textAlign:"right" as const, wordBreak:"break-word" as const },
  pill:         { fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:4, background:"#DBEAFE", color:"#1E40AF" },
  // Vendor / info row
  infoCell:     { display:"flex", flexDirection:"column" as const, gap:3 },
  infoLabel:    { fontSize:9, fontWeight:700, color:"#92400E", textTransform:"uppercase" as const, letterSpacing:"0.07em" },
  infoVal:      { fontSize:12, fontWeight:600, color:"#78350F" },
  // Section headers
  secHdr:       { display:"flex", alignItems:"center", gap:8, fontSize:10, fontWeight:700, color:"#475569", textTransform:"uppercase" as const, letterSpacing:"0.09em", marginBottom:10, paddingBottom:7, borderBottom:"2px solid #E8EEF6" },
  secDot:       (c:string) => ({ width:8, height:8, borderRadius:"50%", background:c, flexShrink:0 }),
  // Changes table
  chTh:         { textAlign:"left" as const, padding:"9px 14px", color:"#fff", fontWeight:700, fontSize:11, textTransform:"uppercase" as const, letterSpacing:"0.05em" },
  chTd:         { padding:"8px 14px", borderBottom:"1px solid #F1F5F9", verticalAlign:"top" as const },
  uaBox:        { background:"#F1F5F9", borderRadius:8, padding:"10px 14px", fontSize:10, color:"#64748B", fontFamily:"'JetBrains Mono',monospace", wordBreak:"break-all" as const, border:"1px solid #E2E8F0", lineHeight:1.6, marginTop:6 },
  // Geo rows
  geoRow:       { display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5, gap:8 },
  geoLabel:     { fontSize:9, fontWeight:700, color:"#0369A1", textTransform:"uppercase" as const, letterSpacing:"0.06em", whiteSpace:"nowrap" as const },
  geoVal:       { fontSize:11, color:"#0C4A6E", fontWeight:600, textAlign:"right" as const },
  // Hardware / OS rows
  hwLabel:      { fontSize:9, fontWeight:700, color:"#6D28D9", textTransform:"uppercase" as const, letterSpacing:"0.06em", marginBottom:2 },
  hwVal:        { fontSize:11, color:"#1E293B", fontWeight:500 },
};


/* ─────────────────────────────────────────────────────────────────────────────
   DATE HELPERS
───────────────────────────────────────────────────────────────────────────── */
const MAX_MONTHS = 60;  // Pharma retention: up to 5 years per 21 CFR Part 11
const TODAY_STR  = new Date().toISOString().slice(0, 10);

const addMonths = (dateStr: string, months: number): string => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  if (d > new Date()) return TODAY_STR;
  return d.toISOString().slice(0, 10);
};

const monthsAgoStr = (n: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};

const validateDateRange = (from: string, to: string): string => {
  if (!from || !to) return "";
  const f = new Date(from), t = new Date(to);
  if (f > t) return "'From' date cannot be after 'To' date.";
  const sixMonthsBeforeTo = new Date(t);
  sixMonthsBeforeTo.setMonth(t.getMonth() - MAX_MONTHS);
  if (f < sixMonthsBeforeTo) return `Date range cannot exceed ${MAX_MONTHS} months.`;
  if (t > new Date()) return "'To' date cannot be in the future.";
  return "";
};

const DEFAULT_FROM = monthsAgoStr(1);
const DEFAULT_TO   = TODAY_STR;

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
interface Filters { search: string; action: string; module: string; risk: string; dateFrom: string; dateTo: string; }

const ActivityMasterTable: React.FC = () => {
  const [logs,     setLogs]     = useState<ActivityLog[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<ActivityLog | null>(null);
  const [page,     setPage]     = useState(1);
  const PER = 15;

  const [filters, setFilters] = useState<Filters>({
    search: "", action: "", module: "", risk: "",
    dateFrom: DEFAULT_FROM, dateTo: DEFAULT_TO,
  });

  const dateWarning = validateDateRange(filters.dateFrom, filters.dateTo);

  useEffect(() => {
    if (dateWarning) return;
    setLoading(true);
    fetchActivityLog({ dateFrom: filters.dateFrom, dateTo: filters.dateTo })
      .then((data: ActivityLog[]) => { setLogs(data); setLoading(false); })
      .catch(() => { setLogs([]); setLoading(false); });
  }, [filters.dateFrom, filters.dateTo]);

  const allActions = useMemo(() =>
    [...new Set(logs.map(l => normalizeAction(l.action)).filter(Boolean))].sort(), [logs]);

  const allModules = useMemo(() =>
    [...new Set(logs.map(resolveModule).filter(m => m !== "—"))].sort(), [logs]);

  const filtered = useMemo(() => logs.filter(log => {
    if (filters.action && normalizeAction(log.action) !== filters.action) return false;
    if (filters.module && resolveModule(log) !== filters.module) return false;
    if (filters.risk  && getRisk(log.action).level !== filters.risk) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();

      // Deep-parse the `details` JSON column to surface nested fields
      // (e.g. employee name, computer name, endpoint inside new_value/old_value)
      let detailsFlat = "";
      if (log.details) {
        try {
          const d = JSON.parse(log.details);
          const pickDeep = (obj: any): string => {
            if (!obj || typeof obj !== "object") return "";
            return [
              obj.name, obj.employee_name, obj.employee_code, obj.display_name,
              obj.transaction_id, obj.vendor_name, obj.vendor_firm, obj.vendor_code,
              obj.role_name, obj.department_name, obj.plant_name, obj.location_name,
              obj.application_name, obj.application_hmi_name, obj.status,
              obj.task_status, obj.access_request_type, obj.user_request_type,
              obj.request_for_by, obj.task_action, obj.approver1_name, obj.approver2_name,
              obj.request_raised_by, obj.approver1_status, obj.approver2_status,
            ].filter(Boolean).join(" ");
          };
          detailsFlat = [
            pickDeep(d.new_value),
            pickDeep(d.old_value),
            // top-level device/geo fields stored in details
            d.windows_username, d.computer_name, d.mac_address,
            d.geo_city, d.geo_region, d.geo_country, d.geo_isp, d.geo_org,
            d.geo_public_ip, d.geo_timezone,
            d.endpoint, d.referrer, d.source, d.subscription,
            d.performed_by_role, d.browser, d.os, d.browser_version,
            d.device_type, d.server_ip, d.ip_address,
            d.platform, d.platform_version, d.architecture,
            d.cpu_model, d.os_release, d.os_platform_raw, d.windows_version,
          ].filter(Boolean).join(" ");
        } catch { /* ignore malformed JSON */ }
      }

      const hay = [
        // ── Identifiers ────────────────────────────────────────────────
        log.transaction_id,            // ACT001408
        log.request_transaction_id,    // USRL… / RITM…
        log.record_id,
        log.module_id,
        log.module_label,
        // ── Core audit ─────────────────────────────────────────────────
        log.table_name,                // user_master / task_requests / user_requests
        log.module,                    // auth / approvals / user_requests
        log.action,                    // login / approve / insert / update / delete
        log.action_type,               // auth / system / user
        resolveModule(log),            // pretty module label
        // ── Performer ──────────────────────────────────────────────────
        resolvePerformer(log),
        log.action_user_name,
        log.performed_by_name,
        log.performed_by_email,
        log.performed_by_role,         // Super Admin / Admin
        log.performed_by_designation,
        // ── Subject user (backend JOINs) ───────────────────────────────
        log.subject_user_name,
        log.subject_user_code,
        log.subject_user_email,
        log.subject_department_name,
        log.subject_plant_name,
        // ── Status / Comments ──────────────────────────────────────────
        log.approve_status,
        log.comments,                  // "User logged in" / "Task approved by …"
        // ── Network ────────────────────────────────────────────────────
        log.ip_address,                // 10.1.100.135
        log.server_ip,
        // ── Browser / OS ───────────────────────────────────────────────
        log.browser,                   // Chrome / Edge / Firefox
        log.browser_version,           // 145.0
        log.os,                        // Windows 11
        log.device,                    // device column value
        log.device_type,               // Laptop / Mobile / Desktop
        log.device_id,
        // ── Hardware identifiers ───────────────────────────────────────
        log.mac_address,               // 58:1C:F8:62:F2:BE
        log.computer_name,             // ULLLSELT0271
        // ── Windows / OS context ──────────────────────────────────────
        log.windows_username,          // nishant1.singh
        log.windows_domain,
        log.windows_version,           // Windows 11
        log.os_release,                // 10.0.26200
        log.os_platform_raw,           // win32
        log.platform,                  // Windows
        log.platform_version,          // 13.0.0
        log.architecture,              // x64
        log.cpu_model,                 // 12th Gen Intel Core i5-1235U
        log.homedir,
        // ── Geo / Location ─────────────────────────────────────────────
        log.geo_city,                  // Mumbai
        log.geo_region,                // Maharashtra
        log.geo_country,               // India
        log.geo_country_code,          // IN
        log.geo_timezone,              // Asia/Kolkata
        log.geo_isp,                   // Tata Teleservices Limited
        log.geo_org,
        log.geo_public_ip,             // 27.107.162.214
        log.location,                  // Corporate / Mumbai, Maharashtra, India
        String(log.latitude  ?? ""),
        String(log.longitude ?? ""),
        // ── Session / App ──────────────────────────────────────────────
        log.source,                    // web
        log.subscription,              // 11+Corporate
        log.endpoint,
        log.application_name,
        log.role_name,
        log.department_name,
        log.plant_name,
        // ── OS / memory (numeric → string so "16016" is searchable) ───
        String(log.total_mem_mb ?? ""),
        String(log.free_mem_mb  ?? ""),
        // ── Computed / enriched ────────────────────────────────────────
        log.summary,
        buildHumanSummary(log),
        // ── Deep details JSON search ───────────────────────────────────
        detailsFlat,
        // ── Linked transaction IDs (RITM / TASK / TXN from nested JSON) ─
        ...resolveLinkedTxnIds(log).map(t => t.id),
      ].map(v => (v == null ? "" : String(v))).join(" ").toLowerCase();

      if (!hay.includes(q)) return false;
    }
    return true;
  }), [logs, filters.search, filters.action, filters.module, filters.risk]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const pageData   = filtered.slice((page - 1) * PER, page * PER);

  const setFilter = (k: keyof Filters, v: string) => {
    setFilters(prev => {
      const next = { ...prev, [k]: v };
      if (k === "dateFrom") {
        const maxTo = addMonths(v, MAX_MONTHS);
        if (next.dateTo > maxTo) next.dateTo = maxTo;
        if (next.dateTo > TODAY_STR) next.dateTo = TODAY_STR;
      }
      if (k === "dateTo") {
        if (v > TODAY_STR) next.dateTo = TODAY_STR;
        const minFrom = addMonths(next.dateTo, -MAX_MONTHS);
        if (next.dateFrom < minFrom) next.dateFrom = minFrom;
      }
      return next;
    });
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: "", action: "", module: "", risk: "", dateFrom: DEFAULT_FROM, dateTo: DEFAULT_TO });
    setPage(1);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
    const PW = doc.internal.pageSize.getWidth();
    const exportTime = new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "medium" });

    // ── Helper: draw a filled rect ──────────────────────────────────────
    const fillRect = (x: number, y: number, w: number, h: number, r: number, g: number, b: number) => {
      doc.setFillColor(r, g, b);
      doc.rect(x, y, w, h, "F");
    };

    // ══ PAGE 1: COVER / SUMMARY ═══════════════════════════════════════

    // Dark navy header banner
    fillRect(0, 0, PW, 90, 11, 58, 128);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22); doc.setFont("helvetica", "bold");
    doc.text("Activity Audit Trail Report", 40, 38);
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text("Unichem Laboratories — GMP Compliant Activity Log  ·  21 CFR Part 11 / EU Annex 11", 40, 58);
    doc.setFontSize(9); doc.setTextColor(180, 210, 255);
    doc.text(`Generated on: ${exportTime}`, 40, 74);
    doc.text(`Total Records: ${filtered.length.toLocaleString()}  ·  Document No: UAT-${new Date().toISOString().slice(0,10).replace(/-/g,"")}`, PW - 260, 74);

    // ── Summary stats ──────────────────────────────────────────────────
    const actionCounts: Record<string, number> = {};
    const moduleCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};
    filtered.forEach(l => {
      const a = getActionLabel(l.action);
      const m = resolveModule(l);
      const u = resolvePerformer(l);
      actionCounts[a] = (actionCounts[a] || 0) + 1;
      moduleCounts[m] = (moduleCounts[m] || 0) + 1;
      userCounts[u]   = (userCounts[u]   || 0) + 1;
    });

    let y = 110;
    doc.setTextColor(27, 58, 107);
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("Report Summary", 40, y); y += 18;

    // ── What this report contains (plain English box) ──────────────────
    fillRect(38, y, PW - 76, 62, 239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.setLineWidth(1);
    doc.rect(38, y, PW - 76, 62);
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(29, 78, 216);
    doc.text("What is this report?", 50, y + 14);
    doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    const desc = [
      "This report is a chronological record of every action performed in the system within the selected date range.",
      "It shows WHO performed each action, WHAT they did, WHEN it happened, and from WHICH device/location.",
      "Actions are risk-classified per 21 CFR Part 11 / EU Annex 11. Records are retained for 5 years per GMP policy.",
      "CONTROLLED DOCUMENT — For authorised GMP / QA / Compliance personnel only. Do not distribute externally.",
    ];
    desc.forEach((line, i) => { doc.text(line, 50, y + 27 + i * 10); });
    y += 75;

    const riskCounts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    filtered.forEach(l => { riskCounts[getRisk(l.action).level]++; });
    const sharedLogins = filtered.filter(detectSharedLogin).length;

    // ── 3-column summary cards ─────────────────────────────────────────
    const cardW = (PW - 100) / 3;
    const cards = [
      { title: "Actions Breakdown",   data: Object.entries(actionCounts).sort((a,b)=>b[1]-a[1]).slice(0,8) },
      { title: "Activity by Module",  data: Object.entries(moduleCounts).sort((a,b)=>b[1]-a[1]).slice(0,8) },
      { title: "Top Active Users",    data: Object.entries(userCounts).sort((a,b)=>b[1]-a[1]).slice(0,8) },
    ];
    cards.forEach((card, ci) => {
      const cx = 40 + ci * (cardW + 10);
      fillRect(cx, y, cardW, 200, 248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(cx, y, cardW, 200);
      fillRect(cx, y, cardW, 26, 27, 58, 107);
      doc.setTextColor(255,255,255); doc.setFontSize(10); doc.setFont("helvetica","bold");
      doc.text(card.title, cx + 10, y + 17);
      let ry = y + 38;
      card.data.forEach(([label, count]) => {
        const barW = Math.min((count / filtered.length) * (cardW - 80), cardW - 80);
        doc.setTextColor(71, 85, 105); doc.setFontSize(8); doc.setFont("helvetica","normal");
        doc.text(label.length > 22 ? label.slice(0,22)+"…" : label, cx + 10, ry);
        fillRect(cx + cardW - 80, ry - 7, barW, 8, 37, 99, 235);
        doc.setTextColor(27,58,107); doc.setFont("helvetica","bold");
        doc.text(String(count), cx + cardW - 20, ry, { align: "right" });
        ry += 18;
      });
    });
    y += 220;

    // ── Risk summary box ───────────────────────────────────────────────
    fillRect(38, y, PW - 76, 36, 248, 250, 252);
    doc.setDrawColor(226, 232, 240); doc.rect(38, y, PW - 76, 36);
    doc.setFontSize(9); doc.setFont("helvetica","bold"); doc.setTextColor(71, 85, 105);
    doc.text("GMP Risk Summary:", 50, y + 14);
    const riskColors: [string, number, number, number][] = [
      [`CRITICAL: ${riskCounts.CRITICAL}`, 153, 27, 27],
      [`HIGH: ${riskCounts.HIGH}`,          146, 64, 14],
      [`MEDIUM: ${riskCounts.MEDIUM}`,       29, 78, 216],
      [`LOW: ${riskCounts.LOW}`,              4,120, 87],
    ];
    riskColors.forEach(([label, r, g, b], i) => {
      doc.setTextColor(r, g, b);
      doc.text(label, 180 + i * 120, y + 14);
    });
    doc.setTextColor(sharedLogins > 0 ? 153 : 100, sharedLogins > 0 ? 27 : 116, sharedLogins > 0 ? 27 : 139);
    doc.setFont("helvetica", sharedLogins > 0 ? "bold" : "normal");
    doc.text(`Credential Mismatch Flags: ${sharedLogins}${sharedLogins > 0 ? "  — Records where Windows login does not match app user. QA review required." : " — None detected."}`, 50, y + 27);
    y += 50;

    // ── Legend ─────────────────────────────────────────────────────────
    doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(27,58,107);
    doc.text("Action Legend — What Each Action Means", 40, y); y += 14;
    const legends: [string, string, number, number, number][] = [
      ["🔐 Signed In",    "User successfully logged into the system",    37, 99, 235],
      ["🔓 Signed Out",   "User logged out of the system",               133, 77, 14],
      ["➕ Created",      "A new record was added to the system",        21, 128, 61],
      ["✏️ Updated",      "An existing record was modified",             29, 78, 216],
      ["🗑️ Deleted",      "A record was permanently removed",            185, 28, 28],
      ["✅ Approved",     "A request or record was approved",            4, 120, 87],
      ["❌ Rejected",     "A request was declined/rejected",             153, 27, 27],
      ["👁️ Viewed",       "A record was accessed/viewed",                100, 116, 139],
    ];
    const lgColW = (PW - 80) / 4;
    legends.forEach(([label, desc2, r, g, b], i) => {
      const lx = 40 + (i % 4) * lgColW;
      const ly = y + Math.floor(i / 4) * 36;
      fillRect(lx, ly, lgColW - 8, 30, 248, 250, 252);
      doc.setDrawColor(226, 232, 240); doc.rect(lx, ly, lgColW - 8, 30);
      doc.setFontSize(9); doc.setFont("helvetica","bold"); doc.setTextColor(r, g, b);
      doc.text(label, lx + 6, ly + 12);
      doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(71,85,105);
      doc.text(desc2, lx + 6, ly + 23);
    });
    y += 82;

    // ── Footer on page 1 ──────────────────────────────────────────────
    doc.setFontSize(7.5); doc.setTextColor(148,163,184);
    doc.text("CONFIDENTIAL — For authorised personnel only. Do not distribute externally.", PW/2, doc.internal.pageSize.getHeight() - 20, { align: "center" });

    // ══ PAGE 2+: MAIN DATA TABLE ══════════════════════════════════════
    doc.addPage();

    // Page header
    fillRect(0, 0, PW, 52, 11, 58, 128);
    doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont("helvetica","bold");
    doc.text("Detailed Activity Log", 40, 24);
    doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(180,210,255);
    doc.text(`${filtered.length.toLocaleString()} records  ·  Exported: ${exportTime}`, 40, 40);

    // Column guide (plain English header explanations)
    const colGuide = [
      ["Txn ID",       "Unique ID for this entry"],
      ["Module",       "Which system area"],
      ["Action",       "What happened"],
      ["What Happened","Full description"],
      ["Performed By", "Who did this"],
      ["Device",       "Device & browser"],
      ["Internal IP",  "Local network IP"],
      ["Public IP/ISP","Internet IP & provider"],
      ["Location",     "City / Country"],
      ["Windows User", "Windows login name"],
      ["Date & Time",  "When it occurred (IST)"],
    ];
    let gy = 68;
    fillRect(38, gy, PW - 76, 18, 241, 245, 251);
    doc.setTextColor(100, 116, 139); doc.setFontSize(7); doc.setFont("helvetica","bold");
    colGuide.forEach(([col, hint], ci) => {
      doc.text(`${col}: ${hint}`, 46 + ci * ((PW - 90)/12), gy + 12);
    });
    gy += 24;

    autoTable(doc, {
      startY: gy,
      head: [["Txn ID", "Module", "Action", "Risk", "What Happened", "Performed By", "Windows User", "Internal IP", "Public IP", "Location", "Date & Time (IST)"]],
      body: filtered.map(l => {
        const el = enrichLog(l);
        const risk = getRisk(l.action);
        const summary = buildHumanSummary(l);
        const changes = resolveChanges(l);
        const changeText = changes.length > 0
          ? changes.slice(0, 3).map(c => `• ${c.field}: ${safeShort(c.from, 14)} → ${safeShort(c.to, 14)}`).join("\n")
          : "";
        const sharedFlag = detectSharedLogin(l) ? "\n⚠ SHARED LOGIN — QA Review Required" : "";
        const fullSummary = [summary, changeText, sharedFlag].filter(Boolean).join("\n");
        const geoLocation = [el.geo_city, el.geo_region, el.geo_country_code].filter(Boolean).join(", ") || el.location || "—";
        return [
          l.transaction_id || `#${l.id}`,
          resolveModule(l),
          (ACTION_LABEL[normalizeAction(l.action)] || normalizeAction(l.action)).replace(/[\u{1F300}-\u{1FFFF}]/gu, "").trim(),
          risk.label,
          fullSummary,
          resolvePerformer(l) + (el.performed_by_role ? `\n[${el.performed_by_role}]` : ""),
          el.windows_username || "—",
          cleanIP(l.ip_address),
          el.geo_public_ip || "—",
          geoLocation,
          formatDate(l.date_time_ist || l.created_on),
        ];
      }),
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
        overflow: "linebreak",
        minCellHeight: 22,
        lineColor: [226, 232, 240],
        lineWidth: 0.4,
        font: "helvetica",
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [11, 67, 128],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: { top: 8, right: 6, bottom: 8, left: 6 },
        halign: "left",
      },
      alternateRowStyles: { fillColor: [241, 247, 255] },
      didParseCell: (data: any) => {
        if (data.column.index === 3 && data.section === "body") {
          const v = (data.cell.text[0] || "").toUpperCase();
          if (v === "CRITICAL") {
            data.cell.styles.textColor = [153, 27, 27];
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [255, 242, 242];
          } else if (v === "HIGH") {
            data.cell.styles.textColor = [146, 64, 14];
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [255, 251, 235];
          } else if (v === "MEDIUM") {
            data.cell.styles.textColor = [29, 78, 216];
          } else {
            data.cell.styles.textColor = [4, 120, 87];
          }
        }
        // Txn ID column — bold blue
        if (data.column.index === 0 && data.section === "body") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = [27, 58, 107];
        }
        // Performer bold
        if (data.column.index === 5 && data.section === "body") {
          data.cell.styles.fontStyle = "bold";
        }
        // Flag shared login rows
        if (data.section === "body" && (data.cell.text || []).join("").includes("SHARED LOGIN")) {
          data.cell.styles.fillColor = [254, 226, 226];
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        }
      },
      columnStyles: {
        0:  { cellWidth: 65,  fontStyle: "bold", textColor: [27, 58, 107] },
        1:  { cellWidth: 58 },
        2:  { cellWidth: 62 },
        3:  { cellWidth: 52 },
        4:  { cellWidth: 175, textColor: [30, 41, 59] },
        5:  { cellWidth: 85,  fontStyle: "bold" },
        6:  { cellWidth: 80 },
        7:  { cellWidth: 68 },
        8:  { cellWidth: 78 },
        9:  { cellWidth: 78 },
        10: { cellWidth: 95 },
      },
      didDrawPage: (data: any) => {
        const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
        // Footer line
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.line(40, doc.internal.pageSize.getHeight() - 22, PW - 40, doc.internal.pageSize.getHeight() - 22);
        doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal");
        doc.text(
          `Unichem Laboratories — GMP Audit Trail  ·  Page ${pageNum}  ·  CONTROLLED DOCUMENT — 21 CFR Part 11 Compliant  ·  Exported: ${exportTime}`,
          PW / 2,
          doc.internal.pageSize.getHeight() - 12,
          { align: "center" }
        );
        // Light watermark
        (doc as any).setTextColor(235, 235, 235);
        (doc as any).setFontSize(52);
        (doc as any).setFont("helvetica", "bold");
        doc.text("CONTROLLED COPY", PW / 2, doc.internal.pageSize.getHeight() / 2, { align: "center", angle: 35 });
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
      },
    });

    doc.save(`Activity_Audit_Trail_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  /* ── RENDER ──────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;}

        /* ── Row hover — blue left bar like Access Log ── */
        .act-row { transition: background .1s; cursor: pointer; }
        .act-row:hover { background: #EFF6FF !important; }

        /* ── Risk-level row left border on hover ── */
        .act-row:hover { box-shadow: inset 4px 0 0 #2563EB; }

        /* ── Shared login flag row ── */
        .shared-flag { background: #FEF9F9 !important; }

        /* ── Inputs ── */
        .alinp { height: 36px; border: 1.5px solid #CBD5E1; border-radius: 8px; padding: 0 12px;
          font-size: 13px; font-family: 'DM Sans', sans-serif; color: #1E293B;
          background: #fff; outline: none; transition: border .15s, box-shadow .15s; }
        .alinp:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }

        /* ── Buttons ── */
        .smallBtn { height: 34px; padding: 0 14px; font-size: 12px; font-weight: 600;
          border-radius: 7px; cursor: pointer; border: 1.5px solid #CBD5E1;
          background: #fff; color: #475569; font-family: 'DM Sans', sans-serif;
          transition: all .12s; }
        .smallBtn:hover { background: #F8FAFC; border-color: #94A3B8; }
        .exportBtn { background: linear-gradient(135deg,#1B3A6B,#2563EB) !important;
          color: #fff !important; border-color: transparent !important; }
        .exportBtn:hover { opacity: .9; }

        /* ── Pagination ── */
        .pgbtn { height: 32px; min-width: 32px; padding: 0 8px; border-radius: 6px;
          font-size: 12px; font-family: 'DM Sans',sans-serif; cursor: pointer;
          border: 1.5px solid #E2E8F0; background: #fff; color: #475569;
          transition: all .12s; font-weight: 500; }
        .pgbtn:hover:not(:disabled) { background: #EFF6FF; border-color: #93C5FD; color: #1D4ED8; }
        .pgbtn:disabled { opacity: .35; cursor: not-allowed; }
        .pgact { background: #1B3A6B !important; color: #fff !important; border-color: #1B3A6B !important; }

        /* ── Diff chips ── */
        .chip { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px;
          border-radius: 4px; font-size: 10.5px; background: #F1F5F9; color: #475569; margin: 1px; }
        .chip .frm { color: #B91C1C; }
        .chip .arr { color: #94A3B8; font-size: 9px; }
        .chip .too { color: #15803D; }

        /* ── Details button ── */
        .detail-btn { height: 26px; padding: 0 10px; border-radius: 5px; font-size: 11px;
          font-weight: 600; border: 1.5px solid #BFDBFE; background: #EFF6FF;
          color: #1D4ED8; cursor: pointer; font-family: 'DM Sans',sans-serif;
          transition: all .12s; white-space: nowrap; }
        .detail-btn:hover { background: #DBEAFE; border-color: #93C5FD; }
      `}</style>

      <AppHeader title="Activity Log — Audit Trail" />

      <div style={st.page}>

        {/* ── 21 CFR Part 11 / EU Annex 11 Compliance Banner ───────────── */}
        {/* <div style={{ background:"linear-gradient(135deg,#0C4A6E,#0369A1)", borderRadius:10, padding:"10px 18px", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>🏥</span>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#fff", letterSpacing:"0.02em" }}>GMP Compliant Audit Trail — 21 CFR Part 11 / EU Annex 11</div>
              <div style={{ fontSize:10, color:"#BAE6FD" }}>Every action is automatically recorded · Risk-classified by severity · Kept for 5 years · Shared account detection enabled</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {(["CRITICAL","HIGH","MEDIUM","LOW"] as RiskLevel[]).map(r => {
              const rm = getRisk(r === "CRITICAL" ? "DELETE" : r === "HIGH" ? "APPROVE" : r === "MEDIUM" ? "UPDATE" : "LOGIN");
              const count = logs.filter(l => getRisk(l.action).level === r).length;
              return (
                <span key={r} style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:12, background: rm.bg, color: rm.color, border:`1px solid ${rm.border}`, cursor:"pointer" }}
                  onClick={() => setFilter("risk", filters.risk === r ? "" : r)}>
                  {rm.icon} {r}: {count}
                </span>
              );
            })}
          </div>
        </div> */}

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <div className={addStyle.sixCol}>
          <input className="alinp" style={{ flex: 2, minWidth: 220 }}
            placeholder="🔍  Search transaction, module, user, IP…"
            value={filters.search} onChange={e => setFilter("search", e.target.value)} />

          <select className="alinp" style={{ minWidth: 150 }}
            value={filters.module} onChange={e => setFilter("module", e.target.value)}>
            <option value="">All Modules</option>
            {allModules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {/* Date range */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={st.dateLabel}>From</span>
              <input type="date" className="alinp" style={{ width: 145 }}
                value={filters.dateFrom} max={filters.dateTo || TODAY_STR}
                min={filters.dateTo ? addMonths(filters.dateTo, -MAX_MONTHS) : undefined}
                onChange={e => setFilter("dateFrom", e.target.value)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={st.dateLabel}>To</span>
              <input type="date" className="alinp" style={{ width: 145 }}
                value={filters.dateTo} min={filters.dateFrom || undefined} max={TODAY_STR}
                onChange={e => setFilter("dateTo", e.target.value)} />
            </div>
            {dateWarning && <span style={st.warn}>⚠ {dateWarning}</span>}
          </div>

          <button className="smallBtn" onClick={clearFilters}>✕ Clear</button>
          <button className="smallBtn exportBtn" onClick={exportPDF}>↓ Export PDF</button>
        </div>

        {/* ── Table card ────────────────────────────────────────────────── */}
        <div style={st.tableCard}>

          {/* Card header — same gradient as Access Log */}
          <div style={st.tableHdr}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={st.tableTitle}>Audit Trail</span>
              <span style={st.countBadge}>{filtered.length.toLocaleString()} records</span>
            </div>
            <span style={st.tableHint}>Click Details on any row to see the full audit record</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans',sans-serif" }}>
              <thead>
                <tr>
                  {["Txn ID", "Module / Table", "Action", "What Changed", "Performed By", "Device / IP", "Date & Time (IST)", "Details"].map(h => (
                    <th key={h} style={st.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 48, color: "#94A3B8", fontFamily: "'DM Sans',sans-serif" }}>
                    Loading audit logs…
                  </td></tr>
                )}
                {!loading && pageData.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 48, color: "#94A3B8" }}>
                    No records match filters.
                  </td></tr>
                )}

                {pageData.map((log, idx) => {
                  const action  = normalizeAction(log.action);
                  const astyle  = getActionStyle(log.action);
                  const risk    = getRisk(log.action);
                  const changes = resolveChanges(log);
                  const isIns   = action === "INSERT" || action === "CREATE";
                  const device  = parseDevice(log.device, log.user_agent);
                  const os      = parseOS(log.user_agent);
                  const browser = parseBrowser(log.user_agent);
                  const sharedLogin = detectSharedLogin(log);
                  const src     = getActionSource(log);

                  // Row left-border colour by risk
                  const riskBorderColor = risk.level === "CRITICAL" ? "#EF4444"
                    : risk.level === "HIGH" ? "#F59E0B"
                    : risk.level === "MEDIUM" ? "#3B82F6" : "#10B981";

                  return (
                    <tr key={log.id} className="act-row"
                      style={{ background: idx % 2 === 0 ? "#fff" : "#F8FAFC", borderLeft: `3px solid ${riskBorderColor}` }}>

                      {/* Txn ID + OLD/NEW linked IDs from old_value / new_value / details */}
                      <td style={st.td}>
                        {/* Primary activity log transaction ID */}
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#1B3A6B", fontWeight: 600 }}>
                          {log.transaction_id || `#${log.id}`}
                        </div>
                        <div style={{ fontSize: 9, color: "#15803D", marginTop: 2, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                          ✅ Recorded &amp; Saved
                        </div>
                        <div style={{ fontSize: 9, color: "#94A3B8", marginTop: 1 }}>{src} action</div>

                        {/* Linked TXN IDs — OLD VALUE and NEW VALUE shown separately */}
                        {(() => {
                          const linked = resolveLinkedTxnIds(log);
                          if (linked.length === 0) return null;

                          // colour helpers
                          const labelBg = (lbl: string) =>
                            lbl === "RITM" ? "#EDE9FE" : lbl === "TASK" ? "#DBEAFE" :
                            lbl === "TXN"  ? "#D1FAE5" : "#F1F5F9";
                          const labelColor = (lbl: string) =>
                            lbl === "RITM" ? "#6D28D9" : lbl === "TASK" ? "#1D4ED8" :
                            lbl === "TXN"  ? "#065F46" : "#475569";
                          const srcBg = (src: string) =>
                            src === "OLD VALUE" ? "#FEF2F2" : src === "NEW VALUE" ? "#F0FDF4" :
                            src === "REF"       ? "#EFF6FF" : "#F8FAFC";
                          const srcColor = (src: string) =>
                            src === "OLD VALUE" ? "#B91C1C" : src === "NEW VALUE" ? "#15803D" :
                            src === "REF"       ? "#1D4ED8" : "#64748B";

                          return (
                            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                              {linked.map((t, i) => (
                                <div key={i} style={{
                                  display: "flex", alignItems: "center", gap: 4,
                                  background: srcBg(t.source),
                                  border: `1px solid ${t.source === "OLD VALUE" ? "#FECACA" : t.source === "NEW VALUE" ? "#BBF7D0" : "#BFDBFE"}`,
                                  borderRadius: 5, padding: "2px 6px",
                                }}>
                                  {/* source badge: OLD / NEW */}
                                  <span style={{
                                    fontSize: 7, fontWeight: 800, padding: "1px 4px", borderRadius: 3,
                                    background: srcColor(t.source), color: "#fff",
                                    letterSpacing: "0.04em", textTransform: "uppercase" as const, flexShrink: 0,
                                  }}>
                                    {t.source}
                                  </span>
                                  {/* type badge: RITM / TASK / TXN */}
                                  <span style={{
                                    fontSize: 7, fontWeight: 700, padding: "1px 4px", borderRadius: 3,
                                    background: labelBg(t.label), color: labelColor(t.label),
                                    letterSpacing: "0.04em", textTransform: "uppercase" as const, flexShrink: 0,
                                  }}>
                                    {t.label}
                                  </span>
                                  {/* the id itself */}
                                  <span style={{
                                    fontFamily: "'JetBrains Mono',monospace",
                                    fontSize: 10, color: "#1E293B", fontWeight: 600,
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  }}>
                                    {t.id}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Module */}
                      <td style={st.td}>
                        <div style={{ fontWeight: 600, color: "#1E293B", fontSize: 13 }}>{resolveModule(log)}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>{log.table_name || ""}</div>
                      </td>

                      {/* Action badge */}
                      <td style={st.td}>
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 700, letterSpacing: "0.02em", background: astyle.bg, color: astyle.color, border: `1px solid ${astyle.border}`, whiteSpace: "nowrap" }}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>

                      {/* Human summary — plain English sentence */}
                      <td style={{ ...st.td, maxWidth: 300 }}>
                        <div style={{ fontSize: 12, color: "#1E293B", lineHeight: 1.5, marginBottom: changes.length > 0 ? 6 : 0 }}>
                          {buildHumanSummary(log)}
                        </div>
                        {sharedLogin && (
                          <div style={{ fontSize: 10, color: "#B91C1C", fontWeight: 700, marginBottom: 4, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, padding: "2px 6px", display: "inline-block" }}>
                            ⚠️ Possible shared login detected
                          </div>
                        )}
                        {changes.length > 0 && (
                          <div>
                            {changes.slice(0, 3).map((c, i) => (
                              <span key={i} className="chip">
                                <span style={{ fontWeight: 600, color: "#374151" }}>{c.field}</span>
                                {!isIns && <><span className="frm">&nbsp;{safeShort(c.from, 12)}</span><span className="arr">▶</span></>}
                                <span className="too">{safeShort(c.to, 12)}</span>
                              </span>
                            ))}
                            {changes.length > 3 && (
                              <span style={{ fontSize: 10, color: "#94A3B8", marginLeft: 4 }}>+{changes.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Performer + role */}
                      <td style={st.td}>
                        <div style={{ fontWeight: 600, color: "#1E293B", fontSize: 13 }}>{resolvePerformer(log)}</div>
                        {log.performed_by_role && (
                          <div style={{ fontSize: 10, color: "#7C3AED", marginTop: 2, fontWeight: 500 }}>
                            {log.performed_by_role}
                          </div>
                        )}
                        {(() => { const el = enrichLog(log); return el.windows_username ? (
                          <div style={{ fontSize: 9, color: "#94A3B8", marginTop: 1, fontFamily:"'JetBrains Mono',monospace" }}>
                            🖥 {el.windows_username}
                          </div>
                        ) : null; })()}
                      </td>

                      {/* Device / IP / Location */}
                      <td style={st.td}>
                        <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{device}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>
                          {[log.browser || browser, log.os || os].filter(Boolean).join(" · ")}
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#94A3B8", marginTop: 1 }}>
                          {cleanIP(log.ip_address)}
                        </div>
                        {(() => { const el = enrichLog(log); return el.geo_city ? (
                          <div style={{ fontSize: 9, color: "#0369A1", marginTop: 1 }}>📍 {el.geo_city}{el.geo_country_code ? `, ${el.geo_country_code}` : ""}</div>
                        ) : null; })()}
                      </td>

                      {/* Date */}
                      <td style={{ ...st.td, fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                        {formatDate(log.date_time_ist || log.created_on)}
                      </td>

                      {/* Details button */}
                      <td style={{ ...st.td, textAlign: "center" }}>
                        <button className="detail-btn" onClick={() => setSelected(log)}>
                          Details ›
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={st.pgRow}>
            <span style={{ fontSize: 12, color: "#94A3B8" }}>
              Showing {filtered.length === 0 ? 0 : (page - 1) * PER + 1}–{Math.min(page * PER, filtered.length)} of {filtered.length.toLocaleString()} records
            </span>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button className="pgbtn" onClick={() => setPage(1)} disabled={page === 1} title="First">«</button>
              <button className="pgbtn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
              {(() => {
                const pages: number[] = [];
                let start = Math.max(1, page - 2);
                let end   = Math.min(totalPages, start + 4);
                if (end - start < 4) start = Math.max(1, end - 4);
                for (let i = start; i <= end; i++) pages.push(i);
                return pages.map(pg => (
                  <button key={pg} className={`pgbtn ${pg === page ? "pgact" : ""}`} onClick={() => setPage(pg)}>{pg}</button>
                ));
              })()}
              <button className="pgbtn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</button>
              <button className="pgbtn" onClick={() => setPage(totalPages)} disabled={page === totalPages} title="Last">»</button>
            </div>
          </div>
        </div>
      </div>

      {selected && <Modal log={selected} onClose={() => setSelected(null)} />}
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES  — same palette / structure as Access Log
───────────────────────────────────────────────────────────────────────────── */
const st: Record<string, React.CSSProperties> = {
  page:       { fontFamily: "'DM Sans',sans-serif", background: "#EEF2F9", minHeight: "100vh", padding: "59px 24px 48px" },
  tableCard:  { background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(27,58,107,.1)", overflow: "hidden", marginTop: 0 },
  tableHdr:   { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "linear-gradient(135deg,#1B3A6B 0%,#2563EB 100%)" },
  tableTitle: { fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans',sans-serif" },
  countBadge: { background: "rgba(255,255,255,.18)", color: "#fff", fontSize: 11, padding: "2px 12px", borderRadius: 20, fontWeight: 600 },
  tableHint:  { fontSize: 11, color: "rgba(255,255,255,.6)", letterSpacing: "0.02em" },
  th:         { padding: "10px 13px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #E2E8F0", whiteSpace: "nowrap", background: "#F8FAFC" },
  td:         { padding: "11px 13px", fontSize: 13, color: "#1E293B", borderBottom: "1px solid #F1F5F9", verticalAlign: "middle" },
  pgRow:      { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderTop: "1px solid #F1F5F9", background: "#FAFBFF" },
  dateLabel:  { fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap", width: 32 },
  warn:       { fontSize: 11, color: "#B91C1C", marginTop: 2 },
};

export default ActivityMasterTable;