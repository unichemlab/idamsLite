import React, { useState } from "react";
import ConfirmLoginModal from "./ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useVendorContext, Vendor } from "../VendorMaster/VendorContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/AddPlantMaster.module.css";

const AddVendorMaster: React.FC = () => {
  const { addVendor } = useVendorContext();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<Vendor>({
    name: "",
    code: "",
    description: "",
    status: "ACTIVE",
  });
  const [showModal, setShowModal] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "status" ? (value as "ACTIVE" | "INACTIVE") : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  // Called after admin confirms
  const handleConfirmLogin = (data: Record<string, string>) => {
    if (data.username === (user?.username || "") && data.password) {
      addVendor(form);
      setShowModal(false);
      navigate("/vendor-information", { state: { activeTab: "vendor" } });
    } else {
      alert("Invalid credentials. Please try again.");
    }
  };

  // Use shared sidebarConfig for consistency

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
            <span className={styles.breadcrumbCurrent}>Add Vendor Information</span>
          </div>

         <div className={styles.formCard}>
          <div className={styles.formHeader}>
              <h2>Add New Vendor Information</h2>
              <p>Enter Vendor details to add a new record to the vendor</p>
            </div>
          <form
            className={styles.form}
            onSubmit={handleSubmit}
            style={{ width: "100%" }}
          >
            <div className={styles.scrollFormContainer}>
             <div className={styles.rowFields}>
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
                <div className={styles.formGroupFloating}>
                  <input
                    type="text"
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    className={styles.input}
                    required
                    placeholder=" "
                  />
                  <label className={styles.floatingLabel}>
                    Vendor Code <span className={styles.required}>*</span>
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
                style={{ width: "100%",padding:15 }}
              >
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
