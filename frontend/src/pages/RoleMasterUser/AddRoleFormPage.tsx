import React, { useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useNavigate } from "react-router-dom";
import { useRoles } from "../../RoleMaster/RolesContext";
import type { Role } from "../../RoleMaster/RolesContext";
import Styles from "../DepartmentMaster/AddDeptFormPage.module.css";
import { useAuth } from "../../context/AuthContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/AddPlantMaster.module.css";
interface AddRoleFormPageProps {
  onCancel?: () => void;
}

export default function AddRoleFormPage({ onCancel }: AddRoleFormPageProps) {
  const navigate = useNavigate();
  const { addRole } = useRoles();
  const { user } = useAuth();

  const [form, setForm] = useState<Omit<Role, "activityLogs">>({
    name: "",
    description: "",
    status: "ACTIVE",
  });

  // Modal state
  const [showModal, setShowModal] = useState(false);

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModal(true); // Show admin confirmation modal
  };

  // Called after admin confirms
  const handleConfirmLogin = (data: Record<string, string>) => {
    if (data.username === (user?.username || "") && data.password) {
      addRole({
        name: form.name,
        description: form.description,
        status: form.status,
      }).then(() => {
        setShowModal(false);
        if (onCancel) {
          onCancel(); // Notify parent to switch to table view
        } else {
          navigate("/role-master", { state: { activeTab: "role" } });
        }
      });
    } else {
      alert("Invalid credentials. Please try again.");
    }
  };

  // Update cancel to go back to SuperAdmin with sidebar selected
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate("/role-master", { state: { activeTab: "role" } });
    }
  };

  return (
    <div className={styles.pageWrapper}>
        <AppHeader title="Plant Master Management" />

        <div className={styles.contentArea}>
          {/* Breadcrumb */}
          <div className={styles.breadcrumb}>
            <span
              className={styles.breadcrumbLink}
              onClick={() =>
                navigate("/role-master", { state: { activeTab: "role" } })
              }
            >
              Role Master
            </span>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbCurrent}>Add Role</span>
          </div>

         <div className={styles.formCard}>
          <div className={styles.formHeader}>
              <h2>Add New Role</h2>
              <p>Enter Role details to add a new record to the system</p>
            </div>
          <form
            className={styles.form}
            onSubmit={handleSubmit}
            style={{ width: "100%" }}
          >
            <div className={Styles.scrollFormContainer}>
              <div className={Styles.rowFields}>
                <div
                  className={Styles.formGroup}
                  style={{ flex: 1, minWidth: 180 }}
                >
                  <label>Role Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    required
                    className={Styles.input}
                  />
                </div>
                <div
                  className={Styles.formGroup}
                  style={{ flex: 1, minWidth: 180 }}
                >
                  <label>Status</label>
                  <select
                    className={Styles.select}
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
              <div
                className={Styles.formGroup}
                style={{ width: "100%", marginTop: 18 }}
              >
                <label>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  required
                  className={Styles.textarea}
                  rows={4}
                  style={{
                    minHeight: 120,
                    resize: "vertical",
                    width: "100%",
                    fontSize: "1.1rem",
                  }}
                  placeholder="Enter description..."
                />
              </div>
            </div>
            <div
              className={Styles.buttonRow}
              style={{
                display: "flex",
                justifyContent: "flex-start",
                gap: 24,
                marginTop: 24,
              }}
            >
              <button type="submit" className={Styles.saveBtn}>
                Save
              </button>
              <button
                type="button"
                className={Styles.cancelBtn}
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
          {showModal && (
            <ConfirmLoginModal
              title="Confirm Add Role"
              description="Please confirm adding this role by entering your password."
              username={user?.username || ""}
              onConfirm={handleConfirmLogin}
              onCancel={() => setShowModal(false)}
            />
          )}
        </div>
        </div>
    </div>
  );
}
