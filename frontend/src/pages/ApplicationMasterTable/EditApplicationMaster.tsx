import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import addStyles from "./AddApplicationMaster.module.css";
import Select from "react-select";
import { usePlantContext } from "../PlantMaster/PlantContext";
import { useDepartmentContext } from "../DepartmentMaster/DepartmentContext";
import { sidebarConfig } from "../../components/Common/sidebarConfig";

const EditApplicationMaster: React.FC = () => {
  const username = localStorage.getItem("username") || "";
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

  // Plant and Department dropdowns
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

  // Sidebar state
  const [activeTab, setActiveTab] = useState("application");
  const filteredSidebarConfig = sidebarConfig;
  const handleSidebarNav = (key: string) => {
    setActiveTab(key);
    if (key === "application") {
      navigate("/superadmin", { state: { activeTab: "application" } });
    }
  };

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

  // Handle role lock toggle
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

  // Confirm unlock modal logic
  const handleUnlockConfirm = (data: Record<string, string>) => {
    if (data.username === username && data.password) {
      setForm((prev) => ({ ...prev, role_lock: false }));
      setShowUnlockModal(false);
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
          onConfirm={(data) => {
            if (data.username === username && data.password) {
              const payload = { ...form };
              fetch(
                `http://localhost:4000/api/applications/${applicationData?.id}`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                }
              )
                .then((res) => {
                  if (!res.ok) throw new Error("Failed to update application");
                  return res.json();
                })
                .then(() => {
                  setShowModal(false);
                  navigate("/superadmin", {
                    state: { activeTab: "application" },
                  });
                })
                .catch((err) => {
                  alert("Failed to update application. " + err.message);
                });
            } else {
              alert("Invalid credentials. Please try again.");
            }
          }}
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
          </nav>
        </aside>

        {/* Main Content */}
        <main className={superAdminStyles["main-content"]}>
          <header className={superAdminStyles["main-header"]}>
            <h2 className={superAdminStyles["header-title"]}>
              Edit Application
            </h2>
            <div className={superAdminStyles["header-icons"]}></div>
          </header>

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
            <span style={{ color: "#2d3748" }}>Edit Application</span>
          </div>

          <div className={addStyles.container} style={{ marginTop: 32 }}>
            <form
              className={addStyles.form}
              onSubmit={handleSubmit}
              style={{ width: "100%" }}
            >
              <div className={addStyles.rowFields}>
                <div
                  className={addStyles.formGroup}
                  style={{ flex: 1, minWidth: 180 }}
                >
                  <label>Plant Location *</label>
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
                <div
                  className={addStyles.formGroup}
                  style={{ flex: 1, minWidth: 180 }}
                >
                  <label>Department *</label>
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
                <div
                  className={addStyles.formGroup}
                  style={{ flex: 1, minWidth: 180 }}
                >
                  <label>Application/HMI Name *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className={addStyles.input}
                  />
                </div>
                <div
                  className={addStyles.formGroup}
                  style={{ flex: 1, minWidth: 180 }}
                >
                  <label>System Name *</label>
                  <input
                    name="computer"
                    value={form.computer}
                    onChange={handleChange}
                    required
                    className={addStyles.input}
                  />
                </div>
                <div
                  className={addStyles.formGroup}
                  style={{ flex: 1, minWidth: 180 }}
                >
                  <label>System Inventory ID</label>
                  <input
                    name="equipmentId"
                    value={form.equipmentId}
                    onChange={handleChange}
                    required
                    className={addStyles.input}
                  />
                </div>
                <div
                  className={addStyles.formGroup}
                  style={{ flex: 1, minWidth: 180 }}
                >
                  <label>Status *</label>
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
              {/* Role Lock/Unlock Toggle - always visible, styled as a switch */}
              <div
                style={{
                  margin: "16px 0",
                  display: "flex",
                  alignItems: "center",
                  userSelect: "none",
                }}
              >
                <span style={{ fontWeight: 500, marginRight: 12 }}>
                  Role Lock
                </span>
                <div
                  onClick={handleRoleLockToggle}
                  style={{
                    width: 95,
                    height: 38,
                    borderRadius: 24,
                    background: form.role_lock ? "#1569B0" : "#c4c4c4",
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    position: "relative",
                    transition: "background 0.2s",
                    padding: 0,
                    marginRight: 12,
                  }}
                  tabIndex={0}
                  aria-label="Role Lock Toggle"
                >
                
                  <span
                    style={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 20,
                      marginLeft: 16,
                      width: 38,
                      textAlign: "center",
                      letterSpacing: 1,
                      transition: "margin 0.2s",
                    }}
                  >
                    {form.role_lock ? "Lock" : "Unlock"}
                  </span>
                  <div
                    style={{
                      position: "absolute",
                      right: form.role_lock ? 6 : 36,
                      left: form.role_lock ? 62 : 6,
                      top: 4,
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "#fff",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                      transition: "left 0.2s, right 0.2s",
                    }}
                  />
                </div>
                <span style={{ color: "#888", fontSize: 13 }}>
                  {form.role_lock
                    ? "Roles are locked for this application. Unlock to edit roles."
                    : "Roles can be edited for this application."}
                </span>
              </div>
              <div
                className={addStyles.buttonRow}
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  gap: 24,
                  marginTop: 24,
                }}
              >
                <button type="submit" className={addStyles.saveBtn}>
                  Update
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
            </form>
          </div>
        </main>
      </div>
    </>
  );
};

export default EditApplicationMaster;
