import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchTasksForApprover, API_BASE,renderApprovalStatus } from "../../utils/api";
import styles from "./ApproverHome.module.css";
import tableStyles from "./ApprovalTable.module.css";
import headerStyles from "../HomePage/homepageUser.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import AppMenu from "../../components/AppMenu";
import { CircularProgress } from "@mui/material";
import {
  FiChevronDown,
  FiBriefcase,
  FiLogOut,
} from "react-icons/fi";
import {
  IconButton,
  Tooltip,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
interface Task {
  application_equip_id: string;
  application_name: string;
  transaction_id: string;
  department: string;
  department_name: string;
  location_name: string;
  role_name: string;
  role: string;
  location: string;
  reports_to: string;
  task_status: string;
}
interface ApprovalAction {
  id: number;
  approverName: string;
  approverRole: string;
  plant: string;
  corporate: string;
  action: "Approved" | "Rejected" | "Pending" | string;
  timestamp: string;
  comments?: string;
  tranasaction_id?: string;
  request_for_by?: string;
  name?: string;
  employee_code?: string;
  employee_location?: string;
  access_request_type?: string;
  training_status?: string;
  training_attachment?: string;
  application_name: string;
  department_name: string;
  role_name: string;
  vendorFirm?: string;
  vendorCode?: string;
  vendorName?: string[];
  allocatedId?: string[];
  myAction?: string; // What action I took
  myLevel?: 1 | 2; // Which level I acted at
  approver1_status?: string;
  approver2_status?: string;
  requestor_location?: string;
  requestor_department?: string;
  user_request_created_on?: string;
  approver1_action_timestamp?: string;
  approver2_action_timestamp?: string;
}

const ApprovalHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [approvalHistory, setApprovalHistory] = useState<ApprovalAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [modalTasks, setModalTasks] = useState<Task[] | null>(null);
   const closeTaskModal = () => setModalTasks(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const openTaskModal = async (id?: number) => {
    if (!id) return;

    try {
      const res = await fetch(`${API_BASE}/api/user-requests/${id}`);
      const data = await res.json();
      console.log("modal tasks data", data);
      setModalTasks(data.tasks || []);
    } catch (error) {
      console.error("Error loading modal tasks:", error);
    }
  };
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
    if (!user?.id || !user?.email) {
      setApprovalHistory([]);
      return;
    }

    setLoading(true);
    try {
      const data: any = await fetchTasksForApprover(Number(user.id));
      console.log("Fetched approval history data:", data);
      console.log("Current user email:", user.email);

      // Group by transaction ID to remove duplicates
      const tasksByTransaction = new Map<string, any>();
      
      if (Array.isArray(data)) {
        data.forEach((task) => {
          const txnId = task.user_request_transaction_id;
          if (!txnId) return;
          if (!tasksByTransaction.has(txnId)) {
            tasksByTransaction.set(txnId, task);
          }
        });
      }

      const mapped: ApprovalAction[] = Array.from(tasksByTransaction.values())
        .filter((tr: any) => {
          // Show in history if:
          // 1. Current user is Approver 1 AND has taken action (Approved or Rejected)
          // 2. Current user is Approver 2 AND has taken action (Approved or Rejected)
          
          console.log("Evaluating history record for tr:", tr);
          const isApprover1 = tr.approver1_email?.toLowerCase() === user.email?.toLowerCase();
          const isApprover2 = tr.approver2_email?.toLowerCase() === user.email?.toLowerCase();
          
          const approver1HasActed = tr.approver1_status && tr.approver1_status !== "Pending";
          const approver2HasActed = tr.approver2_status && tr.approver2_status !== "Pending";
          
          console.log(`History filter for ${tr.user_request_transaction_id}:`, {
            isApprover1,
            isApprover2,
            approver1_status: tr.approver1_status,
            approver2_status: tr.approver2_status,
            approver1HasActed,
            approver2HasActed,
            shouldShow: (isApprover1 && approver1HasActed) || (isApprover2 && approver2HasActed)
          });

          return (isApprover1 && approver1HasActed) || (isApprover2 && approver2HasActed);
        })
        .map((tr: any) => {
          const isApprover1 = tr.approver1_email?.toLowerCase() === user.email?.toLowerCase();
          const isApprover2 = tr.approver2_email?.toLowerCase() === user.email?.toLowerCase();

          let myAction = "Pending";
          let myLevel: 1 | 2 | undefined;
          let timestamp = "";
          let comments = "";

          if (isApprover1) {
            myAction = tr.approver1_status || "Pending";
            myLevel = 1;
            timestamp = tr.approver1_action_timestamp || tr.created_on || "";
            comments = tr.approver1_comments || tr.remarks || "";
          } else if (isApprover2) {
            myAction = tr.approver2_status || "Pending";
            myLevel = 2;
            timestamp = tr.approver2_action_timestamp || tr.updated_on || "";
            comments = tr.approver2_comments || tr.remarks || "";
          }

          return {
            id: tr.user_request_id,
            tranasaction_id: tr.user_request_transaction_id,
            request_for_by: tr.request_for_by,
            name: tr.request_name,
            employee_code: tr.employee_code,
            employee_location: tr.employee_location,
            access_request_type: tr.access_request_type,
            training_status: tr.training_status,
            training_attachment: tr.training_attachment,
            application_name: tr.application_name,
            department_name: tr.department_name,
            requestor_location: tr.plant_name,
            requestor_department: tr.department_name,
            created_on: tr.created_on || "",
            approver1_action_timestamp: tr.approver1_action_timestamp,
            approver2_action_timestamp: tr.approver2_action_timestamp,
            role_name: tr.role_name,
            vendorFirm: tr.vendor_firm,
            vendorCode: tr.vendor_code,
            vendorName: tr.vendor_name,
            allocatedId: tr.vendor_allocated_id,
            approverName: user.name || user.username || "-",
            approverRole: tr.role_name || tr.approver_role || tr.role || "-",
            plant: tr.plant_name || tr.plant || "-",
            corporate: tr.corporate_name || "Unichem Corp",
            action: myAction,
            myAction,
            myLevel,
            timestamp,
            comments,
            approver1_status: tr.approver1_status || "Pending",
            approver2_status: tr.approver2_status || "Pending",
          };
        });

      console.log("Mapped history records:", mapped.length);
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


  console.log("Approval history to display:", approvalHistory);

  return (
    <div className={styles.container}>
      <header className={headerStyles["main-header"]}>
        <div className={headerStyles.navLeft}>
          <div className={headerStyles.logoWrapper}>
            <img src={login_headTitle2} alt="Logo" className={headerStyles.logo} />
            <span className={headerStyles.version}>version-1.0</span>
          </div>
          <h1 className={headerStyles.title}>My Approval History</h1>
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
                    {(user.name || user.username || "U").charAt(0).toUpperCase()}
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
                        {(user.name || user.username || "U").charAt(0).toUpperCase()}
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

      <main className={tableStyles.mainContent}>
        <div className={tableStyles.tableContainer}>
          {loading ? (
            <div className={tableStyles.loadingContainer}>
              <CircularProgress />
            </div>
          ) : (
            <div className={tableStyles.tableWrapper}>
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Request For By</th>
                    <th>Name</th>
                    <th>Employee Code</th>
                    <th>Employee Location</th>
                    <th>Requestor Location</th>
                    <th>Requestor Department</th>
                    <th>Access Request Type</th>
                    <th>Vendor Firm</th>
                    <th>Vendor Code</th>
                    <th>Vendor Name</th>
                    <th>Vendor Allocated ID</th>
                    <th>Training Status</th>
                    <th>Training Attachment</th>
                    <th>Approval Status</th>
                    <th>My Level</th>
                    <th>Comments</th>
                    <th>Task</th>
                  </tr>
                </thead>
                <tbody>
                  {approvalHistory.length === 0 ? (
                    <tr>
                      <td colSpan={17} className={tableStyles.emptyState}>
                        No approval history found.
                      </td>
                    </tr>
                  ) : (
                    approvalHistory.map((a) => (
                      <tr key={`${a.tranasaction_id}-${a.myLevel}`}>
                        <td>{a.tranasaction_id}</td>
                        <td>{a.request_for_by}</td>
                        <td>{a.name}</td>
                        <td>{a.employee_code}</td>
                        <td>{a.employee_location}</td>
                        <td>{a.requestor_location}</td>
                        <td>{a.requestor_department}</td>
                        <td>{a.access_request_type}</td>
                        <td>{a.vendorFirm || "-"}</td>
                        <td>{a.vendorCode || "-"}</td>
                        <td>{a.vendorName || "-"}</td>
                        <td>{a.allocatedId || "-"}</td>
                         <td>{a.training_status || "-"}</td>
                                          <td>
                                            {a.training_attachment ? (
                                              <a
                                                href={`${API_BASE}/api/user-requests/${a.id}/attachment`}
                                                download={a.training_attachment}
                                                style={{ display: "inline-flex", alignItems: "center" }}
                                                title={`Download ${a.training_attachment}`}
                                              >
                                                <PictureAsPdfIcon
                                                  fontSize="small"
                                                  style={{ color: "#e53935" }}
                                                />
                                              </a>
                                            ) : (
                                              "-"
                                            )}
                                          </td>
                        <td>
                          <div style={{ fontSize: "0.65rem" }}>
                            <div>
                              <strong>A1:</strong>{" "}
                              <span
                                style={{
                                  color:
                                    a.approver1_status === "Approved"
                                      ? "#2e7d32"
                                      : a.approver1_status === "Rejected"
                                      ? "#d32f2f"
                                      : "#ed6c02",
                                }}
                              >
                               {renderApprovalStatus( a.approver1_status, a.approver1_action_timestamp)}

                              </span>
                            </div>
                            <div>
                              <strong>A2:</strong>{" "}
                              <span
                                style={{
                                  color:
                                    a.approver2_status === "Approved"
                                      ? "#2e7d32"
                                      : a.approver2_status === "Rejected"
                                      ? "#d32f2f"
                                      : "#ed6c02",
                                }}
                              >
                               {renderApprovalStatus(a.approver2_status,a.approver2_action_timestamp,a.approver1_status === "Rejected")}


                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>
                            A{a.myLevel}
                          </span>
                        </td>
                        <td>{a.comments || "-"}</td>
                        <td>
                          <div className={tableStyles.actionButtons}>
                            <Tooltip title="View Tasks">
                              <IconButton
                                size="small"
                                onClick={() => openTaskModal(a.id)}
                              >
                                <VisibilityOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
     {modalTasks && (
        <div className={styles.modalOverlay} onClick={closeTaskModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <div className={styles.modalIconWrap}>
                  <VisibilityOutlinedIcon fontSize="small" style={{ color: "#fff" }} />
                </div>
                <div>
                  <p className={styles.modalTitle}>Task Details</p>
                  <p className={styles.modalSubtitle}>
                    Linked tasks for this request
                  </p>
                </div>
                <span className={styles.taskCountBadge}>{modalTasks.length}</span>
              </div>
              <button className={styles.closeModalBtn} onClick={closeTaskModal}>
                ×
              </button>
            </div>

            {/* Body */}
            <div className={styles.modalBody}>
              {modalTasks.length === 0 ? (
                <p style={{ textAlign: "center", color: "#94a3b8", padding: "32px 0", margin: 0, fontSize: 14 }}>
                  No tasks found for this request.
                </p>
              ) : (
                <table className={styles.modalTable}>
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Application / Equip ID</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Location</th>
                      <th>Reports To</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalTasks.map((task, idx) => (
                      <tr key={idx}>
                        <td>{task.transaction_id}</td>
                        <td>{task.application_name}</td>
                        <td>{task.department_name}</td>
                        <td>{task.role_name}</td>
                        <td>{task.location_name}</td>
                        <td>{task.reports_to}</td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              task.task_status === "Pending"
                                ? styles.pending
                                : task.task_status === "Approved"
                                  ? styles.approved
                                  : styles.rejected
                            }`}
                          >
                            {task.task_status === "Pending" && "⏳ "}
                            {task.task_status === "Approved" && "✓ "}
                            {task.task_status === "Rejected" && "✕ "}
                            {task.task_status}
                          </span>
                        </td>
                       
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalHistoryPage;