// frontend/src/pages/ApprovalBin/ApprovalBin.tsx

import React, { useState, useEffect,useRef,useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchApprovals, approveApproval, rejectApproval } from "../../utils/api";
import headerstyles from "../HomePage/homepageUser.module.css";
import styles from "./MasterApprovalBin.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { useAuth } from "../../context/AuthContext";
import { FiChevronDown,FiBriefcase,FiLogOut,} from "react-icons/fi";
import AppMenu from "../../components/AppMenu";
import { useDepartmentContext } from "..//DepartmentTable/DepartmentContext";
import { usePlantContext } from "../Plant/PlantContext";
import { useRoles } from "../RoleMasterUser/RolesContext";

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

const ApprovalBin: React.FC = () => {
  const navigate = useNavigate();
   const { user, logout } = useAuth();
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
   const [showUserMenu, setShowUserMenu] = useState(false);
   const menuRef = useRef<HTMLDivElement>(null);
    const { plants } = usePlantContext();
      const { departments } = useDepartmentContext();
      const { roles } = useRoles(); // Assuming you have this
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
   
     const getUserName = useCallback((id: number) => {
        // You can fetch from users context or API
        // For now, just return the ID
        return `User ${id}`;
      }, []);
   
     /** Replace known ID fields with their human-readable names in a data object */
     /** Detect comma-separated numeric strings like "1,3,5,7,4" */
     const isCommaSeparatedIds = (value: any): boolean =>
       typeof value === "string" &&
       value.trim().length > 0 &&
       /^[\d\s,]+$/.test(value) &&
       value.includes(",");
   
     const resolveCommaSeparatedIds = (
       value: string,
       resolver: (id: number) => string
     ): string =>
       value
         .split(",")
         .map((v) => resolver(parseInt(v.trim(), 10)))
         .join(", ");
   
     const resolveIds = (data: any): any => {
       if (!data || typeof data !== "object") return data;
       const resolved: any = Array.isArray(data) ? [] : {};
       for (const key of Object.keys(data)) {
         const value = data[key];
         if (typeof value === "number") {
           if (key === "plant_id" || key === "plant_location_id" || key === "plant") resolved[key] = getPlantName(value);
           else if (key === "department_id" || key === "department") resolved[key] = getDepartmentName(value);
           else if (key === "role_id" || key === "role") resolved[key] = getRoleName(value);
           else if (key === "user_id" || key === "user" || key === "requested_by" || key === "approved_by") resolved[key] = getUserName(value);
           else resolved[key] = value;
         } else if (isCommaSeparatedIds(value)) {
           // Handle comma-separated ID strings e.g. role_id: "1,3,5,7,4"
           if (key === "plant_id" || key === "plant_location_id" || key === "plant") resolved[key] = resolveCommaSeparatedIds(value, getPlantName);
           else if (key === "department_id" || key === "department") resolved[key] = resolveCommaSeparatedIds(value, getDepartmentName);
           else if (key === "role_id" || key === "role") resolved[key] = resolveCommaSeparatedIds(value, getRoleName);
           else if (key === "user_id" || key === "user" || key === "requested_by" || key === "approved_by"|| key === "allocated_to_user_name") resolved[key] = resolveCommaSeparatedIds(value, getUserName);
           else resolved[key] = value;
         } else if (Array.isArray(value)) {
           resolved[key] = value.map((item: any) =>
             typeof item === "number"
               ? key.includes("plant") ? getPlantName(item)
                 : key.includes("department") || key.includes("dept") ? getDepartmentName(item)
                 : key.includes("role") ? getRoleName(item)
                 : key.includes("user") ? getUserName(item)
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

  const handleViewDetails = (approval: Approval) => {
    // Navigate to dedicated details page
    navigate(`/admin-approval/${approval.id}`);
  };

  const handleApproveClick = (approval: Approval) => {
    setSelectedApproval(approval);
    setModalAction("approve");
    setActionComments("");
  };

  const handleRejectClick = (approval: Approval) => {
    setSelectedApproval(approval);
    setModalAction("reject");
    setActionComments("");
  };

  const handleConfirmAction = async () => {
    if (!selectedApproval || !modalAction) return;

    try {
      if (modalAction === "approve") {
        await approveApproval(selectedApproval.id, actionComments);
        alert("Approval successful! Changes have been applied.");
      } else {
        if (!actionComments.trim()) {
          alert("Please provide rejection comments");
          return;
        }
        await rejectApproval(selectedApproval.id, actionComments);
        alert("Request rejected successfully.");
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
        return "#28a745";
      case "update":
        return "#007bff";
      case "delete":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getStatusBadgeColor = (status: string) => {
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

  const renderDataComparison = (approval: Approval) => {
    if (approval.action === "create") {
      return (
        <div className={styles.dataComparison}>
          <h4>New Data:</h4>
          <pre>{JSON.stringify(approval.new_value, null, 2)}</pre>
        </div>
      );
    } else if (approval.action === "delete") {
      return (
        <div className={styles.dataComparison}>
          <h4>Data to be Deleted:</h4>
          <pre>{JSON.stringify(resolveIds(approval.old_value), null, 2)}</pre>
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
            <pre>{JSON.stringify(resolveIds(approval.new_value), null, 2)}</pre>
          </div>
        </div>
      );
    }
  };
   const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div>
      
        {/* Navbar */}
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
                    <AppMenu />
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
      
        {/* Filters */}
        <div className={styles.filterBar}>
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
        
        {/* Approvals Table */}
        <div className={styles.container}>
          {loading ? (
            <div className={styles.loading}>Loading approvals...</div>
          ) : approvals.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No approvals found</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Requested By</th>
                  <th>Requested On</th>
                  <th>Status</th>
                  <th>Actions</th>
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
          )}
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

export default ApprovalBin;