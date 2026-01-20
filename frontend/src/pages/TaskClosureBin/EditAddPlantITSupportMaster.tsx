// src/pages/PlantITSupport/EditPlantITSupport.tsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppHeader from "../../components/Common/AppHeader";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../utils/api";
import styles from "../Plant/AddPlantMaster.module.css";
import Select from "react-select";

interface Plant {
  id: number;
  plant_name: string;
}

interface User {
  id: number;
  employee_name: string;
  email: string;
  employee_code: string;
}

interface PlantITSupportForm {
  id?: number;
  transaction_id?: string;
  plant_id: number | undefined;
  assignment_it_group: string;
  user_id: number[];
  status: string;
}

const EditPlantITSupport: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [form, setForm] = useState<PlantITSupportForm | null>(null);

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
    const fetchTransaction = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/plant-itsupport/${id}`);
        const data = await res.json();

        const userIds =
          data.users?.map((u: any) => u.user_id || u.id) || data.user_id || [];

        setForm({
          id: data.id,
          transaction_id: data.transaction_id,
          plant_id: data.plant_id,
          assignment_it_group: data.assignment_it_group || "",
          user_id: Array.isArray(userIds) ? userIds.map((id: any) => parseInt(id)) : [],
          status: data.status || "ACTIVE",
        });
      } catch (err) {
        console.error("Error loading transaction:", err);
      }
    };

    if (id) fetchTransaction();
  }, [id]);

  if (!form) return <p>Loading...</p>;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "plant_id") {
      const selectedPlant = plants.find((p) => p.id === Number(value));
      setForm({
        ...form,
        plant_id: Number(value),
        assignment_it_group: selectedPlant ? `${selectedPlant.plant_name} IT Support` : "",
      });
    } else {
      setForm({
        ...form,
        [name]: value,
      });
    }
  };

  const handleUserChange = (selectedOptions: any) => {
    setForm({
      ...form,
      user_id: selectedOptions ? selectedOptions.map((opt: any) => opt.value) : [],
    });
  };

  const validateForm = () => {
    if (!form.plant_id) {
      alert("Plant is required");
      return false;
    }

    if (!form.assignment_it_group) {
      alert("Assignment IT Group is required");
      return false;
    }

    if (form.user_id.length === 0) {
      alert("At least one user must be assigned");
      return false;
    }

    return true;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setConfirm(true);
  };

  const confirmSubmit = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/plant-itsupport/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plant_id: form.plant_id,
          assignment_it_group: form.assignment_it_group,
          user_id: form.user_id,
          status: form.status,
        }),
      });

      if (res.ok) {
        alert("IT Group Assignment updated successfully!");
        navigate("/plant-itsupport");
      } else {
        const text = await res.text();
        alert("Error updating assignment: " + text);
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update assignment");
    }
  };

  const input = (name: keyof PlantITSupportForm, label: string, type = "text") => (
    <div className={styles.formGroupFloating}>
      <input
        className={styles.input}
        type={type}
        name={name}
        value={(form as any)[name] ?? ""}
        onChange={handleChange}
        readOnly={name === "assignment_it_group"}
      />
      <label className={styles.floatingLabel}>{label}</label>
    </div>
  );

  const select = (
    name: keyof PlantITSupportForm,
    label: string,
    options: string[],
    isRequired: boolean = false
  ) => (
    <div className={styles.formGroupFloating}>
      <select
        name={name}
        value={(form as any)[name] || ""}
        onChange={handleChange}
        required={isRequired}
        className={styles.select}
      >
        <option value="">-- Select --</option>
        {options.map((v, i) => (
          <option key={i} value={v}>
            {v}
          </option>
        ))}
      </select>
      <label className={styles.floatingLabel}>
        {label}
        {isRequired && <span className={styles.required}> *</span>}
      </label>
    </div>
  );

  const selectStyles = {
    control: (base: any) => ({
      ...base,
      minHeight: "48px",
      borderRadius: "8px",
      borderColor: "#e2e8f0",
      fontSize: "15px",
      boxShadow: "none",
      "&:hover": {
        borderColor: "#cbd5e1",
      },
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: "#e0f2fe",
      borderRadius: "6px",
      padding: "2px 4px",
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      fontSize: "13px",
      color: "#0c4a6e",
      fontWeight: "500",
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: "#0c4a6e",
      "&:hover": {
        backgroundColor: "#bae6fd",
        color: "#075985",
      },
    }),
    menu: (base: any) => ({
      ...base,
      zIndex: 9999,
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#0ea5e9"
        : state.isFocused
        ? "#f0f9ff"
        : "white",
      color: state.isSelected ? "white" : "#1e293b",
      "&:active": {
        backgroundColor: "#0284c7",
      },
    }),
  };

  return (
    <>
      {confirm && (
        <ConfirmLoginModal
          username={user?.username || ""}
          onConfirm={confirmSubmit}
          onCancel={() => setConfirm(false)}
        />
      )}

      <div className={styles.pageWrapper}>
        <AppHeader title="Edit IT Support Assignment" />

        <div className={styles.contentArea}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Edit IT Group Assignment</h2>
            </div>

            <form onSubmit={submit} className={styles.form} style={{ padding: 10 }}>
              <div className={styles.scrollFormContainer}>
                {/* Plant Selection */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>Plant Details</span>
                  <div className={styles.rowFields}>
                    <div className={styles.formGroupFloating}>
                      <select
                        name="plant_id"
                        value={form.plant_id || ""}
                        onChange={handleChange}
                        required
                        disabled   // 👈 lock plant
                        className={styles.select}
                      >
                        <option value="">-- Select Plant --</option>
                        {plants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.plant_name}
                          </option>
                        ))}
                      </select>
                      <label className={styles.floatingLabel}>
                        Plant <span className={styles.required}>*</span>
                      </label>
                    </div>

                    {input("assignment_it_group", "Assignment IT Group")}
                  </div>
                </div>

                {/* User Assignment */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>User Assignment</span>
                  <div className={styles.rowFields1}>
                    <div className={styles.formGroupFloating} style={{ flex: "1 1 100%" }}>
                      <Select
                        isMulti
                        options={users.map((u) => ({
                          value: u.id,
                          label: `${u.employee_name} (${u.email} - ${u.employee_code})`,
                        }))}
                        value={users
                          .filter((u) => form.user_id.includes(u.id))
                          .map((u) => ({
                            value: u.id,
                            label: `${u.employee_name} (${u.email} - ${u.employee_code})`,
                          }))}
                        onChange={handleUserChange}
                        placeholder="Search and select users..."
                        styles={selectStyles}
                      />
                      <label
                        className={styles.floatingLabel}
                        
                      >
                        Assign Users <span className={styles.required}>*</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className={styles.section}>
                  <span className={styles.sectionHeaderTitle}>Status</span>
                  <div className={styles.rowFields}>
                    {select("status", "Status", ["ACTIVE", "INACTIVE"], true)}
                  </div>
                </div>
              </div>

              <div className={styles.buttonRow}>
                <button type="submit" className={styles.saveBtn}>
                  Update
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => navigate("/task-closure-bin")}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditPlantITSupport;