// SlideInPanel.js
import React from "react";
import styles from "./AddRolePanel.module.css";
import { FaTimes } from "react-icons/fa";

interface AddRolePanelProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function AddRolePanel({
  open,
  title,
  onClose,
  children
}: AddRolePanelProps) {
  if (!open) return null; // Ensures overlay/backdrop not rendered unless panel is open

  return (
    <div className={`${styles.slidePanelOverlay} ${open ? styles.open : ""}`}>
      <div className={styles.slidePanel} role="dialog" aria-modal="true">
        <div className={styles.slidePanelHeader}>
          <h3>{title}</h3>
          <button className={styles.slidePanelClose} onClick={onClose} title="Close">
            <FaTimes />
          </button>
        </div>
        <div className={styles.slidePanelBody}>
          {children}
        </div>
      </div>
      <div className={styles.slidePanelBackdrop} onClick={onClose} />
    </div>
  );
}

