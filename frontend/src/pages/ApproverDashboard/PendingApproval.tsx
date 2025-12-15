import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  fetchTasksForApprover,
  fetchWorkflows,
  postApprovalAction,
  API_BASE
} from "../../utils/api";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import styles from "./ApproverHome.module.css";
import headerStyles from "../HomePage/homepageUser.module.css";
import tableStyles from "./ApprovalTable.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
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
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LogoutIcon from "@mui/icons-material/Logout";
import LockIcon from "@mui/icons-material/Lock";

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

interface AccessRequest {
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
  requestStatus?: "Pending" | "Approved" | "Rejected" | string;
  approver1_status?: string;
  approver2_status?: string;
  canApprove?: boolean; // New field to track if current user can approve
  approvalLevel?: 1 | 2; // Which level of approval this is
}

const PendingApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [modalTasks, setModalTasks] = useState<Task[] | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(
    null
  );
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [actionComments, setActionComments] = useState("");
  const [actionInProgress, setActionInProgress] = useState(false);
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
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      if (!user?.id || !user?.email) {
        console.warn("No user ID or email available");
        setRequests([]);
        return;
      }

      // Fetch tasks - backend already filters for approvers
      const tasks = await fetchTasksForApprover(user.id);
      
      console.log("Raw tasks from backend:", tasks);
      console.log("Total tasks fetched:", Array.isArray(tasks) ? tasks.length : 0);
      console.log("Current user email:", user.email);

      // ============================================
      // GROUP BY TRANSACTION ID AND REMOVE DUPLICATES
      // ============================================
      const tasksByTransaction = new Map<string, any>();
      
      if (Array.isArray(tasks)) {
        tasks.forEach((task) => {
          const txnId = task.user_request_transaction_id;
          if (!txnId) return;

          // If we haven't seen this transaction, add it
          if (!tasksByTransaction.has(txnId)) {
            tasksByTransaction.set(txnId, task);
          } else {
            // If we have seen it, keep the one with more info or merge
            const existing = tasksByTransaction.get(txnId);
            // You can add merge logic here if needed
            // For now, we'll keep the first one
          }
        });
      }

      console.log("Unique transactions:", tasksByTransaction.size);

      // ============================================
      // MAP AND DETERMINE APPROVAL PERMISSIONS
      // ============================================
      const mapped = Array.from(tasksByTransaction.values())
        .filter((tr) => {
          // Filter conditions:
          // 1. Task status must be Pending
          // 2. User request status must be Pending (not Approved/Rejected/Completed)
          // 3. If Approver 1 has rejected, don't show to anyone (workflow stops)
          // 4. If Approver 2 has already acted, don't show to other Approver 2s
          const isTaskPending = (tr.task_status || "Pending") === "Pending";
          const isUserRequestPending = (tr.user_request_status || "Pending") === "Pending";
          const approver1Status = tr.approver1_status || "Pending";
          const approver2Status = tr.approver2_status || "Pending";
          const approver1Rejected = approver1Status === "Rejected";
          const approver2HasActed = approver2Status !== "Pending";
          
          // Additional filtering for current user's perspective
          const isApprover1 = tr.approver1_email?.toLowerCase() === user.email?.toLowerCase();
          const approver1HasActed = approver1Status !== "Pending";
          
          // If current user is Approver 1 and has already acted, don't show
          if (isApprover1 && approver1HasActed) {
            return false;
          }
          
          // If current user is NOT Approver 1 (potential Approver 2)
          if (!isApprover1) {
            // Only show if Approver 1 has approved AND no one from pool acted yet
            if (approver1Status !== "Approved" || approver2HasActed) {
              return false;
            }
          }
          
          console.log(`Task ${tr.user_request_transaction_id}:`, {
            task_status: tr.task_status,
            user_request_status: tr.user_request_status,
            isTaskPending,
            isUserRequestPending,
            approver1_status: tr.approver1_status,
            approver2_status: tr.approver2_status,
            approver1_email: tr.approver1_email,
            approver2_email: tr.approver2_email,
            approver1Rejected,
            approver2HasActed,
            isApprover1,
            approver1HasActed,
          });
          
          // Show only if:
          // - Both task and user request are pending
          // - AND Approver 1 has NOT rejected (if rejected, workflow stops)
          // - AND Approver 2 has NOT acted yet (if acted, other Approver 2s shouldn't see it)
          return isTaskPending && isUserRequestPending && !approver1Rejected && !approver2HasActed;
        })
        .map((tr: any) => {
          // Determine which approver took action (for display)
          let approverName = "-";
          let approverAction = tr.task_status || "Pending";

          // Determine approval level and permissions
          const isApprover1 = tr.approver1_email?.toLowerCase() === user.email?.toLowerCase();
          const isApprover2 = !isApprover1; // If not Approver 1, treat as potential Approver 2
          
          const approver1Status = tr.approver1_status || "Pending";
          const approver2Status = tr.approver2_status || "Pending";

          let canApprove = false;
          let approvalLevel: 1 | 2 | undefined;

          // Logic: 
          // - Approver 1 can approve ONLY if their status is Pending
          // - Approver 2 can approve if Approver 1 has approved and no one acted yet
          
          if (isApprover1 && approver1Status === "Pending") {
            canApprove = true;
            approvalLevel = 1;
          } else if (isApprover2 && approver1Status === "Approved" && approver2Status === "Pending") {
            canApprove = true;
            approvalLevel = 2;
          }

          // Set approver name for display
          if (approver2Status !== "Pending") {
            approverName = tr.approver2_name || tr.approver2_email || "Approver 2";
            approverAction = approver2Status;
          } else if (approver1Status !== "Pending") {
            approverName = tr.approver1_name || tr.approver1_email || "Approver 1";
            approverAction = approver1Status;
          } else {
            approverName = tr.reports_to || tr.approver_name || tr.approver || tr.username || "-";
          }

          console.log(`Request ${tr.user_request_transaction_id} permissions:`, {
            isApprover1,
            isApprover2,
            approver1Status,
            approver2Status,
            canApprove,
            approvalLevel
          });

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
            role_name: tr.role_name,
            approverName,
            approverRole: tr.role_name || tr.approver_role || tr.role || "-",
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
            approver1_status: approver1Status,
            approver2_status: approver2Status,
            canApprove,
            approvalLevel,
          };
        });

      console.log("Mapped pending requests:", mapped.length);
      console.log("Sample request:", mapped[0]);
      
      setRequests(mapped);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async () => {
    if (!selectedRequest || !user?.id) return;
    setActionInProgress(true);
    try {
      await postApprovalAction(
        String((selectedRequest as any).id),
        "approve",
        {
          approver_id: user.id,
          comments: actionComments,
        }
      );
      await fetchRequests();
      setOpenApproveDialog(false);
      setSelectedRequest(null);
      setActionComments("");
    } catch (err) {
      console.error("Error approving request:", err);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user?.id) return;
    setActionInProgress(true);
    try {
      await postApprovalAction(
        String((selectedRequest as any).id),
        "reject",
        {
          approver_id: user.id,
          comments: actionComments,
        }
      );
      await fetchRequests();
      setOpenRejectDialog(false);
      setSelectedRequest(null);
      setActionComments("");
    } catch (err) {
      console.error("Error rejecting request:", err);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

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

  const closeTaskModal = () => setModalTasks(null);

  const handleViewRequest = (r: AccessRequest) => {
    navigate(`/access-request/${encodeURIComponent(r.id)}`, {
      state: { request: r },
    });
  };

  const onApproveClick = (r: AccessRequest) => {
    setSelectedRequest(r);
    setActionComments("");
    setOpenApproveDialog(true);
  };

  const onRejectClick = (r: AccessRequest) => {
    setSelectedRequest(r);
    setActionComments("");
    setOpenRejectDialog(true);
  };

  console.log("Final requests to display:", requests);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={headerStyles["main-header"]}>
        <div className={headerStyles.navLeft}>
          <div className={headerStyles.logoWrapper}>
            <img src={login_headTitle2} alt="Logo" className={headerStyles.logo} />
            <span className={headerStyles.version}>version-1.0</span>
          </div>
          <h1 className={headerStyles.title}>Pending Access Requests</h1>
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
                  </div>
                  {/* Actions */}
                  <div className={headerStyles.dropdownActions}>
                    <button
                      onClick={() => navigate("/homepage")}
                      className={headerStyles.dropdownButton}
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

      {/* Main Content */}
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
                    <th>Access Request Type</th>
                    <th>Approval Status</th>
                    <th>Training Status</th>
                    <th>Training Attachment</th>
                    <th>Tasks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={11} className={tableStyles.emptyState}>
                        No pending requests found.
                      </td>
                    </tr>
                  ) : (
                    requests.map((a) => (
                      <tr key={a.tranasaction_id}>
                        <td>{a.tranasaction_id}</td>
                        <td>{a.request_for_by}</td>
                        <td>{a.name}</td>
                        <td>{a.employee_code}</td>
                        <td>{a.employee_location}</td>
                        <td>{a.access_request_type}</td>
                        <td>
                          <div style={{ fontSize: "0.85rem" }}>
                            <div>
                              <strong>Approver 1:</strong>{" "}
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
                                {a.approver1_status || "Pending"}
                              </span>
                            </div>
                            <div>
                              <strong>Approver 2:</strong>{" "}
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
                                {a.approver2_status || "Pending"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>{a.training_status}</td>
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
                        <td>
                          <div className={tableStyles.actionButtons}>
                            {a.canApprove ? (
                              <>
                                <Tooltip title={`Approve (Level ${a.approvalLevel})`}>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => onApproveClick(a)}
                                  >
                                    <CheckCircleOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={`Reject (Level ${a.approvalLevel})`}>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => onRejectClick(a)}
                                  >
                                    <CancelOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : (
                              <Tooltip
                                title={
                                  a.approvalLevel === 2 && a.approver1_status !== "Approved"
                                    ? "Waiting for Approver 1"
                                    : "Already actioned or not your turn"
                                }
                              >
                                <span>
                                  <IconButton size="small" disabled>
                                    <LockIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
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

      {/* Approve Dialog */}
      <Dialog
        open={openApproveDialog}
        onClose={() => setOpenApproveDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Approve Request - Level {selectedRequest?.approvalLevel}
        </DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: 12 }}>
            <strong>Request ID:</strong> {selectedRequest?.tranasaction_id || "-"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Name:</strong> {selectedRequest?.name || "-"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Employee Code:</strong> {selectedRequest?.employee_code || "-"}
          </div>
          <TextField
            label="Comments (optional)"
            fullWidth
            multiline
            rows={4}
            value={actionComments}
            onChange={(e) => setActionComments(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenApproveDialog(false)}
            disabled={actionInProgress}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleApprove}
            disabled={actionInProgress}
          >
            {actionInProgress ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Approve"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={openRejectDialog}
        onClose={() => setOpenRejectDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Reject Request - Level {selectedRequest?.approvalLevel}
        </DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: 12 }}>
            <strong>Request ID:</strong> {selectedRequest?.tranasaction_id || "-"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Name:</strong> {selectedRequest?.name || "-"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Employee Code:</strong> {selectedRequest?.employee_code || "-"}
          </div>
          <TextField
            label="Reason for rejection"
            fullWidth
            multiline
            rows={4}
            value={actionComments}
            onChange={(e) => setActionComments(e.target.value)}
            variant="outlined"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenRejectDialog(false)}
            disabled={actionInProgress}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={actionInProgress}
          >
            {actionInProgress ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Reject"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {modalTasks && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Task Details</h3>
            <button className={styles.closeModalBtn} onClick={closeTaskModal}>
              ×
            </button>
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
                        {task.task_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingApprovalPage;