import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TransactionForm from "./PlantITSupport";
import { API_BASE } from "utils/api";

const EditTransaction = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/plant-itsupport/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch transaction");
        return res.json();
      })
      .then((data) => {
        setTransaction(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const handleSave = (data) => {
    fetch(`${API_BASE}/api/plant-itsupport/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (response.ok) {
          navigate("/task-closure-bin");
        } else {
          throw new Error("Failed to update transaction");
        }
      })
      .catch((error) => {
        console.error("Update error:", error);
        alert("Failed to update transaction. Please try again.");
      });
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)"
      }}>
        <div style={{
          background: "white",
          padding: "40px",
          borderRadius: "20px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
          textAlign: "center"
        }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "4px solid #e2e8f0",
            borderTop: "4px solid #3b82f6",
            borderRadius: "50%",
            margin: "0 auto 20px",
            animation: "spin 1s linear infinite"
          }}></div>
          <p style={{ fontSize: "16px", color: "#64748b", margin: 0 }}>Loading transaction...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)"
      }}>
        <div style={{
          background: "white",
          padding: "40px",
          borderRadius: "20px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
          textAlign: "center",
          maxWidth: "500px"
        }}>
          <div style={{
            fontSize: "48px",
            marginBottom: "20px"
          }}>⚠️</div>
          <h2 style={{
            color: "#dc2626",
            margin: "0 0 10px 0",
            fontSize: "24px",
            fontWeight: 700
          }}>Error Loading Transaction</h2>
          <p style={{
            fontSize: "16px",
            color: "#64748b",
            marginBottom: "30px"
          }}>{error}</p>
          <button
            onClick={() => navigate("/task-closure-bin")}
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
              color: "white",
              border: "none",
              padding: "12px 32px",
              borderRadius: "10px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return transaction ? (
    <TransactionForm transaction={transaction} onSave={handleSave} />
  ) : null;
};

export default EditTransaction;