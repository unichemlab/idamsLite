import React, { useState } from "react";
import loginHeadTitle from "../assets/login_headTitle.png";
import styles from "./Login.module.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext"

// Logo heading with centered image and improved design
const LogoHeading = () => (
  <div className={styles.logoHeading}>
    <div className={styles.logoRow}>
      <img
        src={loginHeadTitle}
        alt="IDAMS LITE"
        className={styles.logoLiteImg}
        style={{
          height: "3.4rem",
          marginLeft: "0.6em",
          verticalAlign: "middle",
        }}
      />
    </div>
    <div className={styles.logoUam}>User Access Management</div>
  </div>
);

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  // useLocation in this project may not accept a generic type argument depending on
  // the installed react-router types, so read the state and cast when used.
  const location = useLocation();
  const { login, error, loading, user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  React.useEffect(() => {
    if (!user) return;

    if (user.status.toUpperCase() !== "ACTIVE") return;

    // Get return path if one was saved during auth redirect
    const returnPath = location.state?.from;
    
    // Role names used across the app
    type RoleName =
      | "SuperAdmin"
      | "PlantITAdmin"
      | "Approver"
      | "AuditReviewer"
      | "PlantUser";

    // Role-based landing pages
    const RoleLandingPages: Record<RoleName, string> = {
      SuperAdmin: "/superadmin",
      PlantITAdmin: "/plantadmin",
      Approver: "/approver",
      AuditReviewer: "/reports",
      PlantUser: "/user-access-management",
    };

    // Get highest role priority map
    const RoleHierarchy: Record<RoleName, number> = {
      SuperAdmin: 5,
      PlantITAdmin: 4,
      Approver: 3,
      AuditReviewer: 2,
      PlantUser: 1,
    };

    // Map role IDs to names (align with AbilityContext role mapping)
    const roleMap: Record<number, RoleName | undefined> = {
      1: "SuperAdmin",
      2: "PlantITAdmin",
      3: "AuditReviewer",
      4: "Approver",
      5: "PlantUser",
    };

    // Get role names and find highest priority
    const roleIds: number[] = Array.isArray(user.role_id)
      ? user.role_id
      : typeof user.role_id === "number"
      ? [user.role_id]
      : [];

    const roleNames = roleIds.map((id) => roleMap[id]).filter(Boolean) as RoleName[];
    const highestRole = roleNames.reduce((highest: RoleName, current: RoleName) => {
      return (RoleHierarchy[current] || 0) > (RoleHierarchy[highest] || 0) ? current : highest;
    }, "PlantUser");

    // Determine target - prefer return path if exists and user has permission
  const defaultTarget = RoleLandingPages[highestRole] || "/user-access-management";
    const target = returnPath || defaultTarget;

    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [user, navigate, location.pathname, location.state?.from]);
  return (
    <div className={styles.loginBackground}>
      <div className={styles.container}>
        <main className={styles.loginMain}>
          <LogoHeading />
          <form
            className={styles.loginCard}
            onSubmit={handleSubmit}
            aria-label="Login form"
          >
            <div className={styles.inputGroup}>
              <label htmlFor="username" className={styles.inputLabel}>
                Username
              </label>
              <input
                id="username"
                className={styles.input}
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                aria-required="true"
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.inputLabel}>
                Password
              </label>
              <input
                id="password"
                className={styles.input}
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                aria-required="true"
              />
            </div>
            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}
            {loading && (
              <div className={styles.error} role="status">
                Logging in...
              </div>
            )}
            <button
              className={styles.loginButton}
              type="submit"
              aria-label="Login"
            >
              Login
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default Login;
