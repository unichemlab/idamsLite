import React, { useState } from "react";
import styles from "./AddUserPanel.module.css";
import ConfirmLoginModal from "components/Common/ConfirmLoginModal";

const plants = ["GOA", "GOA-1", "Mumbai", "Delhi", "Bangalore"];
const permissions = ["Add", "Edit", "View", "Delete"];

export type UserForm = {
  fullName: string;
  email: string;
  empCode: string;
  department: string;
  location: string;
  status: string;
  plants: string[];
  permissions: {
    [key: string]: string[];
  };
  centralPermission: boolean;
  comment: string;
  corporateAccessEnabled: boolean;
};

interface AddUserPanelProps {
  onClose: () => void;
  onSave: (user: UserForm) => void;
  initialData?: UserForm | null;
  mode?: "add" | "edit";
  panelClassName?: string;
}

const AddUserPanel = ({
  onClose,
  onSave,
  initialData = null,
  mode = "add",
  panelClassName = "",
}: AddUserPanelProps) => {
  const [form, setForm] = useState<UserForm>(() => {
    return (
      initialData ?? {
        fullName: "",
        email: "",
        empCode: "",
        department: "",
        location: "",
        status: "Active",
        plants: [],
        permissions: {},
        centralPermission: false,
        comment: "",
        corporateAccessEnabled: false,
      }
    );
  });
  const [activePlant, setActivePlant] = useState<string | null>(() => {
    if (initialData && initialData.plants && initialData.plants.length > 0) {
      return initialData.plants[0];
    }
    return null;
  });
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Checkbox for plant selection
  const handleCheckboxChange = (plant: string) => {
    setForm((prev) => {
      const isSelected = prev.plants.includes(plant);
      // Gather all module keys for that plant
      const plantModules = [
        "Role Master",
        "Vendor Master",
        "Plant Master",
        "Application Master",
        "Approval Workflow",
        // "User Request" removed as per requirement
      ].map((mod) => `${plant}-${mod}`);

      // Check if any permission is checked for this plant
      const hasAnyPermission = plantModules.some(
        (modKey) => (prev.permissions[modKey] || []).length > 0
      );

      let updatedPlants;
      let newActive = activePlant;

      if (!isSelected) {
        // Selecting new plant → make it active
        updatedPlants = [...prev.plants, plant];
        newActive = plant;
      } else {
        // Only allow unchecking if no permissions are selected for this plant
        if (hasAnyPermission) {
          // Prevent unchecking
          return prev;
        } else {
          updatedPlants = prev.plants.filter((p) => p !== plant);
          if (plant === activePlant) {
            newActive = updatedPlants.length > 0 ? updatedPlants[0] : null;
          }
        }
      }

      setActivePlant(newActive);

      return {
        ...prev,
        plants: updatedPlants,
      };
    });
  };

  // Permission toggle for modules
  const handlePermissionToggle = (module: string, action: string) => {
    setForm((prev) => {
      let currentPermissions = prev.permissions[module] || [];
      let updatedPermissions = [...currentPermissions];
      const isChecked = currentPermissions.includes(action);

      // If Add/Edit/Delete is checked, always check View and disable it
      const triggers = ["Add", "Edit", "Delete"];
      if (triggers.includes(action)) {
        if (!isChecked) {
          if (!updatedPermissions.includes(action))
            updatedPermissions.push(action);
          if (!updatedPermissions.includes("View"))
            updatedPermissions.push("View");
        } else {
          updatedPermissions = updatedPermissions.filter((a) => a !== action);
        }
      } else if (action === "View") {
        // Only allow toggling 'View' if none of Add/Edit/Delete is checked
        const anyTriggerChecked = triggers.some((t) =>
          currentPermissions.includes(t)
        );
        if (!anyTriggerChecked) {
          if (!isChecked) {
            updatedPermissions.push("View");
          } else {
            updatedPermissions = updatedPermissions.filter((a) => a !== "View");
          }
        }
      }

      // Remove duplicates
      updatedPermissions = Array.from(new Set(updatedPermissions));

      // If any of Add/Edit/Delete is present, ensure View is present
      const anyTriggerChecked = triggers.some((t) =>
        updatedPermissions.includes(t)
      );
      if (anyTriggerChecked && !updatedPermissions.includes("View")) {
        updatedPermissions.push("View");
      }

      // If all permissions are removed, ensure View is also removed
      const allPerms = ["Add", "Edit", "Delete", "View"];
      const noneChecked = allPerms.every(
        (p) => !updatedPermissions.includes(p)
      );
      if (noneChecked) {
        updatedPermissions = [];
      }

      const updatedForm = {
        ...prev,
        permissions: {
          ...prev.permissions,
          [module]: updatedPermissions,
        },
      };

      // Extract plant name from module key: e.g., "GOA-Role Master" → "GOA"
      const plantPrefix = module.split("-")[0];
      const plantModules = [
        "Role Master",
        "Vendor Master",
        "Plant Master",
        "Application Master",
        "Approval Workflow",
        // "User Request" removed as per requirement
      ].map((mod) => `${plantPrefix}-${mod}`);
      const hasAnyPermission = plantModules.some(
        (modKey) => (updatedForm.permissions[modKey] || []).length > 0
      );
      let updatedPlants;
      if (hasAnyPermission) {
        updatedPlants = [...new Set([...updatedForm.plants, plantPrefix])];
      } else {
        updatedPlants = updatedForm.plants.filter((p) => p !== plantPrefix);
      }
      return {
        ...updatedForm,
        plants: updatedPlants,
      };
    });
  };

  // Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Basic validation
    if (!form.fullName || form.fullName.trim().length < 2) {
      setError("Please enter a valid name (at least 2 characters).");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email || !emailRegex.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (mode === "edit" && form.status === "Inactive") {
      setError(
        "Inactive user cannot be saved. Please make the user Active before saving."
      );
      return;
    }
    setShowModal(true); // show login modal before saving
  };

  const username = localStorage.getItem("username") || "";
  const handleConfirmLogin = async (data: Record<string, string>) => {
    if (data.username === username && data.password === "superadmin123") {
      setSaving(true);
      try {
        await onSave(form);
        setShowModal(false);
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to save user");
      } finally {
        setSaving(false);
      }
    } else {
      alert("Invalid credentials. Please try again.");
    }
  };

  return (
    <>
      <form
        className={`${styles.panel} ${panelClassName}`}
        onSubmit={handleSubmit}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === "edit" ? `Edit User - ${form.fullName}` : "Add New User"}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.form}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
          <div className={styles.sectionCard}>
            <label className={styles.formLabel}>User Details</label>
            <div className={styles.grid}>
              <div>
                <label>Full Name *</label>
                <input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                  disabled={mode === "edit"}
                  className={mode === "edit" ? styles.disabledInput : undefined}
                />
              </div>
              <div>
                <label>Email *</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={mode === "edit"}
                  className={mode === "edit" ? styles.disabledInput : undefined}
                />
              </div>
              <div>
                <label>Employee Code *</label>
                <input
                  value={form.empCode}
                  onChange={(e) =>
                    setForm({ ...form, empCode: e.target.value })
                  }
                  disabled={mode === "edit"}
                  className={mode === "edit" ? styles.disabledInput : undefined}
                />
              </div>
              <div>
                <label>Department *</label>
                <select
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  disabled={mode === "edit"}
                  className={mode === "edit" ? styles.disabledInput : undefined}
                >
                  <option value="">Select Department</option>
                  <option value="IT">IT</option>
                  <option value="QA">QA</option>
                  <option value="HR">HR</option>
                  <option value="Production">Production</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
              <div>
                <label>Location *</label>
                <input
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label>Status *</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <div className={styles.sectionCard}>
            <label className={styles.formLabel}>Plant Selection</label>
            <div className={styles.chipGroup}>
              {plants.map((plant) => {
                // Determine if any permission is set for this plant
                const plantModules = [
                  "Role Master",
                  "Vendor Master",
                  "Plant Master",
                  "Application Master",
                  "Approval Workflow",
                  // "User Request" removed as per requirement
                ].map((mod) => `${plant}-${mod}`);
                const hasAnyPermission = plantModules.some(
                  (modKey) => (form.permissions[modKey] || []).length > 0
                );
                return (
                  <button
                    type="button"
                    className={`${styles.chip} ${
                      form.plants.includes(plant) ? styles.chipActive : ""
                    }`}
                    key={plant}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setActivePlant(plant);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.plants.includes(plant)}
                      disabled={form.plants.includes(plant) && hasAnyPermission}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleCheckboxChange(plant);
                        if (!form.plants.includes(plant)) {
                          setActivePlant(plant);
                        } else if (activePlant === plant) {
                          const remaining = form.plants.filter(
                            (p) => p !== plant
                          );
                          setActivePlant(
                            remaining.length > 0 ? remaining[0] : null
                          );
                        }
                      }}
                    />
                    {plant}
                  </button>
                );
              })}
            </div>
          </div>

          {activePlant && form.plants.includes(activePlant) && (
            <div
              className={`${styles.plantTableWrapper} ${
                !activePlant ? styles.plantTableWrapperHidden : ""
              }`}
            >
              <label className={styles.sectionTitle}>
                Module Permissions for {activePlant}
              </label>
              <div className={styles.table}>
                <div className={styles.rowHeader}>
                  <span>Module Name</span>
                  {permissions.map((perm) => (
                    <span key={perm}>{perm}</span>
                  ))}
                </div>
                {[
                  "Role Master",
                  "Vendor Master",
                  "Plant Master",
                  "Application Master",
                  "Approval Workflow",
                  // \"User Request\" row removed as per requirement
                ].map((mod) => {
                  const moduleKey = `${activePlant}-${mod}`;
                  return (
                    <div className={styles.row} key={moduleKey}>
                      <span>{mod}</span>
                      {permissions.map((perm) => {
                        const isApprovalWorkflow = mod === "Approval Workflow";
                        let isDisabled =
                          isApprovalWorkflow &&
                          (perm === "Add" || perm === "Delete");
                        const triggers = ["Add", "Edit", "Delete"];
                        if (!isDisabled && perm === "View") {
                          const anyTriggerChecked = triggers.some((t) =>
                            form.permissions[moduleKey]?.includes(t)
                          );
                          if (anyTriggerChecked) isDisabled = true;
                        }
                        return (
                          <input
                            key={perm}
                            type="checkbox"
                            checked={
                              form.permissions[moduleKey]?.includes(perm) ||
                              false
                            }
                            disabled={isDisabled}
                            onChange={() =>
                              !isDisabled &&
                              handlePermissionToggle(moduleKey, perm)
                            }
                            className={styles.activePlantCheckbox}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.sectionCard}>
            <label className={styles.formLabel}>
              Central Master Permission
            </label>
            <div className={styles.chipGroup}>
              <label
                className={`${styles.chip} ${
                  form.centralPermission ? styles.chipActive : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.centralPermission}
                  onChange={(e) =>
                    setForm({ ...form, centralPermission: e.target.checked })
                  }
                />
                Central Master
              </label>
            </div>
          </div>

          {form.centralPermission && (
            <div className={`${styles.centralSection} ${styles.fadeIn}`}>
              <label className={styles.sectionTitle}>
                Module Permissions for Central Master
              </label>
              <div className={styles.table}>
                <div className={styles.rowHeader}>
                  <span>Module Name</span>
                  {permissions.map((perm) => (
                    <span key={perm}>{perm}</span>
                  ))}
                </div>
                {[
                  "Role Master",
                  "Vendor Master",
                  "Plant Master",
                  "Application Master",
                  "Approval Workflow",
                  // "User Request" removed as per requirement
                ].map((mod) => (
                  <div className={styles.row} key={`central-${mod}`}>
                    <span>{mod}</span>
                    {permissions.map((perm) => {
                      let isDisabled = false;
                      const triggers = ["Add", "Edit", "Delete"];
                      if (perm === "View") {
                        const anyTriggerChecked = triggers.some((t) =>
                          form.permissions[mod]?.includes(t)
                        );
                        if (anyTriggerChecked) isDisabled = true;
                      }
                      return (
                        <input
                          key={perm}
                          type="checkbox"
                          checked={
                            form.permissions[mod]?.includes(perm) || false
                          }
                          disabled={isDisabled}
                          onChange={() =>
                            !isDisabled && handlePermissionToggle(mod, perm)
                          }
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.sectionCard}>
            <div className={styles.commentBox}>
              <label htmlFor="comment">Comment</label>
              <textarea
                id="comment"
                placeholder="Enter comment here..."
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
            </div>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving
                ? mode === "edit"
                  ? "Updating..."
                  : "Saving..."
                : mode === "edit"
                ? "Update User"
                : "Save User"}
            </button>
          </div>
        </div>
      </form>

      {showModal && (
        <ConfirmLoginModal
          title={mode === "edit" ? "Confirm Edit" : "Confirm Add"}
          description={
            mode === "edit"
              ? "Please confirm editing this user by entering your password."
              : "Please confirm adding a new user by entering your password."
          }
          username={username}
          onConfirm={handleConfirmLogin}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default AddUserPanel;
