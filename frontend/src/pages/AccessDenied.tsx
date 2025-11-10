import React from "react";
import { Link } from "react-router-dom";
import styles from "./AccessDenied.module.css";

const AccessDenied: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
        <div style={{ marginTop: 16 }}>
          <Link to="/">Go to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
