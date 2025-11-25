// frontend/src/components/ApprovalBadge/ApprovalBadge.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchApprovalStats } from "../../utils/api";
import styles from "./ApprovalBadge.module.css";

interface ApprovalBadgeProps {
  module?: string; // Optional: filter by specific module
  refreshInterval?: number; // Auto-refresh interval in ms (default: 30000)
}

const ApprovalBadge: React.FC<ApprovalBadgeProps> = ({
  module,
  refreshInterval = 30000,
}) => {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();

    // Set up auto-refresh
    const interval = setInterval(loadStats, refreshInterval);

    return () => clearInterval(interval);
  }, [module, refreshInterval]);

  const loadStats = async () => {
    try {
      const stats = await fetchApprovalStats(module);
      setPendingCount(parseInt(stats.pending_count) || 0);
    } catch (err) {
      console.error("Error loading approval stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    navigate("/master-approvals");
  };

  if (loading) {
    return (
      <button className={styles.badgeButton} disabled>
        <span className={styles.icon}>🔔</span>
        <span className={styles.label}>Approvals</span>
      </button>
    );
  }

  return (
    <button
      className={`${styles.badgeButton} ${pendingCount > 0 ? styles.hasNotifications : ""}`}
      onClick={handleClick}
      title={`${pendingCount} pending approval${pendingCount !== 1 ? "s" : ""}`}
    >
      <span className={styles.icon}>🔔</span>
      <span className={styles.label}>Approvals</span>
      {pendingCount > 0 && (
        <span className={styles.badge}>{pendingCount > 99 ? "99+" : pendingCount}</span>
      )}
    </button>
  );
};

export default ApprovalBadge;