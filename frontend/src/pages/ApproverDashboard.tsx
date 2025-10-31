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
      // Request all user requests (backend returns nested tasks per request)
      const token = (user as any)?.token || localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/user-requests`, {
        method: "GET",
        headers,
      });
      console.log("[DEBUG] fetchRequests: response status", res.status);
      if (!res.ok) throw new Error("Failed to fetch requests");
      const data = await res.json();
      console.log("[DEBUG] fetchRequests: backend data", data);

      const mapped: AccessRequest[] = [];

      if (Array.isArray(data)) {
        // Backend returns an array of user_request objects, each may include a `tasks` array
        for (const req of data) {
          const baseUser =
            req.name || req.requestor_name || req.username || "-";
          const userRequestTransaction =
            req.transaction_id || req.ritmNumber || req.id;

          // If the row already represents task-level rows (flat), map directly
          if (req.task_id || req.task_request_transaction_id) {
            mapped.push({
              id:
                req.task_request_transaction_id ||
                req.task_id ||
                userRequestTransaction,
              user: baseUser,
              approver: req.reports_to || req.reportsTo || undefined,
              application:
                req.application_name ||
                req.application ||
                req.access_request_type,
              role: req.role_name || req.role,
              requestStatus:
                req.task_status ||
                req.user_request_status ||
                req.status ||
                "Pending",
              employeeCode: req.employee_code,
              plant: req.plant_name || req.location || req.plant,
              department: req.department_name || req.department,
              equipmentId: req.application_equip_id || req.equipment_id,
              accessStatus: req.task_status || req.access_status,
            });
          }

          // If request has nested tasks, flatten them to per-task rows
          if (Array.isArray(req.tasks) && req.tasks.length) {
            for (const t of req.tasks) {
              mapped.push({
                id: t.transaction_id || t.task_id || userRequestTransaction,
                user: baseUser,
                approver: t.reports_to || t.reportsTo || req.reports_to || undefined,
                application:
                  t.application_name ||
                  t.application ||
                  req.access_request_type,
                role: t.role_name || t.role,
                requestStatus: t.task_status || req.status || "Pending",
                employeeCode: req.employee_code,
                plant: t.location || t.location_name || req.plant_name,
                department: t.department_name || t.department,
                equipmentId: t.application_equip_id || t.equipment_id,
                accessStatus: t.task_status || req.access_status,
              });
            }
          }
        }
      }

      // If a user is logged in, and they appear to be an approver, show only tasks
      // assigned to them (match by reports_to / approver name). Otherwise show all.
      let visible = mapped;
      try {
        const username = (user as any)?.username || (user as any)?.name || "";
        if (username) {
          const uname = String(username).toLowerCase();
          visible = mapped.filter((m) => {
            const ap = (m as any).approver || "";
            return String(ap).toLowerCase() === uname;
          });
        }
      } catch (e) {
        // fallback to showing all if any error
        visible = mapped;
      }

      console.log("[DEBUG] fetchRequests: mapped requests", mapped);
      console.log("[DEBUG] fetchRequests: visible for current user", visible);
      setRequests(visible);
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
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/task?approver_id=${encodeURIComponent(
          user.id
        )}`,
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
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user-requests/${encodeURIComponent(
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
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user-requests/${encodeURIComponent(
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
