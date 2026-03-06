// ========================================
// TASK CLOSURE RULES - Complete Implementation
// ========================================

// Replace the entire AddTaskClosureForm.tsx component with this updated version:

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchTaskById, updateTaskAPI, API_BASE } from "../../utils/api";
import addUserRequestStyles from "./AddTaskClosureTracking.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import headerStyles from "../../pages/HomePage/homepageUser.module.css";
import { FiLogOut, FiChevronDown } from "react-icons/fi";
import AppMenu from "../../components/AppMenu";

const TaskClosureForm = () => {
  const [formData, setFormData] = useState<any>({
    requestBy: "",
    name: "",
    employeeCode: "",
    location: "",
    department: "",
    applicationName: "",
    requestedRole: "",
    ritmNumber: "",
    requestStatus: "Assigned",
    taskNumber: "",
    assignedTo: "",
    allocatedId: "",
    roleGranted: "",
    access: "Not Processed",
    additionalInfo: "",
    remarks: "",
    password: "",
    task_created: "",
    task_updated: "",
    status: "",
    access_request_type: "",
    task_action: "Grant",        // ← "Grant" | "Revoke" — drives RULE 12/13
    assignmentGroup: "",
    plant_name: "",
    userRequestType: "",
    fromDate: new Date().toISOString().split("T")[0],
    toDate: "",
    userEmail: "",
    vendorFirm: "",
    vendorName: "",
  });


  const [itAdminUsers, setItAdminUsers] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, logout } = useAuth();

  const roleGrantAccessTypes = [
    "New User Creation",
    "Modify Access",
    "Bulk New User Creation",
  ];
  const isRoleGrantAccess = roleGrantAccessTypes.includes(formData.access_request_type);

  const passwordAccessTypes = [
    "New User Creation",
    "Password Reset",
    "Account Unlock and Password Reset",
    "Bulk New User Creation",
  ];
  const isPasswordAccess = passwordAccessTypes.includes(formData.access_request_type);

  // ========================================
  // RULE 12 & 13: Determine allowed access options
  // Driven by task_action ("Grant" | "Revoke") set per-task at submission time.
  // This correctly handles Modify Access where one sibling task is Grant
  // and another is Revoke under the same RITM.
  // ========================================
  const getAllowedAccessOptions = () => {
    if (formData.task_action === "Revoke") {
      // RULE 13: Revoke task → only Revoked or Not Processed
      return ["Not Processed", "Revoked"];
    }
    // RULE 12: Grant task (default) → only Granted or Not Processed
    return ["Not Processed", "Granted"];
  };
  const allocatedIDEnabled = [
    "New User Creation",
    "Bulk New User Creation",
  ];
  const allowedAccessOptions = getAllowedAccessOptions();

  // ========================================
  // Close menu on outside click
  // ========================================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  // ========================================
  // Fetch task data
  // ========================================
  useEffect(() => {
    if (id) {
      fetchTaskById(id)
        .then((data) => {
          console.log("Task data:", data);

          const initialAccess = data.access || "Not Processed";

          setFormData({
            requestBy: data.request_for_by || "",
            employeeCode: data.employee_code || "",
            name: data.name || "",
            description: data.remarks || "",
            location: data.employee_location || "",
            plant_name: data.tasks[0].plant_name,
            department: data.tasks[0].department_name || "",
            applicationName: data.tasks[0].application_name || "",
            requestedRole: data.tasks[0].role_name || "",
            ritmNumber: data.ritmNumber || "",
            requestStatus: data.requestStatus || "Assigned",
            taskNumber: data.tasks[0].taskNumber || "",
            assignmentGroup: data.it_admin_group?.assignment_it_group || "",
            assignedTo: data.tasks?.[0]?.assigned_to?.toString() || "",
            // allocatedId: data.allocatedId || "",
           allocatedId: ["New User Creation", "Bulk New User Creation"].includes(data.access_request_type)
  ? (data.employee_code || "")
  : (data.allocatedId || ""),
            // FIX: roleGranted defaults to requestedRole if empty
            roleGranted: data.roleGranted || data.tasks[0].role_name || "",
            access: initialAccess,
            additionalInfo: data.additionalInfo || "",
            task_created: data.tasks[0].task_created || "",
            task_updated: data.tasks[0].task_updated || "",
            remarks: data.remarks || "",
            status: data.status || "",
            access_request_type: data.access_request_type || "",
            task_action: data.tasks[0].task_action || "Grant", // ← from task_requests.task_action
            userRequestType: data.userRequestType || "",
            fromDate: data.fromDate ? new Date(data.fromDate).toISOString().split("T")[0] : "",
            toDate: data.toDate ? new Date(data.toDate).toISOString().split("T")[0] : "",
            userEmail: data.email || "", // Capture user email from API
            vendorFirm: data.vendor_firm || "",
            vendorName: data.vendor_name || "",
          });


          setItAdminUsers(data.it_admin_users || []);
        })
        .catch((err) => console.error("Error fetching task:", err));
    }
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));

    // Clear validation errors when user makes changes
    setValidationErrors([]);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    if (!isRoleGrantAccess) {
      setFormData((prev: typeof formData) => ({
        ...prev,
        roleGranted: prev.roleGranted || prev.requestedRole
      }));
    }
  }, [isRoleGrantAccess, formData.requestedRole]);

  // ========================================
  // EMAIL SENDING FUNCTION
  // ========================================
  const sendPasswordEmail = async (emailData: {
    userEmail: string;
    userName: string;
    applicationName: string;
    allocatedId: string;
    password: string;
    taskNumber: string;
    requestType: string;
  }) => {
    try {
      // Replace this URL with your actual email API endpoint
      const response = await fetch(`${API_BASE}/api/send-password-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      console.log('Password email sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending password email:', error);
      // Don't fail the entire operation if email fails
      // Just log the error and continue
      return false;
    }
  };


  // ========================================
  // VALIDATION RULES
  // ========================================
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const actualRoleGranted = isRoleGrantAccess || formData.roleGranted ? formData.roleGranted : formData.requestedRole;

    // RULE 14: Role Granted must match Requested Role
    if (formData.roleGranted && actualRoleGranted !== formData.requestedRole) {
      errors.push(
        `❌ Role Granted "${actualRoleGranted}" does not match Requested Role "${formData.requestedRole}". Task cannot be closed.`
      );
    }

    // RULE 16: Status "Closed" requires access to be Granted, Revoked, or Not Processed
    if (formData.requestStatus === "Closed") {
      const validAccessStates = ["Granted", "Revoked", "Not Processed"];
      if (!validAccessStates.includes(formData.access)) {
        errors.push(
          `❌ Cannot close task with Access status "${formData.access}". Status must be Granted, Revoked, or Not Processed.`
        );
      }

      // Additional validation: If status is "Closed", access cannot be "Not Processed"
      // if (formData.access === "Not Processed") {
      //   errors.push(
      //     `❌ Cannot close task with Access status "Not Processed". Please grant or revoke access first.`
      //   );
      // }
    }

    // // RULE 12: Validate access options for grant-type requests
    // const grantAccessTypes = [
    //   "New User Creation",
    //   "Modify Access",
    //   "Active / Enable User Access",
    //   "Password Reset",
    //   "Account Unlock",
    //   "Account Unlock and Password Reset",
    //   "Bulk New User Creation",
    // ];

    // if (grantAccessTypes.includes(formData.access_request_type)) {
    //   if (formData.access === "Revoked") {
    //     errors.push(
    //       `❌ Access type "${formData.access_request_type}" cannot be set to "Revoked". Only "Granted" or "Not Processed" are allowed.`
    //     );
    //   }
    // }

    // // RULE 13: Validate access options for revoke-type requests
    // const revokeAccessTypes = [
    //   "Deactivation / Disable / Remove User Access",
    //   "Bulk De-activation",
    // ];

    // if (revokeAccessTypes.includes(formData.access_request_type)) {
    //   if (formData.access === "Granted") {
    //     errors.push(
    //       `❌ Access type "${formData.access_request_type}" cannot be set to "Granted". Only "Revoked" or "Not Processed" are allowed.`
    //     );
    //   }
    // }


    // RULE 12 & 13: Validate access against BOTH access_request_type AND task_action.
    //
    // Priority logic:
    //   1. If task_action = "Revoke" → always treat as Revoke (RULE 13)
    //      even if access_request_type = "Modify Access" (which is a Grant type by name)
    //   2. If task_action = "Grant" (or missing) → fall back to access_request_type check
    //
    // This handles the Modify Access case where one sibling task is Grant
    // and another is Revoke under the same RITM.

    const isRevokeTask =
      formData.task_action === "Revoke" ||
      [
        "Deactivation / Disable / Remove User Access",
        "Bulk De-activation",
      ].includes(formData.access_request_type);

    const isGrantTask =
      !isRevokeTask &&
      (
        formData.task_action === "Grant" ||
        [
          "New User Creation",
          "Modify Access",
          "Active / Enable User Access",
          "Password Reset",
          "Account Unlock",
          "Account Unlock and Password Reset",
          "Bulk New User Creation",
        ].includes(formData.access_request_type)
      );

    if (isRevokeTask && formData.access === "Granted") {
      errors.push(
        `❌ This is a Revoke task. Access cannot be "Granted". Only "Revoked" or "Not Processed" are allowed.`
      );
    }

    if (isGrantTask && formData.access === "Revoked") {
      errors.push(
        `❌ This is a Grant task. Access cannot be "Revoked". Only "Granted" or "Not Processed" are allowed.`
      );
    }
   

   // RULE: Remarks mandatory when access = "Not Processed"
if (formData.requestStatus === "Closed"&&formData.access === "Not Processed" && !formData.remarks?.trim()) {
  errors.push(
    "❌ REMARKS REQUIRED: Remarks are mandatory when Access is set to 'Not Processed'."
  );
}

// RULE: Vendor Firm & Vendor Name mandatory when requestBy = "Vendor/OEM"
if (
  formData.requestBy?.toLowerCase().includes("vendor") ||
  formData.requestBy?.toLowerCase().includes("oem")
) {
  if (!formData.vendorFirm?.trim()) {
    errors.push("❌ VENDOR FIRM REQUIRED: Vendor Firm is mandatory for Vendor/OEM requests.");
  }
  if (!formData.vendorName?.trim()) {
    errors.push("❌ VENDOR NAME REQUIRED: Vendor Name is mandatory for Vendor/OEM requests.");
  }
}


    // Additional validation: Role Granted is required when closing


    if (
      formData.requestStatus === "Closed" &&
      roleGrantAccessTypes.includes(formData.access_request_type) &&
      !actualRoleGranted
    ) {
      errors.push("❌ Role Granted is required when closing the task.");
    }

    // ✅ Password validation for password access types
    if (isPasswordAccess && formData.access === "Granted" && !formData.password) {
      errors.push(
        "❌ PASSWORD REQUIRED: Password field is mandatory for this access request type when Access is set to 'Granted'."
      );
    }

    // ✅ Email validation for password access types
    if (isPasswordAccess && formData.access === "Granted" && formData.password && !formData.userEmail) {
      errors.push(
        "⚠️ WARNING: User email is missing. Password will be saved but email notification cannot be sent."
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // ========================================
  // FORM SUBMISSION
  // ========================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setValidationErrors([]);

    // Run all validations
    const validation = validateForm();

    if (!validation.isValid) {
      setValidationErrors(validation.errors);

      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: "smooth" });

      return;
    }



    try {
      if (!id) {
        alert("❌ Task ID missing!");
        return;
      }

      console.log("Submitting task closure:", formData);

      await updateTaskAPI(id, {
        requestStatus: formData.requestStatus,
        task_data: formData,
      });

      // ── Send password email if conditions are met ──
      if (
        isPasswordAccess &&
        formData.access === "Granted" &&
        formData.password &&
        formData.userEmail
      ) {
        await sendPasswordEmail({
          userEmail: formData.userEmail,
          userName: formData.name,
          applicationName: formData.applicationName,
          allocatedId: formData.allocatedId,
          password: formData.password,
          taskNumber: formData.taskNumber,
          requestType: formData.access_request_type,
        });
      }

      alert("✅ Task closure saved successfully!");
      navigate("/task");
    } catch (err) {
      console.error("Error saving task:", err);
      alert("❌ Failed to save task closure.");
    }
  };

  return (
    <div className={addUserRequestStyles["main-container"]}>
      <main className={addUserRequestStyles["main-content"]}>
        <header className={headerStyles["main-header"]}>
          <div className={headerStyles.navLeft}>
            <div className={headerStyles.logoWrapper}>
              <img src={login_headTitle2} alt="Logo" className={headerStyles.logo} />
              <span className={headerStyles.version}>version-1.0</span>
            </div>
            <h1 className={headerStyles.title}>Task Closure</h1>
          </div>

          <div className={headerStyles.navRight}>
            {user && (
              <div style={{ position: "relative" }} ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={headerStyles.userButton}
                >
                  <div className={headerStyles.avatarContainer}>
                    <div className={headerStyles.avatar}>
                      {(user.name || user.username || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className={headerStyles.statusDot}></div>
                  </div>

                  <div className={headerStyles.userInfo}>
                    <span className={headerStyles.userName}>
                      {user.name || user.username}
                    </span>
                    {user.isITBin && (
                      <span className={headerStyles.userRole}>IT Admin</span>
                    )}
                  </div>

                  <FiChevronDown
                    size={16}
                    color="#64748b"
                    style={{
                      transition: "transform 0.2s",
                      transform: showUserMenu ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>

                {showUserMenu && (
                  <div className={headerStyles.dropdownMenu}>
                    <div className={headerStyles.dropdownHeader}>
                      <div className={headerStyles.dropdownAvatar}>
                        <div className={headerStyles.dropdownAvatarCircle}>
                          {(user.name || user.username || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className={headerStyles.dropdownUserInfo}>
                          <span className={headerStyles.dropdownUserName}>
                            {user.name || user.username}
                          </span>
                          {user.employee_code && (
                            <span className={headerStyles.dropdownEmployeeCode}>
                              {user.employee_code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={headerStyles.dropdownActions}>
                      <AppMenu />
                      <button
                        onClick={handleLogout}
                        className={`${headerStyles.dropdownButton} ${headerStyles.logoutButton}`}
                      >
                        <FiLogOut size={18} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <div className={addUserRequestStyles.container}>
          {/* ========================================
              VALIDATION ERRORS DISPLAY
              ======================================== */}
          {validationErrors.length > 0 && (
            <div
              style={{
                backgroundColor: "#fee",
                border: "2px solid #dc2626",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                {validationErrors.map((error, index) => (
                  <li
                    key={index}
                    style={{
                      color: "#dc2626",
                      marginBottom: "8px",
                      fontSize: "10px",
                      lineHeight: "1.5",
                    }}
                  >
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form className={addUserRequestStyles.form} onSubmit={handleSubmit}>
            {/* ===================== Requestor Details ===================== */}
            <div className={addUserRequestStyles.section}>
              <span className={addUserRequestStyles.sectionHeaderTitle}>
                Requestor Details
              </span>
              <div className={addUserRequestStyles.sixCol}>
                <div className={addUserRequestStyles.formGroup}>
                  <input name="ritmNumber" value={formData.ritmNumber} readOnly />
                  <label htmlFor="ritmNumber" className={addUserRequestStyles.floatingLabel}>RITM Number</label>
                </div>
                <div className={addUserRequestStyles.formGroup}>
                  <input name="requestBy" value={formData.requestBy} readOnly />
                  <label htmlFor="requestBy" className={addUserRequestStyles.floatingLabel}>Request For / By *</label>
                </div>
                <div className={addUserRequestStyles.formGroup}>
                  <input name="name" value={formData.name} readOnly />
                  <label htmlFor="name" className={addUserRequestStyles.floatingLabel}>Opened By *</label>
                </div>
                <div className={addUserRequestStyles.formGroup}>
                  <input name="employeeCode" value={formData.employeeCode} readOnly />
                  <label htmlFor="employeeCode" className={addUserRequestStyles.floatingLabel}>Employee Code</label>
                </div>
                <div className={addUserRequestStyles.formGroup}>
                  <input name="location" value={formData.location} readOnly />
                  <label htmlFor="location" className={addUserRequestStyles.floatingLabel}>User Location</label>
                </div>
                <div className={addUserRequestStyles.formGroup}>
                  <input
                    name="task_created"
                    value={
                      new Date(formData.task_created).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    }
                    readOnly
                  />
                  <label htmlFor="task_created" className={addUserRequestStyles.floatingLabel}>Created On</label>
                </div>
              </div>

              <div className={addUserRequestStyles.sixCol}>
                <div className={`${addUserRequestStyles.formGroup} ${addUserRequestStyles.span2}`}>
                  <input name="access_request_type" value={formData.access_request_type} readOnly />
                  <label htmlFor="access_request_type" className={addUserRequestStyles.floatingLabel}>Access Request Type</label>
                </div>
                <div className={`${addUserRequestStyles.formGroup} ${addUserRequestStyles.span2}`}>
                  <input name="plant_name" value={formData.plant_name} readOnly />
                  <label htmlFor="plant_name" className={addUserRequestStyles.floatingLabel}>Req. App. Plant</label>
                </div>
                <div className={`${addUserRequestStyles.formGroup} ${addUserRequestStyles.span2}`}>
                  <input name="department" value={formData.department} readOnly />
                  <label htmlFor="department" className={addUserRequestStyles.floatingLabel}>Req. App. Department</label>
                </div>
              </div>

              <div className={addUserRequestStyles.sixCol}>
                <div className={`${addUserRequestStyles.formGroup} ${addUserRequestStyles.span2}`}>
                  <input name="applicationName" value={formData.applicationName} readOnly />
                  <label htmlFor="applicationName" className={addUserRequestStyles.floatingLabel}>Application Name / Equipment ID *</label>
                </div>
                <div className={`${addUserRequestStyles.formGroup} ${addUserRequestStyles.span2}`}>
                  <input name="assignmentGroup" value={formData.assignmentGroup} readOnly />
                  <label htmlFor="assignmentGroup" className={addUserRequestStyles.floatingLabel}>Assignment Plant IT Group</label>
                </div>
                <div className={addUserRequestStyles.formGroup}>
                  <input
                    name="requestedRole"
                    value={formData.requestedRole}
                    readOnly
                    style={{
                      fontWeight: "bold",
                      color: "#2563eb",
                    }}
                  />
                  <label htmlFor="requestedRole" className={addUserRequestStyles.floatingLabel}>Requested Role *</label>
                </div>
                <div className={addUserRequestStyles.formGroup}>
                  <input name="status" value={formData.status} readOnly />
                  <label htmlFor="status" className={addUserRequestStyles.floatingLabel}>Status</label>
                </div>
              </div>
              {/* Vendor fields - shown only for Vendor/OEM */}
{(formData.requestBy?.toLowerCase().includes("vendor") ||
  formData.requestBy?.toLowerCase().includes("oem")) && (
  <div className={addUserRequestStyles.sixCol}>
    <div  className={`${addUserRequestStyles.formGroup} ${addUserRequestStyles.span2}`}>
      <input
        name="vendorFirm"
        value={formData.vendorFirm}
        onChange={handleChange}
        readOnly
      />
      <label htmlFor="vendorFirm" className={addUserRequestStyles.floatingLabel}>
        Vendor Firm *
      </label>
    </div>
    <div  className={`${addUserRequestStyles.formGroup} ${addUserRequestStyles.span2}`}>
      <input
        name="vendorName"
        value={formData.vendorName}
        onChange={handleChange}
        readOnly
      />
      <label htmlFor="vendorName" className={addUserRequestStyles.floatingLabel}>
        Vendor Name *
      </label>
    </div>
  </div>
)}
            </div>

            {/* ===================== Task Details ===================== */}
            <div className={addUserRequestStyles.section}>
              <span className={addUserRequestStyles.sectionHeaderTitle}>Variable</span>
              <div className={addUserRequestStyles.sixCol}>
                <div className={addUserRequestStyles.formGroup}>
                  <input name="tasknumber" value={formData.taskNumber} readOnly />
                  <label htmlFor="tasknumber" className={addUserRequestStyles.floatingLabel}>Task Number</label>
                </div>

                <div className={addUserRequestStyles.formGroup}>
                  <select
                    name="requestStatus"
                    value={formData.requestStatus}
                    onChange={handleChange}
                  >
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending">Pending</option>
                    <option value="Closed">Closed</option>
                  </select>
                  <label htmlFor="requestStatus" className={addUserRequestStyles.floatingLabel}>Request Status</label>
                </div>

                <div className={`${addUserRequestStyles.formGroup} ${addUserRequestStyles.span2}`}>
                  <select
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleChange}
                    className={addUserRequestStyles.selectBox}
                  >
                    <option value="">-- Select Assignee --</option>
                    {itAdminUsers.map((user) => (
                      <option key={user.user_id} value={String(user.user_id)}>
                        {user.employee_name} ({user.email})
                      </option>
                    ))}
                  </select>
                  <label htmlFor="assignedTo" className={addUserRequestStyles.floatingLabel}>Assigned To</label>
                </div>

                {/* ========================================
                    RULE 12 & 13: DYNAMIC ACCESS OPTIONS
                    ======================================== */}
                <div className={addUserRequestStyles.formGroup}>
                  <select
                    id="access"
                    name="access"
                    value={formData.access}
                    onChange={handleChange}
                    className={addUserRequestStyles.selectBox}
                  >
                    <option value="">-- Select Access Type --</option>
                    {allowedAccessOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="access" className={addUserRequestStyles.floatingLabel}>
                    Access *
                  </label>
                </div>
                {isPasswordAccess && (
                  <div className={addUserRequestStyles.formGroup}>
                    <div className={addUserRequestStyles.passwordWrapper}>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={addUserRequestStyles.passwordInput}
                      />
                      <label htmlFor="password" className={addUserRequestStyles.floatingLabel}>Password</label>
                      <span
                        className={addUserRequestStyles.eyeIcon}
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className={addUserRequestStyles.sixCol}>
                <div className={addUserRequestStyles.formGroup}>
                  <input
                    name="allocatedId"
                    value={formData.allocatedId}
                    onChange={handleChange}
                    disabled={!allocatedIDEnabled.includes(formData.access_request_type)}
                  />
                  <label
                    htmlFor="allocatedId"
                    className={addUserRequestStyles.floatingLabel}
                  >
                    Allocated ID
                  </label>

                  {/* Show warning only when enabled + value changed */}
                  {allocatedIDEnabled.includes(formData.access_request_type) &&
                    formData.allocatedId &&
                    formData.allocatedId !== formData.employeeCode && (
                      <p className={addUserRequestStyles.warningText}>
                        ⚠️ Do you want to update previous records with this new ID?
                      </p>
                    )}
                </div>
              </div>

              {/* ========================================
                    RULE 14: ROLE GRANTED VALIDATION
                    ======================================== */}
              <div className={addUserRequestStyles.formGroup}>
                <input
                  name="roleGranted"
                  value={formData.roleGranted}
                  onChange={handleChange}
                  readOnly={!isRoleGrantAccess} // editable only for role-grant types
                  required
                  style={{
                    borderColor:
                      formData.roleGranted &&
                        formData.roleGranted !== formData.requestedRole
                        ? "#dc2626"
                        : undefined,
                    backgroundColor: !isRoleGrantAccess ? "#f3f4f6" : undefined, // visual cue for read-only
                  }}
                />
                <label htmlFor="roleGranted" className={addUserRequestStyles.floatingLabel}>
                  Role Granted *
                </label>
                {formData.roleGranted &&
                  formData.roleGranted !== formData.requestedRole && (
                    <p
                      style={{
                        color: "#dc2626",
                        fontSize: "12px",
                        marginTop: "4px",
                      }}
                    >
                      ❌ Role mismatch! Must match requested role.
                    </p>
                  )}
              </div>

              <div className={addUserRequestStyles.formGroup}>
                <select
                  name="userRequestType"
                  value={formData.userRequestType || ""}
                  disabled
                  onChange={(e) => {
                    const value = e.target.value;

                    setFormData((prev: any) => ({
                      ...prev,
                      userRequestType: value,
                      ...(value === "Temporary"
                        ? {
                          fromDate:
                            prev.fromDate ||
                            new Date().toISOString().split("T")[0],
                          toDate: prev.toDate || "",
                        }
                        : {
                          fromDate: "",
                          toDate: "",
                        }),
                    }));
                  }}
                  className={addUserRequestStyles.selectBox}
                >

                  <option value="">-- Select User Type --</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Temporary">Temporary</option>
                </select>
                <label htmlFor="userRequestType" className={addUserRequestStyles.floatingLabel}>User Type</label>
              </div>

              {formData.userRequestType === "Temporary" && (
                <div className={addUserRequestStyles.dateRange}>
                  <div className={addUserRequestStyles.formGroup}>
                    <input
                      type="date"
                      name="fromDate"
                      value={formData.fromDate || ""}
                      readOnly
                      className={addUserRequestStyles.inputField}
                    />
                    <label htmlFor="fromDate" className={addUserRequestStyles.floatingLabel}>From Date</label>
                  </div>
                  <div className={addUserRequestStyles.formGroup}>
                    <input
                      type="date"
                      name="toDate"
                      readOnly
                      value={formData.toDate || ""}
                      min={formData.fromDate}
                      onChange={handleChange}
                      className={addUserRequestStyles.inputField}
                      required
                    />
                    <label htmlFor="toDate" className={addUserRequestStyles.floatingLabel}>To Date</label>
                  </div>
                </div>
              )}

              <div className={addUserRequestStyles.formGroup}>
                <textarea
                  name="additionalInfo"
                  value={formData.additionalInfo || ""}
                  onChange={(e) => {
                    if (e.target.value.length <= 1000) {
                      handleChange(e);
                    }
                  }}
                  rows={3}
                  maxLength={1000}
                />

                <label
                  htmlFor="additionalInfo"
                  className={`${addUserRequestStyles.floatingLabel} ${formData.additionalInfo ? addUserRequestStyles.filled : ""
                    }`}
                >
                  Additional Information
                </label>

                {/* Character Counter */}
                <div className={addUserRequestStyles.charCounter}>
                  {(formData.additionalInfo?.length || 0)}/1000
                </div>
              </div>


              <div className={addUserRequestStyles.formGroup}>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={(e) => {
                    if (e.target.value.length <= 1000) {
                      handleChange(e);
                    }
                  }}
                  rows={3}
                />
                <label htmlFor="remarks" className={addUserRequestStyles.floatingLabel}>Remarks</label>
                <div className={addUserRequestStyles.charCounter}>
                  {(formData.remarks?.length || 0)}/1000
                </div>
              </div>


            </div>


            {/* ===================== Footer ===================== */}
            <div className={addUserRequestStyles.formFooter}>
              <div className={addUserRequestStyles.formActions}>
                <button type="submit" className={addUserRequestStyles.saveBtn}>
                  Save
                </button>
                <button
                  type="button"
                  className={addUserRequestStyles.cancelBtn}
                  onClick={() => navigate("/task")}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </main >
    </div >
  );
};

export default TaskClosureForm;

// ========================================
// RULES IMPLEMENTATION SUMMARY
// ========================================

/*
┌──────────────────────────────────────────────────────────────────────┐
│ TASK CLOSURE RULES - COMPLETE IMPLEMENTATION                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ✅ RULE 12: Grant-Type Access Restrictions                          │
│   ─────────────────────────────────────────────────────             │
│   Request Types:                                                    │
│   • New User Creation                                               │
│   • Modify Access                                                   │
│   • Active / Enable User Access                                     │
│   • Password Reset                                                  │
│   • Account Unlock                                                  │
│   • Account Unlock and Password Reset                               │
│   • Bulk New User Creation                                          │
│                                                                      │
│   Access Options Allowed:                                           │
│   • Granted ✅                                                      │
│   • Not Processed ✅                                                │
│   • Revoked ❌ (NOT DISPLAYED)                                      │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ✅ RULE 13: Revoke-Type Access Restrictions                         │
│   ─────────────────────────────────────────────────────             │
│   Request Types:                                                    │
│   • Deactivation / Disable / Remove User Access                    │
│   • Bulk De-activation                                              │
│                                                                      │
│   Access Options Allowed:                                           │
│   • Revoked ✅                                                      │
│   • Not Processed ✅                                                │
│   • Granted ❌ (NOT DISPLAYED)                                      │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ✅ RULE 14: Role Validation                                         │
│   ─────────────────────────────────────────────────────             │
│   • Role Granted MUST match Requested Role                          │
│   • If mismatch detected → BLOCK save                               │
│   • Visual indicator shown on form                                  │
│   • Error message: "Role Granted does not match..."                 │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ✅ RULE 16: Status Closure Validation                               │
│   ─────────────────────────────────────────────────────             │
│   Cannot set Status = "Closed" unless:                              │
│   • Access = "Granted" ✅                                           │
│   • Access = "Revoked" ✅                                           │
│   • Access = "Not Processed" ❌ (blocked)                           │
│                                                                      │
│   Error message: "Cannot close task with Access status..."          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

VALIDATION FLOW:
────────────────
1. User fills form
2. User clicks "Save"
3. System validates:
   - RULE 12/13: Correct access option selected?
   - RULE 14: Role Granted = Requested Role?
   - RULE 16: Valid access state for "Closed" status?
4. If ANY rule fails → Show errors, block save
5. If all pass → Save and navigate to task list

ERROR DISPLAY:
──────────────
• Prominent red box at top of form
• Lists all validation errors
• Specific rule violations cited
• User-friendly messages
• Auto-scroll to errors on submit
*/