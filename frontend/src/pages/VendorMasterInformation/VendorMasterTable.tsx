import React, { useEffect, useCallback } from "react";
import { useVendorContext } from "../VendorMaster/VendorContext";
import styles from "../Plant/PlantMasterTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import { PermissionGuard, PermissionButton } from "../../components/Common/PermissionComponents";
import { PERMISSIONS } from "../../constants/permissions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaRegClock } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { useAbility } from "../../context/AbilityContext";
import { fetchVendorActivityLogs } from "../../utils/api";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { useAuth } from "../../context/AuthContext";
import AppHeader from "../../components/Common/AppHeader";
import { usePermissions } from "../../context/PermissionContext";

// Activity logs from backend

const VendorMasterTable: React.FC = () => {
  const { vendors, deleteVendor } = useVendorContext();
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 10;
  // activity logs fetched per-click; we don't keep a global cache here
  const [approverFilter, setApproverFilter] = React.useState("");
  const [activityVendor, setActivityVendor] = React.useState<any>(null);
  // Filter state
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

  useEffect(() => {
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




  // Filtering logic
  const filteredData = vendors.filter((vendor) => {
    if (!filterValue.trim()) return true;
    const value = filterValue.toLowerCase();
    switch (filterColumn) {
      case "name":
        return vendor.name?.toLowerCase().includes(value);
      case "description":
        return vendor.description?.toLowerCase().includes(value);
      case "status":
        return vendor.status?.toLowerCase().includes(value);
      default:
        return true;
    }
  });
console.log("filterData vendor",filteredData);
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

  // PDF Export Handler for Vendor Table
  const handleExportPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const fileName = `VendorMaster_${today.toISOString().split("T")[0]}.pdf`;

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
    doc.text("Vendor Master", titleX, titleY);

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
    const rows = filteredData.map((vendor) => [
      vendor.name ?? vendor.vendor_name ?? "-",
      // vendor.code ?? vendor.vendor_code ?? "-",
      vendor.description ?? "-",
      vendor.status ?? "-",
    ]);

    autoTable(doc, {
      head: [["Vendor Name", "Description", "Status"]],
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

  // PDF Export Handler for Activity Log
  const handleExportActivityPDF = async () => {
    if (!activityVendor) return;
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `VendorActivityLog_${yyyy}-${mm}-${dd}.pdf`;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageMargin = 14;
    const headerHeight = 28;

    // Header
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

    // Title + exported by
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titleX = pageMargin + logoWidth + 10;
    const titleY = headerHeight / 2 + 5;
    doc.text("Vendor Activity Log", titleX, titleY);

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

    const headers = [
      [
        "Action",
        "Old Value",
        "New Value",
        "Action Performed By",
        "Approval Status",
        "Date/Time (IST)",
        "Comments",
      ],
    ];
    const rows = (activityVendor.logs || []).map((log: any) => {
      let oldVal: any = {};
      let newVal: any = {};
      try {
        oldVal = log.old_value ? JSON.parse(log.old_value) : {};
        newVal = log.new_value ? JSON.parse(log.new_value) : {};
      } catch { }
      return [
        log.action,
        `${oldVal.vendor_name || ""} ${oldVal.description ? `(${oldVal.description})` : ""
        }`,
        `${newVal.vendor_name || ""} ${newVal.description ? `(${newVal.description})` : ""
        }`,
        log.action_performed_by ?? "",
        log.approve_status ?? "",
        log.date_time_ist ? new Date(log.date_time_ist).toLocaleString() : "",
        log.comments ?? "",
      ];
    });

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

    doc.save(fileName);
  };

  // Helper to filter logs by vendor name
  const filterLogsForVendor = (logs: any[], vendorName: string) => {
    return logs.filter((log) => {
      try {
        const oldVal = log.old_value ? JSON.parse(log.old_value) : {};
        const newVal = log.new_value ? JSON.parse(log.new_value) : {};
        return (
          oldVal.vendor_name === vendorName || newVal.vendor_name === vendorName
        );
      } catch {
        return false;
      }
    });
  };

  const confirmDelete = async () => {
    if (selectedRow === null) return;
    await deleteVendor(selectedRow);
    setSelectedRow(null);
    setShowDeleteModal(false);
  };


  const handleEdit = useCallback(() => {
    if (selectedRow === null) return;

  const app = filteredData.find(v => v.id === selectedRow);

  if (!app) {
    alert("Selected vendor not found. Please refresh.");
    return;
  }
    console.log("application",app,selectedRow);
    // if (!hasPermission(PERMISSIONS.APPLICATION.UPDATE, app.plant_location_id)) {
    //   alert('You do not have permission to edit applications for this plant');
    //   return;
    // }

    navigate(`/vendor-information/edit/${app.id}`, {
      state: { applicationData: app, applicationIdx: selectedRow },
    });
    //navigate(`/vendor-information/edit/${selectedRow}`);
  }, [selectedRow, filteredData, navigate]);

  const handleDelete = useCallback(() => {
    if (selectedRow === null) return;
    const app = filteredData.find(v => v.id === selectedRow)
;

    if (!hasPermission(PERMISSIONS.APPLICATION.DELETE)) {
      alert('You do not have permission to delete applications for this plant');
      return;
    }

    setShowDeleteModal(true);
  }, [selectedRow, filteredData, hasPermission]);

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Vendor Information Management" />
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

            <PermissionGuard permission={PERMISSIONS.VENDOR.CREATE}>
              <button
                className={styles.addBtn}
                onClick={() => navigate("/vendor-information/add")}
              >
                + Add New
              </button>
            </PermissionGuard>
            <button
              className={styles.filterBtn}
              onClick={() => setShowFilterPopover((prev) => !prev)}
              type="button"
              aria-label="Filter vendors"
            >
              🔍 Filter
            </button>
            <PermissionButton
              permission={PERMISSIONS.VENDOR.UPDATE}
              className={styles.editBtn}
              disabled={selectedRow === null}
              onClick={handleEdit}
            >
              <FaEdit size={14} /> Edit
            </PermissionButton>

            <PermissionButton
              permission={PERMISSIONS.VENDOR.DELETE}
              className={styles.deleteBtn}
              disabled={selectedRow === null}
              onClick={handleDelete}
            >
              <FaTrash size={14} /> Delete
            </PermissionButton>

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
                      <option value="name">Vendor Name</option>
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
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2>Vendor Information Records</h2>
            <span className={styles.recordCount}>{filteredData.length} Records</span>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>Vendor Name</th>
                   <th>Vendor Code</th> 
                  <th>Description</th>
                  <th>Status</th>
                  <th>Activity Logs</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((vendor:any, index:number) => {
                  console.log("vendor",vendor,index);
                  const globalIndex = (currentPage - 1) * rowsPerPage + index;
                  return (
                    
                    <tr
                      key={vendor.id}
                     className={selectedRow === vendor.id ? styles.selectedRow : ""}
                    >
                      <td>
                        <input
                          type="radio"
                          checked={selectedRow === vendor.id}
                          onChange={() => setSelectedRow(vendor.id)}
                        />
                      </td>
                      <td>{vendor.name ?? vendor.vendor_name ?? ""}</td>
                       <td>{vendor.code ?? vendor.vendor_code ?? ""}</td>
                      <td>{vendor.description ?? ""}</td>
                      <td>
                        <span
                          className={
                            vendor.status === "INACTIVE"
                              ? styles.statusInactive
                              : styles.status
                          }
                        >
                          {vendor.status ?? ""}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{ cursor: "pointer", color: "#0b63ce" }}
                          title="View Activity Log"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setApproverFilter("");
                            try {
                              const logs = await fetchVendorActivityLogs();
                              const filtered = filterLogsForVendor(
                                logs,
                                vendor.name ?? ""
                              );
                              setActivityVendor({
                                name: vendor.name ?? "",
                                logs: filtered,
                              });
                            } catch (err) {
                              setActivityVendor({
                                name: vendor.name ?? "",
                                logs: [],
                              });
                            }
                            setShowActivityModal(true);
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
                    selectedRow !== null && filteredData.find(v => v.id === selectedRow)
                      ? filteredData.find(v => v.id === selectedRow)?.name ?? "vendor"
                      : "vendor"
                  }
                  onCancel={() => setShowDeleteModal(false)}
                  onConfirm={confirmDelete}
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
        {showActivityModal && activityVendor && (
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
                    onClick={handleExportActivityPDF}
                    aria-label="Export activity log to PDF"
                    type="button"
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
                  Vendor:{" "}
                  <span style={{ color: "#0b63ce" }}>{activityVendor.name}</span>
                </span>
              </div>
              <div style={{ marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Filter by Approved/Rejected By"
                  value={approverFilter}
                  onChange={(e) => setApproverFilter(e.target.value)}
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
                      <th>Actions</th>
                      <th>Old Value</th>
                      <th>New Value</th>
                      <th>Action Performed By</th>
                      <th>Approval Status</th>
                      <th>Date/Time (IST)</th>
                      <th>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activityVendor.logs || []).map((log: any, i: number) => {
                      let oldVal: any = {};
                      let newVal: any = {};
                      try {
                        oldVal = log.old_value ? JSON.parse(log.old_value) : {};
                        newVal = log.new_value ? JSON.parse(log.new_value) : {};
                      } catch { }
                      return (
                        <tr key={i}>
                          <td>{log.action}</td>
                          <td>
                            {oldVal.vendor_name || ""}{" "}
                            {oldVal.description ? `(${oldVal.description})` : ""}
                          </td>
                          <td>
                            {newVal.vendor_name || ""}{" "}
                            {newVal.description ? `(${newVal.description})` : ""}
                          </td>
                          <td>{log.action_performed_by ?? ""}</td>
                          <td>{log.approve_status ?? ""}</td>
                          <td>
                            {log.date_time_ist
                              ? new Date(log.date_time_ist).toLocaleString()
                              : ""}
                          </td>
                          <td>{log.comments ?? ""}</td>
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

export default VendorMasterTable;
