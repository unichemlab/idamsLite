import React, { useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useDepartmentContext, Department } from "../../pages//DepartmentTable/DepartmentContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/AddPlantMaster.module.css";
import { API_BASE } from "../../utils/api";

const AddDeptFormPage: React.FC = () => {
  const { addDepartment } = useDepartmentContext();
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingForm, setPendingForm] = useState<Department | null>(null);
  const navigate = useNavigate();
  const [form, setForm] = useState<Department>({
    id: 0,
    name: "",
    description: "",
    status: "ACTIVE",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        module:    "department",
        name:      form.name,
        excludeId: null,
      }),
    });

    if (checkRes.status === 409) {
      const errData = await checkRes.json();
      alert(errData.error || "A department with this name already exists.");
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
  setPendingForm(form);
  setShowConfirm(true);
};

  const handleConfirm = async (data: Record<string, string>) => {
    if (pendingForm) {
      await addDepartment(pendingForm);
      setShowConfirm(false);
      setPendingForm(null);
      navigate("/department-master");
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setPendingForm(null);
  };

  return (
    <React.Fragment>
      {showConfirm && (
        <ConfirmLoginModal
          username={user?.username}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          title="Confirm Add Department"
          description="Please confirm your identity to add a department."
        />
      )}

      <div className={styles.pageWrapper}>
        <AppHeader title="Department Master Management" />

        <div className={styles.contentArea}>
          {/* Breadcrumb */}
          <div className={styles.breadcrumb}>
            <span
              className={styles.breadcrumbLink}
              onClick={() => navigate("/department-master")}
            >
              Department Master
            </span>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbCurrent}>Add Department</span>
          </div>

          {/* Form Card */}
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Add New Department</h2>
              <p>Enter department details to add a new record to the system</p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.scrollFormContainer}>
                <div className={styles.rowFields}>
                  <div className={styles.formGroupFloating}>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className={styles.input}
                      placeholder="Enter department name"
                    />
                    <label className={styles.floatingLabel}>
                      Department Name <span className={styles.required}>*</span>
                    </label>
                  </div>

                  <div className={styles.formGroupFloating}>

                    <select
                      className={styles.select}
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                    >
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
                      rows={5}
                      placeholder="Enter department description..."
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
                    Save
                  </button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => navigate("/department-master")}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default AddDeptFormPage;