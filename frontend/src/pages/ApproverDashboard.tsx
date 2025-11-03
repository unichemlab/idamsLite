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

/**
 * Self-contained Approver Dashboard
 *
 * - Replace endpoints if backend routes differ
 * - Copies local state for requests and approvalHistory
 */

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
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

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
    // Load requests and approval history regardless of whether `user.id` exists in the
    // auth object. Backend currently returns all user_requests (with nested tasks),
    // so frontend will map and display per-task rows. This avoids the dashboard
    // showing "No requests found" when `user.id` is not present in AuthContext.
    loadRequestsAndHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRequestsAndHistory() {
    await Promise.all([fetchRequests(), fetchApprovalHistory()]);
  }

  async function fetchRequests() {
    setLoading(true);
    try {
      // Approach:
      // 1) If user is authenticated, fetch workflows where this user is an approver
      //    -> that returns workflow rows including plant_id
      // 2) Use the plant_id list to fetch tasks and filter tasks that belong to those plants
      const token = (user as any)?.token || localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      // API base URL fallback to local backend when env not set (avoids dev server returning index.html)
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

      let plantIds: number[] = [];
      if ((user as any)?.id) {
        const wRes = await fetch(
          `${API_BASE}/api/workflows?approver_id=${encodeURIComponent(
            (user as any).id
          )}`,
          { method: "GET", headers }
        );
        if (wRes.ok) {
          const wdata = await wRes.json();
          // workflowController returns { workflows }
          const workflows = wdata.workflows || wdata || [];
          plantIds = Array.from(
            new Set(
              workflows
                .map((w: any) => Number(w.plant_id))
                .filter((n: number) => !isNaN(n))
            )
          );
        }
      }

      // Fetch all tasks and filter client-side by plant ids. If there are no plantIds
      // for the approver, fall back to matching tasks by approver name/id so approver
      // still sees their items.
      const tRes = await fetch(`${API_BASE}/api/task`, {
        method: "GET",
        headers,
      });
      if (!tRes.ok) throw new Error("Failed to fetch tasks");
      const tasks = await tRes.json();

      // Map tasks rows to AccessRequest and filter by plantIds or approver match
      const mapped: AccessRequest[] = Array.isArray(tasks)
        ? tasks
            .filter((tr: any) => {
              const loc = tr.location ?? tr.plant_id ?? tr.plantId ?? null;
              const locNum = loc !== null ? Number(loc) : null;

              // If we have plantIds for this approver, filter by them
              if (plantIds && plantIds.length > 0) {
                return locNum !== null && plantIds.includes(locNum);
              }

              // Otherwise, try to match by approver identity (reports_to, assigned_to, assigned_to_name)
              const username = (user as any)?.username || "";
              if (
                tr.assigned_to &&
                Number(tr.assigned_to) === Number((user as any)?.id)
              )
                return true;
              if (
                tr.assigned_to_name &&
                typeof tr.assigned_to_name === "string"
              ) {
                if (
                  tr.assigned_to_name
                    .toLowerCase()
                    .includes(username.toLowerCase())
                )
                  return true;
              }
              if (tr.reports_to && typeof tr.reports_to === "string") {
                if (
                  tr.reports_to.toLowerCase().includes(username.toLowerCase())
                )
                  return true;
              }

              // fallback: include tasks where task_request_transaction_id or requestor matches
              return false;
            })
            .map((tr: any) => ({
              id:
                tr.task_request_transaction_id ||
                tr.transaction_id ||
                tr.task_id ||
                String(tr.task_id || tr.transaction_id),
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
      console.error("[DEBUG] fetchRequests error:", err);
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
      const token = (user as any)?.token || localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
      const res = await fetch(
        `${API_BASE}/api/task?approver_id=${encodeURIComponent(user.id)}`,
        {
          method: "GET",
          headers,
        }
      );
      if (!res.ok) {
        // allow fallback to empty list
        throw new Error("Failed to fetch approval history");
      }
      const data = await res.json();
      const mapped: ApprovalAction[] = Array.isArray(data)
        ? data.map((tr: any) => ({
            approverName:
              tr.reports_to ||
              tr.approver_name ||
              tr.approver ||
              tr.username ||
              "-",
            approverRole: tr.role_name || tr.approver_role || tr.role || "-",
            plant: tr.plant_name || tr.plant || "-",
            corporate: tr.corporate_name || "Unichem Corp",
            action:
              tr.task_status === "Approved"
                ? "Approved"
                : tr.task_status === "Rejected"
                ? "Rejected"
                : tr.task_status || "Pending",
            timestamp: tr.updated_on || tr.created_on || tr.timestamp || "",
            comments: tr.remarks || tr.comments || "",
          }))
        : [];
      setApprovalHistory(mapped);
    } catch (err) {
      console.warn("fetchApprovalHistory error:", err);
      setApprovalHistory([]);
    }
  }

  // Approve action
  const handleApprove = async () => {
    if (!selectedRequest || !user?.id) return;
    setActionInProgress(true);
    try {
      // Adjust endpoint if your backend differs
      const token = (user as any)?.token || localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(
        `${API_BASE}/api/approvals/${encodeURIComponent(
          selectedRequest.id
        )}/approve`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            approver_id: user.id,
            comments: actionComments,
          }),
        }
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Approve failed: ${res.status} ${txt}`);
      }
      // refresh lists
      await fetchRequests();
      await fetchApprovalHistory();
      setOpenApproveDialog(false);
      setSelectedRequest(null);
      setActionComments("");
    } catch (err) {
      console.error("handleApprove error:", err);
      // you may show a toast/snackbar here
    } finally {
      setActionInProgress(false);
    }
  };

  // Reject action
  const handleReject = async () => {
    if (!selectedRequest || !user?.id) return;
    setActionInProgress(true);
    try {
      // Adjust endpoint if your backend differs
      const token = (user as any)?.token || localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(
        `${API_BASE}/api/approvals/${encodeURIComponent(
          selectedRequest.id
        )}/reject`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            approver_id: user.id,
            comments: actionComments,
          }),
        }
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Reject failed: ${res.status} ${txt}`);
      }
      // refresh lists
      await fetchRequests();
      await fetchApprovalHistory();
      setOpenRejectDialog(false);
      setSelectedRequest(null);
      setActionComments("");
    } catch (err) {
      console.error("handleReject error:", err);
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

  // Internal Access Requests table (simple)
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

  // Internal Approval History table
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
    // navigate to details page if you have it
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
