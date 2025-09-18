import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import addStyles from "../PlantMaster/AddPlantMaster.module.css";
import { sidebarConfig } from "../../components/Common/sidebarConfig";

const AddApplicationMaster: React.FC = () => {
  const username = localStorage.getItem("username") || "";
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    version: "",
    equipmentId: "",
    computer: "",
    plant: "",
    status: "ACTIVE",
  });

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

  return (
    <React.Fragment>
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
              setShowModal(false);
              navigate("/superadmin", { state: { activeTab: "application" } });
            } else {
              alert("Invalid credentials. Please try again.");
            }
          }}
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
                  <div
                    className={addStyles.formGroup}
                    style={{ flex: 1, minWidth: 180 }}
                  >
                    <label>Application Name</label>
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
                    <label>Version</label>
                    <input
                      name="version"
                      value={form.version}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                    />
                  </div>
                  <div
                    className={addStyles.formGroup}
                    style={{ flex: 1, minWidth: 180 }}
                  >
                    <label>Status</label>
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
                <div className={addStyles.rowFields}>
                  <div
                    className={addStyles.formGroup}
                    style={{ flex: 1, minWidth: 180 }}
                  >
                    <label>Equipment ID</label>
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
                    <label>Computer</label>
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
                    <label>Plant</label>
                    <input
                      name="plant"
                      value={form.plant}
                      onChange={handleChange}
                      required
                      className={addStyles.input}
                    />
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
            </form>
          </div>
        </main>
      </div>
    </React.Fragment>
  );
};

export default AddApplicationMaster;
