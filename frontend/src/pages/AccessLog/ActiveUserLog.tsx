import React, { useEffect, useRef, useState, useCallback } from "react";
import { FileText } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import plantStyles from "../Plant/PlantMasterTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";
import styles from "../AccessLog/ActiveUserLog.module.css"
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { API_BASE, fetchActiveUserLogs, fetchPlants, fetchActivityLogs } from "../../utils/api";
import { useDebounce } from "../../hooks/useDebounce";
import AppHeader from "../../components/Common/AppHeader";
import { sortByString } from "../../utils/sortHelpers";

/* -------------------- Types -------------------- */
interface AccessLog {
  id: number;
  user_request_id: number;
  task_id: number | null;
  ritm_transaction_id: string;
  task_transaction_id: string | null;
  allocated_id: string | null;
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
  vendor_allocated_id: string | null;
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
  request_raised_by: string | null;
  request_raised_by_emp_code: string | null;
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

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);

  const [filterColumn, setFilterColumn] = useState("name");
  const [filterValue, setFilterValue] = useState("");
  const debouncedFilterValue = useDebounce(filterValue, 500);

  // ✅ Request For filter
  const [filterRequestFor, setFilterRequestFor] = useState<string>("");

  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLog, setActivityLog] = useState<{
    ritm: string;
    logs: ActivityLog[];
  } | null>(null);

  /* -------------------- Fetch Locations -------------------- */
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

  /* -------------------- Fetch Departments -------------------- */
  useEffect(() => {
    if (!selectedLocationId) {
      setDepartments([]);
      setSelectedDepartmentId(null);
      setApplications([]);
      setAccessLogs([]);
      setSelectedApplicationId(null);
      setFilterRequestFor("");
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
        setFilterRequestFor("");
      } catch (err) {
        console.error("Failed to fetch departments", err);
      } finally {
        setLoadingDepartments(false);
      }
    };
    loadDepartments();
  }, [selectedLocationId]);

  /* -------------------- Fetch Applications -------------------- */
  useEffect(() => {
    if (!selectedLocationId || !selectedDepartmentId) {
      setApplications([]);
      setAccessLogs([]);
      setSelectedApplicationId(null);
      setFilterRequestFor("");
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
        setFilterRequestFor("");
      } catch (err) {
        console.error("Failed to fetch applications", err);
      } finally {
        setLoadingApplications(false);
      }
    };
    loadApplications();
  }, [selectedLocationId, selectedDepartmentId]);

  /* -------------------- Reset Page on Filter Change -------------------- */
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedLocationId,
    selectedDepartmentId,
    selectedApplicationId,
    debouncedFilterValue,
    filterColumn,
    filterRequestFor, // ✅ added
  ]);

  /* -------------------- Fetch Access Logs -------------------- */
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
      setError(err instanceof Error ? err.message : "Failed to load access logs");
      setAccessLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [
    currentPage,
    debouncedFilterValue,
    filterColumn,
    selectedLocationId,
    selectedDepartmentId,
    selectedApplicationId,
  ]);

  /* -------------------- Activity Logs -------------------- */
  const handleActivityClick = async (log: AccessLog) => {
    try {
      setShowActivityModal(true);
      setActivityLog(null);
      const data = await fetchActivityLogs(log.ritm_transaction_id);
      setActivityLog({ ritm: log.ritm_transaction_id, logs: data || [] });
    } catch (err) {
      console.error("Failed to load activity logs", err);
      alert("Failed to load activity logs");
      setShowActivityModal(false);
    }
  };

  /* -------------------- Client-side Request For Filter -------------------- */
 const filteredLogs = filterRequestFor
  ? filterRequestFor === "Self/Others"
    ? accessLogs.filter((log) => log.request_for_by === "Self" || log.request_for_by === "Others")
    : accessLogs.filter((log) => log.request_for_by === filterRequestFor)
  : accessLogs;

  /* -------------------- Export PDF (All Columns) -------------------- */
  const handleExportPDF = useCallback(async () => {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const fileName = `ActiveUserLog_${today.toISOString().split("T")[0]}.pdf`;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageMargin = 14;
    const headerHeight = 15;

    // Header bar
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

    // Title
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("Active User Log Report", pageMargin + logoWidth + 10, headerHeight / 2 + 5);

    // Generated info
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    const exportText = `Generated: ${today.toLocaleDateString("en-GB")} by ${user?.name || "User"}`;
    doc.text(exportText, pageWidth - pageMargin - doc.getTextWidth(exportText), headerHeight / 2 + 3);

    // Filter details
    let startY = headerHeight + 12;
    const locationName = locations.find((l) => l.location_id === selectedLocationId)?.location_name || "All";
    const departmentName = departments.find((d) => d.department_id === selectedDepartmentId)?.department_name || "All";
    const applicationName = applications.find((a) => a.application_equip_id === selectedApplicationId)?.application_name || "All";
    const filterText = `Location: ${locationName}   |   Department: ${departmentName}   |   Application: ${applicationName}${filterRequestFor ? `   |   Request For: ${filterRequestFor}` : ""}`;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold"); // ✅ fixed
    doc.text(filterText, (pageWidth - doc.getTextWidth(filterText)) / 2, startY);
    doc.setFont("helvetica", "normal"); // ✅ fixed
    startY += 10;

    // ✅ Export filteredLogs (respects Request For filter)
    const tableData = filteredLogs.map((log, index) => {
      const isVendor = log.request_for_by === "Vendor / OEM";
      const isOther  = log.request_for_by === "Others";

      return [
        index + 1,
        log.request_for_by || "--",
        isVendor ? "--" : (log.employee_code || "--"),
        isVendor ? "--" : (log.name || "--"),
        log.allocated_id || "--",
        log.role_name || "--",
        log.ritm_transaction_id || "--",
        log.task_transaction_id || "--",
        isVendor
          ? `Firm: ${log.vendor_firm || "--"}\nName: ${log.vendor_name || "--"}\nCode: ${log.vendor_code || "--"}\nAllocated: ${log.vendor_allocated_id || "--"}`
          : "--",
        (isOther || isVendor)
          ? `${log.request_raised_by || "--"} (${log.request_raised_by_emp_code || "--"})`
          : "--",
      ];
    });

    autoTable(doc, {
      head: [[
        "S.No",
        "Request For",
        "Emp Code",
        "Name",
        "Allocated ID",
        "Role",
        "RITM ID",
        "Task ID",
        "Vendor Details",
        "Raised By",
      ]],
      body: tableData,
      startY,
      styles: { fontSize: 6.5, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [0, 82, 155], textColor: [255, 255, 255], fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        8:  { cellWidth: 30 },
        9:  { cellWidth: 25 },
        14: { cellWidth: 22 },
        15: { cellWidth: 22 },
        17: { cellWidth: 25 },
      },
      margin: { left: pageMargin, right: pageMargin },
    });

    doc.save(fileName);
  }, [
    filteredLogs,
    user,
    selectedLocationId,
    selectedDepartmentId,
    selectedApplicationId,
    filterRequestFor,
    locations,
    departments,
    applications,
  ]);

  /* -------------------- Pagination -------------------- */
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / rowsPerPage));
  const pageData = filteredLogs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const filterSelectStyle = {
    padding: "8px 12px",
    border: "1px solid #d0d5dd",
    borderRadius: "6px",
    fontSize: "14px",
    minWidth: "200px",
    backgroundColor: "#fff",
  };

  /* -------------------- Render -------------------- */
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
                style={{ ...filterSelectStyle, backgroundColor: selectedLocationId ? "#fff" : "#f9fafb" }}
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
                style={{ ...filterSelectStyle, backgroundColor: selectedDepartmentId ? "#fff" : "#f9fafb" }}
              >
                <option value="">-- Select Application --</option>
                {applications.map((app) => (
                  <option key={`application-${app.application_equip_id}`} value={app.application_equip_id}>
                    {app.application_name}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ Request For Filter */}
            <div className={styles.filterGroup}>
              <label>Request For:</label>
              <select
                value={filterRequestFor}
                onChange={(e) => {
                  setFilterRequestFor(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={!selectedApplicationId}
                style={{ ...filterSelectStyle, backgroundColor: selectedApplicationId ? "#fff" : "#f9fafb" }}
              >
                <option value="">-- All --</option>
<option value="Self/Others">Self/Others</option>
<option value="Vendor / OEM">Vendor / OEM</option>
              </select>
            </div>

            <button
              onClick={handleExportPDF}
              disabled={filteredLogs.length === 0}
              className={plantStyles.exportBtn}
            >
              <FileText size={16} /> Export PDF
            </button>

          </div>
        </div>

        <div className={plantStyles.tableCard}>
          <div className={plantStyles.tableHeader}>
            <h2>Active User Records</h2>
            {/* ✅ Shows filtered count + active filter label */}
            <span className={plantStyles.recordCount}>
              {filteredLogs.length} Records
              {filterRequestFor && ` (${filterRequestFor})`}
            </span>
          </div>

          {!selectedLocationId || !selectedDepartmentId || !selectedApplicationId ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#1e40af" }}>
              Please select <strong>Location</strong>, <strong>Department</strong>, and{" "}
              <strong>Application</strong> to view active user logs.
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
                      <th>S.No</th>
                      <th>Request For</th>
                      <th>Employee Code</th>
                      <th>Name</th>
                      <th>Allocated ID</th>
                      <th>Role</th>
                      <th>Request ID</th>
                      <th>Transaction ID (Task)</th>
                      <th>Vendor Details</th>
                      <th>Raised By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: "center", padding: 24 }}>
                          No records found
                        </td>
                      </tr>
                    ) : (
                      pageData.map((log, index) => {
                        const isSelf   = log.request_for_by === "Self";
                        const isOther  = log.request_for_by === "Others";
                        const isVendor = log.request_for_by === "Vendor / OEM";

                        return (
                          <tr key={log.id}>
                            <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>
                            <td>{log.request_for_by}</td>

                            {/* Employee Code — hide for Vendor */}
                            <td>{isVendor ? "--" : (log.employee_code || "--")}</td>

                            {/* Name — hide for Vendor */}
                            <td>{isVendor ? "--" : (log.name || "--")}</td>

                            <td>{log.allocated_id || "--"}</td>

                            {/* ✅ Role — all types including Vendor */}
                            <td>{log.role_name || "--"}</td>

                            <td>{log.ritm_transaction_id || "--"}</td>
                            <td>{log.task_transaction_id || "--"}</td>

                            {/* Vendor Details */}
                            <td>
                              {isVendor ? (
                                <div className={plantStyles.vendorCell}>
                                  <div><strong>Firm:</strong> {log.vendor_firm || "--"}</div>
                                  <div><strong>Name:</strong> {log.vendor_name || "--"}</div>
                                </div>
                              ) : (
                                <span className={plantStyles.noData}>--</span>
                              )}
                            </td>

                            {/* Raised By — Others and Vendor only */}
                            <td>
                              {(isOther || isVendor) ? (
                                <div>
                                  <div><strong>Name:</strong> {log.request_raised_by || "--"}</div>
                                  <div><strong>Emp Code:</strong> {log.request_raised_by_emp_code || "--"}</div>
                                </div>
                              ) : (
                                <span className={plantStyles.noData}>--</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
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
    </div>
  );
};

export default ActiveUserLog;