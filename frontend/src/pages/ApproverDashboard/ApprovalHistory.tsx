import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchTasksForApprover } from "../../utils/api";
import styles from "./ApproverHome.module.css";
import tableStyles from "./ApprovalTable.module.css";
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
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <img
            src={login_headTitle2}
            alt="Company logo"
            className={styles.logo}
          />
          <span className={styles.version}>version-1.0</span>
        </div>
        <h1 className={styles.headerTitle}>Approval History</h1>
        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {user?.username?.charAt(0).toUpperCase() || "R"}
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>
                {user?.username || "Rosli Joseph"}
              </span>
              <span className={styles.userRole}>Approver</span>
            </div>
            <button
              className={styles.dropdownToggle}
              onClick={() => setProfileOpen((prev) => !prev)}
            >
              ▼
            </button>
          </div>

          {profileOpen && (
            <div className={styles.dropdownMenu}>
               <button
                      onClick={() => navigate("/user-access-management")}
                      className={styles.dropdownButton}
                    >
                      <FiBriefcase size={16} />
                      <span>User Access Management</span>
                    </button>
                    {user?.isITBin && (
                      <button
                        onClick={() => navigate("/task")}
                        className={styles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Task Closure</span>
                      </button>
                    )}
                     {user?.isApprover && (
                      <button
                        onClick={() => navigate("/approver/pending")}
                        className={styles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Pending Approval</span>
                      </button>
                    )}
                    {user?.isApprover && (
                      
                      <button
                        onClick={() => navigate("/approver/history")}
                        className={styles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Approval History</span>
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className={`${styles.dropdownButton} ${styles.logoutButton}`}
                    >
                      <FiLogOut size={18} />
                      <span>Logout</span>
                    </button>
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