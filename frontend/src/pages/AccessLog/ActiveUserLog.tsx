import React, { useEffect, useRef, useState, useCallback } from "react";
import { FileText } from "lucide-react";
import jsPDF from "jspdf";
import { useAuth } from "../../context/AuthContext";
import autoTable from "jspdf-autotable";
import styles from "../Plant/PlantMasterTable.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import {API_BASE, fetchActiveUserLogs,fetchPlants, fetchActivityLogs } from "../../utils/api";
import { useDebounce } from "../../hooks/useDebounce";
import AppHeader from "../../components/Common/AppHeader";

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
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
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

  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLog, setActivityLog] = useState<{
    ritm: string;
    logs: ActivityLog[];
  } | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  /* -------------------- Fetch Locations on Mount -------------------- */
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoadingLocations(true);
        fetchPlants()
        .then((data) =>
          setLocations(
            data.map((p: any) => ({ location_id: p.id, location_name: p.plant_name }))
          )
        )
        // Replace with your actual API endpoint
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
        // Fetch departments from application_master based on location
        
        const response = await fetch(
        `${API_BASE}/api/applications/${selectedLocationId}`
      );
        const data = await response.json();
        setDepartments(data.map((p: any) => ({ department_id: p.id, department_name: p.department_name })));
        setSelectedDepartmentId(null); // Reset department selection
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
        // Fetch applications from application_master based on location and department
        
        const response = await fetch(
        `${API_BASE}/api/applications/${selectedLocationId}/${selectedDepartmentId}`
      );
        const data = await response.json();
        setApplications(data.applications.map((p: any) => ({ application_equip_id: p.id, application_name: p.name })));
        setSelectedApplicationId(null); // Reset application selection
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
    // Only fetch logs if all filters are selected
    if (!selectedLocationId || !selectedDepartmentId || !selectedApplicationId) {
      setAccessLogs([]);
      setTotalRecords(0);
      setLoading(false);
      return;
    }

    const loadLogs = async () => {
      try {
        setLoading(true);

        const result = await fetchActiveUserLogs({
          page: currentPage,
          limit: rowsPerPage,
          search: filterColumn,
          value: debouncedFilterValue,
          plant_id: selectedLocationId,
          department_id: selectedDepartmentId,
          application_id: selectedApplicationId,
        });

        setAccessLogs(Array.isArray(result) ? result : []);
        setTotalRecords(Array.isArray(result) ? result.length : 0);
      } catch (err) {
        console.error("Failed to fetch access logs", err);
        setError("Failed to load access logs");
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [
    currentPage,
    filterColumn,
    debouncedFilterValue,
    selectedLocationId,
    selectedDepartmentId,
    selectedApplicationId,
  ]);

  /* Reset page on filter change */
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilterValue, filterColumn, selectedLocationId, selectedDepartmentId, selectedApplicationId]);

  /* -------------------- Outside Click -------------------- */
  useEffect(() => {
    if (!showFilterPopover) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowFilterPopover(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilterPopover]);

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
    const fileName = `AccessLogReport_${today.toISOString().split("T")[0]}.pdf`;
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
    const titleX = pageMargin + logoWidth + 10;
    const titleY = headerHeight / 2 + 5;
    doc.text("Access Log Report", titleX, titleY);

    // Export info
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    const exportText = `Generated: ${today.toLocaleDateString("en-GB")} by ${user?.name || "User"}`;
    const exportTextWidth = doc.getTextWidth(exportText);
    const exportX = pageWidth - pageMargin - exportTextWidth;
    const exportY = headerHeight / 2 + 3;
    doc.text(exportText, exportX, exportY);

    // Table
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
      head: [
        ["RITM", "Name", "Employee Code", "Application", "Department", "Location", "Status", "Created On"],
      ],
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
      log.date_time_ist
        ? new Date(log.date_time_ist.replace(" ", "T")).toLocaleString("en-GB")
        : "--",
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
  const totalPages = Math.ceil(totalRecords / rowsPerPage);

  return (
    <div className={styles.pageContainer}>
      <AppHeader title="Active User Logs" />

      <div className={styles.tableWrapper}>
        <div className={styles.controlsContainer}>
          {/* Cascading Filters Section */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
            {/* Location Dropdown */}
            <div style={{ minWidth: "200px" }}>
              <label
                htmlFor="location-select"
                style={{
                  display: "block",
                  marginBottom: "40px",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Location
              </label>
              <select
                id="location-select"
                value={selectedLocationId || ""}
                onChange={(e) => setSelectedLocationId(e.target.value ? Number(e.target.value) : null)}
                disabled={loadingLocations}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d0d5dd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "#fff",
                }}
              >
                <option key="location-default" value="">-- Select Location --</option>
                {locations.map((loc) => (
                  <option key={`location-${loc.location_id}`} value={loc.location_id}>
                    {loc.location_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Dropdown */}
            <div style={{ minWidth: "200px" }}>
              <label
                htmlFor="department-select"
                style={{
                  display: "block",
                  marginBottom: "40px",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Department
              </label>
              <select
                id="department-select"
                value={selectedDepartmentId || ""}
                onChange={(e) => setSelectedDepartmentId(e.target.value ? Number(e.target.value) : null)}
                disabled={!selectedLocationId || loadingDepartments}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d0d5dd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: selectedLocationId ? "#fff" : "#f9fafb",
                }}
              >
                <option key="department-default" value="">-- Select Department --</option>
                {departments.map((dept) => (
                  <option key={`department-${dept.department_id}`} value={dept.department_id}>
                    {dept.department_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Application Dropdown */}
            <div style={{ minWidth: "200px" }}>
              <label
                htmlFor="application-select"
                style={{
                  display: "block",
                  marginBottom: "40px",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Application
              </label>
              <select
                id="application-select"
                value={selectedApplicationId || ""}
                onChange={(e) => setSelectedApplicationId(e.target.value ? Number(e.target.value) : null)}
                disabled={!selectedDepartmentId || loadingApplications}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d0d5dd",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: selectedDepartmentId ? "#fff" : "#f9fafb",
                }}
              >
                <option key="application-default" value="">-- Select Application --</option>
                {applications.map((app) => (
                  <option key={`application-${app.application_equip_id}`} value={app.application_equip_id}>
                    {app.application_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Existing Filter and Export Controls */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "1px solid #d0d5dd",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Filter by: {filterColumn}
              </button>

              {showFilterPopover && (
                <div
                  ref={popoverRef}
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: 4,
                    backgroundColor: "#fff",
                    border: "1px solid #d0d5dd",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    zIndex: 999,
                    minWidth: 180,
                  }}
                >
                  {[
                    "name",
                    "employee_code",
                    "ritm_transaction_id",
                    "application_name",
                    "department_name",
                    "location_name",
                  ].map((col) => (
                    <div
                      key={col}
                      onClick={() => {
                        setFilterColumn(col);
                        setShowFilterPopover(false);
                      }}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        backgroundColor: filterColumn === col ? "#f0f0f0" : "#fff",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f0f0")}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          filterColumn === col ? "#f0f0f0" : "#fff")
                      }
                    >
                      {col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder={`Search by ${filterColumn.replace(/_/g, " ")}...`}
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #d0d5dd",
                fontSize: 14,
                minWidth: 240,
              }}
            />

            <button
              onClick={handleExportPDF}
              disabled={accessLogs.length === 0}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid #d0d5dd",
                backgroundColor: accessLogs.length === 0 ? "#f9fafb" : "#007bff",
                color: accessLogs.length === 0 ? "#cbd5e1" : "#fff",
                cursor: accessLogs.length === 0 ? "not-allowed" : "pointer",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <FileText size={16} /> Export PDF
            </button>
          </div>
        </div>

        {/* Info Message */}
        {(!selectedLocationId || !selectedDepartmentId || !selectedApplicationId) && (
          <div
            style={{
              padding: "16px",
              backgroundColor: "#f0f9ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              marginBottom: "16px",
              color: "#1e40af",
              fontSize: "14px",
            }}
          >
            Please select <strong>Location</strong>, <strong>Department</strong>, and{" "}
            <strong>Application</strong> to view access logs.
          </div>
        )}

        {/* Loading/Error/Table */}
        {loading ? (
          <div style={{ padding: 24, textAlign: "center" }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: 24, textAlign: "center", color: "red" }}>{error}</div>
        ) : (
          <div>
            <table className={styles.table}>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accessLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: 24 }}>
                      No records found
                    </td>
                  </tr>
                ) : (
                  accessLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.ritm_transaction_id}</td>
                      <td>{log.name}</td>
                      <td>{log.employee_code}</td>
                      <td>{log.application_name || "--"}</td>
                      <td>{log.department_name || "--"}</td>
                      <td>{log.location_name || "--"}</td>
                      <td>{log.user_request_status}</td>
                      <td>
                        {log.created_on
                          ? new Date(log.created_on).toLocaleDateString("en-GB")
                          : "--"}
                      </td>
                      <td>
                        <button
                          onClick={() => handleActivityClick(log)}
                          style={{
                            padding: "4px 8px",
                            fontSize: 12,
                            borderRadius: 4,
                            border: "1px solid #007bff",
                            backgroundColor: "#fff",
                            color: "#007bff",
                            cursor: "pointer",
                          }}
                        >
                          Activity
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div
              style={{
                marginTop: 20,
                paddingBottom: 24,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                fontFamily: "Segoe UI, Roboto, sans-serif",
                fontSize: 14,
              }}
            >
              {/* First */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #d0d5dd",
                  backgroundColor: currentPage === 1 ? "#f9fafb" : "#ffffff",
                  color: currentPage === 1 ? "#cbd5e1" : "#344054",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  minWidth: 40,
                }}
              >
                {"<<"}
              </button>

              {/* Prev */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #d0d5dd",
                  backgroundColor: currentPage === 1 ? "#f9fafb" : "#ffffff",
                  color: currentPage === 1 ? "#cbd5e1" : "#344054",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  minWidth: 40,
                }}
              >
                Prev
              </button>

              {/* Page Numbers (Dynamic max 5 pages) */}
              {(() => {
                const pageButtons = [];
                const maxPagesToShow = 5;
                let start = Math.max(1, currentPage - 2);
                let end = Math.min(totalPages, start + maxPagesToShow - 1);
                if (end - start < maxPagesToShow - 1) {
                  start = Math.max(1, end - maxPagesToShow + 1);
                }

                if (start > 1) {
                  pageButtons.push(
                    <button
                      key={1}
                      onClick={() => setCurrentPage(1)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #d0d5dd",
                        backgroundColor: currentPage === 1 ? "#007bff" : "#ffffff",
                        color: currentPage === 1 ? "#fff" : "#344054",
                        cursor: "pointer",
                        minWidth: 40,
                      }}
                    >
                      1
                    </button>
                  );
                  if (start > 2) {
                    pageButtons.push(
                      <span key="ellipsis-left" style={{ padding: "6px 10px", color: "#999" }}>
                        ...
                      </span>
                    );
                  }
                }

                for (let i = start; i <= end; i++) {
                  pageButtons.push(
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: i === currentPage ? "1px solid #007bff" : "1px solid #d0d5dd",
                        backgroundColor: i === currentPage ? "#007bff" : "#ffffff",
                        color: i === currentPage ? "#fff" : "#344054",
                        cursor: "pointer",
                        minWidth: 40,
                      }}
                    >
                      {i}
                    </button>
                  );
                }

                if (end < totalPages) {
                  if (end < totalPages - 1) {
                    pageButtons.push(
                      <span key="ellipsis-right" style={{ padding: "6px 10px", color: "#999" }}>
                        ...
                      </span>
                    );
                  }
                  pageButtons.push(
                    <button
                      key={totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: currentPage === totalPages ? "1px solid #007bff" : "1px solid #d0d5dd",
                        backgroundColor: currentPage === totalPages ? "#007bff" : "#ffffff",
                        color: currentPage === totalPages ? "#fff" : "#344054",
                        cursor: "pointer",
                        minWidth: 40,
                      }}
                    >
                      {totalPages}
                    </button>
                  );
                }

                return pageButtons;
              })()}

              {/* Next */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #d0d5dd",
                  backgroundColor:
                    currentPage === totalPages || totalPages === 0 ? "#f9fafb" : "#ffffff",
                  color:
                    currentPage === totalPages || totalPages === 0 ? "#cbd5e1" : "#344054",
                  cursor:
                    currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer",
                  minWidth: 40,
                }}
              >
                Next
              </button>

              {/* Last */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #d0d5dd",
                  backgroundColor:
                    currentPage === totalPages || totalPages === 0 ? "#f9fafb" : "#ffffff",
                  color:
                    currentPage === totalPages || totalPages === 0 ? "#cbd5e1" : "#344054",
                  cursor:
                    currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer",
                  minWidth: 40,
                }}
              >
                {">>"}
              </button>
            </div>
          </div>
        )}

        {/* Activity Modal */}
        {showActivityModal && (
          <div className={styles.panelOverlay}>
            <div className={styles.panelWrapper}>
              {!activityLog ? (
                <div style={{ padding: 24, textAlign: "center" }}>Loading...</div>
              ) : (
                <>
                  <h3>Activity Log – {activityLog.ritm}</h3>
                  <button onClick={handleExportActivityPDF}>
                    <FileText size={16} /> Export PDF
                  </button>
                  <table className={styles.table}>
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
                  <button onClick={() => setShowActivityModal(false)}>Close</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveUserLog;