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
  os?: string | null;
  source?: string | null;
  endpoint?: string | null;
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

/* ─────────────────────────────────────────────────────────────────────────────
   ACTION BADGE COLOURS
───────────────────────────────────────────────────────────────────────────── */
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

const STATUS_COLOR: Record<string, string> = {
  approved: "#15803D", completed: "#15803D", rejected: "#B91C1C",
  pending: "#D97706", active: "#0369A1", inactive: "#64748B",
};
const statusColor = (s?: string | null) => STATUS_COLOR[(s || "").toLowerCase()] || "#64748B";

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
   MODAL  — 5 sections, human-readable, no raw IDs visible
═══════════════════════════════════════════════════════════════════════════ */
const Modal: React.FC<{ log: ActivityLog; onClose: () => void }> = ({ log, onClose }) => {
  const action   = normalizeAction(log.action);
  const isInsert = action === 'INSERT' || action === 'CREATE';
  const isDelete = action === 'DELETE';
  const astyle   = getActionStyle(log.action);
  const diff     = buildDiff(log);

  // Parse new_value for subject fields (names already resolved by backend)
  let nv: any = {}; let ov: any = {};
  try { nv = log.new_value ? JSON.parse(log.new_value) : {}; } catch {}
  try { ov = log.old_value ? JSON.parse(log.old_value) : {}; } catch {}
  const rec = isDelete ? ov : nv;   // the "main" record object

  // Extra from details JSON
  let dex: any = {};
  try { dex = log.details ? JSON.parse(log.details) : {}; } catch {}

  // ── Build performer card data ──────────────────────────────────────────
  const performerName  = log.performed_by_name  || resolvePerformer(log);
  const performerRole  = log.performed_by_role  || dex.performed_by_role || "";
  const performerDesig = log.performed_by_designation || "";
  const performerEmail = log.performed_by_email || "";

  // ── Build subject card (who / what was acted on) ──────────────────────
  const subjectName  = log.subject_user_name || rec.employee_name || rec.name || rec.display_name || rec.application_hmi_name || rec.application_name || "";
  const subjectCode  = log.subject_user_code || rec.employee_code || rec.vendor_code || "";
  const subjectEmail = log.subject_user_email || rec.email || "";
  const subjectDept  = log.subject_department_name || rec.department_name || rec.department || "";
  const subjectPlant = log.subject_plant_name || log.plant_name || rec.location_name || rec.plant_name || rec.location || "";

  // ── Access request specific fields (from user_requests) ───────────────
  const accessType   = rec.access_request_type || "";
  const requestedFor = rec.request_for_by || "";
  const vendorFirm   = rec.vendor_firm || "";
  const vendorCode   = rec.vendor_code || "";
  const vendorName   = rec.vendor_name || "";   // already resolved by backend
  const appName      = log.application_name || rec.application_name || rec.application_hmi_name || "";
  const roleName     = log.role_name || rec.role_name || (Array.isArray(rec.role_names) ? rec.role_names.join(", ") : "") || "";
  const reqStatus    = rec.status || rec.task_status || "";
  const appr1        = rec.approver1_name || ""; const appr1Action = rec.approver1_action || "";
  const appr2        = rec.approver2_name || ""; const appr2Action = rec.approver2_action || "";
  const txnRef       = log.request_transaction_id || String(log.record_id || "");

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

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.box} onClick={e => e.stopPropagation()}>

        {/* ══ HEADER ══════════════════════════════════════════════════════ */}
        <div style={ms.hdr}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={ms.txnBadge}>{log.transaction_id || `#${log.id}`}</div>
            <div>
              <div style={ms.hdrTitle}>Audit Record Detail</div>
              <div style={ms.hdrSub}>{resolveModule(log)} · {formatDate(log.date_time_ist || log.created_on)}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <span style={{ ...ms.actionBadge, background:astyle.bg, color:astyle.color, border:`1.5px solid ${astyle.border}` }}>{action}</span>
            <button onClick={onClose} style={ms.closeBtn}>✕</button>
          </div>
        </div>

        <div style={ms.body}>

          {/* ── PLAIN ENGLISH SENTENCE ─────────────────────────────────── */}
          <div style={ms.sentenceBox}>
            <span style={ms.sentenceIcon}>📋</span>
            <span style={ms.sentenceText}>{sentence}</span>
          </div>

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
              </div>
            </div>

            {/* Card B — Record Acted On */}
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

                {accessType && (
                  <div style={ms.cardRow2}><span style={ms.cardLabel}>Access Type</span><span style={ms.cardVal}>{accessType}</span></div>
                )}
                {requestedFor && (
                  <div style={ms.cardRow2}><span style={ms.cardLabel}>Requested For</span><span style={ms.cardVal}>{requestedFor}</span></div>
                )}
                {appName && (
                  <div style={ms.cardRow2}><span style={ms.cardLabel}>Application</span><span style={{ ...ms.cardVal, fontWeight:600, color:"#1D4ED8" }}>{appName}</span></div>
                )}
                {roleName && (
                  <div style={ms.cardRow2}><span style={ms.cardLabel}>Role</span><span style={{ ...ms.cardVal, fontWeight:600 }}>{roleName}</span></div>
                )}
                {/* {txnRef && (
                  <div style={ms.cardRow2}><span style={ms.cardLabel}>Ref ID</span><span style={{ ...ms.cardVal, fontFamily:"'JetBrains Mono',monospace" }}>{txnRef}</span></div>
                )} */}
                {reqStatus && (
                  <div style={ms.cardRow2}>
                    <span style={ms.cardLabel}>Status</span>
                    <span style={{ ...ms.cardVal, fontWeight:700, color:statusColor(reqStatus) }}>● {reqStatus}</span>
                  </div>
                )}
              </div>
            </div>
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

          {/* ── FIELD CHANGES TABLE ──────────────────────────────────────── */}
          {diff.length > 0 && (
            <div style={{ marginBottom:18 }}>
              <div style={ms.secHdr}>
                <span style={ms.secDot(isInsert?"#15803D":isDelete?"#B91C1C":"#D97706")} />
                {isInsert ? "Fields Set on Creation" : isDelete ? "Fields at Deletion" : `What Changed  (${diff.length} field${diff.length>1?"s":""})`}
              </div>
              <div style={{ borderRadius:10, overflow:"hidden", border:"1px solid #E2E8F0" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ background:"#0B4380" }}>
                      <th style={{ ...ms.chTh, width:"25%" }}>Field</th>
                      {!isInsert && <th style={{ ...ms.chTh, color:"#FCA5A5", width:"37.5%" }}>Before  (old value)</th>}
                      <th style={{ ...ms.chTh, color:isInsert?"#6EE7B7":"#86EFAC", width:isInsert?"75%":"37.5%" }}>
                        {isInsert?"Value Set":isDelete?"Deleted Value":"After  (new value)"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.map((d, i) => (
                      <tr key={i} style={{ background: i%2===0?"#F8FAFC":"#fff" }}>
                        <td style={{ ...ms.chTd, fontWeight:700, color:"#374151" }}>{d.field}</td>
                        {!isInsert && (
                          <td style={{ ...ms.chTd, color:"#B91C1C", fontFamily:"'JetBrains Mono',monospace", fontSize:11, maxWidth:200, wordBreak:"break-word" }}>
                            {d.before}
                          </td>
                        )}
                        <td style={{ ...ms.chTd, color: isInsert?"#065F46":"#15803D", fontFamily:"'JetBrains Mono',monospace", fontSize:11, maxWidth:200, wordBreak:"break-word", fontWeight:d.changed?600:400 }}>
                          {isInsert ? d.after : d.after}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── EVENT METADATA ───────────────────────────────────────────── */}
          <div style={{ marginBottom:18 }}>
            <div style={ms.secHdr}><span style={ms.secDot("#94A3B8")} />Event Metadata</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px 16px", background:"#F8FAFC", borderRadius:10, padding:"12px 16px", border:"1px solid #E2E8F0" }}>
              {([
                // ["Transaction ID",  log.transaction_id || `#${log.id}`],
                ["Module",          resolveModule(log)],
                // ["Table",           log.table_name || "—"],
                // ["Record Ref",      txnRef || "—"],
                ["Approval Status", log.approve_status || "—"],
                ["Comments",        log.comments || "—"],
                // ...(dex.endpoint   ? [["Endpoint",   dex.endpoint]]   : []),
                ...(dex.source     ? [["Source",     dex.source]]     : []),
                ...(dex.referrer   ? [["Referrer",   dex.referrer]]   : []),
              ] as [string,string][]).map(([k,v]) => (
                <div key={k}>
                  <div style={{ fontSize:9, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:11, color:"#1E293B", wordBreak:"break-word", fontFamily: k.includes("IP")||k.includes("Endpoint")||k.includes("ID")?"'JetBrains Mono',monospace":"inherit" }}>{v}</div>
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
};


/* ─────────────────────────────────────────────────────────────────────────────
   DATE HELPERS
───────────────────────────────────────────────────────────────────────────── */
const MAX_MONTHS = 6;
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
interface Filters { search: string; action: string; module: string; dateFrom: string; dateTo: string; }

const ActivityMasterTable: React.FC = () => {
  const [logs,     setLogs]     = useState<ActivityLog[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<ActivityLog | null>(null);
  const [page,     setPage]     = useState(1);
  const PER = 15;

  const [filters, setFilters] = useState<Filters>({
    search: "", action: "", module: "",
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
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = [
        log.transaction_id, log.table_name, log.module,
        String(log.request_transaction_id || ""), log.comments, log.ip_address,
        resolvePerformer(log), resolveModule(log), log.action, log.approve_status,
      ].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [logs, filters.search, filters.action, filters.module]);

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
    setFilters({ search: "", action: "", module: "", dateFrom: DEFAULT_FROM, dateTo: DEFAULT_TO });
    setPage(1);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
    doc.setFontSize(13); doc.setTextColor(27, 58, 107);
    doc.text("Unichem Laboratories — Activity Audit Trail", 40, 30);
    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text(`Exported: ${new Date().toLocaleString("en-IN")}   |   ${filtered.length} records`, 40, 44);
    autoTable(doc, {
      startY: 55,
      head: [["Txn ID", "Module", "Table", "Record", "Action", "Changes", "Performed By", "IP", "Device", "Status", "Date / Time"]],
      body: filtered.map(l => {
        const ch = resolveChanges(l);
        const cs = ch.slice(0, 3).map(c => `${c.field}: ${c.from}→${c.to}`).join(" | ") || l.comments || "—";
        return [
          l.transaction_id || `#${l.id}`, resolveModule(l), l.table_name || "—",
          String(l.request_transaction_id || "—"), normalizeAction(l.action), cs,
          resolvePerformer(l), cleanIP(l.ip_address), parseDevice(l.device, l.user_agent),
          l.approve_status || "—", formatDate(l.date_time_ist || l.created_on),
        ];
      }),
      styles: { fontSize: 7, cellPadding: 4 },
      headStyles: { fillColor: [27, 58, 107], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [240, 247, 255] },
    });
    doc.save(`Audit_Trail_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  /* ── RENDER ──────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;}

        /* ── Row hover — blue left bar like Access Log ── */
        .act-row { transition: background .1s; cursor: pointer; }
        .act-row:hover { background: #EFF6FF !important; box-shadow: inset 3px 0 0 #2563EB; }

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

        {/* ── Filter bar (same layout as Access Log) ────────────────────── */}
        <div className={addStyle.sixCol}>
          <input className="alinp" style={{ flex: 2, minWidth: 220 }}
            placeholder="🔍  Search transaction, module, user, IP…"
            value={filters.search} onChange={e => setFilter("search", e.target.value)} />

          <select className="alinp" style={{ minWidth: 140 }}
            value={filters.action} onChange={e => setFilter("action", e.target.value)}>
            <option value="">All Actions</option>
            {allActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

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
                  {["Txn ID", "Module / Table", "Record Ref", "Action", "What Changed", "Performed By", "Device / IP", "Status", "Date & Time (IST)", "Details"].map(h => (
                    <th key={h} style={st.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: 48, color: "#94A3B8", fontFamily: "'DM Sans',sans-serif" }}>
                    Loading audit logs…
                  </td></tr>
                )}
                {!loading && pageData.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: 48, color: "#94A3B8" }}>
                    No records match filters.
                  </td></tr>
                )}

                {pageData.map((log, idx) => {
                  const action  = normalizeAction(log.action);
                  const astyle  = getActionStyle(log.action);
                  const changes = resolveChanges(log);
                  const isIns   = action === "INSERT" || action === "CREATE";
                  const device  = parseDevice(log.device, log.user_agent);
                  const os      = parseOS(log.user_agent);
                  const browser = parseBrowser(log.user_agent);

                  return (
                    <tr key={log.id} className="act-row"
                      style={{ background: idx % 2 === 0 ? "#fff" : "#F8FAFC" }}>

                      {/* Txn ID */}
                      <td style={st.td}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#1B3A6B", fontWeight: 600 }}>
                          {log.transaction_id || `#${log.id}`}
                        </div>
                        <div style={{ fontSize: 10, color: "#CBD5E1", marginTop: 1 }}>id:{log.id}</div>
                      </td>

                      {/* Module */}
                      <td style={st.td}>
                        <div style={{ fontWeight: 600, color: "#1E293B", fontSize: 13 }}>{resolveModule(log)}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>{log.table_name || ""}</div>
                      </td>

                      {/* Record ref */}
                      <td style={{ ...st.td, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#64748B" }}>
                        {log.request_transaction_id ?? String(log.record_id ?? "—")}
                      </td>

                      {/* Action badge */}
                      <td style={st.td}>
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", background: astyle.bg, color: astyle.color, border: `1px solid ${astyle.border}` }}>
                          {action}
                        </span>
                      </td>

                      {/* Human summary — plain English sentence */}
                      <td style={{ ...st.td, maxWidth: 320 }}>
                        {/* Plain-English summary line */}
                        <div style={{ fontSize: 12, color: "#1E293B", lineHeight: 1.5, marginBottom: changes.length > 0 ? 6 : 0 }}>
                          {buildHumanSummary(log)}
                        </div>
                        {/* Diff chips below summary */}
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
                        {log.performed_by_designation && (
                          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>
                            {log.performed_by_designation}
                          </div>
                        )}
                      </td>

                      {/* Device / IP */}
                      <td style={st.td}>
                        <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{device}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>
                          {[log.browser || browser, log.os || os].filter(Boolean).join(" · ")}
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#94A3B8", marginTop: 1 }}>
                          {cleanIP(log.ip_address)}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={st.td}>
                        {log.approve_status ? (
                          <span style={{ fontWeight: 600, fontSize: 12, color: statusColor(log.approve_status) }}>
                            ● {log.approve_status}
                          </span>
                        ) : <span style={{ color: "#E2E8F0" }}>—</span>}
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