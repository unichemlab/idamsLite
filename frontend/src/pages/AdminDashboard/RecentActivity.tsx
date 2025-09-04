import React from "react";
import styles from "../ApproverDashboard.module.css";

const mockActivity = [
  {
    message: "Access granted for Laboratory Information System",
    user: "John Smith",
    time: "2 hours ago",
    status: "success",
  },
  {
    message: "User Sarah Johnson added to Data Reviewer role",
    user: "Sarah Johnson",
    time: "5 hours ago",
    status: "info",
  },
  {
    message: "Compliance report exported",
    user: "Dr. Sarah Mitchell",
    time: "1 day ago",
    status: "success",
  },
];

const statusIcon = (status: string) => {
  if (status === "success")
    return <span style={{ color: "#28a745", fontSize: 18 }}>✔️</span>;
  if (status === "info")
    return <span style={{ color: "#5ac9d8", fontSize: 18 }}>ℹ️</span>;
  if (status === "error")
    return <span style={{ color: "#c00", fontSize: 18 }}>❌</span>;
  return null;
};

const RecentActivity: React.FC = () => (
  <div className={styles.activityCard}>
    <div className={styles.activityTitle}>Recent Activity</div>
    <table className={styles.activityTable}>
      <thead>
        <tr>
          <th>Status</th>
          <th>Message</th>
          <th>User</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        {mockActivity.map((item, idx) => (
          <tr key={idx}>
            <td>{statusIcon(item.status)}</td>
            <td>{item.message}</td>
            <td>{item.user}</td>
            <td>{item.time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default RecentActivity;
