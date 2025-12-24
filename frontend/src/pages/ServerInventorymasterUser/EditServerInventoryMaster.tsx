import React, { useContext, useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useNavigate, useParams } from "react-router-dom";
import { ServerContext } from "../ServerInventoryMaster/ServerContext";
import { Server } from "../ServerInventoryMaster/ServerContext";
import { useAuth } from "../../context/AuthContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/AddPlantMaster.module.css";

const EditServerInventory: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const serverCtx = useContext(ServerContext);
  const navigate = useNavigate();

  // Find server by id (not index) for robustness
  const server = serverCtx?.servers.find((s: Server) => String(s.id) === id);
  const [form, setForm] = useState({
    host_name: server?.host_name ?? "",
    remarks: server?.remarks ?? "",
    status: server?.status ?? "ACTIVE",
  });
  const [showConfirm, setShowConfirm] = useState(false);

  if (!serverCtx || id === undefined || !server) return <div>Server not found</div>;

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
    if (server && server.id !== undefined) {
      serverCtx.updateServer(server.id, {
        ...server,
        host_name: form.host_name,
        remarks: form.remarks,
        status: form.status,
      });
    }
    setShowConfirm(false);
    navigate("/server-master");
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
      <div className={styles.pageWrapper}>
        <AppHeader title="Server Inventory Management" />

        <div className={styles.contentArea}>
          {/* Breadcrumb */}
          <div className={styles.breadcrumb}>
            <span
              className={styles.breadcrumbLink}
              onClick={() =>
                navigate("/server-master", { state: { activeTab: "server" } })
              }
            >
              Server Master
            </span>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbCurrent}>Edit Server</span>
          </div>

         <div className={styles.formCard}>
          <div className={styles.formHeader}>
              <h2>Edit Server</h2>
              <p>Enter Server details to edit a old record to the system</p>
            </div>
            <form
              onSubmit={handleSubmit}
              className={styles.form}
              style={{ width: "100%" }}
            >
              <div className={styles.scrollFormContainer}>
                <div className={styles.rowFields}>
                  <div
                    className={styles.formGroup}
                    style={{ flex: 1, minWidth: 180 }}
                  >
                    <label>Server Name</label>
                    <input
                      name="host_name"
                      value={form.host_name}
                      onChange={handleChange}
                      required
                      className={styles.input}
                    />
                  </div>
                  <div
                    className={styles.formGroup}
                    style={{ flex: 1, minWidth: 180 }}
                  >
                    <label>Status</label>
                    <select
                      className={styles.select}
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
                  className={styles.formGroup}
                  style={{ width: "100%", marginTop: 18 }}
                >
                  <label>Remarks</label>
                  <textarea
                    name="remarks"
                    value={form.remarks}
                    onChange={handleChange}
                    required
                    className={styles.textarea}
                    rows={5}
                    style={{
                      minHeight: 120,
                      resize: "vertical",
                      width: "100%",
                      fontSize: "1.1rem",
                    }}
                    placeholder="Enter remarks..."
                  />
                </div>
              </div>
              <div
                className={styles.buttonRow}
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  gap: 24,
                  marginTop: 24,
                }}
              >
                <button type="submit" className={styles.saveBtn}>
                  Update
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => navigate("/server-master")}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default EditServerInventory;