import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import styles from "./SuperAdmin.module.css";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FactoryIcon from "@mui/icons-material/Factory";
import SecurityIcon from "@mui/icons-material/Security";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AppsIcon from "@mui/icons-material/Apps";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AssignmentIcon from "@mui/icons-material/Assignment";
import GroupIcon from "@mui/icons-material/Group";
import SyncIcon from "@mui/icons-material/Sync";
import DonutChart from "../../components/Common/DonutChart";
import PlantMasterTable from "pages/PlantMasterTable/PlantMasterTable";
import DepartmentMasterTable from "pages/DepartmentMasterTable/DepartmentMasterTable";
import VendorMasterTable from "pages/VendorMasterTable/VendorMasterTable";
import RoleMasterTable from "pages/RoleMasterTable/RoleMasterTable";
import UserMasterTable from "pages/UserMasterTable/UserMasterTable";
import ApplicationMasterTable from "pages/ApplicationMasterTable/ApplicationMasterTable";
import WorkflowBuilder from "pages/WorkflowBuilder/WorkflowBuilder";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { useAuth } from "../../context/AuthContext";
import { Role } from "../../utils/rbac";

const SuperAdmin: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    // Try to restore from localStorage first
    const storedTab = localStorage.getItem("superadmin_activeTab");
    if (storedTab) return storedTab;
    if (location.state && location.state.activeTab) {
      return location.state.activeTab;
    }
    return "dashboard";
  });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Persist activeTab in localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem("superadmin_activeTab", activeTab);
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };
  // Map sidebar keys to permission strings
  const sidebarConfig = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <DashboardIcon fontSize="small" />,
      perm: "dashboard:view",
    },
    {
      key: "plant",
      label: "Plant Master",
      icon: <FactoryIcon fontSize="small" />,
      perm: "plantMaster:view",
    },
    {
      key: "role",
      label: "Role Master",
      icon: <SecurityIcon fontSize="small" />,
      perm: "roleMaster:view",
    },
    {
      key: "vendor",
      label: "Vendor Information",
      icon: <ListAltIcon fontSize="small" />,
      perm: "vendorMaster:view",
    },
    {
      key: "department",
      label: "Department ",
      icon: <SecurityIcon fontSize="small" />,
      perm: "department:view",
    },
    {
      key: "application",
      label: "Application Master",
      icon: <AppsIcon fontSize="small" />,
      perm: "applicationMaster:view",
    },
    {
      key: "user",
      label: "User Master",
      icon: <PersonIcon fontSize="small" />,
      perm: "userMaster:view",
    },
    {
      key: "workflow",
      label: "Approval Workflow",
      icon: <AssignmentIcon fontSize="small" />,
      perm: "workflow:view",
    },
  ];
  // Map role_id to role string for RBAC
  const getRoleFromId = (role_id: number): Role => {
    switch (role_id) {
      case 1:
        return "superAdmin";
      case 2:
        return "plantAdmin";
      case 3:
        return "qaManager";
      default:
        return "user";
    }
  };

  // Permissions: disable sidebar items if user lacks permission
  let userPermissions: string[] = [];
  if (user) {
    const role = getRoleFromId(user.role_id);
    // Map sidebarConfig perms to role perms (for this UI)
    if (role === "superAdmin") {
      userPermissions = sidebarConfig.map((item) => item.perm);
    } else if (role === "plantAdmin") {
      userPermissions = [
        "dashboard:view",
        "plantMaster:view",
        "userMaster:view",
        "workflow:view",
      ];
    } else if (role === "qaManager") {
      userPermissions = [
        "dashboard:view",
        "roleMaster:view",
        "applicationMaster:view",
        "workflow:view",
      ];
    } else {
      userPermissions = ["dashboard:view"];
    }
  }
  const disabledKeys =
    user && user.role_id !== 1 // 1 = superadmin, all access
      ? sidebarConfig
          .filter((item) => !userPermissions.includes(item.perm))
          .map((item) => item.key)
      : [];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView handleLogout={handleLogout} />;
      case "plant":
        return (
          <div>
            <PlantMasterTable />
          </div>
        );
      case "role":
        return (
          <div>
            <RoleMasterTable />
          </div>
        );
      case "vendor":
        return (
          <div>
            <VendorMasterTable />
          </div>
        );
      case "department":
        return (
          <div>
            <DepartmentMasterTable />
          </div>
        );
      case "application":
        return (
          <div>
            <ApplicationMasterTable />
          </div>
        );
      case "user":
        return (
          <div>
            <UserMasterTable />
          </div>
        );
      case "workflow":
        return (
          <div>
            <WorkflowBuilder />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles["main-container"]}>
      <aside className={styles.sidebar}>
        <div className={styles["sidebar-header"]}>
          <img
            src={login_headTitle2}
            alt="Company logo"
            style={{ width: 250, height: 35 }}
          />

          <br />
          <span>Unichem Laboratories</span>
        </div>
        <nav>
          <div className={styles["sidebar-group"]}>OVERVIEW</div>
          {sidebarConfig.map((item, idx) => (
            <button
              key={item.key}
              className={`${styles["nav-button"]} ${
                activeTab === item.key ? styles.active : ""
              }`}
              onClick={() => {
                if (!disabledKeys.includes(item.key)) {
                  setActiveTab(item.key);
                  localStorage.setItem("superadmin_activeTab", item.key);
                }
              }}
              disabled={disabledKeys.includes(item.key)}
              style={
                disabledKeys.includes(item.key)
                  ? { opacity: 0.5, cursor: "not-allowed" }
                  : {}
              }
            >
              {item.icon} {item.label}
            </button>
            // Add sidebar group dividers as needed
          ))}
          <div className={styles["sidebar-footer"]}>
            <div className={styles["admin-info"]}>
              <div className={styles.avatar}>A</div>
              <div>
                <strong>{user ? user.username : "admin"}</strong>
                <div className={styles.subtext}>
                  {user && user.role_id === 1
                    ? "Super Admin"
                    : user && user.role_id === 2
                    ? "Plant Admin"
                    : user && user.role_id === 3
                    ? "QA Manager"
                    : "User"}
                </div>
              </div>
            </div>
            <button className={styles["logout-button"]} onClick={handleLogout}>
              <LogoutIcon fontSize="small" /> Logout
            </button>
          </div>
        </nav>
      </aside>
      <main className={styles["main-content"]}>{renderContent()}</main>
    </div>
  );
};

