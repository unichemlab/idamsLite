import React,{useCallback} from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { useAuth } from "../../context/AuthContext";
import styles from "../Plant/PlantMasterTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";
import { FaEdit, FaTrash, FaRegClock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useRoles } from "../../RoleMaster/RolesContext";
import { useAbility } from "../../context/AbilityContext";
import { fetchRoleActivityLogs } from "../../utils/api";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import AppHeader from "../../components/Common/AppHeader";
import { PermissionGuard, PermissionButton } from "../../components/Common/PermissionComponents";
import { PERMISSIONS } from "../../constants/permissions";
import { usePermissions } from "../../context/PermissionContext";
interface RoleMasterTableProps {
  onAdd?: () => void;
  onEdit?: (id: number) => void;
}

export default function RoleMasterTable({
  onAdd,
  onEdit,
}: RoleMasterTableProps) {
  const { roles, deleteRole } = useRoles();
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
              className={styles.editBtn}
              disabled={selectedRow === null}
              onClick={handleEdit}
            >
              <FaEdit size={14} /> Edit
            </PermissionButton>

            <PermissionButton
              permission={PERMISSIONS.ROLE.DELETE}
              className={styles.deleteBtn}
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
                        <span
                          style={{ cursor: "pointer", color: "#0b63ce" }}
                          title="View Activity Log"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const roleName = role.name ?? "";
                            // Open modal immediately
                            setActivityRole({ name: roleName, logs: [] });
                            setShowActivityModal(true);

                            // Fetch logs and filter for this role
                            try {
                              const allLogs = await fetchRoleActivityLogs();
                              const filtered = (allLogs || []).filter(
                                (log: any) => {
                                  try {
                                    const oldVal = log.old_value
                                      ? JSON.parse(log.old_value)
                                      : {};
                                    const newVal = log.new_value
                                      ? JSON.parse(log.new_value)
                                      : {};
                                    return (
                                      oldVal.name === roleName ||
                                      newVal.name === roleName ||
                                      oldVal.role_name === roleName ||
                                      newVal.role_name === roleName
                                    );
                                  } catch {
                                    return false;
                                  }
                                }
                              );

                              // Normalize rows for display: keep fields expected by modal
                              const normalized = filtered.map((r: any) => {
                                let oldVal = r.old_value;
                                let newVal = r.new_value;
                                try {
                                  oldVal = r.old_value
                                    ? JSON.parse(r.old_value)
                                    : r.old_value;
                                } catch { }
                                try {
                                  newVal = r.new_value
                                    ? JSON.parse(r.new_value)
                                    : r.new_value;
                                } catch { }
                                return {
                                  action: r.action || r.action_performed_by || "",
                                  oldValue:
                                    typeof oldVal === "object"
                                      ? JSON.stringify(oldVal)
                                      : oldVal,
                                  newValue:
                                    typeof newVal === "object"
                                      ? JSON.stringify(newVal)
                                      : newVal,
                                  approver:
                                    r.action_performed_by || r.user_id || "",
                                  dateTime:
                                    r.date_time_ist || r.created_on || null,
                                };
                              });

                              setActivityRole({
                                name: roleName,
                                logs: normalized,
                              });
                            } catch (err) {
                              setActivityRole({ name: roleName, logs: [] });
                            }
                          }}
                        >
                          <FaRegClock size={18} />
                        </span>
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
        {/* Activity Log Modal */}
        {showActivityModal && activityRole && (
          <div
            className={styles.panelOverlay}
            style={{ zIndex: 2000, background: "rgba(0,0,0,0.18)" }}
          >
            <div
              className={styles.panelWrapper}
              style={{
                maxWidth: 1000,
                width: "95%",
                left: "53%",
                transform: "translateX(-50%)",
                position: "fixed",
                top: 176,
                borderRadius: 16,
                boxShadow: "0 8px 32px rgba(11,99,206,0.18)",
                padding: "24px 18px 18px 18px",
                display: "flex",
                flexDirection: "column",
                background: "#fff",
                zIndex: "1",
              }}
            >
              {/* Activity log content here */}
              <h3 style={{ marginBottom: 12 }}>
                Activity Logs for {activityRole.name}
              </h3>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                <table style={{ width: "100%", fontSize: 14 }}>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Old Value</th>
                      <th>New Value</th>
                      <th>Approver</th>
                      <th>Date/Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityRole.logs && activityRole.logs.length > 0 ? (
                      activityRole.logs.map((log: any, idx: number) => (
                        <tr key={idx}>
                          <td>{log.action}</td>
                          <td>{log.oldValue}</td>
                          <td>{log.newValue}</td>
                          <td>{log.approver}</td>
                          <td>
                            {log.dateTime
                              ? new Date(log.dateTime).toLocaleString()
                              : ""}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          style={{ textAlign: "center", color: "#888" }}
                        >
                          No activity logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button
                style={{ marginTop: 18, alignSelf: "flex-end" }}
                className={styles.cancelBtn}
                onClick={() => setShowActivityModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
      );
}
