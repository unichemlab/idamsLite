// src/pages/NetworkMaster/NetworkMasterTable.tsx

import React, { useState, useRef, useContext, useMemo } from "react";
import paginationStyles from "../../styles/Pagination.module.css";
import { FaEdit, FaTrash, FaRegClock } from "react-icons/fa";
import { fetchActivityLog } from "../../utils/api";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import { NetworkContext, Network } from "../../context/NetworkContext";
import unichemLogoBase64 from "../../assets/unichemLogoBase64";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { useAuth } from "../../context/AuthContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/PlantMasterTable.module.css";
import { filterByModulePlantPermission } from "../../utils/permissionUtils";
import { PermissionGuard, PermissionButton } from "../../components/Common/PermissionComponents";
import { PERMISSIONS } from "../../constants/permissions";
import { usePermissions } from "../../context/PermissionContext";
import useAutoRefresh from "../../hooks/useAutoRefresh";

const NetworkMasterTable: React.FC = () => {
  const networkCtx = useContext(NetworkContext);
const networks = networkCtx?.networks ?? [];
const refreshNetworks = networkCtx?.refreshNetworks;

  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [filterColumn, setFilterColumn] = useState("host_name");
  const [filterValue, setFilterValue] = useState("");
  const [tempFilterColumn, setTempFilterColumn] = useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = useState(filterValue);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLogsNetwork, setActivityLogsNetwork] = useState<any>(null);
  const { user } = useAuth();

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 10;

  // Reset page and selection when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedRow(null);
  }, [filterValue, filterColumn]);

  const permissionFilteredData = useMemo(() => {
    return filterByModulePlantPermission(networks, user, "network");
  }, [networks, user]);

  // Filtering logic
  const filteredData = useMemo(() => {
    return permissionFilteredData.filter((network) => {
      if (!filterValue.trim()) return true;
      const value = filterValue.toLowerCase();
      switch (filterColumn) {
        case "host_name":
          return network.host_name?.toLowerCase().includes(value);
        case "device_ip":
          return network.device_ip?.toLowerCase().includes(value);
        case "status":
          return network.status?.toLowerCase().includes(value);
        default:
          return true;
      }
    });
  }, [permissionFilteredData, filterValue, filterColumn]);
const refreshCallback = React.useCallback(() => {
  if (!refreshNetworks) return;
  console.log("[NetworkMaster] 🔄 Auto refreshing networks...");
  refreshNetworks();
}, [refreshNetworks]);

useAutoRefresh(refreshCallback);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
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

  // PDF Export Handler

