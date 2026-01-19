// Updated AddUserPanel.tsx
import React, { useState, useEffect } from "react";
import { usePlantContext } from "../PlantMaster/PlantContext";
import { useAuth } from "../../context/AuthContext";
import { useDepartmentContext } from "../DepartmentMaster/DepartmentContext";
import styles from "../Plant/AddPlantMaster.module.css";
import ConfirmLoginModal from "components/Common/ConfirmLoginModal";
import { API_BASE } from "../../utils/api";

const permissions = ["Add", "Edit", "View", "Delete"];

// Separate plant-wise and corporate modules
const plantWiseModules = [
  "Application Master",
  "System Master",
  "Server Management",
  "Network Master",
];

const corporateModules = [
  "Approval Workflow",
  "Dashboard",
  "Department Master",
  "Plant Master",
  "Role Master",
  "Reviewer",
  "Reports",
  "Task Clouser Bin",
  "Vendor Information",
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
  corporatePermissions: {
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
}

const AddUserPanel = ({
  onClose,
  onSave,
  initialData = null,
  mode = "add",
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
      corporatePermissions: {},
      centralPermission: false,
      comment: "",
      corporateAccessEnabled: false,
    };
    const initialDept = base.department ?? (base as any).department_id ?? "";
    const deptString =
      !initialDept || initialDept === "-" ? "" : String(initialDept);
    return {
      ...base,
      permissions: base.permissions || {},
      corporatePermissions: base.corporatePermissions || {},   // ✅ GUARDED
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

  // =========================================================
  // ✅ LOAD PLANT + CENTRAL PERMISSIONS (EDIT MODE)
  // =========================================================
  useEffect(() => {
    let mounted = true;

    const loadPermissions = async () => {
      try {
        const id = (initialData as any)?.id;
        if (!id) return;

        const res = await fetch(`${API_BASE}/api/users/${id}/plant-permissions`);
        if (!res.ok) return;

        const data = await res.json();
        if (!mounted) return;

        const mapped = data.mappedPermissions || {};

        const filteredPlant: Record<string, string[]> = {};
        const filteredCentral: Record<string, string[]> = {};

        Object.entries(mapped).forEach(([key, actions]) => {
          if (!Array.isArray(actions) || actions.length === 0) return;

          // Plant permissions contain "-"
          if (key.includes("-")) {
            filteredPlant[key] = actions;
          }
          // Central permissions (no plant)
          else {
            const normalizedKey = key
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase())
              .trim();

            if (corporateModules.includes(normalizedKey)) {
              filteredCentral[normalizedKey] = actions;
            }
          }
        });

        setForm((prev) => ({
          ...prev,
          permissions:
            Object.keys(filteredPlant).length > 0
              ? filteredPlant
              : prev.permissions,
          corporatePermissions:
            Object.keys(filteredCentral).length > 0
              ? filteredCentral
              : prev.corporatePermissions,
          plants: Array.from(
            new Set(
              Object.keys(filteredPlant)
                .map((k) => k.split("-")[0])
                .filter(Boolean)
            )
          ),
        }));
      } catch (e) {
        console.warn("Failed to load permissions", e);
      }
    };

    if (mode === "edit" && initialData) loadPermissions();

    return () => {
      mounted = false;
    };
  }, [initialData, mode]);

  // =========================================================
  // Plant selection logic
  // =========================================================
  const handleCheckboxChange = (plant: string) => {
    let shouldShowError = false;

    setForm((prev) => {
      const isSelected = prev.plants.includes(plant);

      if (!isSelected) {
        const anySelectedWithoutPerm = prev.plants.some((p) => {
          const pModules = plantWiseModules.map((mod) => `${p}-${mod}`);
          return !pModules.some(
            (modKey) => (prev.permissions[modKey] || []).length > 0
          );
        });

        if (anySelectedWithoutPerm) {
          shouldShowError = true;
          return prev;
        }
      }

      const plantModulesLocal = plantWiseModules.map(
        (mod) => `${plant}-${mod}`
      );
      const hasAnyPermissionLocal = plantModulesLocal.some(
        (modKey) => (prev.permissions[modKey] || []).length > 0
      );

      let updatedPlantsLocal: string[] = [...prev.plants];
      let newActiveLocal = activePlant;

      if (!isSelected) {
        updatedPlantsLocal = [...new Set([...prev.plants, plant])];
        newActiveLocal = plant;
      } else {
        if (hasAnyPermissionLocal) {
          shouldShowError = true;
          return prev;
        } else {
          updatedPlantsLocal = prev.plants.filter((p) => p !== plant);
          if (plant === activePlant) {
            newActiveLocal =
              updatedPlantsLocal.length > 0 ? updatedPlantsLocal[0] : null;
          }
        }
      }

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
          "Please assign at least one permission to the already selected plant before selecting another.",
        type: "error",
      });
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
    }
  };

  // Permission toggle for plant-wise modules
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

      const plantPrefix = module.split("-")[0];
      const plantModulesLocal = plantWiseModules.map(
        (mod) => `${plantPrefix}-${mod}`
      );
      const hasAnyPermissionLocal = plantModulesLocal.some((modKey) =>
        modKey === module
          ? updatedPermissions.length > 0
          : (prev.permissions[modKey] || []).length > 0
      );
      let updatedPlantsLocal = [...prev.plants];
      if (!hasAnyPermissionLocal) {
        updatedPlantsLocal = prev.plants.filter((p) => p !== plantPrefix);
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

  // Permission toggle for corporate modules
  const handleCorporatePermissionToggle = (module: string, action: string) => {
    setForm((prev) => {
      let currentPermissions = prev.corporatePermissions[module] || [];
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

      return {
        ...prev,
        corporatePermissions: {
          ...prev.corporatePermissions,
          [module]: updatedPermissions,
        },
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
      } catch { }
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
            } catch { }
          }
        })
        .catch(() => { });
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

  // Helper functions for form inputs
  const input = (name: keyof UserForm, label: string, type = "text", disabled = false) => (
    <div className={styles.formGroupFloating}>
      <input
        type={type}
        name={name}
        value={(form[name] as any) || ""}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        disabled={disabled}
        className={styles.input}
        required={label.includes("*")}
      />
      <label className={styles.floatingLabel}>
        {label}
        {label.includes("*") && <span className={styles.required}> *</span>}
      </label>
    </div>
  );

  const select = (
    name: keyof UserForm,
    label: string,
    options: string[],
    isRequired = false,
    disabled = false
  ) => (
    <div className={styles.formGroupFloating}>
      <select
        name={name}
        value={(form[name] as any) || ""}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        required={isRequired}
        disabled={disabled}
        className={styles.select}
      >
        <option value="">-- Select --</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        {mode === "edit" &&
          form[name] &&
          !options.includes(form[name] as string) && (
            <option value={form[name] as string}>{form[name] as string}</option>
          )}
      </select>
      <label className={styles.floatingLabel}>
        {label}
        {isRequired && <span className={styles.required}> *</span>}
      </label>
    </div>
  );

  return (
    <div>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: toast.type === "error" ? "#dc3545" : "#0d6efd",
            color: "white",
            padding: "12px 24px",
            borderRadius: "4px",
            zIndex: 9999,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {toast.message}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} style={{ padding: 10 }}>
        <div className={styles.scrollFormContainer}>
          {error && (
            <div style={{ color: "#dc3545", padding: "12px", backgroundColor: "#f8d7da", borderRadius: "4px", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {/* User Details */}
          <div className={styles.section}>
            <span className={styles.sectionHeaderTitle}>User Details</span>
            <div className={styles.rowFields}>
              {input(
                "fullName",
                "Full Name",
                "text",
                mode === "edit" && !!form.fullName
              )}
              {input(
                "email",
                "Email",
                "email",
                mode === "edit" && !!form.email
              )}
              {input(
                "empCode",
                "Employee Code",
                "text",
                mode === "edit" && !!form.empCode
              )}
              {select(
                "department",
                "Department",
                ["IT", "QA", "HR", "Production", "Finance"],
                true,
                mode === "edit" && departmentInitiallyPresent
              )}
              {input("location", "Location")}
              {select("status", "Status", ["Active", "Inactive"], true)}
            </div>
          </div>

          {/* Plant-Wise Access */}
          <div className={styles.section}>
            <span className={styles.sectionHeaderTitle}>Plant-Wise Access</span>
            <div className={styles.rowFields1}>
              <div style={{ flex: "1 1 100%" }}>
                <p style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
                  Select plants for Application Master, System Master & Server Management modules
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {plants && plants.length > 0 ? (
                    plants.map((plant) => {
                      const plantName = plant.name || plant.plant_name || "";
                      if (!plantName) return null;
                      const plantModules = plantWiseModules.map(
                        (mod) => `${plantName}-${mod}`
                      );
                      const hasAnyPermission = plantModules.some(
                        (modKey) => (form.permissions[modKey] || []).length > 0
                      );
                      const isSelected = form.plants.includes(plantName);
                      return (
                        <label
                          key={plant.id || plantName}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "8px 16px",
                            border: isSelected ? "2px solid #0d6efd" : "1px solid #ddd",
                            borderRadius: "4px",
                            backgroundColor: isSelected ? "#e7f1ff" : "white",
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                          onClick={() => {
                            if (isSelected) {
                              setActivePlant(plantName);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isSelected && hasAnyPermission}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleCheckboxChange(plantName);
                            }}
                            style={{ marginRight: "8px" }}
                          />
                          {plantName}
                        </label>
                      );
                    })
                  ) : (
                    <span>No plants found.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Plant-Wise Module Permissions */}
          {activePlant && form.plants.includes(activePlant) && (
            <div className={styles.section}>
              <span className={styles.sectionHeaderTitle}>
                Plant-Wise Module Permissions - {activePlant}
              </span>
              <div className={styles.rowFields1} style={{ flex: "1 1 100%" }}>
                <div style={{ overflowX: "auto", width: "100%" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f5f5f5" }}>
                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd", fontWeight: 600 }}>
                          Module Name
                        </th>
                        {permissions.map((perm) => (
                          <th key={perm} style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #ddd", borderLeft: "1px solid #ddd", fontWeight: 600 }}>
                            {perm}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {plantWiseModules.map((mod) => {
                        const moduleKey = `${activePlant}-${mod}`;
                        return (
                          <tr key={moduleKey} style={{ borderBottom: "1px solid #ddd" }}>
                            <td style={{ padding: "12px", fontWeight: 500 }}>{mod}</td>
                            {permissions.map((perm) => {
                              let isDisabled = false;
                              const triggers = ["Add", "Edit", "Delete"];
                              if (perm === "View") {
                                const anyTriggerChecked = triggers.some((t) =>
                                  form.permissions[moduleKey]?.includes(t)
                                );
                                if (anyTriggerChecked) isDisabled = true;
                              }
                              return (
                                <td key={perm} style={{ padding: "12px", textAlign: "center", borderLeft: "1px solid #ddd" }}>
                                  <input
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
                                    style={{ width: "18px", height: "18px", cursor: isDisabled ? "not-allowed" : "pointer" }}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Corporate Module Permissions */}
          <div className={styles.section}>
            <span className={styles.sectionHeaderTitle}>Corporate Module Permissions</span>
            <div className={styles.rowFields1} style={{ flex: "1 1 100%" }}>
              <div style={{ overflowX: "auto", width: "100%" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f5f5f5" }}>
                      <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd", fontWeight: 600 }}>
                        Module Name
                      </th>
                      {permissions.map((perm) => (
                        <th key={perm} style={{ padding: "12px", textAlign: "center", borderBottom: "2px solid #ddd", borderLeft: "1px solid #ddd", fontWeight: 600 }}>
                          {perm}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {corporateModules.map((mod) => {
                      return (
                        <tr key={mod} style={{ borderBottom: "1px solid #ddd" }}>
                          <td style={{ padding: "12px", fontWeight: 500 }}>{mod}</td>
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
                                form.corporatePermissions[mod]?.includes(t)
                              );
                              if (anyTriggerChecked) isDisabled = true;
                            }
                            return (
                              <td key={perm} style={{ padding: "12px", textAlign: "center", borderLeft: "1px solid #ddd" }}>
                                <input
                                  type="checkbox"
                                  checked={
                                    form.corporatePermissions[mod]?.includes(perm) ||
                                    false
                                  }
                                  disabled={isDisabled}
                                  onChange={() =>
                                    !isDisabled &&
                                    handleCorporatePermissionToggle(mod, perm)
                                  }
                                  style={{ width: "18px", height: "18px", cursor: isDisabled ? "not-allowed" : "pointer" }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className={styles.section}>
            <span className={styles.sectionHeaderTitle}>Additional Details</span>
            <div className={styles.textarea1}>
              <div className={styles.formGroupFloating} style={{ flex: "1 1 100%" }}>
                <textarea
                  name="comment"
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  className={styles.textarea}
                  rows={3}
                />
                <label className={styles.floatingLabel}>Comment</label>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formFotter}>
          <div className={styles.buttonRow} style={{ display: "flex", justifyContent: "flex-start", gap: 24, margin: 15 }}>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving
                ? mode === "edit"
                  ? "Updating..."
                  : "Saving..."
                : mode === "edit"
                  ? "Update User"
                  : "Save User"}
            </button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
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