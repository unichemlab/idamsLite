import React from "react";
import ProfileIconWithLogout from "../PlantMasterTable/ProfileIconWithLogout";
import styles from "./ApplicationMasterTable.module.css";
import { FaRegClock } from "react-icons/fa6";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import { FaEdit, FaTrash } from "react-icons/fa";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import { useApplications } from "../../context/ApplicationsContext";

// Removed unused local applications array. Use context instead.

export default function ApplicationMasterTable() {
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  const [activityLogsApp, setActivityLogsApp] = React.useState<any>(null);
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showFilterPopover, setShowFilterPopover] = React.useState(false);
  const [filterColumn, setFilterColumn] = React.useState("name");
  const [filterValue, setFilterValue] = React.useState("");
  const [tempFilterColumn, setTempFilterColumn] = React.useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = React.useState(filterValue);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const { applications, setApplications } = useApplications();
  const navigate = require("react-router-dom").useNavigate();

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

  const filteredData = applications.filter(
    (
      app: import("../../context/ApplicationsContext").Application,
      idx: number
    ) => {
      if (!filterValue.trim()) return true;
      const value = filterValue.toLowerCase();
      switch (filterColumn) {
        case "name":
          return app.name?.toLowerCase().includes(value);
        case "version":
          return app.version?.toLowerCase().includes(value);
        case "equipmentId":
          return app.equipmentId?.toLowerCase().includes(value);
        case "computer":
          return app.computer?.toLowerCase().includes(value);
        case "plant":
          return app.plant?.toLowerCase().includes(value);
        case "status":
          return app.status?.toLowerCase().includes(value);
        default:
          return true;
      }
    }
  );

  const handleDelete = () => setShowDeleteModal(true);
  const confirmDelete = () => {
    if (selectedRow === null) return;
    const updated = [...applications];
    const app = updated[selectedRow];
    // Add activity log for delete
    if (app) {
      app.activityLogs = app.activityLogs || [];
      app.activityLogs.push({
        action: "Delete",
        oldValue: { ...app },
        newValue: "-",
        approver: localStorage.getItem("username") || "admin",
        dateTime: new Date().toISOString(),
      });
    }
    updated.splice(selectedRow, 1);
    setApplications(updated);
    setSelectedRow(null);
    setShowDeleteModal(false);
    navigate("/superadmin", { state: { activeTab: "application" } });
  };

  const handleExportPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `ApplicationMasterTable_${yyyy}-${mm}-${dd}.pdf`;
    const headers = [
      ["Application", "Version", "Equipment ID", "Computer", "Plant", "Status"],
    ];
    const rows = filteredData.map((app: any) => [
      app.name,
      app.version,
      app.equipmentId,
      app.computer,
      app.plant,
      app.status,
    ]);
    doc.setFontSize(18);
    doc.text("Application Master Table", 14, 18);
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
  return (
    <div>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Application Master</h2>
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
            onClick={() => navigate("/add-application")}
            aria-label="Add New"
          >
            + Add New
          </button>
          <button
            className={styles.filterBtn}
            onClick={() => setShowFilterPopover((prev) => !prev)}
            type="button"
            aria-label="Filter applications"
          >
            🔍 Filter
          </button>
          <button
            className={`${styles.btn} ${styles.editBtn}`}
            disabled={selectedRow === null}
            title="Edit Selected Application"
            onClick={() => {
              if (selectedRow !== null) {
                navigate(`/edit-application/${selectedRow}`, {
                  state: {
                    applicationData: filteredData[selectedRow],
                    applicationIdx: selectedRow,
                  },
                });
              }
            }}
          >
            <FaEdit size={14} /> Edit
          </button>
          <button
            className={`${styles.btn} ${styles.deleteBtn}`}
            disabled={selectedRow === null}
            title="Delete Selected Application"
            onClick={handleDelete}
          >
            <FaTrash size={14} /> Delete
          </button>
          <ConfirmDeleteModal
            open={showDeleteModal}
            name={
              selectedRow !== null && filteredData[selectedRow]
                ? filteredData[selectedRow].name
                : "application"
            }
            onCancel={() => setShowDeleteModal(false)}
            onConfirm={confirmDelete}
          />
          <button
            className={styles.exportPdfBtn}
            onClick={handleExportPDF}
            aria-label="Export table to PDF"
            type="button"
            style={{ border: "1px solid #0b63ce" }}
          >
            <span
              role="img"
              aria-label="Export PDF"
              style={{ fontSize: 18 }}
              className={styles.exportIcon}
            >
              🗎
            </span>
            PDF
          </button>
        </div>
      </div>
      {/* Filter Popover */}
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.controls}>
            {showFilterPopover && (
              <div className={styles.filterPopover} ref={popoverRef}>
                <div className={styles.filterPopoverHeader}>
                  Advanced Filter
                </div>
                <div className={styles.filterPopoverBody}>
                  <div className={styles.filterFieldRow}>
                    <label className={styles.filterLabel}>Column</label>
                    <select
                      className={styles.filterDropdown}
                      value={tempFilterColumn}
                      onChange={(e) => setTempFilterColumn(e.target.value)}
                    >
                      <option value="name">Name</option>
                      <option value="version">Version</option>
                      <option value="equipmentId">Equipment ID</option>
                      <option value="computer">Computer</option>
                      <option value="plant">Plant</option>
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
          {/* Table */}
          <div className={styles.tableUser}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>Application</th>
                  <th>Version</th>
                  <th>Equipment ID</th>
                  <th>Computer</th>
                  <th>Plant</th>
                  <th>Status</th>
                  <th>Activity Logs</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((app, idx) => (
                  <tr
                    key={idx}
                    style={{
                      background: selectedRow === idx ? "#f0f4ff" : undefined,
                    }}
                  >
                    <td>
                      <input
                        className={styles.radioInput}
                        type="radio"
                        checked={selectedRow === idx}
                        onChange={() => setSelectedRow(idx)}
                        aria-label={`Select ${app.name}`}
                      />
                    </td>
                    <td>{app.name}</td>
                    <td>{app.version}</td>
                    <td>{app.equipmentId}</td>
                    <td>{app.computer}</td>
                    <td>{app.plant}</td>
                    <td>
                      <span className={styles.status}>{app.status}</span>
                    </td>
                    <td>
                      <button
                        className={styles.actionBtn}
                        title="View Activity Logs"
                        onClick={() => {
                          setActivityLogsApp(app);
                          setShowActivityModal(true);
                        }}
                      >
                        <FaRegClock size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Activity Logs Modal */}
            {showActivityModal && activityLogsApp && (
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
                    <div style={{ fontWeight: 700, fontSize: 20 }}>
                      Activity Log
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <button
                        className={styles.exportPdfBtn}
                        onClick={async () => {
                          const jsPDF = (await import("jspdf")).default;
                          const autoTable = (await import("jspdf-autotable"))
                            .default;
                          const doc = new jsPDF({ orientation: "landscape" });
                          const today = new Date();
                          const yyyy = today.getFullYear();
                          const mm = String(today.getMonth() + 1).padStart(
                            2,
                            "0"
                          );
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
                          const allowed = ["edit", "delete", "add"];
                          const logs = (
                            Array.isArray(activityLogsApp.activityLogs)
                              ? activityLogsApp.activityLogs
                              : [activityLogsApp.activityLogs]
                          ).filter((log: any) => {
                            const actionType = (log.action || "").toLowerCase();
                            return allowed.some((type) =>
                              actionType.includes(type)
                            );
                          });
                          const rows = logs.map((log: any) => {
                            let dateObj = new Date(
                              log.dateTime || log.timestamp
                            );
                            let istDate = new Date(
                              dateObj.getTime() + 5.5 * 60 * 60 * 1000
                            );
                            let day = String(istDate.getDate()).padStart(
                              2,
                              "0"
                            );
                            let month = String(istDate.getMonth() + 1).padStart(
                              2,
                              "0"
                            );
                            let year = String(istDate.getFullYear()).slice(-2);
                            let hours = String(istDate.getHours()).padStart(
                              2,
                              "0"
                            );
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
                              log.dateTime || log.timestamp
                                ? formattedDate
                                : "-",
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
                            alternateRowStyles: {
                              fillColor: [240, 245, 255],
                            },
                            margin: { left: 14, right: 14 },
                            tableWidth: "auto",
                          });
                          doc.save(fileName);
                        }}
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
                      Application:{" "}
                      <span style={{ color: "#0b63ce" }}>
                        {activityLogsApp.name}
                      </span>
                    </span>
                    &nbsp; | &nbsp;
                    <span>
                      Version:{" "}
                      <span style={{ color: "#0b63ce" }}>
                        {activityLogsApp.version}
                      </span>
                    </span>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <input
                      type="text"
                      placeholder="Filter by Action Performed By"
                      value={activityLogsApp.approverFilter || ""}
                      onChange={(e) => {
                        setActivityLogsApp({
                          ...activityLogsApp,
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
                        {(Array.isArray(activityLogsApp.activityLogs)
                          ? activityLogsApp.activityLogs
                          : [activityLogsApp.activityLogs]
                        )
                          .filter((log: any) => {
                            const allowed = ["edit", "delete", "add"];
                            const actionType = (log.action || "").toLowerCase();
                            return allowed.some((type) =>
                              actionType.includes(type)
                            );
                          })
                          .filter(
                            (log: any) =>
                              !activityLogsApp.approverFilter ||
                              (log.approver || "")
                                .toLowerCase()
                                .includes(
                                  activityLogsApp.approverFilter.toLowerCase()
                                )
                          )
                          .map((log: any, i: number) => {
                            let dateObj = new Date(
                              log.dateTime || log.timestamp
                            );
                            let istDate = new Date(
                              dateObj.getTime() + 5.5 * 60 * 60 * 1000
                            );
                            let day = String(istDate.getDate()).padStart(
                              2,
                              "0"
                            );
                            let month = String(istDate.getMonth() + 1).padStart(
                              2,
                              "0"
                            );
                            let year = String(istDate.getFullYear()).slice(-2);
                            let hours = String(istDate.getHours()).padStart(
                              2,
                              "0"
                            );
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
      </div>
    </div>
  );
}
