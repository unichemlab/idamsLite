import React, { useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { usePlantContext, Plant } from "./PlantContext";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import addStyles from "./AddPlantMaster.module.css";
import { sidebarConfig } from "../../components/Common/sidebarConfig";

const AddPlantMaster: React.FC = () => {
  const { addPlant } = usePlantContext();
  const navigate = useNavigate();
  const [form, setForm] = useState<Plant>({
    name: "",
    description: "",
    location: "",
    status: "ACTIVE",
  });
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

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

  const handleConfirm = (data: Record<string, string>) => {
    // Optionally, you can check password here with backend
    addPlant(form);
    setShowConfirm(false);
    navigate("/superadmin");
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  // Always show all sidebar items, regardless of user role
  const filteredSidebarConfig = sidebarConfig;

  // Sidebar navigation handler
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
      default:
        break;
    }
  };

  // Determine active sidebar tab (always "plant" for Add)
  const activeTab = "plant";

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
            <h2 className={superAdminStyles["header-title"]}>Plant Master</h2>
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
                navigate("/superadmin", { state: { activeTab: "plant" } })
              }
              onMouseOver={(e) => (e.currentTarget.style.color = "#084a9e")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#0b63ce")}
              tabIndex={0}
              role="button"
              aria-label="Go to Plant Master table"
            >
              Plant Master
            </span>
            <span>&gt;</span>
            <span style={{ color: "#2d3748" }}>Add Plant</span>
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
                    <label>Plant Name</label>
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
                    <label>Location</label>
                    <input
                      name="location"
                      value={form.location}
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
                  Save
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

export default AddPlantMaster;
