import React, { useEffect, useRef } from "react";
import { FaTrash, FaRegClock, FaEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { fetchDepartmentActivityLogs } from "../../utils/api";
import { useDepartmentContext } from "../../pages/DepartmentMaster/DepartmentContext";
import styles from "./DepartmentTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import AppHeader from "../../components/Common/AppHeader";
import { useAuth } from "../../context/AuthContext";

const DepartmentMasterTable: React.FC = () => {
  const { departments, deleteDepartment } = useDepartmentContext();
  const [selectedRow, setSelectedRow] = React.useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 10;
  const [activityDepartment, setActivityDepartment] = React.useState<any>(null);
  const [approverFilter, setApproverFilter] = React.useState("");
  const [showFilterPopover, setShowFilterPopover] = React.useState(false);
  const [filterColumn, setFilterColumn] = React.useState("name");
  const [filterValue, setFilterValue] = React.useState("");
  const [tempFilterColumn, setTempFilterColumn] = React.useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = React.useState(filterValue);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!showFilterPopover) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowFilterPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilterPopover]);

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

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterValue]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  const paginatedData = filteredData.slice(
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

  const handleExportPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const fileName = `DepartmentMaster_${today.toISOString().split("T")[0]}.pdf`;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMargin = 14;
    const headerHeight = 28;

    doc.setFillColor(0, 82, 155);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

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

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titleX = pageMargin + logoWidth + 10;
    const titleY = headerHeight / 2 + 5;
    doc.text("Department Master", titleX, titleY);

    doc.setFontSize(9);
    doc.setTextColor(220, 230, 245);
    const exportedByName = (user && (user.name || user.username)) || "Unknown User";
    const exportedText = `Exported by: ${exportedByName}  On: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
    const textWidth = doc.getTextWidth(exportedText);
    doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);

    doc.setDrawColor(0, 82, 155);
    doc.setLineWidth(0.5);
    doc.line(0, headerHeight, pageWidth, headerHeight);

    const headers = [["Department Name", "Description", "Status"]];
    const rows = filteredData.map((department) => [
      department.name ?? "",
      department.description ?? "",
      department.status ?? "",
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: headerHeight + 8,
      styles: { fontSize: 9, cellPadding: 3, textColor: 80 },
      headStyles: {
        fillColor: [11, 99, 206],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      margin: { left: pageMargin, right: pageMargin },
    });

    const pageCount = (doc as any).internal.getNumberOfPages?.() || 1;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(pageMargin, pageHeight - 15, pageWidth - pageMargin, pageHeight - 15);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Unichem Laboratories", pageMargin, pageHeight - 10);
    doc.text(`Page 1 of ${pageCount}`, pageWidth - pageMargin - 25, pageHeight - 10);

    doc.save(fileName);
  };

  const handleExportActivityPDF = async () => {
    if (!activityDepartment) return;
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const fileName = `DepartmentActivityLog_${today.toISOString().split("T")[0]}.pdf`;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMargin = 14;
    const headerHeight = 28;

    doc.setFillColor(0, 82, 155);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

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

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titleX = pageMargin + logoWidth + 10;
    const titleY = headerHeight / 2 + 5;
    doc.text("Department Activity Log", titleX, titleY);

    doc.setFontSize(9);
    doc.setTextColor(220, 230, 245);
    const exportedByName = (user && (user.name || user.username)) || "Unknown User";
    const exportedText = `Exported by: ${exportedByName}  On: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
    const textWidth = doc.getTextWidth(exportedText);
    doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);

    doc.setDrawColor(0, 82, 155);
    doc.setLineWidth(0.5);
    doc.line(0, headerHeight, pageWidth, headerHeight);

    const headers = [["Action", "Old Value", "New Value", "Action Performed By", "Approval Status", "Date/Time (IST)", "Comments"]];
    const rows = (activityDepartment.logs || []).map((log: any) => {
      let oldVal: any = {};
      let newVal: any = {};
      try {
        oldVal = log.old_value ? JSON.parse(log.old_value) : {};
        newVal = log.new_value ? JSON.parse(log.new_value) : {};
      } catch {}
      return [
        log.action,
        `${oldVal.department_name || ""} ${oldVal.description ? `(${oldVal.description})` : ""}`,
        `${newVal.department_name || ""} ${newVal.description ? `(${newVal.description})` : ""}`,
        log.action_performed_by ?? "",
        log.approve_status ?? "",
        log.date_time_ist ? new Date(log.date_time_ist).toLocaleString() : "",
        log.comments ?? "",
      ];
    });

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: headerHeight + 8,
      styles: { fontSize: 8, cellPadding: 3, halign: "left", valign: "middle", textColor: 80 },
      headStyles: {
        fillColor: [11, 99, 206],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      margin: { left: pageMargin, right: pageMargin },
    });

    const pageCount = (doc as any).internal.getNumberOfPages?.() || 1;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(pageMargin, pageHeight - 15, pageWidth - pageMargin, pageHeight - 15);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Unichem Laboratories", pageMargin, pageHeight - 10);
    doc.text(`Page 1 of ${pageCount}`, pageWidth - pageMargin - 25, pageHeight - 10);

    doc.save(fileName);
  };

  const filterLogsForDepartment = (logs: any[], departmentName: string) => {
    return logs.filter((log) => {
      try {
        const oldVal = log.old_value ? JSON.parse(log.old_value) : {};
        const newVal = log.new_value ? JSON.parse(log.new_value) : {};
        return oldVal.department_name === departmentName || newVal.department_name === departmentName;
      } catch {
        return false;
      }
    });
  };

  const confirmDelete = async () => {
    if (selectedRow === null) return;
    if (!filteredData[selectedRow]) return;
    await deleteDepartment(filteredData[selectedRow].id);
    setSelectedRow(null);
    setShowDeleteModal(false);
  };

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Department Master Management" />

      <div className={styles.contentArea}>
        <div className={styles.controlPanel}>
          <div className={styles.actionRow}>
            <button
              className={styles.addBtn}
              onClick={() => navigate("/department-master/add")}
            >
              + Add New Department
            </button>

            <button
              className={styles.filterBtn}
              onClick={() => setShowFilterPopover((prev) => !prev)}
              type="button"
            >
              🔍 Filter
            </button>

            <button
              className={styles.editBtn}
              onClick={() => {
                if (selectedRow !== null && filteredData[selectedRow])
                  navigate(`/department-master/edit/${filteredData[selectedRow].id}`);
              }}
              disabled={selectedRow === null}
            >
              <FaEdit size={14} /> Edit
            </button>

            <button
              className={styles.deleteBtn}
              disabled={selectedRow === null}
              onClick={() => setShowDeleteModal(true)}
            >
              <FaTrash size={14} /> Delete
            </button>

            <button className={styles.exportBtn} onClick={handleExportPDF}>
              📄 Export PDF
            </button>
          </div>

          {showFilterPopover && (
            <div className={styles.filterPopover} ref={popoverRef}>
              <div className={styles.filterHeader}>Advanced Filter</div>
              <div className={styles.filterBody}>
                <div className={styles.filterField}>
                  <label>Column</label>
                  <select
                    value={tempFilterColumn}
                    onChange={(e) => setTempFilterColumn(e.target.value)}
                  >
                    <option value="name">Department Name</option>
                    <option value="description">Description</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                <div className={styles.filterField}>
                  <label>Value</label>
                  <input
                    type="text"
                    placeholder={`Enter ${tempFilterColumn}`}
                    value={tempFilterValue}
                    onChange={(e) => setTempFilterValue(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.filterFooter}>
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
            <h2>Department Master Records</h2>
            <span className={styles.recordCount}>{filteredData.length} Records</span>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}></th>
                  <th>Department Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Activity</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((department, index) => {
                  const globalIndex = (currentPage - 1) * rowsPerPage + index;
                  return (
                    <tr
                      key={globalIndex}
                      onClick={() => setSelectedRow(globalIndex)}
                      className={selectedRow === globalIndex ? styles.selectedRow : ""}
                    >
                      <td>
                        <input
                          type="radio"
                          className={styles.radioInput}
                          checked={selectedRow === globalIndex}
                          onChange={() => setSelectedRow(globalIndex)}
                        />
                      </td>
                      <td className={styles.deptName}>{department.name ?? ""}</td>
                      <td>{department.description ?? ""}</td>
                      <td>
                        <span className={department.status === "INACTIVE" ? styles.statusInactive : styles.statusActive}>
                          {department.status ?? ""}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className={styles.activityBtn}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setApproverFilter("");
                            try {
                              const logs = await fetchDepartmentActivityLogs();
                              const filtered = filterLogsForDepartment(logs, department.name ?? "");
                              setActivityDepartment({ name: department.name ?? "", logs: filtered });
                            } catch (err) {
                              setActivityDepartment({ name: department.name ?? "", logs: [] });
                            }
                            setShowActivityModal(true);
                          }}
                        >
                          <FaRegClock size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
        </div>
      </div>

      <ConfirmDeleteModal
        open={showDeleteModal}
        name={selectedRow !== null && filteredData[selectedRow] ? filteredData[selectedRow].name ?? "department" : "department"}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
      />

      {showActivityModal && activityDepartment && (
        <div className={styles.modalOverlay}>
          <div className={styles.activityModal}>
            <div className={styles.modalHeader}>
              <h3>Activity Log - {activityDepartment.name}</h3>
              <div className={styles.modalActions}>
                <button onClick={handleExportActivityPDF} className={styles.exportModalBtn}>
                  📄 Export PDF
                </button>
                <button onClick={() => setShowActivityModal(false)} className={styles.closeBtn}>
                  ×
                </button>
              </div>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.filterRow}>
                <input
                  type="text"
                  placeholder="Filter by Approved/Rejected By"
                  value={approverFilter}
                  onChange={(e) => setApproverFilter(e.target.value)}
                  className={styles.filterInput}
                />
              </div>

              <div className={styles.activityTableContainer}>
                <table className={styles.activityTable}>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Old Value</th>
                      <th>New Value</th>
                      <th>Performed By</th>
                      <th>Status</th>
                      <th>Date/Time</th>
                      <th>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activityDepartment.logs || [])
                      .filter((log: any) => {
                        if (!approverFilter) return true;
                        return (log.action_performed_by ?? "")
                          .toLowerCase()
                          .includes(approverFilter.toLowerCase());
                      })
                      .map((log: any, i: number) => {
                        let oldVal: any = {};
                        let newVal: any = {};
                        try {
                          oldVal = log.old_value ? JSON.parse(log.old_value) : {};
                          newVal = log.new_value ? JSON.parse(log.new_value) : {};
                        } catch {}
                        return (
                          <tr key={i}>
                            <td>{log.action}</td>
                            <td>
                              {oldVal.department_name || ""}{" "}
                              {oldVal.description ? `(${oldVal.description})` : ""}
                            </td>
                            <td>
                              {newVal.department_name || ""}{" "}
                              {newVal.description ? `(${newVal.description})` : ""}
                            </td>
                            <td>{log.action_performed_by ?? ""}</td>
                            <td>{log.approve_status ?? ""}</td>
                            <td>
                              {log.date_time_ist ? new Date(log.date_time_ist).toLocaleString() : ""}
                            </td>
                            <td>{log.comments ?? ""}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentMasterTable;