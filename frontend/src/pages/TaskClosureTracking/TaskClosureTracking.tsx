import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ProfileIconWithLogout from "./ProfileIconWithLogout";
import { useTaskContext } from "./TaskContext";
import styles from "./TaskClosureTracking.module.css";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import { FaEdit, FaChevronDown, FaChevronRight } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fetchTaskLog } from "../../utils/api";

interface TaskLog {
  task_id: number;
  user_request_id: number;
  user_request_transaction_id: string;
  task_request_transaction_id: string;
  name: string;
  employee_code: string;
  access_request_type: string;
  application_name: string;
  department_name: string;
  role_name: string;
  task_status: string;
  user_request_status: string;
  plant_name?: string;
  created_on: string;
}

const TaskTable: React.FC = () => {
  const { tasks, loading, error } = useTaskContext();
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [expandedRequests, setExpandedRequests] = useState<string[]>([]);
  const [filterColumn, setFilterColumn] = useState<keyof TaskLog>("application_name");
  const [filterValue, setFilterValue] = useState("");
  const [tempFilterColumn, setTempFilterColumn] = useState<keyof TaskLog>(filterColumn);
  const [tempFilterValue, setTempFilterValue] = useState(filterValue);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchTaskLog()
      .then(setTaskLogs)
      .catch(() => setTaskLogs([]));
  }, []);

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

  const filteredLogs = taskLogs.filter((log) => {
    const value = (log[filterColumn] ?? "").toString().toLowerCase();
    return value.includes(filterValue.toLowerCase());
  });

  const groupedLogs = filteredLogs.reduce((acc: Record<string, TaskLog[]>, log) => {
    const key = log.user_request_transaction_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  const requestIds = Object.keys(groupedLogs);
  const totalPages = Math.ceil(requestIds.length / rowsPerPage);
  const paginatedRequests = requestIds.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const toggleExpand = (requestId: string) => {
    setExpandedRequests((prev) =>
      prev.includes(requestId)
        ? prev.filter((id) => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleExportCSV = () => {
    if (!filteredLogs.length) return;
    const headers = [
      "Request ID",
      "Name",
      "Employee Code",
      "Application Name",
      "Role Name",
      "Task Status",
      "User Request Status",
      "Plant Name",
    ];
    const rows = filteredLogs.map((log) => [
      log.user_request_transaction_id ?? "",
      log.name ?? "",
      log.employee_code ?? "",
      log.application_name ?? "",
      log.role_name ?? "",
      log.task_status ?? "",
      log.user_request_status ?? "",
      log.plant_name ?? "",
    ]);
    const csvContent =
      [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => `"${cell.toString().replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `TaskLog_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (!filteredLogs.length) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
    const headers = [
      [
        "Request ID",
        "Name",
        "Employee Code",
        "Application Name",
        "Role Name",
        "Task Status",
        "User Request Status",
        "Plant Name",
      ],
    ];
    const rows = filteredLogs.map((log) => [
      log.user_request_transaction_id ?? "",
      log.name ?? "",
      log.employee_code ?? "",
      log.application_name ?? "",
      log.role_name ?? "",
      log.task_status ?? "",
      log.user_request_status ?? "",
      log.plant_name ?? "",
    ]);
    doc.setFontSize(16);
    doc.text("Activity Logs", 40, 30);
    autoTable(doc, {
      startY: 50,
      head: headers,
      body: rows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [11, 99, 206], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 245, 255] },
    });
    doc.save(`TaskLog_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  if (loading) return <div className={styles.loading}>Loading tasks...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Task Request</h2>
        <div className={styles["header-icons"]}>
          <NotificationsIcon fontSize="small" />
          <SettingsIcon fontSize="small" />
          <ProfileIconWithLogout />
        </div>
      </header>

      <div className={styles.headerTopRow}>
        <div className={styles.controls}>
          <button
            className={styles.filterBtn}
            onClick={() => setShowFilterPopover((prev) => !prev)}
          >
            🔍 Filter
          </button>
          <button onClick={handleExportPDF} className={styles.exportPdfBtn}>
            🗎 Export PDF
          </button>
        </div>
      </div>

      <div className={styles.container}>
        <div
          style={{
            maxHeight: 400,
            overflowY: "auto",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            boxShadow: "0 0 4px rgba(0,0,0,0.05)",
          }}
        >
          <table className={styles.taskTable}>
            <thead>
              <tr>
                <th></th>
                <th>Request ID</th>
                <th>Plant</th>
                <th>Department</th>
                <th>Requested For/By</th>
                <th>Access Request Type</th>
                <th>Request Date</th>
                <th>Assignment IT group</th>
                <th>Status</th>
                <th>Tasks</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.map((requestId) => {
                const tasks = groupedLogs[requestId];
                return (
                  <React.Fragment key={requestId}>
                    <tr
                      onClick={() => toggleExpand(requestId)}
                      style={{ backgroundColor: "#f9fafb", cursor: "pointer" }}
                    >
                      <td style={{ width: 30, textAlign: "center" }}>
                        {expandedRequests.includes(requestId) ? (
                          <FaChevronDown />
                        ) : (
                          <FaChevronRight />
                        )}
                      </td>
                      <td style={{ fontWeight: "bold" }}>{requestId}</td>
                      <td>{tasks[0]?.plant_name}</td>
                      <td>{tasks[0]?.department_name}</td>
                      <td>{tasks[0]?.name} ({tasks[0]?.employee_code})</td>
                      <td>{tasks[0]?.access_request_type}</td>
                      <td>{new Date(tasks[0]?.created_on).toLocaleDateString("en-GB", {day: "2-digit",month: "short", year: "numeric",})}</td>
                      <td>{"----"}</td>
                      <td>{tasks[0]?.user_request_status}</td>
                      <td>{tasks.length} task(s)</td>
                    </tr>

                    {expandedRequests.includes(requestId)&&  tasks &&
                            tasks.length > 0 && (
                        <tr>
                          <td colSpan={12} style={{ padding: 0 }}>
                                  <div style={{ overflowX: "auto" }}>
                                    <table
                                      className={styles.subTable}
                                    >
                                      <thead>
                                        <tr>
                                          <th>Task Transaction ID</th>
                                          <th>Application / Equip ID</th>
                                          <th>Department</th>
                                          <th>Location</th>
                                          <th>Requestor Role</th>
                                          <th>Granted Role</th>
                                          <th>Access</th>
                                          <th>Assigned To</th>
                                          <th>Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {tasks.map((task, tIdx) => (
                                          <tr key={tIdx}>
                                            <td>
                                              <a target="_blank" href={`/task/${task.task_id}`} style={{color: "#2563eb",textDecoration: "none",fontWeight: 600,}}>{task.task_request_transaction_id || "-"}</a>
                                            </td>
                                            <td>
                                              {task.application_name || "-"}
                                            </td>
                                            <td>{task.department_name || "-"}</td>
                                            <td>{task.plant_name || "-"}</td>
                                            <td>{task.role_name || "-"}</td>
                                            <td>{task.role_name || "-"}</td>
                                            <td>{ "-"}</td>
                                            <td>{ "-"}</td>
                                            <td>{task.task_status || "-"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                        </tr>
                      )
                      }

                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
          }}
        >
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskTable;