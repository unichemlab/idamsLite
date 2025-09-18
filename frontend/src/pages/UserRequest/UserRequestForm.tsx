import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRequestContext, UserRequest } from "./UserRequestContext";
import { fetchPlants } from "../../utils/api";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import addStyles from "./AddUserRequest.module.css";

const AddUserRequest: React.FC = () => {
  const { addUserRequest } = useUserRequestContext();
  const navigate = useNavigate();

  const [form, setForm] = useState<UserRequest>({
    requestFor: "Self",
    name: "",
    employeeCode: "",
    location: "",
    plant_location: "",
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

  const [plants, setPlants] = useState<{ id: number; plant_name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: number; department_name: string }[]>([]);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [applications, setApplications] = useState<{ id: string; name: string }[]>([]);



  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
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

  const handleAddRow = () => {
    if (bulkRows.length < 7) {
      setBulkRows([...bulkRows, { location: "", department: "", applicationId: "", role: "" }]);
    } else {
      alert("You can only add up to 7 applications.");
    }
  };

  const handleRemoveRow = (index: number) => {
    const updated = bulkRows.filter((_, i) => i !== index);
    setBulkRows(updated);
  };

  const handleBulkRowChange = (index: number, field: string, value: string) => {
    const updated = [...bulkRows];
    updated[index] = { ...updated[index], [field]: value };
    setBulkRows(updated);
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
      (form.accessType === "New User Creation" || form.accessType === "Bulk New User Creation") &&
      attachments.length === 0
    ) {
      alert("Attachment is mandatory for training records.");
      return;
    }

    const submissionData = {
      ...form,
      bulkEntries: form.accessType === "Bulk New User Creation" ? bulkRows : undefined,
    };

    await addUserRequest(submissionData);
    navigate("/user-requests");
  };

  const isVendorModify = form.requestFor === "Vendor / OEM" && form.accessType === "Modify Access";
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

  useEffect(() => {
    console.log("Access Request Type changed:", form.accessType);
  }, [form.accessType]);

  useEffect(() => {
    fetchPlants()
      .then((data) => {
        const normalized = data.map((p: any) => ({
          id: p.id,
          plant_name: p.plant_name, // Keep the expected property name
        }));
        console.error("fetch plants:", normalized);
        setPlants(normalized);
      })
      .catch((err) => {
        console.error("Failed to fetch plants:", err);
        setPlants([]);
      });
  }, []);

  useEffect(() => {
    if (form.plant_location) {
      fetch(`http://localhost:4000/api/applications/${form.plant_location}`)
        .then(res => res.json())
        .then(data => {
          console.error("fetch departments:", data);
          setDepartments(Array.isArray(data) ? data : []);// Extract names from objects
        })
        .catch((err) => {
          console.error("Failed to fetch departments:", err);
          setDepartments([]);
        });
    }
  }, [form.plant_location]);


  useEffect(() => {
    if (form.plant_location && form.department) {
      fetch(`http://localhost:4000/api/applications/${form.plant_location}/${form.department}`)
        .then(res => res.json())
        .then(data => {
          console.error("fetch roles and applications:", data);
          setRoles(Array.isArray(data.roles) ? data.roles : []); // Extract role names
          setApplications(Array.isArray(data.applications) ? data.applications : []); // Applications are already in {id, name} format
        })
        .catch((err) => {
          console.error("Failed to fetch roles and applications:", err);
          setRoles([]);
          setApplications([]);
        });
    }
  }, [form.plant_location, form.department]);


  useEffect(() => {
    if (form.vendorName.length > 0) {
      fetch(`/api/vendors/${form.vendorName}`)
        .then(res => res.json())
        .then(data => {
          setForm(prev => ({
            ...prev,
            vendorFirm: data.firm,
            vendorCode: data.code
          }));
        });
    }
  }, [form.vendorName]);




  console.log("Current Access Type:", form.accessType);
  console.log("isBulkNew:", isBulkNew);

  return (
    <div className={addStyles["main-container"]}>
      <main className={addStyles["main-content"]}>
        <header className={addStyles["main-header"]}>
          <img
            src={login_headTitle2}
            alt="Company logo"
            style={{ width: 250, height: 25 }}
          />
          <h2 className={addStyles["header-title"]}>User Access Management</h2>
        </header>
        <div className={addStyles.container}>
          <form
            id="userRequestForm"
            className={addStyles.form}
            onSubmit={handleSubmit}
            style={{ width: "100%" }}
          >

            <div className={addStyles.scrollFormContainer}>

              {/* Card 1 */}
              <div className={addStyles.section}>
                <span className={addStyles.sectionHeaderTitle}>Requestor Details</span>
                <div className={addStyles.fourCol}>
                  <div className={addStyles.formGroup}>

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
                    <label htmlFor="requestFor">Access For *</label>

                  </div>
                  <div className={addStyles.formGroup}>

                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                    <label htmlFor="name">Requestor For /By *</label>
                  </div>
                  <div className={addStyles.formGroup}>

                    <input
                      name="employeeCode"
                      value={form.employeeCode}
                      onChange={handleChange}
                      required
                    />
                    <label htmlFor="employeeCode">Employee Code *</label>
                  </div>
                  <div className={addStyles.formGroup}>

                    <input
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      required
                    />
                    <label htmlFor="location">Location *</label>
                  </div>
                </div>
                <div className={addStyles.fourCol}>

                  <div className={addStyles.formGroup}>
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
                    <label htmlFor="accessType">Access Request Type *</label>
                  </div>
                  <div className={addStyles.formGroup}>
                    <select
                      name="trainingStatus"
                      value={form.trainingStatus}
                      onChange={handleChange}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    <label htmlFor="trainingStatus">Training Completed *</label>
                  </div>
                  {form.trainingStatus === "Yes" && (
                    <div className={addStyles.formGroup}>
                      <input
                        type="file"
                        name="trainingAttachment"
                        accept="application/pdf"
                        multiple
                        onChange={handleFileChange}
                      />
                      <label htmlFor="trainingAttachment">Attachment (PDF,Max 4MB)</label>
                    </div>
                  )}
                  {!isBulkDeactivation && (
                    <div className={addStyles.formGroup}>

                      <input
                        name="reportsTo"
                        value={form.reportsTo}
                        onChange={handleChange}
                        required
                      />
                      <label htmlFor="reportsTo">Approver (Manager/Manager's manager) *</label>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2 Vendor Details */}
              {(form.requestFor === "Vendor / OEM" && !isVendorModify) && (
                <div className={addStyles.section}>
                  <span className={addStyles.sectionHeaderTitle}>Vendor Details</span>
                  <div className={addStyles.threeCol}>
                    <div className={addStyles.formGroup}>
                      <input
                        name="vendorName"
                        value={form.vendorName}
                        onChange={handleChange}
                        required
                      />
                      <label htmlFor="vendorName">Vendor Name *</label>
                    </div>
                    <div className={addStyles.formGroup}>
                      <input
                        name="vendorFirm"
                        value={form.vendorFirm}
                        onChange={handleChange}
                        required
                      />
                      <label htmlFor="vendorFirm">Vendor Firm *</label>
                    </div>
                    <div className={addStyles.formGroup}>
                      <input
                        name="vendorCode"
                        value={form.vendorCode}
                        onChange={handleChange}
                      />
                      <label htmlFor="vendorCode">Vendor Code</label>
                    </div>
                  </div>
                </div>
              )}

              {/* Card 3 Vendor Modify */}
              {isVendorModify && (
                <div className={addStyles.section}>
                  <span className={addStyles.sectionHeaderTitle}>Vendor Modify</span>
                  <div className={addStyles.fourCol}>
                    <div className={addStyles.formGroup}>
                      <input
                        name="vendorFirm"
                        value={form.vendorFirm}
                        onChange={handleChange}
                        required
                      />
                      <label htmlFor="vendorFirm">Vendor Firm *</label>
                    </div>
                    <div className={addStyles.formGroup}>
                      <input
                        name="allocatedId"
                        value={form.allocatedId}
                        onChange={handleChange}
                        required
                      />
                      <label htmlFor="allocatedId">Allocated ID *</label>
                    </div>
                    <div className={addStyles.formGroup}>
                      <input
                        name="vendorName"
                        value={form.vendorName}
                        readOnly
                      />
                      <label htmlFor="vendorName">Vendor Name *</label>
                    </div>
                    <div className={addStyles.formGroup}>
                      <label>Plant Location *</label>
                      <select name="plant_location" value={form.plant_location} onChange={handleChange} required>
                        <option value="">Select Plant</option>
                        {plants.map(plant => (
                          <option key={plant.id} value={plant.id}>{plant.plant_name}</option>
                        ))}
                      </select>
                      <label htmlFor="plant_location">Plant Location *</label>
                    </div>
                  </div>
                  <div className={addStyles.fourCol}>

                    <div className={addStyles.formGroup}>
                      <select name="role" value={form.role} onChange={handleChange} required>
                        <option value="">Select Role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                      <label htmlFor="role">Role *</label>
                    </div>
                    <div className={addStyles.formGroup}>
                      <select name="department" value={form.department} onChange={handleChange} required>
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                        ))}
                      </select>
                      <label htmlFor="department">Department *</label>
                    </div>
                    <div className={addStyles.formGroup}>
                      <textarea
                        name="remarks"
                        style={{ minHeight: "40px", maxHeight: "42px", resize: "vertical" }}
                        maxLength={50}
                      />
                      <label htmlFor="remarks">Remarks </label>
                    </div>
                  </div>

                </div>
              )}

              {/* Card 4 Access Information */}
              {(isBulkDeactivation || (!isVendorModify && !isBulkDeactivation)) && (
                <div className={addStyles.section}>
                  <span className={addStyles.sectionHeaderTitle}>Access Information</span>
                  <div className={addStyles.fourCol}>
                    <div className={addStyles.formGroup}>
                      <select name="plant_location" value={form.plant_location} onChange={handleChange} required>
                        <option value="">Select Plant</option>
                        {plants.map(plant => (
                          <option key={plant.id} value={plant.id}>{plant.plant_name}</option>
                        ))}
                      </select>
                      <label htmlFor="plant_location">Plant Location * </label>
                    </div>
                    <div className={addStyles.formGroup}>
                      <select name="department" value={form.department} onChange={handleChange} required>
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                        ))}
                      </select>
                      <label htmlFor="department">Department Name * </label>
                    </div>
                    {!isBulkDeactivation && (
                      <div className={addStyles.formGroup}>
                        <select name="applicationId" value={form.applicationId} onChange={handleChange} required>
                          <option value="">Select Application / Equipment ID</option>
                          {applications.map((app, index) => (
                            <option key={index} value={app.id}>{app.name}</option>
                          ))}
                        </select>
                        <label htmlFor="applicationId">Application / Equipment ID *</label>
                      </div>
                    )}
                    <div className={addStyles.formGroup}>
                      <select name="role" value={form.role} onChange={handleChange} required>
                        <option value="">Select Role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                      <label htmlFor="role">Role *</label>
                    </div>
                  </div>


                  <div className={addStyles.formGroup}>
                    <label></label>
                    <textarea
                      name="remarks"
                      value={form.remarks}
                      onChange={handleChange}
                      maxLength={50}
                    />
                    <label htmlFor="remarks">Remarks</label>
                  </div>


                </div>
              )}

              {/* Card 5 Bulk User Creation */}
              {(form.requestFor !== "Vendor / OEM" && isBulkNew) && (
                <div className={addStyles.section}>
                  <span className={addStyles.sectionHeaderTitle}>Bulk User Creation</span>
                  <div>
                    {bulkRows.length < 7 && (
                      <div className={addStyles.addRowWrapper}>
                        <button
                          type="button"
                          onClick={handleAddRow}
                          className={addStyles.addRowBtn}
                        >
                          +
                        </button>
                      </div>
                    )}
                    <div className={addStyles.tableContainer}>
                      <table className={addStyles.table}>
                        <thead>
                          <tr>
                            <th>Location</th>
                            <th>Department</th>
                            <th>Application / Equipment ID</th>
                            <th>Role</th>
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
                                  placeholder="Department"
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
                                <button type="button" className={addStyles.deleteBtn} onClick={() => handleRemoveRow(index)}>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}


            </div>
            {/* Move the footer buttons to the top */}
            <div className={addStyles.formFooter}>
              <div className={addStyles.formActions}>
              <button type="submit" className={addStyles.saveBtn}>
                Submit
              </button>
              <button
                type="button"
                className={addStyles.cancelBtn}
                onClick={() => navigate("/user-requests")}
              >
                Cancel
              </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );

};

export default AddUserRequest;