const DashboardView = ({ handleLogout }: { handleLogout: () => void }) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const handleProfileClick = () => setProfileOpen((prev) => !prev);
  return (
    <div>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>System Dashboard</h2>
        <div className={styles["header-icons"]}>
          <span className={styles["header-icon"]}>
            <NotificationsIcon fontSize="small" />
          </span>
          <span className={styles["header-icon"]}>
            <SettingsIcon fontSize="small" />
          </span>
          <span
            className={styles["header-icon"]}
            onClick={handleProfileClick}
            style={{
              cursor: "pointer",
              position: "relative",
              borderRadius: "50%",
            }}
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
                  <LogoutIcon />{" "}
                  <span
                    style={{
                      position: "absolute",
                      marginTop: "6px",
                      marginLeft: "6px",
                    }}
                  >
                    Logout
                  </span>
                </button>
              </div>
            )}
          </span>
        </div>
      </header>

      <div className={styles.dashboard1}>
        <h2>System Overview</h2>
        <div className={styles["overview-cards"]}>
          <Card
            icon={<CalendarMonthIcon fontSize="medium" />}
            color="#1a8e3a"
            label="Plants"
            value="4"
            sub="+2 this month"
          />
          <Card
            icon={<AssignmentIcon fontSize="medium" />}
            color="#1a61d1"
            label="Applications"
            value="5"
            sub="+3 this week"
          />
          <Card
            icon={<GroupIcon fontSize="medium" />}
            color="#005b4f"
            label="Active Users"
            value="5"
            sub="+5 this month"
          />
          <Card
            icon={<ListAltIcon fontSize="medium" />}
            color="#ff8000"
            label="Workflows"
            value="4"
            sub="All active"
          />
        </div>
                return (
                  <div>
                    <DepartmentMasterTable />
                  </div>
                );
        <div className={styles["dashboard-bottom"]}>
          <div className={styles["chart-section"]}>
            <h3>System Status Distribution</h3>
            <div className={styles["donut-chart-wrapper"]}>
              <DonutChart />
            </div>

            <div className={styles.legend}>
              <span className={styles["legend-item"]}>
                <span
                  className={styles["legend-dot"]}
                  style={{ backgroundColor: "#22c0d3" }}
                ></span>{" "}
                Active Applications
              </span>

              <span className={styles["legend-item"]}>
                🟨 Inactive Applications
              </span>
              <span className={styles["legend-item"]}>🟥 Pending Requests</span>
              <span className={styles["legend-item"]}>
                🟩 Approved Requests
              </span>
            </div>
          </div>
          <div className={styles["activity-section"]}>
            <h3>Recent Activity</h3>
            <ul className={styles["activity-list"]}>
              <li>
                <div className={styles["activity-icon"]}>
                  <SyncIcon fontSize="small" />
                </div>
                <div>
                  <strong>Added SAP ERP v2.1</strong> for Mumbai Plant
                  <span>
                    <br />
                    29 Jul 2025
                  </span>
                </div>
              </li>
              <li>
                <div className={styles["activity-icon"]}>
                  <SyncIcon fontSize="small" />
                </div>
                <div>
                  <strong>Request REQ001</strong> for SAP ERP access
                  <span>
                    <br />
                    29 Jul 2025
                  </span>
                </div>
              </li>
              <li>
                <div className={styles["activity-icon"]}>
                  <SyncIcon fontSize="small" />
                </div>
                <div>
                  <strong>Approved REQ002</strong> for QMS access
                  <span>
                    <br />
                    29 Jul 2025
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const Card = ({ icon, label, value, sub, color }: any) => (
  <div className={styles["overview-card"]}>
    <div className={styles.iconBox} style={{ backgroundColor: color }}>
      {icon}
    </div>
    <div className={styles.info}>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      <div className={styles.sub}>{sub}</div>
    </div>
  </div>
);

export default SuperAdmin;
