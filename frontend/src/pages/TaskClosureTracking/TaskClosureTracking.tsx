import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ProfileIconWithLogout from "./ProfileIconWithLogout";
import { useTaskContext } from "./TaskContext";
import styles from "./TaskClosureTracking.module.css";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import { FaEdit } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fetchTaskLog } from "../../utils/api";
interface TaskLog {
  task_id:number;
  user_request_id: number;
  user_request_transaction_id: string;
  name: string;
  employee_code: string;
  application_name: string;
  role_name: string;
  task_status: string;
  user_request_status: string;
  plant_name?: string;
}

const TaskTable: React.FC = () => {
  const { tasks, loading, error } = useTaskContext();
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);
   const [filterColumn, setFilterColumn] = useState<keyof TaskLog>("application_name");
    const [filterValue, setFilterValue] = useState("");
    const [tempFilterColumn, setTempFilterColumn] = useState<keyof TaskLog>(filterColumn);
    const [tempFilterValue, setTempFilterValue] = useState(filterValue);
    const [showFilterPopover, setShowFilterPopover] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;
    const navigate = useNavigate();
    const popoverRef = useRef<HTMLDivElement | null>(null);
 // Fetch activity logs
  useEffect(() => {
    fetchTaskLog()
      .then(setTaskLogs)
      .catch(() => setTaskLogs([]));
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
  const filteredLogs = taskLogs.filter((log) => {
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
          "Request ID",
          "Name",
          "Employee Code",
          "Application Name",
          "Role Name",
          "Task Status",
          "User Request Status",
          "Plant Name",
        ];
    
        // Prepare CSV rows
        const rows = filteredLogs.map((log) => [
          log.user_request_transaction_id ?? "",
          log.name ?? "",
          log.employee_code ?? "",
          log.application_name ?? "",
          log.role_name ?? null,
          log.task_status ?? "",
          log.user_request_status ?? "",
          log.plant_name ?? "",
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
          `TaskLog_${new Date().toISOString().split("T")[0]}.csv`
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
          log.role_name ?? null,
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
    
        doc.save(`TaskLog_${new Date().toISOString().split("T")[0]}.pdf`);
      };




  if (loading) return <div className={styles.loading}>Loading tasks...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
   // Close filter popover on outside click
   
    

  return (
    <div>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Task Request</h2>
        <div className={styles["header-icons"]}>
          <span className={styles["header-icon"]}><NotificationsIcon fontSize="small" /></span>
          <span className={styles["header-icon"]}><SettingsIcon fontSize="small" /></span>
          <ProfileIconWithLogout />
        </div>
      </header>

      <div className={styles.headerTopRow}>
        <div className={styles.controls}>
           <button
            className={styles.filterBtn}
            onClick={() => setShowFilterPopover((prev) => !prev)}
            type="button"
            aria-label="Filter plants"
          >
            🔍 Filter
          </button>
          <button
            className={`${styles.btn} ${styles.editBtn}`}
            onClick={() => {
              if (selectedRow !== null) navigate(`/task/${selectedRow}`);
            }}
            disabled={selectedRow === null}
          >
            <FaEdit size={14} /> Edit
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
                      setTempFilterColumn(e.target.value as keyof TaskLog)
                    }
                  >
                    {Object.keys(taskLogs[0] || {}).map((col) => (
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
    <table className={styles.taskTable}>
      <thead>
        <tr>
          <th></th>
          <th>Request ID</th>
          <th>Request For/By</th>
          <th>User</th>
          <th>Employee Code</th>
          <th>Application</th>
           <th>Plant Name</th>
          <th>Role</th>
          <th>Access Status</th>
          <th>Request Status</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.task_id}  
          onClick={() => setSelectedRow(task.task_id)}
                  style={{
                    background: selectedRow === task.task_id ? "#f0f4ff" : undefined,
                  }}>
            <td>
                                <input
                                  type="radio"
                                  className={styles.radioInput}
                                  checked={selectedRow === task.task_id}
                                  onChange={() => setSelectedRow(task.task_id)}
                                />
                              </td>
            <td>{task.user_request_transaction_id}</td>
            <td>{task.request_for_by}</td>
            <td>
              <div className={styles.userName}>{task.name}</div>
            </td>
            <td><div className={styles.empId}>{task.employee_code}</div></td>
            <td>
              <div className={styles.application}>
                {task.application_name}
              </div>
            </td>
            <td>{task.plant_name}</td>
            <td className={styles.role}>{task.role_name}</td>
            <td>
              {task.task_status}
            </td>
            <td>
             {task.user_request_status}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>

        {/* Pagination Controls */}
        <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 8 }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          >
            Prev
          </button>
          <span>Page {currentPage} of {totalPages || 1}</span>
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
