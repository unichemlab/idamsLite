import React, { useState } from "react";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import { useNavigate } from "react-router-dom";
import { useRoles } from "./RolesContext";
import type { Role } from "../../RoleMaster/RolesContext";
import { useAuth } from "../../context/AuthContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/AddPlantMaster.module.css";
import { API_BASE } from "../../utils/api";

interface AddRoleFormPageProps {
  onCancel?: () => void;
}

export default function AddRoleFormPage({ onCancel }: AddRoleFormPageProps) {
  const navigate = useNavigate();
  const { addRole } = useRoles();
  const { user } = useAuth();

  const [form, setForm] = useState<Omit<Role, "activityLogs">>({
    name: "",
    description: "",
    status: "ACTIVE",
  });

  const [showModal, setShowModal] = useState(false);
  const [showApprovalNotice, setShowApprovalNotice] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1️⃣ Duplicate name check
    try {
      const checkRes = await fetch(`${API_BASE}/api/master-approvals/check-duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module:    "roles",
          name:      form.name,
          excludeId: null,
        }),
      });

      if (checkRes.status === 409) {
        const errData = await checkRes.json();
        alert(errData.error || "A role with this name already exists.");
        return;
      }

      if (!checkRes.ok) {
        const errData = await checkRes.json();
        alert(errData.error || "Validation failed. Please try again.");
        return;
      }
    } catch (err) {
      alert("Could not validate form. Please try again.");
      return;
    }

    // 2️⃣ All validations passed — open confirmation modal
    setShowModal(true);
  };

  const handleConfirmLogin = async (data: Record<string, string>) => {
  try {
    const result = await addRole({        // ✅ cast to any
      name:        form.name,
      description: form.description,
      status:      form.status,
    }) as any;

    setShowModal(false);
     console.log("result",result);

    if (result?.approvalId && result?.status === "PENDING_APPROVAL") {
      setApprovalMessage(
        `${result.message}\n\nApproval ID: ${result.approvalId}\n\nThe role will be added after approval.`
      );
      setShowApprovalNotice(true);
    } else {
      alert("Role created successfully!");
      if (onCancel) {
        onCancel();
      } else {
        navigate("/role-master", { state: { activeTab: "role" } });
      }
    }
  } catch (err: any) {
    alert(`Error: ${err.message || "Failed to add role"}`);
  }
};

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate("/role-master", { state: { activeTab: "role" } });
    }
  };

  const handleApprovalNoticeClose = () => {
    setShowApprovalNotice(false);
    if (onCancel) {
      onCancel();
    } else {
      navigate("/role-master", { state: { activeTab: "role" } });
    }
  };

  return (
    <div className={styles.pageWrapper}>

      {/* ── Approval Notice Modal ── */}
      {showApprovalNotice && (
        <div className={styles.modalOverlay}>
          <div className={styles.approvalModal}>
            <div className={styles.approvalIcon}>⏳</div>
            <h3 className={styles.approvalTitle}>Approval Required</h3>
            <p className={styles.approvalMessage}>{approvalMessage}</p>
            <button
              onClick={handleApprovalNoticeClose}
              className={styles.approvalOkBtn}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <AppHeader title="Role Master Management" />

      <div className={styles.contentArea}>
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <span
            className={styles.breadcrumbLink}
            onClick={() =>
              navigate("/role-master", { state: { activeTab: "role" } })
            }
          >
            Role Master
          </span>
          <span className={styles.breadcrumbSeparator}>›</span>
          <span className={styles.breadcrumbCurrent}>Add Role</span>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Add New Role</h2>
            <p>Enter Role details to add a new record to the system</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} style={{ width: "100%" }}>
            <div className={styles.scrollFormContainer}>
              <div className={styles.rowFields}>
                <div className={styles.formGroupFloating}>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    required
                    className={styles.input}
                  />
                  <label className={styles.floatingLabel}>
                    Role Name <span className={styles.required}>*</span>
                  </label>
                </div>

                <div className={styles.formGroupFloating}>
                  <select
                    className={styles.select}
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                  >
                    <option value="">Select Status</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                  <label className={styles.floatingLabel}>
                    Status <span className={styles.required}>*</span>
                  </label>
                </div>
              </div>

              <div className={styles.formGroup} style={{ width: "100%", padding: 15 }}>
                <div className={styles.formGroupFloating}>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) {
                        handleFormChange(e);
                      }
                    }}
                    required
                    className={styles.textarea}
                    rows={5}
                    placeholder="Enter description..."
                  />
                  <label className={styles.floatingLabel}>
                    Description <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.charCounter}>
                    {(form.description?.length || 0)}/1000
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.formFotter}>
              <div
                className={styles.buttonRow}
                style={{ display: "flex", justifyContent: "flex-start", gap: 24, margin: 15 }}
              >
                <button type="submit" className={styles.saveBtn}>
                  Save
                </button>
                <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </div>
          </form>

          {showModal && (
            <ConfirmLoginModal
              title="Confirm Add Role"
              description="Please confirm adding this role by entering your password."
              username={user?.username || ""}
              onConfirm={handleConfirmLogin}
              onCancel={() => setShowModal(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}