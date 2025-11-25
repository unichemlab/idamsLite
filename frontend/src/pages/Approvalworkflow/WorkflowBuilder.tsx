// src/pages/Approvalworkflow/WorkflowBuilder.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./WorkflowBuilder.module.css";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import ProfileIconWithLogout from "../../components/Common/ProfileIconWithLogout";

const WorkflowBuilder: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Approver Workflow</h2>
        <div style={{ display: "flex", gap: "20px" }} className={styles["header-icons"]}>
          <span className={styles["header-icon"]}>
            <NotificationsIcon fontSize="small" />
          </span>
          <span className={styles["header-icon"]}>
            <SettingsIcon fontSize="small" />
          </span>
          <ProfileIconWithLogout />
        </div>
      </header>

      <div className={styles.container}>
        <div className={styles.dashboardContainer} aria-label="Workflow Dashboard">
          <div className={styles.cardGrid}>
            <div
              className={styles.card}
              onClick={() => navigate("/approval-workflow/plant-list")}
              role="button"
              tabIndex={0}
            >
              <h3>Plant Workflow</h3>
              <p>Manage workflow approvals for each plant</p>
            </div>

            <div
              className={styles.card}
              onClick={() => navigate("/approval-workflow/corporate-list")}
              role="button"
              tabIndex={0}
            >
              <h3>Corporate Workflow</h3>
              <p>Manage centralized approvals (static categories)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;
