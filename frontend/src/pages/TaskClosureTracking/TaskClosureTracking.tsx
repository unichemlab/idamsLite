import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ProfileIconWithLogout from "../../components/Common/ProfileIconWithLogout";
import { useTaskContext } from "./TaskContext";
import styles from "./TaskClosureTracking.module.css";
import headerStyles from "../../pages/HomePage/homepageUser.module.css";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";
import { FiUser, FiSettings, FiLogOut, FiChevronDown, FiMapPin, FiMail, FiBriefcase, FiShield } from "react-icons/fi";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fetchTaskLog } from "../../utils/api";
import AppMenu from "../../components/AppMenu";

// Updated interface to match new backend structure with task_closures array
interface TaskClosure {
  assignment_group: string;
  role_granted: string;
  access: string;
  assigned_to: number;
  status: string;
  from_date: string;
  to_date: string;
  updated_on: string;
  assigned_to_name: string;
  closure_assigned_to_email: string;
  closure_assigned_to_department: string;
  closure_assigned_to_location: string;
}

interface TaskLog {
  task_id: number;
  user_request_id: number;
  user_request_transaction_id: string;
  task_request_transaction_id: string;
  request_name: string;
  employee_code: string;
  access_request_type: string;
  application_name: string;
  department_name: string;
  role_name: string;
  task_status: string;
  user_request_status: string;
  plant_name?: string;
  user_request_created_on: string;
  approver1_status?: string;
  approver2_status?: string;
  task_closures: TaskClosure[]; // NEW: Array of closures
  
  // For backward compatibility (can be removed if not needed elsewhere)
  assignment_group?: string;
  role_granted?: string;
  access?: string;
  task_action?:string;
  assigned_to_name?: string;
}

