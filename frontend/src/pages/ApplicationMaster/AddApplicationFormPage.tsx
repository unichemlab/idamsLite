import React, { useState } from "react";
import { API_BASE } from "../../utils/api";
import Select from "react-select";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/AddPlantMaster.module.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useApplications } from "../../context/ApplicationsContext";
import { usePlantContext } from "../PlantMaster/PlantContext";
import { FaLock, FaUnlock } from "react-icons/fa";

const AddApplicationFormPage: React.FC = () => {
  const token = localStorage.getItem("token");
  const { user } = useAuth();
  const { plants } = usePlantContext();
  const plantOptions = Array.isArray(plants)
    ? plants
      .filter((plant: any) => {
        // 🔥 Super Admin → all plants
        if (
          user?.role_id === 1 ||
          (Array.isArray(user?.role_id) && user?.role_id.includes(1)) ||
          user?.isSuperAdmin
        ) {
          return true;
        }

        const plantId = Number(plant.id);

        // 🔒 IT Bin access
        // if (user?.isITBin && Array.isArray(user?.itPlantIds)) {
        //   return user.itPlantIds.includes(plantId);
        // }

        // 🔒 Normal permitted plants
        if (Array.isArray(user?.permittedPlantIds)) {
          return user?.permittedPlantIds.includes(plantId);
        }

        return false;
      })
      .map((plant: any) => ({
        value: String(plant.id),
        label: plant.plant_name || plant.name || String(plant.id),
      }))
    : [];

  const { departments } =
    require("../DepartmentMaster/DepartmentContext").useDepartmentContext();
  const departmentOptions = Array.isArray(departments)
    ? departments.map((dept) => ({
      value: String(dept.id),
      label: dept.department_name || dept.name || String(dept.id),
    }))
    : [];

  const [roleLocked, setRoleLocked] = useState(false);

  const username = user?.username || "";
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const { setApplications, applications } = useApplications();

  type FormType = {
    transaction_id: string;
    plant_location_id: string;
    department_id: string;
    application_hmi_name: string;
    application_hmi_version: string;
    equipment_instrument_id: string;
    application_hmi_type: string;
    display_name: string;
    role_id: string[];
    system_name: string;
    system_inventory_id: string;
    multiple_role_access: boolean;
    status: string;
  };

  const [form, setForm] = useState<FormType>({
    transaction_id: "",
    plant_location_id: "",
    department_id: "",
    application_hmi_name: "",
    application_hmi_version: "",
    equipment_instrument_id: "",
    application_hmi_type: "Application",
    display_name: "",
    role_id: [],
    system_name: "",
    system_inventory_id: "",
    multiple_role_access: false,
    status: "ACTIVE",
  });

  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  React.useEffect(() => {
    fetch(`${API_BASE}/api/roles`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch roles");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setRoles(
            data.map((r: any) => ({
              id: String(r.id),
              name: r.role_name,
            }))
          );
        }
      })
      .catch((err) => {
        console.error("Role fetch failed:", err);
        setRoles([]);
      });
  }, [token]);


  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, value, type } = target;
    const checked =
      type === "checkbox" ? (target as HTMLInputElement).checked : undefined;
    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      // Auto-generate display_name from three fields
      if (
        [
          "application_hmi_name",
          "application_hmi_version",
          "equipment_instrument_id",
        ].includes(name)
      ) {
        updated.display_name = `${name === "application_hmi_name" ? value : updated.application_hmi_name
          } | ${name === "application_hmi_version"
            ? value
            : updated.application_hmi_version
          } | ${name === "equipment_instrument_id"
            ? value
            : updated.equipment_instrument_id
          }`;
      }
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  // AddApplicationFormPage.tsx - Updated handleConfirm function

  const handleConfirm = async (data: Record<string, string>) => {
    if (data.username === username && data.password) {
      try {
        // 🔥 Don't generate transaction_id - let backend handle it
        const payload = {
          plant_location_id: form.plant_location_id
            ? Number(form.plant_location_id)
            : null,
          department_id: form.department_id ? Number(form.department_id) : null,
          application_hmi_name: form.application_hmi_name,
          application_hmi_version: form.application_hmi_version,
          equipment_instrument_id: form.equipment_instrument_id,
          application_hmi_type: form.application_hmi_type,
          display_name: form.display_name,
          role_id: Array.isArray(form.role_id)
            ? form.role_id.join(",")
            : form.role_id,
          system_name: form.system_name,
          system_inventory_id: form.system_inventory_id
            ? Number(form.system_inventory_id)
            : null,
          multiple_role_access: form.multiple_role_access,
          status: form.status,
          role_lock: roleLocked,
        };

        console.log("📤 Sending payload:", payload);

        const res = await fetch(`${API_BASE}/api/applications`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Unknown error" }));

          // Handle specific error codes
          if (errorData.code === "DUPLICATE_TRANSACTION_ID") {
            throw new Error("Duplicate transaction ID detected. Please try again.");
          }

          throw new Error(errorData.error || errorData.message || "Failed to add application");
        }

        const newApp = await res.json();

        // Handle pending approval response
        if (newApp.status === "PENDING_APPROVAL") {
          alert(`Application submitted for approval!\nApproval ID: ${newApp.approvalId}`);
          navigate("/application-masters", { state: { activeTab: "application" } });
          return;
        }

        // Handle direct creation (no approval needed)
        const roleIdArr = String(newApp.role_id || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        const role_names = roleIdArr.map(
          (id) => roles.find((r) => r.id === id)?.name || id
        );

        setApplications([...(applications || []), { ...newApp, role_names }]);
        setShowModal(false);
        navigate("/application-masters", { state: { activeTab: "application" } });
      } catch (err) {
        console.error("❌ Error adding application:", err);
        alert(
          "Failed to add application. Please try again.\n" +
          (err instanceof Error ? err.message : "Unknown error")
        );
      }
    } else {
      alert("Invalid credentials. Please try again.");
    }
  };

  return (
    <React.Fragment>
      {showModal && (
        <ConfirmLoginModal
          username={username}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
        />
      )}

      <div className={styles.pageWrapper}>
        <AppHeader title="Application Master Management" />

        <div className={styles.contentArea}>
          {/* Breadcrumb */}
          <div className={styles.breadcrumb}>
            <span
              className={styles.breadcrumbLink}
              onClick={() =>
                navigate("/application-masters", { state: { activeTab: "application" } })
              }
            >
              Application Master
            </span>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbCurrent}>Add Application</span>
          </div>

          {/* Form Card */}
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Add New Application Form</h2>
              <p>Enter application details to add a new record to the system</p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.scrollFormContainer}>
                <div className={styles.rowFields}>
                  <div
                    className={`${styles.formGroupFloating} ${form.plant_location_id ? styles.hasValue : ""
                      }`}
                  >
                    <Select
                      classNamePrefix="reactSelect"
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
                      placeholder=""
                      isSearchable
                    />

                    <label className={styles.floatingLabel}>
                      Plant Location <span className={styles.required}>*</span>
                    </label>
                  </div>


                  <div
                    className={`${styles.formGroupFloating} ${form.department_id ? styles.hasValue : ""
                      }`}
                  >
                    <Select
                      classNamePrefix="reactSelect"
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
                      placeholder=""
                      isSearchable
                    />

                    <label className={styles.floatingLabel}>
                      Department <span className={styles.required}>*</span>
                    </label>
                  </div>


                  <div className={styles.formGroupFloating}>

                    <input
                      className={styles.input}
                      name="application_hmi_name"
                      value={form.application_hmi_name}
                      onChange={handleChange}
                      required
                      placeholder=""
                    />
                    <label className={styles.floatingLabel}>
                      Application/HMI Name
                      <span className={styles.required}>*</span>
                    </label>
                  </div>
                </div>

                {/* Row 2 - 3 Columns */}
                <div className={styles.rowFields}>
                  <div className={styles.formGroupFloating}>

                    <input
                      className={styles.input}
                      name="application_hmi_version"
                      value={form.application_hmi_version}
                      onChange={handleChange}
                      required
                      placeholder=""
                    />
                    <label className={styles.floatingLabel}>
                      Application/HMI Version{" "}
                      <span className={styles.required}>*</span>
                    </label>
                  </div>

                  <div className={styles.formGroupFloating}>

                    <input
                      className={styles.input}
                      name="equipment_instrument_id"
                      value={form.equipment_instrument_id}
                      onChange={handleChange}
                      required
                      placeholder=""
                    />
                    <label className={styles.floatingLabel}>
                      Equipment/Instrument ID{" "}
                      <span className={styles.required}>*</span>
                    </label>
                  </div>

                  <div className={styles.formGroupFloating}>

                    <select
                      className={styles.select}
                      name="application_hmi_type"
                      value={form.application_hmi_type}
                      onChange={handleChange}
                      required
                    >
                      <option value="Application">Application</option>
                      <option value="HMI">HMI</option>
                    </select>
                    <label className={styles.floatingLabel}>
                      Application/HMI Type{" "}
                      <span className={styles.required}>*</span>
                    </label>
                  </div>
                </div>

                {/* Row 3 - 3 Columns */}
                <div className={styles.rowFields}>
                  <div className={styles.formGroupFloating}>

                    <input
                      className={styles.input}
                      name="system_name"
                      value={form.system_name}
                      onChange={handleChange}
                      required
                      placeholder=""
                    />
                    <label className={styles.floatingLabel}>
                      System Name (Hostname){" "}
                      <span className={styles.required}>*</span>
                    </label>
                  </div>

                  <div className={styles.formGroupFloating}>

                    <input
                      className={styles.input}
                      name="system_inventory_id"
                      value={form.system_inventory_id}
                      onChange={handleChange}
                      placeholder=""
                      type="number"
                    />
                    <label className={styles.floatingLabel}>System Inventory ID
                      <span className={styles.required}>*</span>
                    </label>
                  </div>

                  <div className={styles.formGroupFloating}>

                    <select
                      id="status"
                      className={styles.select}
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      required
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                    <label className={styles.floatingLabel}>
                      Status <span className={styles.required}>*</span>
                    </label>
                  </div>
                </div>

                {/* Row 4 - Roles and Multiple Role Access - 2 Columns */}
                <div className={styles.rowFields} style={{ gridTemplateColumns: '2fr 1fr' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Roles <span className={styles.required}>*</span>
                      {/* Role Lock Toggle */}
                      <span style={{ marginLeft: 10 }}>
                        <span
                          className={styles.roleLockToggle}
                          onClick={() => setRoleLocked((prev) => !prev)}
                          tabIndex={0}
                          aria-label="Role Lock Toggle"
                        >
                          <span
                            className={styles.roleLockTrack}
                            style={{
                              background: roleLocked ? "#1569B0" : "#c4c4c4",
                            }}
                          >
                            <span className={styles.roleLockLabel}>
                              {roleLocked ? "Lock" : "Unlock"}
                            </span>
                            <span
                              className={styles.roleLockCircle}
                              style={{
                                left: roleLocked ? 52 : 4,
                                background: "#fff",
                              }}
                            >
                              {roleLocked ? (
                                <FaLock size={14} color="#1569B0" />
                              ) : (
                                <FaUnlock size={14} color="#c4c4c4" />
                              )}
                            </span>
                          </span>
                        </span>
                      </span>
                    </label>
                    <Select
                      id="role_id"
                      isMulti
                      isSearchable
                      name="role_id"
                      options={roles.map((r) => ({
                        value: r.id,
                        label: r.name,
                      }))}
                      value={roles
                        .filter((r) => form.role_id.includes(r.id))
                        .map((r) => ({ value: r.id, label: r.name }))}
                      onChange={(selected) => {
                        setForm((prev) => ({
                          ...prev,
                          role_id: Array.isArray(selected)
                            ? selected.map((s) => s.value)
                            : [],
                        }));
                      }}
                      placeholder="Select roles..."
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
                      isDisabled={roleLocked}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Multiple Role Access
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <input
                        id="multiple_role_access"
                        type="checkbox"
                        name="multiple_role_access"
                        checked={form.multiple_role_access}
                        onChange={handleChange}
                        style={{ width: 20, height: 20, cursor: 'pointer' }}
                      />
                      <label htmlFor="multiple_role_access" style={{ cursor: 'pointer', fontSize: 14, color: '#64748b' }}>
                        {form.multiple_role_access ? 'Yes' : 'No'}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.formFotter}>
                <div
                  className={styles.buttonRow}
                  style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    gap: 24,
                    margin: 15,
                  }}
                >
                  <button type="submit" className={styles.saveBtn}>
                    Save
                  </button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() =>
                      navigate("/application-masters", {
                        state: { activeTab: "application" },
                      })
                    }
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default AddApplicationFormPage;