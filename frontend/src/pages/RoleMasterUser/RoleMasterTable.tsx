import React,{useCallback} from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { useAuth } from "../../context/AuthContext";
import styles from "../Plant/PlantMasterTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";
import { FaEdit, FaTrash, FaRegClock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useRoles } from "./RolesContext";
import { useAbility } from "../../context/AbilityContext";
import { fetchRoleActivityLogs } from "../../utils/api";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import AppHeader from "../../components/Common/AppHeader";
import { PermissionGuard, PermissionButton } from "../../components/Common/PermissionComponents";
import { PERMISSIONS } from "../../constants/permissions";
import { usePermissions } from "../../context/PermissionContext";
import useAutoRefresh from "../../hooks/useAutoRefresh";
import ActivityLogModal from "../../components/Common/ActivityLogModal";
import { fetchActivityLogs,fetchActivityLogsByRecordId  } from "../../utils/activityLogUtils";
interface RoleMasterTableProps {
  onAdd?: () => void;
  onEdit?: (id: number) => void;
}

export default function RoleMasterTable({
  onAdd,
  onEdit,
}: RoleMasterTableProps) {
  const { roles, deleteRole,refreshRoles  } = useRoles();
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 10;
  // activityRole stores { name, logs: [] }
  const [activityRole, setActivityRole] = React.useState<any>(null);
  // (no approver filter in this table currently)
  const [showFilterPopover, setShowFilterPopover] = React.useState(false);
  const [filterColumn, setFilterColumn] = React.useState("name");
  const [filterValue, setFilterValue] = React.useState("");
  const [tempFilterColumn, setTempFilterColumn] = React.useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = React.useState(filterValue);
  const [activityLogs, setActivityLogs] = React.useState<any[]>([]);
     const [selectedRecordName, setSelectedRecordName] = React.useState("");
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { can } = useAbility();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  // Filtering logic
  const filteredData = roles.filter((role) => {
    if (!filterValue.trim()) return true;
    const value = filterValue.toLowerCase();
    switch (filterColumn) {
      case "name":
        return role.name?.toLowerCase().includes(value);
      case "description":
        return role.description?.toLowerCase().includes(value);
      case "status":
        return role.status?.toLowerCase().includes(value);
      default:
        return true;
    }
  });

  // Reset to first page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterValue]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  };
const refreshCallback = useCallback(() => {
  console.log("[RoleMaster] 🔄 Auto refreshing roles...");
  refreshRoles();
}, [refreshRoles]);

useAutoRefresh(refreshCallback);

  // PDF Export Handler for Role Table
  const handleExportPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const fileName = `RoleMaster_${today.toISOString().split("T")[0]}.pdf`;

    // --- HEADER BAR ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageMargin = 14;
    const headerHeight = 28;
    doc.setFillColor(0, 82, 155);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Logo
    let logoWidth = 0;
    let logoHeight = 0;
    if (login_headTitle2) {
      try {
        const img = await loadImage(login_headTitle2);
        const maxLogoHeight = headerHeight * 0.6;
        const scale = maxLogoHeight / img.height;
        logoWidth = img.width * scale;
        logoHeight = img.height * scale;
        const logoY = headerHeight / 2 - logoHeight / 2;
        doc.addImage(img, "PNG", pageMargin, logoY, logoWidth, logoHeight);
      } catch (e) {
        console.warn("Logo load failed", e);
      }
    }

    // Title + Exported by/date
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titleX = pageMargin + logoWidth + 10;
    const titleY = headerHeight / 2 + 5;
    doc.text("Role Master", titleX, titleY);

    doc.setFontSize(9);
    doc.setTextColor(220, 230, 245);
    const exportedByName =
      (user && (user.name || user.username)) || "Unknown User";
    const exportedText = `Exported by: ${exportedByName}  On: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
    const textWidth = doc.getTextWidth(exportedText);
    doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);

    doc.setDrawColor(0, 82, 155);
    doc.setLineWidth(0.5);
    doc.line(0, headerHeight, pageWidth, headerHeight);

    // --- TABLE ---
    const rows = filteredData.map((role) => [
      role.name ?? "-",
      role.description ?? "-",
      role.status ?? "-",
    ]);

    autoTable(doc, {
      head: [["Role Name", "Description", "Status"]],
      body: rows,
      startY: headerHeight + 8,
      styles: {
        fontSize: 11,
        cellPadding: 3,
        halign: "left",
        valign: "middle",
      },
      headStyles: {
        fillColor: [11, 99, 206],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      margin: { left: pageMargin, right: pageMargin },
      tableWidth: "auto",
    });

    // --- FOOTER ---
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageCount =
      (doc as any).getNumberOfPages?.() ||
      (doc as any).internal?.getNumberOfPages?.() ||
      1;
    doc.setFontSize(9);
    doc.setTextColor(100);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text("Unichem Laboratories", pageMargin, pageHeight - 6);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - pageMargin - 30,
        pageHeight - 6
      );
    }

    doc.save(fileName);
  };

  // Row selection handler
  // Removed unused handleSelectRow

  // Delete role handler
  const handleDeleteRole = () => {
    if (selectedRow !== null && filteredData[selectedRow]) {
      setShowDeleteModal(true);
    }
  };

  // Confirm delete handler
  const confirmDeleteRole = async () => {
    if (
      selectedRow !== null &&
      filteredData[selectedRow] &&
      filteredData[selectedRow].id !== undefined
    ) {
      await deleteRole(Number(filteredData[selectedRow].id));
      setShowDeleteModal(false);
      setSelectedRow(null);
    }
  };

  // 🔥 NEW: Handle activity log button click
      const handleActivityClick = useCallback(async (app: any) => {
        try {
          // Fetch activity logs using the common utility
          const logs = await fetchActivityLogsByRecordId('role_master', app.id);
          console.log(`✅ Found ${logs.length} logs for record ${app.name}`);
          setActivityLogs(logs);
          setSelectedRecordName(app.name);
          setShowActivityModal(true);
        } catch (err) {
          console.error("Error loading activity logs:", err);
          setActivityLogs([]);
          setSelectedRecordName(app.name);
          setShowActivityModal(true);
        }
      }, []);

const handleEdit = useCallback(() => {
      if (selectedRow === null) return;
      const app = filteredData[selectedRow];
      
      if (!hasPermission(PERMISSIONS.ROLE.UPDATE)) {
        alert('You do not have permission to edit applications for this plant');
        return;
      }
      
      navigate(`/role-master/edit/${app.id}`, {
        state: { applicationData: app, applicationIdx: selectedRow },
      });
       //navigate(`/vendor-information/edit/${selectedRow}`);
    }, [selectedRow, filteredData, navigate]);

    const handleDelete = useCallback(() => {
        if (selectedRow === null) return;
        const app = filteredData[selectedRow];
        
        if (!hasPermission(PERMISSIONS.ROLE.DELETE)) {
          alert('You do not have permission to delete applications for this plant');
          return;
        }
        
        setShowDeleteModal(true);
      }, [selectedRow, filteredData, hasPermission]);
  // approverFilter/state implemented above

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Role Master Management" />
      <div className={styles.contentArea}>
        <div className={styles.controlPanel}>
          <div className={styles.actionRow}>
            <form
              className={styles.searchForm}
              onSubmit={(e) => e.preventDefault()}
              autoComplete="off"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                minWidth: 0,
              }}
            >
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}>🔍</span>

                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Search by name, code..."
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  aria-label="Search"
                />

                {/* ✅ Clear Button */}
                {filterValue && (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => setFilterValue("")}
                    aria-label="Clear search"
                  >
                    ❌
                  </button>
                )}
              </div>
            </form>
            <PermissionGuard permission={PERMISSIONS.ROLE.CREATE}>
            <button
              className={styles.addBtn} 
              onClick={() => navigate("/role-master/add")}
            >
              + Add New
            </button>
            </PermissionGuard>
            <button
              className={styles.filterBtn}
              onClick={() => setShowFilterPopover((prev) => !prev)}
              type="button"
              aria-label="Filter roles"
            >
              🔍 Filter
            </button>
            <PermissionButton
              permission={PERMISSIONS.ROLE.UPDATE}
              className={`${styles.btn} ${styles.editBtn}`}
              disabled={selectedRow === null}
              onClick={handleEdit}
            >
              <FaEdit size={14} /> Edit
            </PermissionButton>

            <PermissionButton
              permission={PERMISSIONS.ROLE.DELETE}
              className={`${styles.btn} ${styles.deleteBtn}`}
              disabled={selectedRow === null}
              onClick={handleDelete}
            >
              <FaTrash size={14} /> Delete
            </PermissionButton>
            {/* <button
              className={`${styles.btn} ${styles.editBtn}`}
              onClick={() => {
                if (selectedRow !== null && filteredData[selectedRow]) {
                  const id = filteredData[selectedRow].id;
                  if (onEdit && typeof id === "number") {
                    onEdit(id);
                  } else if (typeof id === "number") {
                    navigate(`/role-master/edit/${id}`);
                  }
                }
              }}
              disabled={selectedRow === null || !can("update:roles")}
              title={
                selectedRow === null
                  ? "Select a role to edit"
                  : !can("update:roles")
                    ? "You don't have permission to edit roles"
                    : ""
              }
            >
              <FaEdit size={14} /> Edit
            </button> */}
            {/* <button
              className={`${styles.btn} ${styles.deleteBtn}`}
              disabled={selectedRow === null || !can("delete:roles")}
              onClick={handleDeleteRole}
              title={
                !can("delete:roles")
                  ? "You don't have permission to delete roles"
                  : "Delete selected role"
              }
            >
              <FaTrash size={14} /> Delete
            </button> */}
            <button
              className={styles.exportBtn}
              aria-label="Export table to PDF"
              type="button"
              onClick={handleExportPDF}
            >
              <span role="img" aria-label="Export PDF" style={{ fontSize: 18 }}>
                🗎
              </span>
              PDF
            </button>
          </div>
          {/* Filter Popover */}

          {showFilterPopover && (
            <div className={styles.filterPopover} ref={popoverRef}>
              <div className={styles.filterHeader}>Advanced Filter</div>
              <div className={styles.filterBody}>
                <div className={styles.filterFieldRow}>
                  <label className={styles.filterLabel}>Column</label>
                  <select
                    className={styles.filterDropdown}
                    value={tempFilterColumn}
                    onChange={(e) => setTempFilterColumn(e.target.value)}
                  >
                    <option value="name">Role Name</option>
                    <option value="description">Description</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                <div className={styles.filterFieldRow}>
                  <label className={styles.filterLabel}>Value</label>
                  <input
                    className={styles.filterInput}
                    type="text"
                    placeholder={`Enter ${tempFilterColumn.charAt(0).toUpperCase() +
                      tempFilterColumn.slice(1)
                      }`}
                    value={tempFilterValue}
                    onChange={(e) => setTempFilterValue(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.filterFooter}>
                <button
                  className={styles.applyBtn}
                  onClick={() => {
                    setFilterColumn(tempFilterColumn);
                    setFilterValue(tempFilterValue);
                    setShowFilterPopover(false);
                  }}
                >
                  Apply
                </button>
                <button
                  className={styles.clearBtn}
                  onClick={() => {
                    setTempFilterValue("");
                    setFilterValue("");
                    setShowFilterPopover(false);
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2>Role Master Records</h2>
            <span className={styles.recordCount}>{filteredData.length} Records</span>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}></th>
                  <th>Role Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Activity</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((role, index) => {
                  const globalIndex = (currentPage - 1) * rowsPerPage + index;
                  return (
                    <tr
                      key={globalIndex}
                      onClick={() => setSelectedRow(globalIndex)}
                      style={{
                        background:
                          selectedRow === globalIndex ? "#f0f4ff" : undefined,
                      }}
                    >
                      <td>
                        <input
                          type="radio"
                          className={styles.radioInput}
                          checked={selectedRow === globalIndex}
                          onChange={() => setSelectedRow(globalIndex)}
                        />
                      </td>
                      <td>{role.name ?? ""}</td>
                      <td>{role.description ?? ""}</td>
                      <td>
                        <span
                          className={
                            role.status === "INACTIVE"
                              ? styles.statusInactive
                              : styles.status
                          }
                        >
                          {role.status ?? ""}
                        </span>
                      </td>
                      <td>
                         <button 
                            className={styles.activityBtn} 
                            onClick={() => handleActivityClick(role)}
                            title="View activity logs"
                          >
                            <FaRegClock size={16} />
                          </button>
                      </td>
                    </tr>
                  );
                })}
                <ConfirmDeleteModal
                  open={showDeleteModal}
                  name={
                    selectedRow !== null && filteredData[selectedRow]
                      ? filteredData[selectedRow].name ?? "role"
                      : "role"
                  }
                  onCancel={() => setShowDeleteModal(false)}
                  onConfirm={confirmDeleteRole}
                />
              </tbody>
            </table>
            {/* Pagination controls */}
            <div className={paginationStyles.pagination} style={{ marginTop: 8 }}>
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
              <span
                className={paginationStyles.pageInfo}
                style={{ margin: "0 12px" }}
              >
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
        {/* Activity Log Modal with name resolution */}
      <ActivityLogModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        title="Activity Log"
        recordName={selectedRecordName}
        activityLogs={activityLogs}
        // 🔥 Pass name resolution functions
        // getPlantName={getPlantName}
        // getDepartmentName={getDepartmentName}
        // getRoleName={getRoleName}
        // getUserName={getUserName}
      />
      </div>
      </div>
      );
}
