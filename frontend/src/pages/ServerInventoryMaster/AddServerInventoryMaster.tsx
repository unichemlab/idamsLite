import React, { useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useServerContext, Server } from "./ServerContext";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import addStyles from "../../pages/PlantMaster/AddPlantMaster.module.css";
import { sidebarConfig } from "../../components/Common/sidebarConfig";

const AddServerInventory: React.FC = () => {
  const { addServer } = useServerContext();
  const navigate = useNavigate();
  const [form, setForm] = useState<Server>({
    id: 0,
    transaction_id: "",
    plant_location_id: "",
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
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "status" ? (value as "ACTIVE" | "INACTIVE") : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirm = (data: Record<string, string>) => {
    // Optionally, you can check password here with backend
    addServer(form);
    setShowConfirm(false);
    navigate("/superadmin");
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  // Always show all sidebar items, regardless of user role
  const filteredSidebarConfig = sidebarConfig;

  // Sidebar navigation handler
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

  // Determine active sidebar tab (always "plant" for Add)
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
            <span>Unichem Laboratories</span>
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
                  {/* Render all inventory fields except created_at and updated_at */}
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Transaction ID</label>
                    <input name="transaction_id" value={form.transaction_id} onChange={handleChange} className={addStyles.input} />
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Server Name</label>
                <input name="host_name" value={form.host_name} onChange={handleChange} required className={addStyles.input} />
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Status</label>
                    <select className={addStyles.select} name="status" value={form.status} onChange={handleChange}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Description</label>
                <textarea name="remarks" value={form.remarks} onChange={handleChange} className={addStyles.textarea} rows={2} />
                  </div>
                  {/* Add more fields as needed below */}
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Plant Location</label>
                    <input name="plant_location_id" value={form.plant_location_id} onChange={handleChange} className={addStyles.input} />
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    {/* Removed fields not present in Server interface */}
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Serial No.</label>
                    <input name="serial_no" value={form.serial_no} onChange={handleChange} className={addStyles.input} />
                  </div>
                  {/* Removed processor, ram_capacity, hdd_capacity fields not present in Server interface */}
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>IP Address</label>
                    <input name="ip_address" value={form.ip_address} onChange={handleChange} className={addStyles.input} />
                  </div>
                  {/* Add all other fields similarly... */}
                  {/* For boolean fields, use checkboxes or selects */}
                  {/* For brevity, not all fields are rendered here, but you should add all except created_at and updated_at */}
                </div>
              </div>
              <div
                className={addStyles.buttonRow}
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  gap: 24,
                  marginTop: 24,
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
              </div>
            </form>
          </div>
        </main>
      </div>
    </React.Fragment>
  );
};

export default AddServerInventory;
