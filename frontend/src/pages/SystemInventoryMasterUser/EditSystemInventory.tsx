import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppHeader from "../../components/Common/AppHeader";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useSystemContext } from "../SystemInventoryMasterUser/SystemContext";
import { System, SystemStatus } from "../../types/system";
import { fetchPlants, fetchDepartments, fetchUsers, fetchVendors, API_BASE } from "../../utils/api";
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

const EditSystemInventory: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { systems, updateSystem } = useSystemContext();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [blockSubmit, setBlockSubmit] = useState(false);
  const [form, setForm] = useState<System | null>(null);
  const [statusError, setStatusError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  // 🔒 original DB status (never changes)
  const originalStatus = useRef<SystemStatus>("ACTIVE");
  // 📝 user selected status
  const [requestedStatus, setRequestedStatus] = useState<SystemStatus>("ACTIVE");

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as SystemStatus;
    setRequestedStatus(newStatus);
    setStatusError("");

    // ✅ If user reverts back to original status → unblock submit
    if (newStatus === originalStatus.current) {
      setBlockSubmit(false);
      return;
    }

    // 🔍 Validate only ACTIVE → INACTIVE
    if (
      originalStatus.current === "ACTIVE" &&
      newStatus === "INACTIVE" &&
      form?.id
    ) {
      setIsValidating(true);

      try {
        const res = await fetch(
          `${API_BASE}/api/systems/${form.id}/validate-inactivate`
        );

        const data = await res.json();

        if (!data.canInactivate) {
          setStatusError(
            "⚠️ Cannot change status to INACTIVE: This system is currently being used in one or more active applications."
          );

          setBlockSubmit(true); // 🚫 BLOCK UPDATE
        } else {
          setStatusError("");
          setBlockSubmit(false); // ✅ ALLOW UPDATE
        }
      } catch (err) {
        setStatusError("Failed to validate status change.");
        setBlockSubmit(true);
      } finally {
        setIsValidating(false);
      }
    }
  };


  useEffect(() => {
    Promise.all([fetchPlants(), fetchDepartments(), fetchUsers(), fetchVendors()]).then(([p, d, u, v]) => {
      setPlants(p);
      setDepartments(d);
      setUsers(u);
      setVendors(v);
    });
  }, []);

  useEffect(() => {
    const sys = systems.find(s => String(s.id) === id);
    if (!sys) return;

    setForm({ ...sys });

    if (sys.status === "ACTIVE" || sys.status === "INACTIVE") {
      originalStatus.current = sys.status;
      setRequestedStatus(sys.status);
    }
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
    if (!form) return;

    try {
      // 🔒 VALIDATE ONLY ON SUBMIT
      if (
        originalStatus.current === "ACTIVE" &&
        requestedStatus === "INACTIVE"
      ) {
        const res = await fetch(
          `/api/system/${form.id}/validate-inactivate`
        );
        const data = await res.json();

        if (!data.canInactivate) {
          setStatusError(
            "You are not able to change the status. This system is used in an active application. Do not click on submit."
          );
          setConfirm(false);
          return; // ⛔ BLOCK UPDATE
        }
      }

      const index = systems.findIndex(s => s.id === form.id);
      await updateSystem(index, {
        ...form,
        status: requestedStatus
      });

      navigate("/system-master");

    } catch (err: any) {
      setConfirm(false);
      alert(err.message || "Update failed");
    }
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
                    {select("allocated_to_user_name", "Allocated To", users, { value: (u) => u.id, label: (u) => u.name }, true)}
                  </div>
                </div>

                {/* Commercial Details Section */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>Commercial Details</span>
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

                {/* System Details Section */}
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

                {/* Equipment Details Section - GxP Conditional */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>
                    Equipment Details
                  </span>
                  <div className={styles.rowFields}>
                    {select("category_gxp", "Category", ["GxP", "Non-GxP", "Network"], true)}

                    {/* ✅ Show these fields only when GxP is selected */}
                    {isGxPSelected && (
                      <>
                        {input("system_process_owner", "System Owner / Process Owner", "text", true)}
                        {input("instrument_equipment_name", "Instrument / Equipment Name", "text", true)}
                        {input("equipment_instrument_id", "Equipment / Instrument ID", "text", true)}
                        {input("instrument_owner", "Instrument Owner", "text", true)}
                        {input("service_tag", "Service Tag", "text", true)}
                        {input("connected_no_of_equipments", "Connected No. of Equipments", "number", true)}
                        {select("system_current_status", "System Current Status", ["Validated", "Retired"], true)}
                        {input("gamp_category", "GAMP Category", "text", true)}
                        {select("application_onboard", "Application Onboard", ["Manual", "Automated"], true)}
                        {input("application_name", "Application Name", "text", true)}
                        {input("application_version", "Application Version", "text", true)}
                        {input("application_oem", "Application OEM", "text", true)}
                        {select("application_vendor", "Application Vendor", vendors, { value: (v) => v.id, label: (v) => v.vendor_name }, true)}
                        {input("database_version", "Database Version (if installed)", "text", true)}
                        {select("date_time_sync_available", "Date Time Sync Available", [], false, false, false, true)}
                        {select("backup_type", "Backup Type", ["Manual", "Auto", "Commvault Client Of Server"], true)}
                        {select("backup_frequency_days", "Backup Frequency", ["Weekly", "Fothnight", "Monthly", "Yearly"], true)}
                        {input("backup_path", "Backup Path", "text", true)}
                        {input("backup_tool", "Backup Tool with Version", "text", true)}
                        {select("backup_procedure_available", "Backup Procedure Available", [], false, false, false, true)}
                        {select("folder_deletion_restriction", "Folder Deletion Restriction", [], false, false, false, true)}
                        {select("remote_tool_available", "Remote Tool Available", [], false, false, false, true)}
                        {input("audit_trail_adequacy", "Audit Trail Adequacy", "text", true)}
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
                    <div className={styles.formGroupFloating}>
                      <select
                        name="status"
                        value={requestedStatus}
                        onChange={handleStatusChange}
                        required
                        className={styles.select}
                        disabled={isValidating}
                      >
                        <option value="">-- Select --</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>

                      <label className={styles.floatingLabel}>
                        Status<span className={styles.required}> *</span>
                      </label>

                      {/* Loading indicator while validating */}
                      {isValidating && (
                        <p style={{
                          color: "#1976d2",
                          fontSize: 12,
                          marginTop: 4,
                          fontStyle: "italic"
                        }}>
                          🔍 Validating status change...
                        </p>
                      )}

                      {/* Error message if validation failed */}
                      {statusError && (
                        <div style={{
                          color: "#d32f2f",
                          fontSize: 13,
                          marginTop: 8,
                          padding: 12,
                          backgroundColor: "#ffebee",
                          borderLeft: "4px solid #d32f2f",
                          borderRadius: 4,
                          fontWeight: 500,
                          lineHeight: 1.5
                        }}>
                          {statusError}
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>

              <div className={styles.buttonRow}>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={blockSubmit || isValidating}
                >
                  Update
                </button>

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