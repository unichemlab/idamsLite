import React, { useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useServerContext, Server } from "./ServerContext";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import addStyles from "../../pages/ServerInventoryMaster/AddServerInventoryMaster.module.css";
import { sidebarConfig } from "../../components/Common/sidebarConfig";

const AddServerInventory: React.FC = () => {
  const { addServer } = useServerContext();
  const navigate = useNavigate();

  // Handle input changes for all fields
  const [form, setForm] = useState<Server>({
    id: 0,
    transaction_id: "",
    plant_location_id: undefined,
    rack_number: "",
    server_owner: "",
    type_tower_rack_mounted: "",
    server_rack_location_area: "",
    asset_no: "",
    host_name: "",
    make: "",
    model: "",
    serial_no: "",
    os: "",
    physical_server_host_name: "",
    idrac_ilo: "",
    ip_address: "",
    part_no: false,
    application: "",
    application_version: "",
    application_oem: "",
    application_vendor: "",
    system_owner: "",
    vm_display_name: "",
    vm_type: "",
    vm_os: "",
    vm_version: "",
    vm_server_ip: "",
    domain_workgroup: "",
    windows_activated: 0,
    backup_agent: "",
    antivirus: "",
    category_gxp: "",
    current_status: "",
    server_managed_by: false,
    remarks_application_usage: "",
    start_date: "",
    end_date: "",
    aging: "",
    environment: "",
    server_critility: "",
    database_appplication: "",
    current_rpo: false,
    reduce_rpo_time: "",
    server_to_so_timeline: "",
    purchase_date: "",
    purchase_po: 0,
    warranty_new_start_date: "",
    amc_warranty_expiry_date: "",
    sap_asset_no: false,
    amc_vendor: false,
    remarks: "",
    status: "ACTIVE",
    created_on: "",
    updated_on: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (
      [
        "part_no",
        "server_managed_by",
        "current_rpo",
        "sap_asset_no",
        "amc_vendor",
      ].includes(name)
    ) {
      const checked =
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : undefined;
      setForm({ ...form, [name]: type === "checkbox" ? checked : value });
    } else if (["purchase_po", "windows_activated"].includes(name)) {
      setForm({
        ...form,
        [name]: type === "number" ? Number(value) : Number(value),
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirm = (data: Record<string, string>) => {
    addServer(form);
    setShowConfirm(false);
    navigate("/superadmin");
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  const filteredSidebarConfig = sidebarConfig;

  const handleSidebarNav = (key: string) => {
    switch (key) {
      case "dashboard":
        navigate("/superadmin", { state: { activeTab: "dashboard" } });
        break;
      case "plant":
        navigate("/superadmin", { state: { activeTab: "plant" } });
        break;
      case "role":
        navigate("/superadmin", { state: { activeTab: "role" } });
        break;
      case "vendor":
        navigate("/superadmin", { state: { activeTab: "vendor" } });
        break;
      case "department":
        navigate("/superadmin", { state: { activeTab: "department" } });
        break;
      case "application":
        navigate("/superadmin", { state: { activeTab: "application" } });
        break;
      case "user":
        navigate("/superadmin", { state: { activeTab: "user" } });
        break;
      case "workflow":
        navigate("/superadmin", { state: { activeTab: "workflow" } });
        break;
      case "system":
        navigate("/superadmin", { state: { activeTab: "system" } });
        break;
      case "server":
        navigate("/superadmin", { state: { activeTab: "server" } });
        break;
      default:
        break;
    }
  };

  const activeTab = "server";

  return (
    <React.Fragment>
      {showConfirm && (
        <ConfirmLoginModal
          username={user?.username || ""}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      <div className={superAdminStyles["main-container"]}>
        {/* Sidebar */}
        <aside className={superAdminStyles.sidebar}>
          <div className={superAdminStyles["sidebar-header"]}>
            <img
              src={require("../../assets/login_headTitle2.png")}
              alt="Company logo"
              style={{ width: 250, height: 35 }}
            />
            <br />
            <span className={superAdminStyles.version}>version-1.0</span>
          </div>
          <nav>
            <div className={superAdminStyles["sidebar-group"]}>OVERVIEW</div>
            {filteredSidebarConfig.map((item) => (
              <button
                key={item.key}
                className={`${superAdminStyles["nav-button"]} ${
                  activeTab === item.key ? superAdminStyles.active : ""
                }`}
                onClick={() => handleSidebarNav(item.key)}
                style={activeTab === item.key ? { fontWeight: 700 } : {}}
              >
                {item.icon} {item.label}
              </button>
            ))}
            <div className={superAdminStyles["sidebar-footer"]}>
              <div className={superAdminStyles["admin-info"]}>
                <div className={superAdminStyles.avatar}>A</div>
              </div>
              <button
                className={superAdminStyles["logout-button"]}
                onClick={() => {
                  localStorage.removeItem("role");
                  localStorage.removeItem("username");
                  localStorage.removeItem("superadmin_activeTab");
                  navigate("/");
                }}
              >
                Logout
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className={superAdminStyles["main-content"]}>
          {/* Header */}
          <header className={superAdminStyles["main-header"]}>
            <h2 className={superAdminStyles["header-title"]}>Server Master</h2>
            <div className={superAdminStyles["header-icons"]}></div>
          </header>

          {/* Breadcrumb */}
          <div
            style={{
              background: "#eef4ff",
              padding: "12px 24px",
              fontSize: "1.05rem",
              color: "#2d3748",
              fontWeight: 500,
              borderRadius: "0 0 12px 12px",
              marginBottom: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                color: "#0b63ce",
                cursor: "pointer",
                opacity: 0.7,
                transition: "color 0.2s",
              }}
              onClick={() =>
                navigate("/superadmin", { state: { activeTab: "server" } })
              }
              onMouseOver={(e) => (e.currentTarget.style.color = "#084a9e")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#0b63ce")}
              tabIndex={0}
              role="button"
              aria-label="Go to Server Master table"
            >
              Server Master
            </span>
            <span>&gt;</span>
            <span style={{ color: "#2d3748" }}>Add Plant</span>
          </div>

          {/* Container for Add Form */}
          <div className={addStyles.container} style={{ marginTop: 32 }}>
            <form
              className={addStyles.form}
              onSubmit={handleSubmit}
              style={{ width: "100%" }}
            >
              <div className={addStyles.scrollFormContainer}>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>Transaction ID</label>
                    <input
                      name="transaction_id"
                      value={form.transaction_id}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Plant Location</label>
                    <input
                      name="plant_location_id"
                      value={form.plant_location_id}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>RACK NUMBER</label>
                    <input
                      name="rack_number"
                      value={form.rack_number}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>SERVER OWNER</label>
                    <input
                      name="server_owner"
                      value={form.server_owner}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Type Tower / Rack mounted</label>
                    <input
                      name="type_tower_rack_mounted"
                      value={form.type_tower_rack_mounted}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Server / RACK Location / Area</label>
                    <input
                      name="server_rack_location_area"
                      value={form.server_rack_location_area}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>Asset No.</label>
                    <input
                      name="asset_no"
                      value={form.asset_no}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Host Name</label>
                    <input
                      name="host_name"
                      value={form.host_name}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>MAKE</label>
                    <input
                      name="make"
                      value={form.make}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>MODEL</label>
                    <input
                      name="model"
                      value={form.model}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>SERIAL NO.</label>
                    <input
                      name="serial_no"
                      value={form.serial_no}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>OS</label>
                    <input
                      name="os"
                      value={form.os}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>Physical Server Host Name</label>
                    <input
                      name="physical_server_host_name"
                      value={form.physical_server_host_name}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>IDRAC/ILO</label>
                    <input
                      name="idrac_ilo"
                      value={form.idrac_ilo}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>IP-ADDRESS</label>
                    <input
                      name="ip_address"
                      value={form.ip_address}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>Part No.</label>
                    <input
                      name="part_no"
                      type="checkbox"
                      checked={!!form.part_no}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>APPLICATION</label>
                    <input
                      name="application"
                      value={form.application}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Application Version</label>
                    <input
                      name="application_version"
                      value={form.application_version}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>Application OEM</label>
                    <input
                      name="application_oem"
                      value={form.application_oem}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Application Vendor</label>
                    <input
                      name="application_vendor"
                      value={form.application_vendor}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>System Owner</label>
                    <input
                      name="system_owner"
                      value={form.system_owner}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>VM Display Name</label>
                    <input
                      name="vm_display_name"
                      value={form.vm_display_name}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>TYPE</label>
                    <input
                      name="vm_type"
                      value={form.vm_type}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>VM OS</label>
                    <input
                      name="vm_os"
                      value={form.vm_os}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>VM Version</label>
                    <input
                      name="vm_version"
                      value={form.vm_version}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>VM Server IP</label>
                    <input
                      name="vm_server_ip"
                      value={form.vm_server_ip}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>
                      Domain / Work Group CORP Domain / GXP - mention name of
                      Domain
                    </label>
                    <input
                      name="domain_workgroup"
                      value={form.domain_workgroup}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>Is Windows Activated Yes / No</label>
                    <select
                      name="windows_activated"
                      value={form.windows_activated}
                      onChange={handleChange}
                      className={addStyles.input}
                    >
                      <option value={1}>Yes</option>
                      <option value={0}>No</option>
                    </select>
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Backup Agent VEEAM / Acronis Version</label>
                    <input
                      name="backup_agent"
                      value={form.backup_agent}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Antivirus CS / TM / McAfee/ Symantec</label>
                    <input
                      name="antivirus"
                      value={form.antivirus}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>Category GxP or Non GxP</label>
                    <input
                      name="category_gxp"
                      value={form.category_gxp}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Current Status of Server</label>
                    <input
                      name="current_status"
                      value={form.current_status}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Server Managed By IT or ESD</label>
                    <input
                      name="server_managed_by"
                      type="checkbox"
                      checked={!!form.server_managed_by}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>Remarks for Application usage purpose</label>
                    <input
                      name="remarks_application_usage"
                      value={form.remarks_application_usage}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>START DATE</label>
                    <input
                      name="start_date"
                      value={form.start_date}
                      onChange={handleChange}
                      className={addStyles.input}
                      type="date"
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>END DATE</label>
                    <input
                      name="end_date"
                      value={form.end_date}
                      onChange={handleChange}
                      className={addStyles.input}
                      type="date"
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>AGING</label>
                    <input
                      name="aging"
                      value={form.aging}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Environment</label>
                    <input
                      name="environment"
                      value={form.environment}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Server Critility</label>
                    <input
                      name="server_critility"
                      value={form.server_critility}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>Database/Application</label>
                    <input
                      name="database_appplication"
                      value={form.database_appplication}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Current RPO</label>
                    <input
                      name="current_rpo"
                      type="checkbox"
                      checked={!!form.current_rpo}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Reduce RPO time from 24 Hrs</label>
                    <input
                      name="reduce_rpo_time"
                      value={form.reduce_rpo_time}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>Server to SO Timeline</label>
                    <input
                      name="server_to_so_timeline"
                      value={form.server_to_so_timeline}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Purchased Date</label>
                    <input
                      name="purchase_date"
                      value={form.purchase_date}
                      onChange={handleChange}
                      className={addStyles.input}
                      type="date"
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Purchased PO</label>
                    <input
                      name="purchase_po"
                      value={form.purchase_po}
                      onChange={handleChange}
                      className={addStyles.input}
                      type="number"
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>Warranty New Start Date</label>
                    <input
                      name="warranty_new_start_date"
                      value={form.warranty_new_start_date}
                      onChange={handleChange}
                      className={addStyles.input}
                      type="date"
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>AMC/Warranty Expiry date</label>
                    <input
                      name="amc_warranty_expiry_date"
                      value={form.amc_warranty_expiry_date}
                      onChange={handleChange}
                      className={addStyles.input}
                      type="date"
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>SAP Asset No.</label>
                    <input
                      name="sap_asset_no"
                      type="checkbox"
                      checked={!!form.sap_asset_no}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>AMC Vendor</label>
                    <input
                      name="amc_vendor"
                      type="checkbox"
                      checked={!!form.amc_vendor}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Remarks If Any</label>
                    <input
                      name="remarks"
                      value={form.remarks}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className={addStyles.input}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>
              <div
                className={addStyles.buttonRow}
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  gap: 24,
                  marginTop: 24,
                  position: "sticky",
                  bottom: 0,
                  background: "#fff",
                  padding: "16px 0 8px 0",
                  zIndex: 2,
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <button type="submit" className={addStyles.saveBtn}>
                  Save
                </button>
                <button
                  type="button"
                  className={addStyles.cancelBtn}
                  onClick={() => navigate("/superadmin")}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </React.Fragment>
  );
};

export default AddServerInventory;
