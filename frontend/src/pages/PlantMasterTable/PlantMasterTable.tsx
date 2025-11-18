import React, { useEffect } from "react";
import ProfileIconWithLogout from "./ProfileIconWithLogout";
import { usePlantContext } from "../PlantMaster/PlantContext";
import styles from "../ApplicationMasterTable/ApplicationMasterTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import { FaEdit, FaTrash } from "react-icons/fa";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { FaRegClock } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { fetchPlantActivityLogs } from "../../utils/api";
import { useAbility } from "../../context/AbilityContext";
import { useAuth } from "../../context/AuthContext";

// Activity logs from backend

const PlantMasterTable: React.FC = () => {
  const { plants, deletePlant } = usePlantContext();
  // store selected plant by its DB id (more robust than an index)
  const [selectedPlantId, setSelectedPlantId] = React.useState<number | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 10;
  // activity logs are fetched on-demand and stored in activityPlant.logs
  const [approverFilter, setApproverFilter] = React.useState("");
  const [activityPlant, setActivityPlant] = React.useState<any>(null);
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
  const filteredData = plants.filter((plant) => {
    if (!filterValue.trim()) return true;
    const value = filterValue.toLowerCase();
    switch (filterColumn) {
      case "name":
        return plant.name?.toLowerCase().includes(value);
      case "description":
        return plant.description?.toLowerCase().includes(value);
      case "location":
        return plant.location?.toLowerCase().includes(value);
      case "status":
        return plant.status?.toLowerCase().includes(value);
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

  // currently selected plant object (found from filteredData by id)
  const selectedPlant =
    selectedPlantId !== null
      ? filteredData.find((p: any) => p.id === selectedPlantId) || null
      : null;

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  };

  // PDF Export Handler for Plant Table
  const handleExportPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const fileName = `PlantMaster_${today.toISOString().split("T")[0]}.pdf`;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMargin = 14;

    // ===== HEADER SECTION =====
    const headerHeight = 28;

    // Blue background bar
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

    // Title + Exported by on the same line
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titleX = pageMargin + logoWidth + 10;
    const titleY = headerHeight / 2 + 5;
    doc.text("Plant Master", titleX, titleY);

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

    // ===== TABLE SECTION =====
    const rows = filteredData.map((plant) => [
      plant.name ?? plant.plant_name ?? "-",
      plant.description ?? "-",
      plant.location ?? "-",
      plant.status ?? "-",
    ]);

    autoTable(doc, {
      head: [["Plant Name", "Description", "Location", "Status"]],
      body: rows,
      startY: headerHeight + 8,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: 80,
      },
      headStyles: {
        fillColor: [11, 99, 206],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      alternateRowStyles: {
        fillColor: [240, 245, 255],
      },
      margin: { left: pageMargin, right: pageMargin },
    });

    // ===== FOOTER SECTION =====
    const pageCount = (doc as any).internal.getNumberOfPages?.() || 1;

    // Light separator line above footer
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(
      pageMargin,
      pageHeight - 15,
      pageWidth - pageMargin,
      pageHeight - 15
    );

    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Unichem Laboratories", pageMargin, pageHeight - 10);
    doc.text(
      `Page 1 of ${pageCount}`,
      pageWidth - pageMargin - 25,
      pageHeight - 10
    );

    doc.save(fileName);
  };

  // PDF Export Handler for Activity Log
  const handleExportActivityPDF = async () => {
    if (!activityPlant) return;
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `PlantActivityLog_${yyyy}-${mm}-${dd}.pdf`;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMargin = 14;
    const headerHeight = 28;

    // ===== HEADER SECTION =====

    // Blue background bar
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

    // Title + Exported by on the same line
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titleX = pageMargin + logoWidth + 10;
    const titleY = headerHeight / 2 + 5;
    doc.text("Plant Activity Log", titleX, titleY);

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

    // ===== TABLE SECTION =====
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
    const rows = (activityPlant.logs || []).map((log: any) => {
      let oldVal: any = {};
      let newVal: any = {};
      try {
        oldVal = log.old_value ? JSON.parse(log.old_value) : {};
        newVal = log.new_value ? JSON.parse(log.new_value) : {};
      } catch {}
      return [
        log.action,
        `${oldVal.plant_name || ""} ${
          oldVal.description ? `(${oldVal.description})` : ""
        }`,
        `${newVal.plant_name || ""} ${
          newVal.description ? `(${newVal.description})` : ""
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
        fontSize: 8,
        cellPadding: 3,
        halign: "left",
        valign: "middle",
        textColor: 80,
      },
      headStyles: {
        fillColor: [11, 99, 206],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [240, 245, 255],
      },
      margin: { left: pageMargin, right: pageMargin },
      tableWidth: "auto",
    });

    // ===== FOOTER SECTION =====
    const pageCount = (doc as any).internal.getNumberOfPages?.() || 1;

    // Light separator line above footer
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(
      pageMargin,
      pageHeight - 15,
      pageWidth - pageMargin,
      pageHeight - 15
    );

    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Unichem Laboratories", pageMargin, pageHeight - 10);
    doc.text(
      `Page 1 of ${pageCount}`,
      pageWidth - pageMargin - 25,
      pageHeight - 10
    );

    doc.save(fileName);
  };

  // (Previously had a helper to filter activityLogs by plant name. We fetch
  // logs on-demand when opening the modal to avoid stale/empty data.)

  // Logs are fetched on-demand when opening the modal (see click handler)

  const confirmDelete = async () => {
    if (selectedPlantId === null) return;
    // find index in the original plants array expected by PlantContext.deletePlant
    const idx = plants.findIndex((p: any) => p.id === selectedPlantId);
    if (idx === -1) return;
    await deletePlant(idx);
    setSelectedPlantId(null);
    setShowDeleteModal(false);
  };

  return (
    <div>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Plant Master</h2>
        <div className={styles["header-icons"]}>
          <span className={styles["header-icon"]}>
            <NotificationsIcon fontSize="small" />
          </span>
          <span className={styles["header-icon"]}>
            <SettingsIcon fontSize="small" />
          </span>
          <ProfileIconWithLogout />
        </div>
      </header>
      <div className={styles.headerTopRow}>
        <div className={styles.actionHeaderRow}>
          <button
            className={styles.addUserBtn}
            onClick={() => navigate("/plants/add")}
            disabled={!can("create:plants")}
            title={
              !can("create:plants")
                ? "You don't have permission to add plants"
                : ""
            }
          >
            + Add New
          </button>
          <button
            className={styles.filterBtn}
            onClick={() => setShowFilterPopover((prev) => !prev)}
            type="button"
            aria-label="Filter plants"
          >
            🔍 Filter
          </button>
          <button
            className={`${styles.btn} ${styles.editBtn}`}
            onClick={() => {
              if (selectedPlant) {
                const id = selectedPlant.id;
                if (typeof id === "number") navigate(`/plants/edit/${id}`);
              }
            }}
            disabled={
              selectedPlantId === null ||
              !(
                selectedPlant &&
                can("update", "plants", { plantId: selectedPlant?.id })
              )
            }
            title={
              selectedPlantId === null
                ? "Select a plant to edit"
                : !can("update", "plants", { plantId: selectedPlant?.id })
                ? "You don't have permission to edit this plant"
                : ""
            }
          >
            <FaEdit size={14} /> Edit
          </button>
          <button
            className={`${styles.btn} ${styles.deleteBtn}`}
            disabled={
              selectedPlantId === null ||
              !(
                selectedPlant &&
                can("delete", "plants", { plantId: selectedPlant?.id })
              )
            }
            onClick={() => setShowDeleteModal(true)}
            title={
              selectedPlantId === null
                ? "Select a plant to delete"
                : !can("delete", "plants", { plantId: selectedPlant?.id })
                ? "You don't have permission to delete this plant"
                : ""
            }
          >
            <FaTrash size={14} /> Delete
          </button>
          <button
            className={`${styles.btn} ${styles.exportPdfBtn}`}
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
              <div className={styles.filterPopoverHeader}>Advanced Filter</div>
              <div className={styles.filterPopoverBody}>
                <div className={styles.filterFieldRow}>
                  <label className={styles.filterLabel}>Column</label>
                  <select
                    className={styles.filterDropdown}
                    value={tempFilterColumn}
                    onChange={(e) => setTempFilterColumn(e.target.value)}
                  >
                    <option value="name">Plant Name</option>
                    <option value="description">Description</option>
                    <option value="location">Location</option>
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
              <div className={styles.filterPopoverFooter}>
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

      <div className={styles.container}>
        <div
          style={{
            maxHeight: 380,
            overflowY: "auto",
            borderRadius: 8,
            boxShadow: "0 0 4px rgba(0, 0, 0, 0.05)",
            border: "1px solid #e2e8f0",
            marginTop: "11px",
            height: "100",
          }}
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>Plant Name</th>
                <th>Description</th>
                <th>Location</th>
                <th>Status</th>
                <th>Activity Logs</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((plant, index) => {
                const globalIndex = (currentPage - 1) * rowsPerPage + index;
                return (
                  <tr
                    key={globalIndex}
                    onClick={() => setSelectedPlantId(plant.id ?? null)}
                    style={{
                      background:
                        selectedPlantId === plant.id ? "#f0f4ff" : undefined,
                    }}
                  >
                    <td>
                      <input
                        type="radio"
                        className={styles.radioInput}
                        checked={selectedPlantId === plant.id}
                        onChange={() => setSelectedPlantId(plant.id ?? null)}
                      />
                    </td>
                    <td>{plant.name ?? plant.plant_name ?? ""}</td>
                    <td>{plant.description ?? ""}</td>
                    <td>{plant.location ?? ""}</td>
                    <td>
                      <span
                        className={
                          plant.status === "INACTIVE"
                            ? styles.statusInactive
                            : styles.status
                        }
                      >
                        {plant.status ?? ""}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{ cursor: "pointer", color: "#0b63ce" }}
                        title="View Activity Log"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const plantName = plant.name ?? "";
                          // Open modal immediately (keeps UI responsive)
                          setApproverFilter("");
                          setActivityPlant({ name: plantName, logs: [] });
                          setShowActivityModal(true);

                          // Fetch latest logs and populate modal once available
                          try {
                            const allLogs = await fetchPlantActivityLogs();
                            // filter by plant name (same logic as getPlantActivityLogs)
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
                                    oldVal.plant_name === plantName ||
                                    newVal.plant_name === plantName
                                  );
                                } catch {
                                  return false;
                                }
                              }
                            );
                            setActivityPlant({
                              name: plantName,
                              logs: filtered,
                            });
                          } catch (err) {
                            setActivityPlant({ name: plantName, logs: [] });
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
                name={selectedPlant ? selectedPlant.name ?? "plant" : "plant"}
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
      {showActivityModal && activityPlant && (
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
              zIndex: "2",
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
                Plant:{" "}
                <span style={{ color: "#0b63ce" }}>{activityPlant.name}</span>
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
                    <th>Action</th>
                    <th>Old Value</th>
                    <th>New Value</th>
                    <th>Action Performed By</th>
                    <th>Approval Status</th>
                    <th>Date/Time (IST)</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {(activityPlant.logs || []).map((log: any, i: number) => {
                    let oldVal: any = {};
                    let newVal: any = {};
                    try {
                      oldVal = log.old_value ? JSON.parse(log.old_value) : {};
                      newVal = log.new_value ? JSON.parse(log.new_value) : {};
                    } catch {}
                    return (
                      <tr key={i}>
                        <td>{log.action}</td>
                        <td>
                          {oldVal.plant_name || ""}{" "}
                          {oldVal.description ? `(${oldVal.description})` : ""}
                        </td>
                        <td>
                          {newVal.plant_name || ""}{" "}
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
  );
};

export default PlantMasterTable;
