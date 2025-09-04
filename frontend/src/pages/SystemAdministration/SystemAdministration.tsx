import React from "react";
import styles from "./SystemAdministration.module.css";

type HealthItem = {
  name: string;
  status: "ok" | "warn" | "error";
  description?: string;
};

interface SystemAdministrationProps {
  health: HealthItem[];
  setHealth: React.Dispatch<React.SetStateAction<HealthItem[]>>;
}

const statusDotClass = (status: string) => {
  if (status === "ok") return styles.statusOk;
  if (status === "warn") return styles.statusWarn;
  return styles.statusError;
};

const SystemAdministration: React.FC<SystemAdministrationProps> = ({
  health,
  setHealth,
}) => {
  // Example handler for future API integration
  // const handleUpdateHealth = (item: HealthItem) => { ... }

  return (
    <>
      <h1 className={styles.title}>System Administration</h1>
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}>System Health</div>
        <div className={styles.tableContainer}>
          <ul className={styles.healthList}>
            {health.map((item) => (
              <li className={styles.healthItem} key={item.name}>
                <span
                  className={`${styles.statusDot} ${statusDotClass(
                    item.status
                  )}`}
                ></span>
                <span>{item.name}</span>
                {item.description && (
                  <span style={{ color: "#888", fontSize: 14, marginLeft: 18 }}>
                    {item.description}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};

export default SystemAdministration;
