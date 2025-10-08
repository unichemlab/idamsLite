import React, { useState, useEffect } from "react";
import styles from "./UserRequestTable.module.css";
import ProfileIconWithLogout from "./ProfileIconWithLogout";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import { fetchUserRequests } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Task {
  application_equip_id: string;
  transaction_id: string;
  department: string;
  role: string;
  location: string;
  reports_to: string;
  task_status: string;
}

interface UserRequest {
  id: number;
  transaction_id?: string;
  request_for_by?: string;
  name?: string;
  employeeCode?: string;
  location?: string;
  accessType?: string;
  trainingStatus?: "Yes" | "No";
  attachmentName?: string;
  vendorFirm?: string[];
  vendorCode?: string[];
  vendorName?: string[];
  allocatedId?: string[];
  status?: string;
  tasks?: Task[];
}

const UserRequestTable: React.FC = () => {
  const [userrequests, setUserRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalTasks, setModalTasks] = useState<Task[] | null>(null);
    // Filter state
    const [showFilterPopover, setShowFilterPopover] = React.useState(false);
    const [filterColumn, setFilterColumn] = React.useState("name");
    const [filterValue, setFilterValue] = React.useState("");
    const [tempFilterColumn, setTempFilterColumn] = React.useState(filterColumn);
    const [tempFilterValue, setTempFilterValue] = React.useState(filterValue);
    const popoverRef = React.useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchUserRequests();
        console.log("data", data);
        const mappedData: UserRequest[] = data.map((req: any) => ({
          id: req.id,
          transaction_id: req.transaction_id,
          request_for_by: req.request_for_by,
          name: req.name,
          employeeCode: req.employee_code,
          location: req.employee_location,
          accessType: req.access_request_type,
          trainingStatus: req.training_status,
          attachmentName: req.training_attachment_name,
          vendorFirm: req.vendor_firm ? [req.vendor_firm] : [],
          vendorCode: req.vendor_code ? [req.vendor_code] : [],
          vendorName: req.vendor_name ? [req.vendor_name] : [],
          allocatedId: req.vendor_allocated_id ? [req.vendor_allocated_id] : [],
          status: req.status,
          tasks: req.tasks?.map((t: any) => ({
            transaction_id: t.transaction_id,
            application_equip_id: t.application_name,
            department: t.department_name,
            role: t.role_name,
            location: t.location,
            reports_to: t.reports_to,
            task_status: t.task_status,
          })),
        }));
        setUserRequests(mappedData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    load();
  }, []);




  const openTaskModal = (tasks?: Task[]) => {
    if (!tasks) return;
    setModalTasks(tasks);
  };

  const closeTaskModal = () => setModalTasks(null);

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const fileName = `UserRequests_${today.toISOString().split("T")[0]}.pdf`;

    doc.setFontSize(18);
    doc.text("User Requests", 14, 18);

    let startY = 28;

    userrequests.forEach((req) => {
      autoTable(doc, {
        head: [
          [
            "Transaction ID",
            "Request For By",
            "Name",
            "Employee Code",
            "Employee Location",
            "Access Request Type",
            "Training Status",
            "Training Attachment",
            "Vendor Firm",
            "Vendor Code",
            "Vendor Name",
            "Vendor Allocated ID",
            "Status",
          ],
        ],
        body: [
          [
            req.transaction_id || "-",
            req.request_for_by || "-",
            req.name || "-",
            req.employeeCode || "-",
            req.location || "-",
            req.accessType || "-",
            req.trainingStatus || "-",
            req.attachmentName ? `Download ${req.attachmentName}` : "-",
            req.vendorFirm?.join(", ") || "-",
            req.vendorCode?.join(", ") || "-",
            req.vendorName?.join(", ") || "-",
            req.allocatedId?.join(", ") || "-",
            req.status || "-",
          ],
        ],
        startY,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [11, 99, 206], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 245, 255] },
        margin: { left: 14, right: 14 },
      });

      startY += 10;

      if (req.tasks && req.tasks.length > 0) {
        autoTable(doc, {
          head: [
            [
              "Transcation ID",
              "Application / Equip ID",
              "Department",
              "Role",
              "Location",
              "Reports To",
              "Task Status",
            ],
          ],
          body: req.tasks.map((t) => [
            t.transaction_id || "-",
            t.application_equip_id || "-",
            t.department || "-",
            t.role || "-",
            t.location || "-",
            t.reports_to || "-",
            t.task_status || "-",
          ]),
          startY,
          styles: { fontSize: 10, cellPadding: 3 },
          headStyles: { fillColor: [0, 118, 255], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 250, 255] },
          margin: { left: 14, right: 14 },
        });
        startY += (req.tasks.length + 1) * 8;
      }

      startY += 8;
    });

    doc.save(fileName);
  };

  if (loading) return <p>Loading user requests...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
     <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>User Access Managemant</h2>
        <div className={styles["header-icons"]}>
          <span className={styles["header-icon"]}><NotificationsIcon fontSize="small" /></span>
          <span className={styles["header-icon"]}><SettingsIcon fontSize="small" /></span>
          <ProfileIconWithLogout />
        </div>
      </header>
      <div className={styles.headerTopRow}>
              <div className={styles.actionHeaderRow}>
                <button
                  onClick={() => setShowFilterPopover(!showFilterPopover)}
                 className={styles.filterBtn}
                >
                  Filter
                </button>
                <button onClick={handleExportPDF} className={`${styles.btn} ${styles.exportPdfBtn}`}
            aria-label="Export table to PDF">
                  🗎 Export PDF
                </button>
      
                {showFilterPopover && (
                  <div className={styles.filterPopover} ref={popoverRef}>
                    <div className={styles.filterPopoverHeader}>Advanced Filter</div>
                    <div className={styles.filterPopoverBody}>
                      <div className={styles.filterFieldRow}>
                        <label className={styles.filterLabel}>Column</label>
                        <select
                          className={styles.filterDropdown}
                          value={tempFilterColumn}
                          onChange={(e) =>
                            setTempFilterColumn(e.target.value as keyof UserRequest)
                          }
                        >
                          {Object.keys(userrequests[0] || {}).map((col) => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.filterFieldRow}>
                        <label className={styles.filterLabel}>Value</label>
                        <input
                          className={styles.filterInput}
                          type="text"
                          placeholder="Enter filter value"
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
                         // setCurrentPage(1);
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
                        //  setCurrentPage(1);
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
        <div  style={{
            maxHeight: 380,
            overflowY: "auto",
            borderRadius: 8,
            boxShadow: "0 0 4px rgba(0, 0, 0, 0.05)",
            border: "1px solid #e2e8f0",
            marginTop: "11px",
            height: "100",
          }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Request For By</th>
                <th>Name</th>
                <th>Employee Code</th>
                <th>Employee Location</th>
                <th>Access Request Type</th>
                <th>Training Status</th>
                <th>Training Attachment</th>
                <th>Vendor Firm</th>
                <th>Vendor Code</th>
                <th>Vendor Name</th>
                <th>Vendor Allocated ID</th>
                <th>Status</th>
                <th>Tasks</th>
              </tr>
            </thead>
            <tbody>
              {userrequests.map((req) => (
                <tr key={req.id}>
                  <td>{req.transaction_id || "-"}</td>
                  <td>{req.request_for_by || "-"}</td>
                  <td>{req.name || "-"}</td>
                  <td>{req.employeeCode || "-"}</td>
                  <td>{req.location || "-"}</td>
                  <td>{req.accessType || "-"}</td>
                  <td>{req.trainingStatus || "-"}</td>
                  <td>
                    {req.attachmentName ? (
                      <a
                        href={`http://localhost:4000/uploads/${req.attachmentName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{req.vendorFirm?.join(", ") || "-"}</td>
                  <td>{req.vendorCode?.join(", ") || "-"}</td>
                  <td>{req.vendorName?.join(", ") || "-"}</td>
                  <td>{req.allocatedId?.join(", ") || "-"}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${req.status === "Pending"
                          ? styles.pending
                          : req.status === "Approved"
                            ? styles.approved
                            : styles.rejected
                        }`}
                    >
                      {req.status || "-"}
                    </span>
                  </td>
                  <td>
                    <button
                      className={styles.taskDetailsBtn}
                      onClick={() => openTaskModal(req.tasks)}
                    >
                      View Tasks ({req.tasks?.length || 0})
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalTasks && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Task Details</h3>
            <button className={styles.closeModalBtn} onClick={closeTaskModal}>
              ×
            </button>
            <table className={styles.modalTable}>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Application / Equip ID</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Reports To</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {modalTasks.map((task, idx) => (
                  <tr key={idx}>
                    <td>{task.transaction_id}</td>
                    <td>{task.application_equip_id}</td>
                    <td>{task.department}</td>
                    <td>{task.role}</td>
                    <td>{task.location}</td>
                    <td>{task.reports_to}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${task.task_status === "Pending"
                            ? styles.pending
                            : task.task_status === "Approved"
                              ? styles.approved
                              : styles.rejected
                          }`}
                      >
                        {task.task_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRequestTable;
