import React, { useState } from "react";
import { useFormContext } from "../../context/FormContext";
import styles from "./GenerateCredentials.module.css";
import Stepper from "../../components/Stepper/Stepper";

const steps = [
  "User Information",
  "Access Details",
  "Review & Submit",
  "Generate Credentials",
];

const GenerateCredentials: React.FC = () => {
  const { data, setData } = useFormContext();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("8YvHno~=Q7gb");
  // For demo, generate a fake requestId, approvedAt, validUntil, userId if not present
  const requestId = data.requestId || "AR-2025-209";
  const approvedAt = data.approvedAt || new Date().toLocaleString();
  const validUntil = data.validUntil || "10/21/2025";
  const [userId, setUserId] = useState(
    data.userId || data.employeeCode || "JOHN@81"
  );
  // For demo: status is pending unless explicitly set to approved
  const status = data.requestStatus || "pending";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRegenerate = () => {
    setPassword(Math.random().toString(36).slice(-10) + "A$");
    setShowPassword(false);
  };

  const handleDownloadPDF = () => {
    alert("PDF download not implemented in demo.");
  };

  const handleUserIdSave = () => {
    setData((prev) => ({ ...prev, userId }));
    alert("User ID saved!");
  };

  return (
    <div className={styles.container}>
      <div className={styles.stepperWrap}>
        <Stepper steps={steps} currentStep={3} />
      </div>

      {status !== "approved" ? (
        <div className={styles.approvalCard} style={{ textAlign: "center" }}>
          <div
            className={styles.approvalIcon}
            style={{ fontSize: 48, color: "#ff9800" }}
          >
            ⏳
          </div>
          <h2 className={styles.approvalTitle} style={{ color: "#ff9800" }}>
            Request Pending Approval
          </h2>
          <p className={styles.approvalSubtitle}>
            Your access request is currently <b>pending</b> and will be reviewed
            by the IT department.
            <br />
            You will be notified once it is approved.
          </p>
          <div className={styles.infoGrid}>
            <div>
              <span className={styles.infoLabel}>Request ID:</span> {requestId}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.approvalCard}>
            <div className={styles.approvalIcon}>✅</div>
            <h2 className={styles.approvalTitle}>
              Request Approved - Generate Credentials
            </h2>
            <p className={styles.approvalSubtitle}>
              Your access request has been approved. Generate your login
              credentials below.
            </p>
            <div className={styles.infoGrid}>
              <div>
                <span className={styles.infoLabel}>Request ID:</span>{" "}
                {requestId}
              </div>
              <div>
                <span className={styles.infoLabel}>Approved:</span> {approvedAt}
              </div>
              <div>
                <span className={styles.infoLabel}>Valid Until:</span>{" "}
                {validUntil}
              </div>
            </div>
          </div>

          <div className={styles.credCard}>
            <h3 className={styles.credTitle}>Generated Credentials</h3>
            <div className={styles.credFieldRow}>
              <label className={styles.credLabel}>User ID</label>
              <div className={styles.credInputWrap}>
                <input
                  className={styles.credInput}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  style={{ minWidth: 180 }}
                />
                <button
                  className={styles.copyBtn}
                  type="button"
                  onClick={() => handleCopy(userId)}
                >
                  Copy
                </button>
                <button
                  className={styles.copyBtn}
                  type="button"
                  onClick={handleUserIdSave}
                  style={{ background: "#5ac9d8", color: "#fff" }}
                >
                  Save
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                You can use your Employee Code or enter a custom User ID.
              </div>
            </div>
            <div className={styles.credFieldRow}>
              <label className={styles.credLabel}>Generated Password</label>
              <div className={styles.credInputWrap}>
                <input
                  className={styles.credInput}
                  value={showPassword ? password : "••••••••••"}
                  readOnly
                  type="text"
                />
                <button
                  className={styles.copyBtn}
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
                <button
                  className={styles.copyBtn}
                  type="button"
                  onClick={() => handleCopy(password)}
                >
                  Copy
                </button>
              </div>
              <div className={styles.passwordStrengthRow}>
                <span className={styles.passwordStrengthBar}></span>
                <span className={styles.passwordStrengthText}>
                  Strong Password
                </span>
              </div>
            </div>
            <div className={styles.credActionsRow}>
              <button
                className={styles.credActionBtn}
                type="button"
                onClick={handleRegenerate}
              >
                Regenerate Password
              </button>
              <button
                className={styles.credActionBtn}
                type="button"
                onClick={handleDownloadPDF}
              >
                Download PDF
              </button>
            </div>
          </div>
        </>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12,
        }}
      >
        <button
          style={{
            background: "#eee",
            color: "#007f86",
            border: "1.5px solid #5ac9d8",
            borderRadius: 6,
            padding: "0.5rem 1.2rem",
            cursor: "pointer",
          }}
          onClick={() => (window.location.href = "/track-request")}
        >
          Track Request
        </button>
      </div>
      <div className={styles.securityNoticeCard}>
        <div className={styles.securityNoticeIcon}>⚠️</div>
        <div>
          <div className={styles.securityNoticeTitle}>Security Notice</div>
          <ul className={styles.securityNoticeList}>
            <li>
              Password expires in 90 days - you will be notified before expiry
            </li>
            <li>Store credentials securely - do not share with others</li>
            <li>Change password immediately upon first login if required</li>
            <li>Report any suspicious activity to IT security team</li>
          </ul>
        </div>
      </div>

      <div className={styles.footerActions}>
        <button className={styles.confirmBtn}>Confirm & Proceed</button>
        <button className={styles.secondaryBtn}>Create Another Request</button>
      </div>
    </div>
  );
};

export default GenerateCredentials;
// ...existing code up to the first export default GenerateCredentials;
