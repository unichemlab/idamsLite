import React, { useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import addStyles from "./AddApplicationMaster.module.css";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import { sidebarConfig } from "../../components/Common/sidebarConfig";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useApplications } from "../../context/ApplicationsContext";

const AddApplicationFormPage: React.FC = () => {
  // State for role lock toggle
  const [roleLocked, setRoleLocked] = useState(false);
  // Use user context for username (for consistency with PlantMaster)
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

  const [showRolesDropdown, setShowRolesDropdown] = useState<boolean>(false);

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

  // Roles for dropdown
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  React.useEffect(() => {
    // Fetch all roles for dropdown (use full backend URL)
    fetch("http://localhost:4000/api/roles")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRoles(
            data.map((r: any) => ({ id: String(r.id), name: r.role_name }))
          );
        }
      })
      .catch((err) => {
        setRoles([]);
        // Optionally log error
        // console.error('Failed to fetch roles:', err);
      });
  }, []);

  // Sidebar state
  const [activeTab, setActiveTab] = useState("application");
  const filteredSidebarConfig = sidebarConfig;
  const handleSidebarNav = (key: string) => {
    setActiveTab(key);
    if (key === "application") {
      navigate("/superadmin", { state: { activeTab: "application" } });
    }
    // Add more navigation as needed
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, value, type } = target;
    if (name === "role_id") {
      // Multi-select
      const options = (target as HTMLSelectElement).options;
      const selected: string[] = [];
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) selected.push(options[i].value);
      }
      setForm((prev) => ({ ...prev, role_id: selected }));
      return;
    }
    const checked =
      type === "checkbox" ? (target as HTMLInputElement).checked : undefined;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Auto-update display_name if relevant fields change
    if (
      [
        "application_hmi_name",
        "application_hmi_version",
        "equipment_instrument_id",
      ].includes(name)
    ) {
      setForm((prev) => ({
        ...prev,
        display_name: `${
          name === "application_hmi_name" ? value : prev.application_hmi_name
        } | ${
          name === "application_hmi_version"
            ? value
            : prev.application_hmi_version
        } | ${
          name === "equipment_instrument_id"
            ? value
            : prev.equipment_instrument_id
        }`,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  // Add application API call and context update
  const handleConfirm = async (data: Record<string, string>) => {
    if (data.username === username && data.password) {
      try {
        console.log("[AddApplication] Submitting form:", form);
        // POST to backend (correct port)
        const res = await fetch("http://localhost:4000/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        console.log("[AddApplication] Response status:", res.status);
        if (!res.ok) throw new Error("Failed to add application");
        const newApp = await res.json();
        console.log("[AddApplication] New app from backend:", newApp);
        // Update context
        setApplications([...(applications || []), newApp]);
        setShowModal(false);
        navigate("/superadmin", { state: { activeTab: "application" } });
      } catch (err) {
        console.error("[AddApplication] Error:", err);
        alert("Failed to add application. Please try again.");
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
                  {/* Plant Location (mandatory) */}
                  <div className={addStyles.formGroup}>
                    <label>
                      Plant Location <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      className={addStyles.input}
                      name="plant_location_id"
                      value={form.plant_location_id}
                      onChange={handleChange}
                      required
                      placeholder="Enter Plant Location ID"
                      type="number"
                    />
                  </div>
                  {/* Department (mandatory) */}
                  <div className={addStyles.formGroup}>
                    <label>
                      Department <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      className={addStyles.input}
                      name="department_id"
                      value={form.department_id}
                      onChange={handleChange}
                      required
                      placeholder="Enter Department ID"
                      type="number"
                    />
                  </div>
                  {/* Application/HMI Name (mandatory) */}
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
                  {/* Role (multi-select) */}
                  {/* Roles Multi-Select (mandatory) as custom dropdown with checkboxes */}
                  <div
                    className={addStyles.formGroup}
                    style={{
                      maxWidth: 400,
                      alignSelf: "flex-end",
                      position: "relative",
                    }}
                  >
                    <label
                      htmlFor="role_id"
                      style={{ fontWeight: 600, fontSize: 16 }}
                    >
                      Roles <span style={{ color: "red" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <div
                        style={{
                          border: "1px solid #bfc8e0",
                          borderRadius: 8,
                          background: "#fff",
                          minHeight: 38,
                          maxHeight: 44,
                          display: "flex",
                          alignItems: "center",
                          padding: "0 12px",
                          cursor: "pointer",
                          fontSize: 15,
                          overflow: "hidden",
                        }}
                        tabIndex={0}
                        onClick={() => setShowRolesDropdown((prev) => !prev)}
                      >
                        {form.role_id.length === 0 ? (
                          <span style={{ color: "#888" }}>Select roles</span>
                        ) : (
                          roles
                            .filter((r) => form.role_id.includes(r.id))
                            .map((r) => r.name)
                            .join(", ")
                        )}
                        <span
                          style={{
                            marginLeft: "auto",
                            color: "#888",
                            fontSize: 18,
                          }}
                        >
                          &#9662;
                        </span>
                      </div>
                      {showRolesDropdown && (
                        <div
                          style={{
                            position: "absolute",
                            top: 44,
                            left: 0,
                            right: 0,
                            zIndex: 20,
                            border: "1px solid #bfc8e0",
                            borderRadius: 8,
                            background: "#fff",
                            boxShadow: "0 2px 8px 0 rgba(0,0,0,0.08)",
                            maxHeight: 200,
                            overflowY: "auto",
                            padding: "8px 0",
                          }}
                        >
                          {roles.length === 0 && (
                            <div style={{ color: "#888", padding: 8 }}>
                              No roles available
                            </div>
                          )}
                          {roles.map((role) => (
                            <label
                              key={role.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                padding: "4px 16px",
                                cursor: "pointer",
                                fontSize: 15,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={form.role_id.includes(role.id)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setForm((prev) => {
                                    let updated: string[];
                                    if (checked) {
                                      updated = [...prev.role_id, role.id];
                                    } else {
                                      updated = prev.role_id.filter(
                                        (id) => id !== role.id
                                      );
                                    }
                                    return { ...prev, role_id: updated };
                                  });
                                }}
                                style={{ marginRight: 8 }}
                              />
                              {role.name}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* System Name (mandatory) */}
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
                  {/* System Inventory ID (optional) */}
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
                  {/* Multiple Role Access (Yes/No), Status, and Role Lock/Unlock Toggle */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 24,
                      minHeight: 44,
                    }}
                  >
                    {/* Multiple Role Access */}
                    <div
                      className={addStyles.formGroup}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        margin: 0,
                      }}
                    >
                      <label
                        htmlFor="multiple_role_access"
                        style={{
                          marginBottom: 0,
                          minWidth: 170,
                          fontWeight: 500,
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
                    {/* Status */}
                    <div
                      className={addStyles.formGroup}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        margin: 0,
                      }}
                    >
                      <label
                        htmlFor="status"
                        style={{
                          marginBottom: 0,
                          minWidth: 70,
                          fontWeight: 500,
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
                    {/* Role Lock/Unlock Toggle Switch */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginLeft: 8,
                        userSelect: "none",
                      }}
                    >
                      <span style={{ marginRight: 8, fontWeight: 500 }}>
                        Role Lock
                      </span>
                      <div
                        onClick={() => setRoleLocked((prev) => !prev)}
                        style={{
                          width: 95,
                          height: 38,
                          borderRadius: 24,
                          background: roleLocked ? "#1569B0" : "#c4c4c4",
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                          position: "relative",
                          transition: "background 0.2s",
                          padding: 0,
                        }}
                        tabIndex={0}
                        aria-label="Role Lock Toggle"
                      >
                        <span
                          style={{
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 20,
                            marginLeft: roleLocked ? 16 : 16,
                            marginRight: roleLocked ? 0 : 0,
                            transition: "margin 0.2s",
                            width: 38,
                            textAlign: "center",
                            letterSpacing: 1,
                          }}
                        >
                          {roleLocked ? "Lock" : "Unlock"}
                        </span>
                        <div
                          style={{
                            position: "absolute",
                            right: roleLocked ? 6 : 36,
                            left: roleLocked ? 62 : 6,
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
                    </div>
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
