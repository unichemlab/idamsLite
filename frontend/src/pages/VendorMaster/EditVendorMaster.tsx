import React, { useContext, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { VendorContext } from "./VendorContext";
import type { Vendor } from "./VendorContext";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import addStyles from "./AddVendorMaster.module.css";
import { sidebarConfig } from "../../components/Common/sidebarConfig";

const EditVendorMaster: React.FC = () => {
  const { id } = useParams(); // index from route
  const vendorCtx = useContext(VendorContext);
  const navigate = useNavigate();
  const index = id ? parseInt(id, 10) : -1;
  const vendor = vendorCtx?.vendors[index];
  const [form, setForm] = useState<Vendor>(
    vendor ?? {
      name: "",
      description: "",
      status: "ACTIVE",
    }
  );

  if (!vendorCtx || id === undefined || !vendor) return null;

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
    vendorCtx.updateVendor(index, form);
    navigate("/superadmin");
  };

  // Use shared sidebarConfig for consistency

  // Sidebar navigation handler (unfiltered, always show all)
  const handleSidebarNav = (key: string) => {
    navigate("/superadmin", { state: { activeTab: key } });
  };

  // Determine active sidebar tab (always "vendor" for Add/Edit)
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
          Vendor Master &gt; Edit Vendor
        </div>

        {/* Container for Edit Form */}
        <div className={addStyles.container} style={{ marginTop: 32 }}>
          <form
            onSubmit={handleSubmit}
            className={addStyles.form}
            style={{ width: "100%" }}
          >
            <div
              style={{
                display: "flex",
                gap: 32,
                marginBottom: 32,
                flexWrap: "wrap",
                justifyContent: "space-between",
                padding: "40px",
              }}
            >
              <div style={{ flex: 1, minWidth: 180 }}>
                <label>Vender/OEM Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label>Description</label>
                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label>Status</label>
                <select
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
                marginTop: -6,
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
  );
};

export default EditVendorMaster;
