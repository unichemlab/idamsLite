import React from "react";
import { useFormContext } from "../../context/FormContext";
import styles from "./TrackRequest.module.css";

const TrackRequest: React.FC = () => {
  const { data, setData } = useFormContext();
  const logs = data.logs || [];
  const status = data.requestStatus || "draft";
  const hasRequest = data.requestId || logs.length > 0 || status !== "draft";

  // Demo Approve button handler
  const handleApprove = () => {
    setData((prev) => ({
      ...prev,
      requestStatus: "approved",
      logs: [
        ...(prev.logs || []),
        {
          timestamp: new Date().toISOString(),
          message: "Request approved by IT",
        },
      ],
      approvedAt: new Date().toLocaleString(),
    }));
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Track Access Request</h1>
      <div className={styles.card}>
        {!hasRequest ? (
          <div style={{ color: "#888", textAlign: "center", padding: 32 }}>
            No access request found. Please submit a request first.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 18 }}>
              <strong>Status:</strong>{" "}
              <span
                style={{
                  color:
                    status === "approved"
                      ? "#28a745"
                      : status === "pending"
                      ? "#ff9800"
                      : status === "denied"
                      ? "#c00"
                      : "#888",
                  fontWeight: 600,
                  textTransform: "capitalize",
                }}
              >
                {status}
              </span>
            </div>
            <div style={{ marginBottom: 18 }}>
              <strong>Request ID:</strong>{" "}
              {data.requestId || <span style={{ color: "#aaa" }}>-</span>}
            </div>
            <div>
              <strong>Logs:</strong>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {logs.length === 0 && (
                  <li style={{ color: "#aaa" }}>No logs yet.</li>
                )}
                {logs.map((log, idx) => (
                  <li key={idx} style={{ fontSize: 13, color: "#555" }}>
                    <span style={{ color: "#888", fontSize: 12 }}>
                      {new Date(log.timestamp).toLocaleString()}:
                    </span>{" "}
                    {log.message}
                  </li>
                ))}
              </ul>
            </div>
            {status === "pending" && (
              <div style={{ marginTop: 24, textAlign: "center" }}>
                <button
                  style={{
                    background: "#28a745",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "0.7rem 1.5rem",
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                  onClick={handleApprove}
                >
                  Approve Request (Demo)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TrackRequest;
