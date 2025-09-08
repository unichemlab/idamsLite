import React, { useState, useEffect, useRef } from "react";
import ProfileIconWithLogout from "../PlantMasterTable/ProfileIconWithLogout";
import { useNavigate } from "react-router-dom";
import styles from "./UserMasterTable.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import { FaRegClock } from "react-icons/fa6";
import { useUserContext } from "../../context/UserContext";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";

const UserMasterTable = () => {
  const navigate = useNavigate();
  const { users, deleteUser } = useUserContext();

  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLogsUser, setActivityLogsUser] = useState<any>(null);

  // Filtering logic state/hooks
  const [filterColumn, setFilterColumn] = useState("fullName");
  const [filterValue, setFilterValue] = useState("");

  // Filter popover state
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [tempFilterColumn, setTempFilterColumn] = useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = useState(filterValue);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close popover on outside click (using ref for robustness)
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

  const filteredUsers = users.filter((user: any) => {
    if (!filterValue.trim()) return true;
    const value = filterValue.toLowerCase();
    switch (filterColumn) {
      case "fullName":
        return user.fullName?.toLowerCase().includes(value);
      case "email":
        return user.email?.toLowerCase().includes(value);
      case "empCode":
        return user.empCode?.toLowerCase().includes(value);
      case "department":
        return user.department?.toLowerCase().includes(value);
      case "plants":
        return user.plants?.some((plant: string) =>
          plant.toLowerCase().includes(value)
        );
      case "status":
        return user.status?.toLowerCase().includes(value);
      default:
        return true;
    }
  });

  // PDF Export Handler
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `UserMasterTable_${yyyy}-${mm}-${dd}.pdf`;

    // Table headers
    const headers = [
      [
        "User Name",
        "Email",
        "Employee Code",
        "Department",
        "Assigned Plants",
        "Status",
        "Central Master",
      ],
    ];
    // Table rows
    const rows = filteredUsers.map((user: any) => [
      user.fullName,
      user.email,
      user.empCode,
      user.department,
      Array.isArray(user.plants) ? user.plants.join(", ") : "-",
      user.status,
      Array.isArray(user.centralMaster) && user.centralMaster.length > 0
        ? user.centralMaster.join(", ")
        : "-",
    ]);

    // Title
    doc.setFontSize(18);
    doc.text("User Master Table", 14, 18);
    // Table
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
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar: Uncomment and provide navItems if needed */}
      {/* <Sidebar open={true} onToggle={() => {}} navItems={navItems} onLogout={() => {}} /> */}
      <div style={{ flex: 1 }}>
        <header className={styles["main-header"]}>
          <h2 className={styles["header-title"]}>User Master</h2>
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
              onClick={() => navigate("/add-user")}
              aria-label="Add New"
            >
              + Add New
            </button>
            <button
              className={styles.filterBtn}
              onClick={() => setShowFilterPopover((prev) => !prev)}
              type="button"
              aria-label="Filter users"
            >
              🔍 Filter
            </button>
            <button
              className={`${styles.btn} ${styles.editBtn}`}
              disabled={selectedRow === null}
              title="Edit Selected User"
              onClick={() => {
                if (selectedRow !== null) {
                  navigate(`/edit-user/${selectedRow}`, {
                    state: {
                      userData: filteredUsers[selectedRow],
                      userIdx: selectedRow,
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
              title="Delete Selected User"
              onClick={() => setShowDeleteModal(true)}
            >
              {" "}
              <FaTrash size={14} /> Delete
            </button>

            <ConfirmDeleteModal
              open={showDeleteModal}
              name={
                selectedRow !== null && filteredUsers[selectedRow]
                  ? filteredUsers[selectedRow].fullName
                  : "user"
              }
              onCancel={() => setShowDeleteModal(false)}
              onConfirm={() => {
                if (selectedRow !== null) {
                  deleteUser(selectedRow);
                  setSelectedRow(null);
                }
                setShowDeleteModal(false);
              }}
            />
            <button
              className={styles.exportPdfBtn}
              onClick={handleExportPDF}
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
        {/* Professional Filter Button with Popover */}
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
                        <option value="fullName">Name</option>
                        <option value="email">Email</option>
                        <option value="empCode">Employee Code</option>
                        <option value="department">Department</option>
                        <option value="plants">Assigned Plants</option>
                        <option value="status">Status</option>
                      </select>
                    </div>
                    <div className={styles.filterFieldRow}>
                      <label className={styles.filterLabel}>Value</label>
                      <input
                        className={styles.filterInput}
                        type="text"
                        placeholder={`Enter ${
                          tempFilterColumn === "fullName"
                            ? "Name"
                            : tempFilterColumn.charAt(0).toUpperCase() +
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
              <table className={styles.userTable}>
                <thead>
                  <tr>
                    <th></th>
                    <th>User Name</th>
                    <th>Email</th>
                    <th>Employee Code</th>
                    <th>Department</th>
                    <th>Assigned Plants</th>

                    <th>Central Master</th>
                    <th>Status</th>
                    <th>Activity Logs</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user: any, idx: number) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="radio"
                          checked={selectedRow === idx}
                          onChange={() => setSelectedRow(idx)}
                          className={styles.radioInput}
                          aria-label={`Select ${user.fullName}`}
                        />
                      </td>
                      <td>
                        <strong>{user.fullName}</strong>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.empCode}</td>
                      <td>{user.department}</td>
                      <td>
                        {(user.plants || []).map((plant: string, i: number) => (
                          <span key={i} className={styles.plantBadge}>
                            {plant}
                          </span>
                        ))}
                      </td>

                      <td>
                        {Array.isArray(user.centralMaster) &&
                        user.centralMaster.length > 0 ? (
                          user.centralMaster.map(
                            (mod: string, index: number) => (
                              <span key={index} className={styles.plantBadge}>
                                {mod}
                              </span>
                            )
                          )
                        ) : (
                          <span className={styles.inactive}>-</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={
                            user.status === "Active"
                              ? styles.activeBadge
                              : styles.inactiveBadge
                          }
                        >
                          {user.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className={styles.actionBtn}
                          title="View Activity Logs"
                          onClick={() => {
                            setActivityLogsUser(user);
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
            </div>
          </div>
        </div>
        {/* Activity Logs Modal */}
        {showActivityModal && activityLogsUser && (
          <div
            className={styles.panelOverlay}
            style={{ zIndex: 2000, background: "rgba(0,0,0,0.18)" }}
          >
            <div
              className={styles.panelWrapper}
              style={{
                maxWidth: 1400,
                width: "72%",
                left: "54%",
                transform: "translateX(-50%)",
                position: "fixed",
                top: 193,
                borderRadius: 16,
                boxShadow: "0 8px 32px rgba(11,99,206,0.18)",
                padding: "24px 18px 18px 18px",
                display: "flex",
                flexDirection: "column",
                height: "max-content",
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    className={styles.exportPdfBtn}
                    onClick={() => {
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
                      const allowed = ["edit", "delete", "add"];
                      const logs = (
                        Array.isArray(activityLogsUser.activityLogs)
                          ? activityLogsUser.activityLogs
                          : [activityLogsUser.activityLogs]
                      )
                        .filter((log: any) => {
                          const actionType = (log.action || "").toLowerCase();
                          return allowed.some((type) =>
                            actionType.includes(type)
                          );
                        })
                        .filter(
                          (log: any) =>
                            !activityLogsUser.approverFilter ||
                            (log.approver || "")
                              .toLowerCase()
                              .includes(
                                activityLogsUser.approverFilter.toLowerCase()
                              )
                        );
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
                          log.oldValue !== undefined ? log.oldValue : "-",
                          log.newValue !== undefined ? log.newValue : "-",
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
                  Username:{" "}
                  <span style={{ color: "#0b63ce" }}>
                    {activityLogsUser.fullName}
                  </span>
                </span>
                &nbsp; | &nbsp;
                <span>
                  Emp ID:{" "}
                  <span style={{ color: "#0b63ce" }}>
                    {activityLogsUser.empCode}
                  </span>
                </span>
              </div>
              <div style={{ marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Filter by Action Performed By"
                  value={activityLogsUser.approverFilter || ""}
                  onChange={(e) => {
                    setActivityLogsUser({
                      ...activityLogsUser,
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
                <table className={styles.userTable} style={{ minWidth: 1100 }}>
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
                    {(Array.isArray(activityLogsUser.activityLogs)
                      ? activityLogsUser.activityLogs
                      : [activityLogsUser.activityLogs]
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
                          !activityLogsUser.approverFilter ||
                          (log.approver || "")
                            .toLowerCase()
                            .includes(
                              activityLogsUser.approverFilter.toLowerCase()
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
                            <td>
                              {log.oldValue !== undefined ? log.oldValue : "-"}
                            </td>
                            <td>
                              {log.newValue !== undefined ? log.newValue : "-"}
                            </td>
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

export default UserMasterTable;
