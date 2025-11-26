import React, { useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
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
  const [showApprovalNotice, setShowApprovalNotice] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");

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

  const handleConfirm = async (data: Record<string, string>) => {
    try {
      const result = await addPlant(form);
      setShowConfirm(false);

      // Check if result is an approval response
      if ("approvalId" in result && result.status === "PENDING_APPROVAL") {
        setApprovalMessage(
          `${result.message}\n\nApproval ID: ${result.approvalId}\n\nThe plant will be added after approval.`
        );
        setShowApprovalNotice(true);
      } else {
        // Direct creation (no approval needed)
        alert("Plant created successfully!");
        navigate("/superadmin", { state: { activeTab: "plant" } });
      }
    } catch (err: any) {
      console.error("Error adding plant:", err);
      alert(`Error: ${err.message || "Failed to add plant"}`);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  const handleApprovalNoticeClose = () => {
    setShowApprovalNotice(false);
    navigate("/superadmin", { state: { activeTab: "plant" } });
  };

  // Always show all sidebar items, regardless of user role
  const filteredSidebarConfig = sidebarConfig;
  const location = useLocation();
  const activeTab = location.state?.activeTab || "plant";
  
  // Sidebar navigation handler: always reset to table view for selected master
  const handleSidebarNav = (key: string) => {
    navigate("/superadmin", { state: { activeTab: key } });
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

      {/* Approval Notice Modal */}
      {showApprovalNotice && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: "24px",
                fontSize: "48px",
              }}
            >
              ⏳
            </div>
            <h3
              style={{
                margin: "0 0 16px 0",
                textAlign: "center",
                color: "#2d3748",
              }}
            >
              Approval Required
            </h3>
            <p
              style={{
                whiteSpace: "pre-line",
                color: "#4a5568",
                lineHeight: "1.6",
                marginBottom: "24px",
              }}
            >
              {approvalMessage}
            </p>
            <div style={{ textAlign: "center" }}>
              <button
                onClick={handleApprovalNoticeClose}
                style={{
                  padding: "12px 32px",
                  background: "#0b63ce",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
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