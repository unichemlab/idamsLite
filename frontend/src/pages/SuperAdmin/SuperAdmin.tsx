import React, { useState, useEffect } from "react";
import { API_BASE } from "../../utils/api";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./SuperAdmin.module.css";
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
} from "@mui/icons-material";
// ----- Component -----
import ServerInventoryMasterTable from "pages/ServerInventoryMasterTable/ServerInventoryMasterTable";
import PlantMasterTable from "pages/PlantMasterTable/PlantMasterTable";
import DepartmentMasterTable from "pages/DepartmentMasterTable/DepartmentMasterTable";
import VendorMasterTable from "pages/VendorMasterTable/VendorMasterTable";
import ActivityMasterTable from "pages/ActivityMasterTable/ActivityMasterTable";
import TaskTable from "pages/TaskClosureTracking/TaskClosureTracking";
import ITSupport from "pages/PlantITSupport/PlantITSupportMaster";
import ApprovalWorkflow from "pages/Approvalworkflow/WorkflowBuilder";
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

interface DashboardCounts {
  applications: { total: string; active: string; inactive: string };
  departments: { total: string; active: string; inactive: string };
  networkInventory: {
    total: string;
    active: string | null;
    inactive: string | null;
  };
  plants: { total: string; active: string; inactive: string };
  roles: { total: string; active: string; inactive: string };
  serverInventory: { total: string; active: string; inactive: string };
  systemInventory: { total: string; active: string; inactive: string };
  userRequests: { pending: string; approved: string; rejected: string };
  users: { total: string; active: string; inactive: string };
  vendors: { total: string; active: string; inactive: string };
}

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
    { key: "task", label: "Task", icon: <ListAltIcon fontSize="small" />, perm: "Task:view" },
    { key: "activity-logs", label: "Activity Logs", icon: <ListAltIcon fontSize="small" />, perm: "activityMaster:view" },
    { key: "workflow", label: "Approval Workflow", icon: <AssignmentIcon fontSize="small" />, perm: "workflow:view" },
    {
      key: "approval-workflow",
      label: "Application Workflow",
      icon: <AssignmentIcon fontSize="small" />,
      perm: "workflow:view",
    },
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
      perms.push(
        "dashboard:view",
        "plantMaster:view",
        "userMaster:view",
        "workflow:view"
      );
    }
    if (userRoles.includes("qaManager")) {
      perms.push(
        "dashboard:view",
        "roleMaster:view",
        "applicationMaster:view",
        "workflow:view"
      );
    }
    userPermissions = Array.from(new Set(perms)); // remove duplicates
  }

  const disabledKeys = sidebarConfig
    .filter((item) => !userPermissions.includes(item.perm))
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
      case "dashboard":
        return <DashboardView handleLogout={handleLogout} />;
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
        return <RoleMasterTable onAdd={handleRoleAdd} onEdit={handleRoleEdit} />;
      case "vendor": return <VendorMasterTable />;
      case "department": return <DepartmentMasterTable />;
      case "application": return <ApplicationMasterTable />;
      case "user": return <UserMasterTable />;
      case "request": return <UserRequestTable />;
      case "workflow": return <WorkflowBuilder />;
      case "approval-workflow": return <ApprovalWorkflow />;
      case "system": return <SystemInventoryMasterTable />;
      case "activity-logs": return <ActivityMasterTable />;
      case "task": return <TaskTable />;
      case "server":
        return <ServerInventoryMasterTable />;
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
          <span>Unichem Laboratories</span>
        </div>
        <nav>
          <div className={styles["sidebar-group"]}>OVERVIEW</div>
          {sidebarConfig.map((item) => (
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
          ))}
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
const DashboardView = ({ handleLogout }: { handleLogout: () => void }) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const handleProfileClick = () => setProfileOpen((prev) => !prev);
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  useEffect(() => {
    fetch(`${API_BASE}/api/dashboard/counts`)
      .then((res) => res.json())
      .then((data) => setCounts(data))
      .catch((err) => console.error("Dashboard fetch error:", err));
  }, []);

  if (!counts) return <p>Loading dashboard...</p>;

  const userRequestData = [
    {
      name: "Pending",
      value: Number(counts.userRequests.pending),
      color: "#FFA500",
    },
    {
      name: "Approved",
      value: Number(counts.userRequests.approved),
      color: "#4CAF50",
    },
    {
      name: "Rejected",
      value: Number(counts.userRequests.rejected),
      color: "#F44336",
    },
  ];

  const userStatusData = [
    {
      name: "Active Users",
      value: Number(counts.users.active),
      color: "#2196F3",
    },
    {
      name: "Inactive Users",
      value: Number(counts.users.inactive),
      color: "#9E9E9E",
    },
  ];

  // Cards data mapping
  const cards = [
    { label: "Applications", icon: <AppsIcon />, data: counts.applications },
    { label: "Plants", icon: <FactoryIcon />, data: counts.plants },
    { label: "Users", icon: <PersonIcon />, data: counts.users },
    {
      label: "User Requests",
      icon: <AssignmentIcon />,
      data: counts.userRequests,
    },
    { label: "Departments", icon: <FactoryIcon />, data: counts.departments },
    { label: "Roles", icon: <PersonIcon />, data: counts.roles },
    { label: "Vendors", icon: <FactoryIcon />, data: counts.vendors },
    {
      label: "Network Inventory",
      icon: <FactoryIcon />,
      data: counts.networkInventory,
    },
    {
      label: "Server Inventory",
      icon: <FactoryIcon />,
      data: counts.serverInventory,
    },
    {
      label: "System Inventory",
      icon: <FactoryIcon />,
      data: counts.systemInventory,
    },
  ];

  console.log(counts);
  return (
    <div>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>System Dashboard</h2>
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
        <h2>System Overview</h2>
        <div className={styles["overview-cards"]}>
          {/* Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
            }}
          >
            {cards.map((card, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: 16,
                  background: "#fff",
                  borderRadius: 8,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{ fontSize: 32, marginRight: 12, color: "#1976d2" }}
                >
                  {card.icon}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14, color: "#555" }}>
                    {card.label}
                  </h3>
                  {"total" in card.data ? (
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    >
                      Total: {card.data.total} | Active: {card.data.active || 0}{" "}
                      | Inactive: {card.data.inactive || 0}
                    </p>
                  ) : (
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    >
                      Pending: {card.data.pending} | Approved:{" "}
                      {card.data.approved} | Rejected: {card.data.rejected}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Donut Charts */}
          <div style={{ display: "flex", gap: 30, marginTop: 40 }}>
            {/* User Requests */}
            <div
              style={{
                flex: 1,
                background: "#fff",
                padding: 20,
                borderRadius: 16,
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              }}
            >
              <h3 style={{ textAlign: "center" }}>User Request Status</h3>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={userRequestData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={4}
                      label
                    >
                      {userRequestData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Users */}
            <div
              style={{
                flex: 1,
                background: "#fff",
                padding: 20,
                borderRadius: 16,
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              }}
            >
              <h3 style={{ textAlign: "center" }}>User Status</h3>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={userStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={4}
                      label
                    >
                      {userStatusData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdmin;
