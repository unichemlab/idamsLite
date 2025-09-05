import React, { useState, useEffect } from "react";
import ConfirmLoginModal from "../components/Common/ConfirmLoginModal";
import styles from "../RoleMaster/AddRoleFormPage.module.css";
import { useNavigate, useParams } from "react-router-dom";
import { useRoles, RoleActivityLog } from "../RoleMaster/RolesContext";
import type { Role } from "../RoleMaster/RolesContext";

export default function EditRoleFormPage() {
  const { roles } = useRoles();
  const navigate = useNavigate();
  const { idx } = useParams<{ idx: string }>();

  const [form, setForm] = useState<Omit<Role, "activityLogs">>({
    name: "",
    description: "",
    status: "ACTIVE",
  });

  const [activityLogs, setActivityLogs] = useState<RoleActivityLog[]>([]);

  useEffect(() => {
    if (idx && roles[parseInt(idx)]) {
      const role = roles[parseInt(idx)];
      setForm({
        name: role.name,
        description: role.description,
        status: role.status,
      });
      setActivityLogs(role.activityLogs || []);
    }
  }, [idx, roles]);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Modal state
  const [showModal, setShowModal] = useState(false);
  // Get logged-in username from localStorage
  const username = localStorage.getItem("username") || "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModal(true); // Show admin confirmation modal
  };

  // Called after admin confirms
  const handleConfirmLogin = (data: Record<string, string>) => {
    if (data.username === username && data.password && idx !== undefined) {
      const updated = [...roles];
      updated[parseInt(idx)] = {
        ...form,
        activityLogs: [
          ...activityLogs,
          {
            action: "Edit",
            oldValue: "-",
            newValue: `Role: ${form.name}`,
            approver: username,
            dateTime: new Date().toISOString(),
            // reason field removed (no comment)
          },
        ],
      };

      setShowModal(false);
      navigate("/superadmin", { state: { activeTab: "role" } });
    } else {
      alert("Invalid credentials. Please try again.");
    }
  };

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
        Edit Role
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
              readOnly
              style={{
                backgroundColor: "#f3f3f3",
                color: "#888",
                cursor: "not-allowed",
              }}
              title="Role name cannot be changed after creation."
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
          username={username}
          onConfirm={handleConfirmLogin}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
