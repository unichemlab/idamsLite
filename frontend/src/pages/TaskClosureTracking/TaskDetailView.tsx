import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchTaskById } from "../../utils/api";
import addUserRequestStyles from "./AddTaskClosureTracking.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";

const TaskDetailView: React.FC = () => {
  const [taskData, setTaskData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      fetchTaskById(id)
        .then((data) => {
          setTaskData(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching task details:", err);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return <div className={addUserRequestStyles.loader}>Loading task details...</div>;
  }

  if (!taskData) {
    return <div className={addUserRequestStyles.error}>Task not found.</div>;
  }

  const task = taskData.tasks[0];

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
            <h1 className={addUserRequestStyles["header-title"]}>Task Detail View</h1>
          </div>

          <div className={addUserRequestStyles["header-right"]}>
            <button
              className={addUserRequestStyles["addUserBtn"]}
              onClick={() => navigate("/task")}
            >
              Back to Tasks
            </button>
          </div>
        </header>

        <div className={addUserRequestStyles.container}>
          <div className={addUserRequestStyles.section}>
            <span className={addUserRequestStyles.sectionHeaderTitle}>
              Requestor Details
            </span>

            <div className={addUserRequestStyles.sixCol}>
              <div className={addUserRequestStyles.formGroup}>
                <input value={taskData.ritmNumber} readOnly />
                <label htmlFor="ritmNumber" className={addUserRequestStyles.floatingLabel}>RITM Number</label>
              </div>

              <div className={addUserRequestStyles.formGroup}>
                <input value={taskData.request_for_by} readOnly />
                <label htmlFor="requestForBy" className={addUserRequestStyles.floatingLabel}>Request For / By</label>
              </div>

              <div className={addUserRequestStyles.formGroup}>
                <input value={taskData.name} readOnly />
                <label htmlFor="openedBy" className={addUserRequestStyles.floatingLabel}>Opened By</label>
              </div>

              <div className={addUserRequestStyles.formGroup}>
                <input value={taskData.employee_code} readOnly />
                <label htmlFor="employeeCode" className={addUserRequestStyles.floatingLabel}>Employee Code</label>
              </div>

              <div className={addUserRequestStyles.formGroup}>
                <input value={taskData.employee_location} readOnly />
                <label htmlFor="location" className={addUserRequestStyles.floatingLabel}>Location</label>
              </div>

              <div className={addUserRequestStyles.formGroup}>
                <input
                  value={
                    new Date(task.task_created).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  }
                  readOnly
                />
                <label htmlFor="createdOn" className={addUserRequestStyles.floatingLabel}>Created On</label>
              </div>
            </div>

            <div className={addUserRequestStyles.sixCol}>
              <div className={addUserRequestStyles.formGroup}>
                <input value={taskData.access_request_type} readOnly />
                <label htmlFor="accessRequestType" className={addUserRequestStyles.floatingLabel}>Access Request Type</label>
              </div>
              <div className={addUserRequestStyles.formGroup}>
                <input value={task.plant_name || ""} readOnly />
                <label htmlFor="plantName" className={addUserRequestStyles.floatingLabel}>Req. App. Plant</label>
              </div>
              <div className={addUserRequestStyles.formGroup}>
                <input value={task.department_name || ""} readOnly />
                <label htmlFor="department" className={addUserRequestStyles.floatingLabel}>Req. App. Department</label>
              </div>
              <div className={addUserRequestStyles.formGroup}>
                <input value={task.application_name || ""} readOnly />
                <label htmlFor="applicationName" className={addUserRequestStyles.floatingLabel}>Application Name</label>
              </div>
            </div>
          </div>

          {/* ================= Task Info Section ================= */}
          <div className={addUserRequestStyles.section}>
            <span className={addUserRequestStyles.sectionHeaderTitle}>Task Details</span>
            <div className={addUserRequestStyles.sixCol}>
              <div className={addUserRequestStyles.formGroup}>
                <input value={task.taskNumber} readOnly />
                <label htmlFor="taskNumber" className={addUserRequestStyles.floatingLabel}>Task Number</label>
              </div>

              <div className={addUserRequestStyles.formGroup}>
                <input value={task.role_name || ""} readOnly />
                <label htmlFor="requestedRole" className={addUserRequestStyles.floatingLabel}>Requested Role</label>
              </div>

              <div className={addUserRequestStyles.formGroup}>
                <input value={task.task_status} readOnly />
                <label htmlFor="taskStatus" className={addUserRequestStyles.floatingLabel}>Task Status</label>
              </div>

              <div className={addUserRequestStyles.formGroup}>
                <input
                  value={
                    new Date(task.task_updated).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  }
                  readOnly
                />
                <label htmlFor="lastUpdated" className={addUserRequestStyles.floatingLabel}>Last Updated</label>
              </div>

              <div className={addUserRequestStyles.formGroup}>
                <textarea
                  value={task.remarks || ""}
                  readOnly
                  rows={2}
                  className={addUserRequestStyles.readonlyTextarea}
                />
                <label htmlFor="remarks" className={addUserRequestStyles.floatingLabel}>Remarks</label>
              </div>
            </div>
          </div>

          {/* ================= IT Admin Details ================= */}
          <div className={addUserRequestStyles.section}>
            <span className={addUserRequestStyles.sectionHeaderTitle}>
              IT Admin Group Details
            </span>

            <div className={addUserRequestStyles.sixCol}>
              <div className={addUserRequestStyles.formGroup}>
                <input
                  value={taskData.it_admin_group?.assignment_it_group || ""}
                  readOnly
                />
                <label htmlFor="itAssignmentGroup" className={addUserRequestStyles.floatingLabel}>IT Assignment Group</label>
              </div>

              <div className={addUserRequestStyles.formGroup}>
                <textarea
                  value={
                    taskData.it_admin_users
                      ?.map(
                        (u: any) =>
                          `${u.employee_name} (${u.email}) - ${u.department}`
                      )
                      .join("\n") || "No Admin Users Assigned"
                  }
                  readOnly
                  rows={3}
                  className={addUserRequestStyles.readonlyTextarea}
                />
                <label htmlFor="itAdminUsers" className={addUserRequestStyles.floatingLabel}>IT Admin Users</label>
              </div>
            </div>
          </div>

          <div className={addUserRequestStyles.formFooter}>
            <div className={addUserRequestStyles.formActions}>
              <button
                type="button"
                className={addUserRequestStyles.cancelBtn}
                onClick={() => navigate("/task")}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TaskDetailView;
