import React, { useEffect, useRef, useState, useCallback } from "react";
import { FileText } from "lucide-react";
import jsPDF from "jspdf";
import { useAuth } from "../../context/AuthContext";
import autoTable from "jspdf-autotable";
import plantStyles from "../Plant/PlantMasterTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";
import styles from "../AccessLog/ActiveUserLog.module.css"
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { API_BASE, fetchActiveUserLogs, fetchPlants, fetchActivityLogs } from "../../utils/api";
import { useDebounce } from "../../hooks/useDebounce";
import AppHeader from "../../components/Common/AppHeader";
import { sortByString } from "../../utils/sortHelpers";
import {
  IconButton,
  Tooltip,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

/* -------------------- Types -------------------- */

interface AccessLog {
  id: number;
  user_request_id: number;
  task_id: number | null;
  ritm_transaction_id: string;
  task_transaction_id: string | null;

  request_for_by: string;
  name: string;
  employee_code: string;
  employee_location: string;
  assigned_to_name: string;
  access_request_type: string;
  training_status: string;
  access: string;
  vendor_firm: string | null;
  vendor_code: string | null;
  vendor_name: string | null;
  vendor_allocated_id: number | null;
  user_request_type: string;
  from_date: string;
  to_date: string;
  user_request_status: string;
  task_status: string;

  application_equip_id: number | null;
  application_name?: string;

  department: number | null;
  department_name?: string;

  role: number | null;
  role_name?: string;

  location: number | null;
  location_name?: string;

  reports_to: string | null;

  approver1_status: string;
  approver2_status: string;
  approver1_email: string | null;
  approver2_email: string | null;
  approver1_name: string | null;
  approver2_name: string | null;
  approver1_action: string | null;
  approver2_action: string | null;
  approver1_timestamp: string | null;
  approver2_timestamp: string | null;
  approver1_comments: string | null;
  approver2_comments: string | null;

  created_on: string;
  updated_on: string;
  completed_at: string | null;
  remarks: string | null;
}

interface ActivityLog {
  id: number;
  action: string;
  old_value: string | null;
  new_value: string | null;
  action_performed_by: string;
  approve_status: string;
  date_time_ist: string;
  comments: string;
}

interface Location {
  location_id: number;
  location_name: string;
}

interface Department {
  department_id: number;
  department_name: string;
}

interface Application {
  application_equip_id: number;
  application_name: string;
}

/* -------------------- Component -------------------- */

const ActiveUserLog: React.FC = () => {
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Cascading Filter States
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);

  // Dropdown Data States
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  // Loading States for Dropdowns
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);

  const [filterColumn, setFilterColumn] = useState("name");
  const [filterValue, setFilterValue] = useState("");
  const debouncedFilterValue = useDebounce(filterValue, 500);

  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLog, setActivityLog] = useState<{
    ritm: string;
    logs: ActivityLog[];
  } | null>(null);

  /* -------------------- Fetch Locations on Mount -------------------- */
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoadingLocations(true);
        fetchPlants().then((data) =>
          setLocations(
            sortByString(
              data.map((p: any) => ({ location_id: p.id, location_name: p.plant_name })),
              "location_name",
              "asc"
            )
          )
        );
      } catch (err) {
        console.error("Failed to fetch locations", err);
      } finally {
        setLoadingLocations(false);
      }
    };

    loadLocations();
  }, []);

  /* -------------------- Fetch Departments when Location changes -------------------- */
  useEffect(() => {
    if (!selectedLocationId) {
      setDepartments([]);
      setSelectedDepartmentId(null);
      setApplications([]);
      setAccessLogs([]);
      setSelectedApplicationId(null);
      return;
    }

    const loadDepartments = async () => {
      try {
        setLoadingDepartments(true);

        const response = await fetch(`${API_BASE}/api/applications/${selectedLocationId}`);
        const data = await response.json();
        setDepartments(
          sortByString(
            data.map((p: any) => ({ department_id: p.id, department_name: p.department_name })),
            "department_name",
            "asc"
          )
        );
        setSelectedDepartmentId(null);
        setApplications([]);
        setAccessLogs([]);
        setSelectedApplicationId(null);
      } catch (err) {
        console.error("Failed to fetch departments", err);
      } finally {
        setLoadingDepartments(false);
      }
    };

    loadDepartments();
  }, [selectedLocationId]);

  /* -------------------- Fetch Applications when Department changes -------------------- */
  useEffect(() => {
    if (!selectedLocationId || !selectedDepartmentId) {
      setApplications([]);
      setAccessLogs([]);
      setSelectedApplicationId(null);
      return;
    }

    const loadApplications = async () => {
      try {
        setLoadingApplications(true);

        const response = await fetch(
          `${API_BASE}/api/applications/${selectedLocationId}/${selectedDepartmentId}`
        );
        const data = await response.json();
        setApplications(
          sortByString(
            data.applications.map((p: any) => ({
              application_equip_id: p.id,
              application_name: p.name,
            })),
            "application_name",
            "asc"
          )
        );
        setSelectedApplicationId(null);
      } catch (err) {
        console.error("Failed to fetch applications", err);
      } finally {
        setLoadingApplications(false);
      }
    };

    loadApplications();
  }, [selectedLocationId, selectedDepartmentId]);

  /* -------------------- Fetch Access Logs -------------------- */
  useEffect(() => {
    setCurrentPage(1); // Reset page when filters change
  }, [selectedLocationId, selectedDepartmentId, selectedApplicationId, debouncedFilterValue, filterColumn]);

  const loadLogs = async () => {
    if (!selectedLocationId || !selectedDepartmentId || !selectedApplicationId) {
      setAccessLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await fetchActiveUserLogs({
        page: currentPage,
        limit: rowsPerPage,
        search: filterColumn,
        value: debouncedFilterValue,
        plant_id: selectedLocationId,
        department_id: selectedDepartmentId,
        application_id: selectedApplicationId,
      });

      if (result.success && Array.isArray(result.data)) {
        setAccessLogs(result.data);
      } else if (Array.isArray(result)) {
        setAccessLogs(result);
      } else {
        setAccessLogs([]);
      }
    } catch (err) {
      console.error("Failed to fetch access logs", err);

      const errorMessage = err instanceof Error ? err.message : "Failed to load access logs";

      setError(errorMessage);
      setAccessLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [currentPage, debouncedFilterValue, filterColumn, selectedLocationId, selectedDepartmentId, selectedApplicationId]);

  /* -------------------- Activity Logs -------------------- */
  const handleActivityClick = async (log: AccessLog) => {
    try {
      setShowActivityModal(true);
      setActivityLog(null);

      const data = await fetchActivityLogs(log.ritm_transaction_id);

      setActivityLog({
        ritm: log.ritm_transaction_id,
        logs: data || [],
      });
    } catch (err) {
      console.error("Failed to load activity logs", err);
      alert("Failed to load activity logs");
      setShowActivityModal(false);
    }
  };

  /* -------------------- PDF Export -------------------- */
  const handleExportPDF = useCallback(async () => {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const fileName = `ActiveUserLog_${today.toISOString().split("T")[0]}.pdf`;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageMargin = 14;
    const headerHeight = 15;

    doc.setFillColor(0, 82, 155);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

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

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titleX = pageMargin + logoWidth + 10;
    const titleY = headerHeight / 2 + 5;
    doc.text("Active User Log Report", titleX, titleY);

    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    const exportText = `Generated: ${today.toLocaleDateString("en-GB")} by ${user?.name || "User"}`;
    const exportTextWidth = doc.getTextWidth(exportText);
    const exportX = pageWidth - pageMargin - exportTextWidth;
    const exportY = headerHeight / 2 + 3;
    doc.text(exportText, exportX, exportY);

    const tableData = accessLogs.map((log) => [
      log.ritm_transaction_id || "--",
      log.name || "--",
      log.employee_code || "--",
      log.application_name || "--",
      log.department_name || "--",
      log.location_name || "--",
      log.user_request_status || "--",
      log.created_on ? new Date(log.created_on).toLocaleDateString("en-GB") : "--",
    ]);

    autoTable(doc, {
      head: [["RITM", "Name", "Employee Code", "Application", "Department", "Location", "Status", "Created On"]],
      body: tableData,
      startY: headerHeight + 5,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 82, 155], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: pageMargin, right: pageMargin },
    });

    doc.save(fileName);
  }, [accessLogs, user]);

  const handleExportActivityPDF = useCallback(async () => {
    if (!activityLog) return;

    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    const today = new Date();
    const fileName = `ActivityLog_${activityLog.ritm}_${today.toISOString().split("T")[0]}.pdf`;

    doc.setFontSize(16);
    doc.text(`Activity Log - ${activityLog.ritm}`, 14, 20);

    const tableData = activityLog.logs.map((log) => [
      log.action || "--",
      log.action_performed_by || "--",
      log.approve_status || "--",
      log.date_time_ist ? new Date(log.date_time_ist.replace(" ", "T")).toLocaleString("en-GB") : "--",
      log.comments || "--",
    ]);

    autoTable(doc, {
      head: [["Action", "Performed By", "Status", "Date/Time", "Comments"]],
      body: tableData,
      startY: 30,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 82, 155] },
    });

    doc.save(fileName);
  }, [activityLog]);

  /* -------------------- Render -------------------- */
  const totalPages = Math.max(1, Math.ceil(accessLogs.length / rowsPerPage));
  const pageData = accessLogs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const filterSelectStyle = {
    padding: "8px 12px",
    border: "1px solid #d0d5dd",
    borderRadius: "6px",
    fontSize: "14px",
    minWidth: "200px",
    backgroundColor: "#fff",
  };

  return (
    <div className={plantStyles.pageWrapper}>
      <AppHeader title="Active User Logs" />

      <div className={plantStyles.contentArea}>
        <div className={plantStyles.controlPanel}>
          <div className={plantStyles.actionRow}>
            {/* Location Filter */}
            <div className={styles.filterGroup}>
              <label>Location:</label>
              <select
                value={selectedLocationId || ""}
                onChange={(e) => setSelectedLocationId(e.target.value ? Number(e.target.value) : null)}
                disabled={loadingLocations}
                style={filterSelectStyle}
              >
                <option value="">-- Select Location --</option>
                {locations.map((loc) => (
                  <option key={`location-${loc.location_id}`} value={loc.location_id}>
                    {loc.location_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div className={styles.filterGroup}>
              <label>Department:</label>
              <select
                value={selectedDepartmentId || ""}
                onChange={(e) => setSelectedDepartmentId(e.target.value ? Number(e.target.value) : null)}
                disabled={!selectedLocationId || loadingDepartments}
                style={{
                  ...filterSelectStyle,
                  backgroundColor: selectedLocationId ? "#fff" : "#f9fafb",
                }}
              >
                <option value="">-- Select Department --</option>
                {departments.map((dept) => (
                  <option key={`department-${dept.department_id}`} value={dept.department_id}>
                    {dept.department_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Application Filter */}
            <div className={styles.filterGroup}>
              <label>Application:</label>
              <select
                value={selectedApplicationId || ""}
                onChange={(e) => setSelectedApplicationId(e.target.value ? Number(e.target.value) : null)}
                disabled={!selectedDepartmentId || loadingApplications}
                style={{
                  ...filterSelectStyle,
                  backgroundColor: selectedDepartmentId ? "#fff" : "#f9fafb",
                }}
              >
                <option value="">-- Select Application --</option>
                {applications.map((app) => (
                  <option key={`application-${app.application_equip_id}`} value={app.application_equip_id}>
                    {app.application_name}
                  </option>
                ))}
              </select>
            </div>
             <button
              onClick={handleExportPDF}
              disabled={accessLogs.length === 0}
              className={plantStyles.exportBtn}
            >
              <FileText size={16} /> Export PDF
            </button>
          </div>

          {/* Search Row */}
          <div className={plantStyles.actionRow} style={{ marginTop: "12px" }}>
            {/* <div>
              <label style={{ marginRight: "8px", fontSize: "14px", fontWeight: 500 }}>Search By:</label>
              <select
                value={filterColumn}
                onChange={(e) => setFilterColumn(e.target.value)}
                style={{ ...filterSelectStyle, minWidth: "180px" }}
              >
                <option value="name">Name</option>
                <option value="employee_code">Employee Code</option>
                <option value="ritm_transaction_id">RITM ID</option>
                <option value="application_name">Application</option>
                <option value="department_name">Department</option>
                <option value="location_name">Location</option>
              </select>
            </div>

            <input
              type="text"
              placeholder={`Search by ${filterColumn.replace(/_/g, " ")}...`}
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              style={{
                ...filterSelectStyle,
                minWidth: "300px",
              }}
            /> */}

           
          </div>
        </div>

        <div className={plantStyles.tableCard}>
          <div className={plantStyles.tableHeader}>
            <h2>Active User Records</h2>
            <span className={plantStyles.recordCount}>{accessLogs.length} Records</span>
          </div>

          {!selectedLocationId || !selectedDepartmentId || !selectedApplicationId ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#1e40af" }}>
              Please select <strong>Location</strong>, <strong>Department</strong>, and <strong>Application</strong> to
              view active user logs.
            </div>
          ) : loading ? (
            <div style={{ padding: "24px", textAlign: "center" }}>Loading...</div>
          ) : error ? (
            <div style={{ padding: "24px", textAlign: "center", color: "red" }}>{error}</div>
          ) : (
            <>
              <div className={plantStyles.tableContainer}>
                <table className={plantStyles.table}>
                  <thead>
                    <tr>
                      <th>RITM ID</th>
                      <th>Name</th>
                      <th>Employee Code</th>
                      <th>Application</th>
                      <th>Department</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Created On</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: 24 }}>
                          No records found
                        </td>
                      </tr>
                    ) : (
                      pageData.map((log) => (
                        <tr key={log.id}>
                          <td>{log.ritm_transaction_id}</td>
                          <td>{log.name}</td>
                          <td>{log.employee_code}</td>
                          <td>{log.application_name || "--"}</td>
                          <td>{log.department_name || "--"}</td>
                          <td>{log.location_name || "--"}</td>
                          <td>{log.user_request_status}</td>
                          <td>{log.created_on ? new Date(log.created_on).toLocaleDateString("en-GB") : "--"}</td>
                          <td style={{ textAlign: "center" }}>
                            <Tooltip title="View Activity">
                              <IconButton size="small" onClick={() => handleActivityClick(log)}>
                                <VisibilityOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className={paginationStyles.pagination}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={currentPage === 1 ? paginationStyles.disabledPageBtn : paginationStyles.pageBtn}
                >
                  Previous
                </button>

                <span className={paginationStyles.pageInfo}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? paginationStyles.disabledPageBtn : paginationStyles.pageBtn}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Activity Modal */}
      {showActivityModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowActivityModal(false)}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              maxWidth: "800px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {!activityLog ? (
              <div style={{ padding: 24, textAlign: "center" }}>Loading...</div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3>Activity Log – {activityLog.ritm}</h3>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={handleExportActivityPDF}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#007bff",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FileText size={14} /> Export PDF
                    </button>
                    <button
                      onClick={() => setShowActivityModal(false)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#6b7280",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
                <table className={plantStyles.table}>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>By</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLog.logs.map((a) => (
                      <tr key={a.id}>
                        <td>{a.action}</td>
                        <td>{a.action_performed_by}</td>
                        <td>{a.approve_status}</td>
                        <td>
                          {a.date_time_ist
                            ? new Date(a.date_time_ist.replace(" ", "T")).toLocaleString("en-GB")
                            : "--"}
                        </td>
                        <td>{a.comments}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveUserLog;