import React, { useState } from "react";
import ProfileIconWithLogout from "../PlantMasterTable/ProfileIconWithLogout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import styles from "./RoleMasterTable.module.css";
import { FaEdit, FaTrash, FaRegClock } from "react-icons/fa";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate } from "react-router-dom";
import { useRoles, Role } from "../../RoleMaster/RolesContext";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";

export default function RoleMasterTable() {
  const { roles, deleteRole } = useRoles();
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterColumn, setFilterColumn] = useState<
    "name" | "description" | "status" | "activityLogs"
  >("name");
  const [filterValue, setFilterValue] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const navigate = useNavigate();

  // Filtered roles based on filterColumn and filterValue
  const filteredRoles = roles.filter((role) => {
    if (!filterValue) return true;
    const value = (role[filterColumn] || "").toString().toLowerCase();
    return value.includes(filterValue.toLowerCase());
  });

  // Row selection handler
  const handleSelectRow = (idx: number) => {
    setSelectedRow(idx);
  };

  // Delete role handler
  const handleDeleteRole = () => {
    if (selectedRow !== null && roles[selectedRow]) {
      setShowDeleteModal(true);
    }
  };

  // Confirm delete handler
  const confirmDeleteRole = async () => {
    if (selectedRow !== null && roles[selectedRow]) {
      await deleteRole(roles[selectedRow].id!);
      setShowDeleteModal(false);
      setSelectedRow(null);
    }
  };

  // PDF Download Handler for main table
  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const headers = [["Role Name", "Description", "Status"]];
    const rows = filteredRoles.map((role) => [
      role.name,
      role.description,
      role.status,
    ]);
    autoTable(doc, {
      head: headers,
      body: rows,
    });
    doc.save("role_master.pdf");
  };

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
              if (selectedRow !== null)
                navigate(`/edit-role/${roles[selectedRow].id}`);
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
                            // Placeholder for future activity log modal
                            // setActiveLogValue(role.activityLogs || []);
                            // setShowActivityLogModal(true);
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
      {/* ActivityLogModal removed for backend integration */}
    </div>
  );
}
