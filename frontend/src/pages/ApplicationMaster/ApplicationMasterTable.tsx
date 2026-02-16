// src/pages/ApplicationMaster/ApplicationMasterTable.tsx
import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaRegClock, FaEdit, FaTrash } from "react-icons/fa";
import AppHeader from "../../components/Common/AppHeader";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import ActivityLogModal from "../../components/Common/ActivityLogModal";
import { PermissionGuard, PermissionButton } from "../../components/Common/PermissionComponents";
import { useApplications } from "../../context/ApplicationsContext";
import { useDepartmentContext } from "..//DepartmentTable/DepartmentContext";
import { usePlantContext } from "../Plant/PlantContext";
import { useRoles } from "../RoleMasterUser/RolesContext";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../context/PermissionContext";
import { filterByPlantPermission,filterByModulePlantPermission } from "../../utils/permissionUtils";
import { fetchActivityLogs,fetchActivityLogsByRecordId  } from "../../utils/activityLogUtils";
import { API_BASE } from "../../utils/api";
import { PERMISSIONS } from "../../constants/permissions";
import styles from "../Plant/PlantMasterTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import useAutoRefresh from "../../hooks/useAutoRefresh";

export default function ApplicationMasterTable() {
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  const [activityLogs, setActivityLogs] = React.useState<any[]>([]);
  const [selectedRecordName, setSelectedRecordName] = React.useState("");
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
  
  const { applications, setApplications, refreshApplications } = useApplications();
  // Get context data for name resolution
  const { plants } = usePlantContext();
  const { departments } = useDepartmentContext();
  const { roles } = useRoles(); // Assuming you have this
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  
   const getPlantName = useCallback((id: number): string => {
  const plant = plants.find(p => p.id === id);
  return plant?.plant_name ?? `Plant ${id}`;
}, [plants]);

  const getDepartmentName = useCallback((id: number) => {
    const dept = departments.find(d => d.id === id);
    return dept ? (dept.department_name || dept.name) : `Dept ${id}`;
  }, [departments]);

  const getRoleName = useCallback((id: number) => {
    const role = roles.find(r => r.id === id);
    return role ? ( role.name) : `Role ${id}`;
  }, [roles]);

  const getUserName = useCallback((id: number) => {
    // You can fetch from users context or API
    // For now, just return the ID
    return `User ${id}`;
  }, []);
  const refreshCallback = useCallback(() => {
    console.log("[ApplicationMaster] 🔄 Auto refreshing applications...");
    refreshApplications();
  }, [refreshApplications]);

  useAutoRefresh(refreshCallback);

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

  console.log('All Applications:', applications);
  
  // Filter by plant permissions first
  const permissionFilteredData = useMemo(() => {
    return filterByModulePlantPermission(applications,user,"application_master");
  }, [applications, user]);
  
  console.log('Applications after permission filter:', permissionFilteredData);
  console.log('User info',applications,user);
  
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

  console.log('Filtered applications:', filteredData);
   
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

  // 🔥 NEW: Handle activity log button click
  const handleActivityClick = useCallback(async (app: any) => {
    try {
      // Fetch activity logs using the common utility
      const logs = await fetchActivityLogsByRecordId('application_master', app.id);
      console.log(`✅ Found ${logs.length} logs for record ${app.id}`);
      setActivityLogs(logs);
      setSelectedRecordName(app.application_hmi_name);
      setShowActivityModal(true);
    } catch (err) {
      console.error("Error loading activity logs:", err);
      setActivityLogs([]);
      setSelectedRecordName(app.application_hmi_name);
      setShowActivityModal(true);
    }
  }, []);

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
      String(getPlantName(app.plant_location_id) || ""),
      String(getDepartmentName(app.department_id) || ""),
      String(app.application_hmi_name || ""),
      String(app.application_hmi_version || ""),
      String(app.equipment_instrument_id || ""),
      String(app.application_hmi_type || ""),
      String(app.display_name || ""),
      Array.isArray(app.role_names) ? app.role_names.join(", ") : String(app.role_id || ""),
      String(app.system_name || ""),
      app.multiple_role_access ? "Yes" : "No",
      String(app.status || ""),
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
      const pageNumText = `Page ${i} of ${pageCount}`;
      const pageNumWidth = doc.getTextWidth(pageNumText);
      doc.text(pageNumText, pageWidth - pageMargin - pageNumWidth, pageHeight - 10);
    }

    doc.save(fileName);
  }, [filteredData, getPlantName, getDepartmentName, user]);

  const handleExportExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const ws_data = [
      [
        "Plant Location",
        "Department",
        "Application/HMI Name",
        "Version",
        "Equipment ID",
        "Type",
        "Display Name",
        "Role",
        "System Name",
        "Multi-Role",
        "Status",
      ],
      ...filteredData.map((app) => [
        getPlantName(app.plant_location_id),
        getDepartmentName(app.department_id),
        app.application_hmi_name || "",
        app.application_hmi_version || "",
        app.equipment_instrument_id || "",
        app.application_hmi_type || "",
        app.display_name || "",
        Array.isArray(app.role_names) && app.role_names.length > 0
          ? app.role_names.join(", ")
          : app.role_id || "",
        app.system_name || "",
        app.multiple_role_access ? "Yes" : "No",
        app.status || "",
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Applications");
    const today = new Date();
    const fileName = `ApplicationMaster_${today.toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [filteredData, getPlantName, getDepartmentName]);

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
              onClick={handleEdit}
              className={styles.editButton}
              disabled={selectedRow === null}
            >
              <FaEdit /> Edit
            </PermissionButton>

            <PermissionButton
              permission={PERMISSIONS.APPLICATION.DELETE}
              onClick={handleDelete}
              className={styles.deleteButton}
              disabled={selectedRow === null}
            >
              <FaTrash /> Delete
            </PermissionButton>

            <button className={styles.exportBtn} onClick={handleExportPDF}>
              📄 Export PDF
            </button>

            <button className={styles.exportBtn} onClick={handleExportExcel}>
              📊 Export Excel
            </button>
          </div>

          {showFilterPopover && (
            <div className={styles.filterPopover} ref={popoverRef}>
              <h4>Filter Data</h4>
              <div className={styles.filterGroup}>
                <label>Column:</label>
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
              <div className={styles.filterGroup}>
                <label>Value:</label>
                <input
                  type="text"
                  value={tempFilterValue}
                  onChange={(e) => setTempFilterValue(e.target.value)}
                  placeholder="Enter filter value..."
                />
              </div>
              <div className={styles.filterButtons}>
                <button
                  onClick={() => {
                    setFilterColumn(tempFilterColumn);
                    setFilterValue(tempFilterValue);
                    setShowFilterPopover(false);
                  }}
                  className={styles.applyButton}
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    setTempFilterColumn("application_hmi_name");
                    setTempFilterValue("");
                    setFilterColumn("application_hmi_name");
                    setFilterValue("");
                  }}
                  className={styles.clearButton}
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
                            onClick={() => handleActivityClick(app)}
                            title="View activity logs"
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

     {/* Activity Log Modal with name resolution */}
      <ActivityLogModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        title="Activity Log"
        recordName={selectedRecordName}
        activityLogs={activityLogs}
        // 🔥 Pass name resolution functions
        getPlantName={getPlantName}
        getDepartmentName={getDepartmentName}
        getRoleName={getRoleName}
        getUserName={getUserName}
      />
    </div>
  );
}