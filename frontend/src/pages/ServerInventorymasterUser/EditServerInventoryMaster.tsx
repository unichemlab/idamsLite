import React, { useContext, useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useNavigate, useParams } from "react-router-dom";
import { ServerContext } from "../ServerInventoryMaster/ServerContext";
import { Server } from "../ServerInventoryMaster/ServerContext";
import { useAuth } from "../../context/AuthContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/AddPlantMaster.module.css";

const EditServerInventory: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const serverCtx = useContext(ServerContext);
  const navigate = useNavigate();

  // Find server by id (not index) for robustness
  const server = serverCtx?.servers.find((s: Server) => String(s.id) === id);
  console.log("Editing server:", server?.host_name, "with id:", id);
  
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
    purchase_po: server?.purchase_po ?? 0,
    warranty_new_start_date: server?.warranty_new_start_date ?? "",
    amc_warranty_expiry_date: server?.amc_warranty_expiry_date ?? "",
    sap_asset_no: server?.sap_asset_no ?? false,
    amc_vendor: server?.amc_vendor ?? false,
    remarks: server?.remarks ?? "",
    status: server?.status ?? "ACTIVE",
    created_on: server?.created_on ?? "",
    updated_on: server?.updated_on ?? "",
  });
  
  console.log("Form state initialized to:", form);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!serverCtx || id === undefined || !server) return <div>Server not found</div>;

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
    } else if (["plant_location_id", "purchase_po", "windows_activated"].includes(name)) {
      setForm({
        ...form,
        [name]: type === "number" ? Number(value) : Number(value),
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    // Update by id, not index
    if (server && server.id !== undefined) {
      serverCtx.updateServer(server.id, form);
    }
    setShowConfirm(false);
    navigate("/server-master");
  };

  const handleCancel = () => {
    setShowConfirm(false);
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
              <p>Enter Server details to edit a record in the system</p>
            </div>
            <form
              className={styles.form}
              onSubmit={handleSubmit}
              style={{ width: "100%" }}
            >
              <div className={styles.scrollFormContainer}>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>Transaction ID</label>
                    <input
                      name="transaction_id"
                      value={form.transaction_id}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Plant Location</label>
                    <input
                      type="number"
                      name="plant_location_id"
                      value={form.plant_location_id ?? ""}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>RACK NUMBER</label>
                    <input
                      name="rack_number"
                      value={form.rack_number}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>SERVER OWNER</label>
                    <input
                      name="server_owner"
                      value={form.server_owner}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Type Tower / Rack mounted</label>
                    <input
                      name="type_tower_rack_mounted"
                      value={form.type_tower_rack_mounted}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Server / RACK Location / Area</label>
                    <input
                      name="server_rack_location_area"
                      value={form.server_rack_location_area}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>Asset No.</label>
                    <input
                      name="asset_no"
                      value={form.asset_no}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Host Name</label>
                    <input
                      name="host_name"
                      value={form.host_name}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>MAKE</label>
                    <input
                      name="make"
                      value={form.make}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>MODEL</label>
                    <input
                      name="model"
                      value={form.model}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>SERIAL NO.</label>
                    <input
                      name="serial_no"
                      value={form.serial_no}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>OS</label>
                    <input
                      name="os"
                      value={form.os}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>Physical Server Host Name</label>
                    <input
                      name="physical_server_host_name"
                      value={form.physical_server_host_name}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>IDRAC/ILO</label>
                    <input
                      name="idrac_ilo"
                      value={form.idrac_ilo}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>IP-ADDRESS</label>
                    <input
                      name="ip_address"
                      value={form.ip_address}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>Part No.</label>
                    <input
                      name="part_no"
                      type="checkbox"
                      checked={!!form.part_no}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>APPLICATION</label>
                    <input
                      name="application"
                      value={form.application}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Application Version</label>
                    <input
                      name="application_version"
                      value={form.application_version}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>Application OEM</label>
                    <input
                      name="application_oem"
                      value={form.application_oem}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Application Vendor</label>
                    <input
                      name="application_vendor"
                      value={form.application_vendor}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>System Owner</label>
                    <input
                      name="system_owner"
                      value={form.system_owner}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>VM Display Name</label>
                    <input
                      name="vm_display_name"
                      value={form.vm_display_name}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>TYPE</label>
                    <input
                      name="vm_type"
                      value={form.vm_type}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>VM OS</label>
                    <input
                      name="vm_os"
                      value={form.vm_os}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>VM Version</label>
                    <input
                      name="vm_version"
                      value={form.vm_version}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>VM Server IP</label>
                    <input
                      name="vm_server_ip"
                      value={form.vm_server_ip}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>
                      Domain / Work Group CORP Domain / GXP - mention name of
                      Domain
                    </label>
                    <input
                      name="domain_workgroup"
                      value={form.domain_workgroup}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>Is Windows Activated Yes / No</label>
                    <select
                      name="windows_activated"
                      value={form.windows_activated}
                      onChange={handleChange}
                      className={styles.input}
                    >
                      <option value={1}>Yes</option>
                      <option value={0}>No</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Backup Agent VEEAM / Acronis Version</label>
                    <input
                      name="backup_agent"
                      value={form.backup_agent}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Antivirus CS / TM / McAfee/ Symantec</label>
                    <input
                      name="antivirus"
                      value={form.antivirus}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>Category GxP or Non GxP</label>
                    <input
                      name="category_gxp"
                      value={form.category_gxp}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Current Status of Server</label>
                    <input
                      name="current_status"
                      value={form.current_status}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Server Managed By IT or ESD</label>
                    <input
                      name="server_managed_by"
                      type="checkbox"
                      checked={!!form.server_managed_by}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>Remarks for Application usage purpose</label>
                    <input
                      name="remarks_application_usage"
                      value={form.remarks_application_usage}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>START DATE</label>
                    <input
                      name="start_date"
                      value={form.start_date}
                      onChange={handleChange}
                      className={styles.input}
                      type="date"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>END DATE</label>
                    <input
                      name="end_date"
                      value={form.end_date}
                      onChange={handleChange}
                      className={styles.input}
                      type="date"
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>AGING</label>
                    <input
                      name="aging"
                      value={form.aging}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Environment</label>
                    <input
                      name="environment"
                      value={form.environment}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Server Critility</label>
                    <input
                      name="server_critility"
                      value={form.server_critility}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>Database/Application</label>
                    <input
                      name="database_appplication"
                      value={form.database_appplication}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Current RPO</label>
                    <input
                      name="current_rpo"
                      type="checkbox"
                      checked={!!form.current_rpo}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Reduce RPO time from 24 Hrs</label>
                    <input
                      name="reduce_rpo_time"
                      value={form.reduce_rpo_time}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>Server to SO Timeline</label>
                    <input
                      name="server_to_so_timeline"
                      value={form.server_to_so_timeline}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Purchased Date</label>
                    <input
                      name="purchase_date"
                      value={form.purchase_date}
                      onChange={handleChange}
                      className={styles.input}
                      type="date"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Purchased PO</label>
                    <input
                      name="purchase_po"
                      value={form.purchase_po}
                      onChange={handleChange}
                      className={styles.input}
                      type="number"
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>Warranty New Start Date</label>
                    <input
                      name="warranty_new_start_date"
                      value={form.warranty_new_start_date}
                      onChange={handleChange}
                      className={styles.input}
                      type="date"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>AMC/Warranty Expiry date</label>
                    <input
                      name="amc_warranty_expiry_date"
                      value={form.amc_warranty_expiry_date}
                      onChange={handleChange}
                      className={styles.input}
                      type="date"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>SAP Asset No.</label>
                    <input
                      name="sap_asset_no"
                      type="checkbox"
                      checked={!!form.sap_asset_no}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className={styles.rowFields}>
                  <div className={styles.formGroup}>
                    <label>AMC Vendor</label>
                    <input
                      name="amc_vendor"
                      type="checkbox"
                      checked={!!form.amc_vendor}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Remarks If Any</label>
                    <input
                      name="remarks"
                      value={form.remarks}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className={styles.input}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>
              <div
                className={styles.buttonRow}
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
            </form>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default EditServerInventory;