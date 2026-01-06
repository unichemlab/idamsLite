import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { API_BASE } from "utils/api";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/AddPlantMaster.module.css";

const TransactionForm = ({ transaction }) => {
  const navigate = useNavigate();

  const [plants, setPlants] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    transaction_id: "",
    plant_id: "",
    assignment_it_group: "",
    user_id: [],
    status: "ACTIVE",
  });

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
        user_id: Array.isArray(userIds) ? userIds.map((id) => parseInt(id)) : [],
        status: transaction.status || "ACTIVE",
      });
    }
  }, [transaction]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "plant_id") {
      const selectedPlant = plants.find((p) => p.id.toString() === value.toString());

      setForm((prev) => ({
        ...prev,
        plant_id: value,
        assignment_it_group: selectedPlant ? `${selectedPlant.plant_name} IT Support` : "",
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleUserChange = (selectedOptions) => {
    setForm({
      ...form,
      user_id: selectedOptions ? selectedOptions.map((opt) => opt.value) : [],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      plant_id: parseInt(form.plant_id),
      assignment_it_group: form.assignment_it_group,
      user_id: form.user_id,
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
        navigate("/task-closure-bin");
      } else {
        const text = await res.text();
        alert("Error saving transaction: " + text);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save transaction");
    }
  };

  const selectStyles = {
    control: (base) => ({
      ...base,
      minHeight: "44px",
      borderRadius: "10px",
      border: "2px solid #e2e8f0",
      fontSize: "15px",
      boxShadow: "none",
      transition: "all 0.3s ease",
      "&:hover": {
        borderColor: "#cbd5e1",
      },
      "&:focus-within": {
        borderColor: "#3b82f6",
        boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.1)",
      },
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "#dbeafe",
      borderRadius: "6px",
      padding: "2px 4px",
    }),
    multiValueLabel: (base) => ({
      ...base,
      fontSize: "13px",
      color: "#1e40af",
      fontWeight: "600",
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "#1e40af",
      "&:hover": {
        backgroundColor: "#bfdbfe",
        color: "#1e3a8a",
      },
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
      borderRadius: "10px",
      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#3b82f6"
        : state.isFocused
        ? "#eff6ff"
        : "white",
      color: state.isSelected ? "white" : "#1e293b",
      "&:active": {
        backgroundColor: "#2563eb",
      },
    }),
  };

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="IT Support Management" />

      <div className={styles.contentArea}>
        <div className={styles.breadcrumb}>
          <span
            className={styles.breadcrumbLink}
            onClick={() => navigate("/task-closure-bin")}
          >
            Task Closure Bin
          </span>
          <span className={styles.breadcrumbSeparator}>›</span>
          <span className={styles.breadcrumbCurrent}>
            {transaction ? "Edit Task Closure BIN" : "Add Task Closure BIN"}
          </span>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>
              {transaction ? "Edit IT Group Assignment" : "Add IT Group Assignment"}
            </h2>
            <p>Enter Task Closure BIN details to add or edit a record to the system</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Plant <span className={styles.required}>*</span>
                  </label>
                  <select
                    name="plant_id"
                    value={form.plant_id}
                    onChange={handleChange}
                    required
                    className={styles.select}
                  >
                    <option value="">-- Select Plant --</option>
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.plant_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Assignment IT Group</label>
                  <input
                    type="text"
                    name="assignment_it_group"
                    value={form.assignment_it_group}
                    readOnly
                    className={styles.inputReadonly}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Assign Users <span className={styles.required}>*</span>
                </label>
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

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Status <span className={styles.required}>*</span>
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className={styles.formFooter}>
              <button type="submit" className={styles.saveBtn}>
                💾 {transaction ? "Update" : "Save"} Transaction
              </button>
              <button
                type="button"
                onClick={() => navigate("/task-closure-bin")}
                className={styles.cancelBtn}
              >
               Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TransactionForm;