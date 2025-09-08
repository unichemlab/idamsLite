import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVendorContext, Vendor } from "./VendorContext";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import addStyles from "./AddVendorMaster.module.css";

const AddVendorMaster: React.FC = () => {
  const { addVendor } = useVendorContext();
  const navigate = useNavigate();
  const [form, setForm] = useState<Vendor>({
    name: "",
    description: "",
    status: "ACTIVE",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "status" ? (value as "ACTIVE" | "INACTIVE") : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addVendor(form);
    navigate("/superadmin"); // redirect to table
  };

  // Sidebar config (copied from SuperAdmin)
  const sidebarConfig = [
    { key: "dashboard", label: "Dashboard" },
    { key: "plant", label: "Plant Master" },
    { key: "role", label: "Role Master" },
    { key: "vendor", label: "Vendor Master" },
    { key: "application", label: "Application Master" },
    { key: "user", label: "User Master" },
    { key: "workflow", label: "Approval Workflow" },
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
  const activeTab = "vendor";

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
              {item.label}
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
          <h2 className={superAdminStyles["header-title"]}>Vendor Master</h2>
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
          }}
        >
          Vendor Master &gt; Add Vendor
        </div>

        {/* Container for Add Form */}
        <div className={addStyles.container} style={{ marginTop: 32 }}>
          <form
            className={addStyles.form}
            onSubmit={handleSubmit}
            style={{ width: "100%" }}
          >
            <div
              style={{
                display: "flex",
                gap: 32,
                marginBottom: 32,
                flexWrap: "wrap",
                justifyContent: "space-between",
                padding: "42px",
              }}
            >
              <div
                style={{ flex: 1, minWidth: 180 }}
                className={addStyles.formGroup}
              >
                <label>Vendor Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div
                style={{ flex: 1, minWidth: 180 }}
                className={addStyles.formGroup}
              >
                <label>Description</label>
                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                />
              </div>
              <div
                style={{ flex: 1, minWidth: 180 }}
                className={addStyles.formGroup}
              >
                <label>Status</label>
                <select
                  className={addStyles.select}
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  style={{ width: "100%" }}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
            <div
              className={addStyles.buttonRow}
              style={{
                display: "flex",
                justifyContent: "center",
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

export default AddVendorMaster;
