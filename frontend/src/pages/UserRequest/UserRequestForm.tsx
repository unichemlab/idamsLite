import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRequestContext, UserRequest } from "./UserRequestContext";
import superAdminStyles from "../SuperAdmin/SuperAdmin.module.css";
import addStyles from "./AddUserRequest.module.css";

const AddUserRequest: React.FC = () => {
  const { addUserRequest } = useUserRequestContext();
  const navigate = useNavigate();

  const [form, setForm] = useState<UserRequest>({
    requestFor: "Self",
    name: "",
    employeeCode: "",
    location: "",
    accessType: "",
    applicationId: "",
    department: "",
    role: "",
    reportsTo: "",
    trainingStatus: "Yes",
    remarks: "",
    approver1: "",
    approver2: [],
    approver3: [],
    status: "Pending",
    vendorName: [],
    vendorFirm: [],
    vendorCode: [],
  });

  const [attachments, setAttachments] = useState<File[]>([]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 4) {
        alert("You can only upload up to 4 files.");
        return;
      }
      if (files.some((f) => f.size > 4 * 1024 * 1024)) {
        alert("Each file must be less than 4 MB.");
        return;
      }
      setAttachments(files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      form.requestFor === "Vendor / OEM" &&
      (!form.vendorName || !form.vendorFirm)
    ) {
      alert(
        "Vendor Name and Vendor Firm are mandatory for Vendor/OEM requests."
      );
      return;
    }

    if (
      form.trainingStatus === "Yes" &&
      (form.accessType === "New User Creation" ||
        form.accessType === "Bulk New User Creation") &&
      attachments.length === 0
    ) {
      alert("Attachment is mandatory for training.");
      return;
    }

    await addUserRequest(form);
    navigate("/user-requests");
  };

  // Sidebar config
  const sidebarConfig = [
    { key: "dashboard", label: "Dashboard" },
    { key: "plant", label: "Plant Master" },
    { key: "role", label: "Role Master" },
    { key: "vendor", label: "Vendor Master" },
    { key: "application", label: "Application Master" },
    { key: "user", label: "User Master" },
    { key: "workflow", label: "Approval Workflow" },
    { key: "request", label: "User Requests" },
  ];

  const handleSidebarNav = (key: string) => {
    if (key === "request") navigate("/user-requests");
    else navigate("/superadmin", { state: { activeTab: key } });
  };

  const activeTab = "request";

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
              {item.label}
            </button>
          ))}
          <div className={superAdminStyles["sidebar-footer"]}>
            <div className={superAdminStyles["admin-info"]}>
              <div className={superAdminStyles.avatar}>A</div>
            </div>
            <button
              className={superAdminStyles["logout-button"]}
              onClick={() => {
                localStorage.clear();
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
          <h2 className={superAdminStyles["header-title"]}>User Requests</h2>
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
            }}
            onClick={() => navigate("/user-requests")}
          >
            User Requests
          </span>
          <span>&gt;</span>
          <span style={{ color: "#2d3748" }}>Add Request</span>
        </div>

        {/* Form Container */}
        <div className={addStyles.container} style={{ marginTop: 32 }}>
          <form
            className={addStyles.form}
            onSubmit={handleSubmit}
            style={{ width: "100%" }}
          >
            <div className={addStyles.scrollFormContainer}>
              {/* Row 1 */}
              <div className={addStyles.rowFields}>
                <div className={addStyles.formGroup}>
                  <label>Access For *</label>
                  <select
                    name="requestFor"
                    value={form.requestFor}
                    onChange={handleChange}
                    required
                  >
                    <option value="Self">Self</option>
                    <option value="Others">Others</option>
                    <option value="Vendor / OEM">Vendor / OEM</option>
                  </select>
                </div>
                <div className={addStyles.formGroup}>
                  <label>Requestor for/By *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Search from AD"
                    required
                  />
                </div>
                <div className={addStyles.formGroup}>
                  <label>Employee ID *</label>
                  <input
                    name="employeeCode"
                    value={form.employeeCode}
                    onChange={handleChange}
                    placeholder="From AD"
                    required
                  />
                </div>
              </div>

              {/* Vendor Section */}
              {form.requestFor === "Vendor / OEM" && (
                <div className={addStyles.rowFields}>
                  <div className={addStyles.formGroup}>
                    <label>Vendor Name *</label>
                    <input
                      name="vendorName"
                      value={form.vendorName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Vendor Firm *</label>
                    <input
                      name="vendorFirm"
                      value={form.vendorFirm}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Vendor Code</label>
                    <input
                      name="vendorCode"
                      value={form.vendorCode}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              {/* Row 2 */}
              <div className={addStyles.rowFields}>
                <div className={addStyles.formGroup}>
                  <label>Location *</label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="From AD"
                    required
                  />
                </div>
                <div className={addStyles.formGroup}>
                  <label>Access Request Type *</label>
                  <select
                    name="accessType"
                    value={form.accessType}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select</option>
                    <option value="New User Creation">New User Creation</option>
                    <option value="Modify Access">Modify Access</option>
                    <option value="Password Reset">Password Reset</option>
                    <option value="Account Unlock">Account Unlock</option>
                    <option value="Account Unlock and Password Reset">
                      Account Unlock and Password Reset
                    </option>
                    <option value="Active / Enable User Access">
                      Active / Enable User Access
                    </option>
                    <option value="Deactivation / Disable / Remove User Access">
                      Deactivation / Disable / Remove User Access
                    </option>
                    <option value="Bulk De-activation">
                      Bulk De-activation
                    </option>
                    <option value="Bulk New User Creation">
                      Bulk New User Creation
                    </option>
                  </select>
                </div>
                <div className={addStyles.formGroup}>
                  <label>Department Name *</label>
                  <input
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    placeholder="From Application Master"
                    required
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className={addStyles.rowFields}>
                <div className={addStyles.formGroup}>
                  <label>Application / Equipment ID *</label>
                  <input
                    name="applicationId"
                    value={form.applicationId}
                    onChange={handleChange}
                    placeholder="From Application Master"
                    required
                  />
                </div>
                <div className={addStyles.formGroup}>
                  <label>Role *</label>
                  <input
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    placeholder="From Role Master"
                    required
                  />
                </div>
                <div className={addStyles.formGroup}>
                  <label>Approver (Manager/Manager's manager) *</label>
                  <input
                    name="reportsTo"
                    value={form.reportsTo}
                    onChange={handleChange}
                    placeholder="From AD"
                    required
                  />
                </div>
              </div>

              {/* Training */}
              <div className={addStyles.rowFields}>
                <div className={addStyles.formGroup}>
                  <label>Training Completed *</label>
                  <select
                    name="trainingStatus"
                    value={form.trainingStatus}
                    onChange={handleChange}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
              {form.trainingStatus === "Yes" && (
                <div className={addStyles.formGroup}>
                  <label>Attachment (PDF, Max 4 files / 4MB each)</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={handleFileChange}
                  />
                </div>
              )}

              {/* Remarks */}
              <div className={addStyles.formGroup} style={{ width: "100%" }}>
                <label>Remarks</label>
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  placeholder="Enter remarks..."
                  rows={4}
                  maxLength={100}
                />
              </div>

              {/* Approvers */}
              {/* <div className={addStyles.rowFields}>
                <div className={addStyles.formGroup}>
                  <label>Approver 1 *</label>
                  <input name="approver1" value={form.approver1} onChange={handleChange} placeholder="Manager / Manager's Manager" required />
                </div>
                <div className={addStyles.formGroup}>
                  <label>Approver 2</label>
                  <select multiple value={form.approver2} onChange={(e) => handleMultiSelect(e, "approver2")}>
                    <option value="QA1">QA1</option>
                    <option value="QA2">QA2</option>
                  </select>
                </div>
                <div className={addStyles.formGroup}>
                  <label>Approver 3</label>
                  <select multiple value={form.approver3} onChange={(e) => handleMultiSelect(e, "approver3")}>
                    <option value="Head1">Head1</option>
                    <option value="Head2">Head2</option>
                  </select>
                </div>
              </div> */}
            </div>

            {/* Buttons */}
            <div
              className={addStyles.buttonRow}
              style={{ display: "flex", gap: 24, marginTop: 24 }}
            >
              <button type="submit" className={addStyles.saveBtn}>
                Save
              </button>
              <button
                type="button"
                className={addStyles.cancelBtn}
                onClick={() => navigate("/user-requests")}
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

export default AddUserRequest;
