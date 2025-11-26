import React, { useEffect, useState,useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  fetchTasksForApprover,
  fetchWorkflows,
  postApprovalAction,
} from "../../utils/api";
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

interface AccessRequest {
  id: string;
  user: string;
  approver?: string;
  employeeCode?: string;
  plant?: string;
  department?: string;
  application?: string;
  equipmentId?: string;
  role?: string;
  accessStatus?: string;
  requestStatus?: "Pending" | "Approved" | "Rejected" | string;
}

const PendingApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

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
      if (!user?.id) {
        setRequests([]);
        return;
      }

      const [tasks, workflowsResponse]: [any, any] = await Promise.all([
        fetchTasksForApprover(user.id),
        fetchWorkflows(Number(user.id)),
      ]);

      let workflows: any[] = [];
      const wfResp: any = workflowsResponse;
      if (Array.isArray(wfResp)) {
        workflows = wfResp;
      } else if (
        wfResp &&
        typeof wfResp === "object" &&
        "workflows" in wfResp &&
        Array.isArray(wfResp.workflows)
      ) {
        workflows = wfResp.workflows;
      }

      const approverPlantIds = workflows
        .filter((wf: any) => {
          if (Array.isArray(wf.approvers) && wf.approvers.length) {
            return wf.approvers.some((group: any[]) =>
              group.some(
                (u: any) =>
                  String(u?.id || u?.user_id || u?.employee_id) ===
                  String(user.id)
              )
            );
          }

          return [
            wf.approver_1_id,
            wf.approver_2_id,
            wf.approver_3_id,
            wf.approver_4_id,
            wf.approver_5_id,
          ].some((approver) =>
            String(approver || "")
              .split(",")
              .map((s) => s.trim())
              .includes(String(user.id))
          );
        })
        .map((wf: any) => Number(wf.plant_id));

      const mapped = Array.isArray(tasks)
        ? tasks
            .filter((tr) => {
              const locNum = Number(tr.location);
              const isInApproverPlant = approverPlantIds.includes(locNum);
              const isDirectlyAssigned = tr.reports_to === user.username;
              const isPending = (tr.task_status || "Pending") === "Pending";
              return isPending && (isInApproverPlant || isDirectlyAssigned);
            })
            .map((tr) => ({
              id:
                (tr.user_request_id ? String(tr.user_request_id) + "-" : "") +
                (tr.task_request_transaction_id ||
                  tr.transaction_id ||
                  tr.task_id ||
                  String(tr.task_id || tr.transaction_id)),
              transaction:
                tr.task_request_transaction_id ||
                tr.transaction_id ||
                tr.task_id ||
                String(tr.task_id || tr.transaction_id),
              user_request_id: tr.user_request_id,
              user: tr.request_name || tr.requestor_name || tr.name || "-",
              approver: tr.reports_to || tr.reportsTo || undefined,
              application:
                tr.application_name || tr.application || tr.access_request_type,
              role: tr.role_name || tr.role,
              requestStatus:
                tr.task_status ||
                tr.user_request_status ||
                tr.status ||
                "Pending",
              employeeCode: tr.employee_code,
              plant: tr.plant_name || tr.plant || tr.location,
              department: tr.department_name || tr.department,
              equipmentId: tr.application_equip_id || tr.equipment_id,
              accessStatus: tr.task_status || tr.access_status,
            }))
        : [];

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
        String((selectedRequest as any).transaction),
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
        String((selectedRequest as any).transaction),
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
       <div className={tableStyles.tableContainer}>
          <h2 className={tableStyles.tableTitle}>Pending Access Requests</h2>

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
                    <th>User</th>
                    <th>Application</th>
                    <th>Role</th>
                    <th>Plant</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={tableStyles.emptyState}>
                        No pending requests found.
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{r.user}</td>
                        <td>{r.application}</td>
                        <td>{r.role}</td>
                        <td>{r.plant}</td>
                        <td>
                          <span className={tableStyles.statusBadge}>
                            {r.requestStatus}
                          </span>
                        </td>
                        <td>
                          <div className={tableStyles.actionButtons}>
                            <Tooltip title="View details">
                              <IconButton
                                size="small"
                                onClick={() => handleViewRequest(r)}
                              >
                                <VisibilityOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => onApproveClick(r)}
                              >
                                <CheckCircleOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => onRejectClick(r)}
                              >
                                <CancelOutlinedIcon fontSize="small" />
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

      {/* Approve Dialog */}
      <Dialog
        open={openApproveDialog}
        onClose={() => setOpenApproveDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Approve Request</DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: 12 }}>
            <strong>Request:</strong> {selectedRequest?.id || "-"}
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
        <DialogTitle>Reject Request</DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: 12 }}>
            <strong>Request:</strong> {selectedRequest?.id || "-"}
          </div>
          <TextField
            label="Reason for rejection"
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
    </div>
  );
};

export default PendingApprovalPage;