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
  e: React.ChangeEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >
) => {
  const { name, value, type } = e.target;

  let finalValue: any = value;

  // ✅ checkbox → boolean
  if (type === "checkbox") {
    finalValue = (e.target as HTMLInputElement).checked;
  }

  // ✅ number input → number
  else if (type === "number") {
    finalValue = Number(value);
  }

  // ✅ select boolean → boolean
  else if (value === "true") {
    finalValue = true;
  } else if (value === "false") {
    finalValue = false;
  }

  setForm((prev) => ({
    ...prev,
    [name]: finalValue,
  }));
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
    <div className={styles.formGroupFloating}>
      <input
        type={type}
        name={name}
        value={form[name] as any}
        onChange={handleChange}
        className={styles.input}
      />
       <label className={styles.floatingLabel}>{label}</label>
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
const isWindowsRequired = ["Desktop", "Laptop", "Toughbook"].includes(
  form.type_of_asset || ""
);
 type OptionValue = string | number;

type GenericSelectOption<T> = {
  value: (item: T) => OptionValue;
  label: (item: T) => string;
};

const select = <T,>(
  name: keyof System,
  label: string,
  options: T[] = [],
  mapperOrRequired?: GenericSelectOption<T> | boolean,
  isRequiredParam: boolean = false,
  isDisabled: boolean = false,
  isBoolean: boolean = false
) => {
  // ✅ support old & new signatures
  const mapper =
    typeof mapperOrRequired === "object" ? mapperOrRequired : undefined;

  const isRequired =
    typeof mapperOrRequired === "boolean"
      ? mapperOrRequired
      : isRequiredParam;

  return (
    <div className={styles.formGroupFloating}>
      <select
        name={name}
        value={
          isBoolean
            ? form[name] === true
              ? "true"
              : form[name] === false
              ? "false"
              : ""
            : ((form[name] as any) || "")
        }
        onChange={handleChange}
        required={isRequired}
        disabled={isDisabled}
        className={styles.select}
      >
        <option value="">-- Select --</option>

        {isBoolean ? (
          <>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </>
        ) : mapper ? (
          options.map((item, i) => (
            <option key={i} value={mapper.value(item)}>
              {mapper.label(item)}
            </option>
          ))
        ) : (
          (options as any[]).map((v, i) => (
            <option key={i} value={v as any}>
              {String(v)}
            </option>
          ))
        )}
      </select>

      <label className={styles.floatingLabel}>
        {label}
        {isRequired && <span className={styles.required}> *</span>}
      </label>
    </div>
  );
};

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
                  {select("plant_location_id", "Plant Location",plants,{value: (p) => p.id,label: (p) => p.plant_name},true)}
                  {input("user_location", "User Location")}
                  {input("building_location", "Building Location")}
                  {select("department_id", "Department" , departments,{value: (p) => p.id,label: (p) => p.name}, true)}
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
                  {/* {checkbox("windows_activated", "Windows Activated")} */}
                  {input("os_version_service_pack", "OS Version / SP")}
                  {select("architecture","Architecture",["32 bit", "64 bit"],true)}
                    {select("type_of_asset","Type of Asset",["Desktop", "Laptop", "Toughbook", "HMI", "SCADA", "IPC", "TABs", "Scanner", "Printer"],true)}
                  {select("windows_activated","Windows Activated",[],false,isWindowsRequired,!isWindowsRequired,true)}
                  {select("category_gxp","Category",["GxP", "Non-GxP","Network"],true)}
                  {input("gamp_category", "GAMP Category")}
                  {input("instrument_equipment_name", "Instrument / Equipment")}
                  {input("equipment_instrument_id", "Equipment ID")}
                  {input("instrument_owner", "Instrument Owner")}
                  {input("service_tag", "Service Tag")}
                 {select("warranty_status","Warranty Status",["Under Warranty", "Out Of Warranty"],true)}
                  {input("warranty_end_date", "Warranty End Date", "date")}
                  {input("connected_no_of_equipments", "Connected Equipments", "number")}
                  {input("application_name", "Application Name")}
                  {input("application_version", "Application Version")}
                  {input("application_oem", "Application OEM")}
                  {input("application_vendor", "Application Vendor")}
                  {/* {checkbox("user_management_applicable", "User Management Applicable")} */}
                  {select("user_management_applicable","User Management Applicable",[],false,!isWindowsRequired,!isWindowsRequired,true)}
                  {select("application_onboard","Application Onboard",["Manual", "Automated"],true)}
              
                  {input("system_process_owner", "System Process Owner")}
                  {input("database_version", "Database Version (if installeds)")}
                  {input("domain_workgroup", "Domain / Workgroup")}
                  {select("connected_through","Connected Through",["LAN", "WiFi"],true)}

                  {input("specific_vlan", "Specific VLAN")}
                   {select("ip_address_type","IP Address Type",["Static", "DHCP","Other"],true)}
                   {select("date_time_sync_available","Date Time Sync",[],false,!isWindowsRequired,!isWindowsRequired,true)}
                  {input("antivirus", "Antivirus")}
                  {input("antivirus_version", "Antivirus Version")}
                  {select("backup_type","Backup Type",["Manual", "Auto","Commvault Client Of Server"],true)}
                   {select("backup_frequency_days","Backup Frequency Days",["Weekly", "Fothnight", "Monthly", "Yearly"],true)}
                  {input("backup_path", "Backup Path")}
                  {input("backup_tool", "Backup Tool")}
                   {select("backup_procedure_available","Backup Procedure",[],false,!isWindowsRequired,!isWindowsRequired,true)}
                  
                   {select("folder_deletion_restriction","Folder Deletion Restriction",[],false,!isWindowsRequired,!isWindowsRequired,true)}
                   {select("remote_tool_available","Remote Tool",[],false,!isWindowsRequired,!isWindowsRequired,true)}
                  {input("os_administrator", "OS Administrator")}
                  <select name="system_running_with" value={form.system_running_with} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    <option value="AD">AD</option>
                    <option value="Local">Local</option>
                  </select>

                  {input("audit_trail_adequacy", "Audit Trail Adequacy")}
                   {select("user_roles_availability","User Roles Available",[],false,!isWindowsRequired,!isWindowsRequired,true)}
                   {select("user_roles_challenged","User Roles Challenged",[],false,!isWindowsRequired,!isWindowsRequired,true)}
                  <select name="system_managed_by" value={form.system_managed_by} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    <option value="IT">IT</option>
                    <option value="Engineering">Engineering</option>
                  </select>
                    {select("planned_upgrade_fy2526","Planned Upgrade FY25-26",[],false,!isWindowsRequired,!isWindowsRequired,true)}
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
