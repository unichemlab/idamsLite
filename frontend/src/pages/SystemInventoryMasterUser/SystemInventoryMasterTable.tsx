import React, { useState, useRef, useContext,useMemo,useCallback } from "react";
// import styles from "../ApplicationMasterTable/ApplicationMasterTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import { FaRegClock } from "react-icons/fa6";
import { fetchActivityLog } from "../../utils/api";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import { SystemContext,System } from "../SystemInventoryMasterUser/SystemContext";
import unichemLogoBase64 from "../../assets/unichemLogoBase64";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { useAuth } from "../../context/AuthContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/PlantMasterTable.module.css";
import { usePermissions } from "../../context/PermissionContext";
import { filterByPlantPermission,filterByModulePlantPermission } from "../../utils/permissionUtils";
import { fetchApplicationActivityLogs, API_BASE } from "../../utils/api";
import { PermissionGuard, PermissionButton } from "../../components/Common/PermissionComponents";
import { PERMISSIONS } from "../../constants/permissions";
import useAutoRefresh from "../../hooks/useAutoRefresh";

const SystemInventoryMasterTable: React.FC = () => {
  const systemCtx = useContext(SystemContext);
  const systems = systemCtx?.systems ?? [];
  const refreshSystems =systemCtx?.refreshSystems??[];
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [filterColumn, setFilterColumn] = useState("host_name");
  const [filterValue, setFilterValue] = useState("");
  const [tempFilterColumn, setTempFilterColumn] = useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = useState(filterValue);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLogsSystem, setActivityLogsSystem] = useState<any>(null);
const { user } = useAuth();
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 10;
console.log("Sytems",systems);
  // Reset page and selection when filter changes to avoid out-of-range selections
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedRow(null);
  }, [filterValue, filterColumn]);

    const permissionFilteredData = useMemo(() => {
      return filterByModulePlantPermission(systems,user,"system_inventory");
    }, [systems, user]);
console.log("permission Filter",permissionFilteredData);
  // Fetch systems from backend
  // Removed direct fetch; data comes from context

  // Filtering logic
  const filteredData = useMemo(() => {
         return permissionFilteredData.filter((system) => {
           if (!filterValue.trim()) return true;
           const value = filterValue.toLowerCase();
           console.log("Filter Value and column",filterValue,filterColumn);
           switch (filterColumn) {
       case "host_name":
         return system.host_name
           ? system.host_name.toLowerCase().includes(value)
           : false;
       case "remarks":
         return system.remarks
           ? system.remarks.toLowerCase().includes(value)
           : false;
       case "status":
         return system.status?.toLowerCase().includes(value);
       default:
         return true;
     }
         });
       }, [permissionFilteredData, filterValue, filterColumn]);

const refreshCallback = useCallback(() => {
  if (typeof refreshSystems !== "function") return;

  console.log("[SystemMaster] 🔄 Auto refreshing systems...");
  refreshSystems();
}, [refreshSystems]);


