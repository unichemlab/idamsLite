import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import styles from "./dashboard.module.css";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Apps as AppsIcon,
  Factory as FactoryIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material";
import AppHeader from "../../components/Common/AppHeader";
import { MENU_CONFIG, MenuItem } from "../../config/masterModules";
import { useAbility } from "../../context/AbilityContext";

/* ================= TYPES ================= */

interface DashboardCounts {
  applications: { total: string; active: string; inactive: string };
  departments: { total: string; active: string; inactive: string };
  plants: { total: string; active: string; inactive: string };
  roles: { total: string; active: string; inactive: string };
  vendors: { total: string; active: string; inactive: string };
  networkInventory: { total: string; active: string | null; inactive: string | null };
  serverInventory: { total: string; active: string; inactive: string };
  systemInventory: { total: string; active: string; inactive: string };
  users: { total: string; active: string; inactive: string };
  userRequests: { pending: string; approved: string; rejected: string };
}

/* ================= MENU HELPERS ================= */

const flattenMenu = (items: MenuItem[]): MenuItem[] =>
  items.flatMap((i) => (i.children ? [i, ...flattenMenu(i.children)] : [i]));

const getRouteByLabel = (label: string) =>
  flattenMenu(MENU_CONFIG).find((i) => i.label === label)?.route;

const getPermissionByLabel = (label: string) =>
  flattenMenu(MENU_CONFIG).find((i) => i.label === label)?.permission;

/* ================= KPI → MENU MAP ================= */

const KPI_MENU_MAP: Record<string, string> = {
  Applications: "Application Master",
  Plants: "Plant Master",
  Users: "User Master",
  "User Requests": "User Request Management",
  Departments: "Department Master",
  Roles: "Role Master",
  Vendors: "Vendor Information",
  "Network Inventory": "Network Master",
  "Server Inventory": "Server Inventory",
  "System Inventory": "System Inventory",
};

/* ================= COMPONENT ================= */

const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const ability = useAbility();
  const [counts, setCounts] = useState<DashboardCounts | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/dashboard/counts`)
      .then((r) => r.json())
      .then(setCounts)
      .catch(console.error);
  }, []);

  const cards = useMemo(
    () =>
      counts
        ? [
            { label: "Applications", icon: <AppsIcon />, data: counts.applications },
            { label: "Plants", icon: <FactoryIcon />, data: counts.plants },
            { label: "Users", icon: <PersonIcon />, data: counts.users },
            { label: "User Requests", icon: <AssignmentIcon />, data: counts.userRequests },
            { label: "Departments", icon: <FactoryIcon />, data: counts.departments },
            { label: "Roles", icon: <PersonIcon />, data: counts.roles },
            { label: "Vendors", icon: <FactoryIcon />, data: counts.vendors },
            { label: "Network Inventory", icon: <FactoryIcon />, data: counts.networkInventory },
            { label: "Server Inventory", icon: <FactoryIcon />, data: counts.serverInventory },
            { label: "System Inventory", icon: <FactoryIcon />, data: counts.systemInventory },
          ]
        : [],
    [counts]
  );

  if (!counts) {
    return (
      <div className={styles.pageWrapper}>
        <AppHeader title="System Dashboard" />
        <div className={styles.loader}>Loading dashboard…</div>
      </div>
    );
  }

  const userRequestData = [
    { name: "Pending", value: +counts.userRequests.pending, color: "#f59e0b" },
    { name: "Approved", value: +counts.userRequests.approved, color: "#22c55e" },
    { name: "Rejected", value: +counts.userRequests.rejected, color: "#ef4444" },
  ];

  const userStatusData = [
    { name: "Active", value: +counts.users.active, color: "#2563eb" },
    { name: "Inactive", value: +counts.users.inactive, color: "#9ca3af" },
  ];

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="System Dashboard" />

      <div className={styles.contentArea}>
        <div className={styles.sectionTitle}>
          <h2>System Overview</h2>
          <span>Live Statistics</span>
        </div>

        {/* ================= KPI GRID ================= */}
        <div className={styles.grid12}>
          {cards.map((card) => {
            const menuLabel = KPI_MENU_MAP[card.label];
            const route = menuLabel && getRouteByLabel(menuLabel);
            const permission = menuLabel && getPermissionByLabel(menuLabel);
            const hasAccess = permission ? ability.can(permission as any) : true;

            return (
              <div
                key={card.label}
                className={`${styles.statCard} ${styles.col2} ${
                  !hasAccess ? styles.disabledCard : ""
                }`}
                onClick={() => hasAccess && route && navigate(route)}
              >
                <div className={styles.statTop}>
                  <div className={styles.icon}>{card.icon}</div>
                  <div className={styles.label}>{card.label}</div>
                </div>

                {"total" in card.data ? (
                  <>
                    <div className={styles.total}>{card.data.total}</div>
                    <div className={styles.meta}>
                      <span className={styles.active}>{card.data.active || 0} Active</span>
                      <span className={styles.inactive}>{card.data.inactive || 0} Inactive</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.total}>{card.data.pending}</div>
                    <div className={styles.meta}>
                      <span className={styles.approved}>{card.data.approved} Approved</span>
                      <span className={styles.rejected}>{card.data.rejected} Rejected</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* ================= CHARTS ================= */}
        <div className={styles.grid12}>
          {[userRequestData, userStatusData].map((data, idx) => (
            <div key={idx} className={`${styles.chartCard} ${styles.col4}`}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={100}
                  >
                    {data.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ))}

          <div className={`${styles.chartCard} ${styles.col4}`}>
            <div className={styles.placeholder}>System Health (Coming Soon)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
