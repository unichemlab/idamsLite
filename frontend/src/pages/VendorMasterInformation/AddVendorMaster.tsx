import React, { useState } from "react";
import ConfirmLoginModal from "./ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useVendorContext, Vendor } from "../VendorMasterInformation/VendorContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/AddPlantMaster.module.css";
import { API_BASE } from "../../utils/api";

const AddVendorMaster: React.FC = () => {
  const { addVendor, vendors } = useVendorContext();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState<Vendor>({
    name: "",
    code: "",
    description: "",
    status: "ACTIVE",
  });

  const [isCodeLocked, setIsCodeLocked]             = useState(false);
  const [showModal, setShowModal]                   = useState(false);
  const [showApprovalNotice, setShowApprovalNotice] = useState(false);
  const [approvalMessage, setApprovalMessage]       = useState("");

  // ── Auto Code Generator ───────────────────────────────────────────────────
  const generateVendorCode = (vendorName: string) => {
    if (!vendorName.trim()) return "";

    const words = vendorName
      .trim()
      .split(" ")
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
      .filter(Boolean);

    if (words.length === 0) return "";

    let combined = words[0];
    if (combined.length < 3 && words.length > 1) combined = combined + words[1];
    combined = combined.toUpperCase();
    if (combined.length < 3) return "";

    const prefix = combined.substring(0, 4);
    const year   = new Date().getFullYear();

    const existingCodes = vendors.map((v) => v.code).filter(Boolean) as string[];
    let counter = 1;
    let newCode  = "";

    do {
      newCode = `VEN-${year}-${prefix}-${String(counter).padStart(3, "0")}`;
      counter++;
    } while (existingCodes.includes(newCode));

    return newCode;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "name") {
      if (!value.trim()) {
        setForm({ ...form, name: "", code: "" });
        setIsCodeLocked(false);
        return;
      }
      const autoCode = generateVendorCode(value);
      if (autoCode && !isCodeLocked) {
        setForm({ ...form, name: value, code: autoCode });
        setIsCodeLocked(true);
        return;
      }
    }

    setForm({
      ...form,
      [name]: name === "status" ? (value as "ACTIVE" | "INACTIVE") : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1️⃣ Duplicate name check
    try {
      const checkRes = await fetch(`${API_BASE}/api/master-approvals/check-duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module:    "vendors",
          name:      form.name,
          excludeId: null,
        }),
      });

      if (checkRes.status === 409) {
        const errData = await checkRes.json();
        alert(errData.error || "A vendor with this name already exists.");
        return;
      }

      if (!checkRes.ok) {
        const errData = await checkRes.json();
        alert(errData.error || "Validation failed. Please try again.");
        return;
      }
    } catch (err) {
      alert("Could not validate form. Please try again.");
      return;
    }

    // 2️⃣ All validations passed — open confirmation modal
    setShowModal(true);
  };

  const handleConfirmLogin = async (data: Record<string, string>) => {
  try {
    const result = await addVendor(form) as any;  // ✅ cast to any
    setShowModal(false);

    if (result?.approvalId && result?.status === "PENDING_APPROVAL") {
      setApprovalMessage(
        `${result.message}\n\nApproval ID: ${result.approvalId}\n\nThe vendor will be added after approval.`
      );
      setShowApprovalNotice(true);
    } else {
      alert("Vendor created successfully!");
      navigate("/vendor-information", { state: { activeTab: "vendor" } });
    }
  } catch (err: any) {
    alert(`Error: ${err.message || "Failed to add vendor"}`);
  }
};

  const handleApprovalNoticeClose = () => {
    setShowApprovalNotice(false);
    navigate("/vendor-information", { state: { activeTab: "vendor" } });
  };

  return (
    <div className={styles.pageWrapper}>

      {/* ── Approval Notice Modal ── */}
      {showApprovalNotice && (
        <div className={styles.modalOverlay}>
          <div className={styles.approvalModal}>
            <div className={styles.approvalIcon}>⏳</div>
            <h3 className={styles.approvalTitle}>Approval Required</h3>
            <p className={styles.approvalMessage}>{approvalMessage}</p>
            <button
              onClick={handleApprovalNoticeClose}
              className={styles.approvalOkBtn}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <AppHeader title="Vendor Information Management" />

      <div className={styles.contentArea}>
        <div className={styles.breadcrumb}>
          <span
            className={styles.breadcrumbLink}
            onClick={() =>
              navigate("/vendor-information", { state: { activeTab: "vendor" } })
            }
          >
            Vendor Information Master
          </span>
          <span className={styles.breadcrumbSeparator}>›</span>
          <span className={styles.breadcrumbCurrent}>Add Vendor Information</span>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Add New Vendor Information</h2>
            <p>Enter Vendor details to add a new record</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.scrollFormContainer}>
              <div className={styles.rowFields}>
                {/* Vendor Name */}
                <div className={styles.formGroupFloating}>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className={styles.input}
                    required
                    placeholder=" "
                  />
                  <label className={styles.floatingLabel}>
                    Vendor Name <span className={styles.required}>*</span>
                  </label>
                </div>

                {/* Vendor Code */}
                <div className={styles.formGroupFloating}>
                  <input
                    type="text"
                    name="code"
                    value={form.code}
                    readOnly
                    className={styles.input}
                    placeholder="Auto Generated"
                  />
                  <label className={styles.floatingLabel}>Vendor Code</label>
                </div>

                {/* Status */}
                <div className={styles.formGroupFloating}>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className={styles.select}
                    required
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                  <label className={styles.floatingLabel}>
                    Status <span className={styles.required}>*</span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div className={styles.formGroup} style={{ width: "100%", padding: 15 }}>
                <div className={styles.formGroupFloating}>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) handleChange(e);
                    }}
                    required
                    className={styles.textarea}
                    rows={1}
                    placeholder="Enter description..."
                  />
                  <label className={styles.floatingLabel}>
                    Description <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.charCounter}>
                    {(form.description?.length || 0)}/1000
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.formFotter}>
              <div className={styles.buttonRow}>
                <button type="submit" className={styles.saveBtn}>
                  Save
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => navigate("/vendor-information")}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>

          {showModal && (
            <ConfirmLoginModal
              title="Confirm Add Vendor"
              description="Please confirm adding this vendor by entering your password."
              username={user?.username || ""}
              onConfirm={handleConfirmLogin}
              onCancel={() => setShowModal(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AddVendorMaster;