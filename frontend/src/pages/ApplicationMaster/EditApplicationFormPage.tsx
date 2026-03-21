import React, { useState, useEffect } from "react";
import { API_BASE } from "../../utils/api";
import Select from "react-select";
import ConfirmLoginModal from "../../components/Common/ConfirmLoginModal";
import AppHeader from "../../components/Common/AppHeader";
import addStyles from "../Plant/AddPlantMaster.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useApplications } from "../../context/ApplicationsContext";
import { useAuth } from "../../context/AuthContext";
import { FaLock, FaUnlock } from "react-icons/fa";
import { sortByString } from "../../utils/sortHelpers";

const EditApplicationFormPage: React.FC = () => {
  const token = localStorage.getItem("token");
  const location = useLocation();
  const navigate = useNavigate();
  const { setApplications } = useApplications();
  const { user } = useAuth();
  const [inventoryOptions, setInventoryOptions] = useState<any[]>([]);
  const username = user?.username || "";

  const { applicationData } = location.state || {};

  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const { plants } = require("../Plant/PlantContext").usePlantContext();
  const plantOptions = Array.isArray(plants)
    ? plants
      .filter((plant: any) => {
        // 🔥 Super Admin → all plants
        if (
          user?.role_id === 1 ||
          (Array.isArray(user?.role_id) && user?.role_id.includes(1)) ||
          user?.isSuperAdmin
        ) {
          return true;
        }

        const plantId = Number(plant.id);

        // 🔒 IT Bin access
        // if (user?.isITBin && Array.isArray(user?.itPlantIds)) {
        //   return user.itPlantIds.includes(plantId);
        // }

        // 🔒 Normal permitted plants
        if (Array.isArray(user?.permittedPlantIds)) {
          return user?.permittedPlantIds.includes(plantId);
        }

        return false;
      })
      .map((plant: any) => ({
        value: String(plant.id),
        label: plant.plant_name || plant.name || String(plant.id),
      }))
    : [];
  const { departments } =
    require("..//DepartmentTable/DepartmentContext").useDepartmentContext();
  const departmentOptions = Array.isArray(departments)
    ? departments.map((dept: any) => ({
      value: String(dept.id),
      label: dept.department_name || dept.name || String(dept.id),
    }))
    : [];

  type FormType = {
    id: number;
    plant_location_id: string;
    department_id: string;
    application_hmi_name: string;
    application_hmi_version: string;
    equipment_instrument_id: string;
    application_hmi_type: string;
    display_name: string;
    role_id: string[];
    system_name: string;
    system_inventory_id: string;
    multiple_role_access: boolean;
    status: string;
  };
  console.log("application data", applicationData);
  const [form, setForm] = useState<FormType>(() => {
    if (applicationData) {
      return {
        id: applicationData.id,
        plant_location_id: String(applicationData.plant_location_id || ""),
        department_id: String(applicationData.department_id || ""),
        application_hmi_name: applicationData.application_hmi_name || "",
        application_hmi_version: applicationData.application_hmi_version || "",
        equipment_instrument_id: applicationData.equipment_instrument_id || "",
        application_hmi_type:
          applicationData.application_hmi_type || "Application",
        display_name: applicationData.display_name || "",
        role_id: applicationData.role_id
          ? String(applicationData.role_id)
            .split(",")
            .map((id: string) => id.trim())
          : [],
        system_name: applicationData.system_name || "",
        system_inventory_id: String(applicationData.system_inventory_id || ""),
        multiple_role_access: !!applicationData.multiple_role_access,
        status: applicationData.status || "ACTIVE",
      };
    }
    return {
      id: 0,
      plant_location_id: "",
      department_id: "",
      application_hmi_name: "",
      application_hmi_version: "",
      equipment_instrument_id: "",
      application_hmi_type: "Application",
      display_name: "",
      role_id: [],
      system_name: "",
      system_inventory_id: "",
      multiple_role_access: false,
      status: "ACTIVE",
    };
  });
  console.log("form data", form);
  const [roleLocked, setRoleLocked] = useState<boolean>(true);
  const [showModal, setShowModal] = useState(false);

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showApprovalNotice, setShowApprovalNotice] = useState(false);  // ✅ NEW
  const [approvalMessage, setApprovalMessage] = useState("");      // ✅ NEW
  useEffect(() => {
    setRoleLocked(true);
  }, [applicationData?.id]);

  useEffect(() => {
    fetch(`${API_BASE}/api/roles`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch roles");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setRoles(
            sortByString(data.map((r: any) => ({
              id: String(r.id),
              name: r.role_name,
            })), "name", "asc")
          );
        }
      })
      .catch((err) => {
        console.error("Role fetch error:", err);
      });
  }, [token]);
  const generateDisplayName = (data: FormType) => {
    return `${data.application_hmi_name || ""} | ${data.application_hmi_version || ""} | ${data.equipment_instrument_id || ""}`;
  };


  // const handleChange = (
  //   e: React.ChangeEvent<
  //     HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  //   >
  // ) => {
  //   const target = e.target as HTMLInputElement | HTMLSelectElement;
  //   const { name, value, type } = target;
  //   const checked =
  //     type === "checkbox" ? (target as HTMLInputElement).checked : undefined;
  //   setForm((prev) => {
  //     const updated = {
  //       ...prev,
  //       [name]: type === "checkbox" ? checked : value,
  //     };
  //     if (
  //       [
  //         "application_hmi_name",
  //         "application_hmi_version",
  //         "equipment_instrument_id",
  //       ].includes(name)
  //     ) {
  //       updated.display_name = `${name === "application_hmi_name" ? value : updated.application_hmi_name
  //         } | ${name === "application_hmi_version"
  //           ? value
  //           : updated.application_hmi_version
  //         } | ${name === "equipment_instrument_id"
  //           ? value
  //           : updated.equipment_instrument_id
  //         }`;
  //     }
  //     return updated;
  //   });
  // };


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (
        ["application_hmi_name", "application_hmi_version", "equipment_instrument_id"].includes(name)
      ) {
        updated.display_name = generateDisplayName(updated);
      }

      return updated;
    });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1️⃣ Validate roles
    if (!form.role_id || form.role_id.length === 0) {
      alert("Please select at least one role before updating.");
      return;
    }

    // 2️⃣ Duplicate combination check (excludes current record)
    try {
      const checkRes = await fetch(`${API_BASE}/api/applications/check-duplicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plant_location_id: form.plant_location_id,
          department_id: form.department_id,
          application_hmi_type: form.application_hmi_type,
          equipment_instrument_id: form.equipment_instrument_id,
          excludeId: form.id,
        }),
      });

      if (checkRes.status === 409) {
        const errData = await checkRes.json();
        alert(errData.error || "Duplicate combination found.");
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

    // 3️⃣ All validations passed — open confirmation modal
    setShowModal(true);
  };

  // ─────────────────────────────────────────────────────────────
  // STEP 2 — Replace handleConfirm 
  // ─────────────────────────────────────────────────────────────

  const handleConfirm = async (data: Record<string, string>) => {
    if (data.username === username && data.password) {
      try {
        const payload = {
          ...form,
          role_id: Array.isArray(form.role_id)
            ? form.role_id.join(",")
            : form.role_id,
          plant_location_id: form.plant_location_id ? Number(form.plant_location_id) : null,
          department_id: form.department_id ? Number(form.department_id) : null,
          system_inventory_id: form.system_inventory_id ? Number(form.system_inventory_id) : null,
          role_lock: true,
        };

        const res = await fetch(`${API_BASE}/api/applications/${form.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update application");
        }

        const result = await res.json();
        setShowModal(false);

        // ✅ Show approval notice modal instead of alert
        if (result?.approvalId && result?.status === "PENDING_APPROVAL") {
          setApprovalMessage(
            `${result.message}\n\nApproval ID: ${result.approvalId}\n\nThe application will be updated after approval.`
          );
          setShowApprovalNotice(true);
        } else {
          // Direct update — refresh list and navigate
          setApplications((prev: any[]) =>
            prev.map((app) => (app.id === result.id ? { ...app, ...result } : app))
          );
          setRoleLocked(true);
          alert("Application updated successfully!");
          navigate("/application-masters", { state: { activeTab: "application" } });
        }
      } catch (err) {
        alert(
          "Failed to update application. Please try again.\n" +
          (err instanceof Error ? err.message : "")
        );
      }
    } else {
      alert("Invalid credentials. Please try again.");
    }
  };


  // ─────────────────────────────────────────────────────────────
  // STEP 3 — Add handleApprovalNoticeClose (after handleUnlockConfirm)
  // ─────────────────────────────────────────────────────────────

  const handleApprovalNoticeClose = () => {
    setShowApprovalNotice(false);
    navigate("/application-masters", { state: { activeTab: "application" } });
  };

  const handleUnlockConfirm = (data: Record<string, string>) => {
    if (data.username === username && data.password) {
      setRoleLocked(false);
      setShowUnlockModal(false);
    } else {
      alert("Invalid credentials. Please try again.");
    }
  };

  useEffect(() => {
    // 🔹 HMI type uses a free-text input — no inventory fetch needed
    if (form.application_hmi_type === "HMI") {
      setInventoryOptions([]);
      return;
    }

    // 🔹 Only fetch inventory if both plant and department are selected
    if (!form.plant_location_id || !form.department_id) {
      setInventoryOptions([]);
      // Reset equipment_instrument_id & related fields only for Application type
      setForm((prev) => ({
        ...prev,
        equipment_instrument_id: "",
        system_name: "",
        system_inventory_id: "",
        display_name: generateDisplayName({
          ...prev,
          equipment_instrument_id: "",
        }),
      }));
      return;
    }

    const fetchInventory = async () => {
      try {
        const params = new URLSearchParams();
        params.append("plant_id", form.plant_location_id);
        params.append("department_id", form.department_id);

        const systemUrl = `${API_BASE}/api/systems/list?${params.toString()}`;
        const serverUrl = `${API_BASE}/api/servers/list?${params.toString()}`;

        const authHeaders = { Authorization: `Bearer ${token}` };

        // 🔹 Fetch both APIs in parallel
        const [systemRes, serverRes] = await Promise.all([
          fetch(systemUrl, { headers: authHeaders }),
          fetch(serverUrl, { headers: authHeaders }),
        ]);

        const systemJson = await systemRes.json();
        const serverJson = await serverRes.json();

        const systemData = Array.isArray(systemJson) ? systemJson : [];
        const serverData = Array.isArray(serverJson) ? serverJson : [];

        const systemOptions = systemData.map((row: any) => ({
          value: String(row.equipment_instrument_id),
          label: `${row.equipment_instrument_id} (${row.host_name})`,
          hostname: row.host_name,
          system_inventory_id: String(row.id),
        }));

        const serverOptions = serverData.map((row: any) => ({
          value: String(row.application),
          label: `${row.application} (${row.host_name})`,
          hostname: row.host_name,
          system_inventory_id: "", // keep empty
        }));

        setInventoryOptions([
          { label: "System Inventory", options: systemOptions },
          { label: "Server Inventory", options: serverOptions },
        ]);

        // 🔹 If current equipment_instrument_id is not in new options, reset
        // (only for Application type — HMI type is handled above)
        const allValues = [...systemOptions, ...serverOptions].map((o) => o.value);
        if (!allValues.includes(form.equipment_instrument_id)) {
          setForm((prev) => ({
            ...prev,
            equipment_instrument_id: "",
            system_name: "",
            system_inventory_id: "",
            display_name: generateDisplayName({
              ...prev,
              equipment_instrument_id: "",
            }),
          }));
        }
      } catch (err) {
        console.error("Failed to load inventory list", err);
        setInventoryOptions([]);
      }
    };

    fetchInventory();
  }, [form.plant_location_id, form.department_id, form.application_hmi_type, token]);


  return (
    <React.Fragment>
      {showModal && (
        <ConfirmLoginModal
          username={username}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
        />
      )}
      {showUnlockModal && (
        <ConfirmLoginModal
          username={username}
          onConfirm={handleUnlockConfirm}
          onCancel={() => setShowUnlockModal(false)}
        />
      )}

      {showApprovalNotice && (
        <div className={addStyles.modalOverlay}>
          <div className={addStyles.approvalModal}>
            <div className={addStyles.approvalIcon}>⏳</div>
            <h3 className={addStyles.approvalTitle}>Approval Required</h3>
            <p className={addStyles.approvalMessage}>{approvalMessage}</p>
            <button
              onClick={handleApprovalNoticeClose}
              className={addStyles.approvalOkBtn}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className={addStyles.pageWrapper}>
        <AppHeader title="Application Master Management" />

        <div className={addStyles.contentArea}>
          {/* Breadcrumb */}
          <div className={addStyles.breadcrumb}>
            <span
              className={addStyles.breadcrumbLink}
              onClick={() =>
                navigate("/application-masters", {
                  state: { activeTab: "application" },
                })
              }
            >
              Application Master
            </span>
            <span className={addStyles.breadcrumbSeparator}>›</span>
            <span className={addStyles.breadcrumbCurrent}>Edit Application</span>
          </div>

          {/* Form Card */}
          <div className={addStyles.formCard}>
            <div className={addStyles.formHeader}>
              <h2>Edit Application</h2>
              <p>Update application details in the system</p>
            </div>

            <form className={addStyles.form} onSubmit={handleSubmit}>
              {/* 🔥 FIXED: Changed overflow to visible */}
              <div className={addStyles.scrollFormContainer} style={{ overflow: 'visible' }}>
                {/* Row 1 - 3 Columns */}
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroupFloating}>

                    <Select
                      name="plant_location_id"
                      required
                      options={plantOptions}
                      value={
                        plantOptions.find(
                          (opt: any) =>
                            String(opt.value) === String(form.plant_location_id)
                        ) || null
                      }
                      onChange={(selected: any) =>
                        setForm((prev) => ({
                          ...prev,
                          plant_location_id: selected ? selected.value : "",
                        }))
                      }
                      placeholder="Select Plant Location"
                      isClearable={false}
                      isSearchable={true}
                      styles={{
                        menu: (base) => ({ ...base, zIndex: 999 }),
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        control: (base) => ({
                          ...base,
                          minHeight: 38,
                          fontSize: 15,
                          border: '2px solid #e2e8f0',
                          borderRadius: '10px',
                        }),
                      }}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                    <label className={addStyles.floatingLabel}>
                      Plant Location <span className={addStyles.required}>*</span>
                    </label>
                  </div>

                  <div className={addStyles.formGroupFloating}>

                    <Select
                      name="department_id"
                      required
                      options={departmentOptions}
                      value={
                        departmentOptions.find(
                          (opt: any) =>
                            String(opt.value) === String(form.department_id)
                        ) || null
                      }
                      onChange={(selected: any) =>
                        setForm((prev) => ({
                          ...prev,
                          department_id: selected ? selected.value : "",
                        }))
                      }
                      placeholder="Select Department"
                      isClearable={false}
                      isSearchable={true}
                      styles={{
                        menu: (base) => ({ ...base, zIndex: 999 }),
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        control: (base) => ({
                          ...base,
                          minHeight: 38,
                          fontSize: 15,
                          border: '2px solid #e2e8f0',
                          borderRadius: '10px',
                        }),
                      }}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                    <label className={addStyles.floatingLabel}>
                      Department <span className={addStyles.required}>*</span>
                    </label>
                  </div>

                  <div className={addStyles.formGroupFloating}>

                    <input
                      className={addStyles.input}
                      name="application_hmi_name"
                      value={form.application_hmi_name}
                      onChange={handleChange}
                      required
                      placeholder="Enter Application/HMI Name"
                    />
                    <label className={addStyles.floatingLabel}>
                      Application/HMI Name{" "}
                      <span className={addStyles.required}>*</span>
                    </label>
                  </div>
                </div>

                {/* Row 2 - 3 Columns */}
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroupFloating}>
                    <label className={addStyles.floatingLabel}>
                      Application/HMI Version{" "}
                      <span className={addStyles.required}>*</span>
                    </label>
                    <input
                      className={addStyles.input}
                      name="application_hmi_version"
                      value={form.application_hmi_version}
                      onChange={handleChange}
                      required
                      placeholder="Enter Application/HMI Version"
                    />
                  </div>
                  <div className={addStyles.formGroupFloating}>

                    <select
                      className={addStyles.select}
                      name="application_hmi_type"
                      value={form.application_hmi_type}
                      onChange={handleChange}
                      required
                    >
                      <option value="Application">Application</option>
                      <option value="HMI">HMI</option>
                    </select>
                    <label className={addStyles.floatingLabel}>
                      Application/HMI Type{" "}
                      <span className={addStyles.required}>*</span>
                    </label>
                  </div>

                  <div className={addStyles.formGroupFloating}>

                    {form.application_hmi_type === "Application" ? (
                      <Select
                        classNamePrefix="reactSelect"
                        required
                        isSearchable
                        options={inventoryOptions}
                        value={inventoryOptions
                          .flatMap(group => group.options)   // flatten all options
                          .find(opt => opt.value === form.equipment_instrument_id) || null}
                        onChange={(selected: any) => {
                          if (!selected) return;

                          setForm(prev => {
                            const updated = {
                              ...prev,
                              equipment_instrument_id: selected.value,
                              system_name: selected.hostname,
                              system_inventory_id: selected.system_inventory_id
                            };

                            // 🔥 IMPORTANT: regenerate display_name
                            updated.display_name = generateDisplayName(updated);

                            return updated;
                          });
                        }}
                        placeholder="Search Equipment"
                        styles={{
                          menu: (base) => ({ ...base, zIndex: 999 }),
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        }}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />

                    ) : (
                      <input
                        className={addStyles.input}
                        name="equipment_instrument_id"
                        value={form.equipment_instrument_id || ""}
                        onChange={handleChange}
                        placeholder={form.equipment_instrument_id ? "" : "Enter Equipment ID1"}
                        required
                      />
                    )}

                    <label className={addStyles.floatingLabel}>
                      Equipment / Instrument ID <span className={addStyles.required}>*</span>
                    </label>
                  </div>



                </div>

                {/* Row 3 - 3 Columns */}
                <div className={addStyles.rowFields}>
                  {form.application_hmi_type === "Application" && (
                    <>
                      <div className={addStyles.formGroupFloating}>
                        <input
                          className={addStyles.input}
                          value={form.system_name}
                          readOnly
                        />
                        <label className={addStyles.floatingLabel}>
                          System Name (Hostname)
                        </label>
                      </div>

                      <div className={addStyles.formGroupFloating}>
                        <input
                          className={addStyles.input}
                          value={form.system_inventory_id}
                          readOnly
                        />
                        <label className={addStyles.floatingLabel}>
                          System Inventory ID
                        </label>
                      </div>
                    </>
                  )}


                  <div className={addStyles.formGroupFloating}>

                    <select
                      id="status"
                      className={addStyles.select}
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      required
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                    <label className={addStyles.floatingLabel}>
                      Status <span className={addStyles.required}>*</span>
                    </label>
                  </div>
                </div>

                {/* Row 4 - Roles and Multiple Role Access - 2 Columns */}
                <div className={addStyles.rowFields} style={{ gridTemplateColumns: '2fr 1fr' }}>
                  <div className={addStyles.formGroupFloating}>

                    <Select
                      id="role_id"
                      isMulti
                      isSearchable
                      required
                      name="role_id"
                      options={roles.map((r) => ({
                        value: r.id,
                        label: r.name,
                      }))}
                      value={roles
                        .filter((r) => form.role_id.includes(r.id))
                        .map((r) => ({ value: r.id, label: r.name }))}
                      onChange={(selected: any) => {
                        setForm((prev) => ({
                          ...prev,
                          role_id: Array.isArray(selected)
                            ? selected.map((s) => s.value)
                            : [],
                        }));
                      }}
                      placeholder="Select roles..."
                      styles={{
                        menu: (base) => ({ ...base, zIndex: 999 }),
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        control: (base) => ({
                          ...base,
                          minHeight: 38,
                          fontSize: 15,
                          border: '2px solid #e2e8f0',
                          borderRadius: '10px',
                        }),
                      }}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      isDisabled={roleLocked}
                    />
                    <label
                      className={addStyles.floatingLabel}
                      htmlFor="role_id"
                      style={{
                        fontWeight: 500,
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      Roles <span className={addStyles.required}>*</span>
                      <span style={{ marginLeft: 65 }}>
                        <span
                          className={addStyles.roleLockToggle}
                          onClick={() => {
                            if (roleLocked) setShowUnlockModal(true);
                            else setRoleLocked(true);
                          }}
                          tabIndex={0}
                          aria-label="Role Lock Toggle"
                        >
                          <span
                            className={addStyles.roleLockTrack}
                            style={{
                              color: roleLocked ? "#f47c20" : "#1569B0",
                            }}
                          >
                            <span className={addStyles.roleLockLabel}>
                              {roleLocked ? "Lock" : "Unlock"}
                            </span>
                            <span
                              className={addStyles.roleLockCircle}
                              style={{
                                left: roleLocked ? 52 : 4,
                                background: "#fff",
                              }}
                            >
                              {roleLocked ? (
                                <FaLock size={14} color="#f47c20" />
                              ) : (
                                <FaUnlock size={14} color="#1569B0" />
                              )}
                            </span>
                          </span>
                        </span>
                      </span>
                    </label>
                  </div>

                  <div className={addStyles.formGroupFloating}>
                    <label className={addStyles.floatingLabel}>
                      Multiple Role Access
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <input
                        id="multiple_role_access"
                        type="checkbox"
                        name="multiple_role_access"
                        checked={form.multiple_role_access}
                        onChange={handleChange}
                        style={{ width: 20, height: 20, cursor: 'pointer' }}
                      />
                      <label htmlFor="multiple_role_access" style={{ cursor: 'pointer', fontSize: 14, color: '#64748b' }}>
                        {form.multiple_role_access ? 'Yes' : 'No'}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className={addStyles.formFotter}>
                <div
                  className={addStyles.buttonRow}
                  style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    gap: 24,
                    margin: 15,
                  }}
                >
                  <button type="submit" className={addStyles.saveBtn}>
                    Update
                  </button>
                  <button
                    type="button"
                    className={addStyles.cancelBtn}
                    onClick={() => {
                      setRoleLocked(true);
                      navigate("/application-masters", {
                        state: { activeTab: "application" },
                      });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default EditApplicationFormPage;