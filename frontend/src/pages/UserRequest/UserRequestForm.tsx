import React, { useState, useEffect } from "react";
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
    allocatedId: [],
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [bulkRows, setBulkRows] = useState([
    { location: "", department: "", applicationId: "", role: "" },
  ]);

  const handleRemoveRow = (index: number) => {
    const updated = bulkRows.filter((_, i) => i !== index);
    setBulkRows(updated);
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [newApplication, setNewApplication] = useState({
    location: "",
    department: "",
    applicationId: "",
    role: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelect = (
    e: React.ChangeEvent<HTMLSelectElement>,
    field: "approver2" | "approver3"
  ) => {
    const selected = Array.from(e.target.selectedOptions, (o) => o.value);
    setForm((prev) => ({ ...prev, [field]: selected }));
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


  const handleAddRow = () => {
    if (bulkRows.length < 7) {
      setBulkRows([...bulkRows, { location: "", department: "", applicationId: "", role: "" }]);
    } else {
      alert("You can only add up to 7 applications.");
    }
  };

  const handleRemoveAll = () => {
    setBulkRows([]);
  };



  const handleBulkRowChange = (index: number, field: string, value: string) => {
    const updated = [...bulkRows];
    updated[index] = { ...updated[index], [field]: value };
    setBulkRows(updated);
  };


  const handleAddApplication = () => {
    setBulkRows([...bulkRows, newApplication]);
    setNewApplication({ location: "", department: "", applicationId: "", role: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      form.requestFor === "Vendor / OEM" &&
      form.accessType === "Modify Access" &&
      (!form.vendorFirm || !form.allocatedId)
    ) {
      alert("Vendor Firm and Allocated ID are required for Vendor/OEM Modify.");
      return;
    }

    if (form.accessType === "Bulk New User Creation" && bulkRows.length === 0) {
      alert("Please add at least one bulk entry.");
      return;
    }

    if (
      form.trainingStatus === "Yes" &&
      (form.accessType === "New User Creation" ||
        form.accessType === "Bulk New User Creation") &&
      attachments.length === 0
    ) {
      alert("Attachment is mandatory for training records.");
      return;
    }

    if (form.accessType === "Bulk New User Creation" && bulkRows.length === 0) {
      alert("Please add at least one bulk entry.");
      return;
    }

    const submissionData = {
      ...form,
      bulkEntries: form.accessType === "Bulk New User Creation" ? bulkRows : undefined,
    };

    await addUserRequest(submissionData);
    navigate("/user-requests");
  };

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

  const isVendorModify =
    form.requestFor === "Vendor / OEM" && form.accessType === "Modify Access";
  const isBulkDeactivation = form.accessType === "Bulk De-activation";
  const isBulkNew = form.accessType === "Bulk New User Creation";

  const accessOptions =
    form.requestFor === "Vendor / OEM"
      ? [
        "New User Creation",
        "Modify Access",
        "Active / Enable User Access",
        "Deactivation / Disable / Remove User Access",
        "Password Reset",
        "Account Unlock",
        "Account Unlock and Password Reset",
      ]
      : [
        "New User Creation",
        "Modify Access",
        "Password Reset",
        "Account Unlock",
        "Account Unlock and Password Reset",
        "Active / Enable User Access",
        "Deactivation / Disable / Remove User Access",
        "Bulk De-activation",
        "Bulk New User Creation",
      ];

  // ✅ Debugging to track changes
  useEffect(() => {
    console.log("Access Request Type changed:", form.accessType);
  }, [form.accessType]);

  console.log("Current Access Type:", form.accessType);
  console.log("isBulkNew:", isBulkNew);
  return (
    <div className={superAdminStyles["main-container"]}>


      <main className={superAdminStyles["main-content"]}>
        <header className={superAdminStyles["main-header"]}>
          <h2 className={superAdminStyles["header-title"]}>User Requests</h2>
        </header>

       

        <div className={addStyles.container} style={{ marginTop: 32 }}>
          <form
            id="userRequestForm"
            className={addStyles.form}
            onSubmit={handleSubmit}
            style={{ width: "100%" }}
          >
            <div className={addStyles.scrollFormContainer}>
              <div className={addStyles.threeCol}>
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
                  <label>Requestor For /By *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Search from AD"
                    required
                  />
                </div>
                <div className={addStyles.formGroup}>
                  <label>Employee Code *</label>
                  <input
                    name="employeeCode"
                    value={form.employeeCode}
                    onChange={handleChange}
                    placeholder="From AD"
                    required
                  />
                </div>
              </div>

              <div className={addStyles.threeCol}>
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
                    {accessOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {form.requestFor === "Vendor / OEM" && !isVendorModify && (
                <div className={addStyles.threeCol}>
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

              {isVendorModify ? (
                <>
                  <div className={addStyles.threeCol}>
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
                      <label>Allocated ID *</label>
                      <input
                        name="allocatedId"
                        value={form.allocatedId}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className={addStyles.threeCol}>
                    <div className={addStyles.formGroup}>
                      <label>Vendor Name (auto)</label>
                      <input
                        name="vendorName"
                        value={form.vendorName}
                        readOnly
                        placeholder="Auto-filled from Allocated ID"
                      />
                    </div>
                    <div className={addStyles.formGroup}>
                      <label>Role (auto)</label>
                      <input
                        name="role"
                        value={form.role}
                        readOnly
                        placeholder="Auto-filled from Allocated ID"
                      />
                    </div>
                  </div>
                </>
              ) : isBulkDeactivation ? (
                <>
                  <div className={addStyles.threeCol}>
                    <div className={addStyles.formGroup}>
                      <label>Department Name</label>
                      <input
                        name="department"
                        value={form.department || "Auto Department Set"}
                        readOnly
                      />
                    </div>
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Remarks</label>
                    <textarea
                      name="remarks"
                      value={form.remarks}
                      onChange={handleChange}
                      maxLength={100}
                      rows={4}
                      placeholder="Enter remarks..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className={addStyles.rowFields}>
                    <div className={addStyles.formGroup}>
                      <label>Department Name *</label>
                      <input
                        name="department"
                        value={form.department}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    {/* Hide Application / Equipment ID and Role for Bulk New User Creation */}
                    {form.accessType !== "Bulk New User Creation" && (
                      <>
                        <div className={addStyles.formGroup}>
                          <label>Application / Equipment ID *</label>
                          <input
                            name="applicationId"
                            value={form.applicationId}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className={addStyles.formGroup}>
                          <label>Role *</label>
                          <input
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </>
                    )}

                    {/* Bulk New User Creation */}
                    {/* Bulk New User Creation */}
                    {/* Bulk New User Creation */}
                    {form.accessType === "Bulk New User Creation" && (
                      <div>
                        {bulkRows.length < 7 && (
                          <button type="button" onClick={handleAddRow}>
                            Add Row
                          </button>
                        )}

                        {/* Table with independent scrolling */}
                        <div className={addStyles.tableContainer}>
                          <table className={addStyles.table}>
                            <thead>
                              <tr>
                                <th>Location</th>
                                <th>Department Name</th>
                                <th>Application / Equipment ID</th>
                                <th>Requested Role</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulkRows.map((row, index) => (
                                <tr key={index}>
                                  <td>
                                    <input
                                      value={row.location}
                                      onChange={(e) =>
                                        handleBulkRowChange(index, "location", e.target.value)
                                      }
                                      placeholder="Location"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      value={row.department}
                                      onChange={(e) =>
                                        handleBulkRowChange(index, "department", e.target.value)
                                      }
                                      placeholder="Department Name"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      value={row.applicationId}
                                      onChange={(e) =>
                                        handleBulkRowChange(index, "applicationId", e.target.value)
                                      }
                                      placeholder="Application / Equipment ID"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      value={row.role}
                                      onChange={(e) =>
                                        handleBulkRowChange(index, "role", e.target.value)
                                      }
                                      placeholder="Role"
                                    />
                                  </td>
                                  <td>
                                    <button type="button" onClick={() => handleRemoveRow(index)}>
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Approver(Manager/Manager's manager) *</label>
                    <input
                      name="reportsTo"
                      value={form.reportsTo}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className={addStyles.formGroup}>
                    <label>Remarks</label>
                    <textarea
                      name="remarks"
                      value={form.remarks}
                      onChange={handleChange}
                      maxLength={100}
                      rows={4}
                    />
                  </div>
                </>
              )}

              {!isBulkDeactivation && (
                <>
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
                </>
              )}
            </div>
             <div className={addStyles.formFooter}>
              <button type="submit" className={addStyles.saveBtn}>
                Save
              </button>
              <button type="button" className={addStyles.cancelBtn} onClick={() => navigate("/user-requests")}>
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
