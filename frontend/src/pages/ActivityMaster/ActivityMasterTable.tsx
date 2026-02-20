import React, { useEffect, useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AppHeader from "../../components/Common/AppHeader";
import { fetchActivityLog } from "../../utils/api";
import addStyle from "../Plant/PlantMasterTable.module.css"

/* =============================================================================
   TYPES — handles ALL log variants:
   - Old CRUD: INSERT/UPDATE (uppercase action, no changes col, user_id=1)
   - New workflow: approve/update (lowercase, has changes+details+user_agent)
   - User/Task requests: has request metadata
============================================================================= */

interface ActivityLog {
  id: number;
  transaction_id?: string;
  table_name?: string;
  module?: string;
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
}

interface ChangeRow { field: string; from: string; to: string; }

/* =============================================================================
   HELPERS
============================================================================= */

const MODULE_MAP: Record<string, string> = {
  plant_master: "Plant",
  application_master: "Application",
  user_master: "User",
  user_requests: "User Request",
  task_requests: "Task Request",
  vendor_master: "Vendor",
  role_master: "Role",
  department_master: "Department",
  approvals: "Approvals",
  auth: "Auth",
};

const prettify = (s: string) =>
  (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const resolveModule = (log: ActivityLog): string => {
  const m = log.module || "";
  const t = log.table_name || "";
  return MODULE_MAP[m] || MODULE_MAP[t] || prettify(m || t) || "—";
};

const normalizeAction = (a?: string): string => (a || "").toUpperCase();

const formatDate = (d?: string): string => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
  } catch { return d; }
};

const cleanIP = (ip?: string | null): string =>
  ip ? ip.replace("::ffff:", "") : "—";

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
    return s === "{}" ? "—" : s.length > 50 ? s.substring(0, 50) + "…" : s;
  }
  return String(v);
};

const resolvePerformer = (log: ActivityLog): string => {
  if (log.details) {
    try {
      const d = JSON.parse(log.details);
      if (d.performed_by) return String(d.performed_by);
    } catch { }
  }
  return String(log.action_user_name || log.action_performed_by || log.user_id || "—");
};

// Skip noisy system fields from diff display
const SKIP_KEYS = new Set([
  "created_on", "updated_on", "last_sync", "last_seen_in_ad",
  "date_time_ist", "approver1_action_timestamp", "approver2_action_timestamp",
]);

const resolveChanges = (log: ActivityLog): ChangeRow[] => {
  const action = normalizeAction(log.action);

  // ── Priority 1: use changes column (accurate, pre-computed diff) ──
  if (log.changes) {
    try {
      const parsed = JSON.parse(log.changes);
      return Object.keys(parsed)
        .filter((k) => !SKIP_KEYS.has(k))
        .map((k) => ({
          field: prettify(k),
          from: safeVal(parsed[k]?.from),
          to: safeVal(parsed[k]?.to),
        }));
    } catch { }
  }

  // ── Priority 2: diff old_value vs new_value ──
  try {
    const oldObj = log.old_value ? JSON.parse(log.old_value) : {};
    const newObj = log.new_value ? JSON.parse(log.new_value) : {};

    if (action === "UPDATE" || action === "APPROVE" || action === "REJECT") {
      return Object.keys({ ...oldObj, ...newObj })
        .filter((k) => !SKIP_KEYS.has(k) && JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]))
        .map((k) => ({ field: prettify(k), from: safeVal(oldObj[k]), to: safeVal(newObj[k]) }));
    }

    if (action === "DELETE") {
      return Object.keys(oldObj)
        .filter((k) => !SKIP_KEYS.has(k))
        .map((k) => ({ field: prettify(k), from: safeVal(oldObj[k]), to: "Deleted" }));
    }

    if (action === "INSERT" || action === "CREATE") {
      // Show most informative fields for new records
      const PRIORITY = [
        "transaction_id", "display_name", "application_hmi_name", "vendor_name",
        "role_name", "department_name", "employee_name", "name", "status",
      ];
      const allKeys = Object.keys(newObj).filter((k) => !SKIP_KEYS.has(k));
      const sorted = [
        ...allKeys.filter((k) => PRIORITY.includes(k)),
        ...allKeys.filter((k) => !PRIORITY.includes(k)),
      ];
      return sorted.slice(0, 6).map((k) => ({ field: prettify(k), from: "—", to: safeVal(newObj[k]) }));
    }
  } catch { }

  return [];
};

