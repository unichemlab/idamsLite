// frontend/src/pages/Home/Home.tsx

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiChevronDown,
  FiMail,
  FiMapPin,
  FiBriefcase,
  FiLogOut,
  FiShield,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiTrendingUp,
  FiFileText,
  FiSettings,
} from "react-icons/fi";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import styles from "./homepageUser.module.css";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };


  return (
    <div className={styles.container}>
      {/* Navbar */}
      <header className={styles["main-header"]}>
        <div className={styles.navLeft}>
          <div className={styles.logoWrapper}>
            <img src={login_headTitle2} alt="Logo" className={styles.logo} />
            <span className={styles.version}>version-1.0</span>
          </div>
          <h1 className={styles.title}>User Access Management</h1>
        </div>


        <div className={styles.navRight}>
          {user && (
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={styles.userButton}
              >
                {/* Avatar */}
                <div className={styles.avatarContainer}>
                  <div className={styles.avatar}>
                    {(user.name || user.username || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className={styles.statusDot}></div>
                </div>

                {/* User Name */}
                <div className={styles.userInfo}>
                  <span className={styles.userName}>
                    {user.name || user.username}
                  </span>
                  {user.isITBin && (
                    <span className={styles.userRole}>IT Admin</span>
                  )}
                  {user.isApprover && (
                    <span className={styles.userRole}>Approver</span>
                  )}
                </div>

                {/* Dropdown Arrow */}
                <FiChevronDown
                  size={16}
                  color="#64748b"
                  style={{
                    transition: "transform 0.2s",
                    transform: showUserMenu ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className={styles.dropdownMenu}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownAvatar}>
                      <div className={styles.dropdownAvatarCircle}>
                        {(user.name || user.username || "U")
                          .charAt(0)
                          .toUpperCase()}
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

                    {/* {user.isITBin && (
                      <div className={styles.adminBadge}>
                        <FiShield size={14} />
                        <span>IT BIN Administrator</span>
                      </div>
                    )} */}
                  </div>

                  {/* Contact Info */}
                  {/* <div className={styles.dropdownInfo}>
                    {user.email && (
                      <div className={styles.infoItem}>
                        <FiMail size={16} />
                        <span>{user.email}</span>
                      </div>
                    )}
                    {user.location && (
                      <div className={styles.infoItem}>
                        <FiMapPin size={16} />
                        <span>{user.location}</span>
                      </div>
                    )}
                    {user.designation && (
                      <div className={styles.infoItem}>
                        <FiBriefcase size={16} />
                        <span>{user.designation}</span>
                      </div>
                    )}
                  </div> */}

                  {/* Actions */}
                  <div className={styles.dropdownActions}>
                    <button
                      onClick={() => navigate("/user-access-management")}
                      className={styles.dropdownButton}
                    >
                      <FiBriefcase size={16} />
                      <span>User Access Management</span>
                    </button>
                    {user?.isITBin && (
                      <button
                        onClick={() => navigate("/task")}
                        className={styles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Task Closure</span>
                      </button>
                    )}
                     {user?.isApprover && (
                      <button
                        onClick={() => navigate("/approver/pending")}
                        className={styles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Pending Approval</span>
                      </button>
                    )}
                    {user?.isApprover && (
                      
                      <button
                        onClick={() => navigate("/approver/history")}
                        className={styles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Approval History</span>
                      </button>
                    )}
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
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Welcome Section */}
        <section className={styles.welcomeSection}>
          <div className={styles.welcomeCard}>
            <div className={styles.welcomeContent}>
              <h2 className={styles.welcomeTitle}>
                Welcome back, {user?.name || user?.username}! 👋
              </h2>
              <p className={styles.welcomeText}>
                Manage your user access requests and approvals efficiently from
                one central dashboard.
              </p>
              <button
                onClick={() => navigate("#")}
                className={styles.primaryButton}
              >
                <FiUsers size={20} />
                Create New Request
              </button>
              <button
                onClick={() => navigate("/user-access-management")}
                className={styles.primaryButton}
              >
                <FiUsers size={20} />
                iDams Lite User Access Request
              </button>
            </div>
            <div className={styles.welcomeIllustration}>
              <div className={styles.illustrationCircle}>
                <FiTrendingUp size={64} color="#3b82f6" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;