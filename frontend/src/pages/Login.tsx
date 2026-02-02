import React, { useState } from "react";
import loginHeadTitle from "../assets/login_headTitle.png";
import styles from "./Login.module.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Login Component - Fully Responsive
 * 
 * Breakpoints:
 * - Extra small: < 360px
 * - Small mobile: 360px - 400px
 * - Mobile: 400px - 600px
 * - Tablet: 600px - 768px
 * - Large tablet: 768px - 1024px
 * - Desktop: > 1024px
 * - Very large: > 1440px
 * 
 * Also handles landscape orientation for mobile devices
 */

// Logo heading with centered image and improved design
const LogoHeading = () => (
  <div className={styles.logoHeading}>
    <div className={styles.logoRow}>
      <img
        src={loginHeadTitle}
        alt="IDAMS LITE"
        className={styles.logoLiteImg}
      />
      <span className={styles.version}>version-1.0</span>
    </div>
    <div className={styles.logoUam}>User Access Management</div>
  </div>
);

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, loading, user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username.toLowerCase().trim(), password.trim());
  };

  React.useEffect(() => {
    if (!user) return;

    if (user.status.toUpperCase() !== "ACTIVE") return;

    // Normalize role_id to a number array
    const roleIds: number[] = Array.isArray(user.role_id)
      ? user.role_id
      : typeof user.role_id === "number"
        ? [user.role_id]
        : [];

    let target = "/homepage";

    if (roleIds.includes(1)) {
      target = "/homepage";
    } else {
      target = "/homepage";
    }

    console.log("pathname", location.pathname);
    console.log("target", target);
    
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

            <div className={styles.passwordWrapper}>
              <label htmlFor="password" className={styles.inputLabel}>
                Password
              </label>
              <input
                id="password"
                className={styles.input}
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value.trim())}
                autoComplete="current-password"
                aria-required="true"
              />
              <span
                className={styles.eyeIcon}
                onClick={() => setShowPassword(!showPassword)}
                role="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setShowPassword(!showPassword);
                  }
                }}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </span>
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
              disabled={loading}
            >
              {loading ? <span className={styles.loader}></span> : "Login"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default Login;