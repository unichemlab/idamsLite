import React, { useEffect, useState, useRef } from "react";
import ProfileIconWithLogout from "./ProfileIconWithLogout";
import styles from "../ActivityMasterTable/ActivityMasterTable.module.css";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fetchActivityLog } from "../../utils/api";

interface ActivityLog {
  id: number;
  transaction_id?: string;
  user_id?: number;
  plant_id?: number;
  module_id?: string;
  table_name?: string;
  record_id?: number;
  action?: string;
  old_value?: string;
  new_value?: string;
  action_performed_by?: number;
  approve_status?: string;
  date_time_ist?: string;
  comments?: string;
  ip_address?: string;
  device?: string;
  created_on?: string;
}

// Format JSON values for display
const formatValues = (value: string | null) => {
  if (!value) return "";
  try {
    const obj = JSON.parse(value);
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n"); // multiline
  } catch {
    return value;
  }
};

const ActivityMasterTable: React.FC = () => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [filterColumn, setFilterColumn] = useState<keyof ActivityLog>("action_performed_by");
  const [filterValue, setFilterValue] = useState("");
  const [tempFilterColumn, setTempFilterColumn] = useState<keyof ActivityLog>(filterColumn);
  const [tempFilterValue, setTempFilterValue] = useState(filterValue);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Fetch activity logs
  useEffect(() => {
    fetchActivityLog()
      .then(setActivityLogs)
      .catch(() => setActivityLogs([]));
  }, []);

  // Close filter popover on outside click
  useEffect(() => {
    if (!showFilterPopover) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowFilterPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilterPopover]);

  // Filtered logs
  const filteredLogs = activityLogs.filter((log) => {
    const value = (log[filterColumn] ?? "").toString().toLowerCase();
    return value.includes(filterValue.toLowerCase());
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleExportCSV = () => {
    if (!filteredLogs.length) return;

    // Prepare CSV header
    const headers = [
      "Transaction ID",
      "Table Name",
      "Action",
      "Old Value",
      "New Value",
      "Action Performed By",
      "Approval Status",
      "Date/Time (IST)",
      "Comments",
    ];

    // Prepare CSV rows
    const rows = filteredLogs.map((log) => [
      log.transaction_id ?? "",
      log.table_name ?? "",
      log.action ?? "",
      formatValues(log.old_value ?? null).replace(/\n/g, " "), // remove newlines
      formatValues(log.new_value ?? null).replace(/\n/g, " "),
      log.action_performed_by ?? "",
      log.approve_status ?? "",
      log.date_time_ist ? new Date(log.date_time_ist).toLocaleString() : "",
      log.comments?.replace(/\n/g, " ") ?? "",
    ]);

    // Convert to CSV string
    const csvContent =
      [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => `"${cell.toString().replace(/"/g, '""')}"`) // escape quotes
            .join(",")
        )
        .join("\n");

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `ActivityLog_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF export
  const handleExportPDF = () => {
    if (!filteredLogs.length) return;

    // Use A3 landscape for wide tables
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });

    const headers = [
      [
        "Transaction ID",
        "Table Name",
        "Action",
        "Old Value",
        "New Value",
        "Action Performed By",
        "Approval Status",
        "Date/Time (IST)",
        "Comments",
      ],
    ];

    const rows = filteredLogs.map((log) => [
      log.transaction_id ?? "",
      log.table_name ?? "",
      log.action ?? "",
      formatValues(log.old_value ?? null),
      formatValues(log.new_value ?? null),
      log.action_performed_by ?? "",
      log.approve_status ?? "",
      log.date_time_ist ? new Date(log.date_time_ist).toLocaleString() : "",
      log.comments ?? "",
    ]);

    doc.setFontSize(16);
    doc.text("Activity Logs", 40, 30);

    autoTable(doc, {
      startY: 50,
      head: headers,
      body: rows,
      tableWidth: "auto",
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
        minCellHeight: 6,
        halign: "left",
        valign: "top",
      },
      headStyles: { fillColor: [11, 99, 206], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: "auto" },
        2: { cellWidth: "auto" },
        3: { cellWidth: "wrap" }, // Old Value
        4: { cellWidth: "wrap" }, // New Value
        5: { cellWidth: "auto" },
        6: { cellWidth: "auto" },
        7: { cellWidth: "auto" },
        8: { cellWidth: "wrap" }, // Comments
      },
    });

    doc.save(`ActivityLog_${new Date().toISOString().split("T")[0]}.pdf`);
  };


  return (
    <div>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Activity Log</h2>
        <div className={styles["header-icons"]}>
          <span className={styles["header-icon"]}><NotificationsIcon fontSize="small" /></span>
          <span className={styles["header-icon"]}><SettingsIcon fontSize="small" /></span>
          <ProfileIconWithLogout />
        </div>
      </header>

      <div className={styles.headerTopRow}>
        <div className={styles.controls}>
          <button
            onClick={() => setShowFilterPopover(!showFilterPopover)}
            style={{ marginRight: 12, padding: "6px 12px", borderRadius: 6 }}
          >
            Filter
          </button>
          <button onClick={handleExportCSV} className={styles.exportPdfBtn}>
            📄 Export CSV
          </button>
          <button onClick={handleExportPDF} className={styles.exportPdfBtn}>
            🗎 Export PDF
          </button>

          {showFilterPopover && (
            <div className={styles.filterPopover} ref={popoverRef}>
              <div className={styles.filterPopoverHeader}>Advanced Filter</div>
              <div className={styles.filterPopoverBody}>
                <div className={styles.filterFieldRow}>
                  <label className={styles.filterLabel}>Column</label>
                  <select
                    className={styles.filterDropdown}
                    value={tempFilterColumn}
                    onChange={(e) =>
                      setTempFilterColumn(e.target.value as keyof ActivityLog)
                    }
                  >
                    {Object.keys(activityLogs[0] || {}).map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.filterFieldRow}>
                  <label className={styles.filterLabel}>Value</label>
                  <input
                    className={styles.filterInput}
                    type="text"
                    placeholder="Enter filter value"
                    value={tempFilterValue}
                    onChange={(e) => setTempFilterValue(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.filterPopoverFooter}>
                <button
                  className={styles.applyBtn}
                  onClick={() => {
                    setFilterColumn(tempFilterColumn);
                    setFilterValue(tempFilterValue);
                    setShowFilterPopover(false);
                    setCurrentPage(1);
                  }}
                >
                  Apply
                </button>
                <button
                  className={styles.clearBtn}
                  onClick={() => {
                    setTempFilterValue("");
                    setFilterValue("");
                    setShowFilterPopover(false);
                    setCurrentPage(1);
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.container}>
        <div
          style={{
            maxHeight: 350,
            overflowY: "auto",
            borderRadius: 8,
            boxShadow: "0 0 4px rgba(0, 0, 0, 0.05)",
            border: "1px solid #e2e8f0",
            marginTop: "11px",
            height: "100",
          }}
        >
          <table className={styles.table} style={{ minWidth: 1200 }}>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Table Name</th>
                <th>Action</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Action Performed By</th>
                <th>Approval Status</th>
                <th>Date/Time (IST)</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.transaction_id ?? ""}</td>
                  <td>{log.table_name ?? ""}</td>
                  <td>{log.action ?? ""}</td>
                  <td style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {log.old_value ?? null}
                  </td>
                  <td style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {log.new_value ?? null}
                  </td>
                  <td>{log.action_performed_by ?? ""}</td>
                  <td>{log.approve_status ?? ""}</td>
                  <td>{log.date_time_ist ? new Date(log.date_time_ist).toLocaleString() : ""}</td>
                  <td style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {log.comments ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
    </div>
  );
};

export default ActivityMasterTable;
