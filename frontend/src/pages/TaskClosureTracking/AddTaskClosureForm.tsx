import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchTaskById, addTaskAPI } from "../../utils/api";
import addUserRequestStyles from "./AddTaskClosureTracking.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";

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
        task_created: "",
        task_updated: "",
        status: "",
        access_request_type: "",
        assignmentGroup: "",
        plant_name:""


    });

    const navigate = useNavigate();
    const { id } = useParams();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // Fetch task if editing
    useEffect(() => {
        if (id) {
            fetchTaskById(id)
                .then((data) => {
                    console.log(data);
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
                        assignedTo: data.assignedTo || "",
                        allocatedId: data.employee_code || "",
                        roleGranted: data.roleGranted || "",
                        access: data.access || "Not Processed",
                        additionalInfo: data.additionalInfo || "",
                        task_created: data.tasks[0].task_created || "",
                        task_updated: data.tasks[0].task_updated || "",
                        remarks: data.remarks || "",
                        status: data.status || "",
                        access_request_type:data.access_request_type || ""

                    });
                })
                .catch((err) => console.error("Error fetching task:", err));
        }
    }, [id]);

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.roleGranted && formData.roleGranted !== formData.requestedRole) {
            alert("❌ Role Granted does not match the Requested Role!");
            return;
        }

        try {
            await addTaskAPI(formData);
            alert("✅ Task closure saved successfully!");
            navigate("/task-closure-tracking");
        } catch (err) {
            console.error("Error saving task:", err);
            alert("❌ Failed to save task closure.");
        }
    };

    return (
        <div className={addUserRequestStyles["main-container"]}>
            <main className={addUserRequestStyles["main-content"]}>
                <header className={addUserRequestStyles["main-header"]}>
                    <div className={addUserRequestStyles["header-left"]}>
                        <div className={addUserRequestStyles["logo-wrapper"]}>
                            <img
                                src={login_headTitle2}
                                alt="Logo"
                                className={addUserRequestStyles.logo}
                            />
                            <span className={addUserRequestStyles.version}>v1.00</span>
                        </div>
                        <h1 className={addUserRequestStyles["header-title"]}>
                            Task Closure Form
                        </h1>
                    </div>

                    <div className={addUserRequestStyles["header-right"]}>
                        {user?.role_id !== 12 ? (
                            <button
                                className={addUserRequestStyles["addUserBtn"]}
                                onClick={() => navigate("/superadmin")}
                            >
                                View Admin Panel
                            </button>
                        ) : (
                            <button
                                className={addUserRequestStyles["addUserBtn"]}
                                style={{
                                    backgroundColor: "#d32f2f",
                                    color: "white",
                                    marginLeft: "10px",
                                }}
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        )}
                    </div>
                </header>

                <div className={addUserRequestStyles.container}>
                    <form
                        className={addUserRequestStyles.form}
                        onSubmit={handleSubmit}
                    >
                        {/* ===================== Requestor Details ===================== */}
                        <div className={addUserRequestStyles.section}>
                            <span className={addUserRequestStyles.sectionHeaderTitle}>
                                Requestor Details
                            </span>
                            <div className={addUserRequestStyles.sixCol}>
                                <div className={addUserRequestStyles.formGroup}>
                                    <input name="ritmNumber" value={formData.ritmNumber} readOnly />
                                    <label>RITM Number</label>
                                </div>
                                <div className={addUserRequestStyles.formGroup}>
                                    <input name="requestBy" value={formData.requestBy} readOnly />
                                    <label>Request For / By *</label>
                                </div>
                                <div className={addUserRequestStyles.formGroup}>
                                    <input name="name" value={formData.name} readOnly />
                                    <label>Opened By *</label>
                                </div>
                                <div className={addUserRequestStyles.formGroup}>
                                    <input name="employeeCode" value={formData.employeeCode} readOnly />
                                    <label>Employee Code</label>
                                </div>
                                <div className={addUserRequestStyles.formGroup}>
                                    <input name="location" value={formData.location} readOnly />
                                    <label>User Location</label>
                                </div>
                                 <div className={addUserRequestStyles.formGroup}>
                                    <input
                                        name="task_created"
                                        value={new Date(formData.task_created).toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                        readOnly
                                    />
                                    <label>Created On</label>
                                </div>
                               
                            </div>
                            <div className={addUserRequestStyles.sixCol}>
                                <div className={`${addUserRequestStyles.formGroup} ${addUserRequestStyles.span2}`}>
                                    <input name="access_request_type" value={formData.access_request_type} readOnly />
                                    <label>Access Request Type</label>
                                </div>
                                <div className={`${addUserRequestStyles.formGroup} ${addUserRequestStyles.span2}`}>
                                    <input name="plant_name" value={formData.plant_name} readOnly />
                                    <label>Req. App. Plant</label>
                                </div>
                                <div className={`${addUserRequestStyles.formGroup} ${addUserRequestStyles.span2}`}>
                                    <input name="department" value={formData.department} readOnly />
                                    <label>Req. App. Department</label>
                                </div>
                                
                                
                                
                                

                            </div>
                            <div className={addUserRequestStyles.sixCol}>
                                <div className={`${addUserRequestStyles.formGroup} ${addUserRequestStyles.span2}`}>
                                    <input
                                        name="applicationName"
                                        value={formData.applicationName}
                                        readOnly
                                    />
                                    <label>Application Name / Equipment ID *</label>
                                </div>
                                <div className={`${addUserRequestStyles.formGroup} ${addUserRequestStyles.span2}`}>
                                    <input name="assignmentGroup" value="" readOnly />
                                    <label>Assignment Plant IT Group</label>
                                </div>
                                <div className={addUserRequestStyles.formGroup}>
                                    <input
                                        name="requestedRole"
                                        value={formData.requestedRole}
                                        readOnly
                                    />
                                    <label>Requested Role *</label>
                                </div>
                                
                                
                               <div className={addUserRequestStyles.formGroup}>
                                    <input
                                        name="status"
                                        value={formData.status}
                                        readOnly
                                    />
                                    <label>Status</label>
                                </div>
                                
                            </div>
                        </div>

                        {/* ===================== Task Details ===================== */}
                        <div className={addUserRequestStyles.section}>
                            <span className={addUserRequestStyles.sectionHeaderTitle}>
                                Variable
                            </span>
                            <div className={addUserRequestStyles.sixCol}>
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
                                    <label>Request Status</label>
                                </div>
                                <div className={addUserRequestStyles.formGroup}>
                                    <select
                                        id="access"
                                        name="access"
                                        value={formData.access}
                                        onChange={handleChange}
                                        className={addUserRequestStyles.selectBox}
                                    >
                                        <option value="">-- Select Access Type --</option>
                                        <option value="Granted">Granted</option>
                                        <option value="Revoked">Revoked</option>
                                        <option value="Not Processed">Not Processed</option>
                                    </select>
                                    <label htmlFor="access">Access</label>
                                </div>
                                <div className={addUserRequestStyles.formGroup}>
                                    <input
                                        name="allocatedId"
                                        value={formData.allocatedId}
                                        onChange={handleChange}
                                    />
                                    <label>Allocated ID</label>
                                    {formData.allocatedId !== formData.employeeCode && (
                                        <p className={addUserRequestStyles.warningText}>
                                            ⚠️ Do you want to update previous records with this new ID?
                                        </p>
                                    )}
                                </div>
                                <div className={addUserRequestStyles.formGroup}>
                                    <input
                                        name="roleGranted"
                                        value={formData.roleGranted}
                                        onChange={handleChange}
                                        required
                                    />
                                    <label>Role Granted *</label>
                                </div>
                                <div className={addUserRequestStyles.formGroup}>
                                    <textarea
                                        name="additionalInfo"
                                        value={formData.additionalInfo}
                                        onChange={handleChange}
                                        rows={1}
                                    />
                                    <label>Additional Information</label>
                                </div>

                                <div className={addUserRequestStyles.formGroup}>
                                    <label></label>
                                    <textarea
                                        name="remarks"
                                        value={formData.remarks}
                                        onChange={handleChange}
                                        rows={1}
                                    />
                                    <label>Remarks</label>
                                </div>
                            </div>

                            <div className={addUserRequestStyles.fourCol}>


                                {/* Assigned To */}
                                {/* <div className={addUserRequestStyles.formGroup}>

                                    <select
                                        name="assignedTo"
                                        value={formData.assignedTo}
                                        onChange={handleChange}
                                        className={addUserRequestStyles.selectBox}
                                    >
                                        <option value="">-- Select Assignee --</option>
                                        <option value="Deva">Deva (itsupport.pc@unichemlabs.com)</option>
                                        <option value="Shrikant">
                                            Shrikant (itsupport.pc@unichemlabs.com)
                                        </option>
                                    </select>
                                    <label htmlFor="assignedTo">Assigned To</label>
                                </div> */}
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
            </main>
        </div>
    );
};

export default TaskClosureForm;
