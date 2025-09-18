import React, { useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import addStyles from "./AddApplicationMaster.module.css";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import { sidebarConfig } from "../../components/Common/sidebarConfig";
import { useLocation, useNavigate } from "react-router-dom";
import { useApplications } from "../../context/ApplicationsContext";

import { useAuth } from "../../context/AuthContext";

const EditApplicationFormPage: React.FC = () => {
  // Use user context for username (for consistency with PlantMaster)
  const { user } = useAuth();
  const username = user?.username || "";
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setApplications } = useApplications();
  const { applicationData } = location.state || {};
  // Use all fields as in AddApplicationFormPage
  type FormType = {
    id: string;
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
  // Convert role_id to array if string
  const initialRoleIds = applicationData?.role_id
    ? String(applicationData.role_id)
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];
  const [form, setForm] = useState<FormType>({
    id: applicationData?.id || "",
    transaction_id: applicationData?.transaction_id || "",
    plant_location_id: applicationData?.plant_location_id || "",
    department_id: applicationData?.department_id || "",
    application_hmi_name: applicationData?.application_hmi_name || "",
    application_hmi_version: applicationData?.application_hmi_version || "",
    equipment_instrument_id: applicationData?.equipment_instrument_id || "",
    application_hmi_type:
      applicationData?.application_hmi_type || "Application",
    display_name:
      applicationData?.display_name ||
      `${applicationData?.application_hmi_name || ""} | ${
        applicationData?.application_hmi_version || ""
      } | ${applicationData?.equipment_instrument_id || ""}`,
    role_id: initialRoleIds,
    system_name: applicationData?.system_name || "",
    system_inventory_id: applicationData?.system_inventory_id || "",
    multiple_role_access: applicationData?.multiple_role_access || false,
    status: applicationData?.status || "ACTIVE",
  });

  // Roles for dropdown
  const [roles, setRoles] = React.useState<{ id: string; name: string }[]>([]);
  React.useEffect(() => {
    fetch("/api/roles")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data))
          setRoles(
            data.map((r: any) => ({ id: String(r.id), name: r.role_name }))
          );
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

  // API call to update application
  const handleConfirm = async (data: Record<string, string>) => {
    if (data.username === username && data.password) {
      try {
        setShowModal(false);
        // Call backend PUT API
        const res = await fetch(`/api/applications/${form.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Failed to update application");
        const updated = await res.json();
        // Update context
        setApplications((prev) =>
          prev.map((app) =>
            app.id === updated.id ? { ...app, ...updated } : app
          )
        );
        navigate("/superadmin", { state: { activeTab: "application" } });
      } catch (err) {
        alert("Failed to update application. Please try again.");
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
            <span style={{ color: "#2d3748" }}>Edit Application</span>
          </div>

          {/* Container for Edit Form */}
          <div className={addStyles.container} style={{ marginTop: 32 }}>
            <form
              className={addStyles.form}
              onSubmit={handleSubmit}
              style={{ width: "100%" }}
            >
              <div className={addStyles.scrollFormContainer}>
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>Plant Location</label>
                    <input
                      name="plant_location_id"
                      placeholder="Plant Location ID"
                      value={form.plant_location_id}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Department</label>
                    <input
                      name="department_id"
                      placeholder="Department ID"
                      value={form.department_id}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Application/HMI Name</label>
                    <input
                      name="application_hmi_name"
                      placeholder="Application/HMI Name"
                      value={form.application_hmi_name}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Application/HMI Version</label>
                    <input
                      name="application_hmi_version"
                      placeholder="Application/HMI Version"
                      value={form.application_hmi_version}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Equipment/Instrument ID</label>
                    <input
                      name="equipment_instrument_id"
                      placeholder="Equipment/Instrument ID"
                      value={form.equipment_instrument_id}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Application/HMI Type</label>
                    <input
                      name="application_hmi_type"
                      placeholder="Application/HMI Type"
                      value={form.application_hmi_type}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Display Name</label>
                    <input
                      name="display_name"
                      placeholder="Display Name"
                      value={form.display_name}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Role(s)</label>
                    <select
                      className={addStyles.select}
                      name="role_id"
                      value={form.role_id}
                      onChange={handleChange}
                      multiple
                      required
                      size={Math.min(roles.length, 5) || 2}
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>System Name</label>
                    <input
                      name="system_name"
                      placeholder="System Name"
                      value={form.system_name}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>System Inventory ID</label>
                    <input
                      name="system_inventory_id"
                      placeholder="System Inventory ID"
                      value={form.system_inventory_id}
                      onChange={handleChange}
                      className={addStyles.input}
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>
                      <input
                        type="checkbox"
                        name="multiple_role_access"
                        checked={!!form.multiple_role_access}
                        onChange={handleChange}
                        style={{ marginRight: 8 }}
                      />
                      Multiple Role Access
                    </label>
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className={addStyles.select}
                      required
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
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
    </React.Fragment>
  );
};

export default EditApplicationFormPage;
