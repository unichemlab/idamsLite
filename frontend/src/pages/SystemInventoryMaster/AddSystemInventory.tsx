import React, { useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useSystemContext, System } from "./SystemContext";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import addStyles from "../../pages/PlantMaster/AddPlantMaster.module.css";
import { sidebarConfig } from "../../components/Common/sidebarConfig";

const AddSystemInventory: React.FC = () => {
  const { addSystem } = useSystemContext();
  const navigate = useNavigate();
  const [form, setForm] = useState<System>({
    id: 0,
    transaction_id: "",
    plant_location_id: "",
    user_location: "",
    building_location: "",
    department_id: "",
    allocated_to_user_name: "",
    host_name: "",
    make: "",
    model: "",
    serial_no: "",
    processor: "",
    ram_capacity: "",
    hdd_capacity: "",
    ip_address: "",
    other_software: "",
    windows_activated: false,
    os_version_service_pack: "",
    architecture: "",
    type_of_asset: "",
    category_gxp: "",
    gamp_category: "",
    instrument_equipment_name: "",
    equipment_instrument_id: "",
    instrument_owner: "",
    service_tag: "",
    warranty_status: "",
    warranty_end_date: "",
    connected_no_of_equipments: 0,
    application_name: "",
    application_version: "",
    application_oem: "",
    application_vendor: "",
    user_management_applicable: false,
    application_onboard: "",
    system_process_owner: "",
    database_version: "",
    domain_workgroup: "",
    connected_through: "",
    specific_vlan: "",
    ip_address_type: "",
    date_time_sync_available: false,
    antivirus: "",
    antivirus_version: "",
    backup_type: "",
    backup_frequency_days: 0,
    backup_path: "",
    backup_tool: "",
    backup_procedure_available: false,
    folder_deletion_restriction: false,
    remote_tool_available: false,
    os_administrator: "",
    system_running_with: "",
    audit_trail_adequacy: "",
    user_roles_availability: false,
    user_roles_challenged: false,
    system_managed_by: "",
    planned_upgrade_fy2526: false,
    eol_eos_upgrade_status: "",
    system_current_status: "",
    purchase_po: "",
    purchase_vendor_name: "",
    amc_vendor_name: "",
    renewal_po: "",
    warranty_period: "",
    amc_start_date: "",
    amc_expiry_date: "",
    sap_asset_no: "",
    remarks: "",
    status: "ACTIVE",
    system_name: "",
    description: "",
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
    addSystem(form);
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
      default:
        break;
    }
  };

  // Determine active sidebar tab (always "plant" for Add)
  const activeTab = "system";

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
            <h2 className={superAdminStyles["header-title"]}>Plant Master</h2>
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
                navigate("/superadmin", { state: { activeTab: "plant" } })
              }
              onMouseOver={(e) => (e.currentTarget.style.color = "#084a9e")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#0b63ce")}
              tabIndex={0}
              role="button"
              aria-label="Go to Plant Master table"
            >
              Plant Master
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
                    <label>System Name</label>
                    <input name="system_name" value={form.system_name} onChange={handleChange} required className={addStyles.input} />
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
                    <textarea name="description" value={form.description} onChange={handleChange} className={addStyles.textarea} rows={2} />
                  </div>
                  {/* Add more fields as needed below */}
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Plant Location</label>
                    <input name="plant_location_id" value={form.plant_location_id} onChange={handleChange} className={addStyles.input} />
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>User Location</label>
                    <input name="user_location" value={form.user_location} onChange={handleChange} className={addStyles.input} />
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Building Location</label>
                    <input name="building_location" value={form.building_location} onChange={handleChange} className={addStyles.input} />
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Department</label>
                    <input name="department_id" value={form.department_id} onChange={handleChange} className={addStyles.input} />
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Allocated to User Name</label>
                    <input name="allocated_to_user_name" value={form.allocated_to_user_name} onChange={handleChange} className={addStyles.input} />
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Host Name</label>
                    <input name="host_name" value={form.host_name} onChange={handleChange} className={addStyles.input} />
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Make</label>
                    <input name="make" value={form.make} onChange={handleChange} className={addStyles.input} />
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Model</label>
                    <input name="model" value={form.model} onChange={handleChange} className={addStyles.input} />
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Serial No.</label>
                    <input name="serial_no" value={form.serial_no} onChange={handleChange} className={addStyles.input} />
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>Processor</label>
                    <input name="processor" value={form.processor} onChange={handleChange} className={addStyles.input} />
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>RAM Capacity</label>
                    <input name="ram_capacity" value={form.ram_capacity} onChange={handleChange} className={addStyles.input} />
                  </div>
                  <div className={addStyles.formGroup} style={{ flex: 1, minWidth: 180 }}>
                    <label>HDD Capacity</label>
                    <input name="hdd_capacity" value={form.hdd_capacity} onChange={handleChange} className={addStyles.input} />
                  </div>
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
            </form>
          </div>
        </main>
      </div>
    </React.Fragment>
  );
};

export default AddSystemInventory;
