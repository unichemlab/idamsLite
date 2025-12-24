import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AppHeader from "../../components/Common/AppHeader";
import { fetchActivityLog } from "../../utils/api";
import styles from "../Plant/PlantMasterTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";

/* ================= TYPES ================= */

type ActionType =
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "VIEW"
  | "LOGIN"
  | "DOWNLOAD";

interface ActivityLog {
  id: number;
  transaction_id?: string;
  table_name?: string;
  action?: ActionType;
  old_value?: string;
  new_value?: string;
  action_user_name?: string;
  date_time_ist?: string;
  comments?: string;
}

/* ================= HELPERS ================= */

// DB table → Human readable module
const MODULE_MAP: Record<string, string> = {
  plant_master: "Plant",
  application_master: "Application",
  user_master: "User",
  vendor_master: "Vendor",
  role_master: "Role",
};

const resolveModule = (table?: string) =>
  table ? MODULE_MAP[table] || table.replace(/_/g, " ") : "-";

const label = (k: string) =>
  k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const isNonCrud = (a?: ActionType) =>
  a === "LOGIN" || a === "VIEW" || a === "DOWNLOAD";

// Enterprise IST date format
const formatDate = (d?: string) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "-";

/* ================= CHANGE RESOLUTION ================= */

const resolveChanges = (log: ActivityLog) => {
  try {
    const oldObj = log.old_value ? JSON.parse(log.old_value) : {};
    const newObj = log.new_value ? JSON.parse(log.new_value) : {};

    // UPDATE → only changed fields
    if (log.action === "UPDATE") {
      return Object.keys(newObj)
        .filter((k) => JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k]))
        .map((k) => ({
          field: label(k),
          oldVal: oldObj[k] ?? "-",
          newVal: newObj[k] ?? "-",
        }));
    }

    // DELETE → same layout as UPDATE
    if (log.action === "DELETE") {
      return Object.keys(oldObj).map((k) => ({
        field: label(k),
        oldVal: oldObj[k],
        newVal: "-",
      }));
    }

    // INSERT → show limited important fields (compact)
    if (log.action === "INSERT") {
      return Object.keys(newObj)
        .slice(0, 3)
        .map((k) => ({
          field: label(k),
          oldVal: "-",
          newVal: newObj[k],
        }));
    }

    return [];
  } catch {
    return [];
  }
};

/* ================= COMPONENT ================= */

const ActivityMasterTable: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    fetchActivityLog()
      .then(setLogs)
      .catch(() => setLogs([]));
  }, []);

  const totalPages = Math.max(1, Math.ceil(logs.length / rowsPerPage));
  const pageData = logs.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  /* ================= PDF ================= */

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });

    const rows = logs.flatMap((l) => {
      if (isNonCrud(l.action)) {
        return [[
          l.transaction_id ?? "-",
          resolveModule(l.table_name),
          l.action ?? "-",
          "Action performed",
          l.action_user_name ?? "-",
          formatDate(l.date_time_ist),
        ]];
      }

      return resolveChanges(l).map((c) => [
        l.transaction_id ?? "-",
        resolveModule(l.table_name),
        l.action ?? "-",
        `${c.field}: ${c.oldVal} → ${c.newVal}`,
        l.action_user_name ?? "-",
        formatDate(l.date_time_ist),
      ]);
    });

    autoTable(doc, {
      startY: 40,
      head: [["Txn", "Module", "Action", "Details", "By", "Date"]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [11, 99, 206], textColor: 255 },
    });

    doc.save(`Activity_Log_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  /* ================= UI ================= */

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Activity Log (Audit Trail)" />

      <div className={styles.contentArea}>
        <div className={styles.controlPanel}>
          <div className={styles.actionRow}>
        <button onClick={exportPDF} className={styles.exportBtn}>
          🗎 Export PDF
        </button>
       </div></div>
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2>Activity Logs</h2>
            <span className={styles.recordCount}>{logs.length} Records</span>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Txn</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>By</th>
                  <th>Date / Time</th>
                </tr>
              </thead>

              <tbody>
                {pageData.map((log) => (
                  <tr key={log.id}>
                    <td>{log.transaction_id}</td>
                    <td>{resolveModule(log.table_name)}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            log.action === "INSERT"
                              ? "#027a48"
                              : log.action === "DELETE"
                              ? "#b42318"
                              : log.action === "UPDATE"
                              ? "#175cd3"
                              : "#475467",
                        }}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td>
                      {isNonCrud(log.action)
                        ? `${log.action} activity`
                        : resolveChanges(log).map((c, i) => (
                            <div key={i}>
                              <strong>{c.field}</strong>:{" "}
                              <span style={{ color: "#b42318" }}>
                                {String(c.oldVal)}
                              </span>{" "}
                              →{" "}
                              <span style={{ color: "#027a48" }}>
                                {String(c.newVal)}
                              </span>
                            </div>
                          ))}
                    </td>

                    <td>{log.action_user_name ?? "-"}</td>
                    <td>{formatDate(log.date_time_ist)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={paginationStyles.pagination}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={
                currentPage === 1
                  ? paginationStyles.disabledPageBtn
                  : paginationStyles.pageBtn
              }
            >
              Previous
            </button>

            <span className={paginationStyles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              className={
                currentPage === totalPages
                  ? paginationStyles.disabledPageBtn
                  : paginationStyles.pageBtn
              }
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityMasterTable;
