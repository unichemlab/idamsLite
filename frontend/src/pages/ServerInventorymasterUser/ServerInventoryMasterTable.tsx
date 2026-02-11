import React, { useState, useRef, useContext,useMemo,useCallback } from "react";
import styles from "../Plant/PlantMasterTable.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import { ServerContext } from "../ServerInventorymasterUser/ServerContext";
import unichemLogoBase64 from "../../assets/unichemLogoBase64";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { useAuth } from "../../context/AuthContext";
import AppHeader from "../../components/Common/AppHeader";
import {filterByModulePlantPermission } from "../../utils/permissionUtils";
import { PermissionGuard, PermissionButton } from "../../components/Common/PermissionComponents";
import { PERMISSIONS } from "../../constants/permissions";
import { usePermissions } from "../../context/PermissionContext";
import useAutoRefresh from "../../hooks/useAutoRefresh";

const ServerInventoryMasterTable: React.FC = () => {
  const serverCtx = useContext(ServerContext);
  const servers = serverCtx?.servers ?? [];
  const refreshServers = serverCtx?.refreshServers ?? [];
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [filterColumn, setFilterColumn] = useState("host_name");
  const [filterValue, setFilterValue] = useState("");
  const [tempFilterColumn, setTempFilterColumn] = useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = useState(filterValue);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const { user } = useAuth();

  // Fetch servers from backend
  // Removed direct fetch; data comes from context
 // Filter by plant permissions first
  const permissionFilteredData = useMemo(() => {
    return filterByModulePlantPermission(servers,user,"server_master");
  }, [servers, user]);

    const filteredData = useMemo(() => {
        return permissionFilteredData.filter((server) => {
          if (!filterValue.trim()) return true;
          const value = filterValue.toLowerCase();
          switch (filterColumn) {
      case "host_name":
        return server.host_name
          ? server.host_name.toLowerCase().includes(value)
          : false;
      case "remarks":
        return server.remarks
          ? server.remarks.toLowerCase().includes(value)
          : false;
      case "status":
        return server.status?.toLowerCase().includes(value);
      default:
        return true;
    }
        });
      }, [permissionFilteredData, filterValue, filterColumn]);

const refreshCallback = useCallback(() => {
  if (typeof refreshServers !== "function") return;

  console.log("[ServerMaster] 🔄 Auto refreshing servers...");
  refreshServers();
}, [refreshServers]);


useAutoRefresh(refreshCallback);


  // PDF Export Handler
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
    const fileName = `ServerMaster_${today.toISOString().split("T")[0]}.pdf`;

    // --- HEADER BAR ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMargin = 14;
    const headerHeight = 28;
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
        doc.addImage(img, "PNG", pageMargin, logoY, logoWidth, logoHeight);
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

    // Title + Exported by/date
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titleX = pageMargin + logoWidth + 10;
    const titleY = headerHeight / 2 + 5;
    doc.text("Server Master", titleX, titleY);

    doc.setFontSize(9);
    doc.setTextColor(220, 230, 245);
    const exportedByName =
      (user && (user.name || user.username)) || "Unknown User";
    const exportedText = `Exported by: ${exportedByName}  On: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
    const textWidth = doc.getTextWidth(exportedText);
    doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);

    doc.setDrawColor(0, 82, 155);
    doc.setLineWidth(0.5);
    doc.line(0, headerHeight, pageWidth, headerHeight);

    // --- TABLE ---
    const headers = [
      [
        "Plant Location",
        "RACK NUMBER",
        "SERVER OWNER",
        "Type Tower / Rack mounted",
        "Server / RACK Location / Area",
        "Asset No.",
        "Host Name",
        "MAKE",
        "MODEL",
        "SERIAL NO.",
        "OS",
        "Physical Server Host Name",
        "IDRAC/ILO",
        "IP-ADDRESS",
        "Part No.",
        "APPLICATION",
        "Application Version",
        "Application OEM",
        "Application Vendor",
        "System Owner",
        "VM Display Name",
        "TYPE",
        "VM OS",
        "VM Version",
        "VM Server IP",
        "Domain Name",
        "Windows Activated",
        "Backup Agent",
        "Antivirus",
        "Category",
        "Current Status of Server",
        "Server Managed",
        "Remarks for Application usage pupose",
        "START DATE",
        "END DATE",
        "AGING",
        "Environment",
        "Server Critility",
        "Database/Application",
        "Current RPO",
        "Reduse RPO time from 24 Hrs",
        "Server to SO Timeline",
        "Purchased Date",
        "Purchased PO",
        "Warranty New Start Date",
        "AMC/Warranty Expiry date",
        "SAP Asset No.",
        "AMC Vendor",
        "Remarks If Any",
        "Status",
      ],
    ];
    const rows = filteredData.map((server) => [
      server.plant_location_id ?? "",
      server.rack_number ?? "",
      server.server_owner ?? "",
      server.type_tower_rack_mounted ?? "",
      server.server_rack_location_area ?? "",
      server.asset_no ?? "",
      server.host_name ?? "",
      server.make ?? "",
      server.model ?? "",
      server.serial_no ?? "",
      server.os ?? "",
      server.physical_server_host_name ?? "",
      server.idrac_ilo ?? "",
      server.ip_address ?? "",
      server.part_no ?? "",
      server.application ?? "",
      server.application_version ?? "",
      server.application_oem ?? "",
      server.application_vendor ?? "",
      server.system_owner ?? "",
      server.vm_display_name ?? "",
      server.vm_type ?? "",
      server.vm_os ?? "",
      server.vm_version ?? "",
      server.vm_server_ip ?? "",
      server.domain_workgroup ?? "",
      server.windows_activated ? "Yes" : "No",
      server.backup_agent ?? "",
      server.antivirus ?? "",
      server.category_gxp ?? "",
      server.current_status ?? "",
      server.server_managed_by ?? "",
      server.remarks_application_usage ?? "",
      server.start_date ?? "",
      server.end_date ?? "",
      server.aging ?? "",
      server.environment ?? "",
      server.server_critility ?? "",
      server.database_appplication ?? "",
      server.current_rpo ?? "",
      server.reduce_rpo_time ?? "",
      server.server_to_so_timeline ?? "",
      server.purchase_date ?? "",
      server.purchase_po ?? "",
      server.warranty_new_start_date ?? "",
      server.amc_warranty_expiry_date ?? "",
      server.sap_asset_no ?? "",
      server.amc_vendor ?? "",
      server.remarks ?? "",
      server.status ?? "",
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

  // Delete server handler
  const confirmDelete = async () => {
    if (selectedRow === null) return;
    const server = filteredData[selectedRow];
    if (!server) return;
    // Use context deleteServer if available
    if (serverCtx && serverCtx.deleteServer) {
      const idx = servers.findIndex((s) => s.id === server.id);
      if (idx !== -1) await serverCtx.deleteServer(idx);
    }
    setSelectedRow(null);
    setShowDeleteModal(false);
  };

  // Filter popover click outside handler
  React.useEffect(() => {
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
console.log("server data",servers);
  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Server Inventory Management" />
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
            <PermissionGuard permission={PERMISSIONS.SERVER.CREATE}>
            <button
              className={styles.addBtn}
              onClick={() => navigate("/server-master/add")}
            >
              + Add New
            </button>
            </PermissionGuard>
            <button
              className={styles.filterBtn}
              onClick={() => setShowFilterPopover((prev) => !prev)}
              type="button"
              aria-label="Filter servers"
            >
              🔍 Filter
            </button>
            <PermissionGuard permission={PERMISSIONS.SERVER.UPDATE}>
            <button
              className={`${styles.btn} ${styles.editBtn}`}
              onClick={() => {
                if (selectedRow !== null)
                  navigate(`/server-master/edit/${filteredData[selectedRow].id}`);
              }}
              disabled={selectedRow === null}
            >
              <FaEdit size={14} /> Edit
            </button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.SERVER.DELETE}>
            <button
              className={`${styles.btn} ${styles.deleteBtn}`}
              disabled={selectedRow === null}
              onClick={() => setShowDeleteModal(true)}
              title="Delete selected server"
            >
              <FaTrash size={14} /> Delete
            </button>
            </PermissionGuard>
            <button
              className={styles.exportBtn}
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
                <div className={styles.filterHeader}>Advanced Filter</div>
                <div className={styles.filterBody}>
                  <div className={styles.filterFieldRow}>
                    <label className={styles.filterLabel}>Column</label>
                    <select
                      className={styles.filterDropdown}
                      value={tempFilterColumn}
                      onChange={(e) => setTempFilterColumn(e.target.value)}
                    >
                      <option value="name">Server Name</option>
                      <option value="description">Description</option>
                      <option value="status">Status</option>
                    </select>
                  </div>
                  <div className={styles.filterFieldRow}>
                    <label className={styles.filterLabel}>Value</label>
                    <input
                      className={styles.filterInput}
                      type="text"
                      placeholder={`Enter ${tempFilterColumn.charAt(0).toUpperCase() +
                        tempFilterColumn.slice(1)
                        }`}
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
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2>Sever Inventory Records</h2>
            <span className={styles.recordCount}>{filteredData.length} Records</span>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                 <th style={{ width: '50px' }}></th>
                  {/* Removed Server Name, Status, Description, Transaction ID columns */}
                  <th>Plant Location</th>
                  <th>RACK NUMBER</th>
                  <th>SERVER OWNER</th>
                  <th>Mounted Type</th>
                  <th>Server / RACK Location / Area</th>
                  <th>Asset No.</th>
                  <th>Host Name</th>
                  <th>Make</th>
                  <th>Model</th>
                  <th>Serial No.</th>
                  <th>OS</th>
                  <th>Physical Server Host Name</th>
                  <th>IDRAC/ILO</th>
                  <th>IP-ADDRESS</th>
                  <th>Part No.</th>
                  <th>APPLICATION</th>
                  <th>Application Version</th>
                  <th>Application OEM</th>
                  <th>Application Vendor</th>
                  <th>System Owner</th>
                  <th>VM Display Name</th>
                  <th>TYPE</th>
                  <th>VM OS</th>
                  <th>VM Version</th>
                  <th>VM Server IP</th>
                  <th>Domain Name</th>
                  <th>Windows Activated</th>
                  <th>Backup Agent</th>
                  <th>Antivirus</th>
                  <th>Category</th>
                  <th>Current Status</th>
                  <th>Server Managed</th>
                  <th>Remarks for Application usage pupose</th>
                  <th>START DATE</th>
                  <th>END DATE</th>
                  <th>AGING</th>
                  <th>Environment</th>
                  <th>Server Critility</th>
                  <th>Database/Application</th>
                  <th>Current RPO</th>
                  <th>Reduse RPO time from 24 Hrs</th>
                  <th>Server to SO Timeline</th>
                  <th>Purchased Date</th>
                  <th>Purchased PO</th>
                  <th>Warranty New Start Date</th>
                  <th>AMC/Warranty Expiry date</th>
                  <th>SAP Asset No.</th>
                  <th>AMC Vendor</th>
                  <th>Remarks If Any</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((server, index) => (
                  <tr
                    key={server.id}
                    onClick={() => setSelectedRow(index)}
                    style={{
                      background: selectedRow === index ? "#f0f4ff" : undefined,
                    }}
                  >
                    <td>
                      <input
                        type="radio"
                        className={styles.radioInput}
                        checked={selectedRow === index}
                        onChange={() => setSelectedRow(index)}
                      />
                    </td>
                    {/* Removed Server Name, Status, Description, Transaction ID cells */}
                    <td>{server.plant_name}</td>
                    <td>{server.rack_number}</td>
                    <td>{server.server_owner}</td>
                    <td>{server.type_tower_rack_mounted}</td>
                    <td>{server.server_rack_location_area}</td>
                    <td>{server.asset_no}</td>
                    <td>{server.host_name}</td>
                    <td>{server.make}</td>
                    <td>{server.model}</td>
                    <td>{server.serial_no}</td>

                    <td>{server.os}</td>
                    <td>{server.physical_server_host_name}</td>
                    <td>{server.idrac_ilo}</td>
                    <td>{server.ip_address}</td>

                    <td>{server.part_no}</td>
                    <td>{server.application}</td>
                    <td>{server.application_version}</td>
                    <td>{server.application_oem}</td>
                    <td>{server.application_vendor}</td>
                    <td>{server.system_owner}</td>
                    <td>{server.vm_display_name}</td>
                    <td>{server.vm_type}</td>
                    <td>{server.vm_os}</td>
                    <td>{server.vm_version}</td>
                    <td>{server.vm_server_ip}</td>
                    <td>{server.domain_workgroup}</td>
                    <td>{server.windows_activated ? "Yes" : "No"}</td>
                    <td>{server.backup_agent}</td>
                    <td>{server.antivirus}</td>
                    <td>{server.category_gxp}</td>
                    <td>{server.current_status}</td>

                    <td>{server.server_managed_by}</td>
                    <td>{server.remarks_application_usage}</td>
                    <td>{server.start_date}</td>
                    <td>{server.end_date}</td>
                    <td>{server.aging}</td>
                    <td>{server.environment}</td>
                    <td>{server.server_critility}</td>

                    <td>{server.database_appplication}</td>
                    <td>{server.current_rpo}</td>
                    <td>{server.reduce_rpo_time}</td>
                    <td>{server.server_to_so_timeline}</td>
                    <td>{server.purchase_date}</td>
                    <td>{server.purchase_po}</td>

                    <td>{server.warranty_new_start_date}</td>
                    <td>{server.amc_warranty_expiry_date}</td>
                    <td>{server.sap_asset_no}</td>

                    <td>{server.amc_vendor}</td>
                    <td>{server.remarks}</td>
                    <td>{server.status}</td>
                  </tr>
                ))}
                <ConfirmDeleteModal
                  open={showDeleteModal}
                  name={
                    selectedRow !== null && filteredData[selectedRow]
                      ? filteredData[selectedRow].host_name ?? "server"
                      : "server"
                  }
                  onCancel={() => setShowDeleteModal(false)}
                  onConfirm={confirmDelete}
                />
              </tbody>
            </table>
          </div>
          </div>
        </div>
      </div>
      );
};

      export default ServerInventoryMasterTable;
