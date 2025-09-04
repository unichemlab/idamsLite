import React from "react";
import { useApprover } from "../context/ApproverContext";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import styles from "./AccessRequestModal.module.css";

const AccessRequestDetails: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { step } = useParams();
  const request = location.state?.request;
  const { setRequests, setApprovalActions, setActiveTab } = useApprover();

  if (!request) {
    return <div className={styles.modal}>No request data found.</div>;
  }

  const handleAccept = () => {
    setRequests((prev) =>
      prev.map((req) =>
        req.id === request.id ? { ...req, requestStatus: "Approved" } : req
      )
    );
    setApprovalActions((prev) => [
      ...prev,
      {
        approverName: "approver",
        approverRole: "Approver",
        plant: request.plant || "GOA",
        corporate: "Unichem Corp",
        action: "Approved",
        timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
        comments: "Approved by Approver",
      },
    ]);
    setActiveTab("approved-rejected");
    navigate(-1);
  };

  const handleReject = () => {
    setRequests((prev) =>
      prev.map((req) =>
        req.id === request.id ? { ...req, requestStatus: "Rejected" } : req
      )
    );
    setApprovalActions((prev) => [
      ...prev,
      {
        approverName: "approver",
        approverRole: "Approver",
        plant: request.plant || "GOA",
        corporate: "Unichem Corp",
        action: "Rejected",
        timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
        comments: "Rejected by Approver",
      },
    ]);
    setActiveTab("approved-rejected");
    navigate(-1);
  };

  // Dummy attached documents (simulate as in UserInformation stepper)
  const attachedDocuments = [
    {
      name: "Certification.pdf",
      url: "#",
      type: "Certification",
      info: "GMP Compliance Certificate",
    },
    {
      name: "TrainingRecord.pdf",
      url: "#",
      type: "Training Record",
      info: "21 CFR Part 11 Training Completion",
    },
    {
      name: "IDProof.pdf",
      url: "#",
      type: "ID Proof",
      info: "Aadhar Card (Last 4: 1234)",
    },
  ];

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Close Cross Button */}
        <button
          className={styles.closeBtn}
          style={{
            position: "absolute",
            top: "1.2rem",
            right: "1.2rem",
            background: "#1e88e5",
            color: "#fff",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            fontSize: "1.25rem",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 2,
          }}
          aria-label="Close"
          title="Close"
          onClick={() => navigate(-1)}
        >
          &#10006;
        </button>

        <h2>Access Request Details {step ? `(Approver ${step})` : ""}</h2>
        <table className={styles.detailsTable}>
          <tbody>
            {Object.entries(request).map(([key, value]) => (
              <tr key={key}>
                <td className={styles.label}>
                  {key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase())}
                </td>
                <td className={styles.value}>{String(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Attached Documents Section */}
        <div style={{ margin: "1.5rem 0 1rem 0" }}>
          <h3 style={{ marginBottom: 8, fontSize: 18 }}>Attached Documents</h3>
          {attachedDocuments.length === 0 ? (
            <div style={{ color: "#888", fontSize: 14 }}>
              No documents attached.
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {attachedDocuments.map((doc, idx) => (
                <li
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontWeight: 500, marginRight: 8 }}>
                    {doc.type}:
                  </span>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#1976d2",
                      textDecoration: "underline",
                      marginRight: 8,
                    }}
                  >
                    {doc.name}
                  </a>
                  <span style={{ color: "#888", fontSize: 13, marginRight: 8 }}>
                    (PDF)
                  </span>
                  <span style={{ color: "#555", fontSize: 13 }}>
                    {doc.info}
                  </span>
                  {/* You can add a download/view icon here if you want */}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          <button
            className={styles.closeBtn}
            style={{ background: "#43a047" }}
            onClick={handleAccept}
          >
            Accept
          </button>
          <button
            className={styles.closeBtn}
            style={{ background: "#e53935" }}
            onClick={handleReject}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessRequestDetails;
