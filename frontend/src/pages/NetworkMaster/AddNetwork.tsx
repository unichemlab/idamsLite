// src/pages/NetworkMaster/AddNetwork.tsx

import React, { useEffect, useState } from "react";
import AppHeader from "../../components/Common/AppHeader";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNetworkContext } from "../../context/NetworkContext";
import { Network } from "../../types/network";
import { fetchPlants } from "../../utils/api";
import styles from "../Plant/AddPlantMaster.module.css";

interface Plant {
  id: number;
  plant_name: string;
}

const AddNetwork: React.FC = () => {
  const { addNetwork } = useNetworkContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState<Network>({
    id: 0,
    transaction_id: "",
    plant_location_id: undefined,
    area: "",
    rack: "",
    host_name: "",
    device_ip: "",
    device_model: "",
    device_type: "",
    make_vendor: "",
    trunk_port: "",
    neighbor_switch_ip: "",
    neighbor_port: "",
    sfp_fiber_tx: "",
    poe_non_poe: "",
    serial_no: "",
    ios_version: "",
    uptime: "",
    verify_date: "",
    stack: false,
    stack_switch_details: "",
    dual_power_source: "",
    purchase_vendor: "",
    purchased_date: "",
    purchased_po: "",
    sap_asset_no: "",
    service_type: "",
    warranty_start_date: "",
    amc_warranty_expiry_date: "",
    under_amc: false,
    amc_vendor: "",
    remarks: "",
    status: "ACTIVE",
    
  });

  useEffect(() => {
    fetchPlants().then(setPlants);
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
  if (!validateForm()) return;
  setShowConfirm(true);
};

  const handleConfirm = async () => {
    await addNetwork(form);
    setShowConfirm(false);
    navigate("/network-master");
  };

  const input = (name: keyof Network, label: string, type = "text") => (
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

  type OptionValue = string | number;

  type GenericSelectOption<T> = {
    value: (item: T) => OptionValue;
    label: (item: T) => string;
  };

  const select = <T,>(
    name: keyof Network,
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
// ================= VALIDATION HELPERS =================
const isValidIP = (ip: string) => {
  const regex =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  return regex.test(ip);
};

const validateForm = () => {
  if (!form?.plant_location_id) {
    alert("Plant Location is required");
    return false;
  }

  if (!form?.host_name) {
    alert("Host Name is required");
    return false;
  }

  if (!isValidIP(form.device_ip || "")) {
    alert("Invalid Device IP address");
    return false;
  }

  if (!form?.device_type) {
    alert("Device Type is required");
    return false;
  }

  if (!form?.serial_no) {
    alert("Serial No is required");
    return false;
  }

  if (!form?.verify_date) {
    alert("Verify Date is required");
    return false;
  }

  // Conditional validations
  if (form.stack && !form.stack_switch_details) {
    alert("Stack Switch Details is required when Stack = Yes");
    return false;
  }

  if (form.under_amc && !form.amc_vendor) {
    alert("AMC Vendor is required when Under AMC = Yes");
    return false;
  }

  // Date validation
  if (
    form.warranty_start_date &&
    form.amc_warranty_expiry_date &&
    new Date(form.amc_warranty_expiry_date) <
      new Date(form.warranty_start_date)
  ) {
    alert("AMC / Warranty Expiry Date cannot be before Warranty Start Date");
    return false;
  }

  return true;
};
// ======================================================

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
        <AppHeader title="Network Device Management" />

        <div className={styles.contentArea}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Add Network Device</h2>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} style={{ padding: 10 }}>
              <div className={styles.scrollFormContainer}>

                {/* Location Details */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>Location Details</span>
                  <div className={styles.rowFields}>
                    {select("plant_location_id", "Plant Location", plants,
                      { value: (p) => p.id, label: (p) => p.plant_name }, true)}
                    {input("area", "Area")}
                    {input("rack", "Rack")}
                    {input("host_name", "Host Name")}
                    {input("device_ip", "Device IP")}
                  </div>
                </div>

                {/* Device Details */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>Device Details</span>
                  <div className={styles.rowFields}>
                    {/* Dual Power Source(ATS /Yes/NO) */}
                   {input("device_type", "Device Type")}
                    {input("device_model", "Device Model")}
                    {input("serial_no", "Serial No")}
                    {input("ios_version", "IOS Version")}
                    {input("make_vendor", "Make/Vendor")}
                    {select("poe_non_poe", "POE/Non-POE", ['PoE','Non-POE'], false, false, false, false)}
                    {select("dual_power_source", "Dual Power Source", ['Yes','No','ATS'], false, false, false, false)}
                    {select("stack", "Stack", [], false, false, false, true)}
                    {form.stack && input("stack_switch_details", "Stack Switch Details")}
                    {input("neighbor_switch_ip", "Neighbor Switch IP")}
                    {input("neighbor_port", "Neighbor Port")}
                    {input("trunk_port", "Trunk Port")}
                    {select("sfp_fiber_tx", "SFP/Fiber TX", ['Fiber','TX'], false, false, false, false)}
                    {input("uptime", "Uptime")}
                    {input("verify_date", "Verify Date", "date")}
                  </div>
                </div>

                {/* Commercial */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>Commercial</span>
                  <div className={styles.rowFields}>
                  {input("purchased_po", "Purchase PO")}
                    {input("purchased_date", "Purchased Date", "date")}
                    {input("purchase_vendor", "Purchase Vendor")}
                    {input("sap_asset_no", "SAP Asset No")}
                    {input("service_type", "Service Type")}
                    {input("warranty_start_date", "Warranty Start Date", "date")}
                    {input("amc_warranty_expiry_date", "AMC/Warranty Expiry Date", "date")}
                    {select("under_amc", "Under AMC", [], false, false, false, true)}
                   {form.under_amc && input("amc_vendor", "AMC Vendor")}
                  </div>
                </div>

                {/* Additional Details */}
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
                  <button type="submit" className={styles.saveBtn}>Save</button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => navigate("/network-master")}
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

export default AddNetwork;