import React, { useEffect } from "react";
import ProfileIconWithLogout from "./ProfileIconWithLogout";
import { usePlantContext } from "../PlantMaster/PlantContext";
import styles from "../ApplicationMasterTable/ApplicationMasterTable.module.css";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import { FaEdit, FaTrash } from "react-icons/fa";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaRegClock } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { fetchPlantActivityLogs } from "../../utils/api";

// Activity logs from backend

const PlantMasterTable: React.FC = () => {
  const { plants, deletePlant } = usePlantContext();
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  const [activityLogs, setActivityLogs] = React.useState<any[]>([]);
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

  // PDF Export Handler for Plant Table
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `PlantMaster_${yyyy}-${mm}-${dd}.pdf`;
    const headers = [["Plant Name", "Description", "Location", "Status"]];
    const rows = filteredData.map((plant) => [
      plant.name ?? plant.plant_name ?? "",
      plant.description ?? "",
      plant.location ?? "",
      plant.status ?? "",
    ]);
    doc.setFontSize(18);
    doc.text("Plant Master", 14, 18);
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
      alternateRowStyles: {
        fillColor: [240, 245, 255],
      },
      margin: { left: 14, right: 14 },
      tableWidth: "auto",
    });
    doc.save(fileName);
  };

  // PDF Export Handler for Activity Log
  const handleExportActivityPDF = () => {
    if (!activityPlant) return;
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `PlantActivityLog_${yyyy}-${mm}-${dd}.pdf`;
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
    doc.setFontSize(18);
    doc.text("Plant Activity Log", 14, 18);
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
      alternateRowStyles: {
        fillColor: [240, 245, 255],
      },
      margin: { left: 14, right: 14 },
      tableWidth: "auto",
    });
    doc.save(fileName);
  };

  // Get activity logs for a specific plant (by plant name)
  const getPlantActivityLogs = (plantName: string) => {
    // Filter logs by plant name (from new/old value JSON)
    return activityLogs.filter((log) => {
      try {
        const oldVal = log.old_value ? JSON.parse(log.old_value) : {};
        const newVal = log.new_value ? JSON.parse(log.new_value) : {};
        return (
          oldVal.plant_name === plantName || newVal.plant_name === plantName
        );
      } catch {
        return false;
      }
    });
  };

  // Fetch logs from backend on modal open
  useEffect(() => {
    if (showActivityModal) {
      fetchPlantActivityLogs()
        .then(setActivityLogs)
        .catch(() => setActivityLogs([]));
    }
  }, [showActivityModal]);

  const confirmDelete = async () => {
    if (selectedRow === null) return;
    await deletePlant(selectedRow);
    setSelectedRow(null);
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
              if (selectedRow !== null) navigate(`/plants/edit/${selectedRow}`);
            }}
            disabled={selectedRow === null}
          >
            <FaEdit size={14} /> Edit
          </button>
          <button
            className={`${styles.btn} ${styles.deleteBtn}`}
            disabled={selectedRow === null}
            onClick={() => setShowDeleteModal(true)}
            title="Delete selected plant"
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
            marginTop: "26px",
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
              {filteredData.map((plant, index) => (
                <tr
                  key={index}
                  onClick={() => setSelectedRow(index)}
                  style={{
                    background: selectedRow === index ? "#f0f4ff" : undefined,
                  }}
                >
                  <td>
                    <input
                      type="radio"
                      className={styles.radioInput}
                      checked={selectedRow === index}
                      onChange={() => setSelectedRow(index)}
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
                        setActivityPlant({
                          name: plant.name ?? "",
                          logs: getPlantActivityLogs(plant.name ?? ""),
                        });
                        setApproverFilter("");
                        setShowActivityModal(true);
                      }}
                    >
                      <FaRegClock size={18} />
                    </span>
                  </td>
                </tr>
              ))}
              <ConfirmDeleteModal
                open={showDeleteModal}
                name={
                  selectedRow !== null && filteredData[selectedRow]
                    ? filteredData[selectedRow].name ?? "plant"
                    : "plant"
                }
                onCancel={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
              />
            </tbody>
          </table>
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