useAutoRefresh(refreshCallback);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
console.log("Filtered Data:", filteredData);
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  };

  // PDF Export Handler
  const handleExportPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const fileName = `SystemMaster_${today.toISOString().split("T")[0]}.pdf`;

    // --- HEADER BAR ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMargin = 14;
    const headerHeight = 28;
    doc.setFillColor(0, 82, 155);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Logo (prefer PNG import, fallback to base64)
    let logoWidth = 0;
    let logoHeight = 0;
    try {
      if (login_headTitle2) {
        const img = await loadImage(login_headTitle2);
        const maxLogoHeight = headerHeight * 0.6;
        const scale = maxLogoHeight / img.height;
        logoWidth = img.width * scale;
        logoHeight = img.height * scale;
        const logoY = headerHeight / 2 - logoHeight / 2;
        doc.addImage(img, "PNG", pageMargin, logoY, logoWidth, logoHeight);
      } else if (
        unichemLogoBase64 &&
        unichemLogoBase64.startsWith("data:image")
      ) {
        logoWidth = 50;
        logoHeight = 18;
        const logoY = headerHeight / 2 - logoHeight / 2;
        doc.addImage(
          unichemLogoBase64,
          "PNG",
          pageMargin,
          logoY,
          logoWidth,
          logoHeight
        );
      }
    } catch (e) {
      console.warn("Logo load failed", e);
    }

    // Title + Exported by/date
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titleX = pageMargin + logoWidth + 10;
    const titleY = headerHeight / 2 + 5;
    doc.text("System Master", titleX, titleY);

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
    const headers = [
      [
        "Plant Location",
        "User Location",
        "Building Location",
        "Department",
        "Allocated to User Name",
        "Host Name",
        "Make",
        "Model",
        "Serial No.",
        "Processor",
        "RAM (Capacity)",
        "HDD (Capacity)",
        "IP Address",
        "Other Software",
        "Windows Activated",
        "OS Version / Service Pack",
        "Architecture",
        "Type of Asset",
        "Category GxP",
        "GAMP Category",
        "Instrument/Equipment Name",
        "Equipment/Instrument ID",
        "Instrument Owner",
        "ServiceTag",
        "Warranty Status",
        "Warranty End Date",
        "Connected No. of Equipments",
        "Application Name",
        "Application Version",
        "Application OEM",
        "Application Vendor",
        "User Management Applicable",
        "Application Onboard",
        "System Process Owner",
        "Database Version",
        "Domain/Workgroup",
        "Connected Through",
        "Specific VLAN",
        "IP Address Type",
        "Date/Time Sync Available",
        "Antivirus",
        "Antivirus Version",
        "Backup Type",
        "Backup Frequency Days",
        "Backup Path",
        "Backup Tool",
        "Backup Procedure Available",
        "Folder Deletion Restriction",
        "Remote Tool Available",
        "OS Administrator",
        "System Running With",
        "Audit Trail Adequacy",
        "User Roles Availability",
        "User Roles Challenged",
        "System Managed By",
        "Planned Upgrade FY25-26",
        "EOL/EOS Upgrade Status",
        "System Current Status",
        "Purchase PO",
        "Purchase Vendor Name",
        "AMC Vendor Name",
        "Renewal PO",
        "Warranty Period",
        "AMC Start Date",
        "AMC Expiry Date",
        "SAP Asset No.",
        "Remarks",
        "Created On",
        "Updated On",
      ],
    ];
    const rows = filteredData.map((system) => [
      system.plant_name ?? "",
      system.user_location ?? "",
      system.building_location ?? "",
      system.department_name ?? "",
      system.allocated_to_user_name ?? "",
      system.host_name ?? "",
      system.make ?? "",
      system.model ?? "",
      system.serial_no ?? "",
      system.processor ?? "",
      system.ram_capacity ?? "",
      system.hdd_capacity ?? "",
      system.ip_address ?? "",
      system.other_software ?? "",
      system.windows_activated ? "Yes" : "No",
      system.os_version_service_pack ?? "",
      system.architecture ?? "",
      system.type_of_asset ?? "",
      system.category_gxp ?? "",
      system.gamp_category ?? "",
      system.instrument_equipment_name ?? "",
      system.equipment_instrument_id ?? "",
      system.instrument_owner ?? "",
      system.service_tag ?? "",
      system.warranty_status ?? "",
      system.warranty_end_date ?? "",
      system.connected_no_of_equipments ?? "",
      system.application_name ?? "",
      system.application_version ?? "",
      system.application_oem ?? "",
      system.application_vendor ?? "",
      system.user_management_applicable ? "Yes" : "No",
      system.application_onboard ?? "",
      system.system_process_owner ?? "",
      system.database_version ?? "",
      system.domain_workgroup ?? "",
      system.connected_through ?? "",
      system.specific_vlan ?? "",
      system.ip_address_type ?? "",
      system.date_time_sync_available ? "Yes" : "No",
      system.antivirus ?? "",
      system.antivirus_version ?? "",
      system.backup_type ?? "",
      system.backup_frequency_days ?? "",
      system.backup_path ?? "",
      system.backup_tool ?? "",
      system.backup_procedure_available ? "Yes" : "No",
      system.folder_deletion_restriction ? "Yes" : "No",
      system.remote_tool_available ? "Yes" : "No",
      system.os_administrator ?? "",
      system.system_running_with ?? "",
      system.audit_trail_adequacy ?? "",
      system.user_roles_availability ? "Yes" : "No",
      system.user_roles_challenged ? "Yes" : "No",
      system.system_managed_by ?? "",
      system.planned_upgrade_fy2526 ? "Yes" : "No",
      system.eol_eos_upgrade_status ?? "",
      system.system_current_status ?? "",
      system.purchase_po ?? "",
      system.purchase_vendor_name ?? "",
      system.amc_vendor_name ?? "",
      system.renewal_po ?? "",
      system.warranty_period ?? "",
      system.amc_start_date ?? "",
      system.amc_expiry_date ?? "",
      system.sap_asset_no ?? "",
      system.remarks ?? "",
      system.created_on ?? "",
      system.updated_on ?? "",
    ]);
    autoTable(doc, {
      head: headers,
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
      alternateRowStyles: {
        fillColor: [240, 245, 255],
      },
      margin: { left: pageMargin, right: pageMargin },
      tableWidth: "auto",
    });

    // --- FOOTER ---
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

  // Delete system handler
  const confirmDelete = async () => {
    if (selectedRow === null) return;
    const system = filteredData[selectedRow];
    if (!system) return;
    // Use context deleteSystem if available
    if (systemCtx && systemCtx.deleteSystem) {
      const idx = systems.findIndex((s) => s.id === system.id);
      if (idx !== -1) await systemCtx.deleteSystem(idx);
    }
    setSelectedRow(null);
    setShowDeleteModal(false);
  };

  // Filter popover click outside handler
  React.useEffect(() => {
    if (!showFilterPopover) return;
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setShowFilterPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilterPopover]);

  return (
     <div className={styles.pageWrapper}>
      <AppHeader title="System Inventory Management" />
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
                  placeholder="Search ..."
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
             <PermissionGuard permission={PERMISSIONS.SYSTEM.CREATE}>
          <button
            className={styles.addBtn}
            onClick={() => navigate("/system-master/add")}
          >
            + Add New
          </button>
          </PermissionGuard>
          <button
            className={styles.filterBtn}
            onClick={() => setShowFilterPopover((prev) => !prev)}
            type="button"
            aria-label="Filter systems"
          >
            🔍 Filter
          </button>
          <button
            className={`${styles.btn} ${styles.editBtn}`}
            onClick={() => {
              if (selectedRow !== null)
                navigate(`/system-master/edit/${filteredData[selectedRow].id}`);
            }}
            disabled={selectedRow === null}
          >
            <FaEdit size={14} /> Edit
          </button>
          <button
            className={`${styles.btn} ${styles.deleteBtn}`}
            disabled={selectedRow === null}
            onClick={() => setShowDeleteModal(true)}
            title="Delete selected system"
          >
            <FaTrash size={14} /> Delete
          </button>
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
        <div className={styles.controls}>
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
                    <option value="host_name">System Name</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                <div className={styles.filterFieldRow}>
                  <label className={styles.filterLabel}>Value</label>
                  <input
                    className={styles.filterInput}
                    type="text"
                    placeholder={`Enter ${
                      tempFilterColumn.charAt(0).toUpperCase() +
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
      </div>

      <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2>System Inventory Records</h2>
            <span className={styles.recordCount}>{filteredData.length} Records</span>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}></th>
                {/* Removed System Name, Status, Description, Transaction ID columns */}
                <th>Plant Location</th>
                <th>User Location</th>
                <th>Building Location</th>
                <th>Department</th>
                <th>Allocated to User Name</th>
                <th>Host Name</th>
                <th>Make</th>
                <th>Model</th>
                <th>Serial No.</th>
                <th>Processor</th>
                <th>RAM (Capacity)</th>
                <th>HDD (Capacity)</th>
                <th>IP Address</th>
                <th>Other Software</th>
                <th>Windows Activated</th>
                <th>OS Version / Service Pack</th>
                <th>Architecture</th>
                <th>Type of Asset</th>
                <th>Category GxP</th>
                <th>GAMP Category</th>
                <th>Instrument/Equipment Name</th>
                <th>Equipment/Instrument ID</th>
                <th>Instrument Owner</th>
                <th>ServiceTag</th>
                <th>Warranty Status</th>
                <th>Warranty End Date</th>
                <th>Connected No. of Equipments</th>
                <th>Application Name</th>
                <th>Application Version</th>
                <th>Application OEM</th>
                <th>Application Vendor</th>
                <th>User Management Applicable</th>
                <th>Application Onboard</th>
                <th>System Process Owner</th>
                <th>Database Version</th>
                <th>Domain/Workgroup</th>
                <th>Connected Through</th>
                <th>Specific VLAN</th>
                <th>IP Address Type</th>
                <th>Date/Time Sync Available</th>
                <th>Antivirus</th>
                <th>Antivirus Version</th>
                <th>Backup Type</th>
                <th>Backup Frequency Days</th>
                <th>Backup Path</th>
                <th>Backup Tool</th>
                <th>Backup Procedure Available</th>
                <th>Folder Deletion Restriction</th>
                <th>Remote Tool Available</th>
                <th>OS Administrator</th>
                <th>System Running With</th>
                <th>Audit Trail Adequacy</th>
                <th>User Roles Availability</th>
                <th>User Roles Challenged</th>
                <th>System Managed By</th>
                <th>Planned Upgrade FY25-26</th>
                <th>EOL/EOS Upgrade Status</th>
                <th>System Current Status</th>
                <th>Purchase PO</th>
                <th>Purchase Vendor Name</th>
                <th>AMC Vendor Name</th>
                <th>Renewal PO</th>
                <th>Warranty Period</th>
                <th>AMC Start Date</th>
                <th>AMC Expiry Date</th>
                <th>SAP Asset No.</th>
                <th>Remarks</th>
                <th>Created On</th>
                <th>Updated On</th>
                <th>Activity Log</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((system, index) => {
                const globalIdx = (currentPage - 1) * rowsPerPage + index;
                return (
                  <tr
                    key={system.id}
                    onClick={() => setSelectedRow(globalIdx)}
                    style={{
                      background:
                        selectedRow === globalIdx ? "#f0f4ff" : undefined,
                    }}
                  >
                    <td>
                      <input
                        type="radio"
                        className={styles.radioInput}
                        checked={selectedRow === globalIdx}
                        onChange={() => setSelectedRow(globalIdx)}
                      />
                    </td>
                    {/* Removed System Name, Status, Description, Transaction ID cells */}
                    <td>{system.plant_name}</td>
                    <td>{system.user_location}</td>
                    <td>{system.building_location}</td>
                    <td>{system.department_name}</td>
                    <td>{system.allocated_to_user_name}</td>
                    <td>{system.host_name}</td>
                    <td>{system.make}</td>
                    <td>{system.model}</td>
                    <td>{system.serial_no}</td>
                    <td>{system.processor}</td>
                    <td>{system.ram_capacity}</td>
                    <td>{system.hdd_capacity}</td>
                    <td>{system.ip_address}</td>
                    <td>{system.other_software}</td>
                    <td>{system.windows_activated ? "Yes" : "No"}</td>
                    <td>{system.os_version_service_pack}</td>
                    <td>{system.architecture}</td>
                    <td>{system.type_of_asset}</td>
                    <td>{system.category_gxp}</td>
                    <td>{system.gamp_category}</td>
                    <td>{system.instrument_equipment_name}</td>
                    <td>{system.equipment_instrument_id}</td>
                    <td>{system.instrument_owner}</td>
                    <td>{system.service_tag}</td>
                    <td>{system.warranty_status}</td>
                    <td>{system.warranty_end_date}</td>
                    <td>{system.connected_no_of_equipments}</td>
                    <td>{system.application_name}</td>
                    <td>{system.application_version}</td>
                    <td>{system.application_oem}</td>
                    <td>{system.application_vendor}</td>
                    <td>{system.user_management_applicable ? "Yes" : "No"}</td>
                    <td>{system.application_onboard}</td>
                    <td>{system.system_process_owner}</td>
                    <td>{system.database_version}</td>
                    <td>{system.domain_workgroup}</td>
                    <td>{system.connected_through}</td>
                    <td>{system.specific_vlan}</td>
                    <td>{system.ip_address_type}</td>
                    <td>{system.date_time_sync_available ? "Yes" : "No"}</td>
                    <td>{system.antivirus}</td>
                    <td>{system.antivirus_version}</td>
                    <td>{system.backup_type}</td>
                    <td>{system.backup_frequency_days}</td>
                    <td>{system.backup_path}</td>
                    <td>{system.backup_tool}</td>
                    <td>{system.backup_procedure_available ? "Yes" : "No"}</td>
                    <td>{system.folder_deletion_restriction ? "Yes" : "No"}</td>
                    <td>{system.remote_tool_available ? "Yes" : "No"}</td>
                    <td>{system.os_administrator}</td>
                    <td>{system.system_running_with}</td>
                    <td>{system.audit_trail_adequacy}</td>
                    <td>{system.user_roles_availability ? "Yes" : "No"}</td>
                    <td>{system.user_roles_challenged ? "Yes" : "No"}</td>
                    <td>{system.system_managed_by}</td>
                    <td>{system.planned_upgrade_fy2526 ? "Yes" : "No"}</td>
                    <td>{system.eol_eos_upgrade_status}</td>
                    <td>{system.system_current_status}</td>
                    <td>{system.purchase_po}</td>
                    <td>{system.purchase_vendor_name}</td>
                    <td>{system.amc_vendor_name}</td>
                    <td>{system.renewal_po}</td>
                    <td>{system.warranty_period}</td>
                    <td>{system.amc_start_date}</td>
                    <td>{system.amc_expiry_date}</td>
                    <td>{system.sap_asset_no}</td>
                    <td>{system.remarks}</td>
                    <td>{system.created_on}</td>
                    <td>{system.updated_on}</td>
                    <td>
                      <button
                        className={styles.actionBtn}
                        title="View Activity Logs"
                        onClick={async () => {
                          try {
                            const logs = await fetchActivityLog();
                            const filtered = (logs || [])
                              .filter((log: any) => {
                                if (
                                  log.table_name === "system_master" &&
                                  String(log.record_id) === String(system.id)
                                )
                                  return true;
                                if (
                                  log.details &&
                                  typeof log.details === "string"
                                ) {
                                  return (
                                    log.details.includes(
                                      '"tableName":"system_master"'
                                    ) &&
                                    log.details.includes(
                                      `"recordId":"${system.id}"`
                                    )
                                  );
                                }
                                return false;
                              })
                              .map((r: any) => {
                                let parsedDetails = null;
                                if (
                                  r.details &&
                                  typeof r.details === "string"
                                ) {
                                  try {
                                    parsedDetails = JSON.parse(r.details);
                                  } catch (e) {
                                    parsedDetails = null;
                                  }
                                }

                                const parseMaybeJson = (v: any) => {
                                  if (v === null || v === undefined)
                                    return null;
                                  if (typeof v === "string") {
                                    try {
                                      return JSON.parse(v);
                                    } catch {
                                      return v;
                                    }
                                  }
                                  return v;
                                };

                                const oldVal = parseMaybeJson(
                                  r.old_value ||
                                    (parsedDetails && parsedDetails.old_value)
                                );
                                const newVal = parseMaybeJson(
                                  r.new_value ||
                                    (parsedDetails && parsedDetails.new_value)
                                );
                                const action =
                                  r.action ||
                                  (parsedDetails && parsedDetails.action) ||
                                  "";
                                const approver =
                                  r.action_performed_by ||
                                  r.user_id ||
                                  (parsedDetails && parsedDetails.userId) ||
                                  null;
                                const dateTime =
                                  r.date_time_ist ||
                                  r.timestamp ||
                                  r.created_at ||
                                  (parsedDetails && parsedDetails.dateTime) ||
                                  null;
                                const comments =
                                  r.comments ||
                                  (parsedDetails && parsedDetails.comments) ||
                                  (parsedDetails && parsedDetails.reason) ||
                                  null;

                                return {
                                  action,
                                  oldValue: oldVal,
                                  newValue: newVal,
                                  approver,
                                  approvedOrRejectedBy: r.approved_by || null,
                                  approvalStatus:
                                    r.approve_status ||
                                    r.approval_status ||
                                    null,
                                  dateTime,
                                  reason: comments,
                                  _raw: r,
                                };
                              });

                            setActivityLogsSystem({
                              ...system,
                              activityLogs: filtered,
                            });
                          } catch (err) {
                            setActivityLogsSystem({
                              ...system,
                              activityLogs: [],
                            });
                          }
                          setShowActivityModal(true);
                        }}
                      >
                        <FaRegClock size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              <ConfirmDeleteModal
                open={showDeleteModal}
                name={
                  selectedRow !== null && filteredData[selectedRow]
                    ? filteredData[selectedRow].host_name ?? "system"
                    : "system"
                }
                onCancel={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
              />
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 8 }}
        >
          <div className={paginationStyles.pagination}>
            <button
              className={paginationStyles.pageBtn}
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              Previous
            </button>
            <div className={paginationStyles.pageInfo}>
              Page {currentPage} of {totalPages}
            </div>
            <button
              className={paginationStyles.pageBtn}
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Activity Logs Modal */}
      {showActivityModal && activityLogsSystem && (
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
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 20 }}>Activity Log</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  className={styles.exportPdfBtn}
                  onClick={async () => {
                    const jsPDF = (await import("jspdf")).default;
                    const autoTable = (await import("jspdf-autotable")).default;
                    const doc = new jsPDF({ orientation: "landscape" });
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, "0");
                    const dd = String(today.getDate()).padStart(2, "0");
                    const fileName = `activity_log_${yyyy}-${mm}-${dd}.pdf`;
                    const headers = [
                      [
                        "Action",
                        "Old Value",
                        "New Value",
                        "Action Performed By",
                        "Approved/Rejected By",
                        "Approval Status",
                        "Date/Time (IST)",
                        "Comments",
                      ],
                    ];
                    const allowed = [
                      "edit",
                      "update",
                      "delete",
                      "add",
                      "create",
                    ];
                    const logs = (
                      Array.isArray(activityLogsSystem.activityLogs)
                        ? activityLogsSystem.activityLogs
                        : [activityLogsSystem.activityLogs]
                    ).filter((log: any) => {
                      const actionType = (log.action || "").toLowerCase();
                      return allowed.some((type) => actionType.includes(type));
                    });
                    const rows = logs.map((log: any) => {
                      let dateObj = new Date(log.dateTime || log.timestamp);
                      let istDate = new Date(
                        dateObj.getTime() + 5.5 * 60 * 60 * 1000
                      );
                      let day = String(istDate.getDate()).padStart(2, "0");
                      let month = String(istDate.getMonth() + 1).padStart(
                        2,
                        "0"
                      );
                      let year = String(istDate.getFullYear()).slice(-2);
                      let hours = String(istDate.getHours()).padStart(2, "0");
                      let minutes = String(istDate.getMinutes()).padStart(
                        2,
                        "0"
                      );
                      let formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;
                      return [
                        log.action || "-",
                        JSON.stringify(log.oldValue) || "-",
                        JSON.stringify(log.newValue) || "-",
                        log.approver || "-",
                        log.approvedOrRejectedBy || "-",
                        log.approvalStatus || "-",
                        log.dateTime || log.timestamp ? formattedDate : "-",
                        log.reason || log.comment || "-",
                      ];
                    });
                    doc.setFontSize(18);
                    doc.text("Activity Log", 14, 18);
                    autoTable(doc, {
                      head: headers,
                      body: rows,
                      startY: 28,
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
                      margin: { left: 14, right: 14 },
                      tableWidth: "auto",
                    });
                    doc.save(fileName);
                  }}
                >
                  <span
                    role="img"
                    aria-label="Export PDF"
                    style={{ fontSize: 18 }}
                  >
                    🗎
                  </span>
                  Export PDF
                </button>
                <button
                  style={{
                    background: "#e3e9f7",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 14px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 18,
                  }}
                  onClick={() => setShowActivityModal(false)}
                  aria-label="Close activity log"
                >
                  ×
                </button>
              </div>
            </div>
            <div
              style={{
                marginBottom: 12,
                fontWeight: 500,
                fontSize: 15,
                color: "#333",
              }}
            >
              <span>
                System:{" "}
                <span style={{ color: "#0b63ce" }}>
                  {activityLogsSystem.system_name ||
                    activityLogsSystem.host_name ||
                    "-"}
                </span>
              </span>
            </div>
            <div style={{ marginBottom: 10 }}>
              <input
                type="text"
                placeholder="Filter by Action Performed By"
                value={activityLogsSystem.approverFilter || ""}
                onChange={(e) => {
                  setActivityLogsSystem({
                    ...activityLogsSystem,
                    approverFilter: e.target.value,
                  });
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  fontSize: 14,
                  width: 220,
                  marginRight: 12,
                }}
              />
            </div>
            <div
              style={{
                overflowY: "auto",
                maxHeight: 350,
                minWidth: "100%",
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(11,99,206,0.08)",
              }}
            >
              <table className={styles.table} style={{ minWidth: 1100 }}>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Old Value</th>
                    <th>New Value</th>
                    <th>Action Performed By</th>
                    <th>Approved/Rejected By</th>
                    <th>Approval Status</th>
                    <th>Date/Time (IST)</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(activityLogsSystem.activityLogs)
                    ? activityLogsSystem.activityLogs
                    : [activityLogsSystem.activityLogs]
                  )
                    .filter((log: any) => {
                      const allowed = [
                        "edit",
                        "update",
                        "delete",
                        "add",
                        "create",
                      ];
                      const actionType = (log.action || "").toLowerCase();
                      return allowed.some((type) => actionType.includes(type));
                    })
                    .filter(
                      (log: any) =>
                        !activityLogsSystem.approverFilter ||
                        (log.approver || "")
                          .toLowerCase()
                          .includes(
                            activityLogsSystem.approverFilter.toLowerCase()
                          )
                    )
                    .map((log: any, i: number) => {
                      let dateObj = new Date(log.dateTime || log.timestamp);
                      let istDate = new Date(
                        dateObj.getTime() + 5.5 * 60 * 60 * 1000
                      );
                      let day = String(istDate.getDate()).padStart(2, "0");
                      let month = String(istDate.getMonth() + 1).padStart(
                        2,
                        "0"
                      );
                      let year = String(istDate.getFullYear()).slice(-2);
                      let hours = String(istDate.getHours()).padStart(2, "0");
                      let minutes = String(istDate.getMinutes()).padStart(
                        2,
                        "0"
                      );
                      let formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;
                      return (
                        <tr key={i}>
                          <td>{log.action || "-"}</td>
                          <td>{JSON.stringify(log.oldValue) || "-"}</td>
                          <td>{JSON.stringify(log.newValue) || "-"}</td>
                          <td>{log.approver || "-"}</td>
                          <td>{log.approvedOrRejectedBy || "-"}</td>
                          <td>{log.approvalStatus || "-"}</td>
                          <td>
                            {log.dateTime || log.timestamp
                              ? formattedDate
                              : "-"}
                          </td>
                          <td>{log.reason || log.comment || "-"}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default SystemInventoryMasterTable;
