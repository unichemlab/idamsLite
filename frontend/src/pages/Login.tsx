import React, { useState } from "react";
import loginHeadTitle from "../assets/login_headTitle.png";
import styles from "./Login.module.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
  const location = useLocation();
  const { login, error, loading, user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

 // Type definition
type User = {
  status: string;
  role_id: number | number[] | null; // single number OR array
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

  let target = "/user-access-management";

  if (roleIds.includes(1)) target = "/superadmin";
  else if (roleIds.includes(2)) target = "/plantadmin";
  else if (roleIds.includes(3)) target = "/qamanager";

  if (location.pathname !== target) {
    navigate(target, { replace: true });
  }
}, [user, navigate, location.pathname]);


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
