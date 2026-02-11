import React from "react";
import { useNavigate } from "react-router-dom";
import TransactionForm from "./PlantITSupport";
import { API_BASE } from "utils/api";
const AddTransaction = () => {
  const navigate = useNavigate();

  const handleSave = (data) => {
    fetch(`${API_BASE}/api/plant-itsupport`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(() => navigate("/task-closure-bin"))
      .catch(console.error);
  };

  return <TransactionForm onSave={handleSave} />;
};

export default AddTransaction;
