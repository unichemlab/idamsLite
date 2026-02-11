import React, { useContext, useState, useEffect } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useNavigate, useParams } from "react-router-dom";
import { ServerContext,Server } from "../ServerInventorymasterUser/ServerContext";
import { useAuth } from "../../context/AuthContext";
import AppHeader from "../../components/Common/AppHeader";
import { fetchPlants } from "../../utils/api";
import styles from "../Plant/AddPlantMaster.module.css";

interface Plant {
  id: number;
  plant_name: string;
}

const EditServerInventory: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const serverCtx = useContext(ServerContext);
  const navigate = useNavigate();
  const [plants, setPlants] = useState<Plant[]>([]);

  // Find server by id
  const server = serverCtx?.servers.find((s: Server) => String(s.id) === id);
  
  const [form, setForm] = useState<Server>({
    id: server?.id ?? 0,
    transaction_id: server?.transaction_id ?? "",
    plant_location_id: server?.plant_location_id ?? undefined,
    rack_number: server?.rack_number ?? "",
    server_owner: server?.server_owner ?? "",
    type_tower_rack_mounted: server?.type_tower_rack_mounted ?? "",
    server_rack_location_area: server?.server_rack_location_area ?? "",
    asset_no: server?.asset_no ?? "",
    host_name: server?.host_name ?? "",
    make: server?.make ?? "",
    model: server?.model ?? "",
    serial_no: server?.serial_no ?? "",
    os: server?.os ?? "",
    physical_server_host_name: server?.physical_server_host_name ?? "",
    idrac_ilo: server?.idrac_ilo ?? "",
    ip_address: server?.ip_address ?? "",
    part_no: server?.part_no ?? false,
    application: server?.application ?? "",
    application_version: server?.application_version ?? "",
    application_oem: server?.application_oem ?? "",
    application_vendor: server?.application_vendor ?? "",
    system_owner: server?.system_owner ?? "",
    vm_display_name: server?.vm_display_name ?? "",
    vm_type: server?.vm_type ?? "",
    vm_os: server?.vm_os ?? "",
    vm_version: server?.vm_version ?? "",
    vm_server_ip: server?.vm_server_ip ?? "",
    domain_workgroup: server?.domain_workgroup ?? "",
    windows_activated: server?.windows_activated ?? 0,
    backup_agent: server?.backup_agent ?? "",
    antivirus: server?.antivirus ?? "",
    category_gxp: server?.category_gxp ?? "",
    current_status: server?.current_status ?? "",
    server_managed_by: server?.server_managed_by ?? false,
    remarks_application_usage: server?.remarks_application_usage ?? "",
    start_date: server?.start_date ?? "",
    end_date: server?.end_date ?? "",
    aging: server?.aging ?? "",
    environment: server?.environment ?? "",
    server_critility: server?.server_critility ?? "",
    database_appplication: server?.database_appplication ?? "",
    current_rpo: server?.current_rpo ?? false,
    reduce_rpo_time: server?.reduce_rpo_time ?? "",
    server_to_so_timeline: server?.server_to_so_timeline ?? "",
    purchase_date: server?.purchase_date ?? "",
    purchase_po: server?.purchase_po ?? "",
    warranty_new_start_date: server?.warranty_new_start_date ?? "",
    amc_warranty_expiry_date: server?.amc_warranty_expiry_date ?? "",
    sap_asset_no: server?.sap_asset_no ?? false,
    amc_vendor: server?.amc_vendor ?? false,
    remarks: server?.remarks ?? "",
    status: server?.status ?? "ACTIVE",
    created_on: server?.created_on ?? "",
    updated_on: server?.updated_on ?? "",
  });
  
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchPlants().then(setPlants);
  }, []);
