import React from "react";
import ProfileIconWithLogout from "../PlantMasterTable/ProfileIconWithLogout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import styles from "./RoleMasterTable.module.css";
import { FaEdit, FaTrash, FaRegClock } from "react-icons/fa";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate } from "react-router-dom";
import { useRoles } from "../../RoleMaster/RolesContext";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";

interface RoleMasterTableProps {
  onAdd?: () => void;
  onEdit?: (id: number) => void;
}

export default function RoleMasterTable({ onAdd, onEdit }: RoleMasterTableProps) {
  const { roles, deleteRole } = useRoles();
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  // Removed unused activityLogs and setActivityLogs
  const [activityRole, setActivityRole] = React.useState<any>(null);
  const [showFilterPopover, setShowFilterPopover] = React.useState(false);
  const [filterColumn, setFilterColumn] = React.useState("name");
  const [filterValue, setFilterValue] = React.useState("");
  const [tempFilterColumn, setTempFilterColumn] = React.useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = React.useState(filterValue);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // Filtering logic
  const filteredData = roles.filter((role) => {
    if (!filterValue.trim()) return true;
    const value = filterValue.toLowerCase();
    switch (filterColumn) {
      case "name":
        return role.name?.toLowerCase().includes(value);
      case "description":
        return role.description?.toLowerCase().includes(value);
      case "status":
        return role.status?.toLowerCase().includes(value);
      default:
        return true;
    }
  });

  // PDF Export Handler for Role Table
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `RoleMaster_${yyyy}-${mm}-${dd}.pdf`;
    const headers = [["Role Name", "Description", "Status"]];
    const rows = filteredData.map((role) => [
      role.name ?? "",
      role.description ?? "",
      role.status ?? "",
    ]);
    doc.setFontSize(18);
    doc.text("Role Master", 14, 18);
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

  // Row selection handler
  // Removed unused handleSelectRow

  // Delete role handler
  const handleDeleteRole = () => {
    if (selectedRow !== null && filteredData[selectedRow]) {
      setShowDeleteModal(true);
    }
  };

  // Confirm delete handler
  const confirmDeleteRole = async () => {
    if (
      selectedRow !== null &&
      filteredData[selectedRow] &&
      filteredData[selectedRow].id !== undefined
    ) {
      await deleteRole(Number(filteredData[selectedRow].id));
      setShowDeleteModal(false);
      setSelectedRow(null);
    }
  };

  function setApproverFilter(arg0: string) {
    throw new Error("Function not implemented.");
  }

  return (
    <div>
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
      <div className={styles.headerTopRow}>
        <div className={styles.actionHeaderRow}>
          <button
            className={styles.addUserBtn}
            onClick={() => {
              if (onAdd) {
                onAdd();
              } else {
                navigate("/roles/add");
              }
            }}
          >
            + Add New
          </button>
          <button
            className={styles.filterBtn}
            onClick={() => setShowFilterPopover((prev) => !prev)}
            type="button"
            aria-label="Filter roles"
          >
            🔍 Filter
          </button>
          <button
            className={`${styles.btn} ${styles.editBtn}`}
            onClick={() => {
              if (selectedRow !== null && filteredData[selectedRow]) {
                const id = filteredData[selectedRow].id;
                if (onEdit && typeof id === 'number') {
                  onEdit(id);
                } else if (typeof id === 'number') {
                  navigate(`/roles/edit/${id}`);
                }
              }
            }}
            disabled={selectedRow === null}
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
                    <option value="name">Role Name</option>
                    <option value="description">Description</option>
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
                <th>Role Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Activity Logs</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((role, index) => (
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
                  <td>{role.name ?? ""}</td>
                  <td>{role.description ?? ""}</td>
                  <td>
                    <span
                      className={
                        role.status === "INACTIVE"
                          ? styles.statusInactive
                          : styles.status
                      }
                    >
                      {role.status ?? ""}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{ cursor: "pointer", color: "#0b63ce" }}
                      title="View Activity Log"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setActivityRole({
                          name: role.name ?? "",
                          logs: role.activityLogs ?? [],
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
                    ? filteredData[selectedRow].name ?? "role"
                    : "role"
                }
                onCancel={() => setShowDeleteModal(false)}
                onConfirm={confirmDeleteRole}
              />
            </tbody>
          </table>
        </div>
      </div>
      {/* Activity Log Modal */}
      {showActivityModal && activityRole && (
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
            {/* Activity log content here */}
            <h3 style={{ marginBottom: 12 }}>Activity Logs for {activityRole.name}</h3>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              <table style={{ width: "100%", fontSize: 14 }}>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Old Value</th>
                    <th>New Value</th>
                    <th>Approver</th>
                    <th>Date/Time</th>
                  </tr>
                </thead>
                <tbody>
                  {activityRole.logs && activityRole.logs.length > 0 ? (
                    activityRole.logs.map((log: any, idx: number) => (
                      <tr key={idx}>
                        <td>{log.action}</td>
                        <td>{log.oldValue}</td>
                        <td>{log.newValue}</td>
                        <td>{log.approver}</td>
                        <td>{log.dateTime ? new Date(log.dateTime).toLocaleString() : ""}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "#888" }}>
                        No activity logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button
              style={{ marginTop: 18, alignSelf: "flex-end" }}
              className={styles.cancelBtn}
              onClick={() => setShowActivityModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
