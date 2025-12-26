// src/pages/ApplicationMaster/ApplicationMasterTable.tsx
import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaRegClock, FaEdit, FaTrash } from "react-icons/fa";
import AppHeader from "../../components/Common/AppHeader";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import { PermissionGuard, PermissionButton } from "../../components/Common/PermissionComponents";
import { useApplications } from "../../context/ApplicationsContext";
import { useDepartmentContext } from "../DepartmentMaster/DepartmentContext";
import { usePlantContext } from "../PlantMaster/PlantContext";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../context/PermissionContext";
import { filterByPlantPermission,filterByModulePlantPermission } from "../../utils/permissionUtils";
import { fetchApplicationActivityLogs, API_BASE } from "../../utils/api";
import { PERMISSIONS } from "../../constants/permissions";
import styles from "../Plant/PlantMasterTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";

export default function ApplicationMasterTable() {
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  const [activityLogsApp, setActivityLogsApp] = React.useState<any>(null);
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 10;
  const [showFilterPopover, setShowFilterPopover] = React.useState(false);
  const [filterColumn, setFilterColumn] = React.useState("application_hmi_name");
  const [filterValue, setFilterValue] = React.useState("");
  const [tempFilterColumn, setTempFilterColumn] = React.useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = React.useState(filterValue);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  
  const { applications, setApplications } = useApplications();
  const { departments } = useDepartmentContext();
  const { plants } = usePlantContext();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  const getDepartmentName = useCallback((id: number) => {
    const dept = departments.find((d) => d.id === id);
    return dept ? dept.name || dept.department_name : id;
  }, [departments]);

  const getPlantName = useCallback((id: number) => {
    const plant = plants.find((p) => p.id === id);
    return plant ? plant.name || plant.plant_name || id : id;
  }, [plants]);

  // Close filter popover on outside click
  React.useEffect(() => {
    if (!showFilterPopover) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowFilterPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilterPopover]);

  // Filter by plant permissions first
  const permissionFilteredData = useMemo(() => {
    return filterByModulePlantPermission(applications,user,"application_master");
  }, [applications, user]);

  // Apply user's custom filters
  const filteredData = useMemo(() => {
    return permissionFilteredData.filter((app) => {
      if (!filterValue.trim()) return true;
      const value = filterValue.toLowerCase();
      switch (filterColumn) {
        case "application_hmi_name":
          return app.application_hmi_name?.toLowerCase().includes(value);
        case "plant_location_id":
          const plantName = String(getPlantName(app.plant_location_id)).toLowerCase();
          return plantName.includes(value) || String(app.plant_location_id).includes(value);
        case "department_id":
          const deptName = String(getDepartmentName(app.department_id)).toLowerCase();
          return deptName.includes(value) || String(app.department_id).includes(value);
        case "role_id":
          if (Array.isArray(app.role_names) && app.role_names.length > 0) {
            return app.role_names.some((name) => name.toLowerCase().includes(value));
          }
          return String(app.role_id).includes(value);
        case "status":
          return app.status?.toLowerCase().includes(value);
        default:
          return true;
      }
    });
  }, [permissionFilteredData, filterValue, filterColumn, getPlantName, getDepartmentName]);

  // Reset to first page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterValue]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  const paginatedData = useMemo(() => {
    return filteredData.slice(
      (currentPage - 1) * rowsPerPage,
      currentPage * rowsPerPage
    );
  }, [filteredData, currentPage]);

  const handleDelete = useCallback(() => {
    if (selectedRow === null) return;
    const app = filteredData[selectedRow];
    
    if (!hasPermission(PERMISSIONS.APPLICATION.DELETE, app.plant_location_id)) {
      alert('You do not have permission to delete applications for this plant');
      return;
    }
    
    setShowDeleteModal(true);
  }, [selectedRow, filteredData, hasPermission]);
  
  const confirmDelete = useCallback(async () => {
    if (selectedRow === null) return;
    const sel = filteredData[selectedRow];
    if (!sel) return;

    try {
      const res = await fetch(`${API_BASE}/api/applications/${sel.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to delete application');
      }

      const updated = applications.filter((a: any) => a.id !== sel.id);
      setApplications(updated);
      setSelectedRow(null);
      setShowDeleteModal(false);
    } catch (err) {
      alert('Failed to delete application. Please try again.');
      console.error(err);
    }
  }, [selectedRow, filteredData, applications, setApplications]);

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  };

  const handleExportPDF = useCallback(async () => {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const fileName = `ApplicationMaster_${today.toISOString().split("T")[0]}.pdf`;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMargin = 14;
    const headerHeight = 28;

    doc.setFillColor(0, 82, 155);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

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

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titleX = pageMargin + logoWidth + 10;
    const titleY = headerHeight / 2 + 5;
    doc.text("Application Master", titleX, titleY);

    doc.setFontSize(9);
    doc.setTextColor(220, 230, 245);
    const exportedByName = (user && (user.name || user.username)) || "Unknown User";
    const exportedText = `Exported by: ${exportedByName}  On: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
    const textWidth = doc.getTextWidth(exportedText);
    doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);

    doc.setDrawColor(0, 82, 155);
    doc.setLineWidth(0.5);
    doc.line(0, headerHeight, pageWidth, headerHeight);

    const headers = [
      ["Plant Location", "Department", "Application/HMI Name", "Version", "Equipment ID", "Type", "Display Name", "Role", "System Name", "Multi-Role", "Status"],
    ];
    const rows = filteredData.map((app: any) => [
      getPlantName(app.plant_location_id),
      getDepartmentName(app.department_id),
      app.application_hmi_name,
      app.application_hmi_version,
      app.equipment_instrument_id,
      app.application_hmi_type,
      app.display_name,
      Array.isArray(app.role_names) ? app.role_names.join(", ") : app.role_id,
      app.system_name,
      app.multiple_role_access ? "Yes" : "No",
      app.status,
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: headerHeight + 8,
      styles: { fontSize: 9, cellPadding: 3, halign: "left", valign: "middle", textColor: 80 },
      headStyles: { fillColor: [11, 99, 206], textColor: 255, fontStyle: "bold", fontSize: 10 },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      margin: { left: pageMargin, right: pageMargin },
      tableWidth: "auto",
    });

    const pageCount = (doc as any).getNumberOfPages?.() || (doc as any).internal?.getNumberOfPages?.() || 1;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(pageMargin, pageHeight - 15, pageWidth - pageMargin, pageHeight - 15);
    doc.setFontSize(8);
    doc.setTextColor(100);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text("Unichem Laboratories", pageMargin, pageHeight - 10);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - pageMargin - 30, pageHeight - 10);
    }

    doc.save(fileName);
  }, [filteredData, user, getPlantName, getDepartmentName]);

  const handleEdit = useCallback(() => {
    if (selectedRow === null) return;
    const app = filteredData[selectedRow];
    
    if (!hasPermission(PERMISSIONS.APPLICATION.UPDATE, app.plant_location_id)) {
      alert('You do not have permission to edit applications for this plant');
      return;
    }
    
    navigate(`/edit-application-masters/${app.id}`, {
      state: { applicationData: app, applicationIdx: selectedRow },
    });
  }, [selectedRow, filteredData, hasPermission, navigate]);

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Application Master Management" />
      
      <div className={styles.contentArea}>
        <div className={styles.controlPanel}>
          <div className={styles.actionRow}>
            <PermissionGuard permission={PERMISSIONS.APPLICATION.CREATE}>
              <button 
                className={styles.addBtn} 
                onClick={() => navigate("/add-application-masters")}
              >
                + Add New Application
              </button>
            </PermissionGuard>

            <button 
              className={styles.filterBtn} 
              onClick={() => setShowFilterPopover((prev) => !prev)}
            >
              🔍 Filter
            </button>

            <PermissionButton
              permission={PERMISSIONS.APPLICATION.UPDATE}
              className={styles.editBtn}
              disabled={selectedRow === null}
              onClick={handleEdit}
            >
              <FaEdit size={14} /> Edit
            </PermissionButton>

            <PermissionButton
              permission={PERMISSIONS.APPLICATION.DELETE}
              className={styles.deleteBtn}
              disabled={selectedRow === null}
              onClick={handleDelete}
            >
              <FaTrash size={14} /> Delete
            </PermissionButton>

            <button className={styles.exportBtn} onClick={handleExportPDF}>
              📄 Export PDF
            </button>
          </div>

          {showFilterPopover && (
            <div className={styles.filterPopover} ref={popoverRef}>
              <div className={styles.filterHeader}>Advanced Filter</div>
              <div className={styles.filterBody}>
                <div className={styles.filterField}>
                  <label>Column</label>
                  <select 
                    value={tempFilterColumn} 
                    onChange={(e) => setTempFilterColumn(e.target.value)}
                  >
                    <option value="application_hmi_name">Application/HMI Name</option>
                    <option value="plant_location_id">Plant Location</option>
                    <option value="department_id">Department</option>
                    <option value="role_id">Role</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                <div className={styles.filterField}>
                  <label>Value</label>
                  <input
                    type="text"
                    placeholder={`Enter ${tempFilterColumn}`}
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
            <h2>Application Master Records</h2>
            <span className={styles.recordCount}>{filteredData.length} Records</span>
          </div>
          
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}></th>
                  <th>Plant Location</th>
                  <th>Department</th>
                  <th>Application/HMI Name</th>
                  <th>Version</th>
                  <th>Equipment ID</th>
                  <th>Type</th>
                  <th>Role</th>
                  <th>System Name</th>
                  <th>Multi-Role</th>
                  <th>Status</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Activity</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                      No applications found matching your permissions and filters
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((app: any, idx: number) => {
                    const globalIdx = (currentPage - 1) * rowsPerPage + idx;
                    return (
                      <tr
                        key={app.id || globalIdx}
                        className={selectedRow === globalIdx ? styles.selectedRow : ""}
                      >
                        <td>
                          <input
                            type="radio"
                            checked={selectedRow === globalIdx}
                            onChange={() => setSelectedRow(globalIdx)}
                          />
                        </td>
                        <td>{getPlantName(app.plant_location_id)}</td>
                        <td>{getDepartmentName(app.department_id)}</td>
                        <td className={styles.appName}>{app.application_hmi_name}</td>
                        <td>{app.application_hmi_version}</td>
                        <td>{app.equipment_instrument_id}</td>
                        <td>{app.application_hmi_type}</td>
                        <td>
                          {Array.isArray(app.role_names) && app.role_names.length > 0
                            ? app.role_names.join(", ")
                            : app.role_id}
                        </td>
                        <td>{app.system_name}</td>
                        <td>{app.multiple_role_access ? "Yes" : "No"}</td>
                        <td>
                          <span className={app.status === "INACTIVE" ? styles.statusInactive : styles.statusActive}>
                            {app.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className={styles.activityBtn} 
                            onClick={async () => {
                              try {
                                const logs = await fetchApplicationActivityLogs();
                                const filtered = (logs || []).filter((log: any) => {
                                  if (log.table_name === "application_master" && String(log.record_id) === String(app.id))
                                    return true;
                                  if (log.details && typeof log.details === "string") {
                                    return log.details.includes(`"tableName":"application_master"`) &&
                                      log.details.includes(`"recordId":"${app.id}"`);
                                  }
                                  return false;
                                });
                                setActivityLogsApp({ ...app, activityLogs: filtered });
                              } catch (err) {
                                setActivityLogsApp({ ...app, activityLogs: [] });
                              }
                              setShowActivityModal(true);
                            }}
                          >
                            <FaRegClock size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={paginationStyles.pagination}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={currentPage === 1 ? paginationStyles.disabledPageBtn : paginationStyles.pageBtn}
            >
              Previous
            </button>
            <span className={paginationStyles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={currentPage === totalPages ? paginationStyles.disabledPageBtn : paginationStyles.pageBtn}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        open={showDeleteModal}
        name={selectedRow !== null && filteredData[selectedRow] ? filteredData[selectedRow].application_hmi_name : "application"}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
      />

      {showActivityModal && activityLogsApp && (
        <div className={styles.modalOverlay}>
          <div className={styles.activityModal}>
            <div className={styles.modalHeader}>
              <h3>Activity Log - {activityLogsApp.application_hmi_name}</h3>
              <button onClick={() => setShowActivityModal(false)} className={styles.closeBtn}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.activityTableContainer}>
                <table className={styles.activityTable}>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Old Value</th>
                      <th>New Value</th>
                      <th>Performed By</th>
                      <th>Status</th>
                      <th>Date/Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(activityLogsApp.activityLogs) ? activityLogsApp.activityLogs : []).map((log: any, i: number) => (
                      <tr key={i}>
                        <td>{log.action || "-"}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.oldValue ? JSON.stringify(log.oldValue).substring(0, 100) : "-"}
                        </td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.newValue ? JSON.stringify(log.newValue).substring(0, 100) : "-"}
                        </td>
                        <td>{log.approver || log.action_performed_by || "-"}</td>
                        <td>{log.approvalStatus || log.approval_status || "-"}</td>
                        <td>{log.dateTime || log.date_time_ist ? new Date(log.dateTime || log.date_time_ist).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}