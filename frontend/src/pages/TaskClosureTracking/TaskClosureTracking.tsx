import React from "react";
import styles from "./TaskClosureTracking.module.css";

const taskData = [
  {
    id: "TC001",
    name: "John Smith",
    empId: "EMP001",
    application: "Laboratory Information System",
    version: "v2.1.3",
    role: "Lab Analyst",
    accessStatus: "Granted",
    requestStatus: "Closed",
  },
  {
    id: "TC002",
    name: "Sarah Johnson",
    empId: "EMP002",
    application: "Clinical Data Management",
    version: "v1.8.2",
    role: "Data Reviewer",
    accessStatus: "Granted",
    requestStatus: "Closed",
  },
  {
    id: "TC003",
    name: "Mike Wilson",
    empId: "EMP003",
    application: "Manufacturing Execution System",
    version: "v3.0.1",
    role: "Operator",
    accessStatus: "In Progress",
    requestStatus: "Pending",
  },
  {
    id: "TC004",
    name: "Lisa Davis",
    empId: "EMP004",
    application: "Document Management System",
    version: "v2.5.0",
    role: "QA Manager",
    accessStatus: "Hold",
    requestStatus: "In Progress",
  },
  {
    id: "TC005",
    name: "Robert Chen",
    empId: "EMP005",
    application: "Regulatory Information System",
    version: "v1.9.4",
    role: "Regulatory Specialist",
    accessStatus: "Revoked",
    requestStatus: "Closed",
  },
];

const activityData = [
  {
    icon: "✅",
    message: "Access granted for Laboratory Information System",
    user: "John Smith",
    time: "6 days ago",
    status: "Success",
  },
  {
    icon: "✅",
    message: "Role updated to Data Reviewer",
    user: "Sarah Johnson",
    time: "6 days ago",
    status: "Success",
  },
  {
    icon: "⏳",
    message: "Access request submitted for MES",
    user: "Mike Wilson",
    time: "6 days ago",
    status: "Pending",
  },
  {
    icon: "✅",
    message: "Training completed for DMS access",
    user: "Lisa Davis",
    time: "6 days ago",
    status: "Success",
  },
  {
    icon: "⚠️",
    message: "Account access revoked per compliance review",
    user: "Robert Chen",
    time: "6 days ago",
    status: "Warning",
  },
];

const StatusBadge = ({ label }: { label: string }) => {
  return (
    <span
      className={`${styles.badge} ${
        styles[label.toLowerCase().replace(/\s/g, "")]
      }`}
    >
      {label}
    </span>
  );
};

const TaskClosureTracking = () => {
  return (
    <div className={styles.wrapper}>
       
      {/* Left Side */}
      <div className={styles.leftPanel}>
        <div className={styles.header}>
          <h2>Task Closure Tracking</h2>
          <select className={styles.statusDropdown}>
            <option>All Status</option>
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
        <table className={styles.taskTable}>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>User</th>
              <th>Application</th>
              <th>Role</th>
              <th>Access Status</th>
              <th>Request Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {taskData.map((task) => (
              <tr key={task.id}>
                <td>{task.id}</td>
                <td>
                  <div className={styles.userName}>{task.name}</div>
                  <div className={styles.empId}>{task.empId}</div>
                </td>
                <td>
                  <div  className={styles.application}>{task.application}</div>
                  <div className={styles.version}>{task.version}</div>
                </td>
                <td  className={styles.role}>{task.role}</td>
                <td>
                  <StatusBadge label={task.accessStatus} />
                </td>
                <td>
                  <StatusBadge label={task.requestStatus} />
                </td>
                <td>
                  <button className={styles.viewBtn}>👁 View</button>
                  <button className={styles.editBtn}>✏️ Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Right Side */}
      <div className={styles.rightSection}>
        <div className={styles.recentHeader}>
          <h3>Recent Activity</h3>
          <button className={styles.viewAllBtn}>View All</button>
        </div>
        <div className={styles.activityList}>
          {activityData.map((activity, index) => (
            <div key={index} className={styles.activityItem}>
              <div className={styles.activityIcon}>{activity.icon}</div>
              <div className={styles.activityDetails}>
                <div className={styles.activityMessage}>{activity.message}</div>
                <div className={styles.activityMeta}>
                  <span>User: {activity.user}</span>
                  <span className={styles.activityTime}>{activity.time}</span>
                </div>
              </div>
              <StatusBadge label={activity.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskClosureTracking;
