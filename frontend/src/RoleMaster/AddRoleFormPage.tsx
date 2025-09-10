import React, { useState } from "react";
import ConfirmLoginModal from "../components/Common/ConfirmLoginModal";
import styles from "../RoleMaster/AddRoleFormPage.module.css";
import { useNavigate } from "react-router-dom";
import { useRoles } from "../RoleMaster/RolesContext";
import type { Role } from "../RoleMaster/RolesContext";
import superAdminStyles from "../pages/SuperAdmin/SuperAdmin.module.css";

interface AddRoleFormPageProps {
  onCancel?: () => void;
}

export default function AddRoleFormPage({ onCancel }: AddRoleFormPageProps) {
  const navigate = useNavigate();
  const { addRole } = useRoles();

  const [form, setForm] = useState<Omit<Role, "activityLogs">>({
    name: "",
    description: "",
    status: "ACTIVE",
  });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  // Get logged-in username from localStorage
  const username = localStorage.getItem("username") || "";

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModal(true); // Show admin confirmation modal
  };

  // Called after admin confirms
  const handleConfirmLogin = (data: Record<string, string>) => {
    if (data.username === username && data.password) {
      addRole({
        name: form.name,
        description: form.description,
        status: form.status,
      }).then(() => {
        setShowModal(false);
        navigate("/superadmin", { state: { activeTab: "role" } });
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
      navigate("/superadmin", { state: { activeTab: "role" } });
    }
  };

  return (
    <div className={superAdminStyles["main-container"]}  style = {{width: "100vw"}}>
      {/* Sidebar */}
      
    <main className={superAdminStyles["main-content"]}>
     <header className={superAdminStyles["main-header"]}>
          <h2 className={superAdminStyles["header-title"]}>Role Master</h2>
          <div className={superAdminStyles["header-icons"]}></div>
        </header>

        {/* Breadcrumb */}
        <div
          style={{
            background: "#eef4ff",
            padding: "12px 24px",
            fontSize: "1.05rem",
            color: "#2d3748",
            fontWeight: 500,
            borderRadius: "0 0 12px 12px",
            marginBottom: 0,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              color: "#0b63ce",
              cursor: "pointer",
              opacity: 0.7,
              transition: "color 0.2s",
            }}
            onClick={() =>
              navigate("/superadmin", { state: { activeTab: "role" } })
            }
            onMouseOver={(e) => (e.currentTarget.style.color = "#084a9e")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#0b63ce")}
            tabIndex={0}
            role="button"
            aria-label="Go Role Master table"
          >
            Role Master
          </span>
          <span>&gt;</span>
          <span style={{ color: "#2d3748" }}>Add Role</span>
        </div>

   <div
     className={styles.container}
    >
     
      <form
        className={styles.roleForm}
        onSubmit={handleSubmit}
        style={{ width: "100%" }}
      >
        <div
          style={{
            display: "flex",
            gap: 32,
            marginBottom: 32,
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: 1, minWidth: 180 }} className={styles.formGroup}>
            <label>Role Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleFormChange}
              required
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }} className={styles.formGroup}>
            <label>Description</label>
            <input
              name="description"
              value={form.description}
              onChange={handleFormChange}
              required
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }} className={styles.formGroup}>
            <label>Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleFormChange}
              style={{ width: "100%" }}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>
        <div
          className={styles.formActions}
          style={{
            display: "flex",
            justifyContent: "center",
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
          username={username}
          onConfirm={handleConfirmLogin}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
    </main>
    </div>
  );
}
