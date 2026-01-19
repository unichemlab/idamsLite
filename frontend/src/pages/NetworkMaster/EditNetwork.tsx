// src/pages/NetworkMaster/EditNetwork.tsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppHeader from "../../components/Common/AppHeader";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useNetworkContext } from "../../context/NetworkContext";
import { Network } from "../../types/network";
import { fetchPlants } from "../../utils/api";
import styles from "../Plant/AddPlantMaster.module.css";

interface Plant {
  id: number;
  plant_name: string;
}

const EditNetwork: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { networks, updateNetwork } = useNetworkContext();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [form, setForm] = useState<Network | null>(null);

  useEffect(() => {
    fetchPlants().then(setPlants);
  }, []);

  useEffect(() => {
    const network = networks.find((n) => String(n.id) === id);
    if (network) setForm({ ...network });
  }, [id, networks]);

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

  const submit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateForm()) return;
  setConfirm(true);
};


  const confirmSubmit = async () => {
    const index = networks.findIndex((n) => n.id === form.id);
    await updateNetwork(index, form);
    navigate("/network-master");
  };

  const input = (name: keyof Network, label: string, type = "text") => (
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
        <AppHeader title="Edit Network Device" />

        <div className={styles.contentArea}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Edit Network Device</h2>
            </div>

            <form onSubmit={submit} className={styles.form} style={{ padding: 10 }}>
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

                {/* System Details */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>System Details</span>
                  <div className={styles.rowFields}>
                    {input("device_type", "Device Type")}
                    {input("device_model", "Device Model")}
                    {input("make_vendor", "Make/Vendor")}
                    {select("dual_power_source", "Dual Power Source", ['Yes','No','ATS'], false, false, false, false)}
                    {input("trunk_port", "Trunk Port")}
                    {select("stack", "Stack", [], false, false, false, true)}
                   {form.stack && input("stack_switch_details", "Stack Switch Details")}
                    {input("neighbor_switch_ip", "Neighbor Switch IP")}
                    {select("sfp_fiber_tx", "SFP/Fiber TX", ['Fiber','TX'], false, false, false, false)}
                    {input("neighbor_port", "Neighbor Port")}
                    {select("poe_non_poe", "POE/Non-POE", ['PoE','Non-POE'], false, false, false, false)}
                    {input("serial_no", "Serial No")}
                    {input("ios_version", "IOS Version")}
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
                  onClick={() => navigate("/network-master")}
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

export default EditNetwork;