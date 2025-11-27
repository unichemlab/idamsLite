import React, { useState, useEffect,useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchApprovalById, approveApproval, rejectApproval } from "../../utils/api";
import headerstyles from "../HomePage/homepageUser.module.css";
import styles from "./MasterApprovalDetails.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { useAuth } from "../../context/AuthContext";
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

const ApprovalDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [modalAction, setModalAction] = useState<"approve" | "reject" | null>(null);
  const [actionComments, setActionComments] = useState("");
const [showUserMenu, setShowUserMenu] = useState(false);
   const menuRef = useRef<HTMLDivElement>(null);
    // Close menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setShowUserMenu(false);
        }
      };
  
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
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
        return "#28a745";
      case "update":
        return "#007bff";
      case "delete":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "#ffc107";
      case "APPROVED":
        return "#28a745";
      case "REJECTED":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderDataComparison = () => {
    if (!approval) return null;

    if (approval.action === "create") {
      return (
        <div className={styles.dataSection}>
          <h3>New Data to be Created:</h3>
          <div className={styles.jsonViewer}>
            <pre>{JSON.stringify(approval.new_value, null, 2)}</pre>
          </div>
        </div>
      );
    } else if (approval.action === "delete") {
      return (
        <div className={styles.dataSection}>
          <h3>Data to be Deleted:</h3>
          <div className={styles.jsonViewer}>
            <pre>{JSON.stringify(approval.old_value, null, 2)}</pre>
          </div>
        </div>
      );
    } else {
      return (
        <div className={styles.comparisonSection}>
          <div className={styles.comparisonColumn}>
            <h3>Current Data (Old):</h3>
            <div className={styles.jsonViewer}>
              <pre>{JSON.stringify(approval.old_value, null, 2)}</pre>
            </div>
          </div>
          <div className={styles.comparisonColumn}>
            <h3>Proposed Data (New):</h3>
            <div className={styles.jsonViewer}>
              <pre>{JSON.stringify(approval.new_value, null, 2)}</pre>
            </div>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading approval details...</p>
        </div>
      </div>
    );
  }

  if (error || !approval) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>❌ Error</h2>
          <p>{error || "Approval not found"}</p>
          <button onClick={() => navigate("/master-approvals")} className={styles.backButton}>
            ← Back to Approvals
          </button>
        </div>
      </div>
    );
  }
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className={styles.container}>
      {/* Header */}
     <header className={headerstyles["main-header"]}>
        <div className={headerstyles.navLeft}>
          <div className={headerstyles.logoWrapper}>
            <img src={login_headTitle2} alt="Logo" className={headerstyles.logo} />
            <span className={headerstyles.version}>version-1.0</span>
          </div>
          <h1 className={headerstyles.title}>User Access Management</h1>
        </div>
        <div className={headerstyles.navRight}>
          {user && (
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={headerstyles.userButton}
              >
                {/* Avatar */}
                <div className={headerstyles.avatarContainer}>
                  <div className={headerstyles.avatar}>
                    {(user.name || user.username || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className={headerstyles.statusDot}></div>
                </div>

                {/* User Name */}
                <div className={headerstyles.userInfo}>
                  <span className={headerstyles.userName}>
                    {user.name || user.username}
                  </span>
                  {user.isITBin && (
                    <span className={headerstyles.userRole}>IT Admin</span>
                  )}
                  {user.isApprover && (
                    <span className={headerstyles.userRole}>Approver</span>
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
                <div className={headerstyles.dropdownMenu}>
                  <div className={headerstyles.dropdownHeader}>
                    <div className={headerstyles.dropdownAvatar}>
                      <div className={headerstyles.dropdownAvatarCircle}>
                        {(user.name || user.username || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className={headerstyles.dropdownUserInfo}>
                        <span className={headerstyles.dropdownUserName}>
                          {user.name || user.username}
                        </span>
                        {user.employee_code && (
                          <span className={headerstyles.dropdownEmployeeCode}>
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
                  <div className={headerstyles.dropdownActions}>
                    <button
                      onClick={() => navigate("/homepage")}
                      className={headerstyles.dropdownButton}
                    >
                      <FiBriefcase size={16} />
                      <span>Home</span>
                    </button>
                    <button
                      onClick={() => navigate("/user-access-management")}
                      className={headerstyles.dropdownButton}
                    >
                      <FiBriefcase size={16} />
                      <span>User Access Management</span>
                    </button>
                    {user?.isITBin && (
                      <button
                        onClick={() => navigate("/task")}
                        className={headerstyles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Task Closure</span>
                      </button>
                    )}
                     {user?.isApprover && (
                      <button
                        onClick={() => navigate("/approver/pending")}
                        className={headerstyles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Pending Approval</span>
                      </button>
                    )}
                    {user?.isApprover && (
                      
                      <button
                        onClick={() => navigate("/approver/history")}
                        className={headerstyles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Approval History</span>
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className={`${headerstyles.dropdownButton} ${headerstyles.logoutButton}`}
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
      <div className={styles.content}>
        {/* Status Card */}
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <span
              className={styles.statusBadge}
              style={{ backgroundColor: getStatusColor(approval.status) }}
            >
              {approval.status}
            </span>
            <span className={styles.approvalId}>ID: {approval.id}</span>
          </div>
        </div>

        {/* Info Grid */}
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <label>Module</label>
            <div className={styles.infoValue}>
              <span className={styles.moduleBadge}>{approval.module.toUpperCase()}</span>
            </div>
          </div>

          <div className={styles.infoCard}>
            <label>Action</label>
            <div className={styles.infoValue}>
              <span
                className={styles.actionBadge}
                style={{ backgroundColor: getActionColor(approval.action) }}
              >
                {approval.action.toUpperCase()}
              </span>
            </div>
          </div>

          <div className={styles.infoCard}>
            <label>Requested By</label>
            <div className={styles.infoValue}>
              <strong>{approval.requested_by_username}</strong>
              {approval.requested_by_email && (
                <div className={styles.subtext}>{approval.requested_by_email}</div>
              )}
            </div>
          </div>

          <div className={styles.infoCard}>
            <label>Requested On</label>
            <div className={styles.infoValue}>{formatDate(approval.created_at)}</div>
          </div>

          {approval.record_id && (
            <div className={styles.infoCard}>
              <label>Record ID</label>
              <div className={styles.infoValue}>{approval.record_id}</div>
            </div>
          )}

          <div className={styles.infoCard}>
            <label>Table</label>
            <div className={styles.infoValue}>{approval.table_name}</div>
          </div>
        </div>

        {/* Comments Section */}
        {approval.comments && (
          <div className={styles.commentsSection}>
            <h3>Request Comments</h3>
            <p>{approval.comments}</p>
          </div>
        )}

        {/* Data Comparison */}
        {renderDataComparison()}

        {/* Approval/Rejection Details (if processed) */}
        {approval.status !== "PENDING" && (
          <div className={styles.decisionSection}>
            <h3>Decision Details</h3>
            <div className={styles.decisionInfo}>
              <div>
                <label>Decided By:</label>
                <span>{approval.approved_by_username || "N/A"}</span>
              </div>
              <div>
                <label>Decided On:</label>
                <span>{approval.approved_at ? formatDate(approval.approved_at) : "N/A"}</span>
              </div>
              {approval.approval_comments && (
                <div>
                  <label>Comments:</label>
                  <p>{approval.approval_comments}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {approval.status === "PENDING" && (
          <div className={styles.actionButtons}>
            <button
              onClick={handleApproveClick}
              className={styles.approveButton}
              disabled={actionInProgress}
            >
              ✅ Approve
            </button>
            <button
              onClick={handleRejectClick}
              className={styles.rejectButton}
              disabled={actionInProgress}
            >
              ❌ Reject
            </button>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showActionModal && modalAction && (
        <div className={styles.modalOverlay} onClick={() => setShowActionModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                {modalAction === "approve" ? "✅ Approve Request" : "❌ Reject Request"}
              </h3>
              <button
                onClick={() => setShowActionModal(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>
                Are you sure you want to {modalAction} this {approval.action} request for{" "}
                <strong>{approval.module}</strong>?
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
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
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
              <button
                onClick={() => setShowActionModal(false)}
                className={styles.cancelBtn}
                disabled={actionInProgress}
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

export default ApprovalDetails;