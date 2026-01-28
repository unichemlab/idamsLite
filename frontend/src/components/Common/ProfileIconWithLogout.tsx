import React, { useState } from "react";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import styles from "../../pages/ApplicationMaster/ApplicationMasterTable.module.css";

const ProfileIconWithLogout: React.FC = () => {
  const [profileOpen, setProfileOpen] = useState(false);
  const handleProfileClick = () => setProfileOpen((prev) => !prev);
  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("superadmin_activeTab");
    window.location.href = "/";
  };
  return (
    <span
      className={styles["header-icon"]}
      onClick={handleProfileClick}
      style={{ position: "relative" }}
    >
      <PersonIcon fontSize="small" />
      {profileOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 30,
            border: "1px solid #ccc",
            background: "#fff",
            borderRadius: 4,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 10,
            minWidth: 120,
          }}
        >
          <button
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
            onClick={() => {
              setProfileOpen(false);
              handleLogout();
            }}
          >
            <LogoutIcon
              fontSize="small"
              style={{ verticalAlign: "middle", marginRight: 6 }}
            />{" "}
            Logout
          </button>
        </div>
      )}
    </span>
  );
};

export default ProfileIconWithLogout;
