import React from "react";
import styles from "../ApproverDashboard.module.css";

const DashboardStats: React.FC = () => {
  const stats = [
    {
      label: "Total Requests",
      value: 156,
      change: "+12% from last month",
      icon: "📊",
      subColor: "#36b37e",
    },
    {
      label: "Pending Requests",
      value: 23,
      change: "5 require attention",
      icon: "⏳",
      subColor: "#ff9800",
    },
    {
      label: "Approved Requests",
      value: 98,
      change: "+8% this week",
      icon: "✅",
      subColor: "#36b37e",
    },
    {
      label: "Active Users",
      value: 145,
      change: "3 new today",
      icon: "👤",
      subColor: "#007f86",
    },
    {
      label: "Compliance Score",
      value: "94%",
      change: "Excellent",
      icon: "🎯",
      subColor: "#36b37e",
    },
  ];

  return (
    <div className={styles.statsGrid}>
      {stats.map((stat) => (
        <div className={styles.statCard} key={stat.label}>
          <div className={styles.iconWrapper}>
            <div className={styles.statIcon}>{stat.icon}</div>
          </div>
          <div className={styles.textContent}>
            <div className={styles.statLabel}>{stat.label}</div>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statSub} style={{ color: stat.subColor }}>
              {stat.change}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