const handleExportPDF = async () => {
  const doc = new jsPDF({ orientation: "portrait", format: 'a4' });
  const today = new Date();
  const fileName = `NetworkMaster_${today.toISOString().split("T")[0]}.pdf`;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageMargin = 5; // Minimal margin
  const headerHeight = 12;

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
      const maxLogoHeight = headerHeight * 0.55;
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
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  const titleX = pageMargin + logoWidth + 6;
  const titleY = headerHeight / 2 + 3;
  doc.text("Network Master", titleX, titleY);

  // Export info
  doc.setFontSize(7);
  doc.setTextColor(220, 230, 245);
  const exportedByName = (user && (user.name || user.username)) || "Unknown User";
  const exportedText = `By: ${exportedByName} | ${today.toLocaleDateString()}`;
  const textWidth = doc.getTextWidth(exportedText);
  doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);

  // Header line
  doc.setDrawColor(0, 82, 155);
  doc.setLineWidth(0.5);
  doc.line(0, headerHeight, pageWidth, headerHeight);

  // Table headers - Highly abbreviated for portrait mode
  const headers = [[
    "Plant",
    "Area",
    "Rack",
    "Host",
    "IP",
    "Type",
    "Model",
    "Vendor",
    "Pwr",
    "Trunk",
    "Stk",
    "Stk Info",
    "Nbr IP",
    "Nbr Prt",
    "SFP",
    "POE",
    "Serial",
    "IOS",
    "Uptime",
    "Verify",
    "PO",
    "P.Date",
    "P.Vendor",
    "SAP",
    "Svc",
    "Warr",
    "AMC Exp",
    "AMC",
    "AMC V",
    "Remarks",
    "Status"
  ]];

  // Table rows - format dates properly
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const d = date.getDate().toString().padStart(2, '0');
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear().toString().slice(-2);
      return `${d}/${m}/${y}`;
    } catch {
      return dateStr || "-";
    }
  };

  const rows = filteredData.map((network) => [
    network.plant_name || "-",
    network.area || "-",
    network.rack || "-",
    network.host_name || "-",
    network.device_ip || "-",
    network.device_type || "-",
    network.device_model || "-",
    network.make_vendor || "-",
    network.dual_power_source || "-",
    network.trunk_port || "-",
    network.stack || "-",
    network.stack_switch_details || "-",
    network.neighbor_switch_ip || "-",
    network.neighbor_port || "-",
    network.sfp_fiber_tx || "-",
    network.poe_non_poe || "-",
    network.serial_no || "-",
    network.ios_version || "-",
    network.uptime || "-",
    formatDate(network.verify_date),
    network.purchased_po || "-",
    formatDate(network.purchased_date),
    network.purchase_vendor || "-",
    network.sap_asset_no || "-",
    network.service_type || "-",
    formatDate(network.warranty_start_date),
    formatDate(network.amc_warranty_expiry_date),
    network.under_amc || "-",
    network.amc_vendor || "-",
    network.remarks || "-",
    network.status || "-"
  ]);

  // Generate table - Portrait mode using full width
  autoTable(doc, {
    head: headers,
    body: rows,
    startY: headerHeight + 4,
    styles: { 
      fontSize: 6.2, // Slightly bigger font
      cellPadding: 1.3, 
      halign: "left", 
      valign: "middle", 
      textColor: 80,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    headStyles: { 
      fillColor: [11, 99, 206], 
      textColor: 255, 
      fontStyle: "bold", 
      fontSize: 6.8,
      halign: "center",
      valign: "middle",
      cellPadding: 1.3
    },
    alternateRowStyles: { 
      fillColor: [240, 245, 255] 
    },
    margin: { left: pageMargin, right: pageMargin, top: 4, bottom: 10 },
    tableWidth: "auto",
    columnStyles: {
      0: { cellWidth: 8 },     // Plant - increased
      1: { cellWidth: 6.5 },   // Area - increased
      2: { cellWidth: 5.5 },   // Rack - increased
      3: { cellWidth: 8.5 },   // Host - increased
      4: { cellWidth: 8 },     // IP - increased
      5: { cellWidth: 7 },     // Type - increased
      6: { cellWidth: 8 },     // Model - increased
      7: { cellWidth: 7.5 },   // Vendor - increased
      8: { cellWidth: 5 },     // Pwr - increased
      9: { cellWidth: 6 },     // Trunk - increased
      10: { cellWidth: 4.5 },  // Stk - increased
      11: { cellWidth: 8 },    // Stk Info - increased
      12: { cellWidth: 8 },    // Nbr IP - increased
      13: { cellWidth: 6.5 },  // Nbr Prt - increased
      14: { cellWidth: 4.5 },  // SFP - increased
      15: { cellWidth: 4.5 },  // POE - increased
      16: { cellWidth: 8 },    // Serial - increased
      17: { cellWidth: 5.5 },  // IOS - increased
      18: { cellWidth: 6.5 },  // Uptime - increased
      19: { cellWidth: 6.5 },  // Verify - increased
      20: { cellWidth: 7 },    // PO - increased
      21: { cellWidth: 6.5 },  // P.Date - increased
      22: { cellWidth: 7.5 },  // P.Vendor - increased
      23: { cellWidth: 7 },    // SAP - increased
      24: { cellWidth: 5.5 },  // Svc - increased
      25: { cellWidth: 6.5 },  // Warr - increased
      26: { cellWidth: 7 },    // AMC Exp - increased
      27: { cellWidth: 4.5 },  // AMC - increased
      28: { cellWidth: 6.5 },  // AMC V - increased
      29: { cellWidth: 8 },    // Remarks - increased
      30: { cellWidth: 6 },    // Status - increased
      31: { cellWidth: 6.5 },  // Created - increased
      32: { cellWidth: 6.5 },  // Updated - increased
    },
  });

  // Footer
  const pageCount = (doc as any).getNumberOfPages?.() || (doc as any).internal?.getNumberOfPages?.() || 1;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.line(pageMargin, pageHeight - 8, pageWidth - pageMargin, pageHeight - 8);
    doc.setFontSize(6);
    doc.setTextColor(100);
    doc.text("Unichem Laboratories", pageMargin, pageHeight - 5);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - pageMargin - 20, pageHeight - 5);
  }

  doc.save(fileName);
};





  // const handleExportPDF = async () => {
  //   const doc = new jsPDF({ orientation: "landscape" });
  //   const today = new Date();
  //   const fileName = `NetworkMaster_${today.toISOString().split("T")[0]}.pdf`;

  //   const pageWidth = doc.internal.pageSize.getWidth();
  //   const pageHeight = doc.internal.pageSize.getHeight();
  //   const pageMargin = 14;
  //   const headerHeight = 28;
  //   doc.setFillColor(0, 82, 155);
  //   doc.rect(0, 0, pageWidth, headerHeight, "F");

  //   // Logo
  //   let logoWidth = 0;
  //   let logoHeight = 0;
  //   try {
  //     if (login_headTitle2) {
  //       const img = await loadImage(login_headTitle2);
  //       const maxLogoHeight = headerHeight * 0.6;
  //       const scale = maxLogoHeight / img.height;
  //       logoWidth = img.width * scale;
  //       logoHeight = img.height * scale;
  //       const logoY = headerHeight / 2 - logoHeight / 2;
  //       doc.addImage(img, "PNG", pageMargin, logoY, logoWidth, logoHeight);
  //     } else if (unichemLogoBase64 && unichemLogoBase64.startsWith("data:image")) {
  //       logoWidth = 50;
  //       logoHeight = 18;
  //       const logoY = headerHeight / 2 - logoHeight / 2;
  //       doc.addImage(unichemLogoBase64, "PNG", pageMargin, logoY, logoWidth, logoHeight);
  //     }
  //   } catch (e) {
  //     console.warn("Logo load failed", e);
  //   }

  //   // Title
  //   doc.setFontSize(16);
  //   doc.setTextColor(255, 255, 255);
  //   const titleX = pageMargin + logoWidth + 10;
  //   const titleY = headerHeight / 2 + 5;
  //   doc.text("Network Master", titleX, titleY);

  //   doc.setFontSize(9);
  //   doc.setTextColor(220, 230, 245);
  //   const exportedByName = (user && (user.name || user.username)) || "Unknown User";
  //   const exportedText = `Exported by: ${exportedByName}  On: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
  //   const textWidth = doc.getTextWidth(exportedText);
  //   doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);

  //   doc.setDrawColor(0, 82, 155);
  //   doc.setLineWidth(0.5);
  //   doc.line(0, headerHeight, pageWidth, headerHeight);

  //   // Table
  //   const headers = [[
  //     "Plant Location", "Area", "Rack", "Host Name", "Device IP", "Device Model",
  //     "Device Type", "Make/Vendor", "Trunk Port", "Neighbor Switch IP", 
  //     "Neighbor Port", "SFP/Fiber TX", "POE/Non-POE", "Serial No", "IOS Version",
  //     "Uptime", "Verify Date", "Stack", "Stack Switch Details", "Dual Power Source",
  //     "Purchase Vendor", "Purchased Date", "Purchase PO", "SAP Asset No", 
  //     "Service Type", "Warranty Start Date", "AMC/Warranty Expiry Date", 
  //     "Under AMC", "AMC Vendor", "Remarks", "Status", "Created On", "Updated On"
  //   ]];

  //   const rows = filteredData.map((network) => [
  //     network.plant_name ?? "",
  //     network.area ?? "",
  //     network.rack ?? "",
  //     network.host_name ?? "",
  //     network.device_ip ?? "",
  //     network.device_model ?? "",
  //     network.device_type ?? "",
  //     network.make_vendor ?? "",
  //     network.trunk_port ?? "",
  //     network.neighbor_switch_ip ?? "",
  //     network.neighbor_port ?? "",
  //     network.sfp_fiber_tx ?? "",
  //     network.poe_non_poe ?? "",
  //     network.serial_no ?? "",
  //     network.ios_version ?? "",
  //     network.uptime ?? "",
  //     network.verify_date ?? "",
  //     network.stack ? "Yes" : "No",
  //     network.stack_switch_details ?? "",
  //     network.dual_power_source ? "Yes" : "No",
  //     network.purchase_vendor ?? "",
  //     network.purchased_date ?? "",
  //     network.purchased_po ?? "",
  //     network.sap_asset_no ?? "",
  //     network.service_type ?? "",
  //     network.warranty_start_date ?? "",
  //     network.amc_warranty_expiry_date ?? "",
  //     network.under_amc ? "Yes" : "No",
  //     network.amc_vendor ?? "",
  //     network.remarks ?? "",
  //     network.status ?? "",
  //     network.created_on ?? "",
  //     network.updated_on ?? "",
  //   ]);

  //   autoTable(doc, {
  //     head: headers,
  //     body: rows,
  //     startY: headerHeight + 8,
  //     styles: {
  //       fontSize: 11,
  //       cellPadding: 3,
  //       halign: "left",
  //       valign: "middle",
  //     },
  //     headStyles: {
  //       fillColor: [11, 99, 206],
  //       textColor: 255,
  //       fontStyle: "bold",
  //     },
  //     alternateRowStyles: {
  //       fillColor: [240, 245, 255],
  //     },
  //     margin: { left: pageMargin, right: pageMargin },
  //     tableWidth: "auto",
  //   });

  //   // Footer
  //   const pageCount = (doc as any).getNumberOfPages?.() || (doc as any).internal?.getNumberOfPages?.() || 1;
  //   doc.setFontSize(9);
  //   doc.setTextColor(100);
  //   for (let i = 1; i <= pageCount; i++) {
  //     doc.setPage(i);
  //     doc.text("Unichem Laboratories", pageMargin, pageHeight - 6);
  //     doc.text(`Page ${i} of ${pageCount}`, pageWidth - pageMargin - 30, pageHeight - 6);
  //   }

  //   doc.save(fileName);
  // };

  // Delete handler
  const confirmDelete = async () => {
    if (selectedRow === null) return;
    const network = filteredData[selectedRow];
    if (!network) return;
    if (networkCtx && networkCtx.deleteNetwork) {
      const idx = networks.findIndex((n) => n.id === network.id);
      if (idx !== -1) await networkCtx.deleteNetwork(idx);
    }
    setSelectedRow(null);
    setShowDeleteModal(false);
  };

  // Filter popover click outside handler
  React.useEffect(() => {
    if (!showFilterPopover) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowFilterPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilterPopover]);
  console.log("networks master",networks);

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Network Device Management" />
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
             <PermissionGuard permission={PERMISSIONS.NETWORK.CREATE}>
            <button
              className={styles.addBtn}
              onClick={() => navigate("/network-master/add")}
            >
              + Add New
            </button>
            </PermissionGuard>
            <button
              className={styles.filterBtn}
              onClick={() => setShowFilterPopover((prev) => !prev)}
              type="button"
            >
              🔍 Filter
            </button>
           <PermissionGuard permission={PERMISSIONS.NETWORK.UPDATE}>
            <button
              className={`${styles.btn} ${styles.editBtn}`}
              onClick={() => {
                if (selectedRow !== null)
                  navigate(`/network-master/edit/${filteredData[selectedRow].id}`);
              }}
              disabled={selectedRow === null}
            >
              <FaEdit size={14} /> Edit
            </button>
             </PermissionGuard>
             <PermissionGuard permission={PERMISSIONS.NETWORK.DELETE}>
            <button
              className={`${styles.btn} ${styles.deleteBtn}`}
              disabled={selectedRow === null}
              onClick={() => setShowDeleteModal(true)}
            >
              <FaTrash size={14} /> Delete
            </button>
            </PermissionGuard>
            <button
              className={styles.exportBtn}
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
                      <option value="host_name">Host Name</option>
                      <option value="device_ip">Device IP</option>
                      <option value="status">Status</option>
                    </select>
                  </div>
                  <div className={styles.filterFieldRow}>
                    <label className={styles.filterLabel}>Value</label>
                    <input
                      className={styles.filterInput}
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
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2>Network Device Records</h2>
            <span className={styles.recordCount}>{filteredData.length} Records</span>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}></th>
                  <th>Plant Location</th>
                  <th>Area</th>
                  <th>Rack</th>
                  <th>Host Name</th>
                  <th>Device IP</th>
                  <th>Device Model</th>
                  <th>Device Type</th>
                  <th>Make/Vendor</th>
                  <th>Trunk Port</th>
                  <th>Neighbor Switch IP</th>
                  <th>Neighbor Port</th>
                  <th>SFP/Fiber TX</th>
                  <th>POE/Non-POE</th>
                  <th>Serial No</th>
                  <th>IOS Version</th>
                  <th>Uptime</th>
                  <th>Verify Date</th>
                  <th>Stack</th>
                  <th>Stack Switch Details</th>
                  <th>Dual Power Source</th>
                  <th>Purchase Vendor</th>
                  <th>Purchased Date</th>
                  <th>Purchase PO</th>
                  <th>SAP Asset No</th>
                  <th>Service Type</th>
                  <th>Warranty Start Date</th>
                  <th>AMC/Warranty Expiry Date</th>
                  <th>Under AMC</th>
                  <th>AMC Vendor</th>
                  <th>Remarks</th>
                  <th>Status</th>
                  <th>Created On</th>
                  <th>Updated On</th>
                  <th>Activity Log</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((network, index) => {
                  const globalIdx = (currentPage - 1) * rowsPerPage + index;
                  return (
                    <tr
                      key={network.id}
                      onClick={() => setSelectedRow(globalIdx)}
                      style={{
                        background: selectedRow === globalIdx ? "#f0f4ff" : undefined,
                      }}
                    >
                      <td>
                        <input
                          type="radio"
                          className={styles.radioInput}
                          checked={selectedRow === globalIdx}
                          onChange={() => setSelectedRow(globalIdx)}
                        />
                      </td>
                      <td>{network.plant_name}</td>
                      <td>{network.area}</td>
                      <td>{network.rack}</td>
                      <td>{network.host_name}</td>
                      <td>{network.device_ip}</td>
                      <td>{network.device_model}</td>
                      <td>{network.device_type}</td>
                      <td>{network.make_vendor}</td>
                      <td>{network.trunk_port}</td>
                      <td>{network.neighbor_switch_ip}</td>
                      <td>{network.neighbor_port}</td>
                      <td>{network.sfp_fiber_tx}</td>
                      <td>{network.poe_non_poe}</td>
                      <td>{network.serial_no}</td>
                      <td>{network.ios_version}</td>
                      <td>{network.uptime}</td>
                      <td>{network.verify_date}</td>
                      <td>{network.stack ? "Yes" : "No"}</td>
                      <td>{network.stack_switch_details}</td>
                      <td>{network.dual_power_source ? "Yes" : "No"}</td>
                      <td>{network.purchase_vendor}</td>
                      <td>{network.purchased_date}</td>
                      <td>{network.purchased_po}</td>
                      <td>{network.sap_asset_no}</td>
                      <td>{network.service_type}</td>
                      <td>{network.warranty_start_date}</td>
                      <td>{network.amc_warranty_expiry_date}</td>
                      <td>{network.under_amc ? "Yes" : "No"}</td>
                      <td>{network.amc_vendor}</td>
                      <td>{network.remarks}</td>
                      <td>{network.status}</td>
                      <td>{network.created_on}</td>
                      <td>{network.updated_on}</td>
                      <td>
                        <button
                          className={styles.actionBtn}
                          title="View Activity Logs"
                          onClick={async () => {
                            try {
                              const logs = await fetchActivityLog();
                              const filtered = (logs || [])
                                .filter((log: any) => {
                                  if (
                                    log.table_name === "network_master" &&
                                    String(log.record_id) === String(network.id)
                                  )
                                    return true;
                                  if (log.details && typeof log.details === "string") {
                                    return (
                                      log.details.includes('"tableName":"network_master"') &&
                                      log.details.includes(`"recordId":"${network.id}"`)
                                    );
                                  }
                                  return false;
                                })
                                .map((r: any) => {
                                  let parsedDetails = null;
                                  if (r.details && typeof r.details === "string") {
                                    try {
                                      parsedDetails = JSON.parse(r.details);
                                    } catch (e) {
                                      parsedDetails = null;
                                    }
                                  }

                                  const parseMaybeJson = (v: any) => {
                                    if (v === null || v === undefined) return null;
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
                                    r.old_value || (parsedDetails && parsedDetails.old_value)
                                  );
                                  const newVal = parseMaybeJson(
                                    r.new_value || (parsedDetails && parsedDetails.new_value)
                                  );
                                  const action =
                                    r.action ||
                                    (parsedDetails && parsedDetails.action) ||
                                    "";
                                  const approver =
                                    r.action_performed_by ||
                                    r.user_id ||
                                    (parsedDetails && parsedDetails.userId) ||
                                    null;
                                  const dateTime =
                                    r.date_time_ist ||
                                    r.timestamp ||
                                    r.created_at ||
                                    (parsedDetails && parsedDetails.dateTime) ||
                                    null;
                                  const comments =
                                    r.comments ||
                                    (parsedDetails && parsedDetails.comments) ||
                                    (parsedDetails && parsedDetails.reason) ||
                                    null;

                                  return {
                                    action,
                                    oldValue: oldVal,
                                    newValue: newVal,
                                    approver,
                                    approvedOrRejectedBy: r.approved_by || null,
                                    approvalStatus:
                                      r.approve_status || r.approval_status || null,
                                    dateTime,
                                    reason: comments,
                                    _raw: r,
                                  };
                                });

                              setActivityLogsNetwork({
                                ...network,
                                activityLogs: filtered,
                              });
                            } catch (err) {
                              setActivityLogsNetwork({
                                ...network,
                                activityLogs: [],
                              });
                            }
                            setShowActivityModal(true);
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
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            <div className={paginationStyles.pagination}>
              <button
                className={paginationStyles.pageBtn}
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <div className={paginationStyles.pageInfo}>
                Page {currentPage} of {totalPages}
              </div>
              <button
                className={paginationStyles.pageBtn}
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <ConfirmDeleteModal
          open={showDeleteModal}
          name={
            selectedRow !== null && filteredData[selectedRow]
              ? filteredData[selectedRow].host_name ?? "network device"
              : "network device"
          }
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
};

export default NetworkMasterTable;