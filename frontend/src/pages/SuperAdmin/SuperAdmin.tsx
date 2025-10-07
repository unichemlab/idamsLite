import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./SuperAdmin.module.css";
import {
  Dashboard as DashboardIcon,
  Factory as FactoryIcon,
  Security as SecurityIcon,
  ListAlt as ListAltIcon,
  Apps as AppsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  CalendarMonth as CalendarMonthIcon,
  Assignment as AssignmentIcon,
  Group as GroupIcon,
  Sync as SyncIcon,
} from "@mui/icons-material";
// ----- Component -----
import ServerInventoryMasterTable from "pages/ServerInventoryMasterTable/ServerInventoryMasterTable";

import DonutChart from "../../components/Common/DonutChart";
import PlantMasterTable from "pages/PlantMasterTable/PlantMasterTable";
import DepartmentMasterTable from "pages/DepartmentMasterTable/DepartmentMasterTable";
import VendorMasterTable from "pages/VendorMasterTable/VendorMasterTable";
import ActivityMasterTable from "pages/ActivityMasterTable/ActivityMasterTable";
import UserRequestTable from "pages/UserRequestTable/UserRequestTable";
import RoleMasterTable from "pages/RoleMasterTable/RoleMasterTable";
import UserMasterTable from "pages/UserMasterTable/UserMasterTable";
import ApplicationMasterTable from "pages/ApplicationMasterTable/ApplicationMasterTable";
import WorkflowBuilder from "pages/WorkflowBuilder/WorkflowBuilder";
import SystemInventoryMasterTable from "pages/SystemInventoryMasterTable/SystemInventoryMasterTable";
import AddRoleFormPage from "RoleMaster/AddRoleFormPage";
import EditRoleFormPage from "RoleMaster/EditRoleFormPage";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { useAuth } from "../../context/AuthContext";

// ----- Types -----
type Role = "superAdmin" | "plantAdmin" | "qaManager" | "user";

type SidebarItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  perm: string;
};


