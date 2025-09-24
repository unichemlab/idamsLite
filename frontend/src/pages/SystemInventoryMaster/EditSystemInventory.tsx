import React, { useContext, useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useNavigate, useParams } from "react-router-dom";
import { SystemContext } from "../SystemInventoryMaster/SystemContext";
import type { System } from "./SystemContext";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import addStyles from "../../pages/PlantMaster/AddPlantMaster.module.css";
import { sidebarConfig } from "../../components/Common/sidebarConfig";
import { useAuth } from "../../context/AuthContext";

const EditSystemInventory: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const systemCtx = useContext(SystemContext);
  const navigate = useNavigate();

  // Find system by id (not index) for robustness
  const system = systemCtx?.systems.find((s: System) => String(s.id) === id);
  const [form, setForm] = useState({
    system_name: system?.system_name ?? "",
    description: system?.description ?? "",
    status: system?.status ?? "ACTIVE",
  });
  const [showConfirm, setShowConfirm] = useState(false);

  if (!systemCtx || id === undefined || !system) return <div>System not found</div>;

  const filteredSidebarConfig = sidebarConfig;

  const handleSidebarNav = (key: string) => {
    switch (key) {
      case "dashboard":
        navigate("/superadmin", { state: { activeTab: "dashboard" } });
        break;
      case "plant":
        navigate("/superadmin", { state: { activeTab: "plant" } });
        break;
      case "role":
        navigate("/superadmin", { state: { activeTab: "role" } });
        break;
      case "vendor":
        navigate("/superadmin", { state: { activeTab: "vendor" } });
        break;
      case "department":
        navigate("/superadmin", { state: { activeTab: "department" } });
        break;
      case "application":
        navigate("/superadmin", { state: { activeTab: "application" } });
        break;
      case "user":
        navigate("/superadmin", { state: { activeTab: "user" } });
        break;
      case "workflow":
        navigate("/superadmin", { state: { activeTab: "workflow" } });
        break;
      case "system":
        navigate("/superadmin", { state: { activeTab: "system" } });
        break;
      default:
        break;
    }
  };

  const activeTab = "system";

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "status" ? (value as "ACTIVE" | "INACTIVE") : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };


  const handleConfirm = () => {
    // Update by id, not index
    if (system && system.id !== undefined) {
      systemCtx.updateSystem(system.id, {
        ...system,
        system_name: form.system_name,
        description: form.description,
        status: form.status,
      });
    }
    setShowConfirm(false);
    navigate("/superadmin");
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <React.Fragment>
      {showConfirm && (
        <ConfirmLoginModal
          username={user?.username || ""}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
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
            <h2 className={superAdminStyles["header-title"]}>System Master</h2>
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
                navigate("/superadmin", { state: { activeTab: "system" } })
              }
              onMouseOver={(e) => (e.currentTarget.style.color = "#084a9e")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#0b63ce")}
              tabIndex={0}
              role="button"
              aria-label="Go to System Master table"
            >
              System Master
            </span>
            <span>&gt;</span>
            <span style={{ color: "#2d3748" }}>Edit System</span>
          </div>

          {/* Container for Edit Form */}
          <div className={addStyles.container} style={{ marginTop: 32 }}>
            <form
              onSubmit={handleSubmit}
              className={addStyles.form}
              style={{ width: "100%" }}
            >
              <div className={addStyles.scrollFormContainer}>
                <div className={addStyles.rowFields}>
                  <div
                    className={addStyles.formGroup}
                    style={{ flex: 1, minWidth: 180 }}
                  >
                    <label>System Name</label>
                    <input
                      name="system_name"
                      value={form.system_name}
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
                <div
                  className={addStyles.formGroup}
                  style={{ width: "100%", marginTop: 18 }}
                >
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    required
                    className={addStyles.textarea}
                    rows={5}
                    style={{
                      minHeight: 120,
                      resize: "vertical",
                      width: "100%",
                      fontSize: "1.1rem",
                    }}
                    placeholder="Enter description..."
                  />
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
                  onClick={() => navigate("/superadmin")}
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

export default EditSystemInventory;