import React, { useState, useEffect } from "react";
import { API_BASE } from "../../utils/api";
import Select from "react-select";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/AddPlantMaster.module.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useApplications } from "../../context/ApplicationsContext";
import { usePlantContext } from "../Plant/PlantContext";
import { FaLock, FaUnlock } from "react-icons/fa";
import { sortByString } from "../../utils/sortHelpers";

const AddApplicationFormPage: React.FC = () => {
  const token = localStorage.getItem("token");
  const { user } = useAuth();
  const { plants } = usePlantContext();
  const [inventoryOptions, setInventoryOptions] = useState<any[]>([]);
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

        // 🔥 Normal permitted plants
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
    require("..//DepartmentTable/DepartmentContext").useDepartmentContext();
  const departmentOptions = Array.isArray(departments)
    ? departments.map((dept) => ({
      value: String(dept.id),
      label: dept.department_name || dept.name || String(dept.id),
    }))
    : [];

  const [roleLocked, setRoleLocked] = useState(false);
  const generateDisplayName = (data: FormType) => {
    return `${data.application_hmi_name || ""} | ${data.application_hmi_version || ""} | ${data.equipment_instrument_id || ""}`;
  };

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
            sortByString(data.map((r: any) => ({
              id: String(r.id),
              name: r.role_name,
            })), "name", "asc")
          );
        }
      })
      .catch((err) => {
        console.error("Role fetch failed:", err);
        setRoles([]);
      });
  }, [token]);


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      // Auto update display_name if relevant field changes
      if (
        ["application_hmi_name", "application_hmi_version", "equipment_instrument_id"].includes(name)
      ) {
        updated.display_name = generateDisplayName(updated);
      }

      return updated;
    });
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/systems/list`)
      .then(res => res.json())
      .then(data => {
        const options = data.map((row: any) => ({
          value: row.equipment_instrument_id,
          label: `${row.equipment_instrument_id} ( ${row.host_name})`,
          hostname: row.host_name,
          system_inventory_id: row.id
        }));
        setInventoryOptions(sortByString(options, "equipment_instrument_id", "asc"));
      })
      .catch(err => {
        console.error("Failed to load inventory list", err);
      });
  }, []);

  // In handleSubmit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Validate roles are selected
    if (!form.role_id || form.role_id.length === 0) {
      alert("Please select at least one role before saving.");
      return;
    }

    setShowModal(true);
  };

  // Role Lock Toggle
  const handleRoleLockToggle = () => {
    if (!roleLocked) {
      // ✅ Validate roles before locking
      if (!form.role_id || form.role_id.length === 0) {
        alert("Please select at least one role before locking.");
        return;
      }
    }
    setRoleLocked(!roleLocked);
  };

  const handleConfirm = async (data: Record<string, string>) => {
    try {
      const payload = {
        ...form,
        role_id: form.role_id,
        username: data.username,
        password: data.password,
      };

      const res = await fetch(`${API_BASE}/api/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add application");
      }

      const result = await res.json();
      setShowModal(false);

      if (result.approvalId) {
        alert(
          `Application creation requires approval.\nApproval ID: ${result.approvalId}\n\nThe application will be added after approval.`
        );
      } else {
        alert("Application created successfully!");
        setApplications([...applications, result]);
      }

      navigate("/application-masters", { state: { activeTab: "application" } });
    } catch (err: any) {
      console.error("Error adding application:", err);
      alert(`Error: ${err.message || "Failed to add application"}`);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  return (
    <React.Fragment>
      {showModal && (
        <ConfirmLoginModal
          username={username}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
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
                navigate("/application-masters", {
                  state: { activeTab: "application" },
                })
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
              {/* 🔥 FIXED: Changed overflow to visible */}
              <div className={styles.scrollFormContainer} style={{ overflow: 'visible' }}>
                {/* Row 1 - 3 Columns */}
                <div className={styles.rowFields}>
                  <div className={styles.formGroupFloating}>
                    <Select
                      id="plant_location_id"
                      isSearchable
                      required
                      name="plant_location_id"
                      options={plantOptions}
                      value={plantOptions.find(
                        (opt) => opt.value === form.plant_location_id
                      )}
                      onChange={(selected) => {
                        setForm((prev) => ({
                          ...prev,
                          plant_location_id: selected?.value || "",
                        }));
                      }}
                      placeholder=""
                      classNamePrefix="floatSelect"
                      styles={{
                        // 🔥 FIXED: Increased z-index to 999
                        menu: (base) => ({ 
                          ...base, 
                          zIndex: 999 
                        }),
                        menuPortal: (base) => ({ 
                          ...base, 
                          zIndex: 9999 
                        }),
                        control: (base, state) => ({
                          ...base,
                          minHeight: 44,
                          fontSize: 14,
                          borderRadius: 10,
                          paddingTop: 12,
                          border: state.isFocused
                            ? "2px solid #1569B0"
                            : "2px solid #e2e8f0",
                          boxShadow: "none",
                        }),
                      }}
                      // 🔥 FIXED: Added menuPortalTarget
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                    <label
                      className={styles.floatingLabel}
                      htmlFor="plant_location_id"
                    >
                      Plant Location <span className={styles.required}>*</span>
                    </label>
                  </div>

                  <div className={styles.formGroupFloating}>
                    <Select
                      id="department_id"
                      isSearchable
                      required
                      name="department_id"
                      options={departmentOptions}
                      value={departmentOptions.find(
                        (opt) => opt.value === form.department_id
                      )}
                      onChange={(selected) => {
                        setForm((prev) => ({
                          ...prev,
                          department_id: selected?.value || "",
                        }));
                      }}
                      placeholder=""
                      classNamePrefix="floatSelect"
                      styles={{
                        menu: (base) => ({ 
                          ...base, 
                          zIndex: 999 
                        }),
                        menuPortal: (base) => ({ 
                          ...base, 
                          zIndex: 9999 
                        }),
                        control: (base, state) => ({
                          ...base,
                          minHeight: 44,
                          fontSize: 14,
                          borderRadius: 10,
                          paddingTop: 12,
                          border: state.isFocused
                            ? "2px solid #1569B0"
                            : "2px solid #e2e8f0",
                          boxShadow: "none",
                        }),
                      }}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                    <label
                      className={styles.floatingLabel}
                      htmlFor="department_id"
                    >
                      Department <span className={styles.required}>*</span>
                    </label>
                  </div>

                  <div className={styles.formGroupFloating}>
                    <input
                      id="application_hmi_name"
                      className={styles.input}
                      name="application_hmi_name"
                      value={form.application_hmi_name}
                      onChange={handleChange}
                      required
                      placeholder="Enter Application Name"
                    />
                    <label className={styles.floatingLabel}>
                      Application/HMI Name <span className={styles.required}>*</span>
                    </label>
                  </div>
                </div>

                {/* Row 2 - 3 Columns */}
                <div className={styles.rowFields}>
                  <div className={styles.formGroupFloating}>
                    <input
                      id="application_hmi_version"
                      className={styles.input}
                      name="application_hmi_version"
                      value={form.application_hmi_version}
                      onChange={handleChange}
                      required
                      placeholder="Enter Version"
                    />
                    <label className={styles.floatingLabel}>
                      Application/HMI Version <span className={styles.required}>*</span>
                    </label>
                  </div>

                  <div className={styles.formGroupFloating}>
                    <Select
                      id="application_hmi_type"
                      name="application_hmi_type"
                      options={[
                        { value: "Application", label: "Application" },
                        { value: "HMI", label: "HMI" },
                      ]}
                      value={{
                        value: form.application_hmi_type,
                        label: form.application_hmi_type,
                      }}
                      onChange={(selected) => {
                        setForm((prev) => ({
                          ...prev,
                          application_hmi_type: selected?.value || "Application",
                        }));
                      }}
                      placeholder=""
                      classNamePrefix="floatSelect"
                      styles={{
                        menu: (base) => ({ 
                          ...base, 
                          zIndex: 999 
                        }),
                        menuPortal: (base) => ({ 
                          ...base, 
                          zIndex: 9999 
                        }),
                        control: (base, state) => ({
                          ...base,
                          minHeight: 44,
                          fontSize: 14,
                          borderRadius: 10,
                          paddingTop: 12,
                          border: state.isFocused
                            ? "2px solid #1569B0"
                            : "2px solid #e2e8f0",
                          boxShadow: "none",
                        }),
                      }}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                    <label className={styles.floatingLabel}>
                      Application/HMI Type <span className={styles.required}>*</span>
                    </label>
                  </div>

                  <div className={styles.formGroupFloating}>
                    {form.application_hmi_type === "Application" ? (
                      <Select
                        id="equipment_instrument_id"
                        isSearchable
                        required
                        name="equipment_instrument_id"
                        options={inventoryOptions}
                        value={inventoryOptions.find(
                          (opt) => opt.value === form.equipment_instrument_id
                        )}
                        onChange={(selected: any) => {
                          setForm((prev) => {
                            const updated = {
                              ...prev,
                              equipment_instrument_id: selected?.value || "",
                              system_name: selected?.hostname || "",
                              system_inventory_id: selected?.system_inventory_id || "",
                            };
                            updated.display_name = generateDisplayName(updated);
                            return updated;
                          });
                        }}
                        placeholder="Search Equipment"
                        classNamePrefix="floatSelect"
                        styles={{
                          menu: (base) => ({ 
                            ...base, 
                            zIndex: 999 
                          }),
                          menuPortal: (base) => ({ 
                            ...base, 
                            zIndex: 9999 
                          }),
                          control: (base, state) => ({
                            ...base,
                            minHeight: 44,
                            fontSize: 14,
                            borderRadius: 10,
                            paddingTop: 12,
                            border: state.isFocused
                              ? "2px solid #1569B0"
                              : "2px solid #e2e8f0",
                            boxShadow: "none",
                          }),
                        }}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />
                    ) : (
                      <input
                        id="equipment_instrument_id"
                        className={styles.input}
                        name="equipment_instrument_id"
                        value={form.equipment_instrument_id}
                        onChange={handleChange}
                        required
                        placeholder="Enter Equipment ID"
                      />
                    )}

                    <label className={styles.floatingLabel}>
                      Equipment / Instrument ID <span className={styles.required}>*</span>
                    </label>
                  </div>
                </div>

                {/* Row 3 - 3 Columns */}
                <div className={styles.rowFields}>
                  {form.application_hmi_type === "Application" && (
                    <>
                      <div className={styles.formGroupFloating}>
                        <input
                          className={styles.input}
                          value={form.system_name}
                          readOnly
                          placeholder=""
                        />
                        <label className={styles.floatingLabel}>
                          System Name (Hostname)
                        </label>
                      </div>

                      <div className={styles.formGroupFloating}>
                        <input
                          className={styles.input}
                          value={form.system_inventory_id}
                          readOnly
                          placeholder=""
                        />
                        <label className={styles.floatingLabel}>
                          System Inventory ID
                        </label>
                      </div>
                    </>
                  )}

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
                  <div className={`${styles.formGroupFloating} ${form.role_id.length > 0 ? styles.filled : ""}`}>
                    <Select
                      id="role_id"
                      isMulti
                      isSearchable
                      required
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
                      placeholder=""
                      isDisabled={roleLocked}
                      classNamePrefix="floatSelect"
                      styles={{
                        // 🔥 FIXED: Increased z-index significantly
                        menu: (base) => ({ 
                          ...base, 
                          zIndex: 999 
                        }),
                        menuPortal: (base) => ({ 
                          ...base, 
                          zIndex: 9999 
                        }),
                        control: (base, state) => ({
                          ...base,
                          minHeight: 44,
                          fontSize: 14,
                          borderRadius: 10,
                          paddingTop: 12,
                          border: state.isFocused
                            ? "2px solid #1569B0"
                            : "2px solid #e2e8f0",
                          boxShadow: "none",
                        }),
                      }}
                      // 🔥 FIXED: Added these crucial props
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                    <label
                      className={styles.floatingLabel}
                      htmlFor="role_id"
                      style={{
                        fontWeight: 500,
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      Roles <span className={styles.required}>*</span>
                      {/* Role Lock Toggle */}
                      <span style={{ marginLeft: 65 }}>
                        <span
                          className={styles.roleLockToggle}
                          onClick={() => { handleRoleLockToggle(); }}
                          tabIndex={0}
                          aria-label="Role Lock Toggle"
                        >
                          <span
                            className={styles.roleLockTrack}
                            style={{
                              color: roleLocked ? "#f47c20" : "#1569B0",
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
                                <FaLock size={14} color="#f47c20" />
                              ) : (
                                <FaUnlock size={14} color="#1569B0" />
                              )}
                            </span>
                          </span>
                        </span>
                      </span>
                    </label>
                  </div>

                  <div
                    className={`${styles.formGroupFloating} ${form.multiple_role_access ? styles.filled : ""
                      }`}
                  >
                    <label
                      htmlFor="multiple_role_access"
                      className={styles.floatingLabel}
                    >
                      Multiple Role Access
                    </label>

                    <div className={styles.checkboxWrapper}>
                      <input
                        id="multiple_role_access"
                        type="checkbox"
                        name="multiple_role_access"
                        checked={form.multiple_role_access}
                        onChange={handleChange}
                        className={styles.checkbox}
                      />

                      <span className={styles.checkboxText}>
                        {form.multiple_role_access ? "Yes" : "No"}
                      </span>
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