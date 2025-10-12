import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchTaskById, addTaskAPI } from "../../utils/api";
import addUserRequestStyles from "../UserRequest/AddUserRequest.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";

const TaskClosureForm = () => {
  const [formData, setFormData] = useState<any>({});
  const [allocatedId, setAllocatedId] = useState("");
  const [showAllocatedPrompt, setShowAllocatedPrompt] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams(); // from URL (for edit mode)
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // 🟢 Fetch task data when editing
  useEffect(() => {
    if (id) {
      fetchTaskById(id)
        .then((data) => {
          setFormData(data);
          setAllocatedId(data.employeeCode || "");
        })
        .catch((err) => console.error("Error fetching task:", err));
    }
  }, [id]);

  // 🟢 Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  // 🟢 Handle allocated ID change
  const handleAllocatedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setAllocatedId(newValue);
    setFormData((prev: any) => ({ ...prev, allocatedId: newValue }));

    if (newValue !== formData.employeeCode) {
      setShowAllocatedPrompt(true);
    } else {
      setShowAllocatedPrompt(false);
    }
  };

  // 🟢 Submit handler
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
              <img src={login_headTitle2} alt="Logo" className={addUserRequestStyles.logo} />
              <span className={addUserRequestStyles.version}>v1.00</span>
            </div>
            <h1 className={addUserRequestStyles["header-title"]}>User Access Management</h1>
          </div>

          <div className={addUserRequestStyles["header-right"]}>
            <button
              className={addUserRequestStyles["addUserBtn"]}
              style={{ backgroundColor: "#d32f2f", color: "white" }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        <div className={addUserRequestStyles.container}>
          <form className="task-closure-form" onSubmit={handleSubmit}>
            <h2 className="form-header">Task Closure</h2>

            <div className="form-grid">
              {/* Row 1 */}
              <div>
                <label>Request For / By *</label>
                <input name="requestBy" value={formData.requestBy || ""} onChange={handleChange} readOnly />
              </div>
              <div>
                <label>Employee Code</label>
                <input name="employeeCode" value={formData.employeeCode || ""} readOnly />
              </div>

              {/* Row 2 */}
              <div>
                <label>Location</label>
                <input name="location" value={formData.location || ""} readOnly />
              </div>
              <div>
                <label>Department *</label>
                <input name="department" value={formData.department || ""} readOnly />
              </div>

              {/* Row 3 */}
              <div>
                <label>Application Name / Equipment ID *</label>
                <input name="applicationName" value={formData.applicationName || ""} readOnly />
              </div>
              <div>
                <label>Requested Role *</label>
                <input name="requestedRole" value={formData.requestedRole || ""} readOnly />
              </div>

              {/* Row 4 */}
              <div>
                <label>RITM Number</label>
                <input name="ritmNumber" value={formData.ritmNumber || ""} readOnly />
              </div>
              <div>
                <label>Request Status</label>
                <select name="requestStatus" value={formData.requestStatus || "Assigned"} onChange={handleChange}>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {/* Row 5 */}
              <div>
                <label>TASK Number</label>
                <input name="taskNumber" value={formData.taskNumber || ""} readOnly />
              </div>
              <div>
                <label>Assigned To</label>
                <input name="assignedTo" value={formData.assignedTo || ""} readOnly />
              </div>

              {/* Row 6 */}
              <div>
                <label>Allocated ID</label>
                <input name="allocatedId" value={allocatedId} onChange={handleAllocatedChange} />
                {showAllocatedPrompt && (
                  <p className="warning-text">
                    ⚠️ Do you want to update previous records with this new ID?
                  </p>
                )}
              </div>
              <div>
                <label>Role Granted *</label>
                <input name="roleGranted" value={formData.roleGranted || ""} onChange={handleChange} required />
              </div>

              {/* Row 7 */}
              <div className="access-section">
                <label>Access</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="access"
                      value="Granted"
                      checked={formData.access === "Granted"}
                      onChange={handleChange}
                    />{" "}
                    Granted
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="access"
                      value="Revoked"
                      checked={formData.access === "Revoked"}
                      onChange={handleChange}
                    />{" "}
                    Revoked
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="access"
                      value="Not Processed"
                      checked={formData.access === "Not Processed"}
                      onChange={handleChange}
                    />{" "}
                    Not Processed
                  </label>
                </div>
              </div>

              {/* Row 8 */}
              <div className="full-width">
                <label>Additional Information</label>
                <textarea
                  name="additionalInfo"
                  value={formData.additionalInfo || ""}
                  onChange={handleChange}
                  rows={2}
                ></textarea>
              </div>

              <div className="full-width">
                <label>Remarks</label>
                <textarea
                  name="remarks"
                  value={formData.remarks || ""}
                  onChange={handleChange}
                  rows={2}
                ></textarea>
              </div>
            </div>

            <button type="submit" className="submit-btn">
              Save Task Closure
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default TaskClosureForm;