const plantOptions = Array.isArray(plants)
    ? plants
      .filter((plant: any) => {
        // 🔥 Super Admin → all plants
        if (
          user?.role_id === 1 ||
          (Array.isArray(user?.role_id) && user?.role_id.includes(1)) ||
          user?.isSuperAdmin
        ) {
          return true;
        }

        const plantId = Number(plant.id);

        // 🔒 IT Bin access
        // if (user?.isITBin && Array.isArray(user?.itPlantIds)) {
        //   return user.itPlantIds.includes(plantId);
        // }

        // 🔒 Normal permitted plants
        if (Array.isArray(user?.permittedPlantIds)) {
          return user?.permittedPlantIds.includes(plantId);
        }

        return false;
      })
      .map((plant: any) => ({
        value: String(plant.id),
        label: plant.plant_name || plant.name || String(plant.id),
      }))
    : [];
  if (!serverCtx || id === undefined || !server) return <div>Server not found</div>;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
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
    if (server && server.id !== undefined) {
      try {
        await serverCtx.updateServer(server.id, form);
        setShowConfirm(false);
        navigate("/server-master");
      } catch (error) {
        console.error("Error updating server:", error);
        alert("Failed to update server. Please try again.");
      }
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  const input = (name: keyof Server, label: string, type = "text") => (
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

  const isVirtualSelected = form.vm_type === "Virtual";

  type OptionValue = string | number;

  type GenericSelectOption<T> = {
    value: (item: T) => OptionValue;
    label: (item: T) => string;
  };

  const select = <T,>(
    name: keyof Server,
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
    <React.Fragment>
      {showConfirm && (
        <ConfirmLoginModal
          username={user?.username || ""}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      <div className={styles.pageWrapper}>
        <AppHeader title="Server Inventory Management" />

        <div className={styles.contentArea}>
          {/* Breadcrumb */}
          <div className={styles.breadcrumb}>
            <span
              className={styles.breadcrumbLink}
              onClick={() =>
                navigate("/server-master", { state: { activeTab: "server" } })
              }
            >
              Server Master
            </span>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbCurrent}>Edit Server</span>
          </div>

          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Edit Server</h2>
              <p>Update server details in the system</p>
            </div>
            <form
              className={styles.form}
              onSubmit={handleSubmit}
              style={{ padding: 10 }}
            >
              <div className={styles.scrollFormContainer}>
                
                {/* User Details Section */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>User Details</span>
                  <div className={styles.rowFields}>
                    {select("plant_location_id", "Plant Location", plantOptions, { value: (p) => p.value, label: (p) => p.label }, true)}
                    {input("server_owner", "Server Owner")}
                  </div>
                </div>

                {/* Commercial Details Section */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>Commercial Details</span>
                  <div className={styles.rowFields}>
                    {input("purchase_po", "Purchase PO")}
                    {input("purchase_date", "Purchased Date", "date")}
                    {input("sap_asset_no", "SAP Asset No")}
                    {input("warranty_new_start_date", "Warranty New Start Date", "date")}
                    {input("amc_warranty_expiry_date", "AMC/Warranty Expiry Date", "date")}
                    {input("amc_vendor", "AMC Vendor")}
                    {input("asset_no", "Asset No")}
                  </div>
                </div>

                {/* Application Details Section */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>Application Details</span>
                  <div className={styles.rowFields}>
                    {input("application", "Application")}
                    {input("application_version", "Application Version")}
                    {input("application_oem", "Application OEM")}
                    {input("application_vendor", "Application Vendor")}
                  </div>
                </div>

                {/* Server Details Section */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>Server Details</span>
                  <div className={styles.rowFields}>
                    {input("rack_number", "Rack Number")}
                    {select("type_tower_rack_mounted", "Mounted Type", ["Tower", "Rack"], true)}
                    {input("server_rack_location_area", "Server/Rack Location")}
                    {select("vm_type", "Server Type", ["Physical", "Virtual"], true)}
                    {input("host_name", "Host Name")}
                    {input("make", "Make")}
                    {input("model", "Model")}
                    {input("serial_no", "Serial No")}
                    {input("os", "Operating System")}
                    {input("idrac_ilo", "IDRAC/ILO")}
                    {input("ip_address", "IP Address")}
                    {select("part_no", "Part Number", [], false, false, false, true)}
                    {input("system_owner", "System Owner")}
                    {select("domain_workgroup", "Domain Name", ["Domain", "Work Group CORP Domain", "GXP"], true)}
                    {select("windows_activated", "Windows Activated", [], false, false, false, true)}
                    {select("backup_agent", "Backup Agent", ["VEEAM", "Acronis"], true)}
                    {select("antivirus", "Antivirus", ["CS", "TM", "McAfee", "Symantec"], true)}
                    {select("category_gxp", "Category", ["GxP", "Non-GxP"], true)}
                    {input("current_status", "Current Status of Server")}
                    {select("server_managed_by", "Server Managed By", ["IT", "ESD"], true)}
                    {input("remarks_application_usage", "Remarks for Application Usage")}
                    {input("start_date", "Start Date", "date")}
                    {input("end_date", "End Date", "date")}
                    {input("aging", "Aging")}
                    {input("environment", "Environment")}
                    {input("server_critility", "Server Critility")}
                    {input("database_appplication", "Database/Application")}
                    {select("current_rpo", "Current RPO", [], false, false, false, true)}
                    {input("reduce_rpo_time", "Reduce RPO Time from 24 Hrs")}
                    {input("server_to_so_timeline", "Server to SO Timeline")}

                    {/* Virtual Machine fields - shown only when Virtual is selected */}
                    {isVirtualSelected && (
                      <>
                        {input("physical_server_host_name", "Physical Server Host Name")}
                        {input("vm_display_name", "VM Display Name")}
                        {input("vm_os", "Virtual Machine OS")}
                        {input("vm_version", "Virtual Machine Version")}
                        {input("vm_server_ip", "Virtual Machine Server IP")}
                      </>
                    )}
                  </div>
                </div>

                {/* Additional Details Section */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>Additional Details</span>
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
                  <button type="submit" className={styles.saveBtn}>
                    Update
                  </button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => navigate("/server-master")}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default EditServerInventory;