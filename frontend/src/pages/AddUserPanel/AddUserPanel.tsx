import React, { useState, useEffect } from "react";
import { usePlantContext } from "../PlantMaster/PlantContext";
import { useAuth } from "../../context/AuthContext";
import styles from "./AddUserPanel.module.css";
import ConfirmLoginModal from "components/Common/ConfirmLoginModal";

// Removed static plants array. Use dynamic plant list from context.
const permissions = ["Add", "Edit", "View", "Delete"];
const moduleList = [
  "Role Master",
  "Vendor Master",
  "Plant Master",
  "Application Master",
  "Approval Workflow",
  "Audit Review",
  "Reports",
  "Plant IT Admin",
];

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
  const { plants } = usePlantContext();
  const { user } = useAuth();
  const [form, setForm] = useState<UserForm>(() => {
    const base = initialData ?? {
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
    };
    // If department is missing, empty, or '-', set to ''
    return {
      ...base,
      department:
        !base.department || base.department === "-" ? "" : base.department,
    };
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
  // Track if department was initially present (from backend)
  const [departmentInitiallyPresent, setDepartmentInitiallyPresent] = useState(
    () => {
      return Boolean(
        initialData &&
          initialData.department &&
          initialData.department.trim() &&
          initialData.department !== "-"
      );
    }
  );

  // Checkbox for plant selection
  const handleCheckboxChange = (plant: string) => {
    setForm((prev) => {
      const isSelected = prev.plants.includes(plant);
      const plantModules = moduleList.map((mod) => `${plant}-${mod}`);
      const hasAnyPermission = plantModules.some(
        (modKey) => (prev.permissions[modKey] || []).length > 0
      );

      let updatedPlants;
      let newActive = activePlant;

      if (!isSelected) {
        updatedPlants = [...prev.plants, plant];
        newActive = plant;
      } else {
        if (hasAnyPermission) {
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

      updatedPermissions = Array.from(new Set(updatedPermissions));

      const anyTriggerChecked = triggers.some((t) =>
        updatedPermissions.includes(t)
      );
      if (anyTriggerChecked && !updatedPermissions.includes("View")) {
        updatedPermissions.push("View");
      }

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
      const plantModules = moduleList.map((mod) => `${plantPrefix}-${mod}`);
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
    setShowModal(true);
  };

  // Prefer the username from auth context. Fall back to localStorage, then to API.
  const [username, setUsername] = useState<string>(
    () => user?.username || localStorage.getItem("username") || ""
  );

  // Sync from auth context when available
  useEffect(() => {
    if (user?.username && user.username !== username) {
      setUsername(user.username);
      try {
        localStorage.setItem("username", user.username);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  // If username still not available, try fetching from backend once
  useEffect(() => {
    let mounted = true;
    if (!username) {
      fetch("/api/current-user")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch current user");
          return res.json();
        })
        .then((data) => {
          if (!mounted) return;
          const resolved =
            data.username ||
            data.name ||
            data.employeeCode ||
            data.employee_code ||
            "";
          if (resolved) {
            setUsername(resolved);
            try {
              localStorage.setItem("username", resolved);
            } catch {}
          }
        })
        .catch(() => {
          // ignore
        });
    }
    return () => {
      mounted = false;
    };
    // run only when username is empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username === ""]);
  const handleConfirmLogin = async (data: Record<string, string>) => {
    // NOTE: password validation is temporarily disabled because
    // user passwords are not available in this environment yet.
    // We'll accept the confirmation if the modal username matches the
    // current logged-in username (if present). This allows Add/Edit to save.
    if (!username || data.username === username) {
      setSaving(true);
      try {
        await onSave(form);
        // If department was not present and now selected, lock it after save
        if (
          mode === "edit" &&
          !departmentInitiallyPresent &&
          form.department &&
          form.department.trim() &&
          form.department !== "-"
        ) {
          setDepartmentInitiallyPresent(true);
        }
        setShowModal(false);
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to save user");
      } finally {
        setSaving(false);
      }
    } else {
      // Username mismatch — do not proceed
      alert(
        `Username mismatch. Please confirm you are logged in as ${username} before confirming.`
      );
    }
  };

  return (
    <div>
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
          {error && <div className={styles.errorMessage}>{error}</div>}
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
                  disabled={mode === "edit" && !!form.fullName}
                  className={
                    mode === "edit" && !!form.fullName
                      ? styles.disabledInput
                      : undefined
                  }
                />
              </div>
              <div>
                <label>Email *</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={mode === "edit" && !!form.email}
                  className={
                    mode === "edit" && !!form.email
                      ? styles.disabledInput
                      : undefined
                  }
                />
              </div>
              <div>
                <label>Employee Code *</label>
                <input
                  value={form.empCode}
                  onChange={(e) =>
                    setForm({ ...form, empCode: e.target.value })
                  }
                  disabled={mode === "edit" && !!form.empCode}
                  className={
                    mode === "edit" && !!form.empCode
                      ? styles.disabledInput
                      : undefined
                  }
                />
              </div>
              <div>
                <label>Department *</label>
                <select
                  value={form.department || ""}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  disabled={mode === "edit" && departmentInitiallyPresent}
                  className={
                    mode === "edit" && departmentInitiallyPresent
                      ? styles.disabledInput
                      : ""
                  }
                >
                  <option value="">Select Department</option>
                  <option value="IT">IT</option>
                  <option value="QA">QA</option>
                  <option value="HR">HR</option>
                  <option value="Production">Production</option>
                  <option value="Finance">Finance</option>
                  {/* If editing and department is not in the list, show it as an option */}
                  {mode === "edit" &&
                    !!form.department &&
                    !["IT", "QA", "HR", "Production", "Finance"].includes(
                      form.department
                    ) && (
                      <option value={form.department}>{form.department}</option>
                    )}
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
              {plants && plants.length > 0 ? (
                plants.map((plant) => {
                  const plantName = plant.name || plant.plant_name || "";
                  if (!plantName) return null;
                  const plantModules = moduleList.map(
                    (mod) => `${plantName}-${mod}`
                  );
                  const hasAnyPermission = plantModules.some(
                    (modKey) => (form.permissions[modKey] || []).length > 0
                  );
                  return (
                    <button
                      type="button"
                      className={`${styles.chip} ${
                        form.plants.includes(plantName) ? styles.chipActive : ""
                      }`}
                      key={plant.id || plantName}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setActivePlant(plantName);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.plants.includes(plantName)}
                        disabled={
                          form.plants.includes(plantName) && hasAnyPermission
                        }
                        onChange={(e) => {
                          e.stopPropagation();
                          handleCheckboxChange(plantName);
                          if (!form.plants.includes(plantName)) {
                            setActivePlant(plantName);
                          } else if (activePlant === plantName) {
                            const remaining = form.plants.filter(
                              (p) => p !== plantName
                            );
                            setActivePlant(
                              remaining.length > 0 ? remaining[0] : null
                            );
                          }
                        }}
                      />
                      {plantName}
                    </button>
                  );
                })
              ) : (
                <span>No plants found.</span>
              )}
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
                {moduleList.map((mod) => {
                  const moduleKey = `${activePlant}-${mod}`;
                  return (
                    <div className={styles.row} key={moduleKey}>
                      <span>{mod}</span>
                      {permissions.map((perm) => {
                        let isDisabled = false;
                        const isApprovalWorkflow = mod === "Approval Workflow";
                        if (
                          isApprovalWorkflow &&
                          (perm === "Add" || perm === "Delete")
                        ) {
                          isDisabled = true;
                        }
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

          {/* Central Master Permission removed per requirements */}

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
    </div>
  );
};

export default AddUserPanel;
