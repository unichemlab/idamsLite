import React, { useState } from "react";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import AppHeader from "../../components/Common/AppHeader";
import addStyles from "../Plant/AddPlantMaster.module.css";
import { useDepartmentContext } from "../DepartmentMaster/DepartmentContext";
import { useAuth } from "../../context/AuthContext";

const AddApplicationMaster: React.FC = () => {
  const { user } = useAuth();
  const username = user?.username || "";
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    version: "",
    equipmentId: "",
    computer: "",
    plant: "",
    status: "ACTIVE",
    departmentId: "",
  });

  const { departments } = useDepartmentContext();
  const departmentOptions = Array.isArray(departments)
    ? departments.map((dept) => ({
        value: String(dept.id),
        label: dept.department_name || dept.name || String(dept.id),
      }))
    : [];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  const handleConfirm = (data: Record<string, string>) => {
    if (data.username === username && data.password) {
      setShowModal(false);
      navigate("/application-masters", { state: { activeTab: "application" } });
    } else {
      alert("Invalid credentials. Please try again.");
    }
  };

  return (
    <>
      {showModal && (
        <ConfirmLoginModal
          username={username}
          fields={[
            {
              name: "password",
              label: "Password",
              type: "password",
              required: true,
              placeholder: "Enter Password",
            },
          ]}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
        />
      )}

      <div className={addStyles.pageWrapper}>
        <AppHeader title="Application Master Management" />

        <div className={addStyles.contentArea}>
          {/* Breadcrumb */}
          <div className={addStyles.breadcrumb}>
            <span
              className={addStyles.breadcrumbLink}
              onClick={() =>
                navigate("/application-masters", { state: { activeTab: "application" } })
              }
            >
              Application Master
            </span>
            <span className={addStyles.breadcrumbSeparator}>›</span>
            <span className={addStyles.breadcrumbCurrent}>Add Application</span>
          </div>

          {/* Form Card */}
          <div className={addStyles.formCard}>
            <div className={addStyles.formHeader}>
              <h2>Add New Application 12</h2>
              <p>Enter application details to add a new record to the system</p>
            </div>

            <form className={addStyles.form} onSubmit={handleSubmit}>
              <div className={addStyles.formBody}>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label className={addStyles.label}>
                      Application Name <span className={addStyles.required}>*</span>
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                      placeholder="Enter application name"
                    />
                  </div>

                  <div className={addStyles.formGroup}>
                    <label className={addStyles.label}>
                      Version <span className={addStyles.required}>*</span>
                    </label>
                    <input
                      name="version"
                      value={form.version}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                      placeholder="Enter version"
                    />
                  </div>

                  <div className={addStyles.formGroup}>
                    <label className={addStyles.label}>
                      Department <span className={addStyles.required}>*</span>
                    </label>
                    <Select
                      name="departmentId"
                      options={departmentOptions}
                      value={
                        departmentOptions.find(
                          (opt) =>
                            String(opt.value) === String(form.departmentId)
                        ) || null
                      }
                      onChange={(selected) => {
                        setForm((prev) => ({
                          ...prev,
                          departmentId: selected ? String(selected.value) : "",
                        }));
                      }}
                      placeholder="Select Department"
                      isClearable={false}
                      isSearchable={true}
                      styles={{
                        menu: (base) => ({ ...base, zIndex: 20 }),
                        control: (base) => ({
                          ...base,
                          minHeight: 38,
                          fontSize: 15,
                          border: '2px solid #e2e8f0',
                          borderRadius: '10px',
                        }),
                      }}
                    />
                  </div>

                  <div className={addStyles.formGroup}>
                    <label className={addStyles.label}>
                      Equipment ID <span className={addStyles.required}>*</span>
                    </label>
                    <input
                      name="equipmentId"
                      value={form.equipmentId}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                      placeholder="Enter equipment ID"
                    />
                  </div>

                  <div className={addStyles.formGroup}>
                    <label className={addStyles.label}>
                      Computer <span className={addStyles.required}>*</span>
                    </label>
                    <input
                      name="computer"
                      value={form.computer}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                      placeholder="Enter computer name"
                    />
                  </div>

                  <div className={addStyles.formGroup}>
                    <label className={addStyles.label}>
                      Plant <span className={addStyles.required}>*</span>
                    </label>
                    <input
                      name="plant"
                      value={form.plant}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                      placeholder="Enter plant name"
                    />
                  </div>

                  <div className={addStyles.formGroup}>
                    <label className={addStyles.label}>
                      Status <span className={addStyles.required}>*</span>
                    </label>
                    <select
                      className={addStyles.select}
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={addStyles.formFooter}>
                <button type="submit" className={addStyles.saveBtn}>
                  Save
                </button>
                <button
                  type="button"
                  className={addStyles.cancelBtn}
                  onClick={() =>
                    navigate("/application-masters", {
                      state: { activeTab: "application" },
                    })
                  }
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

export default AddApplicationMaster;