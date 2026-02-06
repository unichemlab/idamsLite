import React, { useEffect, useState } from "react";
import AppHeader from "../../components/Common/AppHeader";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSystemContext } from "../SystemInventoryMasterUser/SystemContext";
import { System } from "../../types/system";
import { fetchPlants, fetchDepartments, fetchUsers,fetchVendors } from "../../utils/api";
import styles from "../Plant/AddPlantMaster.module.css";

interface Plant {
  id: number;
  plant_name: string;
}

interface Department {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
}
interface Vendor {
  id: number;
  vendor_name: string;
  vendor_code: string;
}

const AddSystemInventory: React.FC = () => {
  const { addSystem } = useSystemContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
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
    Promise.all([fetchPlants(), fetchDepartments(), fetchUsers(), fetchVendors()]).then(([p, d, u,v]) => {
      setPlants(p);
      setDepartments(d);
      setUsers(u);
      setVendors(v);
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

  const input = (
    name: keyof System,
    label: string,
    type = "text",
    isRequired: boolean = false,
    isDisabled: boolean = false
  ) => (
    <div className={styles.formGroupFloating}>
      <input
        type={type}
        name={name}
        value={form[name] as any}
        onChange={handleChange}
        required={isRequired}
        disabled={isDisabled}
        className={styles.input}
      />
      <label className={styles.floatingLabel}>
        {label}
        {isRequired && <span className={styles.required}> *</span>}
      </label>
    </div>
  );
 
  const isUnderWarranty = form.warranty_status === "Under Warranty";
  const isOutOfWarranty = form.warranty_status === "Out Of Warranty";

const isFieldRequired = (field: keyof System) =>
  REQUIRED_FIELDS[form.type_of_asset as string]?.includes(field) ?? false;

  const isWindowsRequired = ["Desktop", "Laptop", "Toughbook"].includes(
    form.type_of_asset || ""
  );

  const REQUIRED_FIELDS: Record<string, (keyof System)[]> = {
  Desktop: [
    "host_name",
    "make",
    "model",
    "serial_no",
    "processor",
    "architecture",
    "ram_capacity",
    "hdd_capacity",
    "os_version_service_pack",
    "windows_activated",
    "domain_workgroup",
    "connected_through",
    "ip_address_type",
    "ip_address",
    "specific_vlan",
  "other_software",
    "antivirus",
    "antivirus_version",
    "os_administrator",
    "system_running_with",
    "system_managed_by",
    "eol_eos_upgrade_status"
  ],

  Laptop: [
    "host_name",
    "make",
    "model",
    "serial_no",
    "processor",
    "architecture",
    "ram_capacity",
    "hdd_capacity",
    "os_version_service_pack",
    "windows_activated",
    "domain_workgroup",
    "connected_through",
    "ip_address_type",
    "ip_address",
    "specific_vlan",
  "other_software",
    "antivirus",
    "antivirus_version",
    "os_administrator",
    "system_running_with",
    "system_managed_by",
    "eol_eos_upgrade_status"
  ],

  Toughbook: [
    "host_name",
    "make",
    "model",
    "serial_no",
    "processor",
    "architecture",
    "ram_capacity",
    "hdd_capacity",
    "os_version_service_pack",
    "windows_activated",
    "domain_workgroup",
    "connected_through",
    "ip_address_type",
    "ip_address",
  "other_software",
    "antivirus",
    "os_administrator",
    "system_running_with",
    "eol_eos_upgrade_status"
  ],

  HMI: [
    "make",
    "model",
    "serial_no",
    "ram_capacity",
    "hdd_capacity",
    "connected_through",
    "ip_address_type",
    "ip_address",
  "other_software",
    "eol_eos_upgrade_status"
  ],

  SCADA: [
    "make",
    "model",
    "serial_no",
    "ram_capacity",
    "hdd_capacity",
    "connected_through",
    "ip_address_type",
    "ip_address",
  "other_software",
    "eol_eos_upgrade_status"
  ],

  IPC: [
    "host_name",
    "make",
    "model",
    "serial_no",
    "processor",
    "architecture",
    "ram_capacity",
    "hdd_capacity",
    "os_version_service_pack",
    "windows_activated",
    "domain_workgroup",
    "connected_through",
    "ip_address_type",
    "ip_address",
    "specific_vlan",
  "other_software",
    "antivirus",
    "antivirus_version",
    "os_administrator",
    "system_running_with",
    "system_managed_by",
    "eol_eos_upgrade_status"
  ],

  TABs: [
      "host_name",
    "make",
    "model",
    "serial_no",
    "processor",
    "architecture",
    "ram_capacity",
    "hdd_capacity",
    "connected_through",
    "ip_address_type",
    "ip_address",
  "other_software",
    "eol_eos_upgrade_status"
  ],

  Scanner: [
    "make",
    "model",
    "serial_no",
    "hdd_capacity",
    "connected_through",
    "ip_address_type",
    "ip_address",
    "eol_eos_upgrade_status"
  ],

  Printer: [
    "make",
    "model",
    "serial_no",
    "hdd_capacity",
    "connected_through",
    "ip_address_type",
    "ip_address",
    "eol_eos_upgrade_status"
  ]
};




  // ✅ Check if GxP is selected
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

            <form className={styles.form} onSubmit={handleSubmit} style={{ padding: 10 }}>
              <div className={styles.scrollFormContainer}>
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>
                    User Details
                  </span>
                  <div className={styles.rowFields}>
                    {select("plant_location_id", "Plant Location", plants, { value: (p) => p.id, label: (p) => p.plant_name }, true)}
                    {input("user_location", "User Location")}
                    {input("building_location", "Building Location")}
                    {select("department_id", "Department", departments, { value: (p) => p.id, label: (p) => p.name }, true)}
                    {select("allocated_to_user_name", "Allocated To", users, { value: (u) => u.id, label: (u) => u.name }, true)}
                  </div>
                </div>

                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>
                    Commercial Details
                  </span>
                  <div className={styles.rowFields}>
                    {input("purchase_po", "Purchase PO")}
                    {input("purchase_vendor_name", "Purchase Vendor")}
                    {select("warranty_status", "Warranty Status", ["Under Warranty", "Out Of Warranty"], true)}
                    {input(
                      "warranty_period",
                      "Warranty Period (Months)",
                      "number",
                      isUnderWarranty
                    )}

                    {input(
                      "warranty_end_date",
                      "Warranty End Date",
                      "date",
                      isUnderWarranty
                    )}

                    {input(
                      "amc_vendor_name",
                      "AMC Vendor",
                      "text",
                      isOutOfWarranty
                    )}

                    {input(
                      "amc_start_date",
                      "AMC Start Date",
                      "date",
                      isOutOfWarranty
                    )}

                    {input(
                      "amc_expiry_date",
                      "AMC End Date",
                      "date",
                      isOutOfWarranty
                    )}
                    {input("renewal_po", "Renewal PO")}
                    {input("sap_asset_no", "SAP Asset No")}
                  </div>
                </div>

                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>
                    System Details
                  </span>
                  <div className={styles.rowFields}>
                    {select("type_of_asset", "Type of Asset", ["Desktop", "Laptop", "Toughbook", "HMI", "SCADA", "IPC", "TABs", "Scanner", "Printer"], true)}
                    {input("host_name", "Host Name", "text", isFieldRequired("host_name"))}
                    {input("make", "Make", "text", isFieldRequired("make"))}
                    {input("model", "Model", "text", isFieldRequired("model"))}
                    {input("serial_no", "Serial No", "text", isFieldRequired("serial_no"))}
                    {input("processor", "Processor", "text", isFieldRequired("processor"))}
                     {select("architecture", "Architecture", ["32 bit", "64 bit"], isFieldRequired("architecture"))}
                    {input("ram_capacity", "RAM Capacity", "text", isFieldRequired("ram_capacity"))}
                    {input("hdd_capacity", "HDD Capacity", "text", isFieldRequired("hdd_capacity"))}
                    {input("os_version_service_pack", "OS Version / SP", "text", isFieldRequired("os_version_service_pack"))}
                    {select("windows_activated", "Windows Activated", [], false, isWindowsRequired, !isWindowsRequired, isFieldRequired("windows_activated"))}
                    {input("domain_workgroup", "Domain / Workgroup", "text", isFieldRequired("domain_workgroup"))}
                    {select("connected_through", "Connected Through", ["LAN", "WiFi"], isFieldRequired("connected_through"))}
                     {select("ip_address_type", "IP Address Type", ["Static", "DHCP", "Other"], isFieldRequired("ip_address_type"))}
                    {input("ip_address", "IP Address", "text", isFieldRequired("ip_address"))}
                    {input("specific_vlan", "Specific VLAN", "text", isFieldRequired("specific_vlan"))}
                    {input("other_software", "Other Software", "text", isFieldRequired("other_software"))}
                    {input("antivirus", "Antivirus", "text", isFieldRequired("antivirus"))}
                    {input("antivirus_version", "Antivirus Version", "text", isFieldRequired("antivirus_version"))}
                   {input("os_administrator", "OS Administrator", "text", isFieldRequired("os_administrator"))}
                    {select("system_running_with", "System Running With", ["Active Directory", "Local"], isFieldRequired("system_running_with"))}
                    {select("system_managed_by", "System Managed By", ["Information Technology", "Engineering"], isFieldRequired("system_managed_by"))}
                    {select("eol_eos_upgrade_status", "Upgrade Status", ["End of Life", "End of Support/Sale"], isFieldRequired("eol_eos_upgrade_status"))}
                  </div>
                </div>

                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>
                    Equipment Details
                  </span>
                  <div className={styles.rowFields}>
                    {select("category_gxp", "Category", ["GxP", "Non-GxP", "Network"], true)}

                    {/* ✅ Show these fields only when GxP is selected */}
                    {isGxPSelected && (
                      <>
                        {input("system_process_owner", "System Owner / Process Owner","text",true)}
                        {input("instrument_equipment_name", "Instrument / Equipment Name","text",true)}
                        {input("equipment_instrument_id", "Equipment / Instrument ID","text",true)}
                        {input("instrument_owner", "Instrument Owner","text",true)}
                        {input("service_tag", "Service Tag","text",true)}
                        {input("connected_no_of_equipments", "Connected No. of Equipments", "number",true)}
                        {select("system_current_status", "System Current Status", ["Validated", "Retired"], true)}
                        {input("gamp_category", "GAMP Category","text",true)}
                        {select("application_onboard", "Application Onboard", ["Manual", "Automated"], true)}
                        {input("application_name", "Application Name", "text",true)}
                        {input("application_version", "Application Version", "text",true)}
                        {input("application_oem", "Application OEM", "text",true)}
                         {select("application_vendor", "Application Vendor", vendors, { value: (v) => v.id, label: (v) => v.vendor_name }, true)}
                        {input("database_version", "Database Version (if installed)","text",true)}
                        {select("date_time_sync_available", "Date Time Sync Available", [], false, false, false, true)}
                        {select("backup_type", "Backup Type", ["Manual", "Auto", "Commvault Client Of Server"], true)}
                        {select("backup_frequency_days", "Backup Frequency", ["Weekly", "Fothnight", "Monthly", "Yearly"], true)}
                        {input("backup_path", "Backup Path","text",true)}
                        {input("backup_tool", "Backup Tool with Version","text",true)}
                        {select("backup_procedure_available", "Backup Procedure Available", [], false, false, false, true)}
                        {select("folder_deletion_restriction", "Folder Deletion Restriction", [], false, false, false, true)}
                        {select("remote_tool_available", "Remote Tool Available", [], false, false, false, true)}
                        {input("audit_trail_adequacy", "Audit Trail Adequacy","text",true)}
                        {select("user_roles_availability", "User Roles Availability", [], false, false, false, true)}
                        {select("user_roles_challenged", "User Roles Challenged", [], false, false, false, true)}
                        {select("planned_upgrade_fy2526", "Planned Upgrade FY25-26", [], false, false, false, true)}
                        {select("user_management_applicable", "User Management Applicable", [], false, false, false, true)}
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>
                    Additional Details
                  </span>
                  <div className={styles.rowFields}>


                    <div className={styles.formGroupFloating} style={{ flex: "1 1 100%" }}>
                      <textarea
                        name="remarks"
                        value={form.remarks}
                        onChange={handleChange}
                        className={styles.textarea}
                      />
                      <label className={styles.floatingLabel}>Remarks</label>
                    </div>
                    {select("status", "Status", ["ACTIVE", "INACTIVE"], true)}
                  </div>
                </div>
              </div>

              <div className={styles.formFotter}>
                <div
                  className={styles.buttonRow}
                  style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    gap: 24,
                    margin: 15,
                  }}
                >
                  <button type="submit" className={styles.saveBtn}>Save</button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => navigate("/system-master")}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddSystemInventory;