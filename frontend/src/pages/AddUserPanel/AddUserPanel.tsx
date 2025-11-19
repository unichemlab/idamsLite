import React, { useState, useEffect } from "react";
import { usePlantContext } from "../PlantMaster/PlantContext";
import { useAuth } from "../../context/AuthContext";
import { useDepartmentContext } from "../DepartmentMaster/DepartmentContext";
import styles from "./AddUserPanel.module.css";
import ConfirmLoginModal from "components/Common/ConfirmLoginModal";

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
  const { departments } = useDepartmentContext();
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
    const initialDept = base.department ?? (base as any).department_id ?? "";
    const deptString =
      !initialDept || initialDept === "-" ? "" : String(initialDept);
    return {
      ...base,
      department: deptString,
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
  const [toast, setToast] = useState<{
    message: string;
    type?: "info" | "error" | "success";
  } | null>(null);
  const toastTimerRef = React.useRef<number | null>(null);
  const [departmentInitiallyPresent, setDepartmentInitiallyPresent] = useState(
    () => {
      const dept =
        (initialData as any)?.department ?? (initialData as any)?.department_id;
      return Boolean(dept && String(dept).trim() && String(dept) !== "-");
    }
  );

  useEffect(() => {
    if (!initialData) return;
    const deptVal =
      (initialData as any).department ?? (initialData as any).department_id;
    if (!deptVal) return;
    const deptId = Number(deptVal);
    if (Number.isNaN(deptId)) return;
    if (departments && departments.length > 0) {
      const found = departments.find((d) => d.id === deptId);
      if (found) {
        setForm((prev) => ({
          ...prev,
          department: found.name || found.department_name || String(deptVal),
        }));
      }
    }
  }, [departments, initialData]);

  // If editing an existing user, fetch plant-level permissions and populate form
  useEffect(() => {
    let mounted = true;
    const loadPlantPermissions = async () => {
      try {
        const id = (initialData as any)?.id;
        if (!id) return;
        const res = await fetch(`/api/users/${id}/plant-permissions`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        const mapped = data.mappedPermissions || {};
        // Only include keys that look like "Plant-Module"
        const filtered: Record<string, string[]> = {};
        Object.keys(mapped).forEach((k) => {
          if (k && k.includes("-")) {
            filtered[k] = mapped[k];
          }
        });
        setForm((prev) => ({
          ...prev,
          permissions:
            Object.keys(filtered).length > 0 ? filtered : prev.permissions,
          // ensure plants include any plant names derived from mapped keys
          plants: Array.from(
            new Set([
              ...prev.plants,
              ...(Object.keys(filtered)
                .map((k) => (k.includes("-") ? k.split("-")[0] : null))
                .filter(Boolean) as string[]),
            ])
          ),
        }));
      } catch (e) {
        // ignore load errors
      }
    };
    if (mode === "edit" && initialData) loadPlantPermissions();
    return () => {
      mounted = false;
    };
  }, [initialData, mode]);

  // Plant selection logic
  const handleCheckboxChange = (plant: string) => {
    let shouldShowError = false;
    setForm((prev) => {
      const isSelected = prev.plants.includes(plant);

      // If trying to select a new plant, check if any selected plant has no permissions
      if (!isSelected) {
        const anySelectedWithoutPerm = prev.plants.some((p) => {
          const pModules = moduleList.map((mod) => `${p}-${mod}`);
          return !pModules.some(
            (modKey) => (prev.permissions[modKey] || []).length > 0
          );
        });
        if (anySelectedWithoutPerm) {
          shouldShowError = true;
          // Do NOT update form state or activePlant at all, just return prev
          return prev;
        }
      }

      // proceed with toggling selection
      const plantModulesLocal = moduleList.map((mod) => `${plant}-${mod}`);
      const hasAnyPermissionLocal = plantModulesLocal.some(
        (modKey) => (prev.permissions[modKey] || []).length > 0
      );

      let updatedPlantsLocal: string[] = [...prev.plants];
      let newActiveLocal = activePlant;

      if (!isSelected) {
        updatedPlantsLocal = [...new Set([...prev.plants, plant])];
        newActiveLocal = plant;
      } else {
        // remove plant only if it has no permissions
        if (hasAnyPermissionLocal) {
          shouldShowError = true;
          // Do NOT update form state or activePlant at all, just return prev
          return prev;
        } else {
          updatedPlantsLocal = prev.plants.filter((p) => p !== plant);
          if (plant === activePlant) {
            newActiveLocal =
              updatedPlantsLocal.length > 0 ? updatedPlantsLocal[0] : null;
          }
        }
      }

      // Only update activePlant if no error
      if (!shouldShowError) {
        setActivePlant(newActiveLocal);
      }

      return {
        ...prev,
        plants: updatedPlantsLocal,
      };
    });
    if (shouldShowError) {
      setToast({
        message:
          "Please assign at least one permission (Add/Edit/View/Delete) to the already selected plant before selecting another.",
        type: "error",
      });
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
    }
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

      // Update permissions and plants for the plant
      const plantPrefix = module.split("-")[0];
      const plantModulesLocal = moduleList.map(
        (mod) => `${plantPrefix}-${mod}`
      );
      // Check if any permission exists for this plant after update
      const hasAnyPermissionLocal = plantModulesLocal.some((modKey) =>
        modKey === module
          ? updatedPermissions.length > 0
          : (prev.permissions[modKey] || []).length > 0
      );
      let updatedPlantsLocal = [...prev.plants];
      if (!hasAnyPermissionLocal) {
        updatedPlantsLocal = prev.plants.filter((p) => p !== plantPrefix);
        // If the activePlant is removed, set activePlant to another plant or null
        if (plantPrefix === activePlant) {
          setActivePlant(
            updatedPlantsLocal.length > 0 ? updatedPlantsLocal[0] : null
          );
        }
      }
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [module]: updatedPermissions,
        },
        plants: updatedPlantsLocal,
      };
    });
  };

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

  const [username, setUsername] = useState<string>(
    () => user?.username || localStorage.getItem("username") || ""
  );

  useEffect(() => {
    if (user?.username && user.username !== username) {
      setUsername(user.username);
      try {
        localStorage.setItem("username", user.username);
      } catch {}
    }
  }, [user?.username, username]);

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
        .catch(() => {});
    }
    return () => {
      mounted = false;
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [username]);

  const handleConfirmLogin = async (data: Record<string, string>) => {
    if (!username || data.username === username) {
      setSaving(true);
      try {
        await onSave(form);
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
      setToast({
        message: `Username mismatch. Please confirm you are logged in as ${username} before confirming.`,
        type: "error",
      });
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div>
      <form
        className={`${styles.panel} ${panelClassName}`}
        onSubmit={handleSubmit}
      >
        {toast && (
          <div
            className={`${styles.toast} ${
              toast.type === "error" ? styles.toastError : styles.toastInfo
            }`}
          >
            {toast.message}
          </div>
        )}
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
                      style={{
                        cursor: form.plants.includes(plantName)
                          ? "pointer"
                          : "not-allowed",
                      }}
                      onClick={() => {
                        // Only allow clicking card to set activePlant if plant is checked
                        if (form.plants.includes(plantName)) {
                          setActivePlant(plantName);
                        }
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
