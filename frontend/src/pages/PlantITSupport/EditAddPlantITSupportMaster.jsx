import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TransactionForm from "./PlantITSupport";
import { API_BASE } from "utils/api";
const EditTransaction = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/plant-itsupport/${id}`)
      .then((res) => res.json())
      .then((data) => setTransaction(data))
      .catch(console.error);
  }, [id]);

  const handleSave = (data) => {
    fetch(`${API_BASE}/api/plant-itsupport/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(() => navigate("/task-closure-bin"))
      .catch(console.error);
  };

  return transaction ? <TransactionForm transaction={transaction} onSave={handleSave} /> : <p>Loading...</p>;
};

export default EditTransaction;
