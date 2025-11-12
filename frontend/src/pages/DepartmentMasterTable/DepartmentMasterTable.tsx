import React, { useEffect, useRef } from "react";
import { FaTrash, FaRegClock } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { fetchDepartmentActivityLogs } from "../../utils/api";
import { useDepartmentContext } from "../../pages/DepartmentMaster/DepartmentContext";
import styles from "../ApplicationMasterTable/ApplicationMasterTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import ProfileIconWithLogout from "../PlantMasterTable/ProfileIconWithLogout";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaEdit } from "react-icons/fa";

const DepartmentMasterTable: React.FC = () => {
  const { departments, deleteDepartment } = useDepartmentContext();
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 10;
  // activity logs are fetched on demand when user clicks the activity icon
  const [activityDepartment, setActivityDepartment] = React.useState<any>(null);
  const [approverFilter, setApproverFilter] = React.useState("");
  const [showFilterPopover, setShowFilterPopover] = React.useState(false);
  const [filterColumn, setFilterColumn] = React.useState("name");
  const [filterValue, setFilterValue] = React.useState("");
  const [tempFilterColumn, setTempFilterColumn] = React.useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = React.useState(filterValue);
  const popoverRef = useRef<HTMLDivElement | null>(null);
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
  const filteredData = departments.filter((department) => {
    if (!filterValue.trim()) return true;
    const value = filterValue.toLowerCase();
    switch (filterColumn) {
      case "name":
        return department.name?.toLowerCase().includes(value);
      case "description":
        return department.description?.toLowerCase().includes(value);
      case "status":
        return department.status?.toLowerCase().includes(value);
      default:
        return true;
    }
  });

  // Reset to first page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterValue]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // PDF Export Handler for Department Table
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `DepartmentMaster_${yyyy}-${mm}-${dd}.pdf`;
    const headers = [["Department Name", "Description", "Status"]];
    const rows = filteredData.map((department) => [
      department.name ?? "",
      department.description ?? "",
      department.status ?? "",
    ]);
    doc.setFontSize(18);
    doc.text("Department Master", 14, 18);
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
    if (!activityDepartment) return;
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `DepartmentActivityLog_${yyyy}-${mm}-${dd}.pdf`;
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
    const rows = (activityDepartment.logs || []).map((log: any) => {
      let oldVal: any = {};
      let newVal: any = {};
      try {
        oldVal = log.old_value ? JSON.parse(log.old_value) : {};
        newVal = log.new_value ? JSON.parse(log.new_value) : {};
      } catch {}
      return [
        log.action,
        `${oldVal.department_name || ""} ${
          oldVal.description ? `(${oldVal.description})` : ""
        }`,
        `${newVal.department_name || ""} ${
          newVal.description ? `(${newVal.description})` : ""
        }`,
        log.action_performed_by ?? "",
        log.approve_status ?? "",
        log.date_time_ist ? new Date(log.date_time_ist).toLocaleString() : "",
        log.comments ?? "",
      ];
    });
    doc.setFontSize(18);
    doc.text("Department Activity Log", 14, 18);
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

  // Helper to filter logs by department name
  const filterLogsForDepartment = (logs: any[], departmentName: string) => {
    return logs.filter((log) => {
      try {
        const oldVal = log.old_value ? JSON.parse(log.old_value) : {};
        const newVal = log.new_value ? JSON.parse(log.new_value) : {};
        return (
          oldVal.department_name === departmentName ||
          newVal.department_name === departmentName
        );
      } catch {
        return false;
      }
    });
  };

  const confirmDelete = async () => {
    if (selectedRow === null) return;
    // selectedRow stores index into filteredData (global index), so use filteredData
    if (!filteredData[selectedRow]) return;
    await deleteDepartment(filteredData[selectedRow].id);
    setSelectedRow(null);
    setShowDeleteModal(false);
  };

  return (
    <div>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Department Master</h2>
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
            onClick={() => navigate("/departments/add")}
          >
            + Add New
          </button>
          <button
            className={styles.filterBtn}
            onClick={() => setShowFilterPopover((prev) => !prev)}
            type="button"
            aria-label="Filter departments"
          >
            🔍 Filter
          </button>
          <button
            className={`${styles.btn} ${styles.editBtn}`}
            onClick={() => {
              if (selectedRow !== null && filteredData[selectedRow])
                navigate(`/departments/edit/${filteredData[selectedRow].id}`);
            }}
            disabled={selectedRow === null}
          >
            <FaEdit size={14} /> Edit
          </button>
          <button
            className={`${styles.btn} ${styles.deleteBtn}`}
            disabled={selectedRow === null}
            onClick={() => setShowDeleteModal(true)}
            title="Delete selected department"
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
                    <option value="name">Department Name</option>
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
            marginTop: "11px",
            height: "100",
          }}
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>Department Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Activity Logs</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((department, index) => {
                const globalIndex = (currentPage - 1) * rowsPerPage + index;
                return (
                  <tr
                    key={globalIndex}
                    onClick={() => setSelectedRow(globalIndex)}
                    style={{
                      background:
                        selectedRow === globalIndex ? "#f0f4ff" : undefined,
                    }}
                  >
                    <td>
                      <input
                        type="radio"
                        className={styles.radioInput}
                        checked={selectedRow === globalIndex}
                        onChange={() => setSelectedRow(globalIndex)}
                      />
                    </td>
                    <td>{department.name ?? ""}</td>
                    <td>{department.description ?? ""}</td>
                    <td>
                      <span
                        className={
                          department.status === "INACTIVE"
                            ? styles.statusInactive
                            : styles.status
                        }
                      >
                        {department.status ?? ""}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{ cursor: "pointer", color: "#0b63ce" }}
                        title="View Activity Log"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setApproverFilter("");
                          try {
                            const logs = await fetchDepartmentActivityLogs();
                            const filtered = filterLogsForDepartment(
                              logs,
                              department.name ?? ""
                            );
                            setActivityDepartment({
                              name: department.name ?? "",
                              logs: filtered,
                            });
                          } catch (err) {
                            setActivityDepartment({
                              name: department.name ?? "",
                              logs: [],
                            });
                          }
                          setShowActivityModal(true);
                        }}
                      >
                        <FaRegClock size={18} />
                      </span>
                    </td>
                  </tr>
                );
              })}
              <ConfirmDeleteModal
                open={showDeleteModal}
                name={
                  selectedRow !== null && filteredData[selectedRow]
                    ? filteredData[selectedRow].name ?? "department"
                    : "department"
                }
                onCancel={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
              />
            </tbody>
          </table>
          {/* Pagination controls */}
          <div className={paginationStyles.pagination} style={{ marginTop: 8 }}>
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
            <span
              className={paginationStyles.pageInfo}
              style={{ margin: "0 12px" }}
            >
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {/* Activity Log Modal */}
      {showActivityModal && activityDepartment && (
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
                Department:{" "}
                <span style={{ color: "#0b63ce" }}>
                  {activityDepartment.name}
                </span>
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
                  {(activityDepartment.logs || []).map(
                    (log: any, i: number) => {
                      let oldVal: any = {};
                      let newVal: any = {};
                      try {
                        oldVal = log.old_value ? JSON.parse(log.old_value) : {};
                        newVal = log.new_value ? JSON.parse(log.new_value) : {};
                      } catch {}
                      if (
                        approverFilter &&
                        !(log.action_performed_by ?? "")
                          .toLowerCase()
                          .includes(approverFilter.toLowerCase())
                      ) {
                        return null;
                      }
                      return (
                        <tr key={i}>
                          <td>{log.action}</td>
                          <td>
                            {oldVal.department_name || ""}{" "}
                            {oldVal.description
                              ? `(${oldVal.description})`
                              : ""}
                          </td>
                          <td>
                            {newVal.department_name || ""}{" "}
                            {newVal.description
                              ? `(${newVal.description})`
                              : ""}
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
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentMasterTable;
