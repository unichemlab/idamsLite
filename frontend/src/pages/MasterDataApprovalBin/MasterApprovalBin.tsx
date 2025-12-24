import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchApprovals, approveApproval, rejectApproval } from "../../utils/api";
import styles from "./MasterApprovalBin.module.css";
import plantStyles from "../Plant/PlantMasterTable.module.css";
import AppHeader from "../../components/Common/AppHeader";

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
  const [filter, setFilter] = useState({
    module: "all",
    status: "PENDING",
  });
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<"approve" | "reject" | null>(null);
  const [actionComments, setActionComments] = useState("");

  useEffect(() => {
    loadApprovals();
  }, [filter]);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.module !== "all") params.append("module", filter.module);
      if (filter.status !== "all") params.append("status", filter.status);

      const data = await fetchApprovals(params.toString());
      setApprovals(data);
    } catch (err) {
      console.error("Error loading approvals:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const renderDataComparison = (approval: Approval) => {
    if (approval.action === "create") {
      return (
        <div className={styles.dataComparison}>
          <div className={styles.compareColumn}>
            <h4>New Data:</h4>
            <pre>{JSON.stringify(approval.new_value, null, 2)}</pre>
          </div>
        </div>
      );
    } else if (approval.action === "delete") {
      return (
        <div className={styles.dataComparison}>
          <div className={styles.compareColumn}>
            <h4>Data to be Deleted:</h4>
            <pre>{JSON.stringify(approval.old_value, null, 2)}</pre>
          </div>
        </div>
      );
    } else {
      return (
        <div className={styles.dataComparison}>
          <div className={styles.compareColumn}>
            <h4>Old Data:</h4>
            <pre>{JSON.stringify(approval.old_value, null, 2)}</pre>
          </div>
          <div className={styles.compareColumn}>
            <h4>New Data:</h4>
            <pre>{JSON.stringify(approval.new_value, null, 2)}</pre>
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
                <option value="all">All Status</option>
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

          {loading ? (
            <div className={styles.loading}>Loading approvals...</div>
          ) : approvals.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No approvals found</p>
            </div>
          ) : (
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
                  {approvals.map((approval) => (
                    <tr key={approval.id}>
                      <td>{approval.id}</td>
                      <td>
                        <span className={styles.moduleBadge}>
                          {approval.module.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span
                          className={styles.actionBadge}
                          style={{
                            backgroundColor: getActionBadgeColor(approval.action),
                          }}
                        >
                          {approval.action.toUpperCase()}
                        </span>
                      </td>
                      <td>{approval.requested_by_username}</td>
                      <td>{formatDate(approval.created_at)}</td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{
                            backgroundColor: getStatusBadgeColor(approval.status),
                          }}
                        >
                          {approval.status}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => handleViewDetails(approval)}
                            className={styles.viewButton}
                          >
                            👁️ View
                          </button>
                          {approval.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleApproveClick(approval)}
                                className={styles.approveButton}
                              >
                                ✅ Approve
                              </button>
                              <button
                                onClick={() => handleRejectClick(approval)}
                                className={styles.rejectButton}
                              >
                                ❌ Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                  placeholder={`Enter ${modalAction === "reject" ? "rejection reason" : "comments"}...`}
                  rows={4}
                  className={styles.commentsTextarea}
                  required={modalAction === "reject"}
                />
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