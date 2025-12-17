import React, { useState, useEffect } from "react";
import { API_BASE } from "../../utils/api";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "../SuperAdmin/SuperAdmin.module.css";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
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
  Assignment as AssignmentIcon,
  ExpandMore,
  ChevronRight,
} from "@mui/icons-material";
import { sidebarConfig,SidebarConfigItem } from "../../components/Common/sidebarConfig";
import { useAbility } from "../../context/AbilityContext";
// ----- Component -----
import ServerInventoryMasterTable from "pages/ServerInventoryMasterTable/ServerInventoryMasterTable";
import PlantMasterTable from "pages/PlantMasterTable/PlantMasterTable";
import DepartmentMasterTable from "pages/DepartmentMasterTable/DepartmentMasterTable";
import VendorMasterTable from "pages/VendorMasterTable/VendorMasterTable";
import ActivityMasterTable from "pages/ActivityMasterTable/ActivityMasterTable";
import TaskTable from "pages/TaskClosureTracking/TaskClosureTracking";
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
import DashboardView from "../SuperAdmin/SuperAdmin";
import MasterApprovalBin from "pages/MasterApprovalBin/MasterApprovalBin";
import PlantSupportBin from "pages/PlantITSupport/PlantITSupportMaster";
import AccessLogTable from "pages/AccessLogTable/AccessLogTable";
// ----- Types -----
type Role = "superAdmin" | "plantAdmin" | "qaManager" | "user";

const HomePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>(() => {
    const stored = localStorage.getItem("superadmin_activeTab");
    if (stored) return stored;
    if (location.state?.activeTab) return location.state.activeTab;
    return "home";
  });
