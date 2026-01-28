import React, { useEffect,useCallback } from "react";
import { usePlantContext } from "../Plant/PlantContext";
import styles from "./PlantMasterTable.module.css";
import paginationStyles from "../../styles/Pagination.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { FaRegClock } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { fetchPlantActivityLogs } from "../../utils/api";
import { useAbility } from "../../context/AbilityContext";
import { useAuth } from "../../context/AuthContext";
import AppHeader from "../../components/Common/AppHeader";
import { PermissionGuard, PermissionButton } from "../../components/Common/PermissionComponents";
import { PERMISSIONS } from "../../constants/permissions";
import { usePermissions } from "../../context/PermissionContext";
import useAutoRefresh from "../../hooks/useAutoRefresh";

export interface ActivityLog {
  id?: number;
  sr_no?: number;
  action?: string;
  old_value?: string | null;
  new_value?: string | null;
  action_performed_by?: string | null;
  approve_status?: string | null;
  date_time_ist?: string | null;
  comments?: string | null;
}

const PlantMasterTable: React.FC = () => {
const { plants, deletePlant,refreshPlants  } = usePlantContext();
const [selectedPlantId, setSelectedPlantId] = React.useState<number | null>(null);
const [selectedRow, setSelectedRow] = React.useState<number | null>(null);
const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 10;
  const [approverFilter, setApproverFilter] = React.useState("");
  const [activityPlant, setActivityPlant] = React.useState<{
    name: string;
    logs: ActivityLog[];
  } | null>(null);
  const [showFilterPopover, setShowFilterPopover] = React.useState(false);
  const [filterColumn, setFilterColumn] = React.useState("name");
  const [filterValue, setFilterValue] = React.useState("");
  const [tempFilterColumn, setTempFilterColumn] = React.useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = React.useState(filterValue);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { can } = useAbility();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
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

  const filteredData = plants.filter((plant) => {
    if (!filterValue.trim()) return true;
    const value = filterValue.toLowerCase();
    switch (filterColumn) {
      case "name":
        return plant.name?.toLowerCase().includes(value);
      case "description":
        return plant.description?.toLowerCase().includes(value);
      case "location":
        return plant.location?.toLowerCase().includes(value);
      case "status":
        return plant.status?.toLowerCase().includes(value);
      default:
        return true;
    }
  });

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterValue]);
const refreshCallback = useCallback(() => {
  console.log("[PlantMaster] 🔄 Auto refreshing plants...");
  refreshPlants();
}, [refreshPlants]);

