import React, { useState, useEffect, useRef } from "react";
import { AbilityContext } from "../../context/AbilityContext";
import ProfileIconWithLogout from "../PlantMasterTable/ProfileIconWithLogout";
import { useNavigate } from "react-router-dom";
import styles from "./UserMasterTable.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import { FaRegClock } from "react-icons/fa6";
import { useUserContext } from "../../context/UserContext";
import { useDepartmentContext } from "../DepartmentMaster/DepartmentContext";
import { useAbility } from "../../context/AbilityContext";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";

const UserMasterTable = () => {
  const navigate = useNavigate();
  const ability = useAbility();
  const { users, deleteUser, currentUser } = useUserContext();
  const { departments } = useDepartmentContext();

  // Helper to format permissions for display
  const formatPermissions = (user: any) => {
    if (!user.permissions) return "No permissions";
    try {
      const perms = user.permissions || {};
      const modules = Object.keys(perms);
      if (modules.length === 0) return "No modules";

      // Show first module's permissions + count
      const firstModule = modules[0];
      const actions = [];
      if (perms[firstModule].can_view) actions.push("view");
      if (perms[firstModule].can_add) actions.push("add");
      if (perms[firstModule].can_edit) actions.push("edit");
      if (perms[firstModule].can_delete) actions.push("delete");

      const more = modules.length > 1 ? ` (+${modules.length - 1} more)` : "";
      return `${firstModule}: ${actions.join(", ")}${more}`;
    } catch (err) {
      return "Error parsing permissions";
    }
  };

  // Helper: is super admin (role_id 1)
  let isSuperAdmin = false;
  if (currentUser) {
    if (Array.isArray(currentUser.role_id)) {
      isSuperAdmin = currentUser.role_id.includes(1);
    } else if (typeof currentUser.role_id === "number") {
      isSuperAdmin = currentUser.role_id === 1;
    }
  }

  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLogsUser, setActivityLogsUser] = useState<any>(null);

  // Filtering logic state/hooks
  const [filterColumn, setFilterColumn] = useState("employee_name");
  const [filterValue, setFilterValue] = useState("");

  // Filter popover state
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [tempFilterColumn, setTempFilterColumn] = useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = useState(filterValue);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close popover on outside click
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

  // Filter logic for user_master fields
  const filteredUsers = users.filter((user: any) => {
    if (!filterValue.trim()) return true;
    const value = filterValue.toLowerCase();
    return (
      (user.employee_name &&
        user.employee_name.toLowerCase().includes(value)) ||
      (user.email && user.email.toLowerCase().includes(value)) ||
      (user.employee_code &&
        user.employee_code.toLowerCase().includes(value)) ||
      (user.employee_id &&
        String(user.employee_id).toLowerCase().includes(value))
    );
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue]);

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // PDF Export Handler
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `UserMasterTable_${yyyy}-${mm}-${dd}.pdf`;

    const headers = [
      [
        "User Name",
        "Email",
        "Employee Code",
        "Department",
        "Location",
        "Designation",
        "Status",
        "Company",
        "Permissions",
      ],
    ];

    const rows = filteredUsers.map((user: any) => [
      user.employee_name,
      user.email,
      user.employee_code,
      user.department,
      user.location,
      user.designation,
      user.status,
      user.company,
      formatPermissions(user),
    ]);

    doc.setFontSize(18);
    doc.text("User Master Table", 14, 18);
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
    <AbilityContext.Provider value={ability}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
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
            <div className={styles.headerRowFlex}>
              <form
                className={styles.searchForm}
                onSubmit={(e) => {
                  e.preventDefault();
                }}
                autoComplete="off"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  minWidth: 0,
                }}
              >
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Search here"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  aria-label="Search by name, email, code, id"
                  style={{ minWidth: 0, flex: 1 }}
                />
                <button
                  className={styles.searchBtn}
                  type="submit"
                  tabIndex={-1}
                  aria-label="Search"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      stroke="#a14b8c"
                      strokeWidth="2"
                    />
                    <line
                      x1="16.0607"
                      y1="16.4749"
                      x2="20"
                      y2="20"
                      stroke="#a14b8c"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </form>
              <div
                className={styles.actionHeaderRow}
                style={{ marginLeft: "auto" }}
              >
                {(isSuperAdmin || ability.can("create", "USER_MASTER")) && (
                  <button
                    className={styles.addUserBtn}
                    onClick={() => navigate("/add-user")}
                    aria-label="Add New"
                  >
                    + Add New
                  </button>
                )}
                <button
                  className={styles.filterBtn}
                  onClick={() => setShowFilterPopover((prev) => !prev)}
                  type="button"
                  aria-label="Filter users"
                >
                  🔍 Filter
                </button>
                {(isSuperAdmin || ability.can("update", "USER_MASTER")) && (
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
                )}
                {(isSuperAdmin || ability.can("delete", "USER_MASTER")) && (
                  <button
                    className={`${styles.btn} ${styles.deleteBtn}`}
                    disabled={selectedRow === null}
                    title="Delete Selected User"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <FaTrash size={14} /> Delete
                  </button>
                )}
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
                  <span
                    role="img"
                    aria-label="Export PDF"
                    style={{ fontSize: 18 }}
                  >
                    🗎
                  </span>
                  PDF
                </button>
              </div>
            </div>
          </div>

          <div className={styles.wrapper}>
            <div>
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
                          <option value="employee_name">Name</option>
                          <option value="email">Email</option>
                          <option value="employee_code">Employee Code</option>
                          <option value="department">Department</option>
                          <option value="location">Location</option>
                          <option value="designation">Designation</option>
                          <option value="status">Status</option>
                        </select>
                      </div>
                      <div className={styles.filterFieldRow}>
                        <label className={styles.filterLabel}>Value</label>
                        <input
                          className={styles.filterInput}
                          type="text"
                          placeholder={`Enter ${
                            tempFilterColumn === "employee_name"
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

              <div
                style={{
                  maxHeight: 380,
                  overflowY: "auto",
                  borderRadius: 8,
                  boxShadow: "0 0 4px rgba(0, 0, 0, 0.05)",
                  border: "1px solid #e2e8f0",
                  marginTop: "11px",
                  height: "100",
                  maxWidth: "1030px",
                  marginLeft: "18px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <table className={styles.userTable}>
                  <thead>
                    <tr>
                      <th></th>
                      <th>User Name</th>
                      <th>Email</th>
                      <th>Employee Code</th>
                      <th>Department</th>
                      <th>Location</th>
                      <th>Designation</th>
                      <th>Status</th>
                      <th>Company</th>
                      <th>Permissions</th>
                      <th>Activity Logs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user: any, idx: number) => {
                      const globalIdx = (currentPage - 1) * rowsPerPage + idx;
                      let deptName = "";
                      if (
                        user.department &&
                        String(user.department).trim() &&
                        String(user.department) !== "-"
                      ) {
                        const parsed = Number(user.department);
                        if (
                          !Number.isNaN(parsed) &&
                          departments &&
                          departments.length > 0
                        ) {
                          const found = departments.find(
                            (d) => d.id === parsed
                          );
                          deptName = found
                            ? found.name ||
                              found.department_name ||
                              String(parsed)
                            : String(parsed);
                        } else {
                          deptName = String(user.department);
                        }
                      } else if (
                        user.department_id !== undefined &&
                        user.department_id !== null
                      ) {
                        const idNum = Number(user.department_id);
                        if (
                          !Number.isNaN(idNum) &&
                          departments &&
                          departments.length > 0
                        ) {
                          const found = departments.find((d) => d.id === idNum);
                          deptName = found
                            ? found.name ||
                              found.department_name ||
                              String(idNum)
                            : String(idNum);
                        } else {
                          deptName = String(user.department_id);
                        }
                      }

                      return (
                        <tr
                          key={globalIdx}
                          className={
                            selectedRow === globalIdx ? styles.selectedRow : ""
                          }
                          onClick={() => setSelectedRow(globalIdx)}
                        >
                          <td>
                            <input
                              type="radio"
                              checked={selectedRow === globalIdx}
                              onChange={() => setSelectedRow(globalIdx)}
                              className={styles.radioInput}
                              aria-label={`Select ${user.employee_name}`}
                            />
                          </td>
                          <td>
                            <strong>{user.employee_name}</strong>
                          </td>
                          <td>{user.email}</td>
                          <td>{user.employee_code}</td>
                          <td>{deptName}</td>
                          <td>{user.location}</td>
                          <td>{user.designation}</td>
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
                          <td>{user.company}</td>
                          <td>{formatPermissions(user)}</td>
                          <td>
                            <button
                              className={styles.actionBtn}
                              title="View Activity Logs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivityLogsUser(user);
                                setShowActivityModal(true);
                              }}
                            >
                              <FaRegClock size={17} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className={styles.pagination}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={
                      currentPage === 1
                        ? styles.disabledPageBtn
                        : styles.pageBtn
                    }
                  >
                    Previous
                  </button>
                  <span className={styles.pageInfo}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className={
                      currentPage === totalPages
                        ? styles.disabledPageBtn
                        : styles.pageBtn
                    }
                  >
                    Next
                  </button>
                </div>
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
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <button
                      className={styles.exportPdfBtn}
                      onClick={() => {
                        const doc = new jsPDF({ orientation: "landscape" });
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
                          let formattedDate = istDate.toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          });
                          return [
                            log.action || "-",
                            log.oldValue !== undefined ? log.oldValue : "-",
                            log.newValue !== undefined ? log.newValue : "-",
                            log.approver || "-",
                            log.approvedOrRejectedBy || "-",
                            log.approvalStatus || "-",
                            formattedDate,
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

                        const today = new Date();
                        const fileName = `activity_log_${today.getFullYear()}-${String(
                          today.getMonth() + 1
                        ).padStart(2, "0")}-${String(today.getDate()).padStart(
                          2,
                          "0"
                        )}.pdf`;
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
                      {activityLogsUser.employee_name}
                    </span>
                  </span>
                  &nbsp; | &nbsp;
                  <span>
                    Emp ID:{" "}
                    <span style={{ color: "#0b63ce" }}>
                      {activityLogsUser.employee_code}
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
                  <table
                    className={styles.userTable}
                    style={{ minWidth: 1100 }}
                  >
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
                          let formattedDate = istDate.toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          });

                          return (
                            <tr key={i}>
                              <td>{log.action || "-"}</td>
                              <td>
                                {log.oldValue !== undefined
                                  ? log.oldValue
                                  : "-"}
                              </td>
                              <td>
                                {log.newValue !== undefined
                                  ? log.newValue
                                  : "-"}
                              </td>
                              <td>{log.approver || "-"}</td>
                              <td>{log.approvedOrRejectedBy || "-"}</td>
                              <td>{log.approvalStatus || "-"}</td>
                              <td>{formattedDate}</td>
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
    </AbilityContext.Provider>
  );
};

export default UserMasterTable;
