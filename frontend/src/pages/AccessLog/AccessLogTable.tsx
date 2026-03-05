import React, { useEffect, useRef, useState, useCallback } from "react";
import { FileText } from "lucide-react";
import jsPDF from "jspdf";
import { useAuth } from "../../context/AuthContext";
import autoTable from "jspdf-autotable";
import styles from "../Plant/PlantMasterTable.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { fetchAccessLogs, fetchActivityLogs } from "../../utils/api";
import { useDebounce } from "../../hooks/useDebounce";
import AppHeader from "../../components/Common/AppHeader";

/* -------------------- Types -------------------- */
interface AccessLog {
  id: number;
  user_request_id: number;
  task_id: number | null;
  ritm_transaction_id: string;
  task_transaction_id: string | null;
  request_for_by: string;
  name: string;
  employee_code: string;
  employee_location: string;
  assigned_to_name: string;
  access_request_type: string;
  training_status: string;
  access: string;
  vendor_firm: string | null;
  vendor_code: string | null;
  vendor_name: string | null;
  vendor_allocated_id: number | null;
  user_request_type: string;
  from_date: string;
  to_date: string;
  user_request_status: string;
  task_status: string;
  application_equip_id: number | null;
  application_name?: string;
  department: number | null;
  department_name?: string;
  role: number | null;
  role_name?: string;
  location: number | null;
  location_name?: string;
  reports_to: string | null;
  approver1_status: string;
  approver2_status: string;
  approver1_email: string | null;
  approver2_email: string | null;
  approver1_name: string | null;
  approver2_name: string | null;
  approver1_action: string | null;
  approver2_action: string | null;
  approver1_timestamp: string | null;
  approver2_timestamp: string | null;
  approver1_comments: string | null;
  approver2_comments: string | null;
  created_on: string;
  // ✅ NEW: from task_request table
  task_updated_on: string | null;
  approver1_action_date: string | null;   // formatted HH:MM from task_request
  approver2_action_date: string | null;   // formatted HH:MM from task_request
  // ✅ NEW: from user_requests table
  request_completed_at: string | null;
  request_created_on:string|null;
  remarks: string | null;
}

interface ActivityLog {
  id: number;
  action: string;
  old_value: string | null;
  new_value: string | null;
  action_performed_by: string;
  approve_status: string;
  date_time_ist: string;
  comments: string;
}

/* -------------------- Helpers -------------------- */
const fmtDateTime = (val: string | null | undefined): string => {
  if (!val) return "--";
  return new Date(val.replace(" ", "T")).toLocaleString("en-GB");
};

const fmtDate = (val: string | null | undefined): string => {
  if (!val) return "--";
  return new Date(val.replace(" ", "T")).toLocaleDateString("en-GB");
};

