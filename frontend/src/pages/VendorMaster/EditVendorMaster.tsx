import React, { useContext, useState } from "react";
import ConfirmLoginModal from "./ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { VendorContext } from "./VendorContext";
import type { Vendor } from "./VendorContext";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import addStyles from "../PlantMaster/AddPlantMaster.module.css";
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
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (!vendorCtx || id === undefined || !vendor) return null;

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
    setShowModal(true);
  };

  // Called after admin confirms
  const handleConfirmLogin = (data: Record<string, string>) => {
    if (data.username === (user?.username || "") && data.password) {
      vendorCtx.updateVendor(index, form);
      setShowModal(false);
      navigate("/superadmin", { state: { activeTab: "vendor" } });
    } else {
      alert("Invalid credentials. Please try again.");
    }
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
          <span className={superAdminStyles.version}>version-1.0</span>
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
            <div className={addStyles.scrollFormContainer}>
              <div className={addStyles.rowFields}>
                <div className={addStyles.formGroup}>
                  <label>Vendor Name</label>
                  <input
                    name="name"
                    value={form.name}
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
          {showModal && (
            <ConfirmLoginModal
              title="Confirm Edit Vendor"
              description="Please confirm editing this vendor by entering your password."
              username={user?.username || ""}
              onConfirm={handleConfirmLogin}
              onCancel={() => setShowModal(false)}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default EditVendorMaster;
