import React, { useState } from "react";
import ConfirmLoginModal from "./ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useVendorContext, Vendor } from "../VendorMaster/VendorContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/AddPlantMaster.module.css";

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

  const [isCodeLocked, setIsCodeLocked] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // ✅ Auto Code Generator
  const generateVendorCode = (vendorName: string) => {
    if (!vendorName.trim()) return "";

    const words = vendorName
      .trim()
      .split(" ")
      .map(w => w.replace(/[^a-zA-Z0-9]/g, ""))
      .filter(Boolean);

    if (words.length === 0) return "";

    // ✅ Combine words if first word is too short
    let combined = words[0];

    if (combined.length < 3 && words.length > 1) {
      combined = combined + words[1];
    }

    combined = combined.toUpperCase();

    // ✅ Block until minimum 5 characters
    if (combined.length < 3) return "";

    const prefix = combined.substring(0, 4); // Force exactly 4 chars
    const year = new Date().getFullYear();

    const existingCodes = vendors
      .map(v => v.code)
      .filter(Boolean) as string[];

    let counter = 1;
    let newCode = "";

    do {
      newCode = `VEN-${year}-${prefix}-${String(counter).padStart(3, "0")}`;
      counter++;
    } while (existingCodes.includes(newCode));

    return newCode;
  };



  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "name") {
      if (!value.trim()) {
        setForm({ ...form, name: "", code: "" });
        setIsCodeLocked(false);
        return;
      }

      const autoCode = generateVendorCode(value);

      // ✅ Generate only once and only if prefix ready
      if (autoCode && !isCodeLocked) {
        setForm({
          ...form,
          name: value,
          code: autoCode,
        });
        setIsCodeLocked(true);
        return;
      }

    }

    setForm({
      ...form,
      [name]: name === "status" ? (value as "ACTIVE" | "INACTIVE") : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  const handleConfirmLogin = (data: Record<string, string>) => {
    if (data.username === (user?.username || "") && data.password) {
      addVendor(form);
      setShowModal(false);
      navigate("/vendor-information", { state: { activeTab: "vendor" } });
    } else {
      alert("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Vendor Information Management" />

      <div className={styles.contentArea}>
        <div className={styles.breadcrumb}>
          <span
            className={styles.breadcrumbLink}
            onClick={() =>
              navigate("/vendor-information", {
                state: { activeTab: "vendor" },
              })
            }
          >
            Vendor Information Master
          </span>
          <span className={styles.breadcrumbSeparator}>›</span>
          <span className={styles.breadcrumbCurrent}>
            Add Vendor Information
          </span>
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
                  <label className={styles.floatingLabel}>
                    Vendor Code
                  </label>
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
              <div className={styles.formGroup} style={{ width: "100%" }}>
                <div className={styles.formGroupFloating}>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    required
                    className={styles.textarea}
                    rows={1}
                    placeholder="Enter description..."
                  />
                  <label className={styles.floatingLabel}>
                    Description <span className={styles.required}>*</span>
                  </label>
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