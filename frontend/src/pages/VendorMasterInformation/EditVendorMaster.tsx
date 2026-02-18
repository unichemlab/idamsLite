import React, { useContext, useState, useEffect } from "react";
import ConfirmLoginModal from "./ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { VendorContext, Vendor } from "../VendorMasterInformation/VendorContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/AddPlantMaster.module.css";

const EditVendorMaster: React.FC = () => {
  const { id } = useParams(); // index from route
  const vendorCtx = useContext(VendorContext);
 const [isCodeLocked, setIsCodeLocked] = useState(false);

  // true → because existing vendor already has code

  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const vendorId = id ? Number(id) : null;
  const vendors = vendorCtx?.vendors || [];
  const vendor = vendorCtx?.vendors.find(

    (v) => v.id === vendorId
  );
  const [form, setForm] = useState<Vendor>(
    vendor ?? {
      name: "",
      description: "",
      code: "",
      status: "ACTIVE",
    }
  );
  const index = vendorCtx?.vendors.findIndex(
    (v) => v.id === vendorId
  ) ?? -1;
  console.log("vendor details", vendor, vendorId, index, vendorCtx?.vendors[index])

  useEffect(() => {
  if (vendor) {
    setForm({
      name: vendor.name || "",
      code: vendor.code || "",     // ✅ CRITICAL
      description: vendor.description || "",
      status: vendor.status || "ACTIVE",
    });

    // Lock code since existing vendor already has code
    setIsCodeLocked(true);
  }
}, [vendor]);

if (!vendorCtx) return null;

if (!vendor) {
  return <div style={{ padding: 20 }}>Loading vendor...</div>;
}

if (index === -1) {
  return <div style={{ padding: 20 }}>Vendor not found</div>;
}


  
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    // ✅ Auto generate code when name changes
    if (name === "name") {
      if (!value.trim()) {
        setForm({ ...form, name: "", code: "" });
        setIsCodeLocked(false);
        return;
      }

      const autoCode = generateVendorCode(value);

      if (autoCode && !isCodeLocked) {
        setForm({
          ...form,
          name: value,
          code: autoCode,
        });
        setIsCodeLocked(true);
        return;
      }

      // If user edits name again → unlock manually if needed
      setForm({ ...form, name: value });
      return;
    }

    setForm({
      ...form,
      [name]: name === "status" ? (value as "ACTIVE" | "INACTIVE") : value,
    });
  };



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

      console.log("═══════════════════════════════════════════════════════════");
    console.log("📤 SUBMIT BUTTON CLICKED");
    console.log("Form data to be submitted:", form);
    console.log("  - name:", form.name);
    console.log("  - code:", form.code);
    console.log("  - description:", form.description);
    console.log("  - status:", form.status);
    console.log("═══════════════════════════════════════════════════════════");


    setShowModal(true);
  };

const handleConfirmLogin = (data: Record<string, string>) => {
  if (data.username === (user?.username || "") && data.password) {

    console.log("═══════════════════════════════════════════════════════════");
      console.log("✅ LOGIN CONFIRMED - UPDATING VENDOR");
      console.log("Final form data being sent:", form);
      console.log("  - name:", form.name);
      console.log("  - code:", form.code);
      console.log("  - description:", form.description);
      console.log("  - status:", form.status);
      console.log("Index:", index);
      console.log("═══════════════════════════════════════════════════════════");

    vendorCtx.updateVendor(index, form);
    setShowModal(false);
    navigate("/vendor-information", { state: { activeTab: "vendor" } });
  } else {
    alert("Invalid credentials. Please try again.");
  }
};


  // ✅ Auto Code Generator
  const generateVendorCode = (vendorName: string) => {
    if (!vendorName.trim()) return "";

    const words = vendorName
      .trim()
      .split(" ")
      .map(w => w.replace(/[^a-zA-Z0-9]/g, ""))
      .filter(Boolean);

    if (words.length === 0) return "";

    let combined = words[0];

    if (combined.length < 3 && words.length > 1) {
      combined = combined + words[1];
    }

    combined = combined.toUpperCase();

    if (combined.length < 3) return "";

    const prefix = combined.substring(0, 4);
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


  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Vendor Information Management" />

      <div className={styles.contentArea}>
        {/* Breadcrumb */}
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
          <span className={styles.breadcrumbCurrent}>Edit Vendor Information</span>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Edit Vendor Information</h2>
            <p>Enter Vendor Information details to edit a old record to the Vendor</p>
          </div>
          <form
            onSubmit={handleSubmit}
            className={styles.form}
            style={{ width: "100%" }}
          >
            <div className={styles.scrollFormContainer}>
              <div className={styles.rowFields}>
                <div className={styles.formGroupFloating}>
                  <input
                    type="text"
                    name="name"
                    disabled
                    value={form.name}
                    onChange={handleChange}
                    className={styles.input}
                    required
                    readOnly
                    placeholder=" "
                  />
                  <label className={styles.floatingLabel}>
                    Vendor Name <span className={styles.required}>*</span>
                  </label>
                </div>
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
                <div className={styles.formGroupFloating}>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className={styles.select}
                    required
                  >
                    <option value="" disabled hidden></option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                  <label className={styles.floatingLabel}>
                    Status <span className={styles.required}>*</span>
                  </label>
                </div>
              </div>
              <div
                className={styles.formGroup}
                style={{ width: "100%", padding: 15 }}
              >
                <div className={styles.formGroupFloating}>
                  <textarea
                    name="description"
                    value={form.description}
                     onChange={(e) => {
                          if (e.target.value.length <= 1000) {
                            handleChange(e);
                          }
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
                  onClick={() => navigate("/vendor-information")}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
          {showModal && (
            <ConfirmLoginModal
              title="Confirm Edit Vendor"
              description="Please confirm editing this vendor by entering your password."
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

export default EditVendorMaster;
