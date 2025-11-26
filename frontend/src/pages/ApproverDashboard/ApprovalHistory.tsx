import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchTasksForApprover } from "../../utils/api";
import styles from "./ApproverHome.module.css";
import tableStyles from "./ApprovalTable.module.css";
import headerStyles from "../HomePage/homepageUser.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { CircularProgress } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  FiChevronDown,
  FiMail,
  FiMapPin,
  FiBriefcase,
  FiLogOut,
  FiShield,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiTrendingUp,
  FiFileText,
  FiSettings,
} from "react-icons/fi";

interface ApprovalAction {
  approverName: string;
  approverRole: string;
  plant: string;
  corporate: string;
  action: "Approved" | "Rejected" | "Pending" | string;
  timestamp: string;
  comments?: string;
}

const ApprovalHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [approvalHistory, setApprovalHistory] = useState<ApprovalAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
  useEffect(() => {
    fetchApprovalHistory();
  }, []);

  async function fetchApprovalHistory() {
    if (!user?.id) {
      setApprovalHistory([]);
      return;
    }

    setLoading(true);
    try {
      const data: any = await fetchTasksForApprover(Number(user.id));
      const mapped: ApprovalAction[] = Array.isArray(data)
        ? data
            .filter((tr: any) => {
              const status = tr.task_status || "Pending";
              return status === "Approved" || status === "Rejected";
            })
            .map((tr: any) => {
              let approverName = "-";
              let approverAction = tr.task_status || "Pending";

              if (tr.approver2_action && tr.approver2_action !== "Pending") {
                approverName =
                  tr.approver2_name || tr.approver2_email || "Approver 2";
                approverAction = tr.approver2_action;
              } else if (
                tr.approver1_action &&
                tr.approver1_action !== "Pending"
              ) {
                approverName =
                  tr.approver1_name || tr.approver1_email || "Approver 1";
                approverAction = tr.approver1_action;
              } else {
                approverName =
                  tr.reports_to ||
                  tr.approver_name ||
                  tr.approver ||
                  tr.username ||
                  "-";
              }

              return {
                approverName,
                approverRole:
                  tr.role_name || tr.approver_role || tr.role || "-",
                plant: tr.plant_name || tr.plant || "-",
                corporate: tr.corporate_name || "Unichem Corp",
                action: approverAction,
                timestamp:
                  tr.approver2_action_timestamp ||
                  tr.approver1_action_timestamp ||
                  tr.updated_on ||
                  tr.created_on ||
                  tr.timestamp ||
                  "",
                comments: tr.remarks || tr.comments || "",
              };
            })
        : [];
      setApprovalHistory(mapped);
    } catch (err) {
      console.error("Error fetching approval history:", err);
      setApprovalHistory([]);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className={styles.container}>
      {/* Header */}
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

      {/* Main Content */}
      <main className={tableStyles.mainContent}>
        {/* <button
          className={tableStyles.backButton}
          onClick={() => navigate("/approver")}
        >
          <ArrowBackIcon fontSize="small" /> Back to Home
        </button> */}

        <div className={tableStyles.tableContainer}>
          <h2 className={tableStyles.tableTitle}>
            Approved & Rejected Requests
          </h2>

          {loading ? (
            <div className={tableStyles.loadingContainer}>
              <CircularProgress />
            </div>
          ) : (
            <div className={tableStyles.tableWrapper}>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>Approver</th>
                    <th>Role</th>
                    <th>Plant</th>
                    <th>Corporate</th>
                    <th>Action</th>
                    <th>Timestamp</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {approvalHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={tableStyles.emptyState}>
                        No approval history found.
                      </td>
                    </tr>
                  ) : (
                    approvalHistory.map((a, idx) => (
                      <tr key={idx}>
                        <td>{a.approverName}</td>
                        <td>{a.approverRole}</td>
                        <td>{a.plant}</td>
                        <td>{a.corporate}</td>
                        <td>
                          <span
                            className={
                              a.action === "Approved"
                                ? tableStyles.statusApproved
                                : tableStyles.statusRejected
                            }
                          >
                            {a.action}
                          </span>
                        </td>
                        <td>{a.timestamp}</td>
                        <td>{a.comments || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ApprovalHistoryPage;