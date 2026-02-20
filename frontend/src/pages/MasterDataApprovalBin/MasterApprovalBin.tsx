import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchApprovals, approveApproval, rejectApproval } from "../../utils/api";
import styles from "./MasterApprovalBin.module.css";
import plantStyles from "../Plant/PlantMasterTable.module.css";
import AppHeader from "../../components/Common/AppHeader";
import paginationStyles from "../../styles/Pagination.module.css";
import { API_BASE } from "../../utils/api";
import { FiChevronDown, FiLogOut } from "react-icons/fi";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import LockIcon from "@mui/icons-material/Lock";
import { useDepartmentContext } from "..//DepartmentTable/DepartmentContext";
import { usePlantContext } from "../Plant/PlantContext";
import { useRoles } from "../RoleMasterUser/RolesContext";
import { useAuth } from "../../context/AuthContext";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  CircularProgress,
  Box
} from "@mui/material";
interface Approval {
  id: number;
  module: string;
  table_name: string;
  action: string;
  record_id: number | null;
  old_value: any;
  new_value: any;
  requested_by: number;
  requested_by_username: string;
  status: string;
  comments: string;
  created_at: string;
  approved_by: number | null;
  approved_by_username: string | null;
  approved_at: string | null;
  approval_comments: string | null;
}

