import React, { useState, useRef, useContext } from "react";
import ProfileIconWithLogout from "../../pages/PlantMasterTable/ProfileIconWithLogout";
import styles from "../ApplicationMasterTable/ApplicationMasterTable.module.css";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import { FaEdit, FaTrash } from "react-icons/fa";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import { ServerContext } from "../ServerInventoryMaster/ServerContext";

const ServerInventoryMasterTable: React.FC = () => {
  const serverCtx = useContext(ServerContext);
  const servers = serverCtx?.servers ?? [];
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [filterColumn, setFilterColumn] = useState("host_name");
  const [filterValue, setFilterValue] = useState("");
  const [tempFilterColumn, setTempFilterColumn] = useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = useState(filterValue);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // Fetch servers from backend
  // Removed direct fetch; data comes from context

  // Filtering logic
  const filteredData = servers.filter((server) => {
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

  // PDF Export Handler
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const fileName = `ServerMaster_${yyyy}-${mm}-${dd}.pdf`;
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
        "Domain / Work Group CORP Domain / GXP - mention name of Domain",
        "Is Windows Activated Yes / No",
        "Backup Agent VEEAM / Acronis Version",
        "Antivirus CS / TM / McAfee/ Symantec",
        "Category GxP or Non GxP",
        "Current Status of Server",
        "Server Managed By IT or ESD",
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
    doc.setFontSize(18);
    doc.text("Server Master", 14, 18);
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

  return (
    <div>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Server Master</h2>
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
            onClick={() => navigate("/servers/add")}
          >
            + Add New
          </button>
          <button
            className={styles.filterBtn}
            onClick={() => setShowFilterPopover((prev) => !prev)}
            type="button"
            aria-label="Filter servers"
          >
            🔍 Filter
          </button>
          <button
            className={`${styles.btn} ${styles.editBtn}`}
            onClick={() => {
              if (selectedRow !== null)
                navigate(`/servers/edit/${filteredData[selectedRow].id}`);
            }}
            disabled={selectedRow === null}
          >
            <FaEdit size={14} /> Edit
          </button>
          <button
            className={`${styles.btn} ${styles.deleteBtn}`}
            disabled={selectedRow === null}
            onClick={() => setShowDeleteModal(true)}
            title="Delete selected server"
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
                {/* Removed Server Name, Status, Description, Transaction ID columns */}
                <th>Plant Location</th>
                <th>RACK NUMBER</th>
                <th>SERVER OWNER</th>
                <th>Type Tower / Rack mounted</th>
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
                <th>
                  Domain / Work Group CORP Domain / GXP - mention name of Domain
                </th>
                <th>Is Windows Activated Yes / No</th>
                <th>Backup Agent VEEAM / Acronis Version</th>
                <th>Antivirus CS / TM / McAfee/ Symantec</th>
                <th>Category GxP or Non GxP</th>
                <th>Current Status of Server</th>
                <th>Server Managed By IT or ESD</th>
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
                  <td>{server.plant_location_id}</td>
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
  );
};

export default ServerInventoryMasterTable;
