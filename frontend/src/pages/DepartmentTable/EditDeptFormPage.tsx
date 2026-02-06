import React, { useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { useDepartmentContext } from "../../pages//DepartmentTable/DepartmentContext";
import type { Department } from "./DepartmentContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from ".././Plant/AddPlantMaster.module.css";

const EditDeptFormPage: React.FC = () => {
  const { id } = useParams();
  const departmentCtx = useDepartmentContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingForm, setPendingForm] = useState<Department | null>(null);

  const department = departmentCtx?.departments.find((dep) => String(dep.id) === id);
  const [form, setForm] = useState<Department>(
    department ?? {
      id: -1,
      name: "",
      description: "",
      status: "ACTIVE",
    }
  );

  if (!departmentCtx || id === undefined || !department) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "status" ? (value as "ACTIVE" | "INACTIVE") : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPendingForm(form);
    setShowConfirm(true);
  };

  const handleConfirm = async (data: Record<string, string>) => {
    if (pendingForm) {
      await departmentCtx.updateDepartment(Number(id), pendingForm);
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
          title="Confirm Edit Department"
          description="Please confirm your identity to update this department."
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
            <span className={styles.breadcrumbCurrent}>Edit Department</span>
          </div>

          {/* Form Card */}
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Edit Department</h2>
              <p>Update department details in the system</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.scrollFormContainer}>
                <div className={styles.rowFields}>
                  <div className={styles.formGroupFloating}>
                   
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      readOnly
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
                    onChange={handleChange}
                    required
                    className={styles.textarea}
                    rows={5}
                    placeholder="Enter department description..."
                  />
                    <label className={styles.floatingLabel}>
                    Description <span className={styles.required}>*</span>
                  </label>
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
                  onClick={() => navigate("/department-master")}
                >
                 Cancel
                </button>
              </div>
              </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default EditDeptFormPage;