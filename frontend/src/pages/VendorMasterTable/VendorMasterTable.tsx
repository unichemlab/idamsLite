import React, { useState, useContext } from "react";
import ProfileIconWithLogout from "../PlantMasterTable/ProfileIconWithLogout";
import { useNavigate } from "react-router-dom";
import styles from "./VendorMasterTable.module.css";
import { VendorContext, VendorUserWithId } from "../../context/VendorContext";
import { FaEdit, FaTrash } from "react-icons/fa";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import { FaRegClock } from "react-icons/fa6";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";

// Unified type for vendor users
export type VendorUser = {
  id?: string;
  fullName: string; // Vendor/OEM Firm Name (mandatory)
  comment: string; // Description (mandatory)
  status: string; // Status (mandatory)
  activityLogs?: any[];
};

const VendorMasterTable: React.FC = () => {
  const navigate = useNavigate();
  const { vendors, setVendors } = useContext(VendorContext);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [activeLogValue, setActiveLogValue] = useState<any[]>([]);
  // Filter state
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [filterColumn, setFilterColumn] = useState("fullName");
  const [filterValue, setFilterValue] = useState("");
  const [tempFilterColumn, setTempFilterColumn] = useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = useState(filterValue);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);

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

  // PDF Export for Main Table
  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text("Vendor Master Table", 14, 18);
    const headers = [["Vendor/OEM Firm Name", "Description", "Status"]];
    const rows = vendors.map((user) => [
      user.fullName,
      user.comment,
      user.status,
    ]);
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
        fillColor: [33, 118, 210],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      margin: { left: 14, right: 14 },
      tableWidth: "auto",
    });
    doc.save("vendor-master-table.pdf");
  };

  // PDF Export for Activity Log
  const handleExportActivityLogPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `VendorActivityLog_${yyyy}-${mm}-${dd}.pdf`;
    const headers = [
      [
        "Action",
        "Old Value",
        "New Value",
        "Approved By/Rejected By",
        "Date/Time (IST)",
        "Comments",
      ],
    ];
    const rows = (activeLogValue || []).map((log) => {
      let dateObj = new Date(log.dateTime || "");
      let istDate = new Date(dateObj.getTime() + 5.5 * 60 * 60 * 1000);
      let day = String(istDate.getDate()).padStart(2, "0");
      let month = String(istDate.getMonth() + 1).padStart(2, "0");
      let year = String(istDate.getFullYear()).slice(-2);
      let hours = String(istDate.getHours()).padStart(2, "0");
      let minutes = String(istDate.getMinutes()).padStart(2, "0");
      let formattedDate = log.dateTime
        ? `${day}/${month}/${year} ${hours}:${minutes}`
        : "-";
      return [
        log.action || "-",
        log.oldValue !== undefined ? log.oldValue : "-",
        log.newValue !== undefined ? log.newValue : "-",
        log.approver || log.user || "-",
        formattedDate,
        log.reason || "-",
      ];
    });
    doc.setFontSize(18);
    doc.text("Vendor Activity Log", 14, 18);
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

  const handleAdd = () => {
    navigate("/add-vendor", {
      state: {
        initialData: null,
        mode: "add",
      },
    });
  };

  const handleEdit = () => {
    if (selectedRow === null) return;
    const user = vendors[selectedRow];
    navigate(`/edit-vendor/${selectedRow}`, {
      state: {
        initialData: user,
        mode: "edit",
      },
    });
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const handleDelete = () => setShowDeleteModal(true);
  const confirmDelete = () => {
    if (selectedRow === null) return;
    const updated = [...vendors];
    updated.splice(selectedRow, 1);
    setVendors(updated);
    setSelectedRow(null);
    setShowDeleteModal(false);
  };

  const handleSelectRow = (idx: number) => {
    setSelectedRow(idx === selectedRow ? null : idx);
  };

  const handleShowActivityLog = (logs: any[]) => {
    setActiveLogValue(Array.isArray(logs) ? logs : []);
    setShowActivityLogModal(true);
  };

  // Filtering logic
  const filteredData = vendors.filter((user: VendorUserWithId) => {
    if (!filterValue.trim()) return true;
    const value = filterValue.toLowerCase();
    switch (filterColumn) {
      case "fullName":
        return user.fullName?.toLowerCase().includes(value);
      case "comment":
        return user.comment?.toLowerCase().includes(value);
      case "status":
        return user.status?.toLowerCase().includes(value);
      default:
        return true;
    }
  });

  return (
    <div className={styles.wrapper}>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Vendor Master</h2>
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
          <button className={styles.addUserBtn} onClick={handleAdd}>
            + Add New
          </button>
          <button
            className={styles.filterBtn}
            onClick={() => setShowFilterPopover((prev) => !prev)}
            type="button"
            aria-label="Filter vendors"
          >
            🔍 Filter
          </button>
          <button
            className={`${styles.btn} ${styles.editBtn}`}
            disabled={selectedRow === null}
            onClick={handleEdit}
            title="Edit selected vendor"
          >
            <FaEdit size={14} /> Edit
          </button>
          <button
            className={`${styles.btn} ${styles.deleteBtn}`}
            disabled={selectedRow === null}
            onClick={handleDelete}
            title="Delete selected vendor"
          >
            <FaTrash size={14} /> Delete
          </button>
          <ConfirmDeleteModal
            open={showDeleteModal}
            name={
              selectedRow !== null && vendors[selectedRow]
                ? vendors[selectedRow].fullName
                : "vendor"
            }
            onCancel={() => setShowDeleteModal(false)}
            onConfirm={confirmDelete}
          />
          <button
            className={`${styles.btn} ${styles.exportPdfBtn}`}
            onClick={handleDownloadPdf}
            aria-label="Export table to PDF"
            type="button"
            style={{ border: "1px solid #0b63ce" }}
          >
            <span role="img" aria-label="Export PDF" style={{ fontSize: 18 }}>
              🗎
            </span>
            PDF
          </button>
        </div>
      </div>
      <div className={styles.container}>
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
                    <option value="fullName">Vendor/OEM Firm Name</option>
                    <option value="comment">Description</option>
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
        <div className={styles.tableUser}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>Vendor/OEM Firm Name</th>
                <th>Description</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Activity Log</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: "center", color: "#888" }}
                  >
                    No vendors found.
                  </td>
                </tr>
              ) : (
                filteredData.map((user, idx) => (
                  <tr
                    key={user.id || idx}
                    style={{
                      background: selectedRow === idx ? "#f0f4ff" : undefined,
                    }}
                  >
                    <td>
                      <input
                        className={styles.radioInput}
                        type="radio"
                        checked={selectedRow === idx}
                        onChange={() => handleSelectRow(idx)}
                        aria-label={`Select ${user.fullName}`}
                      />
                    </td>
                    <td>{user.fullName}</td>
                    <td>{user.comment}</td>
                    <td>
                      <span
                        className={`${styles.status} ${
                          user.status === "Active"
                            ? styles.active
                            : styles.inactive
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className={styles.actionBtn}
                        title="View Activity Logs"
                        onClick={() =>
                          handleShowActivityLog(
                            Array.isArray(user.activityLogs)
                              ? user.activityLogs
                              : []
                          )
                        }
                      >
                        <FaRegClock size={17} style={{ color: "#0b63ce" }} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showActivityLogModal && (
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
                  onClick={handleExportActivityLogPdf}
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
                  onClick={() => setShowActivityLogModal(false)}
                  aria-label="Close activity log"
                >
                  ×
                </button>
              </div>
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
              <table className={styles.table} style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Old Value</th>
                    <th>New Value</th>
                    <th>Approved By/Rejected By</th>
                    <th>Date/Time (IST)</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLogValue.map((log, i) => {
                    let dateObj = new Date(log.dateTime || "");
                    let istDate = new Date(
                      dateObj.getTime() + 5.5 * 60 * 60 * 1000
                    );
                    let day = String(istDate.getDate()).padStart(2, "0");
                    let month = String(istDate.getMonth() + 1).padStart(2, "0");
                    let year = String(istDate.getFullYear()).slice(-2);
                    let hours = String(istDate.getHours()).padStart(2, "0");
                    let minutes = String(istDate.getMinutes()).padStart(2, "0");
                    let formattedDate = log.dateTime
                      ? `${day}/${month}/${year} ${hours}:${minutes}`
                      : "-";
                    return (
                      <tr key={i}>
                        <td>{log.action || "-"}</td>
                        <td>
                          {log.oldValue !== undefined ? log.oldValue : "-"}
                        </td>
                        <td>
                          {log.newValue !== undefined ? log.newValue : "-"}
                        </td>
                        <td>{log.approver || log.user || "-"}</td>
                        <td>{formattedDate}</td>
                        <td>{log.reason || "-"}</td>
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

export default VendorMasterTable;
