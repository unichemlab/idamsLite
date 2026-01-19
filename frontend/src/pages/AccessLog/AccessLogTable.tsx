import React, { useEffect, useRef, useState,useCallback } from "react";
import { Bell, Settings, User, LogOut, Clock, FileText } from "lucide-react";
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
assigned_to_name:string;
  access_request_type: string;
  training_status: string;
access:string,
  vendor_firm: string | null;
  vendor_code: string | null;
  vendor_name: string | null;
  vendor_allocated_id: number | null;
  user_request_type:string;
  from_date:string;
  to_date:string;
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
  updated_on: string;
  completed_at: string | null;
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
  const debouncedFilterValue = useDebounce(filterValue, 500);

  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLog, setActivityLog] = useState<{
    ritm: string;
    logs: ActivityLog[];
  } | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
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

  /* Reset page on filter change */
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

  /* -------------------- Activity Logs -------------------- */

  const handleActivityClick = async (log: AccessLog) => {
    try {
      setShowActivityModal(true);
      setActivityLog(null);

      const data = await fetchActivityLogs(log.ritm_transaction_id);

      setActivityLog({
        ritm: log.ritm_transaction_id,
        logs: data || [],
      });
    } catch (err) {
      console.error("Failed to load activity logs", err);
      alert("Failed to load activity logs");
      setShowActivityModal(false);
    }
  };

  /* -------------------- PDF Export -------------------- */

    const handleExportPDF = useCallback(async () => {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const fileName = `AccessLogReport_${today.toISOString().split("T")[0]}.pdf`;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMargin = 14;
    const headerHeight = 15;

    // Header background
    doc.setFillColor(0, 82, 155);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Add logo if available
    let logoWidth = 0;
    let logoHeight = 0;
    if (login_headTitle2) {
      try {
        const loadImage = (src: string): Promise<HTMLImageElement> => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        };
        
        const img = await loadImage(login_headTitle2);
        const maxLogoHeight = headerHeight * 0.6;
        const scale = maxLogoHeight / img.height;
        logoWidth = img.width * scale;
        logoHeight = img.height * scale;
        const logoY = headerHeight / 2 - logoHeight / 2;
        doc.addImage(img, "PNG", pageMargin, logoY, logoWidth, logoHeight);
      } catch (e) {
        console.warn("Logo load failed", e);
      }
    }

    // Title
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titleX = pageMargin + logoWidth + 10;
    const titleY = headerHeight / 2 + 5;
    doc.text("Access Log Report", titleX, titleY);

    // Export info
    doc.setFontSize(9);
    doc.setTextColor(220, 230, 245);
    const exportedByName = (user && (user.name || user.username)) || "Unknown User";
    const exportedText = `Exported by: ${exportedByName}  On: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
    const textWidth = doc.getTextWidth(exportedText);
    doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);

    // Header line
    doc.setDrawColor(0, 82, 155);
    doc.setLineWidth(0.5);
    doc.line(0, headerHeight, pageWidth, headerHeight);

    // Table headers
    const headers = [
      [
        "RITM ID",
        "Task",
        "Name",
        "Emp Code",
        "Access Type",
        "Vendor Firm",
        "Vendor Code",
        "Vendor Name",
        "Vendor ID",
        "Plant",
        "Department",
        "Application",
        "Role",
        "Reports To",
        "Access",
        "Assigned",
        "User Type",
        "From Date",
        "To Date",
        "Req Status",
        "Task Status",
        "Appr 1",
        "Appr 2",
        "Created",
      ],
    ];

    // Table rows
    const rows = accessLogs.map((log: any) => [
      log.ritm_transaction_id || "-",
      log.task_transaction_id || "-",
      log.name || "-",
      log.employee_code || "-",
      log.access_request_type || "-",
      log.vendor_firm || "-",
      log.vendor_code || "-",
      log.vendor_name || "-",
      log.vendor_allocated_id || "-",
      log.location_name ?? log.location ?? "-",
      log.department_name ?? log.department ?? "-",
      log.application_name ?? log.application_equip_id ?? "-",
      log.role_name ?? log.role ?? "-",
      log.reports_to || "-",
      log.access ?? "-",
      log.assigned_to_name ?? "-",
      log.user_request_type ?? "-",
      log.from_date ? new Date(log.from_date.replace(" ", "T")).toLocaleDateString("en-GB") : "--",
      log.to_date ? new Date(log.to_date.replace(" ", "T")).toLocaleDateString("en-GB") : "--",
      log.user_request_status || "-",
      log.task_status || "-",
      log.approver1_status || "-",
      log.approver2_status || "-",
      log.created_on ? new Date(log.created_on.replace(" ", "T")).toLocaleDateString("en-GB") : "--",
    ]);

    // Generate table
    autoTable(doc, {
      head: headers,
      body: rows,
      startY: headerHeight + 8,
      styles: { 
        fontSize: 7, 
        cellPadding: 2.5, 
        halign: "left", 
        valign: "middle", 
        textColor: 80,
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
      },
      headStyles: { 
        fillColor: [11, 99, 206], 
        textColor: 255, 
        fontStyle: "bold", 
        fontSize: 8,
        halign: "center",
      },
      alternateRowStyles: { 
        fillColor: [240, 245, 255] 
      },
      margin: { left: pageMargin, right: pageMargin },
      tableWidth: "auto",
      columnStyles: {
        0: { cellWidth: 12 },  // RITM ID
        1: { cellWidth: 12 },  // Task
        2: { cellWidth: 15 },  // Name
        3: { cellWidth: 10 },  // Emp Code
        4: { cellWidth: 12 },  // Access Type
        5: { cellWidth: 13 },  // Vendor Firm
        6: { cellWidth: 10 },  // Vendor Code
        7: { cellWidth: 14 },  // Vendor Name
        8: { cellWidth: 10 },  // Vendor ID
        9: { cellWidth: 10 },  // Plant
        10: { cellWidth: 12 }, // Department
        11: { cellWidth: 14 }, // Application
        12: { cellWidth: 11 }, // Role
        13: { cellWidth: 12 }, // Reports To
        14: { cellWidth: 10 }, // Access
        15: { cellWidth: 12 }, // Assigned
        16: { cellWidth: 10 }, // User Type
        17: { cellWidth: 12 }, // From Date
        18: { cellWidth: 12 }, // To Date
        19: { cellWidth: 11 }, // Req Status
        20: { cellWidth: 11 }, // Task Status
        21: { cellWidth: 10 }, // Appr 1
        22: { cellWidth: 10 }, // Appr 2
        23: { cellWidth: 12 }, // Created
      },
    });

    // Footer
    const pageCount = (doc as any).getNumberOfPages?.() || (doc as any).internal?.getNumberOfPages?.() || 1;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.line(pageMargin, pageHeight - 15, pageWidth - pageMargin, pageHeight - 15);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text("Unichem Laboratories", pageMargin, pageHeight - 10);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - pageMargin - 30, pageHeight - 10);
    }

    doc.save(fileName);
  }, [accessLogs, user, login_headTitle2]);



  // const handleExportPDF = () => {
  //   const doc = new jsPDF("l", "mm", "a4");

  //   doc.setFontSize(16);
  //   doc.text("Access Log Report", 14, 15);

  //   autoTable(doc, {
  //     startY: 22,
  //     head: [[
  //       "RITM ID",
  //       "Task",
  //       "Req Name",
  //       "Req Emp Code",
  //       "Access Req Type",
  //       "Vendor Firm",
  //       "Vendor Code",
  //       "Vendor Name",
  //       "Vendor Allocated ID",
  //       "Plant",
  //       "Department",
  //       "Application",
  //       "Role",
  //       "Reports To",
  //       "Access",
  //       "Assigned Name",
  //       "User Request Type",
  //       "From Date",
  //       "To Date",
  //       "Request Status",
  //       "Task Status",
  //       "Approver 1",
  //       "Approver 2",
  //       "Created On",
  //     ]],
  //     body: accessLogs.map((log) => [
  //       log.ritm_transaction_id,
  //       log.task_transaction_id,
  //       log.name,
  //       log.employee_code,
  //       log.access_request_type,
  //       log.vendor_firm,
  //       log.vendor_code,
  //       log.vendor_name,
  //       log.vendor_allocated_id,
  //       log.location_name??log.location,
  //       log.department_name??log.department,
  //       log.application_name??log.application_equip_id,
  //       log.role_name??log.role??'-',
  //       log.access ?? "-",
  //       log.assigned_to_name??"-",
  //       log.user_request_type??"-",
  //       log.from_date ? new Date(log.from_date.replace(" ", "T")).toLocaleString("en-GB"): "--",
  //       log.to_date ? new Date(log.to_date.replace(" ", "T")).toLocaleString("en-GB"): "--",
  //       log.user_request_status,
  //       log.task_status,
  //       log.approver1_status,
  //       log.approver2_status,
  //       log.created_on ? new Date(log.created_on.replace(" ", "T")).toLocaleString("en-GB"): "--",
  //     ]),
  //     styles: { fontSize: 9 },
  //     headStyles: { fillColor: [11, 99, 206] },
  //   });

  //   doc.save("access_logs.pdf");
  // };

  const handleExportActivityPDF = () => {
    if (!activityLog) return;

    const doc = new jsPDF("l", "mm", "a4");

    doc.setFontSize(16);
    doc.text(`Activity Log - ${activityLog.ritm}`, 14, 15);

    autoTable(doc, {
      startY: 22,
      head: [[
        "Action",
        "Old Value",
        "New Value",
        "Performed By",
        "Status",
        "Date / Time",
        "Comments",
      ]],
      body: activityLog.logs.map((log) => [
        log.action,
        log.old_value ?? "",
        log.new_value ?? "",
        log.action_performed_by,
        log.approve_status,
        log.date_time_ist
          ? new Date(log.date_time_ist.replace(" ", "T")).toLocaleString("en-GB")
          : "--",
        log.comments ?? "",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [11, 99, 206] },
    });

    doc.save(`activity_log_${activityLog.ritm}.pdf`);
  };

  /* -------------------- Logout -------------------- */

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));

  /* -------------------- Render -------------------- */

  if (loading) {
    return <div style={{ padding: 24, textAlign: "center" }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: "red" }}>{error}</div>;
  }
console.log("Access Log",accessLogs);
  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Access Log Management" />

      <div className={styles.contentArea}>
        <div className={styles.controlPanel}>
          <div className={styles.actionRow}>
              <button
              className={styles.filterBtn}
              onClick={() => setShowFilterPopover((prev) => !prev)}
              type="button"
            >
              🔍 Filter
            </button>
              <button onClick={handleExportPDF}  className={styles.exportBtn}>
                🗎 Export PDF
              </button>


              {/* Filter Popover */}
              {showFilterPopover && (
                <div className={styles.filterPopover} ref={popoverRef}>
                  <select value={filterColumn} onChange={(e) => setFilterColumn(e.target.value)}>
                    <option value="name">Name</option>
                    <option value="employee_code">Employee Code</option>
                    <option value="ritm_transaction_id">RITM</option>
                    <option value="user_request_status">Request Status</option>
                  </select>
                  <input
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="Search..."
                  />
                </div>
              )}
            
          </div>
          </div>
          {/* Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h2>Access log Records</h2>
              <span className={styles.recordCount}>{totalRecords} Records</span>
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
                    <th>Appr 1</th>
                    <th>Appr 2</th>
                    <th>Created</th>
                    <th>Completed</th>
                  </tr>
                </thead>

                <tbody>
                  {accessLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.ritm_transaction_id}</td>
                      <td>{log.task_transaction_id ?? "-"}</td>
                      <td>{log.request_for_by}</td>
                      <td>{log.name}</td>
                      <td>{log.employee_code}</td>
                      <td>{log.employee_location}</td>
                      <td>{log.access_request_type}</td>
                      <td>{log.vendor_firm??"-"}</td>
                      <td>{log.vendor_code??"-"}</td>
                      <td>{log.vendor_name??"-"}</td>
                      <td>{log.vendor_allocated_id??"-"}</td>
                      <td>{log.location_name ?? log.location ?? "-"}</td>
                      <td>{log.department_name ?? log.department ?? "-"}</td>
                      <td>{log.application_name ?? log.application_equip_id ?? "-"}</td>
                      <td>{log.role_name ?? log.role ?? "-"}</td>
                      <td>{log.reports_to ?? "-"}</td>
                      <td>{log.access ?? "-"}</td>
                      <td>{log.assigned_to_name??"-"}</td>
                      <td>{log.user_request_type??"-"}</td>
                      <td>
                        {log.from_date
                          ? new Date(log.from_date.replace(" ", "T")).toLocaleString("en-GB")
                          : "--"}
                      </td>
                      <td>
                        {log.to_date
                          ? new Date(log.to_date.replace(" ", "T")).toLocaleString("en-GB")
                          : "--"}
                      </td>
                      <td>{log.user_request_status}</td>
                      <td>{log.task_status}</td>
                      <td>{log.approver1_status}</td>
                      <td>{log.approver2_status}</td>
                      <td>
                        {log.created_on
                          ? new Date(log.created_on.replace(" ", "T")).toLocaleString("en-GB")
                          : "--"}
                      </td>
                      <td>
                        {log.completed_at
                          ? new Date(log.completed_at.replace(" ", "T")).toLocaleString("en-GB")
                          : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
            {/* Pagination */}
            <div
              style={{
                marginTop: 20,
                paddingBottom: 24, // 👈 Add this line
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                fontFamily: "Segoe UI, Roboto, sans-serif",
                fontSize: 14,
              }}
            >
              {/* First */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #d0d5dd",
                  backgroundColor: currentPage === 1 ? "#f9fafb" : "#ffffff",
                  color: currentPage === 1 ? "#cbd5e1" : "#344054",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  minWidth: 40,
                }}
              >
                {"<<"}
              </button>

              {/* Prev */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #d0d5dd",
                  backgroundColor: currentPage === 1 ? "#f9fafb" : "#ffffff",
                  color: currentPage === 1 ? "#cbd5e1" : "#344054",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  minWidth: 40,
                }}
              >
                Prev
              </button>

              {/* Page Numbers (Dynamic max 5 pages) */}
              {(() => {
                const pageButtons = [];
                const maxPagesToShow = 5;
                let start = Math.max(1, currentPage - 2);
                let end = Math.min(totalPages, start + maxPagesToShow - 1);
                if (end - start < maxPagesToShow - 1) {
                  start = Math.max(1, end - maxPagesToShow + 1);
                }

                if (start > 1) {
                  pageButtons.push(
                    <button
                      key={1}
                      onClick={() => setCurrentPage(1)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #d0d5dd",
                        backgroundColor: currentPage === 1 ? "#007bff" : "#ffffff",
                        color: currentPage === 1 ? "#fff" : "#344054",
                        cursor: "pointer",
                        minWidth: 40,
                      }}
                    >
                      1
                    </button>
                  );
                  if (start > 2) {
                    pageButtons.push(
                      <span key="ellipsis-left" style={{ padding: "6px 10px", color: "#999" }}>
                        ...
                      </span>
                    );
                  }
                }

                for (let i = start; i <= end; i++) {
                  pageButtons.push(
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: i === currentPage ? "1px solid #007bff" : "1px solid #d0d5dd",
                        backgroundColor: i === currentPage ? "#007bff" : "#ffffff",
                        color: i === currentPage ? "#fff" : "#344054",
                        cursor: "pointer",
                        minWidth: 40,
                      }}
                    >
                      {i}
                    </button>
                  );
                }

                if (end < totalPages) {
                  if (end < totalPages - 1) {
                    pageButtons.push(
                      <span key="ellipsis-right" style={{ padding: "6px 10px", color: "#999" }}>
                        ...
                      </span>
                    );
                  }
                  pageButtons.push(
                    <button
                      key={totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: currentPage === totalPages ? "1px solid #007bff" : "1px solid #d0d5dd",
                        backgroundColor: currentPage === totalPages ? "#007bff" : "#ffffff",
                        color: currentPage === totalPages ? "#fff" : "#344054",
                        cursor: "pointer",
                        minWidth: 40,
                      }}
                    >
                      {totalPages}
                    </button>
                  );
                }

                return pageButtons;
              })()}

              {/* Next */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #d0d5dd",
                  backgroundColor:
                    currentPage === totalPages || totalPages === 0 ? "#f9fafb" : "#ffffff",
                  color:
                    currentPage === totalPages || totalPages === 0 ? "#cbd5e1" : "#344054",
                  cursor:
                    currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer",
                  minWidth: 40,
                }}
              >
                Next
              </button>

              {/* Last */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #d0d5dd",
                  backgroundColor:
                    currentPage === totalPages || totalPages === 0 ? "#f9fafb" : "#ffffff",
                  color:
                    currentPage === totalPages || totalPages === 0 ? "#cbd5e1" : "#344054",
                  cursor:
                    currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer",
                  minWidth: 40,
                }}
              >
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
                    <button onClick={handleExportActivityPDF}>
                      <FileText size={16} /> Export PDF
                    </button>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>By</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityLog.logs.map((a) => (
                          <tr key={a.id}>
                            <td>{a.action}</td>
                            <td>{a.action_performed_by}</td>
                            <td>{a.approve_status}</td>
                            <td>
                              {a.date_time_ist
                                ? new Date(a.date_time_ist.replace(" ", "T")).toLocaleString("en-GB")
                                : "--"}
                            </td>
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
