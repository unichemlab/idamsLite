import React, { useContext, useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { PlantContext } from "./PlantContext";
import type { Plant } from "./PlantContext";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import addStyles from "./AddPlantMaster.module.css";
import { sidebarConfig } from "../../components/Common/sidebarConfig";
import { useAuth } from "../../context/AuthContext";

const EditPlantMaster: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const plantCtx = useContext(PlantContext);
  const navigate = useNavigate();
  const location = useLocation();
  // `id` route param is a DB id (number). Find the corresponding index in
  // the plants array maintained by PlantContext so update/delete functions
  // that expect an index still work.
  const routeId = id ? parseInt(id, 10) : -1;
  const plantIndex = plantCtx?.plants.findIndex((p) => p.id === routeId) ?? -1;
  const plant = plantIndex >= 0 ? plantCtx?.plants[plantIndex] : undefined;
  const [form, setForm] = useState<Plant>(
    plant ?? {
      name: "",
      description: "",
      location: "",
      status: "ACTIVE",
    }
  );
  const [showConfirm, setShowConfirm] = useState(false);

  if (!plantCtx || id === undefined || !plant) return null;

  // Always show all sidebar items, regardless of user role
  const filteredSidebarConfig = sidebarConfig;
  const activeTab = location.state?.activeTab || "plant";
  // Sidebar navigation handler: always reset to table view for selected master
  const handleSidebarNav = (key: string) => {
    navigate("/superadmin", { state: { activeTab: key } });
  };

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
    // plantCtx.updatePlant expects an index into the plants array
    if (plantIndex >= 0) plantCtx.updatePlant(plantIndex, form);
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
            <span className={superAdminStyles.version}>version-1.0</span>
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
            <span style={{ color: "#2d3748" }}>Edit Plant</span>
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

export default EditPlantMaster;