/* =============================================================================
   ACTION BADGE STYLES
============================================================================= */

const ACTION_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  INSERT: { bg: "#DCFCE7", color: "#15803D", border: "#86EFAC" },
  CREATE: { bg: "#DCFCE7", color: "#15803D", border: "#86EFAC" },
  UPDATE: { bg: "#DBEAFE", color: "#1D4ED8", border: "#93C5FD" },
  DELETE: { bg: "#FEE2E2", color: "#B91C1C", border: "#FCA5A5" },
  APPROVE: { bg: "#DCFCE7", color: "#166534", border: "#6EE7B7" },
  REJECT: { bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5" },
  LOGIN: { bg: "#E0F2FE", color: "#0369A1", border: "#7DD3FC" },
  LOGOUT: { bg: "#FEF9C3", color: "#854D0E", border: "#FDE047" },
  VIEW: { bg: "#F1F5F9", color: "#475569", border: "#CBD5E1" },
  TASK_CLOSE: { bg: "#FEF3C7", color: "#B45309", border: "#FCD34D" },
  TASK_OPEN: { bg: "#E0F2FE", color: "#0369A1", border: "#7DD3FC" },
  USER_REQUEST: { bg: "#F5F3FF", color: "#6D28D9", border: "#C4B5FD" },
  TASK_REQUEST: { bg: "#FDF4FF", color: "#7E22CE", border: "#E9D5FF" },
};

const getActionStyle = (a?: string) =>
  ACTION_STYLE[normalizeAction(a)] || { bg: "#F8FAFC", color: "#64748B", border: "#CBD5E1" };

const STATUS_COLOR: Record<string, string> = {
  approved: "#15803D", completed: "#15803D",
  rejected: "#B91C1C", pending: "#D97706",
  active: "#0369A1", inactive: "#64748B",
};

const statusColor = (s?: string | null) =>
  STATUS_COLOR[(s || "").toLowerCase()] || "#64748B";

/* =============================================================================
   DETAIL MODAL
============================================================================= */