/* -------------------- Component -------------------- */
const AccessLogTable: React.FC = () => {
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [filterColumn, setFilterColumn] = useState("name");
  const [filterValue, setFilterValue] = useState("");
  const [tempFilterColumn, setTempFilterColumn] = useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = useState(filterValue);
  const debouncedFilterValue = useDebounce(filterValue, 500);

  // Client-side filters
  const [filterPlant, setFilterPlant] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterApplication, setFilterApplication] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterAccess, setFilterAccess] = useState("");

  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLog, setActivityLog] = useState<{ ritm: string; logs: ActivityLog[] } | null>(null);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  /* -------------------- Fetch Access Logs -------------------- */
  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const result = await fetchAccessLogs({
          page: currentPage,
          limit: rowsPerPage,
          search: filterColumn,
          value: debouncedFilterValue,
        });
        setAccessLogs(Array.isArray(result) ? result : []);
        setTotalRecords(Array.isArray(result) ? result.length : 0);
      } catch (err) {
        console.error("Failed to fetch access logs", err);
        setError("Failed to load access logs");
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [currentPage, filterColumn, debouncedFilterValue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilterValue, filterColumn]);

  /* -------------------- Outside Click -------------------- */
  useEffect(() => {
    if (!showFilterPopover) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowFilterPopover(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilterPopover]);

  /* -------------------- Client-side Filter Logic -------------------- */
  const filteredLogs = accessLogs.filter((log) => {
    const plantMatch = !filterPlant ||
      (log.location_name ?? String(log.location ?? "")).toLowerCase().includes(filterPlant.toLowerCase());
    const deptMatch = !filterDepartment ||
      (log.department_name ?? String(log.department ?? "")).toLowerCase().includes(filterDepartment.toLowerCase());
    const appMatch = !filterApplication ||
      (log.application_name ?? String(log.application_equip_id ?? "")).toLowerCase().includes(filterApplication.toLowerCase());
    const roleMatch = !filterRole ||
      (log.role_name ?? String(log.role ?? "")).toLowerCase().includes(filterRole.toLowerCase());
    const accessMatch = !filterAccess ||
      (log.access ?? "").toLowerCase() === filterAccess.toLowerCase();
    return plantMatch && deptMatch && appMatch && roleMatch && accessMatch;
  });

  // Derive unique options from loaded data
  const uniquePlants = Array.from(new Set(
    accessLogs.map((l) => l.location_name ?? String(l.location ?? "")).filter(Boolean)
  )).sort();

  const uniqueDepartments = Array.from(new Set(
    accessLogs.map((l) => l.department_name ?? String(l.department ?? "")).filter(Boolean)
  )).sort();

  const uniqueApplications = Array.from(new Set(
    accessLogs.map((l) => l.application_name ?? String(l.application_equip_id ?? "")).filter(Boolean)
  )).sort();

  const uniqueRoles = Array.from(new Set(
    accessLogs.map((l) => l.role_name ?? String(l.role ?? "")).filter(Boolean)
  )).sort();

  const uniqueAccess = Array.from(new Set(
    accessLogs.map((l) => l.access ?? "").filter(Boolean)
  )).sort();

  /* -------------------- Activity Logs -------------------- */
  const handleActivityClick = async (log: AccessLog) => {
    try {
      setShowActivityModal(true);
      setActivityLog(null);
      const data = await fetchActivityLogs(log.ritm_transaction_id);
      setActivityLog({ ritm: log.ritm_transaction_id, logs: data || [] });
    } catch (err) {
      console.error("Failed to load activity logs", err);
      alert("Failed to load activity logs");
      setShowActivityModal(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────
     PDF EXPORT  –  A4 Landscape, single table, all 27 columns visible
     Key fix: NO tableWidth prop — jsPDF uses exact cellWidth values.
              Column widths are mathematically verified to sum = PW - 2*M.
  ───────────────────────────────────────────────────────────────────────── */
  const handleExportPDF = useCallback(async () => {
    const jsPDF     = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    const doc      = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const today    = new Date();
    const fileName = `AccessLogReport_${today.toISOString().split("T")[0]}.pdf`;
    const PW       = doc.internal.pageSize.getWidth();   // 297 mm
    const PH       = doc.internal.pageSize.getHeight();  // 210 mm
    const M        = 6;    // left/right margin
    const HDR      = 15;   // header bar height
    const FOOT_H   = 14;   // footer zone height (abbrev legend + page line)
    // Usable table width = 297 - 6 - 6 = 285 mm
    // Column widths below are verified to sum exactly to 285.

    // ── 1. Pre-load logo → dataURL so drawHeader stays synchronous ───────────
    let logoUrl = "";
    let logoW   = 0;
    let logoH   = 0;
    if (login_headTitle2) {
      try {
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const el = new Image();
          el.crossOrigin = "anonymous";
          el.onload  = () => res(el);
          el.onerror = rej;
          el.src     = login_headTitle2;
        });
        const cvs = document.createElement("canvas");
        cvs.width  = img.width;
        cvs.height = img.height;
        cvs.getContext("2d")!.drawImage(img, 0, 0);
        logoUrl = cvs.toDataURL("image/png");
        const sc = (HDR * 0.62) / img.height;
        logoW    = img.width  * sc;
        logoH    = img.height * sc;
      } catch { /* logo optional */ }
    }

    const byName    = (user && (user.name || user.username)) || "Unknown";
    const exportTxt = `Exported by: ${byName}   ${today.toLocaleDateString("en-GB")}  ${today.toLocaleTimeString()}`;

    // ── 2. Sync header painter ────────────────────────────────────────────────
    const drawHeader = () => {
      doc.setFillColor(0, 82, 155);
      doc.rect(0, 0, PW, HDR, "F");
      doc.setDrawColor(70, 130, 210);
      doc.setLineWidth(0.5);
      doc.line(0, HDR, PW, HDR);

      if (logoUrl) {
        doc.addImage(logoUrl, "PNG", M, (HDR - logoH) / 2, logoW, logoH);
      }
      const titleX = logoUrl ? M + logoW + 3 : M;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("Access Log Report", titleX, HDR / 2 + 3.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(195, 220, 250);
      doc.text(exportTxt, PW - M - doc.getTextWidth(exportTxt), HDR / 2 + 3);
    };

    // ── 3. Sync footer painter (abbreviation legend + page placeholder) ───────
    //   Abbreviations used in column headers:
    const ABBREVS = [
      "Req For* = Requested For",
      "Vnd* = Vendor",
      "Dept* = Department",
      "Rpts To* = Reports To",
      "Usr Type* = User Type",
      "Req Sts* = Request Status",
      "Task Sts* = Task Status",
      "Appr* = Approver",
      "Req* = Request",
    ];

    const drawFooter = (pageNum: number) => {
      // Separator line
      doc.setDrawColor(200, 210, 225);
      doc.setLineWidth(0.25);
      doc.line(M, PH - FOOT_H, PW - M, PH - FOOT_H);

      // Abbreviation legend — two rows of 4
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.8);
      doc.setTextColor(100, 100, 100);
      const row1 = ABBREVS.slice(0, 4).join("   |   ");
      const row2 = ABBREVS.slice(4).join("   |   ");
      doc.text(row1, M, PH - FOOT_H + 4);
      doc.text(row2, M, PH - FOOT_H + 8);

      // Company left, page right
      doc.setFontSize(7);
      doc.setTextColor(110, 110, 110);
      doc.text("Unichem Laboratories  |  Confidential", M, PH - 3);
      // placeholder — overwritten after render with correct total
      doc.text(`Page ${pageNum}`, PW - M - doc.getTextWidth(`Page ${pageNum}`), PH - 3);
    };

    // ── 4. Filter banner on page 1 ────────────────────────────────────────────
    const activeFilters = [
      filterPlant       && `Plant: ${filterPlant}`,
      filterDepartment  && `Dept: ${filterDepartment}`,
      filterApplication && `App: ${filterApplication}`,
      filterRole        && `Role: ${filterRole}`,
      filterAccess      && `Access: ${filterAccess}`,
    ].filter(Boolean).join("   |   ");

    drawHeader();
    let startY = HDR + 2;
    if (activeFilters) {
      doc.setFillColor(235, 243, 255);
      doc.roundedRect(M, startY, PW - M * 2, 7, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(20, 60, 150);
      doc.text(`Filters:  ${activeFilters}`, M + 3, startY + 4.8);
      doc.setFont("helvetica", "normal");
      startY += 9;
    }

    // ── 5. Build data rows ────────────────────────────────────────────────────
    const shortApp = (v: string | null | undefined, fb: any): string => {
      const s = v ?? String(fb ?? "-");
      const i = s.indexOf(" | v");
      return i > 0 ? s.substring(0, i) : s;
    };
    const apprCell = (
      name: string | null, status: string,
      action: string | null, date: string | null,
    ) => {
      const n  = name || status || "-";
      const dt = date || "";
      const ac = action || "";
      return dt ? `${n}\n${[ac, dt].filter(Boolean).join(" ")}` : n;
    };

    const rows = filteredLogs.map((log) => [
      log.ritm_transaction_id                                      || "-",
      log.task_transaction_id                                      || "-",
      log.request_for_by                                           || "-",
      log.name                                                     || "-",
      log.employee_code                                            || "-",
      log.employee_location                                        || "-",
      log.access_request_type                                      || "-",
      log.vendor_firm                                              || "-",
      log.vendor_code                                              || "-",
      log.vendor_name                                              || "-",
      log.location_name   ?? String(log.location   ?? "-"),
      log.department_name ?? String(log.department ?? "-"),
      shortApp(log.application_name, log.application_equip_id),
      log.role_name       ?? String(log.role       ?? "-"),
      log.reports_to                                               || "-",
      log.access                                                   || "-",
      log.assigned_to_name                                         || "-",
      log.user_request_type                                        || "-",
      fmtDate(log.from_date),
      fmtDate(log.to_date),
      log.user_request_status                                      || "-",
      log.task_status                                              || "-",
      apprCell(log.approver1_name, log.approver1_status, log.approver1_action, log.approver1_action_date),
      apprCell(log.approver2_name, log.approver2_status, log.approver2_action, log.approver2_action_date),
      fmtDateTime(log.request_created_on),
      fmtDateTime(log.task_updated_on),
      fmtDateTime(log.request_completed_at),
    ]);

    // ── 6. Column widths — VERIFIED sum = 285 (= 297 - 6 - 6) ───────────────
    //   DO NOT add tableWidth — jsPDF respects exact cellWidth values only
    //   when tableWidth is absent. With tableWidth set, columns get scaled
    //   proportionally and rightmost columns overflow or get clipped.
    //
    //   Σ = 13+12+9+13+9+9+11+11+10+9+11+12+13+9+9+8+11+8+9+9+9+9+14+14+12+11+11 = 285 ✓
    const COL: Record<number, { cellWidth: number }> = {
      0:  { cellWidth: 13 },  // RITM No.
      1:  { cellWidth: 12 },  // Task No.
      2:  { cellWidth:  9 },  // Req For*
      3:  { cellWidth: 13 },  // Name
      4:  { cellWidth:  9 },  // Emp Code
      5:  { cellWidth:  9 },  // Location
      6:  { cellWidth: 11 },  // Access Type
      7:  { cellWidth: 11 },  // Vnd* Firm
      8:  { cellWidth: 10 },  // Vnd* Code
      9:  { cellWidth:  9 },  // Vnd* Name
      10: { cellWidth: 11 },  // Plant
      11: { cellWidth: 12 },  // Dept*
      12: { cellWidth: 13 },  // Application
      13: { cellWidth:  9 },  // Role
      14: { cellWidth:  9 },  // Rpts To*
      15: { cellWidth:  8 },  // Access
      16: { cellWidth: 11 },  // Assigned
      17: { cellWidth:  8 },  // Usr Type*
      18: { cellWidth:  9 },  // From
      19: { cellWidth:  9 },  // To
      20: { cellWidth:  9 },  // Req Sts*
      21: { cellWidth:  9 },  // Task Sts*
      22: { cellWidth: 14 },  // Appr* 1
      23: { cellWidth: 14 },  // Appr* 2
      24: { cellWidth: 12 },  // Created
      25: { cellWidth: 11 },  // Updated
      26: { cellWidth: 11 },  // Completed
    };

    // ── 7. Render table ───────────────────────────────────────────────────────
    autoTable(doc, {
      head: [[
        "RITM No.", "Task No.", "Req For*", "Name", "Emp Code", "Location",
        "Access Type", "Vnd* Firm", "Vnd* Code", "Vnd* Name",
        "Plant", "Dept*", "Application", "Role", "Rpts To*",
        "Access", "Assigned", "Usr Type*", "From", "To",
        "Req Sts*", "Task Sts*",
        "Appr* 1", "Appr* 2",
        "Req* Created", "Task Updated", "Req* Completed",
      ]],
      body: rows,
      startY,
      // ── NO tableWidth — this is the critical fix ──────────────────────────
      styles: {
        fontSize:    5.8,
        cellPadding: { top: 2, right: 1.2, bottom: 2, left: 1.2 },
        halign:      "left"      as const,
        valign:      "top"       as const,
        textColor:   [25, 25, 25]    as [number, number, number],
        lineColor:   [210, 218, 228] as [number, number, number],
        lineWidth:   0.13,
        overflow:    "linebreak" as const,
      },
      headStyles: {
        fillColor:   [11, 99, 206]   as [number, number, number],
        textColor:   [255, 255, 255] as [number, number, number],
        fontStyle:   "bold"   as const,
        fontSize:    6,
        halign:      "center" as const,
        valign:      "middle" as const,
        cellPadding: { top: 2.5, right: 1.2, bottom: 2.5, left: 1.2 },
      },
      alternateRowStyles: { fillColor: [244, 247, 254] as [number, number, number] },
      margin: { top: HDR + 2, left: M, right: M, bottom: FOOT_H + 2 },
      columnStyles: COL,
      didDrawPage: (data) => {     // ← fully synchronous, no TS error
        drawHeader();
        drawFooter(data.pageNumber);
      },
    });

    // ── 8. Second pass: replace "Page N" with "Page N of Total" ─────────────
    const pageCount = (doc as any).getNumberOfPages?.() ?? 1;
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFillColor(255, 255, 255);
      doc.rect(PW - M - 32, PH - 6, 32, 5, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(110, 110, 110);
      const pg = `Page ${p} of ${pageCount}`;
      doc.text(pg, PW - M - doc.getTextWidth(pg), PH - 3);
    }

    doc.save(fileName);
  }, [filteredLogs, user, filterPlant, filterDepartment, filterApplication, filterRole, filterAccess]);

  const handleExportActivityPDF = () => {
    if (!activityLog) return;
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(16);
    doc.text(`Activity Log - ${activityLog.ritm}`, 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [["Action", "Old Value", "New Value", "Performed By", "Status", "Date / Time", "Comments"]],
      body: activityLog.logs.map((log) => [
        log.action, log.old_value ?? "", log.new_value ?? "",
        log.action_performed_by, log.approve_status,
        fmtDateTime(log.date_time_ist),
        log.comments ?? "",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [11, 99, 206] },
    });
    doc.save(`activity_log_${activityLog.ritm}.pdf`);
  };

  /* -------------------- Pagination -------------------- */
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / rowsPerPage));
  const pageData = filteredLogs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  /* -------------------- Shared select style -------------------- */
  const selectStyle: React.CSSProperties = {
    padding: "5px 10px",
    fontSize: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "5px",
    backgroundColor: "#f8fafc",
    color: "#1e293b",
    minWidth: "130px",
    cursor: "pointer",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: "#475569",
    whiteSpace: "nowrap",
  };

  const dividerStyle: React.CSSProperties = {
    width: "1px",
    height: "28px",
    backgroundColor: "#e2e8f0",
    flexShrink: 0,
  };

  /* -------------------- Render -------------------- */
  if (loading) return <div style={{ padding: 24, textAlign: "center" }}>Loading...</div>;
  if (error) return <div style={{ padding: 24, color: "red" }}>{error}</div>;

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Access Log Management" />

      <div className={styles.contentArea}>

        {/* Compact Enterprise Filter Bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 16px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          flexWrap: "nowrap",
          overflowX: "auto",
          marginBottom: "12px",
          border: "1px solid #e2e8f0",
        }}>

          {/* Plant */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={labelStyle}>Plant</label>
            <select value={filterPlant} onChange={(e) => { setFilterPlant(e.target.value); setCurrentPage(1); }} style={selectStyle}>
              <option value="">-- All --</option>
              {uniquePlants.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div style={dividerStyle} />

          {/* Department */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={labelStyle}>Department</label>
            <select value={filterDepartment} onChange={(e) => { setFilterDepartment(e.target.value); setCurrentPage(1); }} style={selectStyle}>
              <option value="">-- All --</option>
              {uniqueDepartments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={dividerStyle} />

          {/* Application */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={labelStyle}>Application</label>
            <select value={filterApplication} onChange={(e) => { setFilterApplication(e.target.value); setCurrentPage(1); }} style={selectStyle}>
              <option value="">-- All --</option>
              {uniqueApplications.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div style={dividerStyle} />

          {/* Role */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={labelStyle}>Role</label>
            <select value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }} style={selectStyle}>
              <option value="">-- All --</option>
              {uniqueRoles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div style={dividerStyle} />

          {/* Access */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={labelStyle}>Access</label>
            <select value={filterAccess} onChange={(e) => { setFilterAccess(e.target.value); setCurrentPage(1); }} style={selectStyle}>
              <option value="">-- All --</option>
              {uniqueAccess.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Clear Filters */}
          {(filterPlant || filterDepartment || filterApplication || filterRole || filterAccess) && (
            <button
              onClick={() => {
                setFilterPlant("");
                setFilterDepartment("");
                setFilterApplication("");
                setFilterRole("");
                setFilterAccess("");
                setCurrentPage(1);
              }}
              style={{
                padding: "5px 12px", fontSize: "12px", fontWeight: 600,
                backgroundColor: "#fff5f5", color: "#dc2626",
                border: "1px solid #fca5a5", borderRadius: "5px",
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              ✕ Clear
            </button>
          )}

          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            disabled={filteredLogs.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 14px", fontSize: "12px", fontWeight: 600,
              backgroundColor: filteredLogs.length === 0 ? "#e2e8f0" : "#ecfdf5",
              color: filteredLogs.length === 0 ? "#94a3b8" : "#059669",
              border: `1px solid ${filteredLogs.length === 0 ? "#e2e8f0" : "#059669"}`,
              borderRadius: "5px",
              cursor: filteredLogs.length === 0 ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <FileText size={14} />
            Export PDF
          </button>

        </div>

        {/* Table */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2>Access Log Records</h2>
            <span className={styles.recordCount}>
              {filteredLogs.length} Records
              {(filterPlant || filterDepartment || filterApplication || filterRole || filterAccess) && (
                <span style={{ color: "#6366f1", marginLeft: 6, fontSize: 11 }}>(filtered)</span>
              )}
            </span>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>RITM</th>
                  <th>Task</th>
                  <th>Req For</th>
                  <th>Req Name</th>
                  <th>Req Emp Code</th>
                  <th>Req Emp Location</th>
                  <th>Access Req Type</th>
                  <th>Vendor Firm</th>
                  <th>Vendor Code</th>
                  <th>Vendor Name</th>
                  <th>Vendor Allocated ID</th>
                  <th>Plant</th>
                  <th>Department</th>
                  <th>Application</th>
                  <th>Role</th>
                  <th>Reports To</th>
                  <th>Access</th>
                  <th>Assigned Name</th>
                  <th>User Request Type</th>
                  <th>From Date</th>
                  <th>To Date</th>
                  <th>Req Status</th>
                  <th>Task Status</th>
                  {/* ✅ UPDATED: Appr columns now show name + timestamp */}
                  <th>Appr 1 (Date &amp; Time)</th>
                  <th>Appr 2 (Date &amp; Time)</th>
                  <th>Req Created</th>
                  {/* ✅ NEW columns */}
                  <th>Task  Updated</th>
                  <th>Req Completed At</th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={28} style={{ textAlign: "center", padding: 24 }}>
                      No records found
                    </td>
                  </tr>
                ) : (
                  pageData.map((log) => (
                    <tr key={log.id}>
                      <td>{log.ritm_transaction_id}</td>
                      <td>{log.task_transaction_id ?? "-"}</td>
                      <td>{log.request_for_by}</td>
                      <td>{log.name}</td>
                      <td>{log.employee_code}</td>
                      <td>{log.employee_location}</td>
                      <td>{log.access_request_type}</td>
                      <td>{log.vendor_firm ?? "-"}</td>
                      <td>{log.vendor_code ?? "-"}</td>
                      <td>{log.vendor_name ?? "-"}</td>
                      <td>{log.vendor_allocated_id ?? "-"}</td>
                      <td>{log.location_name ?? log.location ?? "-"}</td>
                      <td>{log.department_name ?? log.department ?? "-"}</td>
                      <td>{log.application_name ?? log.application_equip_id ?? "-"}</td>
                      <td>{log.role_name ?? log.role ?? "-"}</td>
                      <td>{log.reports_to ?? "-"}</td>
                      <td>{log.access ?? "-"}</td>
                      <td>{log.assigned_to_name ?? "-"}</td>
                      <td>{log.user_request_type ?? "-"}</td>
                      <td>{fmtDate(log.from_date)}</td>
                      <td>{fmtDate(log.to_date)}</td>
                      <td>{log.user_request_status}</td>
                      <td>{log.task_status}</td>

                      {/* ✅ Approver 1: name on top, HH:MM action date below */}
                      <td>
                        {log.approver1_name ? (
                          <div>
                            <div style={{ fontWeight: 500 }}>{log.approver1_name}</div>
                            {log.approver1_action_date && (
                              <div style={{ fontSize: "11px", color: "#6b7280", marginTop: 2 }}>
                                {log.approver1_action_date}
                              </div>
                            )}
                          </div>
                        ) : (
                          log.approver1_status ?? "-"
                        )}
                      </td>

                      {/* ✅ Approver 2: name on top, HH:MM action date below */}
                      <td>
                        {log.approver2_name ? (
                          <div>
                            <div style={{ fontWeight: 500 }}>{log.approver2_name}</div>
                            {log.approver2_action_date && (
                              <div style={{ fontSize: "11px", color: "#6b7280", marginTop: 2 }}>
                                {log.approver2_action_date}
                              </div>
                            )}
                          </div>
                        ) : (
                          log.approver2_status ?? "-"
                        )}
                      </td>

                      <td>{fmtDateTime(log.request_created_on)}</td>

                      {/* ✅ NEW: task_request.updated_on */}
                      <td>{fmtDateTime(log.task_updated_on)}</td>

                      {/* ✅ NEW: user_requests.completed_at */}
                      <td>{fmtDateTime(log.request_completed_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{
            marginTop: 20, paddingBottom: 24,
            display: "flex", justifyContent: "center",
            alignItems: "center", gap: 6, flexWrap: "wrap",
            fontFamily: "Segoe UI, Roboto, sans-serif", fontSize: 14,
          }}>
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d0d5dd", backgroundColor: currentPage === 1 ? "#f9fafb" : "#ffffff", color: currentPage === 1 ? "#cbd5e1" : "#344054", cursor: currentPage === 1 ? "not-allowed" : "pointer", minWidth: 40 }}>
              {"<<"}
            </button>
            <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d0d5dd", backgroundColor: currentPage === 1 ? "#f9fafb" : "#ffffff", color: currentPage === 1 ? "#cbd5e1" : "#344054", cursor: currentPage === 1 ? "not-allowed" : "pointer", minWidth: 40 }}>
              Prev
            </button>

            {(() => {
              const pageButtons = [];
              const maxPagesToShow = 5;
              let start = Math.max(1, currentPage - 2);
              let end = Math.min(totalPages, start + maxPagesToShow - 1);
              if (end - start < maxPagesToShow - 1) start = Math.max(1, end - maxPagesToShow + 1);
              if (start > 1) {
                pageButtons.push(<button key={1} onClick={() => setCurrentPage(1)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d0d5dd", backgroundColor: "#ffffff", color: "#344054", cursor: "pointer", minWidth: 40 }}>1</button>);
                if (start > 2) pageButtons.push(<span key="el" style={{ padding: "6px 10px", color: "#999" }}>...</span>);
              }
              for (let i = start; i <= end; i++) {
                pageButtons.push(
                  <button key={i} onClick={() => setCurrentPage(i)} style={{ padding: "6px 10px", borderRadius: 6, border: i === currentPage ? "1px solid #007bff" : "1px solid #d0d5dd", backgroundColor: i === currentPage ? "#007bff" : "#ffffff", color: i === currentPage ? "#fff" : "#344054", cursor: "pointer", minWidth: 40 }}>{i}</button>
                );
              }
              if (end < totalPages) {
                if (end < totalPages - 1) pageButtons.push(<span key="er" style={{ padding: "6px 10px", color: "#999" }}>...</span>);
                pageButtons.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} style={{ padding: "6px 10px", borderRadius: 6, border: currentPage === totalPages ? "1px solid #007bff" : "1px solid #d0d5dd", backgroundColor: currentPage === totalPages ? "#007bff" : "#ffffff", color: currentPage === totalPages ? "#fff" : "#344054", cursor: "pointer", minWidth: 40 }}>{totalPages}</button>);
              }
              return pageButtons;
            })()}

            <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d0d5dd", backgroundColor: currentPage === totalPages || totalPages === 0 ? "#f9fafb" : "#ffffff", color: currentPage === totalPages || totalPages === 0 ? "#cbd5e1" : "#344054", cursor: currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer", minWidth: 40 }}>
              Next
            </button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d0d5dd", backgroundColor: currentPage === totalPages || totalPages === 0 ? "#f9fafb" : "#ffffff", color: currentPage === totalPages || totalPages === 0 ? "#cbd5e1" : "#344054", cursor: currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer", minWidth: 40 }}>
              {">>"}
            </button>
          </div>
        </div>

        {/* Activity Modal */}
        {showActivityModal && (
          <div className={styles.panelOverlay}>
            <div className={styles.panelWrapper}>
              {!activityLog ? (
                <div style={{ padding: 24, textAlign: "center" }}>Loading...</div>
              ) : (
                <>
                  <h3>Activity Log – {activityLog.ritm}</h3>
                  <button onClick={handleExportActivityPDF}><FileText size={16} /> Export PDF</button>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Action</th><th>By</th><th>Status</th><th>Date</th><th>Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityLog.logs.map((a) => (
                        <tr key={a.id}>
                          <td>{a.action}</td>
                          <td>{a.action_performed_by}</td>
                          <td>{a.approve_status}</td>
                          <td>{fmtDateTime(a.date_time_ist)}</td>
                          <td>{a.comments}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => setShowActivityModal(false)}>Close</button>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AccessLogTable;