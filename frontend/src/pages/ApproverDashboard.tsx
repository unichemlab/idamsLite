import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ApproverDashboard.module.css";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
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
import login_headTitle2 from "../assets/login_headTitle2.png";
import { useAuth } from "../context/AuthContext";
import {
  fetchTasksForApprover,
  fetchWorkflows,
  postApprovalAction,
} from "../utils/api";

// Types
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

interface ApprovalAction {
  approverName: string;
  approverRole: string;
  plant: string;
  corporate: string;
  action: "Approved" | "Rejected" | "Pending" | string;
  timestamp: string;
  comments?: string;
}

const ApproverDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "access-requests" | "approved-rejected"
  >("access-requests");
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalAction[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog / selection state for approve/reject
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(
    null
  );
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [actionComments, setActionComments] = useState("");
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    loadRequestsAndHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRequestsAndHistory() {
    await Promise.all([fetchRequests(), fetchApprovalHistory()]);
  }

  async function fetchRequests() {
    setLoading(true);
    try {
      if (!user?.id) {
        setRequests([]);
        return;
      }

      const [tasks, workflowsResponse]: [any, any] = await Promise.all([
        fetchTasksForApprover(user.id),
        // ask backend to return only workflows relevant to this approver when possible
        fetchWorkflows(Number(user.id)),
      ]);

      // workflowsResponse can be an object with a 'workflows' property, or an array directly
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

      // workflows may store approver ids as numbers; compare numerically/string-safe
      // Workflows may come in two shapes:
      // - legacy: { approver_1_id, approver_2_id, ... }
      // - modern: { approvers: [ [userObj...], [userObj...], ... ] }
      const approverPlantIds = workflows
        .filter((wf: any) => {
          // modern shape: check approvers arrays for a matching user id
          if (Array.isArray(wf.approvers) && wf.approvers.length) {
            return wf.approvers.some((group: any[]) =>
              group.some(
                (u: any) =>
                  String(u?.id || u?.user_id || u?.employee_id) ===
                  String(user.id)
              )
            );
          }

          // fallback to legacy comma-separated fields
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

      console.log("ApproverDashboard approverPlantIds:", approverPlantIds);

      const mapped = Array.isArray(tasks)
        ? tasks
            .filter((tr) => {
              const locNum = Number(tr.location);
              const isInApproverPlant = approverPlantIds.includes(locNum);
              const isDirectlyAssigned = tr.reports_to === user.username;
              // Only show PENDING requests in Access Requests tab
              const isPending = (tr.task_status || "Pending") === "Pending";
              return isPending && (isInApproverPlant || isDirectlyAssigned);
            })
            .map((tr) => ({
              // Ensure a stable, unique id for React list keys. Combine user_request_id and task id/transaction
              id:
                (tr.user_request_id ? String(tr.user_request_id) + "-" : "") +
                (tr.task_request_transaction_id ||
                  tr.transaction_id ||
                  tr.task_id ||
                  String(tr.task_id || tr.transaction_id)),
              // Raw transaction id required by approvals API
              transaction:
                tr.task_request_transaction_id ||
                tr.transaction_id ||
                tr.task_id ||
                String(tr.task_id || tr.transaction_id),
              // Include user_request_id so backend can scope the update to this request
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

      console.log("ApproverDashboard mapped requests (PENDING only):", mapped);

      setRequests(mapped);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchApprovalHistory() {
    if (!user?.id) {
      setApprovalHistory([]);
      return;
    }
    try {
      const data: any = await fetchTasksForApprover(Number(user.id));
      const mapped: ApprovalAction[] = Array.isArray(data)
        ? data
            // Filter to show only APPROVED or REJECTED (not Pending)
            .filter((tr: any) => {
              const status = tr.task_status || "Pending";
              return status === "Approved" || status === "Rejected";
            })
            .map((tr: any) => {
              // Determine which approver actually approved/rejected
              let approverName = "-";
              let approverAction = tr.task_status || "Pending";

              // Check if Approver2 took the action
              if (tr.approver2_action && tr.approver2_action !== "Pending") {
                approverName =
                  tr.approver2_name || tr.approver2_email || "Approver 2";
                approverAction = tr.approver2_action;
              }
              // Otherwise check Approver1
              else if (
                tr.approver1_action &&
                tr.approver1_action !== "Pending"
              ) {
                approverName =
                  tr.approver1_name || tr.approver1_email || "Approver 1";
                approverAction = tr.approver1_action;
              }
              // Fallback to legacy field
              else {
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
      console.log(
        "ApproverDashboard approval history (APPROVED/REJECTED only):",
        mapped
      );
      setApprovalHistory(mapped);
    } catch (err) {
      console.error("Error fetching approval history:", err);
      setApprovalHistory([]);
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
      await fetchApprovalHistory();
      setOpenApproveDialog(false);
      setSelectedRequest(null);
      setActionComments("");
    } catch (err) {
      // handle error
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
      await fetchApprovalHistory();
      setOpenRejectDialog(false);
      setSelectedRequest(null);
      setActionComments("");
    } catch (err) {
      // handle error
    } finally {
      setActionInProgress(false);
    }
  };

  const handleLogout = () => {
    try {
      logout();
    } catch {
      localStorage.removeItem("authUser");
      localStorage.removeItem("token");
    }
    navigate("/");
  };

  const AccessRequestsTable: React.FC<{
    requests: AccessRequest[];
    onView: (r: AccessRequest) => void;
    onApprove: (r: AccessRequest) => void;
    onReject: (r: AccessRequest) => void;
  }> = ({ requests, onView, onApprove, onReject }) => {
    return (
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>User</th>
              <th>Application</th>
              <th>Role</th>
              <th>Status</th>
              <th style={{ minWidth: 150 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 16 }}>
                  No requests found.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.user}</td>
                  <td>{r.application}</td>
                  <td>{r.role}</td>
                  <td>{r.requestStatus}</td>
                  <td>
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <Tooltip title="View details">
                        <IconButton
                          size="small"
                          onClick={() => onView(r)}
                          aria-label={`view-${r.id}`}
                        >
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {r.requestStatus === "Pending" && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => onApprove(r)}
                              aria-label={`approve-${r.id}`}
                            >
                              <CheckCircleOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => onReject(r)}
                              aria-label={`reject-${r.id}`}
                            >
                              <CancelOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const ApprovalHistoryTable: React.FC<{ actions: ApprovalAction[] }> = ({
    actions,
  }) => {
    return (
      <div className={styles.tableContainer}>
        <table className={styles.table}>
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
            {actions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 16 }}>
                  No approval history.
                </td>
              </tr>
            ) : (
              actions.map((a, idx) => (
                <tr key={idx}>
                  <td>{a.approverName}</td>
                  <td>{a.approverRole}</td>
                  <td>{a.plant}</td>
                  <td>{a.corporate}</td>
                  <td
                    style={{
                      color: a.action === "Approved" ? "#4caf50" : "#f44336",
                    }}
                  >
                    {a.action}
                  </td>
                  <td>{a.timestamp}</td>
                  <td>{a.comments || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
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
    <div className={styles["main-container"]}>
      <aside className={styles.sidebar}>
        <div className={styles["sidebar-header"]}>
          <img
            src={login_headTitle2}
            alt="Company logo"
            style={{ width: 250, height: 35 }}
          />
          <br />
          <span>Unichem Laboratories</span>
        </div>
        <nav>
          <div className={styles["sidebar-group"]}>OVERVIEW</div>
          <button
            className={`${styles["nav-button"]} ${
              activeTab === "access-requests" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("access-requests")}
          >
            <ListAltIcon fontSize="small" /> &nbsp; Access Requests
          </button>
          <button
            className={`${styles["nav-button"]} ${
              activeTab === "approved-rejected" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("approved-rejected")}
          >
            <AssignmentIcon fontSize="small" /> &nbsp; Approved/Rejected By
          </button>
          <div className={styles["sidebar-footer"]}>
            <div className={styles["admin-info"]}>
              <div className={styles.avatar}>
                {user?.username?.charAt(0).toUpperCase() || "A"}
              </div>
              <div>
                <strong>{user?.username || "approver"}</strong>
                <div className={styles.subtext}>
                  {(user as any)?.role || "Approver"}
                </div>
              </div>
            </div>
            <button className={styles["logout-button"]} onClick={handleLogout}>
              <LogoutIcon fontSize="small" /> &nbsp; Logout
            </button>
          </div>
        </nav>
      </aside>
      <main className={styles["main-content"]}>
        <header className={styles["main-header"]}>
          <h2 className={styles["header-title"]}>Approver Dashboard</h2>
          <div className={styles["header-icons"]}>
            <span className={styles["header-icon"]}>
              <NotificationsIcon fontSize="small" />
            </span>
            <span className={styles["header-icon"]}>
              <SettingsIcon fontSize="small" />
            </span>
          </div>
        </header>
        <div className={styles.pageContent}>
          {loading ? (
            <div
              style={{ display: "flex", justifyContent: "center", padding: 24 }}
            >
              <CircularProgress />
            </div>
          ) : activeTab === "access-requests" ? (
            <section className={styles.sectionWrap}>
              <div className={styles.card}>
                <AccessRequestsTable
                  requests={requests}
                  onView={handleViewRequest}
                  onApprove={onApproveClick}
                  onReject={onRejectClick}
                />
              </div>
            </section>
          ) : (
            <section className={styles.sectionWrap}>
              <div className={styles.card}>
                <ApprovalHistoryTable actions={approvalHistory} />
              </div>
            </section>
          )}
        </div>
      </main>
      {/* Approve dialog */}
      <Dialog
        open={openApproveDialog}
        onClose={() => setOpenApproveDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Approve request</DialogTitle>
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
      {/* Reject dialog */}
      <Dialog
        open={openRejectDialog}
        onClose={() => setOpenRejectDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Reject request</DialogTitle>
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

export default ApproverDashboard;
