import React, { useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import styles from "./ApplicationMasterTable.module.css";
import { useLocation, useNavigate } from "react-router-dom";

export default function EditApplicationFormPage() {
  const username = localStorage.getItem("username") || "";
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { applicationData } = location.state || {};
  const [form, setForm] = useState(
    applicationData || {
      name: "",
      version: "",
      equipmentId: "",
      computer: "",
      plant: "",
      status: "ACTIVE",
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  return (
    <div className={styles.addUserFormPageWrapper}>
      <div className={styles.addUserFormPageContainer}>
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <h2 style={{ marginBottom: 24 }}>Edit Application</h2>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            <input
              name="name"
              placeholder="Application Name"
              value={form.name}
              onChange={handleChange}
              required
              className={styles.input}
            />
            <input
              name="version"
              placeholder="Version"
              value={form.version}
              onChange={handleChange}
              required
              className={styles.input}
            />
            <input
              name="equipmentId"
              placeholder="Equipment ID"
              value={form.equipmentId}
              onChange={handleChange}
              required
              className={styles.input}
            />
            <input
              name="computer"
              placeholder="Computer"
              value={form.computer}
              onChange={handleChange}
              required
              className={styles.input}
            />
            <input
              name="plant"
              placeholder="Plant"
              value={form.plant}
              onChange={handleChange}
              required
              className={styles.input}
            />
            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              <button type="submit" className={styles.addUserBtn}>
                Update
              </button>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() =>
                  navigate("/superadmin", {
                    state: { activeTab: "application" },
                  })
                }
              >
                Cancel
              </button>
            </div>
          </form>
          {showModal && (
            <ConfirmLoginModal
              username={username}
              fields={[
                {
                  name: "password",
                  label: "Password",
                  type: "password",
                  required: true,
                  placeholder: "Enter Password",
                },
              ]}
              onConfirm={(data) => {
                // Simple password check (replace with real logic)
                if (data.username === username && data.password) {
                  // Update logic (API or context)
                  // ...existing code...
                  setShowModal(false);
                  navigate("/superadmin", {
                    state: { activeTab: "application" },
                  });
                } else {
                  alert("Invalid credentials. Please try again.");
                }
              }}
              onCancel={() => setShowModal(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