useAutoRefresh(refreshCallback);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const selectedPlant =
    selectedPlantId !== null
      ? filteredData.find((p: any) => p.id === selectedPlantId) || null
      : null;

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
    const fileName = `PlantMaster_${today.toISOString().split("T")[0]}.pdf`;
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
    doc.text("Plant Master", titleX, titleY);

    doc.setFontSize(9);
    doc.setTextColor(220, 230, 245);
    const exportedByName = (user && (user.name || user.username)) || "Unknown User";
    const exportedText = `Exported by: ${exportedByName}  On: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
    const textWidth = doc.getTextWidth(exportedText);
    doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);

    doc.setDrawColor(0, 82, 155);
    doc.setLineWidth(0.5);
    doc.line(0, headerHeight, pageWidth, headerHeight);

    const rows = filteredData.map((plant) => [
      plant.name ?? plant.plant_name ?? "-",
      plant.description ?? "-",
      plant.location ?? "-",
      plant.status ?? "-",
    ]);

    autoTable(doc, {
      head: [["Plant Name", "Description", "Location", "Status"]],
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
    if (!activityPlant) return;
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `PlantActivityLog_${yyyy}-${mm}-${dd}.pdf`;

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
    doc.text("Plant Activity Log", titleX, titleY);

    doc.setFontSize(9);
    doc.setTextColor(220, 230, 245);
    const exportedByName = (user && (user.name || user.username)) || "Unknown User";
    const exportedText = `Exported by: ${exportedByName}  On: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
    const textWidth = doc.getTextWidth(exportedText);
    doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);

    doc.setDrawColor(0, 82, 155);
    doc.setLineWidth(0.5);
    doc.line(0, headerHeight, pageWidth, headerHeight);

    const headers = [
      ["Action", "Old Value", "New Value", "Action Performed By", "Approval Status", "Date/Time (IST)", "Comments"],
    ];
    const rows = (activityPlant.logs || []).map((log: any) => {
      let oldVal: any = {};
      let newVal: any = {};
      try {
        oldVal = log.old_value ? JSON.parse(log.old_value) : {};
        newVal = log.new_value ? JSON.parse(log.new_value) : {};
      } catch {}
      return [
        log.action,
        `${oldVal.plant_name || ""} ${oldVal.description ? `(${oldVal.description})` : ""}`,
        `${newVal.plant_name || ""} ${newVal.description ? `(${newVal.description})` : ""}`,
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
      tableWidth: "auto",
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

  const confirmDelete = async () => {
    if (selectedPlantId === null) return;
    const idx = plants.findIndex((p: any) => p.id === selectedPlantId);
    if (idx === -1) return;
    await deletePlant(idx);
    setSelectedPlantId(null);
    setShowDeleteModal(false);
  };
const handleEdit = useCallback(() => {
      if (selectedPlantId === null) return;
      const app = filteredData[selectedPlantId];
      console.log("Editing plant:", selectedPlantId,app);
      if (!hasPermission(PERMISSIONS.PLANT.UPDATE)) {
        alert('You do not have permission to edit applications for this plant');
        return;
      }
      
      navigate(`/plant-master/edit/${selectedPlantId}`, {
        state: { applicationData: app, applicationIdx: selectedPlantId },
      });
       //navigate(`/vendor-information/edit/${selectedRow}`);
    }, [selectedPlantId, filteredData, navigate]);

    const handleDelete = useCallback(() => {
        if (selectedPlantId === null) return;
        const app = filteredData[selectedPlantId];
        
        if (!hasPermission(PERMISSIONS.DEPARTMENT.DELETE)) {
          alert('You do not have permission to delete applications for this plant');
          return;
        }
        
        setShowDeleteModal(true);
      }, [selectedPlantId, filteredData, hasPermission]);
  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Plant Master Management" />
      
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
             <PermissionGuard permission={PERMISSIONS.PLANT.CREATE}>
            <button
              className={styles.addBtn}
              onClick={() => navigate("/plant-master/add")}
              >
              + Add New Plant
            </button>
            </PermissionGuard>
            <button
              className={styles.filterBtn}
              onClick={() => setShowFilterPopover((prev) => !prev)}
              type="button"
            >
              🔍 Filter
            </button>
            <PermissionButton
              permission={PERMISSIONS.PLANT.UPDATE}
              className={styles.editBtn}
              disabled={selectedPlantId === null}
              onClick={handleEdit}
            >
              <FaEdit size={14} /> Edit
            </PermissionButton>

            <PermissionButton
              permission={PERMISSIONS.PLANT.DELETE}
              className={styles.deleteBtn}
              disabled={selectedPlantId === null}
              onClick={handleDelete}
            >
              <FaTrash size={14} /> Delete
            </PermissionButton>
            {/* <button
              className={styles.editBtn}
              onClick={() => {
                if (selectedPlant) {
                  const id = selectedPlant.id;
                  if (typeof id === "number") navigate(`/plant-master/edit/${id}`);
                }
              }}
              disabled={
                selectedPlantId === null ||
                !(selectedPlant && can("update", "plants", { plantId: selectedPlant?.id }))
              }
            >
              <FaEdit size={14} /> Edit
            </button>
            
            <button
              className={styles.deleteBtn}
              disabled={
                selectedPlantId === null ||
                !(selectedPlant && can("delete", "plants", { plantId: selectedPlant?.id }))
              }
              onClick={() => setShowDeleteModal(true)}
            >
              <FaTrash size={14} /> Delete
            </button> */}
            
            <button
              className={styles.exportBtn}
              onClick={handleExportPDF}
            >
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
                    <option value="name">Plant Name</option>
                    <option value="description">Description</option>
                    <option value="location">Location</option>
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
            <h2>Plant Master Records</h2>
            <span className={styles.recordCount}>{filteredData.length} Records</span>
          </div>
          
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}></th>
                  <th>Plant Name</th>
                  <th>Description</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Activity</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((plant, index) => {
                  const globalIndex = (currentPage - 1) * rowsPerPage + index;
                  return (
                    <tr
                      key={globalIndex}
                      onClick={() => setSelectedPlantId(plant.id ?? null)}
                      className={selectedPlantId === plant.id ? styles.selectedRow : ""}
                    >
                      <td>
                        <input
                          type="radio"
                          checked={selectedPlantId === plant.id}
                          onChange={() => setSelectedPlantId(plant.id ?? null)}
                        />
                      </td>
                      <td className={styles.plantName}>{plant.name ?? plant.plant_name ?? ""}</td>
                      <td>{plant.description ?? ""}</td>
                      <td>{plant.location ?? ""}</td>
                      <td>
                        <span className={plant.status === "INACTIVE" ? styles.statusInactive : styles.statusActive}>
                          {plant.status ?? ""}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className={styles.activityBtn}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const plantName = plant.name ?? "";
                            setApproverFilter("");
                            setActivityPlant({ name: plantName, logs: [] });
                            setShowActivityModal(true);

                            try {
                              const allLogs = (await fetchPlantActivityLogs()) as any[];
                              const filteredByPlant = (allLogs || []).filter((log: any) => {
                                try {
                                  const oldVal = log.old_value ? JSON.parse(log.old_value) : {};
                                  const newVal = log.new_value ? JSON.parse(log.new_value) : {};
                                  return oldVal.plant_name === plantName || newVal.plant_name === plantName;
                                } catch {
                                  return false;
                                }
                              }) as ActivityLog[];

                              const logMap = new Map<string, ActivityLog>();
                              filteredByPlant.forEach((log) => {
                                const key = log.id
                                  ? `id-${log.id}`
                                  : `action-${log.action}-by-${log.action_performed_by}-old-${log.old_value}-new-${log.new_value}`;
                                if (!logMap.has(key)) logMap.set(key, log);
                              });

                              setActivityPlant({
                                name: plantName,
                                logs: Array.from(logMap.values()),
                              });
                            } catch (err) {
                              console.error(err);
                              setActivityPlant({ name: plantName, logs: [] });
                            }
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
        name={selectedPlant ? selectedPlant.name ?? "plant" : "plant"}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
      />

      {showActivityModal && activityPlant && (
        <div className={styles.modalOverlay}>
          <div className={styles.activityModal}>
            <div className={styles.modalHeader}>
              <h3>Activity Log - {activityPlant.name}</h3>
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
                    {(activityPlant.logs || [])
                      .filter((log) => {
                        const performedBy = String(log.action_performed_by ?? "").toLowerCase();
                        const filter = approverFilter.toLowerCase();
                        return performedBy.includes(filter);
                      })
                      .map((log, i) => {
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
                              {oldVal.plant_name || ""}{" "}
                              {oldVal.description ? `(${oldVal.description})` : ""}
                            </td>
                            <td>
                              {newVal.plant_name || ""}{" "}
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

export default PlantMasterTable;