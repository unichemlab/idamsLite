import React, { useState, useEffect, useRef,useCallback } from "react";
import { AbilityContext } from "../../context/AbilityContext";
import { useNavigate } from "react-router-dom";
import styles from "../Plant/PlantMasterTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import { FaRegClock } from "react-icons/fa6";
import { useUserContext } from "../../context/UserContext";
import { useDepartmentContext } from "../DepartmentTable/DepartmentContext";
import { useAbility } from "../../context/AbilityContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fetchActivityLog } from "../../utils/api";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import unichemLogoBase64 from "../../assets/unichemLogoBase64";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import AppHeader from "../../components/Common/AppHeader";
import useAutoRefresh from "../../hooks/useAutoRefresh";
import ActivityLogModal from "../../components/Common/ActivityLogModal";
import { fetchActivityLogs,fetchActivityLogsByRecordId  } from "../../utils/activityLogUtils";


const UserMasterTable = () => {
  const navigate = useNavigate();
  const ability = useAbility();
 const { users, deleteUser, currentUser, refreshUsers } = useUserContext();
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
  const [activityLogs, setActivityLogs] = React.useState<any[]>([]);
     const [selectedRecordName, setSelectedRecordName] = React.useState("");

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
      (user.employee_name && user.employee_name.toLowerCase().includes(value)) ||
      (user.email && user.email.toLowerCase().includes(value)) ||
      (user.employee_code && user.employee_code.toLowerCase().includes(value)) ||
      (user.employee_id && String(user.employee_id).toLowerCase().includes(value))||
      (user.location && user.location.toLowerCase().includes(value))||
      (user.designation && user.designation.toLowerCase().includes(value))||
      (user.status && user.status.toLowerCase().includes(value))||
      (user.company && user.company.toLowerCase().includes(value))||
      (user.department && String(user.department).toLowerCase().includes(value))
    );
  });
const refreshCallback = useCallback(() => {
  if (typeof refreshUsers !== "function") return;

  console.log("[UserMaster] 🔄 Auto refreshing users...");
  refreshUsers();
}, [refreshUsers]);

useAutoRefresh(refreshCallback);

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
  /* -------------------- PDF Export User Master -------------------- */
  
      const handleExportPDF = useCallback(async () => {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "portrait" });
      const today = new Date();
      const fileName = `UserMaster_${today.toISOString().split("T")[0]}.pdf`;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageMargin = 14;
      const headerHeight = 15;
  
      // Header background
      doc.setFillColor(0, 82, 155);
      doc.rect(0, 0, pageWidth, headerHeight, "F");
  
      // Add logo if available
      let logoWidth = 0;
      let logoHeight = 0;
      if (login_headTitle2) {
        try {
          const loadImage = (src: string): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = src;
            });
          };
          
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
  
      // Title
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      const titleX = pageMargin + logoWidth -5;
      const titleY = headerHeight / 2 + 5;
      doc.text("User Master Report", titleX, titleY);
  
      // Export info
      doc.setFontSize(9);
      doc.setTextColor(220, 230, 245);
      const exportedByName = (currentUser && (currentUser.name || currentUser.username)) || "Unknown User";
      const exportedText = `Exported by: ${exportedByName}  On: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
      const textWidth = doc.getTextWidth(exportedText);
      doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);
  
      // Header line
      doc.setDrawColor(0, 82, 155);
      doc.setLineWidth(0.5);
      doc.line(0, headerHeight, pageWidth, headerHeight);
  
      // Table headers
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
      ],
    ];
  
      // Table rows
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
    ]);
  
      // Generate table
      autoTable(doc, {
        head: headers,
        body: rows,
        startY: headerHeight + 8,
        styles: { 
          fontSize: 7, 
          cellPadding: 2.5, 
          halign: "left", 
          valign: "middle", 
          textColor: 80,
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
        },
        headStyles: { 
          fillColor: [11, 99, 206], 
          textColor: 255, 
          fontStyle: "bold", 
          fontSize: 8,
          halign: "center",
        },
        alternateRowStyles: { 
          fillColor: [240, 245, 255] 
        },
        margin: { left: pageMargin, right: pageMargin },
        tableWidth: "auto",
       
      });
  
      // Footer
      const pageCount = (doc as any).getNumberOfPages?.() || (doc as any).internal?.getNumberOfPages?.() || 1;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.line(pageMargin, pageHeight - 15, pageWidth - pageMargin, pageHeight - 15);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("Unichem Laboratories", pageMargin, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - pageMargin - 30, pageHeight - 10);
      }
  
      doc.save(fileName);
    }, [filteredUsers, currentUser, login_headTitle2]);

// 🔥 NEW: Handle activity log button click
    const handleActivityClick = useCallback(async (app: any) => {
      try {
        // Fetch activity logs using the common utility
        const logs = await fetchActivityLogsByRecordId('user_master', app.id);
        console.log(`✅ Found ${logs.length} logs for record ${app.employee_name}`);
        setActivityLogs(logs);
        setSelectedRecordName(app.employee_name);
        setShowActivityModal(true);
      } catch (err) {
        console.error("Error loading activity logs:", err);
        setActivityLogs([]);
        setSelectedRecordName(app.employee_name);
        setShowActivityModal(true);
      }
    }, []);


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
                    <th style={{ width: '100px', textAlign: 'center' }}>Activity Log</th>
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
                            className={styles.activityBtn} 
                            onClick={() => handleActivityClick(user)}
                            title="View activity logs"
                          >
                            <FaRegClock size={16} />
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

        {/* Activity Log Modal with name resolution */}
      <ActivityLogModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        title="Activity Log"
        recordName={selectedRecordName}
        activityLogs={activityLogs}
        // 🔥 Pass name resolution functions
        // getPlantName={getPlantName}
        // getDepartmentName={getDepartmentName}
        // getRoleName={getRoleName}
        // getUserName={getUserName}
      />
      </div>
    </AbilityContext.Provider>
  );
};

export default UserMasterTable;
