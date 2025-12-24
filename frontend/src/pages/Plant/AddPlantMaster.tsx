import React, { useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { usePlantContext, Plant } from "./PlantContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/AddPlantMaster.module.css";;

const AddPlantMasterUser: React.FC = () => {
  const { addPlant } = usePlantContext();
  const navigate = useNavigate();
  const [form, setForm] = useState<Plant>({
    name: "",
    description: "",
    location: "",
    status: "ACTIVE",
  });
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showApprovalNotice, setShowApprovalNotice] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");

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
    setShowConfirm(true);
  };

  const handleConfirm = async (data: Record<string, string>) => {
    try {
      const result = await addPlant(form);
      setShowConfirm(false);

      if ("approvalId" in result && result.status === "PENDING_APPROVAL") {
        setApprovalMessage(
          `${result.message}\n\nApproval ID: ${result.approvalId}\n\nThe plant will be added after approval.`
        );
        setShowApprovalNotice(true);
      } else {
        alert("Plant created successfully!");
        navigate("/plant-master", { state: { activeTab: "plant" } });
      }
    } catch (err: any) {
      console.error("Error adding plant:", err);
      alert(`Error: ${err.message || "Failed to add plant"}`);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  const handleApprovalNoticeClose = () => {
    setShowApprovalNotice(false);
    navigate("/plant-master", { state: { activeTab: "plant" } });
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

      <div className={styles.pageWrapper}>
        <AppHeader title="Plant Master Management" />

        <div className={styles.contentArea}>
          {/* Breadcrumb */}
          <div className={styles.breadcrumb}>
            <span
              className={styles.breadcrumbLink}
              onClick={() =>
                navigate("/plant-master", { state: { activeTab: "plant" } })
              }
            >
              Plant Master
            </span>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbCurrent}>Add Plant</span>
          </div>

          {/* Form Card */}
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Add New Plant</h2>
              <p>Enter plant details to add a new record to the system</p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Plant Name <span className={styles.required}>*</span>
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className={styles.input}
                      placeholder="Enter plant name"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Location <span className={styles.required}>*</span>
                    </label>
                    <input
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      required
                      className={styles.input}
                      placeholder="Enter location"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Status <span className={styles.required}>*</span>
                    </label>
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

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Description <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    required
                    className={styles.textarea}
                    rows={5}
                    placeholder="Enter plant description..."
                  />
                </div>
              </div>

              <div className={styles.formFooter}>
                <button type="submit" className={styles.saveBtn}>
                  💾 Save Plant
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => navigate("/plant-master")}
                >
                  ✕ Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default AddPlantMasterUser;