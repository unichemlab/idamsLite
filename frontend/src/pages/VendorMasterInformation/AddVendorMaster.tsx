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
                <div className={styles.formGroup}>
                  <label>Vendor Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select
                    className={styles.select}
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
              <div
                className={styles.formGroup}
                style={{ width: "100%", marginTop: 18 }}
              >
                <label>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                  className={styles.textarea}
                  rows={5}
                  style={{ minHeight: 100, resize: "vertical", width: "100%" }}
                  placeholder="Enter description..."
                />
              </div>
            </div>
            <div
              className={styles.buttonRow}
              style={{
                display: "flex",
                justifyContent: "flex-start",
                gap: 24,
                marginTop: 24,
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
