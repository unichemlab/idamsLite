import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppHeader from "../../components/Common/AppHeader";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useSystemContext } from "../SystemInventoryMasterUser/SystemContext";
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

    let finalValue: any = value;

    if (type === "checkbox") {
      finalValue = (e.target as HTMLInputElement).checked;
    } else if (type === "number") {
      finalValue = Number(value);
    } else if (value === "true") {
      finalValue = true;
    } else if (value === "false") {
      finalValue = false;
    }

    setForm({
      ...form,
      [name]: finalValue,
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
    <div className={styles.formGroupFloating}>
      <input
        className={styles.input}
        type={type}
        name={name}
        value={(form as any)[name] ?? ""}
        onChange={handleChange}
      />
      <label className={styles.floatingLabel}>{label}</label>
    </div>
  );

  const isWindowsRequired = ["Desktop", "Laptop", "Toughbook"].includes(
    form.type_of_asset || ""
  );

  const isGxPSelected = form.category_gxp === "GxP";

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
              ? (form as any)[name] === true
                ? "true"
                : (form as any)[name] === false
                ? "false"
                : ""
              : ((form as any)[name] || "")
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

            <form onSubmit={submit} className={styles.form} style={{ padding: 10 }}>
              <div className={styles.scrollFormContainer}>
                
                {/* User Details Section */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>User Details</span>
                  <div className={styles.rowFields}>
                    {select("plant_location_id", "Plant Location", plants, { value: (p) => p.id, label: (p) => p.plant_name }, true)}
                    {input("user_location", "User Location")}
                    {input("building_location", "Building Location")}
                    {select("department_id", "Department", departments, { value: (p) => p.id, label: (p) => p.name }, true)}
                    {input("allocated_to_user_name", "Allocated To")}
                  </div>
                </div>

                {/* Commercial Details Section */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>Commercial Details</span>
                  <div className={styles.rowFields}>
                    {input("purchase_po", "Purchase PO")}
                    {input("purchase_vendor_name", "Purchase Vendor")}
                    {input("amc_vendor_name", "AMC Vendor")}
                    {input("renewal_po", "Renewal PO")}
                    {input("warranty_period", "Warranty Period")}
                    {input("amc_start_date", "AMC Start Date", "date")}
                    {input("amc_expiry_date", "AMC Expiry Date", "date")}
                    {input("sap_asset_no", "SAP Asset No")}
                    {select("warranty_status", "Warranty Status", ["Under Warranty", "Out Of Warranty"], true)}
                    {input("warranty_end_date", "Warranty End Date", "date")}
                  </div>
                </div>

                {/* System Details Section */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>System Details</span>
                  <div className={styles.rowFields}>
                    {select("type_of_asset", "Type of Asset", ["Desktop", "Laptop", "Toughbook", "HMI", "SCADA", "IPC", "TABs", "Scanner", "Printer"], true)}
                    {input("make", "Make")}
                    {input("model", "Model")}
                    {input("serial_no", "Serial No")}
                    {input("processor", "Processor")}
                    {input("ram_capacity", "RAM Capacity")}
                    {input("hdd_capacity", "HDD Capacity")}
                    {input("host_name", "Host Name")}
                    {select("windows_activated", "Windows Activated", [], false, isWindowsRequired, !isWindowsRequired, true)}
                    {input("os_version_service_pack", "OS Version / Service Pack")}
                    {select("architecture", "Architecture", ["32 bit", "64 bit"], true)}
                    {input("other_software", "Other Software (If Any)")}
                    {input("ip_address", "IP Address")}
                    {input("domain_workgroup", "Domain / Workgroup")}
                    {select("connected_through", "Connected Through", ["LAN", "WiFi"], true)}
                    {input("specific_vlan", "Specific VLAN")}
                    {select("ip_address_type", "IP Address Type", ["Static", "DHCP", "Other"], true)}
                    {input("antivirus", "Antivirus")}
                    {input("antivirus_version", "Antivirus Version")}
                    {input("os_administrator", "OS Administrator")}
                    {select("system_running_with", "System Running With", ["Active Directory", "Local"], true)}
                    {select("system_managed_by", "System Managed By", ["Information Technology", "Engineering"], true)}
                    {select("eol_eos_upgrade_status", "Upgrade Status", ["End of Life", "End of Support/Sale"], true)}
                  </div>
                </div>

                {/* Equipment Details Section - GxP Conditional */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>Equipment Details</span>
                  <div className={styles.rowFields}>
                    {select("category_gxp", "Category", ["GxP", "Non-GxP", "Network"], true)}
                    
                    {isGxPSelected && (
                      <>
                        {input("system_process_owner", "System Owner / Process Owner")}
                        {input("instrument_equipment_name", "Instrument / Equipment Name")}
                        {input("equipment_instrument_id", "Equipment / Instrument ID")}
                        {input("instrument_owner", "Instrument Owner")}
                        {input("service_tag", "Service Tag")}
                        {input("connected_no_of_equipments", "Connected No. of Equipments", "number")}
                        {select("system_current_status", "System Current Status", ["Validated", "Retired"], true)}
                        {input("gamp_category", "GAMP Category")}
                        {select("application_onboard", "Application Onboard", ["Manual", "Automated"], true)}
                        {input("application_name", "Application Name")}
                        {input("application_version", "Application Version")}
                        {input("application_oem", "Application OEM")}
                        {input("application_vendor", "Application Vendor")}
                        {input("database_version", "Database Version (if installed)")}
                        {select("date_time_sync_available", "Date Time Sync Available", [], false, false, false, true)}
                        {select("backup_type", "Backup Type", ["Manual", "Auto", "Commvault Client Of Server"], true)}
                        {select("backup_frequency_days", "Backup Frequency", ["Weekly", "Fothnight", "Monthly", "Yearly"], true)}
                        {input("backup_path", "Backup Path")}
                        {input("backup_tool", "Backup Tool with Version")}
                        {select("backup_procedure_available", "Backup Procedure Available", [], false, false, false, true)}
                        {select("folder_deletion_restriction", "Folder Deletion Restriction", [], false, false, false, true)}
                        {select("remote_tool_available", "Remote Tool Available", [], false, false, false, true)}
                        {input("audit_trail_adequacy", "Audit Trail Adequacy")}
                        {select("user_roles_availability", "User Roles Availability", [], false, false, false, true)}
                        {select("user_roles_challenged", "User Roles Challenged", [], false, false, false, true)}
                        {select("planned_upgrade_fy2526", "Planned Upgrade FY25-26", [], false, false, false, true)}
                        {select("user_management_applicable", "User Management Applicable", [], false, false, false, true)}
                      </>
                    )}
                  </div>
                </div>

                {/* Remarks Section */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>Additional Information</span>
                  <div className={styles.rowFields}>
                    <div className={styles.formGroupFloating} style={{ flex: "1 1 100%" }}>
                      <textarea
                        className={styles.textarea}
                        name="remarks"
                        value={form.remarks ?? ""}
                        onChange={handleChange}
                      />
                      <label className={styles.floatingLabel}>Remarks</label>
                    </div>
                    {select("status", "Status", ["ACTIVE", "INACTIVE"], true)}
                  </div>
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