const TaskTable: React.FC = () => {
  const { loading, error } = useTaskContext();
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [expandedRequests, setExpandedRequests] = useState<string[]>([]);
  const [filterColumn] = useState<keyof TaskLog>("application_name");
  const [filterValue] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<"ALL" | "Pending Approval" | "Approved" | "Assigned" | "Completed" | "Rejected">("ALL");

  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuth();

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  useEffect(() => {
    fetchTaskLog()
      .then((data) => {
        // Map data to add backward compatibility fields from first closure
        const mappedData: TaskLog[] = data.map((task: any) => ({
          ...task,
          // Add flat fields for backward compatibility (from first closure if exists)
          assignment_group: task.task_closures?.[0]?.assignment_group || 
                           `${task.plant_name || ''} IT Support`.trim(),
          role_granted: task.task_closures?.[0]?.role_granted,
          access: task.task_closures?.[0]?.access,
          assigned_to_name: task.task_closures?.[0]?.assigned_to_name,
        }));
        setTaskLogs(mappedData);
      })
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

  // Helper function to determine task display status based on approval logic
  const getTaskDisplayStatus = (task: TaskLog) => {
    const approver1Status = task.approver1_status || "Pending";
    const approver2Status = task.approver2_status || "Pending";
    const taskStatus = task.task_status || "Pending";

    // If task is already completed, always show as completed
    if (taskStatus === "Completed" || taskStatus === "Closed") {
      return {
        displayStatus: "Completed",
        canComplete: false, // Already completed, view only
        statusColor: "#16a34a", // Green
        reason: "Task Already Completed"
      };
    }

    // Case 1: Approver 1 Rejected → Always Rejected
    if (approver1Status === "Rejected") {
      return {
        displayStatus: "Rejected",
        canComplete: false,
        statusColor: "#dc2626", // Red
        reason: "Approver 1 Rejected"
      };
    }

    // Case 2: Approver 1 Approved, Approver 2 Rejected → Rejected
    if (approver1Status === "Approved" && approver2Status === "Rejected") {
      return {
        displayStatus: "Rejected",
        canComplete: false,
        statusColor: "#dc2626", // Red
        reason: "Approver 2 Rejected"
      };
    }

    // Case 3: Both Approved → Can Complete
    if (approver1Status === "Approved" && approver2Status === "Approved") {
      return {
        displayStatus: taskStatus === "Pending" ? "Pending Completion" : taskStatus,
        canComplete: true,
        statusColor: "#2563eb", // Blue - ready to complete
        reason: "Both Approved"
      };
    }

    // Case 4: Still in approval workflow → Show as Pending Approval
    return {
      displayStatus: "Pending Approval",
      canComplete: false,
      statusColor: "#f59e0b", // Orange
      reason: "Awaiting Approvals"
    };
  };

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

  console.log('Grouped Logs:', groupedLogs);

  const requestIds = Object.keys(groupedLogs).filter((requestId) => {
    if (taskStatusFilter === "ALL") return true;

    const firstTask = groupedLogs[requestId][0];
    const statusInfo = getTaskDisplayStatus(firstTask);

    return statusInfo.displayStatus === taskStatusFilter;
  });

  const totalPages = Math.ceil(requestIds.length / rowsPerPage);
  const paginatedRequests = requestIds.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  console.log('Paginated Requests:', paginatedRequests);

  const toggleExpand = (requestId: string) => {
    setExpandedRequests((prev) =>
      prev.includes(requestId)
        ? prev.filter((id) => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/");
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
      log.request_name ?? "",
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
    <div className={styles["main-container"]}>
      <div className={styles["main-content"]}>
        <header className={headerStyles["main-header"]}>
          <div className={headerStyles.navLeft}>
            <div className={headerStyles.logoWrapper}>
              <img src={login_headTitle2} alt="Logo" className={headerStyles.logo} />
              <span className={headerStyles.version}>version-1.0</span>
            </div>
            <h1 className={headerStyles.title}>Task Closure</h1>
          </div>

          <div className={headerStyles.navRight}>
            {user && (
              <div style={{ position: "relative" }} ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={headerStyles.userButton}
                >
                  <div className={headerStyles.avatarContainer}>
                    <div className={headerStyles.avatar}>
                      {(user.name || user.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className={headerStyles.statusDot}></div>
                  </div>

                  <div className={headerStyles.userInfo}>
                    <span className={headerStyles.userName}>
                      {user.name || user.username}
                    </span>
                    {user.isITBin && (
                      <span className={headerStyles.userRole}>IT Admin</span>
                    )}
                    {user.isApprover && (
                      <span className={headerStyles.userRole}>Approver</span>
                    )}
                  </div>

                  <FiChevronDown
                    size={16}
                    color="#64748b"
                    style={{
                      transition: "transform 0.2s",
                      transform: showUserMenu ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>

                {showUserMenu && (
                  <div className={headerStyles.dropdownMenu}>
                    <div className={headerStyles.dropdownHeader}>
                      <div className={headerStyles.dropdownAvatar}>
                        <div className={headerStyles.dropdownAvatarCircle}>
                          {(user.name || user.username || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className={headerStyles.dropdownUserInfo}>
                          <span className={headerStyles.dropdownUserName}>
                            {user.name || user.username}
                          </span>
                          {user.employee_code && (
                            <span className={headerStyles.dropdownEmployeeCode}>
                              {user.employee_code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={headerStyles.dropdownActions}>
                      <AppMenu />
                      <button
                        onClick={handleLogout}
                        className={`${headerStyles.dropdownButton} ${styles.logoutButton}`}
                      >
                        <FiLogOut size={18} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <div className={styles.contentArea}>
          <div className={styles.headerTopRow}>
            <div className={styles.controls}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["ALL", "Pending Approval", "Approved", "Assigned", "Completed", "Rejected"].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setTaskStatusFilter(status as any);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border:
                        taskStatusFilter === status
                          ? "1px solid #2563eb"
                          : "1px solid #d0d5dd",
                      backgroundColor:
                        taskStatusFilter === status ? "#2563eb" : "#ffffff",
                      color: taskStatusFilter === status ? "#fff" : "#344054",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* <button onClick={handleExportPDF} className={styles.exportPdfBtn}>
              🗎 Export PDF
            </button> */}
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
                    <th>Approval Status</th>
                    <th>Status</th>
                    <th>Tasks</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequests.map((requestId) => {
                    const tasks = groupedLogs[requestId];
                    const firstTask = tasks[0];
                    const statusInfo = getTaskDisplayStatus(firstTask);
                    
                    // Count total closures across all tasks for this RITM
                    const totalClosures = tasks.reduce((sum, task) => {
                      return sum + (task.task_closures?.length || 0);
                    }, 0);

                    console.log('Rendering requestId:', requestId, 'with tasks:', tasks, 'total closures:', totalClosures);

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
                          <td>{firstTask?.plant_name}</td>
                          <td>{firstTask?.department_name}</td>
                          <td>{firstTask?.request_name} ({firstTask?.employee_code})</td>
                          <td>{firstTask?.access_request_type}</td>
                          <td>
                            {new Date(firstTask?.user_request_created_on).toLocaleDateString(
                              "en-GB",
                              { day: "2-digit", month: "short", year: "numeric" }
                            )}
                          </td>
                          <td>{firstTask?.assignment_group}</td>
                          <td>
                            <div style={{ fontSize: "0.75rem", lineHeight: 1.2 }}>
                              <div>
                                <strong>A1:</strong>{" "}
                                <span
                                  style={{
                                    color:
                                      firstTask.approver1_status === "Approved"
                                        ? "#16a34a"
                                        : firstTask.approver1_status === "Rejected"
                                          ? "#dc2626"
                                          : "#f59e0b",
                                    fontWeight: 600,
                                  }}
                                >
                                  {firstTask.approver1_status || "Pending"}
                                </span>
                              </div>
                              <div>
                                <strong>A2:</strong>{" "}
                                <span
                                  style={{
                                    color:
                                      firstTask.approver2_status === "Approved"
                                        ? "#16a34a"
                                        : firstTask.approver2_status === "Rejected"
                                          ? "#dc2626"
                                          : "#f59e0b",
                                    fontWeight: 600,
                                  }}
                                >
                                  {firstTask.approver1_status === "Rejected" ? 'N/A' : firstTask.approver2_status || "Pending"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                backgroundColor: statusInfo.statusColor,
                                color: "#fff",
                                padding: "4px 8px",
                                borderRadius: 4,
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                display: "inline-block",
                              }}
                            >
                              {statusInfo.displayStatus}
                            </span>
                          </td>
                          <td>
                            <strong>{totalClosures || tasks.length}</strong> task(s)
                          </td>
                        </tr>

                        {/* Expanded view showing all task closures */}
                        {expandedRequests.includes(requestId) && tasks && tasks.length > 0 && (
                          <tr>
                            <td colSpan={11} style={{ padding: 0 }}>
                              <div style={{ overflowX: "auto" }}>
                                <table className={styles.subTable}>
                                  <thead>
                                    <tr>
                                      <th>Transaction ID</th>
                                      <th>Application / Equip ID</th>
                                      <th>Department</th>
                                      <th>Location</th>
                                       <th>Task Action</th>
                                      <th>Requestor Role</th>
                                      <th>Granted Role</th>
                                      <th>Access</th>
                                      <th>Assigned To</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tasks.map((task) => {
                                      const closures = task.task_closures || [];
                                      const taskStatus = getTaskDisplayStatus(task);

                                      // If no closures, show one row with task info only
                                      if (closures.length === 0) {
                                        return (
                                          <tr key={`${task.task_id}-no-closure`}>
                                            <td>
                                              <a
                                                target="_blank"
                                                rel="noreferrer"
                                                href={
                                                  taskStatus.canComplete
                                                    ? `/task/${task.task_id}`
                                                    : `/task-detail/${task.task_id}`
                                                }
                                                style={{
                                                  color: "#2563eb",
                                                  textDecoration: "none",
                                                  fontWeight: 600,
                                                }}
                                                title={
                                                  taskStatus.displayStatus === "Completed"
                                                    ? "View completed task details"
                                                    : taskStatus.canComplete
                                                      ? "Click to complete task"
                                                      : `View only - ${taskStatus.reason}`
                                                }
                                              >
                                                {task.task_request_transaction_id || "-"}
                                                {!taskStatus.canComplete && taskStatus.displayStatus !== "Completed" && (
                                                  <span style={{ marginLeft: 4, fontSize: "0.7rem", color: "#dc2626" }}>
                                                    🔒
                                                  </span>
                                                )}
                                                {taskStatus.displayStatus === "Completed" && (
                                                  <span style={{ marginLeft: 4, fontSize: "0.7rem", color: "#16a34a" }}>
                                                    ✓
                                                  </span>
                                                )}
                                              </a>
                                            </td>
                                            <td>{task.application_name || "-"}</td>
                                            <td>{task.department_name || "-"}</td>
                                            <td>{task.plant_name || "-"}</td>
                                            <td>{task.task_action || "-"}</td>
                                            <td>{task.role_name || "-"}</td>
                                            <td colSpan={4} style={{ textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                                              No task closures available
                                            </td>
                                          </tr>
                                        );
                                      }

                                      // Show one row per closure
                                      return closures.map((closure, idx) => (
                                        <tr key={`${task.task_id}-closure-${idx}`}>
                                          {/* Show task info only on first closure row */}
                                          <td>
                                            {idx === 0 && (
                                              <a
                                                target="_blank"
                                                rel="noreferrer"
                                                href={
                                                  taskStatus.canComplete
                                                    ? `/task/${task.task_id}`
                                                    : `/task-detail/${task.task_id}`
                                                }
                                                style={{
                                                  color: "#2563eb",
                                                  textDecoration: "none",
                                                  fontWeight: 600,
                                                }}
                                                title={
                                                  taskStatus.displayStatus === "Completed"
                                                    ? "View completed task details"
                                                    : taskStatus.canComplete
                                                      ? "Click to complete task"
                                                      : `View only - ${taskStatus.reason}`
                                                }
                                              >
                                                {task.task_request_transaction_id || "-"}
                                                {!taskStatus.canComplete && taskStatus.displayStatus !== "Completed" && (
                                                  <span style={{ marginLeft: 4, fontSize: "0.7rem", color: "#dc2626" }}>
                                                    🔒
                                                  </span>
                                                )}
                                                {taskStatus.displayStatus === "Completed" && (
                                                  <span style={{ marginLeft: 4, fontSize: "0.7rem", color: "#16a34a" }}>
                                                    ✓
                                                  </span>
                                                )}
                                              </a>
                                            )}
                                          </td>
                                          <td>{idx === 0 ? task.application_name || "-" : ""}</td>
                                          <td>{idx === 0 ? task.department_name || "-" : ""}</td>
                                          <td>{idx === 0 ? task.plant_name || "-" : ""}</td>
                                          <td>{idx === 0 ? task.task_action || "-" : ""}</td>
                                          <td>{idx === 0 ? task.role_name || "-" : ""}</td>
                                          <td>{closure.role_granted || "-"}</td>
                                          <td>{closure.access || "-"}</td>
                                          <td>{closure.assigned_to_name || "-"}</td>
                                          <td>
                                            <span
                                              style={{
                                                backgroundColor: taskStatus.statusColor,
                                                color: "#fff",
                                                padding: "2px 6px",
                                                borderRadius: 3,
                                                fontSize: "0.7rem",
                                                fontWeight: 600,
                                              }}
                                            >
                                              {taskStatus.displayStatus}
                                            </span>
                                          </td>
                                        </tr>
                                      ));
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              style={{
                marginTop: 20,
                paddingBottom: 24,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                fontFamily: "Segoe UI, Roboto, sans-serif",
                fontSize: 14,
              }}
            >
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
      </div>
    </div>
  );
};

export default TaskTable;