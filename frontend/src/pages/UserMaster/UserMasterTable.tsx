import React, { useState, useEffect, useRef } from "react";
import { AbilityContext } from "../../context/AbilityContext";
import { useNavigate } from "react-router-dom";
import styles from "../Plant/PlantMasterTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import { FaRegClock } from "react-icons/fa6";
import { useUserContext } from "../../context/UserContext";
import { useDepartmentContext } from "../DepartmentMaster/DepartmentContext";
import { useAbility } from "../../context/AbilityContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fetchActivityLog } from "../../utils/api";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import unichemLogoBase64 from "../../assets/unichemLogoBase64";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import AppHeader from "../../components/Common/AppHeader";

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

  // Helper to render values safely (avoid passing objects directly to JSX)
  const renderLogValue = (val: any) => {
    try {
      if (val === null || val === undefined) return "-";
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    } catch (e) {
      return String(val);
    }
  };

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

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  };

  // PDF Export Handler (updated to match RoleMasterTable design)
  const handleExportPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const fileName = `UserMaster_${today.toISOString().split("T")[0]}.pdf`;

    // --- HEADER BAR ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
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

    // Title + Exported by on the same line
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titleX = pageMargin + logoWidth + 10;
    const titleY = headerHeight / 2 + 5;
    doc.text("User Master", titleX, titleY);

    doc.setFontSize(9);
    doc.setTextColor(220, 230, 245);
    const exportedByName =
      (currentUser && (currentUser.name || currentUser.username)) ||
      "Unknown User";
    const exportedText = `Exported by: ${exportedByName}  On: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
    const textWidth = doc.getTextWidth(exportedText);
    doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);

    doc.setDrawColor(0, 82, 155);
    doc.setLineWidth(0.5);
    doc.line(0, headerHeight, pageWidth, headerHeight);

    // --- TABLE ---
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

    const rows = filteredUsers.map((u: any) => [
      u.employee_name ?? "-",
      u.email ?? "-",
      u.employee_code ?? "-",
      // prefer resolved department name where available
      (() => {
        if (u.department && typeof u.department === "string")
          return u.department;
        return u.department ?? "-";
      })(),
      u.location ?? "-",
      u.designation ?? "-",
      u.status ?? "-",
      u.company ?? "-",
      formatPermissions(u),
    ]);

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

    // --- FOOTER ---
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

  return (
    <AbilityContext.Provider value={ability}>
      <div className={styles.pageWrapper}>
        <AppHeader title="User Master Management" />
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

              {(isSuperAdmin || ability.can("create:users")) && (
                <button
                  className={styles.addBtn}
                  onClick={() => navigate("/user-master/add")}
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
              {(isSuperAdmin || ability.can("update:users")) && (
                <button
                  className={`${styles.btn} ${styles.editBtn}`}
                  disabled={selectedRow === null}
                  title="Edit Selected User"
                  onClick={() => {
                    if (selectedRow !== null) {
                      navigate(`/user-master/edit/${selectedRow}`, {
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
              {(isSuperAdmin || ability.can("delete:users")) && (
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
                className={styles.exportBtn}
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
                      placeholder={`Enter ${tempFilterColumn === "employee_name"
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

          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h2>User Master Records</h2>
              <span className={styles.recordCount}>{filteredUsers.length} Records</span>
            </div>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}></th>
                    <th>User Name</th>
                    <th>Email</th>
                    <th>Employee Code</th>
                    <th>Department</th>
                    <th>Location</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th>Company</th>
                    <th>Permissions</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Activity</th>
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
                            onClick={async (e) => {
                              e.stopPropagation();
                              // Open modal immediately for responsiveness
                              setActivityLogsUser({
                                ...user,
                                activityLogs: [],
                              });
                              setShowActivityModal(true);

                              try {
                                const allLogs = await fetchActivityLog();
                                const filtered = (allLogs || [])
                                  .filter((log: any) => {
                                    // match canonical table_name/record_id
                                    if (
                                      log.table_name === "user_master" &&
                                      String(log.record_id) ===
                                      String(user.id)
                                    )
                                      return true;
                                    // legacy details-based rows: check tableName or employee_code/employeeId
                                    if (
                                      log.details &&
                                      typeof log.details === "string"
                                    ) {
                                      try {
                                        const parsed = JSON.parse(
                                          log.details
                                        );
                                        if (
                                          parsed.tableName ===
                                          "user_master" &&
                                          (String(parsed.recordId) ===
                                            String(user.id) ||
                                            String(parsed.employee_code) ===
                                            String(user.employee_code) ||
                                            String(parsed.employeeId) ===
                                            String(user.employee_id))
                                        )
                                          return true;
                                      } catch (e) {
                                        // ignore parse errors
                                      }
                                    }
                                    return false;
                                  })
                                  .map((r: any) => {
                                    // normalize row to UI-friendly fields
                                    let parsedDetails = null;
                                    if (
                                      r.details &&
                                      typeof r.details === "string"
                                    ) {
                                      try {
                                        parsedDetails = JSON.parse(r.details);
                                      } catch {
                                        parsedDetails = null;
                                      }
                                    }
                                    const parseMaybeJson = (v: any) => {
                                      if (!v && v !== "" && v !== 0)
                                        return null;
                                      if (typeof v === "string") {
                                        try {
                                          return JSON.parse(v);
                                        } catch {
                                          return v;
                                        }
                                      }
                                      return v;
                                    };
                                    const oldVal = parseMaybeJson(
                                      r.old_value ||
                                      (parsedDetails &&
                                        parsedDetails.old_value)
                                    );
                                    const newVal = parseMaybeJson(
                                      r.new_value ||
                                      (parsedDetails &&
                                        parsedDetails.new_value)
                                    );
                                    const action =
                                      r.action ||
                                      (parsedDetails &&
                                        parsedDetails.action) ||
                                      "";
                                    const approver =
                                      r.action_performed_by ||
                                      r.user_id ||
                                      (parsedDetails &&
                                        (parsedDetails.userId ||
                                          parsedDetails.approver)) ||
                                      null;
                                    const dateTime =
                                      r.date_time_ist ||
                                      r.timestamp ||
                                      r.created_at ||
                                      (parsedDetails &&
                                        parsedDetails.dateTime) ||
                                      null;
                                    const comments =
                                      r.comments ||
                                      (parsedDetails &&
                                        (parsedDetails.comments ||
                                          parsedDetails.reason)) ||
                                      null;
                                    return {
                                      action,
                                      oldValue: oldVal,
                                      newValue: newVal,
                                      approver,
                                      approvedOrRejectedBy:
                                        r.approved_by || null,
                                      approvalStatus:
                                        r.approve_status ||
                                        r.approval_status ||
                                        null,
                                      dateTime,
                                      reason: comments,
                                      _raw: r,
                                    };
                                  });

                                setActivityLogsUser({
                                  ...user,
                                  activityLogs: filtered,
                                });
                              } catch (err) {
                                // fallback to empty logs
                                setActivityLogsUser({
                                  ...user,
                                  activityLogs: [],
                                });
                              }
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

              <div className={paginationStyles.pagination}>
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
                <span className={paginationStyles.pageInfo}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
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
                    onClick={async () => {
                      if (!activityLogsUser) return;
                      const doc = new jsPDF({ orientation: "landscape" });
                      const today = new Date();
                      const yyyy = today.getFullYear();
                      const mm = String(today.getMonth() + 1).padStart(
                        2,
                        "0"
                      );
                      const dd = String(today.getDate()).padStart(2, "0");
                      const fileName = `ActivityLog_${yyyy}-${mm}-${dd}.pdf`;

                      const pageWidth = doc.internal.pageSize.getWidth();
                      const pageHeight = doc.internal.pageSize.getHeight();
                      const pageMargin = 14;
                      const headerHeight = 28;

                      // Header bar
                      doc.setFillColor(0, 82, 155);
                      doc.rect(0, 0, pageWidth, headerHeight, "F");

                      // Logo (prefer PNG import, fallback to base64)
                      let logoWidth = 0;
                      let logoHeight = 0;
                      try {
                        if (login_headTitle2) {
                          const img = await loadImage(login_headTitle2);
                          const maxLogoHeight = headerHeight * 0.6;
                          const scale = maxLogoHeight / img.height;
                          logoWidth = img.width * scale;
                          logoHeight = img.height * scale;
                          const logoY = headerHeight / 2 - logoHeight / 2;
                          doc.addImage(
                            img,
                            "PNG",
                            pageMargin,
                            logoY,
                            logoWidth,
                            logoHeight
                          );
                        } else if (
                          unichemLogoBase64 &&
                          unichemLogoBase64.startsWith("data:image")
                        ) {
                          logoWidth = 50;
                          logoHeight = 18;
                          const logoY = headerHeight / 2 - logoHeight / 2;
                          doc.addImage(
                            unichemLogoBase64,
                            "PNG",
                            pageMargin,
                            logoY,
                            logoWidth,
                            logoHeight
                          );
                        }
                      } catch (e) {
                        console.warn("Logo load failed", e);
                      }

                      // Title + exported by
                      doc.setFontSize(16);
                      doc.setTextColor(255, 255, 255);
                      const titleX = pageMargin + logoWidth + 10;
                      const titleY = headerHeight / 2 + 5;
                      doc.text("Activity Log", titleX, titleY);

                      doc.setFontSize(9);
                      doc.setTextColor(220, 230, 245);
                      const exportedByName =
                        (currentUser &&
                          (currentUser.name || currentUser.username)) ||
                        "Unknown User";
                      const exportedText = `Exported by: ${exportedByName}  On: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
                      const textWidth = doc.getTextWidth(exportedText);
                      doc.text(
                        exportedText,
                        pageWidth - pageMargin - textWidth,
                        titleY
                      );

                      doc.setDrawColor(0, 82, 155);
                      doc.setLineWidth(0.5);
                      doc.line(0, headerHeight, pageWidth, headerHeight);

                      // Table rows
                      const allowed = [
                        "edit",
                        "update",
                        "delete",
                        "add",
                        "create",
                      ];
                      const rawLogs = Array.isArray(
                        activityLogsUser.activityLogs
                      )
                        ? activityLogsUser.activityLogs
                        : [activityLogsUser.activityLogs];
                      const logs = rawLogs
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
                                (
                                  activityLogsUser.approverFilter || ""
                                ).toLowerCase()
                              )
                        );

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

                      const rows = logs.map((log: any) => {
                        let dateObj = new Date(
                          log.dateTime ||
                          log.timestamp ||
                          log.created_at ||
                          Date.now()
                        );
                        if (Number.isNaN(dateObj.getTime()))
                          dateObj = new Date();
                        const istDate = new Date(
                          dateObj.getTime() + 5.5 * 60 * 60 * 1000
                        );
                        const formattedDate = istDate.toLocaleString();
                        return [
                          log.action || "-",
                          renderLogValue(log.oldValue),
                          renderLogValue(log.newValue),
                          log.approver || log.action_performed_by || "-",
                          log.approve_status || log.approvalStatus || "-",
                          formattedDate,
                          log.reason || log.comments || log.comment || "-",
                        ];
                      });

                      autoTable(doc, {
                        head: headers,
                        body: rows,
                        startY: headerHeight + 8,
                        styles: {
                          fontSize: 9,
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
                        alternateRowStyles: { fillColor: [240, 245, 255] },
                        margin: { left: pageMargin, right: pageMargin },
                        tableWidth: "auto",
                      });

                      // Footer: page count and footers per page
                      const pageCount =
                        (doc as any).internal.getNumberOfPages?.() || 1;
                      doc.setFontSize(8);
                      doc.setTextColor(100, 100, 100);
                      for (let i = 1; i <= pageCount; i++) {
                        doc.setPage(i);
                        doc.setDrawColor(200, 200, 200);
                        doc.setLineWidth(0.3);
                        doc.line(
                          pageMargin,
                          pageHeight - 15,
                          pageWidth - pageMargin,
                          pageHeight - 15
                        );
                        doc.text(
                          "Unichem Laboratories",
                          pageMargin,
                          pageHeight - 10
                        );
                        doc.text(
                          `Page ${i} of ${pageCount}`,
                          pageWidth - pageMargin - 40,
                          pageHeight - 10
                        );
                      }

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
                        const allowed = [
                          "edit",
                          "update",
                          "delete",
                          "add",
                          "create",
                        ];
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
                            <td>{renderLogValue(log.oldValue)}</td>
                            <td>{renderLogValue(log.newValue)}</td>
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
    </AbilityContext.Provider>
  );
};

export default UserMasterTable;
