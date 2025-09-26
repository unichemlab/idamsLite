import React, { useState } from "react";
import Select from "react-select";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import addStyles from "./AddApplicationMaster.module.css";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import { sidebarConfig } from "../../components/Common/sidebarConfig";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useApplications } from "../../context/ApplicationsContext";
import { usePlantContext } from "../PlantMaster/PlantContext";

import { FaLock, FaUnlock } from "react-icons/fa";

const AddApplicationFormPage: React.FC = () => {
  const { plants } = usePlantContext();
  const plantOptions = Array.isArray(plants)
    ? plants.map((plant) => ({
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
  const { user } = useAuth();
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
    fetch("http://localhost:4000/api/roles")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRoles(
            data.map((r: any) => ({ id: String(r.id), name: r.role_name }))
          );
        }
      })
      .catch(() => setRoles([]));
  }, []);

  const filteredSidebarConfig = sidebarConfig;
  const location = useLocation();
  const activeTab = location.state?.activeTab || "application";
  const handleSidebarNav = (key: string) => {
    navigate("/superadmin", { state: { activeTab: key } });
  };

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
        updated.display_name = `${
          name === "application_hmi_name" ? value : updated.application_hmi_name
        } | ${
          name === "application_hmi_version"
            ? value
            : updated.application_hmi_version
        } | ${
          name === "equipment_instrument_id"
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

  const handleConfirm = async (data: Record<string, string>) => {
    if (data.username === username && data.password) {
      try {
        let newTransactionId = "APP0000001";
        if (applications && applications.length > 0) {
          const maxNum = applications
            .map((a) => {
              const match = String(a.transaction_id || "").match(/APP(\d+)/);
              return match ? parseInt(match[1], 10) : 0;
            })
            .reduce((a, b) => Math.max(a, b), 0);
          newTransactionId = `APP${String(maxNum + 1).padStart(7, "0")}`;
        }
        const payload = {
          ...form,
          transaction_id: newTransactionId,
          role_id: Array.isArray(form.role_id)
            ? form.role_id.join(",")
            : form.role_id,
          plant_location_id: form.plant_location_id
            ? Number(form.plant_location_id)
            : null,
          department_id: form.department_id ? Number(form.department_id) : null,
          system_inventory_id: form.system_inventory_id
            ? Number(form.system_inventory_id)
            : null,
          role_lock: true, // Always set role_lock to true regardless of toggle
        };
        const res = await fetch("http://localhost:4000/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error("Failed to add application: " + errorText);
        }
        const newApp = await res.json();
        // Map role_id to role_names for immediate display
        const roleIdArr = String(newApp.role_id || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        const role_names = roleIdArr.map(
          (id) => roles.find((r) => r.id === id)?.name || id
        );
        setApplications([...(applications || []), { ...newApp, role_names }]);
        setShowModal(false);
        navigate("/superadmin", { state: { activeTab: "application" } });
      } catch (err) {
        alert(
          "Failed to add application. Please try again.\n" +
            (err instanceof Error ? err.message : "")
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
      <div className={superAdminStyles["main-container"]}>
        {/* Sidebar */}
        <aside className={superAdminStyles.sidebar}>
          <div className={superAdminStyles["sidebar-header"]}>
            <img
              src={require("../../assets/login_headTitle2.png")}
              alt="Company logo"
              style={{ width: 250, height: 35 }}
            />
            <br />
            <span>Unichem Laboratories</span>
          </div>
          <nav>
            <div className={superAdminStyles["sidebar-group"]}>OVERVIEW</div>
            {filteredSidebarConfig.map((item) => (
              <button
                key={item.key}
                className={`${superAdminStyles["nav-button"]} ${
                  activeTab === item.key ? superAdminStyles.active : ""
                }`}
                onClick={() => handleSidebarNav(item.key)}
                style={activeTab === item.key ? { fontWeight: 700 } : {}}
              >
                {item.icon} {item.label}
              </button>
            ))}
            <div className={superAdminStyles["sidebar-footer"]}>
              <div className={superAdminStyles["admin-info"]}>
                <div className={superAdminStyles.avatar}>A</div>
              </div>
              <button
                className={superAdminStyles["logout-button"]}
                onClick={() => {
                  localStorage.removeItem("role");
                  localStorage.removeItem("username");
                  localStorage.removeItem("superadmin_activeTab");
                  navigate("/");
                }}
              >
                Logout
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className={superAdminStyles["main-content"]}>
          {/* Header */}
          <header className={superAdminStyles["main-header"]}>
            <h2 className={superAdminStyles["header-title"]}>
              Application Master
            </h2>
            <div className={superAdminStyles["header-icons"]}></div>
          </header>

          {/* Breadcrumb */}
          <div
            style={{
              background: "#eef4ff",
              padding: "12px 24px",
              fontSize: "1.05rem",
              color: "#2d3748",
              fontWeight: 500,
              borderRadius: "0 0 12px 12px",
              marginBottom: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                color: "#0b63ce",
                cursor: "pointer",
                opacity: 0.7,
                transition: "color 0.2s",
              }}
              onClick={() =>
                navigate("/superadmin", {
                  state: { activeTab: "application" },
                })
              }
              onMouseOver={(e) => (e.currentTarget.style.color = "#084a9e")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#0b63ce")}
              tabIndex={0}
              role="button"
              aria-label="Go to Application Master table"
            >
              Application Master
            </span>
            <span>&gt;</span>
            <span style={{ color: "#2d3748" }}>Add Application</span>
          </div>

          {/* Container for Add Form */}
          <div className={addStyles.container} style={{ marginTop: 32 }}>
            <form
              className={addStyles.form}
              onSubmit={handleSubmit}
              style={{ width: "100%" }}
            >
              <div className={addStyles.scrollFormContainer}>
                <div className={addStyles.rowFields}>
                  {/* Plant Location */}
                  <div className={addStyles.formGroup}>
                    <label>
                      Plant Location <span style={{ color: "red" }}>*</span>
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
                        }),
                      }}
                    />
                  </div>
                  {/* Department */}
                  <div className={addStyles.formGroup}>
                    <label>
                      Department <span style={{ color: "red" }}>*</span>
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
                        }),
                      }}
                    />
                  </div>
                  {/* Application/HMI Name */}
                  <div className={addStyles.formGroup}>
                    <label>
                      Application/HMI Name{" "}
                      <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      className={addStyles.input}
                      name="application_hmi_name"
                      value={form.application_hmi_name}
                      onChange={handleChange}
                      required
                      placeholder="Enter Application/HMI Name"
                    />
                  </div>
                  {/* Application/HMI Version */}
                  <div className={addStyles.formGroup}>
                    <label>
                      Application/HMI Version{" "}
                      <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      className={addStyles.input}
                      name="application_hmi_version"
                      value={form.application_hmi_version}
                      onChange={handleChange}
                      required
                      placeholder="Enter Application/HMI Version"
                    />
                  </div>
                  {/* Equipment/Instrument ID */}
                  <div className={addStyles.formGroup}>
                    <label>
                      Equipment/Instrument ID{" "}
                      <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      className={addStyles.input}
                      name="equipment_instrument_id"
                      value={form.equipment_instrument_id}
                      onChange={handleChange}
                      required
                      placeholder="Enter Equipment/Instrument ID"
                    />
                  </div>
                  {/* Application/HMI Type */}
                  <div className={addStyles.formGroup}>
                    <label>
                      Application/HMI Type{" "}
                      <span style={{ color: "red" }}>*</span>
                    </label>
                    <select
                      className={addStyles.select}
                      name="application_hmi_type"
                      value={form.application_hmi_type}
                      onChange={handleChange}
                      required
                    >
                      <option value="Application">Application</option>
                      <option value="HMI">HMI</option>
                    </select>
                  </div>
                  {/* System Name */}
                  <div className={addStyles.formGroup}>
                    <label>
                      System Name <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      className={addStyles.input}
                      name="system_name"
                      value={form.system_name}
                      onChange={handleChange}
                      required
                      placeholder="Enter System Name"
                    />
                  </div>
                  {/* System Inventory ID */}
                  <div className={addStyles.formGroup}>
                    <label>System Inventory ID</label>
                    <input
                      className={addStyles.input}
                      name="system_inventory_id"
                      value={form.system_inventory_id}
                      onChange={handleChange}
                      placeholder="Enter System Inventory ID"
                      type="number"
                    />
                  </div>
                </div>
                {/* Roles with Role Lock toggle inside label */}
                <div className={addStyles.rowFields}>
                  <div
                    className={addStyles.formGroup}
                    style={{ maxWidth: 400 }}
                  >
                    <label
                      htmlFor="role_id"
                      style={{
                        fontWeight: 600,
                        fontSize: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      Roles <span style={{ color: "red" }}>*</span>
                      {/* Role Lock Toggle */}
                      <span style={{ marginLeft: 10 }}>
                        <span
                          className={addStyles.roleLockToggle}
                          onClick={() => setRoleLocked((prev) => !prev)}
                          tabIndex={0}
                          aria-label="Role Lock Toggle"
                        >
                          <span
                            className={addStyles.roleLockTrack}
                            style={{
                              background: roleLocked ? "#1569B0" : "#c4c4c4",
                            }}
                          >
                            <span
                              className={addStyles.roleLockLabel}
                              style={{
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: 14,
                                marginLeft: 12,
                                marginRight: 6,
                                width: 32,
                                textAlign: "center",
                                letterSpacing: 1,
                              }}
                            >
                              {roleLocked ? "Lock" : "Unlock"}
                            </span>
                            <span
                              className={addStyles.roleLockCircle}
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
                        }),
                      }}
                      isDisabled={roleLocked}
                    />
                  </div>
                  <div
                    className={addStyles.formGroup}
                    style={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 10,
                      margin: 0,
                      minWidth: 200,
                    }}
                  >
                    <label
                      htmlFor="status"
                      style={{
                        marginBottom: 0,
                        minWidth: 70,
                        fontWeight: 500,
                        marginRight: 8,
                      }}
                    >
                      Status <span style={{ color: "red" }}>*</span>
                    </label>
                    <select
                      id="status"
                      className={addStyles.select}
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      required
                      style={{ minWidth: 120 }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
                {/* Multiple Role Access and Status aligned in a row */}
                <div
                  className={addStyles.rowFields}
                  style={{ alignItems: "center", marginTop: 8 }}
                >
                  <div
                    className={addStyles.formGroup}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      margin: 0,
                      minWidth: 250,
                    }}
                  >
                    <label
                      htmlFor="multiple_role_access"
                      style={{
                        marginBottom: 0,
                        minWidth: 170,
                        fontWeight: 500,
                        marginRight: 8,
                      }}
                    >
                      Multiple Role Access (Yes/No)
                    </label>
                    <input
                      id="multiple_role_access"
                      type="checkbox"
                      name="multiple_role_access"
                      checked={form.multiple_role_access}
                      onChange={handleChange}
                      style={{ width: 18, height: 18, marginLeft: 0 }}
                    />
                  </div>
                </div>
                <div className={addStyles.buttonRow}>
                  <button type="submit" className={addStyles.saveBtn}>
                    Save
                  </button>
                  <button
                    type="button"
                    className={addStyles.cancelBtn}
                    onClick={() =>
                      navigate("/superadmin", {
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
        </main>
      </div>
    </React.Fragment>
  );
};

export default AddApplicationFormPage;
