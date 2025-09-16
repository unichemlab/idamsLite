import React, { useState } from "react";
import styles from "../../components/Common/ConfirmLoginModal.module.css";
import loginHeadTitle from "../../assets/login_headTitle.png";

interface ConfirmLoginModalProps {
  title?: string;
  description?: string;
  username?: string;
  fields?: Array<{
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
  }>;
  activityType?: string;
  onConfirm: (data: Record<string, string>) => void;
  onCancel: () => void;
}

const ConfirmLoginModal = ({
  title = "Admin Confirmation",
  description = "Please confirm your action by entering the required details.",
  username,
  fields = [
    {
      name: "password",
      label: "Password",
      type: "password",
      required: true,
      placeholder: "Enter Password",
    },
  ],
  activityType,
  onConfirm,
  onCancel,
}: ConfirmLoginModalProps) => {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      initial[f.name] = "";
    });
    if (username) initial.username = username;
    return initial;
  });
  const [error, setError] = useState<string>("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === "username" && username) return;
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const field of fields) {
      if (field.required && !form[field.name]) {
        setError(`${field.label} is required`);
        return;
      }
    }
    setError("");
    const data = { ...form };
    if (username) data.username = username;
    if (activityType) data.activityType = activityType;
    onConfirm(data);
  };

  return (
    <div className={styles.modalOverlay}>
      <div
        className={styles.modal}
        style={{
          padding: "2.5rem 2rem 2rem 2rem",
          minWidth: 340,
          boxShadow: "0 12px 40px rgba(90,201,216,0.22)",
          border: "1.5px solid #e0f7fa",
          background: "rgba(255,255,255,0.99)",
          borderRadius: 18,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
          <img
            src={loginHeadTitle}
            alt="IDAMS LITE"
            style={{
              height: "3.4rem",
              marginLeft: "0.6em",
              verticalAlign: "middle",
            }}
          />
          <div
            style={{
              fontSize: "1.45rem",
              color: "#4e6e8e",
              fontWeight: 600,
              marginTop: "0.2em",
              marginBottom: "0.1em",
              textAlign: "center",
              letterSpacing: "0.5px",
            }}
          >
            User Access Management
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          {username && (
            <>
              <label
                htmlFor="username"
                style={{ fontWeight: 500, color: "#2563eb" }}
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                disabled
                style={{
                  background: "#f3f3f3",
                  color: "#888",
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              />
            </>
          )}
          {fields
            .filter((field) => field.name !== "username")
            .map((field) => (
              <React.Fragment key={field.name}>
                <label htmlFor={field.name} style={{ fontWeight: 500 }}>
                  {field.label}
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type || "text"}
                  placeholder={field.placeholder}
                  value={form[field.name]}
                  onChange={handleChange}
                  autoFocus={field.name === "password"}
                  style={{ marginBottom: 10 }}
                />
              </React.Fragment>
            ))}
          {error && (
            <div style={{ color: "#e74c3c", marginTop: 6 }}>{error}</div>
          )}
          <div className={styles.actions} style={{ marginTop: 18 }}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfirmLoginModal;
