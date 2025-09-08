// src/pages/DepartmentMasterTable/AddDeptFormPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDepartmentContext } from "../../pages/DepartmentMaster/DepartmentContext";
import styles from "../ApplicationMasterTable/ApplicationMasterTable.module.css";

const AddDeptFormPage: React.FC = () => {
  const { addDepartment } = useDepartmentContext();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDepartment({ id: Date.now(), name, description, status });
    navigate("/superadmin");
  };

  return (
    <div className={styles.formWrapper}>
      <h2>Add Department</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Department Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.saveButton}>Save</button>
          <button type="button" className={styles.cancelButton} onClick={() => navigate("/superadmin")}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default AddDeptFormPage;
