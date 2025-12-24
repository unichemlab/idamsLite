import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronDown, FiLogOut } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import AppMenu from "../AppMenu";
import styles from "./AppHeader.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";

interface AppHeaderProps {
  title?: string;
  showUserMenu?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  title = "User Access Management",
  showUserMenu: showUserMenuProp = true 
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.logoWrapper}>
          <img src={login_headTitle2} alt="Company Logo" className={styles.logo} />
          <span className={styles.version}>version-1.0</span>
        </div>
        <h1 className={styles.title}>{title}</h1>
      </div>

      {showUserMenuProp && user && (
        <div className={styles.headerRight}>
          <div className={styles.userMenuContainer} ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={styles.userButton}
            >
              <div className={styles.avatarContainer}>
                <div className={styles.avatar}>
                  {(user.name || user.username || "U").charAt(0).toUpperCase()}
                </div>
                <div className={styles.statusDot}></div>
              </div>

              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  {user.name || user.username}
                </span>
                {(user.isITBin || user.isApprover) && (
                  <span className={styles.userRole}>
                    {user.isITBin ? "IT Admin" : "Approver"}
                  </span>
                )}
              </div>

              <FiChevronDown
                size={16}
                color="#64748b"
                className={styles.chevron}
                style={{
                  transform: showUserMenu ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            {showUserMenu && (
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownAvatar}>
                    <div className={styles.dropdownAvatarCircle}>
                      {(user.name || user.username || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.dropdownUserInfo}>
                      <span className={styles.dropdownUserName}>
                        {user.name || user.username}
                      </span>
                      {user.employee_code && (
                        <span className={styles.dropdownEmployeeCode}>
                          {user.employee_code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.dropdownActions}>
                  <AppMenu />
                  <button
                    onClick={handleLogout}
                    className={`${styles.dropdownButton} ${styles.logoutButton}`}
                  >
                    <FiLogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default AppHeader;