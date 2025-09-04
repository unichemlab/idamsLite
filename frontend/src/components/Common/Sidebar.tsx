import React from "react";
import styles from "../../pages/ApproverDashboard.module.css";
import type { IconType } from "react-icons";
import { FaHeartbeat, FaSignOutAlt } from "react-icons/fa";

interface SidebarNavItem {
  key: string;
  icon: IconType;
  label: string;
  active: boolean;
  onClick: () => void;
}

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  navItems: SidebarNavItem[];
  onLogout: () => void;
  disabledKeys?: string[];
}

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onToggle,
  navItems,
  onLogout,
  disabledKeys = [],
}) => {
  const isDisabled = (key: string) => disabledKeys.includes(key);
  return (
    <aside
      className={`${styles.sidebar} ${
        open ? styles.sidebarOpen : styles.sidebarClosed
      }`.trim()}
    >
      {/* Logo Section */}
      <div
        className={styles.logo}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "flex-start" : "center",
          flexDirection: "column",
          padding: open ? "1rem" : "0.5rem",
        }}
      >
        {open ? (
          <>
            <span style={{ fontWeight: 700, fontSize: 24 }}>PharmaCorp</span>
            <br />
            <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.7 }}>
              Access Management System
            </span>
          </>
        ) : (
          FaHeartbeat({ size: 32, style: { color: "#0077b6" } })
        )}
      </div>

      {/* Toggle Button */}
      <button
        className={styles.sidebarToggle}
        aria-label={open ? "Close sidebar" : "Open sidebar"}
        onClick={onToggle}
        type="button"
      >
        {open ? "←" : "→"}
      </button>

      {/* Navigation Items */}
      <nav className={styles.nav} aria-label="Admin Navigation">
        {navItems.map((item) => {
          const disabled = isDisabled(item.key);
          return (
            <button
              key={item.key}
              className={`${styles.navItem} ${
                item.active ? styles.active : ""
              }`}
              type="button"
              aria-label={item.label}
              title={item.label}
              tabIndex={disabled ? -1 : 0}
              onClick={disabled ? undefined : item.onClick}
              disabled={disabled}
              style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              <span className={styles.navIcon}>{item.icon({ size: 20 })}</span>
              {open && <span className={styles.navText}>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Logout Button */}
      <button
        className={styles.logout}
        onClick={onLogout}
        type="button"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "flex-start" : "center",
          gap: open ? "8px" : "0",
          marginBottom: "30px",
          marginRight: "110px",
        }}
        title={!open ? "Logout" : undefined}
      >
        {FaSignOutAlt({ size: 20 })}
        {open && <span>Logout</span>}
      </button>
    </aside>
  );
};

export default Sidebar;
