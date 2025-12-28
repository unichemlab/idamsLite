import React, { useEffect, useState } from "react";
import AppHeader from "../../components/Common/AppHeader";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSystemContext } from "../SystemInventoryMaster/SystemContext";
import { System } from "../../types/system";
import { fetchPlants, fetchDepartments } from "../../utils/api";
import styles from "../Plant/AddPlantMaster.module.css";

interface Plant {
  id: number;
  plant_name: string;
}

interface Department {
  id: number;
  name: string;
}

const AddSystemInventory: React.FC = () => {
  const { addSystem } = useSystemContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState<System>({
    id: 0,
    transaction_id: "",
    plant_location_id: undefined,
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
  });

  useEffect(() => {
    Promise.all([fetchPlants(), fetchDepartments()]).then(([p, d]) => {
      setPlants(p);
      setDepartments(d);
    });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
            ? Number(value)
            : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    await addSystem(form);
    setShowConfirm(false);
    navigate("/system-master");
  };

  const input = (name: keyof System, label: string, type = "text") => (
    <div className={styles.formGroup}>
      <label>{label}</label>
      <input
        type={type}
        name={name}
        value={form[name] as any}
        onChange={handleChange}
        className={styles.input}
      />
    </div>
  );

  const checkbox = (name: keyof System, label: string) => (
    <div className={styles.formGroup}>
      <label>
        <input
          type="checkbox"
          name={name}
          checked={Boolean(form[name])}
          onChange={handleChange}
        />{" "}
        {label}
      </label>
    </div>
  );

  return (
    <>
      {showConfirm && (
        <ConfirmLoginModal
          username={user?.username || ""}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className={styles.pageWrapper}>
        <AppHeader title="System Inventory Management" />

        <div className={styles.contentArea}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Add System Inventory</h2>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.scrollFormContainer}>
                <div className={styles.rowFields}>

                  {/* DROPDOWNS */}
                  <div className={styles.formGroup}>
                    <label>Plant</label>
                    <select
                      name="plant_location_id"
                      value={form.plant_location_id}
                      onChange={handleChange}
                      className={styles.select}
                    >
                      <option value="">-- Select --</option>
                      {plants.map(p => (
                        <option key={p.id} value={p.id}>{p.plant_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Department</label>
                    <select
                      name="department_id"
                      value={form.department_id}
                      onChange={handleChange}
                      className={styles.select}
                    >
                      <option value="">-- Select --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {input("user_location", "User Location")}
                  {input("building_location", "Building Location")}
                  {input("allocated_to_user_name", "Allocated To")}
                  {input("host_name", "Host Name")}
                  {input("make", "Make")}
                  {input("model", "Model")}
                  {input("serial_no", "Serial No")}
                  {input("processor", "Processor")}
                  {input("ram_capacity", "RAM Capacity")}
                  {input("hdd_capacity", "HDD Capacity")}
                  {input("ip_address", "IP Address")}
                  {input("other_software", "Other Software")}
                  {checkbox("windows_activated", "Windows Activated")}
                  {input("os_version_service_pack", "OS Version / SP")}
                  <select name="architecture" value={form.architecture} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    <option value="32bit">32bit</option>
                    <option value="64bit">64bit</option>
                  </select>
                  <select name="type_of_asset" value={form.type_of_asset} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    {["Desktop", "Laptop", "Toughbook", "HMI", "SCADA", "IPC", "TABs", "Scanner", "Printer"].map(v =>
                      <option key={v} value={v}>{v}</option>
                    )}
                  </select>

                  <select name="category_gxp" value={form.category_gxp} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    <option value="GxP">GxP</option>
                    <option value="Non-GxP">Non-GxP</option>
                    <option value="Network">Network</option>
                  </select>

                  {input("gamp_category", "GAMP Category")}
                  {input("instrument_equipment_name", "Instrument / Equipment")}
                  {input("equipment_instrument_id", "Equipment ID")}
                  {input("instrument_owner", "Instrument Owner")}
                  {input("service_tag", "Service Tag")}
                  {input("warranty_status", "Warranty Status")}
                  {input("warranty_end_date", "Warranty End Date", "date")}
                  {input("connected_no_of_equipments", "Connected Equipments", "number")}
                  {input("application_name", "Application Name")}
                  {input("application_version", "Application Version")}
                  {input("application_oem", "Application OEM")}
                  {input("application_vendor", "Application Vendor")}
                  {checkbox("user_management_applicable", "User Management Applicable")}
                  <div className={styles.formGroup}>
                    <label>Application Onboard</label>
                    <select
                      name="application_onboard"
                      value={form.application_onboard || ""}
                      onChange={handleChange}
                    >
                      <option value="">-- Select --</option>
                      <option value="Manual">Manual</option>
                      <option value="Automated">Automated</option>
                    </select>
                  </div>

                  {input("system_process_owner", "System Process Owner")}
                  {input("database_version", "Database Version")}
                  {input("domain_workgroup", "Domain / Workgroup")}
                  <select name="connected_through" value={form.connected_through} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    <option value="LAN">LAN</option>
                    <option value="WiFi">WiFi</option>
                  </select>

                  {input("specific_vlan", "Specific VLAN")}
                  <select name="ip_address_type" value={form.ip_address_type} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    <option value="Static">Static</option>
                    <option value="DHCP">DHCP</option>
                    <option value="Other">Other</option>
                  </select>

                  {checkbox("date_time_sync_available", "Date Time Sync")}
                  {input("antivirus", "Antivirus")}
                  {input("antivirus_version", "Antivirus Version")}
                  <select name="backup_type" value={form.backup_type} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    {["Manual", "Auto", "Commvault", "Client", "Server"].map(v =>
                      <option key={v} value={v}>{v}</option>
                    )}
                  </select>

                  <select
                    name="backup_frequency_days"
                    value={form.backup_frequency_days}
                    onChange={handleChange}
                  >
                    <option value="">-- Select --</option>
                    {["Weekly", "Fortnightly", "Monthly", "Yearly"].map(v =>
                      <option key={v} value={v}>{v}</option>
                    )}
                  </select>

                  {input("backup_path", "Backup Path")}
                  {input("backup_tool", "Backup Tool")}
                  {checkbox("backup_procedure_available", "Backup Procedure")}
                  {checkbox("folder_deletion_restriction", "Folder Deletion Restriction")}
                  {checkbox("remote_tool_available", "Remote Tool")}
                  {input("os_administrator", "OS Administrator")}
                  <select name="system_running_with" value={form.system_running_with} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    <option value="AD">AD</option>
                    <option value="Local">Local</option>
                  </select>

                  {input("audit_trail_adequacy", "Audit Trail Adequacy")}
                  {checkbox("user_roles_availability", "User Roles Available")}
                  {checkbox("user_roles_challenged", "User Roles Challenged")}
                  <select name="system_managed_by" value={form.system_managed_by} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    <option value="IT">IT</option>
                    <option value="Engineering">Engineering</option>
                  </select>

                  {checkbox("planned_upgrade_fy2526", "Planned Upgrade FY25-26")}
                  {input("eol_eos_upgrade_status", "EOL / EOS Status")}
                  <select
                    name="system_current_status"
                    value={form.system_current_status}
                    onChange={handleChange}
                  >
                    <option value="">-- Select --</option>
                    <option value="Validated">Validated</option>
                    <option value="Retired">Retired</option>
                  </select>

                  {input("purchase_po", "Purchase PO")}
                  {input("purchase_vendor_name", "Purchase Vendor")}
                  {input("amc_vendor_name", "AMC Vendor")}
                  {input("renewal_po", "Renewal PO")}
                  {input("warranty_period", "Warranty Period")}
                  {input("amc_start_date", "AMC Start Date", "date")}
                  {input("amc_expiry_date", "AMC Expiry Date", "date")}
                  {input("sap_asset_no", "SAP Asset No")}

                  <div className={styles.formGroup} style={{ flex: "1 1 100%" }}>
                    <label>Remarks</label>
                    <textarea
                      name="remarks"
                      value={form.remarks}
                      onChange={handleChange}
                      className={styles.textarea}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className={styles.select}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>

                </div>
              </div>

              <div className={styles.buttonRow}>
                <button type="submit" className={styles.saveBtn}>Save</button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => navigate("/system-master")}
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddSystemInventory;
