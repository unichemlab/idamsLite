import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppHeader from "../../components/Common/AppHeader";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
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

const EditSystemInventory: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { systems, updateSystem } = useSystemContext();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [form, setForm] = useState<System | null>(null);

  useEffect(() => {
    Promise.all([fetchPlants(), fetchDepartments()]).then(([p, d]) => {
      setPlants(p);
      setDepartments(d);
    });
  }, []);

  useEffect(() => {
    const sys = systems.find(s => String(s.id) === id);
    if (sys) setForm({ ...sys });
  }, [id, systems]);

  if (!form) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirm(true);
  };

  const confirmSubmit = async () => {
    const index = systems.findIndex(s => s.id === form.id);
    await updateSystem(index, form);
    navigate("/system-master");
  };

  const input = (name: keyof System, label: string, type = "text") => (
    <div className={styles.formGroup}>
      <label>{label}</label>
      <input
        className={styles.input}
        type={type}
        name={name}
        value={(form as any)[name] ?? ""}
        onChange={handleChange}
      />
    </div>
  );

  const checkbox = (name: keyof System, label: string) => (
    <div className={styles.formGroup}>
      <label>
        <input
          type="checkbox"
          name={name}
          checked={Boolean((form as any)[name])}
          onChange={handleChange}
        />{" "}
        {label}
      </label>
    </div>
  );

  const select = (
    name: keyof System,
    label: string,
    options: string[]
  ) => (
    <div className={styles.formGroup}>
      <label>{label}</label>
      <select
        name={name}
        value={(form as any)[name] ?? ""}
        onChange={handleChange}
        className={styles.select}
      >
        <option value="">-- Select --</option>
        {options.map(v => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      {confirm && (
        <ConfirmLoginModal
          username={user?.username || ""}
          onConfirm={confirmSubmit}
          onCancel={() => setConfirm(false)}
        />
      )}

      <div className={styles.pageWrapper}>
        <AppHeader title="Edit System Inventory" />

        <div className={styles.contentArea}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Edit System Inventory</h2>
            </div>

            <form onSubmit={submit} className={styles.form}>
              <div className={styles.scrollFormContainer}>
                <div className={styles.rowFields}>

                  {/* PLANT */}
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

                  {/* DEPARTMENT */}
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

                  {select("architecture", "Architecture", ["32bit", "64bit"])}
                  {select("type_of_asset", "Type Of Asset", ["Desktop","Laptop","Toughbook","HMI","SCADA","IPC","TABs","Scanner","Printer"])}
                  {select("category_gxp", "Category GxP", ["GxP","Non-GxP","Network"])}

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
                  {select("application_onboard", "Application Onboard", ["Manual","Automated"])}

                  {input("system_process_owner", "System Process Owner")}
                  {input("database_version", "Database Version")}
                  {input("domain_workgroup", "Domain / Workgroup")}
                  {select("connected_through", "Connected Through", ["LAN","WiFi"])}
                  {input("specific_vlan", "Specific VLAN")}
                  {select("ip_address_type", "IP Address Type", ["Static","DHCP","Other"])}

                  {checkbox("date_time_sync_available", "Date Time Sync Available")}
                  {input("antivirus", "Antivirus")}
                  {input("antivirus_version", "Antivirus Version")}
                  {select("backup_type", "Backup Type", ["Manual","Auto","Commvault","Client","Server"])}
                  {select("backup_frequency_days", "Backup Frequency", ["Weekly","Fortnightly","Monthly","Yearly"])}

                  {input("backup_path", "Backup Path")}
                  {input("backup_tool", "Backup Tool")}
                  {checkbox("backup_procedure_available", "Backup Procedure")}
                  {checkbox("folder_deletion_restriction", "Folder Deletion Restriction")}
                  {checkbox("remote_tool_available", "Remote Tool Available")}

                  {input("os_administrator", "OS Administrator")}
                  {select("system_running_with", "System Running With", ["AD","Local"])}
                  {input("audit_trail_adequacy", "Audit Trail Adequacy")}
                  {checkbox("user_roles_availability", "User Roles Availability")}
                  {checkbox("user_roles_challenged", "User Roles Challenged")}
                  {select("system_managed_by", "System Managed By", ["IT","Engineering"])}

                  {checkbox("planned_upgrade_fy2526", "Planned Upgrade FY25-26")}
                  {input("eol_eos_upgrade_status", "EOL / EOS Status")}
                  {select("system_current_status", "System Current Status", ["Validated","Retired"])}

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
                      className={styles.textarea}
                      name="remarks"
                      value={form.remarks ?? ""}
                      onChange={handleChange}
                    />
                  </div>

                  {select("status", "Status", ["ACTIVE","INACTIVE"])}

                </div>
              </div>

              <div className={styles.buttonRow}>
                <button type="submit" className={styles.saveBtn}>Update</button>
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

export default EditSystemInventory;
