import React, { useEffect, useRef, useState } from "react";
import { Bell, Settings, User, LogOut, Clock, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import styles from "../Plant/PlantMasterTable.module.css";

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

  access_request_type: string;
  training_status: string;

  vendor_firm: string | null;
  vendor_code: string | null;
  vendor_name: string | null;
  vendor_allocated_id: number | null;

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

  const handleExportPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");

    doc.setFontSize(16);
    doc.text("Access Log Report", 14, 15);

    autoTable(doc, {
      startY: 22,
      head: [[
        "RITM ID",
        "Name",
        "Employee Code",
        "Request Type",
        "Request Status",
        "Task Status",
        "Approver 1",
        "Approver 2",
        "Created On",
      ]],
      body: accessLogs.map((log) => [
        log.ritm_transaction_id,
        log.name,
        log.employee_code,
        log.access_request_type,
        log.user_request_status,
        log.task_status,
        log.approver1_status,
        log.approver2_status,
        log.created_on
          ? new Date(log.created_on.replace(" ", "T")).toLocaleString("en-GB")
          : "--",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [11, 99, 206] },
    });

    doc.save("access_logs.pdf");
  };

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
                    <th>Request For</th>
                    <th>Name</th>
                    <th>Emp Code</th>
                    <th>Emp Location</th>
                    <th>Access Type</th>
                    <th>Application</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Plant</th>
                    <th>Reports To</th>
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
                      <td>{log.application_name ?? log.application_equip_id ?? "-"}</td>
                      <td>{log.department_name ?? log.department ?? "-"}</td>
                      <td>{log.role_name ?? log.role ?? "-"}</td>
                      <td>{log.location_name ?? log.location ?? "-"}</td>

                      <td>{log.reports_to ?? "-"}</td>

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
