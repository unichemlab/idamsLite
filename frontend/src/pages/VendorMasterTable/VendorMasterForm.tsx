import React, { useState } from "react";
import styles from "./VendorMasterForm.module.css";

import { VendorUser } from "./VendorMasterTable";

interface Props {
  initialData?: VendorUser | null;
  mode: "add" | "edit";
  onSave: (vendor: VendorUser) => void;
  onClose: () => void;
}

const VendorMasterForm: React.FC<Props> = ({
  initialData,
  mode,
  onSave,
  onClose,
}) => {
  const [form, setForm] = useState<VendorUser>(
    initialData || {
      fullName: "",
      comment: "",
      status: "Active",
      activityLogs: [],
    }
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    let checked = false;
    if (type === "checkbox" && "checked" in e.target) {
      checked = (e.target as HTMLInputElement).checked;
    }
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {mode === "add" ? "Add Vendor" : "Edit Vendor"}
        </h2>
        <button type="button" className={styles.closeBtn} onClick={onClose}>
          ×
        </button>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Vendor/OEM Firm Name</label>
          <input
            className={styles.input}
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.input}
            name="comment"
            value={form.comment}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Status</label>
          <select
            className={styles.input}
            name="status"
            value={form.status}
            onChange={
              handleChange as React.ChangeEventHandler<HTMLSelectElement>
            }
            required
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.saveBtn}>
            {mode === "add" ? "Add Vendor" : "Save Changes"}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default VendorMasterForm;
