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
  // STEP 1 — Add 2 new state variables (after existing useState lines)
  const [showApprovalNotice, setShowApprovalNotice] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");

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
  useEffect(() => {
    const network = networks.find((n) => String(n.id) === id);
    if (network) setForm({ ...network });
  }, [id, networks]);

  if (!form) return null;

  const formatDateForInput = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    let finalValue: any = value;

    if (type === "checkbox") {
      finalValue = (e.target as HTMLInputElement).checked;
    } else if (type === "number") {
      finalValue = Number(value);
    } else if (type === "date") {
      finalValue = value ? value : null; // keep YYYY-MM-DD string, or null if empty
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

    if (form.warranty_start_date && form.amc_warranty_expiry_date) {
      const start = new Date(form.warranty_start_date + "T00:00:00");
      const expiry = new Date(form.amc_warranty_expiry_date + "T00:00:00");

      if (expiry.getTime() <= start.getTime()) {
        alert("AMC / Warranty Expiry Date must be greater than Warranty Start Date");
        return false;
      }
    }

    return true;
  };
  // ======================================================

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setConfirm(true);
  };


  // STEP 2 — Replace confirmSubmit
  const confirmSubmit = async () => {
    try {
      const index = networks.findIndex((n) => n.id === form.id);
      const result = await updateNetwork(index, form);

      if (result && "approvalId" in result && result.status === "PENDING_APPROVAL") {
        setApprovalMessage(
          `${result.message}\n\nApproval ID: ${result.approvalId}\n\nThe network device will be updated after approval.`
        );
        setShowApprovalNotice(true);
      } else {
        alert("Network device updated successfully!");
        navigate("/network-master");
      }
    } catch (err: any) {
      alert(err.message || "Failed to update network device.");
    }
  };

  // STEP 3 — Add handleApprovalNoticeClose
  const handleApprovalNoticeClose = () => {
    setShowApprovalNotice(false);
    navigate("/network-master");
  };

   // ── input helper — now accepts isRequired to show * ──────────────────────────
  const input = (
    name: keyof Network,
    label: string,
    type = "text",
    isRequired = false   // ✅ NEW param
  ) => {
    const isExpiryDate = name === "amc_warranty_expiry_date";
 
    const getNextDay = (dateStr?: string) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      date.setDate(date.getDate() + 1);
      const yyyy = date.getFullYear();
      const mm   = String(date.getMonth() + 1).padStart(2, "0");
      const dd   = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
 
    return (
      <div className={styles.formGroupFloating}>
        <input
          type={type}
          name={name}
          value={
            type === "date"
              ? formatDateForInput(form[name] as string)
              : (form[name] as any) || ""
          }
          onChange={handleChange}
          className={styles.input}
          required={isRequired}
          min={
            isExpiryDate && form.warranty_start_date
              ? getNextDay(form.warranty_start_date)
              : undefined
          }
        />
        <label className={styles.floatingLabel}>
          {label}
          {isRequired && <span className={styles.required}> *</span>}  {/* ✅ asterisk */}
        </label>
      </div>
    );
  };

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


      {showApprovalNotice && (
        <div className={styles.modalOverlay}>
          <div className={styles.approvalModal}>
            <div className={styles.approvalIcon}>⏳</div>
            <h3 className={styles.approvalTitle}>Approval Required</h3>
            <p className={styles.approvalMessage}>{approvalMessage}</p>
            <button onClick={handleApprovalNoticeClose} className={styles.approvalOkBtn}>
              OK
            </button>
          </div>
        </div>
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
                    {select("plant_location_id", "Plant Location", plantOptions,
                      { value: (p) => p.value, label: (p) => p.label }, true)}
                    {input("area", "Area")}
                    {input("rack", "Rack")}
                    {input("host_name",  "Host Name",  "text", true)}  {/* ✅ required */}
                    {input("device_ip",  "Device IP",  "text", true)}  {/* ✅ required */}
                  </div>
                </div>

                {/* System Details */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>Device Details</span>
                  <div className={styles.rowFields}>
                    {/* Dual Power Source(ATS /Yes/NO) */}
                    {input("device_type",  "Device Type",  "text", true)}  {/* ✅ required */}
                    {input("device_model", "Device Model")}
                    {input("serial_no",    "Serial No",    "text", true)}  {/* ✅ required */}
                    {input("ios_version", "IOS Version")}
                    {input("make_vendor", "Make/Vendor")}
                    {select("poe_non_poe", "POE/Non-POE", ['PoE', 'Non-POE'], false, false, false, false)}
                    {select("dual_power_source", "Dual Power Source", ['Yes', 'No', 'ATS'], false, false, false, false)}
                    {select("stack", "Stack", [], false, false, false, true)}
                    {form.stack && input("stack_switch_details", "Stack Switch Details")}
                    {input("neighbor_switch_ip", "Neighbor Switch IP")}
                    {input("neighbor_port", "Neighbor Port")}
                    {input("trunk_port", "Trunk Port")}
                    {select("sfp_fiber_tx", "SFP/Fiber TX", ['Fiber', 'TX'], false, false, false, false)}
                    {input("uptime", "Uptime")}
                    {input("verify_date",  "Verify Date", "date", true)} 
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
                    {select("status", "Status", ["ACTIVE", "INACTIVE"], true)}
                    <div className={styles.formGroupFloating} style={{ flex: "1 1 100%" }}>

                      <textarea
                        name="remarks"
                        value={form.remarks}
                        onChange={(e) => {
                          if (e.target.value.length <= 1000) {
                            handleChange(e);
                          }
                        }}
                        required
                        className={styles.textarea}
                        rows={5}
                        placeholder="Enter Remarks..."
                      />
                      <label className={styles.floatingLabel}>
                        Remarks <span className={styles.required}>*</span>
                      </label>
                      <div className={styles.charCounter}>
                        {(form.remarks?.length || 0)}/1000
                      </div>
                    </div>
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