import React, { useState } from "react";
import ConfirmLoginModal from "../components/Common/ConfirmLoginModal";
import styles from "../RoleMaster/AddRoleFormPage.module.css";
import { useNavigate } from "react-router-dom";
import type { Role } from "../RoleMaster/RolesContext";

export default function AddRoleFormPage() {
  const navigate = useNavigate();

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
      setShowModal(false);
      navigate("/superadmin", { state: { activeTab: "role" } });
    } else {
      alert("Invalid credentials. Please try again.");
    }
  };

  // Update cancel to go back to SuperAdmin with sidebar selected
  const handleCancel = () =>
    navigate("/superadmin", { state: { activeTab: "role" } });

  return (
    <div
      style={{
        width: "100vw",
        maxWidth: 1200,
        minHeight: "90vh",
        margin: "40px auto",
        padding: 36,
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 0 32px rgba(40,70,120,.12)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <h2 style={{ marginBottom: 32, color: "#2563eb", textAlign: "center" }}>
        Add Role
      </h2>
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
  );
}
