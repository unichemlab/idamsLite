// src/pages/DepartmentMasterTable/EditDeptFormPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDepartmentContext, Department } from "../../pages/DepartmentMaster/DepartmentContext";
import styles from "../ApplicationMasterTable/ApplicationMasterTable.module.css";

const EditDeptFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { departments, updateDepartment } = useDepartmentContext();
  const navigate = useNavigate();

  const deptToEdit = departments.find((d) => d.id === Number(id));

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  useEffect(() => {
    if (deptToEdit) {
      setName(deptToEdit.name);
      setDescription(deptToEdit.description ?? "");
      setStatus(deptToEdit.status ?? "ACTIVE");
    }
  }, [deptToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const updatedDept: Department = {
      id: Number(id),
      name,
      description,
      status,
    };
    await updateDepartment(Number(id), updatedDept);
    navigate("/superadmin");
  };

  if (!deptToEdit) {
    return <p className={styles.notFound}>Department not found</p>;
  }

  return (
    <div className={styles.formWrapper}>
      <h2>Edit Department</h2>
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
          <button type="submit" className={styles.saveButton}>Update</button>
          <button type="button" className={styles.cancelButton} onClick={() => navigate("/superadmin")}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default EditDeptFormPage;