const MasterApprovalBin: React.FC = () => {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [filter, setFilter] = useState({
    module: "all",
    status: "PENDING",
  });
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<"approve" | "reject" | null>(null);
  const [actionComments, setActionComments] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const { plants } = usePlantContext();
  const { departments } = useDepartmentContext();
  const { roles } = useRoles(); // Assuming you have this
  const [users, setUsers] = useState<{ id: number; name: string; username: string }[]>([]);
  const [vendors, setVendors] = useState<{ id: number; vendor_name: string; name?: string }[]>([]);
  useEffect(() => { loadUsers(); loadVendors(); }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.users ?? [];
        setUsers(list);
      }
    } catch (err) {
      console.warn("Could not load users for name resolution:", err);
    }
  };
  const loadVendors = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/vendors`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.vendors ?? [];
        setVendors(list);
      }
    } catch (err) {
      console.warn("Could not load vendors for name resolution:", err);
    }
  };
  useEffect(() => {
    setCurrentPage(1);   // Reset page
    loadApprovals();
  }, [filter]);
  const loadApprovals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.module !== "all") params.append("module", filter.module);
      if (filter.status !== "all") params.append("status", filter.status);

      const res = await fetchApprovals(params.toString());
      const data = Array.isArray(res) ? res : (res?.data ?? [])
      console.log("data are fetched",data);
      setApprovals(data);
    } catch (err) {
      console.error("Error loading approvals:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(approvals.length / rowsPerPage));
  const pageData = approvals.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );


  const handleViewDetails = (approval: Approval) => {
    navigate(`/admin-approval/${approval.id}`);
  };

  const handleApproveClick = (approval: Approval) => {
    setSelectedApproval(approval);
    setModalAction("approve");
    setActionComments("");
    setShowModal(true);
  };

  const handleRejectClick = (approval: Approval) => {
    setSelectedApproval(approval);
    setModalAction("reject");
    setActionComments("");
    setShowModal(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedApproval || !modalAction) return;

    try {
      if (modalAction === "approve") {
        await approveApproval(selectedApproval.id, actionComments);
        alert("✅ Approval successful! Changes have been applied.");
      } else {
        if (!actionComments.trim()) {
          alert("Please provide rejection comments");
          return;
        }
        await rejectApproval(selectedApproval.id, actionComments);
        alert("❌ Request rejected successfully.");
      }
      setShowModal(false);
      setModalAction(null);
      setSelectedApproval(null);
      setActionComments("");
      loadApprovals();
    } catch (err: any) {
      console.error("Error processing approval:", err);
      alert(`Error: ${err.message || "Failed to process approval"}`);
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "create":
        return "#10b981";
      case "update":
        return "#3b82f6";
      case "delete":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "#f59e0b";
      case "APPROVED":
        return "#10b981";
      case "REJECTED":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getPlantName = (id: number): string => {
    const plant = plants.find((p) => p.id === id);
    return plant?.plant_name ?? `Plant ${id}`;
  };

  const getDepartmentName = (id: number): string => {
    const dept = departments.find((d) => d.id === id);
    return dept ? dept.department_name || dept.name : `Dept ${id}`;
  };

  const getRoleName = (id: number): string => {
    const role = roles.find((r) => r.id === id);
    return role ? role.name : `Role ${id}`;
  };

  const getUserName = (id: number): string => {
    const found = users.find((u) => u.id === id);  // ✅ check fetched list first
    if (found) return found.name || found.username;
    if (user && user.id === id) return user.name || user.username; // ✅ logged-in user fallback
    return `User ${id}`;  // ✅ last resort
  };

  const getVendorName = (id: number): string => {
    const found = vendors.find((v) => v.id === id);
    return found ? found.vendor_name || found.name || `Vendor ${id}` : `Vendor ${id}`;
  };

  /** Replace known ID fields with their human-readable names in a data object */
  /** Detect comma-separated numeric strings like "1,3,5,7,4" */
  const isCommaSeparatedIds = (value: any): boolean =>
    typeof value === "string" &&
    value.trim().length > 0 &&
    /^[\d\s,]+$/.test(value) &&
    value.includes(",");

  const isVendorKey = (key: string): boolean =>
    key === "vendor_id" ||
    key === "vendor" || key === "application_vendor" ||
    /(_vendor_id|_vendor_name)$/.test(key) ||
    /^(vendor_|application_vendor)/.test(key);

  const resolveCommaSeparatedIds = (
    value: string,
    resolver: (id: number) => string
  ): string =>
    value
      .split(",")
      .map((v) => resolver(parseInt(v.trim(), 10)))
      .join(", ");

  /** Returns true if a key semantically refers to a user (covers allocated_to_user_name, assigned_user_id, etc.) */
  const isUserKey = (key: string): boolean =>
    key === "user_id" ||
    key === "user" ||
    key === "requested_by" ||
    key === "approved_by" ||
    key === "allocated_to_user_id" ||
    /(_user_id|_user_name|_by_user|_to_user)$/.test(key) ||
    /^(user_|allocated_to_user|assigned_user)/.test(key);

  const resolveIds = (data: any): any => {
    if (!data || typeof data !== "object") return data;
    const resolved: any = Array.isArray(data) ? [] : {};
    for (const key of Object.keys(data)) {
      const value = data[key];
      const isNumericString = typeof value === "string" && /^\d+$/.test(value.trim());

      if (typeof value === "number" || isNumericString) {
        const numVal = typeof value === "number" ? value : parseInt(value.trim(), 10);
        if (key === "plant_id" || key === "plant_location_id" || key === "plant") resolved[key] = getPlantName(numVal);
        else if (key === "department_id" || key === "department") resolved[key] = getDepartmentName(numVal);
        else if (key === "role_id" || key === "role") resolved[key] = getRoleName(numVal);
        else if (isUserKey(key)) resolved[key] = getUserName(numVal);
        else if (isVendorKey(key)) resolved[key] = getVendorName(numVal);
        else resolved[key] = value;
      } else if (isCommaSeparatedIds(value)) {
        if (key === "plant_id" || key === "plant_location_id" || key === "plant") resolved[key] = resolveCommaSeparatedIds(value, getPlantName);
        else if (key === "department_id" || key === "department") resolved[key] = resolveCommaSeparatedIds(value, getDepartmentName);
        else if (key === "role_id" || key === "role") resolved[key] = resolveCommaSeparatedIds(value, getRoleName);
        else if (isUserKey(key)) resolved[key] = resolveCommaSeparatedIds(value, getUserName);
        else if (isVendorKey(key)) resolved[key] = resolveCommaSeparatedIds(value, getVendorName);
        else resolved[key] = value;
      } else if (Array.isArray(value)) {
        resolved[key] = value.map((item: any) =>
          typeof item === "number"
            ? key.includes("plant") ? getPlantName(item)
              : key.includes("department") || key.includes("dept") ? getDepartmentName(item)
                : key.includes("role") ? getRoleName(item)
                  : key.includes("user") ? getUserName(item)
                    : key.includes("vendor") ? getVendorName(item)
                      : item
            : resolveIds(item)
        );
      } else if (typeof value === "object") {
        resolved[key] = resolveIds(value);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  };

  const renderDataComparison = (approval: Approval) => {
    if (approval.action === "create") {
      return (
        <div className={styles.dataCompareGrid}>
          <div className={styles.dataBlock}>
            <h4>New Data</h4>
            <pre>{JSON.stringify(resolveIds(approval.new_value), null, 2)}</pre>
          </div>
        </div>
      );
    } else if (approval.action === "delete") {
      return (
        <div className={styles.dataCompareGrid}>
          <div className={styles.dataBlock}>
            <h4>Old Data</h4>
            <pre>{JSON.stringify(resolveIds(approval.old_value), null, 2)}</pre>
          </div>
        </div>
      );
    } else {
      return (
        <div className={styles.dataCompareGrid}>
          <div className={styles.dataBlock}>
            <h4>Old Data</h4>
            <pre>{JSON.stringify(resolveIds(approval.old_value), null, 2)}</pre>
          </div>

          <div className={styles.dataBlock}>
            <h4>New Data</h4>
            <pre>{JSON.stringify(resolveIds(approval.new_value), null, 2)}</pre>
          </div>
        </div>
      );
    }
  };

  return (
    <div className={plantStyles.pageWrapper}>
      <AppHeader title="Master Approval Management" />

      <div className={plantStyles.contentArea}>
        <div className={plantStyles.controlPanel}>
          <div className={plantStyles.actionRow}>
            <div className={styles.filterGroup}>
              <label>Module:</label>
              <select
                value={filter.module}
                onChange={(e) => setFilter({ ...filter, module: e.target.value })}
                className={styles.filterSelect}
              >
                <option value="all">All Modules</option>
                <option value="application">Application Master</option>
                <option value="department">Department Master</option>
                <option value="network">Network Master</option>
                <option value="plant">Plant Master</option>
                <option value="roles">Role Master</option>
                <option value="system">System Master</option>
                <option value="server-inventory">Server Master</option>
                <option value="vendors">Vendor Information</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Status:</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className={styles.filterSelect}
              >
                <option value="">Select Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <button onClick={loadApprovals} className={styles.refreshButton}>
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className={plantStyles.tableCard}>
          <div className={plantStyles.tableHeader}>
            <h2>Master Approval Records</h2>
            <span className={plantStyles.recordCount}>{approvals.length} Records</span>
          </div>

          {/* / {loading ? (
            <div className={styles.loading}>Loading approvals...</div>
          ) : approvals.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No approvals found</p>
            </div>
          ) : ( */}
          <div className={plantStyles.tableContainer}>
            <table className={plantStyles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Requested By</th>
                  <th>Requested On</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((approval) => (
                  <tr key={approval.id}>
                    <td>{approval.id}</td>
                    <td>{approval.module.toUpperCase()}</td>
                    <td>{approval.action.toUpperCase()}</td>
                    <td>{approval.requested_by_username}</td>
                    <td>{formatDate(approval.created_at)}</td>
                    <td>{approval.status}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(approval)}
                          >
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {approval.status === "PENDING" && (
                          <>
                            <Tooltip title={`Approve`}>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleApproveClick(approval)}
                              >
                                <CheckCircleOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={`Reject`}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRejectClick(approval)}
                              >
                                <CancelOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={paginationStyles.pagination}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={
                currentPage === 1
                  ? paginationStyles.disabledPageBtn
                  : paginationStyles.pageBtn
              }
            >
              Previous
            </button>

            <span className={paginationStyles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              className={
                currentPage === totalPages
                  ? paginationStyles.disabledPageBtn
                  : paginationStyles.pageBtn
              }
            >
              Next
            </button>
          </div>

        </div>
      </div>

      {/* Modal for quick actions */}
      {showModal && selectedApproval && modalAction && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>
                {modalAction === "approve" ? "Approve Request" : "Reject Request"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <strong>Module:</strong>
                  <span>{selectedApproval.module.toUpperCase()}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Action:</strong>
                  <span
                    style={{
                      color: getActionBadgeColor(selectedApproval.action),
                      fontWeight: "bold",
                    }}
                  >
                    {selectedApproval.action.toUpperCase()}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Requested By:</strong>
                  <span>{selectedApproval.requested_by_username}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Requested On:</strong>
                  <span>{formatDate(selectedApproval.created_at)}</span>
                </div>
              </div>

              {renderDataComparison(selectedApproval)}

              <div className={styles.actionSection}>
                <label>
                  {modalAction === "reject" ? "Rejection Reason *" : "Comments (Optional)"}
                </label>

                <textarea
                  value={actionComments || ""}
                  onChange={(e) => {
                    if (e.target.value.length <= 2000) {
                      setActionComments(e.target.value);
                    }
                  }}
                  placeholder={`Enter ${modalAction === "reject" ? "rejection reason" : "comments"
                    }...`}
                  rows={4}
                  className={styles.commentsTextarea}
                  required={modalAction === "reject"}
                  maxLength={2000}
                />

                {/* Character Counter */}
                <div className={styles.charCounter}>
                  {(actionComments?.length || 0)}/2000
                </div>
              </div>

            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={handleConfirmAction}
                className={
                  modalAction === "approve"
                    ? styles.confirmApproveButton
                    : styles.confirmRejectButton
                }
              >
                {modalAction === "approve" ? "✅ Confirm Approval" : "❌ Confirm Rejection"}
              </button>
              <button
                onClick={() => {
                  setModalAction(null);
                  setShowModal(false);
                }}
                className={styles.cancelActionButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterApprovalBin;