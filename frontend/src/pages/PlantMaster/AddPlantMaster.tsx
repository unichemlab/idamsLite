import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlantContext, Plant } from "./PlantContext";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import addStyles from "./AddPlantMaster.module.css";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FactoryIcon from "@mui/icons-material/Factory";
import SecurityIcon from "@mui/icons-material/Security";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AppsIcon from "@mui/icons-material/Apps";
import PersonIcon from "@mui/icons-material/Person";
import AssignmentIcon from "@mui/icons-material/Assignment";

const AddPlantMaster: React.FC = () => {
  const { addPlant } = usePlantContext();
  const navigate = useNavigate();
  const [form, setForm] = useState<Plant>({
    name: "",
    description: "",
    location: "",
    status: "ACTIVE",
  });

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
    addPlant(form);
    navigate("/superadmin"); // redirect to table
  };

  // Sidebar config (copied from SuperAdmin)
  const sidebarConfig = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <DashboardIcon fontSize="small" />,
    },
    {
      key: "plant",
      label: "Plant Master",
      icon: <FactoryIcon fontSize="small" />,
    },
    {
      key: "role",
      label: "Role Master",
      icon: <SecurityIcon fontSize="small" />,
    },
    {
      key: "vendor",
      label: "Vendor Master",
      icon: <ListAltIcon fontSize="small" />,
    },
    {
      key: "department",
      label: "Department Master",
      icon: <SecurityIcon fontSize="small" />,
    },
    {
      key: "application",
      label: "Application Master",
      icon: <AppsIcon fontSize="small" />,
    },
    {
      key: "user",
      label: "User Master",
      icon: <PersonIcon fontSize="small" />,
    },
    {
      key: "workflow",
      label: "Approval Workflow",
      icon: <AssignmentIcon fontSize="small" />,
    },
  ];

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
          {sidebarConfig.map((item) => (
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
                <div className={addStyles.formGroup}>
                  <label>Plant Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className={addStyles.input}
                  />
                </div>
                <div className={addStyles.formGroup}>
                  <label>Location</label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    required
                    className={addStyles.input}
                  />
                </div>
                <div className={addStyles.formGroup}>
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
                  style={{ minHeight: 100, resize: "vertical", width: "100%" }}
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
  );
};

export default AddPlantMaster;
