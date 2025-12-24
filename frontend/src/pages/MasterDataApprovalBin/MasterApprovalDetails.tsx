import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchApprovalById, approveApproval, rejectApproval } from "../../utils/api";
import styles from "./MasterApprovalDetails.module.css";
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
  requested_by_email?: string;
  status: string;
  comments: string;
  created_at: string;
  approved_by: number | null;
  approved_by_username: string | null;
  approved_at: string | null;
  approval_comments: string | null;
}

const MasterApprovalDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [modalAction, setModalAction] = useState<"approve" | "reject" | null>(null);
  const [actionComments, setActionComments] = useState("");

  useEffect(() => {
    if (id) {
      loadApproval();
    }
  }, [id]);

  const loadApproval = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApprovalById(parseInt(id!));
      setApproval(data);
    } catch (err: any) {
      console.error("Error loading approval:", err);
      setError(err.message || "Failed to load approval details");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = () => {
    setModalAction("approve");
    setActionComments("");
    setShowActionModal(true);
  };

  const handleRejectClick = () => {
    setModalAction("reject");
    setActionComments("");
    setShowActionModal(true);
  };

  const handleConfirmAction = async () => {
    if (!approval || !modalAction) return;

    if (modalAction === "reject" && !actionComments.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    try {
      setActionInProgress(true);

      if (modalAction === "approve") {
        await approveApproval(approval.id, actionComments);
        alert("✅ Approval successful! Changes have been applied.");
      } else {
        await rejectApproval(approval.id, actionComments);
        alert("❌ Request rejected successfully.");
      }

      navigate("/master-approvals");
    } catch (err: any) {
      console.error("Error processing approval:", err);
      alert(`Error: ${err.message || "Failed to process approval"}`);
    } finally {
      setActionInProgress(false);
      setShowActionModal(false);
    }
  };

  const getActionColor = (action: string) => {
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

  const getStatusColor = (status: string) => {
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

  const renderDataComparison = () => {
    if (!approval) return null;

    if (approval.action === "create") {
      return (
        <div className={styles.comparisonWrapper}>
          <div className={styles.singleDataColumn}>
            <div className={styles.columnHeader}>
              <span className={styles.columnIcon}>✨</span>
              <h3>New Data to be Created</h3>
            </div>
            <div className={styles.jsonViewerWrapper}>
              <pre className={styles.jsonViewer}>{JSON.stringify(approval.new_value, null, 2)}</pre>
            </div>
          </div>
        </div>
      );
    } else if (approval.action === "delete") {
      return (
        <div className={styles.comparisonWrapper}>
          <div className={styles.singleDataColumn}>
            <div className={styles.columnHeader}>
              <span className={styles.columnIcon}>🗑️</span>
              <h3>Data to be Deleted</h3>
            </div>
            <div className={styles.jsonViewerWrapper}>
              <pre className={styles.jsonViewer}>{JSON.stringify(approval.old_value, null, 2)}</pre>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className={styles.comparisonWrapper}>
          <div className={styles.comparisonGrid}>
            <div className={styles.dataColumn}>
              <div className={styles.columnHeader}>
                <span className={styles.columnIcon}>📋</span>
                <h3>Current Data</h3>
                <span className={styles.columnBadge}>Before</span>
              </div>
              <div className={styles.jsonViewerWrapper}>
                <pre className={styles.jsonViewer}>{JSON.stringify(approval.old_value, null, 2)}</pre>
              </div>
            </div>
            <div className={styles.comparisonDivider}>
              <div className={styles.dividerLine}></div>
              <div className={styles.dividerIcon}>→</div>
              <div className={styles.dividerLine}></div>
            </div>
            <div className={styles.dataColumn}>
              <div className={styles.columnHeader}>
                <span className={styles.columnIcon}>✅</span>
                <h3>Proposed Data</h3>
                <span className={styles.columnBadge}>After</span>
              </div>
              <div className={styles.jsonViewerWrapper}>
                <pre className={styles.jsonViewer}>{JSON.stringify(approval.new_value, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className={plantStyles.pageWrapper}>
        <AppHeader title="Approval Details" />
        <div className={plantStyles.contentArea}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Loading approval details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !approval) {
    return (
      <div className={plantStyles.pageWrapper}>
        <AppHeader title="Approval Details" />
        <div className={plantStyles.contentArea}>
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <h2>Unable to Load Approval</h2>
            <p>{error || "Approval not found"}</p>
            <button onClick={() => navigate("/admin-approval")} className={styles.backButton}>
              ← Back to Approvals
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={plantStyles.pageWrapper}>
      <AppHeader title="Approval Request Details" />

      <div className={plantStyles.contentArea}>
        {/* Action Bar */}
        <div className={styles.topActionBar}>
          <button onClick={() => navigate("/admin-approval")} className={styles.backButton}>
            ← Back to List
          </button>
          {approval.status === "PENDING" && (
            <div className={styles.quickActions}>
              <button
                onClick={handleApproveClick}
                className={styles.quickApproveButton}
                disabled={actionInProgress}
              >
                ✅ Approve
              </button>
              <button
                onClick={handleRejectClick}
                className={styles.quickRejectButton}
                disabled={actionInProgress}
              >
                ❌ Reject
              </button>
            </div>
          )}
        </div>

        {/* Status Banner */}
        <div className={styles.statusBanner} style={{ 
          background: approval.status === "PENDING" 
            ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)"
            : approval.status === "APPROVED"
            ? "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)"
            : "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)"
        }}>
          <div className={styles.statusBannerContent}>
            <div className={styles.statusLeft}>
              <span
                className={styles.statusBadge}
                style={{ backgroundColor: getStatusColor(approval.status) }}
              >
                {approval.status}
              </span>
              <div className={styles.statusInfo}>
                <span className={styles.approvalId}>Request ID: #{approval.id}</span>
                <span className={styles.createdDate}>
                  Created {formatDate(approval.created_at)}
                </span>
              </div>
            </div>
            {approval.status !== "PENDING" && (
              <div className={styles.statusRight}>
                <div className={styles.decidedInfo}>
                  <span className={styles.decidedLabel}>
                    {approval.status === "APPROVED" ? "Approved" : "Rejected"} by
                  </span>
                  <span className={styles.decidedBy}>{approval.approved_by_username}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className={styles.contentGrid}>
          {/* Left Column - Request Details */}
          <div className={styles.leftColumn}>
            {/* Request Information Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Request Information</h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Module</span>
                  <span className={styles.moduleBadge}>{approval.module.toUpperCase()}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Action Type</span>
                  <span
                    className={styles.actionBadge}
                    style={{ backgroundColor: getActionColor(approval.action) }}
                  >
                    {approval.action.toUpperCase()}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Table Name</span>
                  <span className={styles.infoValue}>{approval.table_name}</span>
                </div>
                {approval.record_id && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Record ID</span>
                    <span className={styles.infoValue}>#{approval.record_id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Requester Information Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Requested By</h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.requesterInfo}>
                  <div className={styles.requesterAvatar}>
                    {approval.requested_by_username.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.requesterDetails}>
                    <span className={styles.requesterName}>{approval.requested_by_username}</span>
                    {approval.requested_by_email && (
                      <span className={styles.requesterEmail}>{approval.requested_by_email}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Card */}
            {approval.comments && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3>Request Comments</h3>
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.commentsText}>{approval.comments}</p>
                </div>
              </div>
            )}

            {/* Decision Details Card */}
            {approval.status !== "PENDING" && (
              <div className={styles.card} style={{ 
                borderColor: approval.status === "APPROVED" ? "#10b981" : "#ef4444" 
              }}>
                <div className={styles.cardHeader} style={{
                  background: approval.status === "APPROVED" 
                    ? "linear-gradient(to right, #d1fae5, #a7f3d0)"
                    : "linear-gradient(to right, #fee2e2, #fecaca)"
                }}>
                  <h3>{approval.status === "APPROVED" ? "Approval" : "Rejection"} Details</h3>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Decided By</span>
                    <span className={styles.infoValue}>{approval.approved_by_username || "N/A"}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Decision Date</span>
                    <span className={styles.infoValue}>
                      {approval.approved_at ? formatDate(approval.approved_at) : "N/A"}
                    </span>
                  </div>
                  {approval.approval_comments && (
                    <div className={styles.decisionComments}>
                      <span className={styles.infoLabel}>Comments</span>
                      <p className={styles.commentsText}>{approval.approval_comments}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Data Comparison */}
          <div className={styles.rightColumn}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Data Comparison</h3>
                <span className={styles.headerBadge}>
                  {approval.action === "create" ? "New Data" : approval.action === "delete" ? "Deletion" : "Changes"}
                </span>
              </div>
              <div className={styles.cardBody}>
                {renderDataComparison()}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Bottom */}
        {approval.status === "PENDING" && (
          <div className={styles.bottomActions}>
            <div className={styles.actionsWrapper}>
              <button
                onClick={handleRejectClick}
                className={styles.rejectButton}
                disabled={actionInProgress}
              >
                <span className={styles.buttonIcon}>❌</span>
                Reject Request
              </button>
              <button
                onClick={handleApproveClick}
                className={styles.approveButton}
                disabled={actionInProgress}
              >
                <span className={styles.buttonIcon}>✅</span>
                Approve Request
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showActionModal && modalAction && (
        <div className={styles.modalOverlay} onClick={() => !actionInProgress && setShowActionModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader} style={{
              background: modalAction === "approve" 
                ? "linear-gradient(to right, #d1fae5, #a7f3d0)"
                : "linear-gradient(to right, #fee2e2, #fecaca)"
            }}>
              <h3>
                {modalAction === "approve" ? "✅ Approve Request" : "❌ Reject Request"}
              </h3>
              <button
                onClick={() => !actionInProgress && setShowActionModal(false)}
                className={styles.closeButton}
                disabled={actionInProgress}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalSummary}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Module:</span>
                  <span className={styles.summaryValue}>{approval.module.toUpperCase()}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Action:</span>
                  <span className={styles.summaryValue}>{approval.action.toUpperCase()}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Requested By:</span>
                  <span className={styles.summaryValue}>{approval.requested_by_username}</span>
                </div>
              </div>

              <p className={styles.modalMessage}>
                {modalAction === "approve" 
                  ? "You are about to approve this request. The changes will be applied immediately to the system."
                  : "You are about to reject this request. Please provide a reason for rejection."}
              </p>

              <div className={styles.modalInputGroup}>
                <label>
                  {modalAction === "reject" ? "Rejection Reason *" : "Comments (Optional)"}
                </label>
                <textarea
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                  placeholder={`Enter ${
                    modalAction === "reject" ? "rejection reason" : "comments"
                  }...`}
                  rows={4}
                  className={styles.modalTextarea}
                  required={modalAction === "reject"}
                  disabled={actionInProgress}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowActionModal(false)}
                className={styles.cancelBtn}
                disabled={actionInProgress}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={
                  modalAction === "approve" ? styles.confirmApproveBtn : styles.confirmRejectBtn
                }
                disabled={actionInProgress}
              >
                {actionInProgress
                  ? "Processing..."
                  : modalAction === "approve"
                  ? "✅ Confirm Approval"
                  : "❌ Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterApprovalDetails;