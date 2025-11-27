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
import { FiUser,FiSettings,FiLogOut,FiChevronDown,FiMapPin,FiMail,FiBriefcase,FiShield } from "react-icons/fi";
import login_headTitle2 from "../../assets/login_headTitle2.png";
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
  assignment_group: string;
  role_granted: string;
  access: string;
  assigned_to_name: string;
}

const TaskTable: React.FC = () => {
  const { loading, error } = useTaskContext();
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  //const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [expandedRequests, setExpandedRequests] = useState<string[]>([]);
  const [filterColumn] = useState<keyof TaskLog>("application_name");
  const [filterValue] = useState("");
  //const [tempFilterColumn, setTempFilterColumn] = useState<keyof TaskLog>(filterColumn);
  // const [tempFilterValue, setTempFilterValue] = useState(filterValue);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement | null>(null);
  
   const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const { user, logout } = useAuth();
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
    <div className={styles["main-container"]}>
      <main className={styles["main-content"]}>
       
        <header className={headerStyles["main-header"]}>
        <div className={headerStyles.navLeft}>
          <div className={headerStyles.logoWrapper}>
            <img src={login_headTitle2} alt="Logo" className={headerStyles.logo} />
            <span className={headerStyles.version}>version-1.0</span>
          </div>
          <h1 className={headerStyles.title}>Task Clouser</h1>
        </div>


        <div className={headerStyles.navRight}>
          {user && (
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={headerStyles.userButton}
              >
                {/* Avatar */}
                <div className={headerStyles.avatarContainer}>
                  <div className={headerStyles.avatar}>
                    {(user.name || user.username || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className={headerStyles.statusDot}></div>
                </div>

                {/* User Name */}
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

                {/* Dropdown Arrow */}
                <FiChevronDown
                  size={16}
                  color="#64748b"
                  style={{
                    transition: "transform 0.2s",
                    transform: showUserMenu ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>

              {/* Dropdown Menu */}
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

                    {/* {user.isITBin && (
                      <div className={styles.adminBadge}>
                        <FiShield size={14} />
                        <span>IT BIN Administrator</span>
                      </div>
                    )} */}
                  </div>

                  {/* Contact Info */}
                  {/* <div className={styles.dropdownInfo}>
                    {user.email && (
                      <div className={styles.infoItem}>
                        <FiMail size={16} />
                        <span>{user.email}</span>
                      </div>
                    )}
                    {user.location && (
                      <div className={styles.infoItem}>
                        <FiMapPin size={16} />
                        <span>{user.location}</span>
                      </div>
                    )}
                    {user.designation && (
                      <div className={styles.infoItem}>
                        <FiBriefcase size={16} />
                        <span>{user.designation}</span>
                      </div>
                    )}
                  </div> */}

                  {/* Actions */}
                  <div className={headerStyles.dropdownActions}>
                     <button
                      onClick={() => navigate("/homepage")}
                      className={styles.dropdownButton}
                    >
                      <FiBriefcase size={16} />
                      <span>Home</span>
                    </button>
                    <button
                      onClick={() => navigate("/user-access-management")}
                      className={headerStyles.dropdownButton}
                    >
                      <FiBriefcase size={16} />
                      <span>User Access Management</span>
                    </button>
                    {user?.isITBin && (
                      <button
                        onClick={() => navigate("/task")}
                        className={headerStyles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Task Closure</span>
                      </button>
                    )}
                     {user?.isApprover && (
                      <button
                        onClick={() => navigate("/approver/pending")}
                        className={headerStyles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Pending Approval</span>
                      </button>
                    )}
                    {user?.isApprover && (
                      
                      <button
                        onClick={() => navigate("/approver/history")}
                        className={headerStyles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Approval History</span>
                      </button>
                    )}
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
                  console.log("groupedLogs", tasks);
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
                        <td>{new Date(tasks[0]?.created_on).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", })}</td>
                        <td>{tasks[0]?.assignment_group}</td>
                        <td>{tasks[0]?.user_request_status}</td>
                        <td>{tasks.length} task(s)</td>
                      </tr>

                      {expandedRequests.includes(requestId) && tasks &&
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
                                          <a
                                            target="_blank" rel="noreferrer"
                                            href={
                                              task.task_status === "Closed"
                                                ? `/task-detail/${task.task_id}` // 👈 go to TaskDetailView
                                                : `/task/${task.task_id}`        // 👈 go to normal task view
                                            }
                                            style={{
                                              color: "#2563eb",
                                              textDecoration: "none",
                                              fontWeight: 600,
                                            }}
                                          >
                                            {task.task_request_transaction_id || "-"}
                                          </a>
                                        </td>

                                        <td>
                                          {task.application_name || "-"}
                                        </td>
                                        <td>{task.department_name || "-"}</td>
                                        <td>{task.plant_name || "-"}</td>
                                        <td>{task.role_name || "-"}</td>
                                        <td>{task.role_granted || "-"}</td>
                                        <td>{task.access}</td>
                                        <td>{task.assigned_to_name}</td>
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
      </main>
    </div>
  );
};

export default TaskTable;