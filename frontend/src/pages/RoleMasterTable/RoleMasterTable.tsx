import React, { useState } from "react";
import ProfileIconWithLogout from "../PlantMasterTable/ProfileIconWithLogout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import styles from "./RoleMasterTable.module.css";
import { FaEdit, FaTrash, FaTimes, FaRegClock } from "react-icons/fa";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate } from "react-router-dom";
import { useRoles, Role, RoleActivityLog } from "../../RoleMaster/RolesContext";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";

// ===== Activity Logs Modal Component =====
function ActivityLogModal({
  open,
  logs,
  onClose,
}: {
  open: boolean;
  logs: RoleActivityLog[];
  onClose: () => void;
}) {
  if (!open) return null;
  // Only show edit, delete, add actions
  const allowed = ["edit", "delete", "add"];
  const filteredLogs = logs.filter((log) =>
    allowed.some((type) => (log.action || "").toLowerCase().includes(type))
  );
  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `role_activity_log_${yyyy}-${mm}-${dd}.pdf`;
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
    const rows = filteredLogs.map((log) => {
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
        log.approver || "-",
        formattedDate,
        log.reason || "-",
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
  };
  return (
    <div className={styles.activityLogModalOverlay}>
      <div className={styles.activityLogModal}>
        <div className={styles.activityLogModalHeader}>
          <span style={{ fontWeight: 700, fontSize: 20 }}>Activity Log</span>
          <button
            className={styles.exportPdfBtn}
            onClick={handleExportPdf}
            aria-label="Export activity log to PDF"
            type="button"
            style={{ marginRight: 8 }}
          >
            <span role="img" aria-label="Export PDF" style={{ fontSize: 18 }}>
              🗎
            </span>
            Export PDF
          </button>
          <button
            className={styles.activityLogModalClose}
            onClick={onClose}
            title="Close"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>
        <div className={styles.activityLogModalBody}>
          {filteredLogs.length > 0 ? (
            <table
              className={styles.activityLogTable}
              style={{ minWidth: 900 }}
            >
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
                {filteredLogs.map((log, i) => {
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
                      <td>{log.oldValue !== undefined ? log.oldValue : "-"}</td>
                      <td>{log.newValue !== undefined ? log.newValue : "-"}</td>
                      <td>{log.approver || "-"}</td>
                      <td>{formattedDate}</td>
                      <td>{log.reason || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ color: "#888", fontStyle: "italic" }}>
              No activity logs available.
            </div>
          )}
        </div>
      </div>
      <div className={styles.activityLogModalBackdrop} onClick={onClose} />
    </div>
  );
}

export default function RoleMasterTable() {
  const { roles, setRoles } = useRoles();
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterColumn, setFilterColumn] = useState<
    "name" | "description" | "status" | "activityLogs"
  >("name");
  const [filterValue, setFilterValue] = useState("");
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [activeLogValue, setActiveLogValue] = useState<RoleActivityLog[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const navigate = useNavigate();

  // PDF Download Handler for main table
  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const headers = [["Role Name", "Description", "Status"]];
    const rows = filteredRoles.map((role) => [
      role.name,
      role.description,
      role.status,
    ]);
    doc.setFontSize(18);
    doc.text("Role Master Table", 14, 18);
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
    doc.save("role-master-table.pdf");
  };

  //removed due to henadle cannot be edited in r0le master
  const handleDeleteRole = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteRole = () => {
    if (selectedRow === null) return;
    const updated = [...roles];
    const deletedRole = updated[selectedRow];
    deletedRole.activityLogs.push({
      action: "Delete",
      oldValue: `Status: ${deletedRole.status}`,
      newValue: "Status: Deleted",
      approver: "Admin",
      dateTime: new Date().toISOString(),
      reason: "Role deleted",
    });
    updated.splice(selectedRow, 1);
    setRoles(updated);
    setSelectedRow(null);
    setShowDeleteModal(false);
  };

  const handleSelectRow = (idx: number) => {
    setSelectedRow(idx === selectedRow ? null : idx);
  };

  const filteredRoles = roles.filter((role: Role) => {
    if (!filterValue) return true;
    const val = filterValue.toLowerCase();
    if (filterColumn === "name") return role.name.toLowerCase().includes(val);
    if (filterColumn === "description")
      return role.description.toLowerCase().includes(val);
    if (filterColumn === "status")
      return role.status.toLowerCase().includes(val);
    if (filterColumn === "activityLogs") {
      // Only show edit, delete, add actions
      const allowed = ["edit", "delete", "add"];
      return role.activityLogs.some(
        (log) =>
          allowed.some((type) =>
            (log.action || "").toLowerCase().includes(type)
          ) &&
          ((log.action && log.action.toLowerCase().includes(val)) ||
            (log.oldValue && log.oldValue.toLowerCase().includes(val)) ||
            (log.newValue && log.newValue.toLowerCase().includes(val)) ||
            (log.approver && log.approver.toLowerCase().includes(val)) ||
            (log.reason && log.reason.toLowerCase().includes(val)))
      );
    }
    return true;
  });

  return (
    <div>
      {/* Top header */}
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Role Master</h2>
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

      {/* Table controls */}
      <div className={styles.headerTopRow}>
        <div className={styles.actionHeaderRow}>
          <button
            className={styles.addUserBtn}
            onClick={() => navigate("/add-role")}
          >
            + Add New
          </button>
          <button
            className={styles.filterBtn}
            onClick={() => setShowFilterPanel(true)}
          >
            🔍 Filter
          </button>
          <button
            className={`${styles.btn} ${styles.editBtn}`}
            disabled={selectedRow === null}
            onClick={() => {
              if (selectedRow !== null) navigate(`/edit-role/${selectedRow}`);
            }}
            title={
              selectedRow === null
                ? "Select a role to edit"
                : "Edit role (role name cannot be changed)"
            }
          >
            <FaEdit size={14} /> Edit
          </button>
          <button
            className={`${styles.btn} ${styles.deleteBtn}`}
            disabled={selectedRow === null}
            onClick={handleDeleteRole}
            title="Delete selected role"
          >
            <FaTrash size={14} /> Delete
          </button>
          <ConfirmDeleteModal
            open={showDeleteModal}
            name={
              selectedRow !== null && roles[selectedRow]
                ? roles[selectedRow].name
                : "role"
            }
            onCancel={() => setShowDeleteModal(false)}
            onConfirm={confirmDeleteRole}
          />
          <button
            className={`${styles.btn} ${styles.exportPdfBtn}`}
            onClick={handleDownloadPdf}
            aria-label="Export table to PDF"
            type="button"
          >
            <span role="img" aria-label="Export PDF" style={{ fontSize: 18 }}>
              🗎
            </span>
            PDF
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.controls}>
            {showFilterPanel && (
              <div className={styles.advancedFilterOverlay}>
                <div className={styles.filterPopover}>
                  <div className={styles.advancedFilterHeader}>
                    <span>Advanced Filter</span>
                  </div>
                  <div className={styles.advancedFilterRow}>
                    <label>Column</label>
                    <select
                      value={filterColumn}
                      onChange={(e) =>
                        setFilterColumn(
                          e.target.value as
                            | "name"
                            | "description"
                            | "status"
                            | "activityLogs"
                        )
                      }
                    >
                      <option value="name">Name</option>
                      <option value="description">Description</option>
                      <option value="status">Status</option>
                      <option value="activityLogs">Activity Logs</option>
                    </select>
                  </div>
                  <div className={styles.advancedFilterRow}>
                    <label>Value</label>
                    <input
                      type="text"
                      placeholder={`Enter ${filterColumn}`}
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                    />
                  </div>
                  <div className="filterActions">
                    <button
                      className={styles.saveBtn}
                      onClick={() => setShowFilterPanel(false)}
                      type="button"
                    >
                      Apply
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={() => {
                        setFilterValue("");
                        setShowFilterPanel(false);
                      }}
                      type="button"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div
                  className={styles.advancedFilterBackdrop}
                  onClick={() => setShowFilterPanel(false)}
                />
              </div>
            )}
          </div>
          {/* Table */}
          <div className={styles.tableUser}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>Role Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Activity Logs</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ textAlign: "center", color: "#888" }}
                    >
                      No roles found.
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role: Role, idx: number) => (
                    <tr key={idx}>
                      <td>
                        <input
                          className={styles.radioInput}
                          type="radio"
                          checked={selectedRow === idx}
                          onChange={() => handleSelectRow(idx)}
                          aria-label={`Select ${role.name}`}
                        />
                      </td>
                      <td>{role.name}</td>
                      <td>{role.description}</td>
                      <td>
                        <span
                          className={`${styles.status} ${
                            role.status === "ACTIVE"
                              ? styles.active
                              : styles.inactive
                          }`}
                        >
                          {role.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={styles.activityLogIcon}
                          title="View Activity Logs"
                          onClick={() => {
                            setActiveLogValue(role.activityLogs);
                            setShowActivityLogModal(true);
                          }}
                          tabIndex={0}
                        >
                          <FaRegClock size={17} />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ActivityLogModal
        open={showActivityLogModal}
        logs={activeLogValue}
        onClose={() => setShowActivityLogModal(false)}
      />
    </div>
  );
}
