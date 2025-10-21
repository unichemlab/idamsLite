import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { API_BASE } from "utils/api";

const TransactionForm = ({ transaction }) => {
  const navigate = useNavigate();

  const [plants, setPlants] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    transaction_id: "",
    plant_id: "",
    assignment_it_group: "",
    user_id: [], // array of selected user IDs
    status: "ACTIVE",
  });

  // Fetch plants and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        const plantRes = await fetch(`${API_BASE}/api/plants`);
        const plantData = await plantRes.json();
        setPlants(Array.isArray(plantData) ? plantData : plantData.plants || []);

        const userRes = await fetch(`${API_BASE}/api/users/department`);
        const userData = await userRes.json();
        setUsers(Array.isArray(userData) ? userData : userData.users || []);
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };

    fetchData();
  }, []);

  // If editing an existing transaction
  useEffect(() => {
    if (transaction) {
      const userIds =
        transaction.users?.map((u) => u.user_id || u.id) ||
        transaction.user_id ||
        [];

      setForm({
        transaction_id: transaction.transaction_id,
        plant_id: transaction.plant_id?.toString() || "",
        assignment_it_group: transaction.assignment_it_group || "",
        user_id: Array.isArray(userIds)
          ? userIds.map((id) => parseInt(id))
          : [],
        status: transaction.status || "ACTIVE",
      });
    }
  }, [transaction]);

  // Input change for select and text fields
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "plant_id") {
      // find selected plant
      const selectedPlant = plants.find(
        (p) => p.id.toString() === value.toString()
      );

      setForm((prev) => ({
        ...prev,
        plant_id: value,
        assignment_it_group: selectedPlant
          ? `${selectedPlant.plant_name} IT Support`
          : "",
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Multi-user dropdown change
  const handleUserChange = (selectedOptions) => {
    setForm({
      ...form,
      user_id: selectedOptions ? selectedOptions.map((opt) => opt.value) : [],
    });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      plant_id: parseInt(form.plant_id),
      assignment_it_group: form.assignment_it_group,
      user_id: form.user_id, // array of IDs
      status: form.status,
    };

    const url = transaction
      ? `${API_BASE}/api/plant-itsupport/${transaction.id}`
      : `${API_BASE}/api/plant-itsupport`;

    const method = transaction ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Transaction saved successfully!");
        navigate("/plant-itsupport");
      } else {
        const text = await res.text();
        alert("Error saving transaction: " + text);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save transaction");
    }
  };

  // React-select custom styles (for cleaner design)
  const selectStyles = {
    control: (base) => ({
      ...base,
      minHeight: "40px",
      borderRadius: "6px",
      borderColor: "#ccc",
      fontSize: "15px",
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "#e3f2fd",
      borderRadius: "4px",
      paddingRight: 4,
    }),
    multiValueLabel: (base) => ({
      ...base,
      fontSize: "13px",
      color: "#333",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: "150px",
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
    }),
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "20px auto",
        padding: 20,
        border: "1px solid #ccc",
        borderRadius: 8,
        backgroundColor: "#fff",
        boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ marginBottom: 20 }}>
        {transaction ? "Edit IT Group Assignment" : "Add IT Group Assignment"}
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Plant */}
        <div style={{ marginBottom: 15 }}>
          <label style={{ fontWeight: 600 }}>Plant</label>
          <select
            name="plant_id"
            value={form.plant_id}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: 8,
              fontSize: 15,
              borderRadius: 6,
              border: "1px solid #ccc",
              marginTop: 5,
            }}
          >
            <option value="">-- Select Plant --</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.plant_name}
              </option>
            ))}
          </select>
        </div>

        {/* Assignment IT Group (auto-filled and readonly) */}
        <div style={{ marginBottom: 15 }}>
          <label style={{ fontWeight: 600 }}>Assignment IT Group</label>
          <input
            type="text"
            name="assignment_it_group"
            value={form.assignment_it_group}
            readOnly
            style={{
              width: "100%",
              padding: 8,
              fontSize: 15,
              borderRadius: 6,
              border: "1px solid #ccc",
              marginTop: 5,
              backgroundColor: "#f9f9f9",
              color: "#555",
            }}
          />
        </div>

        {/* Multi-user selection */}
        <div style={{ marginBottom: 15 }}>
          <label style={{ fontWeight: 600 }}>Assign Users</label>
          <Select
            isMulti
            options={users.map((u) => ({
              value: u.id,
              label: `${u.employee_name} (${u.email}-${u.employee_code})`,
            }))}
            value={users
              .filter((u) => form.user_id.includes(u.id))
              .map((u) => ({
                value: u.id,
                label: `${u.employee_name} (${u.email}-${u.employee_code})`,
              }))}
            onChange={handleUserChange}
            placeholder="Search and select users..."
            styles={selectStyles}
          />
        </div>

        {/* Status */}
        <div style={{ marginBottom: 15 }}>
          <label style={{ fontWeight: 600 }}>Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: 8,
              fontSize: 15,
              borderRadius: 6,
              border: "1px solid #ccc",
              marginTop: 5,
            }}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate("/plant-itsupport")}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #ccc",
              backgroundColor: "#f0f0f0",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;