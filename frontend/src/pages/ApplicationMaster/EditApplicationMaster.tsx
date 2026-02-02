import React, { useState } from "react";
import { API_BASE } from "../../utils/api";
import { useLocation, useNavigate } from "react-router-dom";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import AppHeader from "../../components/Common/AppHeader";
import addStyles from "../Plant/AddPlantMaster.module.css";
import Select from "react-select";
import { usePlantContext } from "../Plant/PlantContext";
import { useDepartmentContext } from "..//DepartmentTable/DepartmentContext";
import { useAuth } from "../../context/AuthContext";

const EditApplicationMaster: React.FC = () => {
  const { user } = useAuth();
  const username = user?.username || "";
  const [showModal, setShowModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { applicationData } = location.state || {};
  type FormState = {
    name: string;
    version: string;
    equipmentId: string;
    computer: string;
    plant_location_id: string;
    department_id: string;
    status: string;
    role_lock: boolean;
  };

  const [form, setForm] = useState<FormState>(
    applicationData
      ? { ...applicationData, role_lock: applicationData.role_lock ?? false }
      : {
          name: "",
          version: "",
          equipmentId: "",
          computer: "",
          plant_location_id: "",
          department_id: "",
          status: "ACTIVE",
          role_lock: false,
        }
  );

  const { plants } = usePlantContext();
  const plantOptions = Array.isArray(plants)
    ? plants.map((plant) => ({
        value: String(plant.id),
        label: plant.plant_name || plant.name || String(plant.id),
      }))
    : [];
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
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleRoleLockToggle = () => {
    if (form.role_lock) {
      setShowUnlockModal(true);
    } else {
      setForm((prev) => ({ ...prev, role_lock: true }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  const handleUnlockConfirm = (data: Record<string, string>) => {
    if (data.username === username && data.password) {
      setForm((prev) => ({ ...prev, role_lock: false }));
      setShowUnlockModal(false);
    } else {
      alert("Invalid credentials. Please try again.");
    }
  };

  const handleConfirm = (data: Record<string, string>) => {
  if (data.username === username && data.password) {
    const payload = { ...form };

    const token = localStorage.getItem("token"); // 👈 REQUIRED

    fetch(`${API_BASE}/api/applications/${applicationData?.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // 👈 REQUIRED
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update application");
        return res.json();
      })
      .then(() => {
        setShowModal(false);
        navigate("/application-masters", {
          state: { activeTab: "application" },
        });
      })
      .catch((err) => {
        alert("Failed to update application. " + err.message);
      });
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
      {showUnlockModal && (
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
          onConfirm={handleUnlockConfirm}
          onCancel={() => setShowUnlockModal(false)}
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
            <span className={addStyles.breadcrumbCurrent}>Edit Application</span>
          </div>

          {/* Form Card */}
          <div className={addStyles.formCard}>
            <div className={addStyles.formHeader}>
              <h2>Edit Application</h2>
              <p>Update application details in the system123</p>
            </div>

            <form className={addStyles.form} onSubmit={handleSubmit}>
              <div className={addStyles.formBody}>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label className={addStyles.label}>
                      Plant Location <span className={addStyles.required}>*</span>
                    </label>
                    <Select
                      name="plant_location_id"
                      options={plantOptions}
                      value={
                        plantOptions.find(
                          (opt) => opt.value === form.plant_location_id
                        ) || null
                      }
                      onChange={(selected) =>
                        setForm((prev) => ({
                          ...prev,
                          plant_location_id: selected ? selected.value : "",
                        }))
                      }
                      placeholder="Select Plant Location"
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
                      Department <span className={addStyles.required}>*</span>
                    </label>
                    <Select
                      name="department_id"
                      options={departmentOptions}
                      value={
                        departmentOptions.find(
                          (opt) => opt.value === form.department_id
                        ) || null
                      }
                      onChange={(selected) =>
                        setForm((prev) => ({
                          ...prev,
                          department_id: selected ? selected.value : "",
                        }))
                      }
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
                      Application/HMI Name <span className={addStyles.required}>*</span>
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
                      System Name <span className={addStyles.required}>*</span>
                    </label>
                    <input
                      name="computer"
                      value={form.computer}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                      placeholder="Enter system name"
                    />
                  </div>

                  <div className={addStyles.formGroup}>
                    <label className={addStyles.label}>
                      System Inventory ID
                    </label>
                    <input
                      name="equipmentId"
                      value={form.equipmentId}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                      placeholder="Enter inventory ID"
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

                {/* Role Lock/Unlock Toggle */}
                <div
                  style={{
                    margin: "24px 0 16px 0",
                    display: "flex",
                    alignItems: "center",
                    userSelect: "none",
                  }}
                >
                  <span style={{ fontWeight: 600, marginRight: 12, fontSize: 14 }}>
                    Role Lock
                  </span>
                  <div
                    onClick={handleRoleLockToggle}
                    className={addStyles.roleLockToggle}
                    tabIndex={0}
                    aria-label="Role Lock Toggle"
                  >
                    <span
                      className={addStyles.roleLockTrack}
                      style={{
                        background: form.role_lock ? "#1569B0" : "#c4c4c4",
                      }}
                    >
                      <span className={addStyles.roleLockLabel}>
                        {form.role_lock ? "Lock" : "Unlock"}
                      </span>
                      <span
                        className={addStyles.roleLockCircle}
                        style={{
                          left: form.role_lock ? 52 : 4,
                        }}
                      />
                    </span>
                  </div>
                  <span style={{ color: "#64748b", fontSize: 13, marginLeft: 12 }}>
                    {form.role_lock
                      ? "Roles are locked for this application"
                      : "Roles can be edited for this application"}
                  </span>
                </div>
              </div>

              <div className={addStyles.formFooter}>
                <button type="submit" className={addStyles.saveBtn}>
                  ✓ Update Application
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

export default EditApplicationMaster;