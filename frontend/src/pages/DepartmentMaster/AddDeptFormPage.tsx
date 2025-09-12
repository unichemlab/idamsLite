// src/pages/DepartmentMasterTable/AddDeptFormPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useDepartmentContext,
  Department,
} from "../../pages/DepartmentMaster/DepartmentContext";

import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import Styles from "../ApplicationMasterTable/ApplicationMasterTable.module.css";
import { sidebarConfig } from "../../components/Common/sidebarConfig";

const AddDeptFormPage: React.FC = () => {
  const { addDepartment } = useDepartmentContext();
  const navigate = useNavigate();
  const [form, setForm] = useState<Department>({
    id: 0,
    name: "",
    description: "",
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
    addDepartment(form);
    navigate("/superadmin"); // redirect to table
  };

  // Use shared sidebarConfig for consistency

  // Sidebar navigation handler (unfiltered, always show all)
  const handleSidebarNav = (key: string) => {
    navigate("/superadmin", { state: { activeTab: key } });
  };

  // Determine active sidebar tab (always "plant" for Add)
  const activeTab = "department";

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
          <h2 className={superAdminStyles["header-title"]}>
            Department Master
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
              navigate("/superadmin", { state: { activeTab: "department" } })
            }
            onMouseOver={(e) => (e.currentTarget.style.color = "#084a9e")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#0b63ce")}
            tabIndex={0}
            role="button"
            aria-label="Go to Department Master table"
          >
            Department Master
          </span>
          <span>&gt;</span>
          <span style={{ color: "#2d3748" }}>Add Department</span>
        </div>

        {/* Container for Add Form */}
        <div className={Styles.container} style={{ marginTop: 32 }}>
          <form
            className={Styles.form}
            onSubmit={handleSubmit}
            style={{ width: "100%" }}
          >
            <div className={Styles.scrollFormContainer}>
              <div className={Styles.rowFields}>
                <div className={Styles.formGroup}>
                  <label>Department Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className={Styles.input}
                  />
                </div>

                <div className={Styles.formGroup}>
                  <label>Status</label>
                  <select
                    className={Styles.select}
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
                className={Styles.formGroup}
                style={{ width: "100%", marginTop: 18 }}
              >
                <label>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                  className={Styles.textarea}
                  rows={4}
                  style={{ minHeight: 100, resize: "vertical", width: "100%" }}
                  placeholder="Enter description..."
                />
              </div>
            </div>
            <div
              className={Styles.buttonRow}
              style={{
                display: "flex",
                justifyContent: "flex-start",
                gap: 24,
                marginTop: 24,
              }}
            >
              <button type="submit" className={Styles.saveBtn}>
                Save
              </button>
              <button
                type="button"
                className={Styles.cancelBtn}
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

export default AddDeptFormPage;