const Modal: React.FC<{ log: ActivityLog; onClose: () => void }> = ({ log, onClose }) => {
  const changes = resolveChanges(log);
  const action = normalizeAction(log.action);
  const isInsert = action === "INSERT" || action === "CREATE";

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.box} onClick={(e) => e.stopPropagation()}>

        <div style={ms.hdr}>
          <div>
            <div style={ms.hdrTitle}>Audit Record Detail</div>
            <div style={ms.hdrSub}>
              {log.transaction_id || `Log ID: ${log.id}`}
              &nbsp;·&nbsp;{resolveModule(log)}&nbsp;·&nbsp;{action}
            </div>
          </div>
          <button onClick={onClose} style={ms.closeBtn}>✕</button>
        </div>

        <div style={ms.body}>
          {/* Meta */}
          <div style={ms.metaGrid}>
            {[
              ["Transaction ID", log.transaction_id || `#${log.id}`],
              ["Module", resolveModule(log)],
              ["Table", log.table_name || "—"],
              ["Record ID", String(log.request_transaction_id || "—")],
              ["Action", action],
              ["Performed By", resolvePerformer(log)],
              ["Date / Time", formatDate(log.date_time_ist || log.created_on)],
              ["IP Address", cleanIP(log.ip_address)],
              ["Device", parseDevice(log.device, log.user_agent)],
              ["Browser", parseBrowser(log.user_agent) || "—"],
              ["OS", parseOS(log.user_agent) || "—"],
              ["Approval Status", log.approve_status || "—"],
              ["Comments", log.comments || "—"],
              ["Plant ID", String(log.plant_id || "—")],
            ].map(([k, v]) => (
              <div key={k} style={ms.metaItem}>
                <div style={ms.metaKey}>{k}</div>
                <div style={ms.metaVal}>{v}</div>
              </div>
            ))}
          </div>

          {/* Changes table */}
          {changes.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={ms.secTitle}>{isInsert ? "Record Created — Fields" : "Field Changes"}</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#1B3A6B" }}>
                    <th style={ms.chTh}>Field</th>
                    {!isInsert && <th style={{ ...ms.chTh, color: "#FCA5A5" }}>Before</th>}
                    <th style={{ ...ms.chTh, color: isInsert ? "#6EE7B7" : "#86EFAC" }}>
                      {isInsert ? "Value" : "After"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#F8FAFC" : "#fff" }}>
                      <td style={ms.chTd}><b>{c.field}</b></td>
                      {!isInsert && (
                        <td style={{ ...ms.chTd, color: "#B91C1C", fontFamily: "monospace", fontSize: 12 }}>{c.from}</td>
                      )}
                      <td style={{ ...ms.chTd, color: "#15803D", fontFamily: "monospace", fontSize: 12 }}>{c.to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* User agent */}
          {log.user_agent && (
            <div>
              <div style={ms.secTitle}>User Agent String</div>
              <div style={ms.uaBox}>{log.user_agent}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ms: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  box: { background: "#fff", borderRadius: 14, width: "100%", maxWidth: 860, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 30px 70px rgba(0,0,0,0.3)", border: "1px solid #E2E8F0" },
  hdr: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", background: "linear-gradient(135deg,#1B3A6B,#2563EB)", borderRadius: "14px 14px 0 0" },
  hdrTitle: { fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans',sans-serif" },
  hdrSub: { fontSize: 12, color: "#93C5FD", marginTop: 3 },
  closeBtn: { background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", cursor: "pointer", borderRadius: 6, padding: "4px 12px", fontSize: 16, fontWeight: 700 },
  body: { overflowY: "auto", padding: 24, flex: 1 },
  metaGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 24px", background: "#F8FAFC", borderRadius: 10, padding: 18, marginBottom: 20, border: "1px solid #E2E8F0" },
  metaItem: { display: "flex", flexDirection: "column", gap: 3 },
  metaKey: { fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" },
  metaVal: { fontSize: 13, color: "#1E293B", fontWeight: 500, wordBreak: "break-word" },
  secTitle: { fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, borderBottom: "2px solid #E2E8F0", paddingBottom: 6 },
  chTh: { textAlign: "left", padding: "9px 14px", color: "#fff", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" },
  chTd: { padding: "8px 14px", borderBottom: "1px solid #F1F5F9", verticalAlign: "top" },
  uaBox: { background: "#F1F5F9", borderRadius: 6, padding: "10px 14px", fontSize: 11, color: "#64748B", fontFamily: "monospace", wordBreak: "break-all", border: "1px solid #E2E8F0" },
};

/* =============================================================================
   MAIN COMPONENT
============================================================================= */

interface Filters { search: string; action: string; module: string; dateFrom: string; dateTo: string; }

/* ─── Date helpers ───────────────────────────────────────────────────────── */
const MAX_MONTHS = 6;
const TODAY_STR = new Date().toISOString().slice(0, 10);

/** Return a YYYY-MM-DD string offset by `months` from `dateStr` */
const addMonths = (dateStr: string, months: number): string => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  // Clamp to today — no future dates allowed
  if (d > new Date()) return TODAY_STR;
  return d.toISOString().slice(0, 10);
};

/** Return a YYYY-MM-DD string for N months ago, clamped to today */
const monthsAgoStr = (n: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};

/** Validate a from/to pair. Returns a warning string or "" */
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

/* ─── Default date range: last 1 month ──────────────────────────────────── */
const DEFAULT_FROM = monthsAgoStr(1);
const DEFAULT_TO   = TODAY_STR;

const ActivityMasterTable: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ActivityLog | null>(null);
  const [page, setPage] = useState(1);
  const PER = 15;

  /* ── Single unified filter state ──────────────────────────────────────── */
  const [filters, setFilters] = useState<Filters>({
    search:   "",
    action:   "",
    module:   "",
    dateFrom: DEFAULT_FROM,   // initialised to last 1 month
    dateTo:   DEFAULT_TO,
  });

  /* Derived warning — recomputed on every render, no extra state needed */
  const dateWarning = validateDateRange(filters.dateFrom, filters.dateTo);

  /* ── Fetch logs whenever date range changes ───────────────────────────── */
  useEffect(() => {
    if (dateWarning) return; // don't fetch with an invalid range
    setLoading(true);
    fetchActivityLog({ dateFrom: filters.dateFrom, dateTo: filters.dateTo })
      .then((data: ActivityLog[]) => { setLogs(data); setLoading(false); })
      .catch(() => { setLogs([]); setLoading(false); });
  }, [filters.dateFrom, filters.dateTo]); // re-fetch only when dates change

  const allActions = useMemo(() =>
    [...new Set(logs.map((l) => normalizeAction(l.action)).filter(Boolean))].sort(), [logs]);

  const allModules = useMemo(() =>
    [...new Set(logs.map(resolveModule).filter((m) => m !== "—"))].sort(), [logs]);

  /* ── Client-side filter (search, action, module) ─────────────────────── */
  const filtered = useMemo(() => logs.filter((log) => {
    if (filters.action && normalizeAction(log.action) !== filters.action) return false;
    if (filters.module && resolveModule(log) !== filters.module) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = [
        log.transaction_id, log.table_name, log.module,
        String(log.request_transaction_id || ""), log.comments, log.ip_address,
        resolvePerformer(log), resolveModule(log), log.action,
        log.approve_status, log.user_agent,
      ].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [logs, filters.search, filters.action, filters.module]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const pageData   = filtered.slice((page - 1) * PER, page * PER);

  /* ── Unified setFilter ────────────────────────────────────────────────── */
  const setFilter = (k: keyof Filters, v: string) => {
    setFilters((prev) => {
      const next = { ...prev, [k]: v };

      // ── Date guard: keep range within 6 months, no future dates ──
      if (k === "dateFrom") {
        // clamp To if it now exceeds 6 months after new From
        const maxTo = addMonths(v, MAX_MONTHS);
        if (next.dateTo > maxTo) next.dateTo = maxTo;
        // clamp To to today
        if (next.dateTo > TODAY_STR) next.dateTo = TODAY_STR;
      }
      if (k === "dateTo") {
        // clamp to today
        if (v > TODAY_STR) next.dateTo = TODAY_STR;
        // clamp From if it's now more than 6 months before new To
        const minFrom = addMonths(next.dateTo, -MAX_MONTHS);
        if (next.dateFrom < minFrom) next.dateFrom = minFrom;
      }

      return next;
    });
    setPage(1);
  };

  /* ── Clear all filters back to default ───────────────────────────────── */
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
      head: [["Txn ID", "Module", "Table", "Record", "Action", "Changes Summary", "Performed By", "IP", "Device", "Status", "Date / Time"]],
      body: filtered.map((l) => {
        const ch = resolveChanges(l);
        const cs = ch.slice(0, 3).map((c) => `${c.field}: ${c.from}→${c.to}`).join(" | ") || l.comments || "—";
        return [
          l.transaction_id || `#${l.id}`,
          resolveModule(l), l.table_name || "—", String(l.request_transaction_id || "—"),
          normalizeAction(l.action), cs, resolvePerformer(l),
          cleanIP(l.ip_address), parseDevice(l.device, l.user_agent),
          l.approve_status || "—", formatDate(l.date_time_ist || l.created_on),
        ];
      }),
      styles: { fontSize: 7, cellPadding: 4 },
      headStyles: { fillColor: [27, 58, 107], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [240, 247, 255] },
    });
    doc.save(`Audit_Trail_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // today count
  const todayCount = useMemo(() => logs.filter((l) => {
    const d = l.date_time_ist || l.created_on;
    return d && new Date(d).toDateString() === new Date().toDateString();
  }).length, [logs]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;}
        .al-row{transition:background .12s,box-shadow .12s;cursor:pointer;}
        .al-row:hover{background:#EFF6FF !important;box-shadow:inset 3px 0 0 #2563EB;}
        .alinp{height:36px;border:1.5px solid #CBD5E1;border-radius:8px;padding:0 12px;font-size:13px;font-family:'DM Sans',sans-serif;color:#1E293B;background:#fff;outline:none;transition:border .15s,box-shadow .15s;}
        .alinp:focus{border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.1);}
        .smallBtn {
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
}

.exportBtn {
  background: #1B3A6B;
  color: #fff;
  border: none;
}
        .pgbtn{height:32px;min-width:32px;padding:0 8px;border-radius:6px;font-size:12px;font-family:'DM Sans',sans-serif;cursor:pointer;border:1.5px solid #E2E8F0;background:#fff;color:#475569;transition:all .12s;font-weight:500;}
        .pgbtn:hover:not(:disabled){background:#EFF6FF;border-color:#93C5FD;color:#1D4ED8;}
        .pgbtn:disabled{opacity:.35;cursor:not-allowed;}
        .pgact{background:#1B3A6B !important;color:#fff !important;border-color:#1B3A6B !important;}
        .chip{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:4px;font-size:11px;font-family:'DM Sans',sans-serif;background:#F1F5F9;color:#475569;margin:1px;}
        .chip .frm{color:#B91C1C;}
        .chip .arr{color:#94A3B8;font-size:9px;}
        .chip .too{color:#15803D;}
      `}</style>

      <AppHeader title="Activity Log — Audit Trail" />

      <div style={p.page}>

        {/* Stats */}
        {/* <div style={p.statsRow}>
          {[
            ["Total Records",  logs.length,    "#1B3A6B"],
            ["Filtered",       filtered.length,"#2563EB"],
            ["Today",          todayCount,     "#0369A1"],
            ["Inserts/Creates",logs.filter(l=>["INSERT","CREATE"].includes(normalizeAction(l.action))).length,"#15803D"],
            ["Updates",        logs.filter(l=>normalizeAction(l.action)==="UPDATE").length,"#7C3AED"],
            ["Approvals",      logs.filter(l=>normalizeAction(l.action)==="APPROVE").length,"#B45309"],
          ].map(([lbl,val,col])=>(
            <div key={String(lbl)} style={p.statCard}>
              <div style={{fontSize:24,fontWeight:700,color:String(col),lineHeight:1,fontFamily:"'DM Sans',sans-serif"}}>{Number(val).toLocaleString()}</div>
              <div style={{fontSize:10,color:"#94A3B8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",marginTop:4}}>{lbl}</div>
            </div>
          ))}
        </div> */}

        {/* Filters */}
        <div className={addStyle.sixCol}>
          <input className="alinp" style={{ flex: 2, minWidth: 220 }}
            placeholder="🔍  Search transaction ID, module, record, IP, user…"
            value={filters.search} onChange={e => setFilter("search", e.target.value)} />

          <select className="alinp" style={{ minWidth: 140 }}
            value={filters.action} onChange={e => setFilter("action", e.target.value)}>
            <option value="">All Actions</option>
            {allActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select className="alinp" style={{ minWidth: 160 }}
            value={filters.module} onChange={e => setFilter("module", e.target.value)}>
            <option value="">All Modules</option>
            {allModules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {/* ── Date range filter ──────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

              {/* From Date */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap", width: 30 }}>From</span>
                <input
                  type="date"
                  className="alinp"
                  style={{ width: 145 }}
                  value={filters.dateFrom}
                  max={filters.dateTo || TODAY_STR}        // cannot be after To or future
                  min={filters.dateTo ? addMonths(filters.dateTo, -MAX_MONTHS) : undefined}
                  onChange={(e) => setFilter("dateFrom", e.target.value)}
                />
              </div>

              {/* To Date */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap", width: 30 }}>To</span>
                <input
                  type="date"
                  className="alinp"
                  style={{ width: 145 }}
                  value={filters.dateTo}
                  min={filters.dateFrom || undefined}        // cannot be before From
                  max={TODAY_STR}                            // cannot be in the future
                  onChange={(e) => setFilter("dateTo", e.target.value)}
                />
              </div>
            </div>

            {dateWarning && (
              <span style={{ fontSize: 11, color: "#B91C1C", marginTop: 2 }}>⚠ {dateWarning}</span>
            )}
          </div>

          <button className="smallBtn" onClick={clearFilters}>✕ Clear</button>

          <button
            className="smallBtn exportBtn"
            onClick={exportPDF}
          >
            ↓ Export PDF
          </button>
        </div>

        {/* Table */}
        <div style={p.tableCard}>
          <div style={p.tableHdr}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans',sans-serif" }}>Audit Trail</span>
              <span style={{ background: "rgba(255,255,255,.18)", color: "#fff", fontSize: 11, padding: "2px 12px", borderRadius: 20, fontWeight: 600 }}>
                {filtered.length.toLocaleString()} records
              </span>
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)", letterSpacing: "0.02em" }}>
              Click any row for full detail &nbsp;·&nbsp; 21 CFR Part 11 compliant audit log
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200, fontFamily: "'DM Sans',sans-serif" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Txn / ID", "Module", "Rec ID", "Action", "Changes (Diff)", "Performed By", "IP Address", "Device / OS", "Status", "Date & Time (IST)"].map(h => (
                    <th key={h} style={p.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={10}>
                    <div style={{ textAlign: "center", padding: 48, color: "#94A3B8", fontFamily: "'DM Sans',sans-serif" }}>
                      Loading audit logs…
                    </div>
                  </td></tr>
                )}
                {!loading && pageData.length === 0 && (
                  <tr><td colSpan={10}>
                    <div style={{ textAlign: "center", padding: 48, color: "#94A3B8" }}>No records match filters.</div>
                  </td></tr>
                )}

                {pageData.map((log, idx) => {
                  const action = normalizeAction(log.action);
                  const astyle = getActionStyle(log.action);
                  const changes = resolveChanges(log);
                  const isIns = action === "INSERT" || action === "CREATE";
                  const device = parseDevice(log.device, log.user_agent);
                  const os = parseOS(log.user_agent);
                  const browser = parseBrowser(log.user_agent);

                  return (
                    <tr key={log.id} className="al-row"
                      style={{ background: idx % 2 === 0 ? "#fff" : "#F8FAFC" }}
                      onClick={() => setSelected(log)}>

                      {/* Txn */}
                      <td style={p.td}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#1B3A6B", fontWeight: 600, lineHeight: 1.3 }}>
                          {log.transaction_id || `#${log.id}`}
                        </div>
                        <div style={{ fontSize: 10, color: "#CBD5E1", marginTop: 1 }}>id:{log.id}</div>
                      </td>

                      {/* Module */}
                      <td style={p.td}>
                        <div style={{ fontWeight: 600, color: "#1E293B", fontSize: 13 }}>{resolveModule(log)}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8" }}>{log.table_name || ""}</div>
                      </td>

                      {/* Record ID */}
                      <td style={{ ...p.td, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#64748B" }}>
                        {log.request_transaction_id ?? "-"}
                      </td>

                      {/* Action */}
                      <td style={p.td}>
                        <span style={{
                          display: "inline-block", padding: "3px 10px", borderRadius: 5,
                          fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                          background: astyle.bg, color: astyle.color, border: `1px solid ${astyle.border}`
                        }}>
                          {action}
                        </span>
                      </td>

                      {/* Changes */}
                      <td style={{ ...p.td, maxWidth: 280 }}>
                        {changes.length === 0 ? (
                          <span style={{ color: "#CBD5E1", fontSize: 11, fontStyle: "italic" }}>
                            {log.comments?.substring(0, 55) || "—"}
                          </span>
                        ) : (
                          <div>
                            {changes.slice(0, 3).map((c, i) => (
                              <span key={i} className="chip">
                                <span style={{ fontWeight: 600, color: "#374151" }}>{c.field}</span>
                                {!isIns && <>
                                  <span className="frm">&nbsp;{String(c.from).substring(0, 12)}</span>
                                  <span className="arr">▶</span>
                                </>}
                                <span className="too">{String(c.to).substring(0, 12)}</span>
                              </span>
                            ))}
                            {changes.length > 3 && (
                              <span style={{ fontSize: 10, color: "#94A3B8", marginLeft: 4 }}>
                                +{changes.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Performer */}
                      <td style={p.td}>
                        <div style={{ fontWeight: 500, color: "#1E293B", fontSize: 13 }}>{resolvePerformer(log)}</div>
                      </td>

                      {/* IP */}
                      <td style={{ ...p.td, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#64748B" }}>
                        {cleanIP(log.ip_address)}
                      </td>

                      {/* Device */}
                      <td style={p.td}>
                        <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{device}</div>
                        {(browser || os) && (
                          <div style={{ fontSize: 10, color: "#94A3B8" }}>
                            {[browser, os].filter(Boolean).join(" / ")}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={p.td}>
                        {log.approve_status ? (
                          <span style={{ fontWeight: 600, fontSize: 12, color: statusColor(log.approve_status) }}>
                            ● {log.approve_status}
                          </span>
                        ) : <span style={{ color: "#E2E8F0" }}>—</span>}
                      </td>

                      {/* Date */}
                      <td style={{ ...p.td, fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                        {formatDate(log.date_time_ist || log.created_on)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={p.pgRow}>
            <span style={{ fontSize: 12, color: "#94A3B8" }}>
              Showing {filtered.length === 0 ? 0 : (page - 1) * PER + 1}–{Math.min(page * PER, filtered.length)} of {filtered.length.toLocaleString()} records
            </span>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button className="pgbtn" onClick={() => setPage(1)} disabled={page === 1} title="First">«</button>
              <button className="pgbtn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
              {(() => {
                const pages: number[] = [];
                let start = Math.max(1, page - 2);
                let end = Math.min(totalPages, start + 4);
                if (end - start < 4) start = Math.max(1, end - 4);
                for (let i = start; i <= end; i++) pages.push(i);
                return pages.map((pg) => (
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

/* =============================================================================
   STYLES
============================================================================= */

const p: Record<string, React.CSSProperties> = {
  page: { fontFamily: "'DM Sans',sans-serif", background: "#EEF2F9", minHeight: "100vh", padding: "59px 24px 48px" },
  statsRow: { display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" },
  statCard: { background: "#fff", borderRadius: 10, padding: "14px 20px", border: "1px solid #E2E8F0", flex: 1, minWidth: 110, boxShadow: "0 1px 6px rgba(0,0,0,.06)" },
  filterBar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", background: "#fff", borderRadius: 10, padding: "12px 16px", border: "1px solid #E2E8F0", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,.06)" },
  tableCard: { background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(27,58,107,.1)", overflow: "hidden" },
  tableHdr: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "linear-gradient(135deg,#1B3A6B 0%,#2563EB 100%)" },
  th: { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #E2E8F0", whiteSpace: "nowrap", background: "#F8FAFC" },
  td: { padding: "11px 14px", fontSize: 13, color: "#1E293B", borderBottom: "1px solid #F1F5F9", verticalAlign: "middle" },
  pgRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid #F1F5F9", background: "#FAFBFF" },
};

export default ActivityMasterTable;