const SuperAdmin: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>(() => {
    const stored = localStorage.getItem("superadmin_activeTab");
    if (stored) return stored;
    if (location.state?.activeTab) return location.state.activeTab;
    return "dashboard";
  });

  useEffect(() => {
    localStorage.setItem("superadmin_activeTab", activeTab);
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // ----- Sidebar config -----
  const sidebarConfig: SidebarItem[] = [
    { key: "dashboard", label: "Dashboard", icon: <DashboardIcon fontSize="small" />, perm: "dashboard:view" },
    { key: "plant", label: "Plant Master", icon: <FactoryIcon fontSize="small" />, perm: "plantMaster:view" },
    { key: "role", label: "Role Master", icon: <SecurityIcon fontSize="small" />, perm: "roleMaster:view" },
    { key: "vendor", label: "Vendor Information", icon: <ListAltIcon fontSize="small" />, perm: "vendorMaster:view" },
    { key: "department", label: "Department Master", icon: <SecurityIcon fontSize="small" />, perm: "department:view" },
    { key: "application", label: "Application Master", icon: <AppsIcon fontSize="small" />, perm: "applicationMaster:view" },
    { key: "user", label: "User Master", icon: <PersonIcon fontSize="small" />, perm: "userMaster:view" },
    { key: "request", label: "User Request", icon: <ListAltIcon fontSize="small" />, perm: "userRequest:view" },
    { key: "activity-logs", label: "Activity Logs", icon: <ListAltIcon fontSize="small" />, perm: "activityMaster:view" },
    { key: "workflow", label: "Approval Workflow", icon: <AssignmentIcon fontSize="small" />, perm: "workflow:view" },
    { key: "system", label: "System Inventory", icon: <AssignmentIcon fontSize="small" />, perm: "system:view" },
    {
      key: "server",
      label: "Server Inventory",
      icon: <AssignmentIcon fontSize="small" />,
      perm: "server:view",
    },
  ];

  // ----- Role mapping for multi-role users -----
  const getRolesFromIds = (roleIds: number[]): Role[] => {
    return Array.from(new Set(
      roleIds.map((id) => {
        switch (id) {
          case 1: return "superAdmin";
          case 2: return "plantAdmin";
          case 3: return "qaManager";
          default: return "user";
        }
      })
    ));
  };

  // ----- Compute user permissions based on roles -----
  const roleIdsArray: number[] = user
  ? Array.isArray(user.role_id)
    ? user.role_id
    : typeof user.role_id === "number"
    ? [user.role_id]
    : []
  : [];

console.log("[SuperAdmin] roleIdsArray:", roleIdsArray);
  const userRoles = getRolesFromIds(roleIdsArray);

  console.log("[SuperAdmin] roleIdsArray:", roleIdsArray);

  let userPermissions: string[] = [];
  if (userRoles.includes("superAdmin")) {
    userPermissions = sidebarConfig.map((item) => item.perm);
  } else {
    const perms: string[] = [];
    if (userRoles.includes("plantAdmin")) {
      perms.push("dashboard:view", "plantMaster:view", "userMaster:view", "workflow:view");
    }
    if (userRoles.includes("qaManager")) {
      perms.push("dashboard:view", "roleMaster:view", "applicationMaster:view", "workflow:view");
    }
    userPermissions = Array.from(new Set(perms)); // remove duplicates
  }

  const disabledKeys = sidebarConfig
    .filter((item) => !userPermissions.includes(item.perm))
    .map((item) => item.key);

  // ----- Role Master panel state -----
  const [rolePanelMode, setRolePanelMode] = useState<"table" | "add" | "edit">("table");
  const [editRoleId, setEditRoleId] = useState<number | null>(null);

  useEffect(() => {
    setRolePanelMode("table");
    setEditRoleId(null);
  }, [activeTab]);

  const handleRoleAdd = () => setRolePanelMode("add");
  const handleRoleEdit = (id: number) => {
    setEditRoleId(id);
    setRolePanelMode("edit");
  };
  const handleRolePanelClose = () => {
    setRolePanelMode("table");
    setEditRoleId(null);
  };

  // ----- Render main content -----
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView handleLogout={handleLogout} />;
      case "plant":
        return <PlantMasterTable />;
      case "role":
        if (rolePanelMode === "add") return <AddRoleFormPage onCancel={handleRolePanelClose} />;
        if (rolePanelMode === "edit" && editRoleId !== null) {
          return <EditRoleFormPage roleId={editRoleId} onCancel={handleRolePanelClose} />;
        }
        return <RoleMasterTable onAdd={handleRoleAdd} onEdit={handleRoleEdit} />;
      case "vendor": return <VendorMasterTable />;
      case "department": return <DepartmentMasterTable />;
      case "application": return <ApplicationMasterTable />;
      case "user": return <UserMasterTable />;
      case "request": return <UserRequestTable />;
      case "workflow": return <WorkflowBuilder />;
      case "system": return <SystemInventoryMasterTable />;
      case "activity-logs": return <ActivityMasterTable />;
       case "server":
        return <ServerInventoryMasterTable />;    
      default: return null;
    }
  };

  // ----- Render -----
  return (
    <div className={styles["main-container"]}>
      <aside className={styles.sidebar}>
        <div className={styles["sidebar-header"]}>
          <img src={login_headTitle2} alt="Company logo" style={{ width: 250, height: 35 }} />
          <br />
          <span>Unichem Laboratories</span>
        </div>
        <nav>
          <div className={styles["sidebar-group"]}>OVERVIEW</div>
          {sidebarConfig.map((item) => (
            <button
              key={item.key}
              className={`${styles["nav-button"]} ${activeTab === item.key ? styles.active : ""}`}
              onClick={() => {
                if (!disabledKeys.includes(item.key)) {
                  setActiveTab(item.key);
                  localStorage.setItem("superadmin_activeTab", item.key);
                }
              }}
              disabled={disabledKeys.includes(item.key)}
              style={disabledKeys.includes(item.key) ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              {item.icon} {item.label}
            </button>
          ))}
          <div className={styles["sidebar-footer"]}>
            <div className={styles["admin-info"]}>
              <div className={styles.avatar}>A</div>
              <div>
                <strong>{user?.username || "admin"}</strong>
                <div className={styles.subtext}>
                  {userRoles.includes("superAdmin") ? "Super Admin" :
                   userRoles.includes("plantAdmin") ? "Plant Admin" :
                   userRoles.includes("qaManager") ? "QA Manager" : "User"}
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

// ----- DashboardView -----
const DashboardView = ({ handleLogout }: { handleLogout: () => void }) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const handleProfileClick = () => setProfileOpen((prev) => !prev);

  return (
    <div>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>System Dashboard</h2>
        <div className={styles["header-icons"]}>
          <NotificationsIcon fontSize="small" />
          <SettingsIcon fontSize="small" />
          <PersonIcon fontSize="small" onClick={handleProfileClick} style={{ cursor: "pointer", position: "relative", borderRadius: "50%" }} />
          {profileOpen && (
            <div style={{ position: "absolute", right: 0, top: 30, border: "1px solid #ccc", background: "#fff", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 10, minWidth: 120 }}>
              <button style={{ width: "100%", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }} onClick={() => { setProfileOpen(false); handleLogout(); }}>
                <LogoutIcon /> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={styles.dashboard1}>
        <h2>System Overview</h2>
        <div className={styles["overview-cards"]}>
          {/* Example cards */}
        </div>
      </div>
    </div>
  );
};

export default SuperAdmin;