// Expanded menus state
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(
    new Set(["masters"])
  );
  useEffect(() => {
    localStorage.setItem("superadmin_activeTab", activeTab);
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Handle navigation
  const handleNavigation = (key: string, hasChildren: boolean) => {
    if (hasChildren) {
      // Toggle submenu
      setExpandedMenus((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
          newSet.delete(key);
        } else {
          newSet.add(key);
        }
        return newSet;
      });
    } else {
      // Navigate to page
      if (!disabledKeys.includes(key)) {
        setActiveTab(key);
        localStorage.setItem("superadmin_activeTab", key);
      }
    }
  };

  // Render menu item (with support for nesting)
  const renderMenuItem = (item: SidebarConfigItem, level: number = 0) => {
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isExpanded = expandedMenus.has(item.key);
    const isActive = activeTab === item.key;
    const isDisabled = disabledKeys.includes(item.key);
    const isParentOfActive =
      hasChildren && item.children?.some((child) => child.key === activeTab);

    return (
      <div key={item.key}>
        <button
          className={`${styles["nav-button"]} ${
            isActive || isParentOfActive ? styles.active : ""
          }`}
          onClick={() => !isDisabled && handleNavigation(item.key, hasChildren)}
          disabled={isDisabled}
          style={{
            paddingLeft: `${16 + level * 20}px`,
            opacity: isDisabled ? 0.5 : 1,
            cursor: isDisabled ? "not-allowed" : "pointer",
            fontWeight: isActive || isParentOfActive ? 700 : 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {item.icon} {item.label}
          </span>
          {hasChildren &&
            (isExpanded ? (
              <ExpandMore fontSize="small" />
            ) : (
              <ChevronRight fontSize="small" />
            ))}
        </button>

        {hasChildren && isExpanded && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              borderLeft: "2px solid rgba(255, 255, 255, 0.1)",
              marginLeft: "12px",
            }}
          >
            {item.children?.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };



  // Use shared sidebarConfig and an ability mapper to translate legacy perm names
  const ability = useAbility();

  const mapSidebarPermToAbility = (perm?: string) => {
    if (!perm) return null;
    // Example: "roleMaster:view" -> action: view -> read, subject: roles
    const [subjectKey, action] = perm.split(":");
    const actionMap: Record<string, string> = {
      view: "read",
      add: "create",
      edit: "update",
      delete: "delete",
    };
    const subjectMap: Record<string, string> = {
      roleMaster: "roles",
      plantMaster: "plants",
      vendorMaster: "vendors",
      department: "departments",
      applicationMaster: "applications",
      userMaster: "users",
      userRequest: "user_requests",
      activityMaster: "activity",
      workflow: "workflows",
      system: "systems",
      server: "servers",
      dashboard: "dashboard",
      Task: "tasks",
      TaskPlantITSupport :"it_support"
    };
    const act = actionMap[action] || action;
    const subj = subjectMap[subjectKey] || subjectKey;
    return `${act}:${subj}`;
  };

  // ----- Role mapping for multi-role users -----
  const getRolesFromIds = (roleIds: number[]): Role[] => {
    return Array.from(
      new Set(
        roleIds.map((id) => {
          switch (id) {
            case 1:
              return "superAdmin";
            case 2:
              return "plantAdmin";
            case 3:
              return "qaManager";
            default:
              return "user";
          }
        })
      )
    );
  };

  // ----- Compute user roles for display -----
  const roleIdsArray: number[] = user
    ? Array.isArray(user.role_id)
      ? user.role_id
      : typeof user.role_id === "number"
      ? [user.role_id]
      : []
    : [];
  const userRoles = getRolesFromIds(roleIdsArray);

  // Determine disabled keys using ability checks (falls back to role-based SuperAdmin handling)
  const disabledKeys = sidebarConfig
    .filter((item) => {
      const mapped = mapSidebarPermToAbility(item.perm);
      if (!mapped) return false; // don't disable if unknown
      // SuperAdmin will have manage:all and ability.can will reflect that
      return !ability.can(mapped as any);
    })
    .map((item) => item.key);

  // ----- Role Master panel state -----
  const [rolePanelMode, setRolePanelMode] = useState<"table" | "add" | "edit">(
    "table"
  );
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
        case "home":
        return <HomepageView handleLogout={handleLogout} />;
      case "dashboard":
        return <DashboardView />;
      case "plant":
        return <PlantMasterTable />;
      case "role":
        if (rolePanelMode === "add")
          return <AddRoleFormPage onCancel={handleRolePanelClose} />;
        if (rolePanelMode === "edit" && editRoleId !== null) {
          return (
            <EditRoleFormPage
              roleId={editRoleId}
              onCancel={handleRolePanelClose}
            />
          );
        }
        return (
          <RoleMasterTable onAdd={handleRoleAdd} onEdit={handleRoleEdit} />
        );
      case "vendor":
        return <VendorMasterTable />;
      case "department":
        return <DepartmentMasterTable />;
      case "application":
        return <ApplicationMasterTable />;
      case "user":
        return <UserMasterTable />;
      case "request":
        return <UserRequestTable />;
      case "workflow":
        return <WorkflowBuilder />;
      case "system":
        return <SystemInventoryMasterTable />;
      case "activity-logs":
        return <ActivityMasterTable />;
        case "access-log":
        return <AccessLogTable />;
      case "task":
        return <TaskTable />;
      case "server":
        return <ServerInventoryMasterTable />;
      case "master-approval":
        return <MasterApprovalBin />;
        case "plant-itsupport":
        return <PlantSupportBin />;
      default:
        return null;
    }
  };

  // ----- Render -----
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
          <span className={styles.version}>version-1.0</span>
        </div>
        <nav>
          <div className={styles["sidebar-group"]}>OVERVIEW</div>
          {sidebarConfig.map((item) => renderMenuItem(item))}
          <div className={styles["sidebar-footer"]}>
            <div className={styles["admin-info"]}>
              <div className={styles.avatar}>A</div>
              <div>
                <strong>{user?.username || "admin"}</strong>
                <div className={styles.subtext}>
                  {userRoles.includes("superAdmin")
                    ? "Super Admin"
                    : userRoles.includes("plantAdmin")
                    ? "Plant Admin"
                    : userRoles.includes("qaManager")
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

// ----- DashboardView -----
const HomepageView = ({ handleLogout }: { handleLogout: () => void }) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const handleProfileClick = () => setProfileOpen((prev) => !prev);


  return (
    <div>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Home Page</h2>
        <div className={styles["header-icons"]}>
          <NotificationsIcon fontSize="small" />
          <SettingsIcon fontSize="small" />
          <PersonIcon
            fontSize="small"
            onClick={handleProfileClick}
            style={{
              cursor: "pointer",
              position: "relative",
              borderRadius: "50%",
            }}
          />
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
                <LogoutIcon /> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={styles.dashboard1}>
        <div className={styles["overview-cards"]}>
            <div style={{ padding: "20px" }}>
      <h2>Welcome to IDMAS Portal</h2>
        <p> A fast, secure and simplified Identity & Access Management System
            designed to empower your organization with complete control over user
            access, workflows and approvals.</p>
    </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
