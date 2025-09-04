import React, { useState } from "react";
import loginHeadTitle from "../assets/login_headTitle.png";
import styles from "./Login.module.css";
import { useNavigate } from "react-router-dom";
import { mockUsers } from "../data/mockUsers";

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
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Find user in mockUsers
    const foundUser = mockUsers.find(
      (u) => u.username === username && u.password === password
    );
    if (foundUser) {
      // Store user info in localStorage if needed
      localStorage.setItem("role", foundUser.role);
      localStorage.setItem("username", foundUser.username);
      localStorage.setItem("token", "true");
      // Ensure localStorage is set before navigating
      setTimeout(() => {
        if (foundUser.role === "plantAdmin") {
          navigate("/superadmin");
        } else {
          switch (foundUser.role) {
            case "superAdmin":
              navigate("/superadmin");
              break;
            case "approver":
              navigate("/approver");
              break;
            case "user":
              navigate("/user-information");
              break;
            default:
              navigate("/");
          }
        }
      }, 0);
    } else {
      setError("Invalid credentials");
    }
  };

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
            <div className={styles.loginTitle}>Login</div>
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
