import React, { useEffect, useRef, useState } from "react";
import { Bell, Settings, User, LogOut, Clock, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import styles from "./AccessLogTable.module.css";

import { fetchAccessLogs, fetchActivityLogs } from "../../utils/api";
import { useDebounce } from "../../hooks/useDebounce";

/* -------------------- Types -------------------- */

interface AccessLog {
  id: number;
  ritm_transaction_id: string;
  name: string;
  employee_code: string;
  access_request_type: string;
  user_request_status: string;
  task_status: string;
  approver1_status: string;
  approver2_status: string;
  created_on: string;
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

        setAccessLogs(result.data || []);
        setTotalRecords(result.total || 0);
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
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {/* Header */}
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Access Log Master</h2>
        <div className={styles["header-icons"]}>
          <Bell size={20} />
          <Settings size={20} />
          <div style={{ position: "relative" }}>
            <User size={20} onClick={() => setProfileOpen(!profileOpen)} />
            {profileOpen && (
              <div className={styles.profileMenu}>
                <button onClick={handleLogout}>
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Actions */}
      <div className={styles.actionHeaderRow}>
        <button onClick={() => setShowFilterPopover(!showFilterPopover)}>
          🔍 Filter
        </button>
        <button onClick={handleExportPDF}>
          <FileText size={18} /> PDF
        </button>
      </div>

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

      {/* Table */}
      <div className={styles.container}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>RITM</th>
              <th>Name</th>
              <th>Emp Code</th>
              <th>Type</th>
              <th>Request</th>
              <th>Task</th>
              <th>Approver 1</th>
              <th>Approver 2</th>
              <th>Activity</th>
            </tr>
          </thead>
          <tbody>
            {accessLogs.map((log) => (
              <tr key={log.id}>
                <td>
                  <input
                    type="radio"
                    checked={selectedLogId === log.id}
                    onChange={() => setSelectedLogId(log.id)}
                  />
                </td>
                <td>{log.ritm_transaction_id}</td>
                <td>{log.name}</td>
                <td>{log.employee_code}</td>
                <td>{log.access_request_type}</td>
                <td>{log.user_request_status}</td>
                <td>{log.task_status}</td>
                <td>{log.approver1_status}</td>
                <td>{log.approver2_status}</td>
                <td>
                  <Clock
                    size={18}
                    style={{ cursor: "pointer", color: "#0b63ce" }}
                    onClick={() => handleActivityClick(log)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className={styles.pagination}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
            Next
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
  );
};

export default AccessLogTable;
