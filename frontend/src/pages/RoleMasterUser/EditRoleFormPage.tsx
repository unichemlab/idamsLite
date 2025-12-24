import React, { useState, useEffect } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useNavigate } from "react-router-dom";
import { useRoles } from "../../RoleMaster/RolesContext";
import type { Role } from "../../RoleMaster/RolesContext";
import { useAuth } from "../../context/AuthContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/AddPlantMaster.module.css";
interface EditRoleFormPageProps {
  roleId: number;
  onCancel?: () => void;
}

export default function EditRoleFormPage({
  roleId,
  onCancel,
}: EditRoleFormPageProps) {
  const { roles, updateRole } = useRoles();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState<Omit<Role, "activityLogs">>({
    name: "",
    description: "",
    status: "ACTIVE",
  });

  // Removed unused activityLogs state

  useEffect(() => {
    if (roleId !== undefined && roles) {
      const role = roles.find((r) => r.id === roleId);
      if (role) {
        setForm({
          name: role.name,
          description: role.description,
          status: role.status,
        });
        // Removed unused activityLogs state update
      }
    }
  }, [roleId, roles]);

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Modal state
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModal(true); // Show admin confirmation modal
  };

  // Called after admin confirms
  const handleConfirmLogin = (data: Record<string, string>) => {
    if (
      data.username === (user?.username || "") &&
      data.password &&
      roleId !== undefined
    ) {
      updateRole(roleId, {
        name: form.name,
        description: form.description,
        status: form.status,
      }).then(() => {
        setShowModal(false);
        if (onCancel) {
          onCancel();
        } else {
          navigate("/role-master", { state: { activeTab: "role" } });
        }
      });
    } else {
      alert("Invalid credentials. Please try again.");
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate("/role-master", { state: { activeTab: "role" } });
    }
  };

  return (
    <div className={styles.pageWrapper}>
        <AppHeader title="Role Master Management" />

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
            <span className={styles.breadcrumbCurrent}>Edit Role</span>
          </div>

         <div className={styles.formCard}>
          <div className={styles.formHeader}>
              <h2>Edit Role</h2>
              <p>Enter Role details to add a new record to the system</p>
            </div>
          <form
            onSubmit={handleSubmit}
            className={styles.form}
            style={{ width: "100%" }}
          >
            <div className={styles.scrollFormContainer}>
              <div className={styles.rowFields}>
                <div
                  className={styles.formGroup}
                  style={{ flex: 1, minWidth: 180 }}
                >
                  <label>Role Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    required
                    className={styles.input}
                  />
                </div>
                <div
                  className={styles.formGroup}
                  style={{ flex: 1, minWidth: 180 }}
                >
                  <label>Status</label>
                  <select
                    className={styles.select}
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
                className={styles.formGroup}
                style={{ width: "100%", marginTop: 18 }}
              >
                <label>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  required
                  className={styles.textarea}
                  rows={5}
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
              className={styles.buttonRow}
              style={{
                display: "flex",
                justifyContent: "flex-start",
                gap: 24,
                marginTop: 24,
              }}
            >
              <button type="submit" className={styles.saveBtn}>
                Update
              </button>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
          {showModal && (
            <ConfirmLoginModal
              title="Confirm Edit Role"
              description="Please confirm editing this role by entering your password."
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
