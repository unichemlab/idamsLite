import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import styles from "./dashboard.module.css";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import AppHeader from "../../components/Common/AppHeader";
import { MENU_CONFIG, MenuItem } from "../../config/masterModules";

/* ============================================================
   TYPES
   ============================================================ */

interface DashboardCounts {
  applications:     { total: string; active: string; inactive: string };
  departments:      { total: string; active: string; inactive: string };
  plants:           { total: string; active: string; inactive: string };
  roles:            { total: string; active: string; inactive: string };
  vendors:          { total: string; active: string; inactive: string };
  networkInventory: { total: string; active: string | null; inactive: string | null };
  serverInventory:  { total: string; active: string; inactive: string };
  systemInventory:  { total: string; active: string; inactive: string };
  users:            { total: string; active: string; inactive: string };
  userRequests:     { pending: string; approved: string; rejected: string; completed: string };
  requestTrend:     any[];
  requestTypes:     any[];
  taskStatus:       any[];
  taskActions:      any[];
  pendingByModule:  any[];
  requestForBy:     any[];
  locationActivity: any[];
  taskClosureTrend: any[];
}

/* ============================================================
   JWT / USER
   ============================================================ */

const decodeJWT = (token: string): any => {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(b64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
  } catch { return null; }
};

interface EnrichedUser {
  raw: any; token: string; role_id: number[];
  permissions: string[]; isSuperAdmin: boolean;
  isApprover: boolean; isCorporateApprover: boolean; isITBin: boolean;
}

const getEnrichedUser = (): EnrichedUser | null => {
  try {
    let userObj: any = null;
    for (const k of ["user", "userData", "authUser", "currentUser"]) {
      try { const r = localStorage.getItem(k); if (r) { userObj = JSON.parse(r); break; } } catch {}
    }
    if (!userObj) return null;
    const ts = userObj.token ?? "";
    const tp = ts ? decodeJWT(ts) : null;
    const permissions: string[] = (tp?.permissions?.length ? tp.permissions : userObj.permissions) ?? [];
    const role_id: number[] = Array.isArray(userObj.role_id) ? userObj.role_id.map(Number) : userObj.role_id != null ? [Number(userObj.role_id)] : [];
    const isSuperAdmin = role_id.includes(1) || permissions.includes("manage:all");
    return { raw: userObj, token: ts, role_id, permissions, isSuperAdmin,
      isApprover: userObj.isApprover ?? tp?.isApprover ?? false,
      isCorporateApprover: userObj.isCorporateApprover ?? tp?.isCorporateApprover ?? false,
      isITBin: userObj.isITBin ?? tp?.isITBin ?? false };
  } catch { return null; }
};

/* ============================================================
   MENU
   ============================================================ */

const flattenMenu = (items: MenuItem[]): MenuItem[] =>
  items.flatMap(i => i.children ? [i, ...flattenMenu(i.children)] : [i]);
const flatMenu = flattenMenu(MENU_CONFIG);
const getMenuItem   = (l: string) => flatMenu.find(i => i.label === l);
const getRoute      = (l: string) => getMenuItem(l)?.route;

const KPI_MAP: Record<string, string> = {
  Applications: "Application Master", Plants: "Plant Master", Users: "User Master",
  "User Requests": "User Request Management", Departments: "Department Master",
  Roles: "Role Master", Vendors: "Vendor Information",
  "Network Inventory": "Network Master", "Server Inventory": "Server Inventory",
  "System Inventory": "System Inventory",
};

const canShow = (mi: MenuItem | undefined, u: EnrichedUser | null): boolean => {
  if (!mi) return true;
  if (!u || u.isSuperAdmin) return true;
  const hC = mi.condition !== undefined, hP = mi.permission !== undefined;
  if (!hC && !hP) return true;
  const cM = hC ? mi.condition!(u.raw) : false;
  const pM = hP ? u.permissions.includes(mi.permission!) : false;
  return (hC && hP) ? cM || pM : hC ? cM : pM;
};

/* ============================================================
   CARD VISUAL CONFIG
   ============================================================ */

const CARDS_CFG = [
  { label: "Applications",      g: "linear-gradient(135deg,#6366f1,#8b5cf6)", a: "#6366f1", icon: "⬡", bg: "rgba(99,102,241,0.10)"  },
  { label: "Plants",            g: "linear-gradient(135deg,#f43f5e,#fb7185)", a: "#f43f5e", icon: "⬢", bg: "rgba(244,63,94,0.09)"   },
  { label: "Users",             g: "linear-gradient(135deg,#06b6d4,#22d3ee)", a: "#06b6d4", icon: "◈", bg: "rgba(6,182,212,0.09)"   },
  { label: "User Requests",     g: "linear-gradient(135deg,#22c55e,#4ade80)", a: "#16a34a", icon: "◎", bg: "rgba(34,197,94,0.09)"   },
  { label: "Departments",       g: "linear-gradient(135deg,#f59e0b,#fbbf24)", a: "#d97706", icon: "⬡", bg: "rgba(245,158,11,0.09)"  },
  { label: "Roles",             g: "linear-gradient(135deg,#a855f7,#d946ef)", a: "#a855f7", icon: "◇", bg: "rgba(168,85,247,0.09)"  },
  { label: "Vendors",           g: "linear-gradient(135deg,#ec4899,#f9a8d4)", a: "#ec4899", icon: "◆", bg: "rgba(236,72,153,0.09)"  },
  { label: "Network Inventory", g: "linear-gradient(135deg,#3b82f6,#60a5fa)", a: "#3b82f6", icon: "⬟", bg: "rgba(59,130,246,0.09)"  },
  { label: "Server Inventory",  g: "linear-gradient(135deg,#f97316,#fb923c)", a: "#f97316", icon: "⬠", bg: "rgba(249,115,22,0.09)"  },
  { label: "System Inventory",  g: "linear-gradient(135deg,#10b981,#34d399)", a: "#10b981", icon: "◉", bg: "rgba(16,185,129,0.09)"  },
];
const getCfg = (l: string) => CARDS_CFG.find(c => c.label === l) ?? CARDS_CFG[0];

/* ============================================================
   CUSTOM TOOLTIP
   ============================================================ */

const CTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tip}>
      {label && <p className={styles.tipLabel}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className={styles.tipRow} style={{ color: p.color || p.fill }}>
          <span>{p.name}</span><strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const PieTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className={styles.tip}>
      <p className={styles.tipRow} style={{ color: d.payload.color }}>
        <span>{d.name}</span><strong>{d.value}</strong>
      </p>
    </div>
  );
};

/* ============================================================
   LEGEND COMPONENT — properly spaced, no overflow
   ============================================================ */

interface LegItem { color: string; label: string; value?: number | string }

const Legend = ({ items }: { items: LegItem[] }) => (
  <div className={styles.legRow}>
    {items.map(d => (
      <span key={d.label} className={styles.legItem}>
        <span className={styles.legDot} style={{ background: d.color }} />
        {d.label}
        {d.value !== undefined && <strong>{d.value}</strong>}
      </span>
    ))}
  </div>
);

/* ============================================================
   CHART CARD WRAPPER
   ============================================================ */

const CC = ({ dot, title, badge, children, legend }: {
  dot: string; title: string; badge?: string;
  children: React.ReactNode; legend?: LegItem[];
}) => (
  <div className={styles.chartCard}>
    <div className={styles.chartHead}>
      <span className={styles.chartDot} style={{ background: dot }} />
      <span className={styles.chartName}>{title}</span>
      {badge && <span className={styles.chartBadge}>{badge}</span>}
    </div>
    {children}
    {legend && <Legend items={legend} />}
  </div>
);

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

const DashboardView: React.FC = () => {
  const navigate     = useNavigate();
  const user         = useMemo(() => getEnrichedUser(), []);
  const isSuperAdmin = user?.isSuperAdmin ?? false;

  const [counts,     setCounts]    = useState<DashboardCounts | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hovered,    setHovered]   = useState<string | null>(null);
  const [animIn,     setAnimIn]    = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/dashboard/counts`, {
      headers: { "Content-Type": "application/json",
        ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}) },
    })
      .then(async r => { if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); })
      .then(d => { setCounts(d); setTimeout(() => setAnimIn(true), 60); })
      .catch(e => { console.error(e); setFetchError(e.message); });
  }, [user]);

  const cards = useMemo(() => counts ? [
    { label: "Applications",      data: counts.applications     },
    { label: "Plants",            data: counts.plants           },
    { label: "Users",             data: counts.users            },
    { label: "User Requests",     data: counts.userRequests     },
    { label: "Departments",       data: counts.departments      },
    { label: "Roles",             data: counts.roles            },
    { label: "Vendors",           data: counts.vendors          },
    { label: "Network Inventory", data: counts.networkInventory },
    { label: "Server Inventory",  data: counts.serverInventory  },
    { label: "System Inventory",  data: counts.systemInventory  },
  ] : [], [counts]);

  /* skeleton */
  if (!counts && !fetchError) return (
    <div className={styles.pageWrapper}>
      <AppHeader title="System Dashboard" />
      <div className={styles.skeletonGrid}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard} style={{ animationDelay: `${i * 0.05}s` }} />
        ))}
      </div>
    </div>
  );

  /* error */
  if (fetchError) return (
    <div className={styles.pageWrapper}>
      <AppHeader title="System Dashboard" />
      <div className={styles.errWrap}>
        <div className={styles.errBox}>
          <span className={styles.errIcon}>⚠</span>
          <h3 className={styles.errTitle}>Failed to load dashboard</h3>
          <p className={styles.errMsg}>{fetchError}</p>
          <button className={styles.errBtn} onClick={() => { setFetchError(null); setCounts(null); }}>Retry</button>
        </div>
      </div>
    </div>
  );

  if (!counts) return null;

  /* ── Derived hero numbers ── */
  const totalActive =
    +counts.applications.active + +counts.plants.active +
    +counts.users.active        + +counts.departments.active;

  const visibleCount = cards.filter(c => canShow(getMenuItem(KPI_MAP[c.label]), user)).length;

  /* ── Donut: User Requests ── */
  const reqDonut: LegItem[] = [
    { color: "#22c55e", label: "Approved",  value: +counts.userRequests.approved  },
    { color: "#f59e0b", label: "Pending",   value: +counts.userRequests.pending   },
    { color: "#ef4444", label: "Rejected",  value: +counts.userRequests.rejected  },
    { color: "#6366f1", label: "Completed", value: +counts.userRequests.completed },
  ].filter(d => (d.value as number) > 0);

  /* ── Donut: Task status ── */
  const TASK_C: Record<string,string> = {
    Closed:"#22c55e", Pending:"#f59e0b", Rejected:"#ef4444",
    Approved:"#6366f1", Assigned:"#06b6d4", Deactivated:"#94a3b8",
  };
  const taskDonut: LegItem[] = (counts.taskStatus ?? []).map(r => ({
    color: TASK_C[r.status] ?? "#94a3b8", label: r.status, value: +r.count,
  }));

  /* ── Donut: Grant vs Revoke ── */
  const ACTION_C: Record<string,string> = { Grant:"#6366f1", Revoke:"#f43f5e" };
  const actionDonut: LegItem[] = (counts.taskActions ?? []).map(r => ({
    color: ACTION_C[r.action] ?? "#94a3b8", label: r.action, value: +r.count,
  }));

  /* ── Area: Request trend ── */
  const reqTrend = (counts.requestTrend ?? []).map(r => ({
    month: r.month,
    Approved: +r.approved, Pending: +r.pending,
    Rejected: +r.rejected, Completed: +r.completed,
  }));

  /* ── Area: Task closure trend ── */
  const taskTrend = (counts.taskClosureTrend ?? []).map(r => ({
    month: r.month,
    Closed: +r.closed, Pending: +r.pending, Approved: +r.approved,
  }));

  /* ── Bar: Request types ── */
  const SHORT: Record<string,string> = {
    "New User Creation": "New User",
    "Bulk New User Creation": "Bulk New",
    "Modify Access": "Modify",
    "Password Reset": "Pwd Reset",
    "Bulk De-activation": "Bulk Deact",
  };
  const reqTypesBar = (counts.requestTypes ?? []).map(r => ({
    name: SHORT[r.type] ?? r.type,
    Total: +r.count, Approved: +r.approved, Rejected: +r.rejected,
  }));

  /* ── Bar: Pending by module (horizontal) ── */
  const pendingBar = (counts.pendingByModule ?? [])
    .filter((r: any) => +r.pending > 0)
    .map((r: any) => ({
      name: String(r.module).charAt(0).toUpperCase() + String(r.module).slice(1, 9),
      Pending: +r.pending, Approved: +r.approved, Rejected: +r.rejected,
    }));

  /* ── Bar: Requester type ── */
  const REQ_C: Record<string,string> = { Self:"#6366f1", "Vendor / OEM":"#ec4899", Others:"#06b6d4" };
  const requesterBar = (counts.requestForBy ?? []).map((r: any) => ({
    name: r.requester_type === "Vendor / OEM" ? "Vendor" : r.requester_type,
    color: REQ_C[r.requester_type] ?? "#94a3b8",
    Total: +r.count, Approved: +r.approved, Rejected: +r.rejected,
  }));

  /* ── Bar: Location ── */
  const locationBar = (counts.locationActivity ?? []).map((r: any) => ({
    name: String(r.location).split(" ")[0],
    Total: +r.total, Completed: +r.completed,
  }));

  /* ── Gradient defs helper ── */
  const GradDefs = () => (
    <defs>
      {[["ap","#22c55e"],["pe","#f59e0b"],["re","#ef4444"],["co","#6366f1"],
        ["cl","#22c55e"],["tco","#6366f1"],["tpe","#f59e0b"]].map(([id,c]) => (
        <linearGradient key={id} id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor={c} stopOpacity={0.22} />
          <stop offset="95%" stopColor={c} stopOpacity={0}    />
        </linearGradient>
      ))}
    </defs>
  );

  /* ── shared axis tick props ── */
  const tick = { fontSize: 10, fill: "#94a3b8" };

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="System Dashboard" />
      <div className={styles.content}>

        {/* ══ HERO ══ */}
        {/* <div className={styles.hero}>
          <div className={styles.heroL}>
            <p className={styles.heroEye}>System Overview</p>
            <h1 className={styles.heroTitle}>Control Center</h1>
            <p className={styles.heroSub}>
              {new Date().toLocaleDateString("en-IN", {
                weekday:"long", day:"numeric", month:"long", year:"numeric",
              })}
              &nbsp;·&nbsp;Live Statistics
            </p>
          </div>
          <div className={styles.heroStats}>
            {[
              { n: counts.users.total,             l: "Total Users"       },
              { n: String(totalActive),             l: "Active Records"    },
              { n: counts.userRequests.pending,     l: "Pending"           },
              { n: counts.userRequests.completed,   l: "Completed"         },
            ].map((s, i, arr) => (
              <React.Fragment key={i}>
                {i > 0 && <div className={styles.heroDiv} />}
                <div className={styles.heroStat}>
                  <span className={styles.heroNum}>{s.n}</span>
                  <span className={styles.heroLbl}>{s.l}</span>
                </div>
              </React.Fragment>
            ))}
            {isSuperAdmin && (
              <>
                <div className={styles.heroDiv} />
                <div className={styles.heroStat}>
                  <span className={styles.superBadge}>SUPER ADMIN</span>
                  <span className={styles.heroLbl}>Full Access</span>
                </div>
              </>
            )}
          </div>
        </div> */}

        {/* ══ KPI ══ */}
        <div className={styles.secRow}>
          <span className={styles.secTitle}>KPI Overview</span>
          <span className={styles.secSub}>
            {isSuperAdmin ? `All ${cards.length} modules — Super Admin` : `${visibleCount} of ${cards.length} visible`}
          </span>
        </div>

        <div className={styles.kpiGrid}>
          {cards.map((card, idx) => {
            const mi    = getMenuItem(KPI_MAP[card.label]);
            if (!canShow(mi, user)) return null;
            const cfg   = getCfg(card.label);
            const route = getRoute(KPI_MAP[card.label]);
            const isReq = "pending" in card.data;
            const total = isReq ? +(card.data as any).pending : +(card.data as any).total;
            const act   = +(card.data as any).active   || 0;
            const inact = +(card.data as any).inactive || 0;
            const pct   = !isReq && +(card.data as any).total > 0
              ? Math.round((act / +(card.data as any).total) * 100) : 0;

            return (
              <div key={card.label}
                className={`${styles.kpiCard} ${animIn ? styles.kpiIn : ""}`}
                style={{ animationDelay: `${idx * 0.055}s`, "--a": cfg.a, "--g": cfg.g } as any}
                onMouseEnter={() => setHovered(card.label)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => route && navigate(route)}
              >
                <div className={styles.kpiBar} style={{ background: cfg.g }} />
                <div className={styles.kpiBody}>
                  <div className={styles.kpiTop}>
                    <div className={styles.kpiIcon} style={{ background: cfg.bg }}>
                      <span style={{ color: cfg.a, fontSize: 14 }}>{cfg.icon}</span>
                    </div>
                    <span className={styles.kpiArrow}
                      style={{ opacity: hovered === card.label ? 1 : 0, color: cfg.a }}>→</span>
                  </div>
                  <div className={styles.kpiName}>{card.label}</div>
                  <div className={styles.kpiNum} style={{ color: cfg.a }}>{total}</div>
                  {!isReq && (
                    <div className={styles.kpiProg}>
                      <div className={styles.kpiProgFill} style={{ width: `${pct}%`, background: cfg.g }} />
                    </div>
                  )}
                  <div className={styles.kpiChips}>
                    {isReq ? (
                      <>
                        <span className={styles.chip} style={{ background:"rgba(34,197,94,0.12)", color:"#15803d" }}>
                          ✓ {(card.data as any).approved} Approved
                        </span>
                        <span className={styles.chip} style={{ background:"rgba(239,68,68,0.12)", color:"#dc2626" }}>
                          ✕ {(card.data as any).rejected} Rejected
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={styles.chip} style={{ background:"rgba(34,197,94,0.11)", color:"#15803d" }}>
                          ● {act} Active
                        </span>
                        <span className={styles.chip} style={{ background:"rgba(100,116,139,0.08)", color:"#64748b" }}>
                          ○ {inact} Inactive
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ══ ANALYTICS ══ */}
        <div className={styles.secRow} style={{ marginTop: 4 }}>
          <span className={styles.secTitle}>Analytics</span>
          <span className={styles.secSub}>Hover charts · All data from live DB</span>
        </div>

        {/* ROW 1 — 3 donuts */}
        <div className={styles.row3}>

          {/* User Requests donut */}
          <CC dot="#f59e0b" title="User Requests"
            legend={reqDonut}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={reqDonut.map(d => ({ name: d.label, value: d.value, color: d.color }))}
                  dataKey="value" nameKey="name"
                  innerRadius={48} outerRadius={68} paddingAngle={3} strokeWidth={0}>
                  {reqDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<PieTip />} />
              </PieChart>
            </ResponsiveContainer>
          </CC>

          {/* Task Closure donut */}
          <CC dot="#22c55e" title="Task Closure Status"
            legend={taskDonut}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={taskDonut.map(d => ({ name: d.label, value: d.value, color: d.color }))}
                  dataKey="value" nameKey="name"
                  innerRadius={48} outerRadius={68} paddingAngle={3} strokeWidth={0}>
                  {taskDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<PieTip />} />
              </PieChart>
            </ResponsiveContainer>
          </CC>

          {/* Grant vs Revoke donut */}
          <CC dot="#6366f1" title="Access Actions" badge="Grant vs Revoke"
            legend={actionDonut}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={actionDonut.map(d => ({ name: d.label, value: d.value, color: d.color }))}
                  dataKey="value" nameKey="name"
                  innerRadius={48} outerRadius={68} paddingAngle={3} strokeWidth={0}>
                  {actionDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<PieTip />} />
              </PieChart>
            </ResponsiveContainer>
          </CC>
        </div>

        {/* ROW 2 — 2 area charts */}
        <div className={styles.row2}>

          <CC dot="#6366f1" title="Request Volume Trend" badge="Last 6 months"
            legend={[
              { color:"#22c55e", label:"Approved" }, { color:"#f59e0b", label:"Pending" },
              { color:"#ef4444", label:"Rejected" }, { color:"#6366f1", label:"Completed" },
            ]}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={reqTrend} margin={{ top:6, right:8, left:-20, bottom:0 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} />
                <Tooltip content={<CTip />} />
                <Area type="monotone" dataKey="Approved"  stroke="#22c55e" strokeWidth={2} fill="url(#gap)" />
                <Area type="monotone" dataKey="Pending"   stroke="#f59e0b" strokeWidth={2} fill="url(#gpe)" />
                <Area type="monotone" dataKey="Rejected"  stroke="#ef4444" strokeWidth={2} fill="url(#gre)" />
                <Area type="monotone" dataKey="Completed" stroke="#6366f1" strokeWidth={2} fill="url(#gco)" />
              </AreaChart>
            </ResponsiveContainer>
          </CC>

          <CC dot="#22c55e" title="Task Closure Trend" badge="Last 6 months"
            legend={[
              { color:"#22c55e", label:"Closed" },
              { color:"#6366f1", label:"Approved" },
              { color:"#f59e0b", label:"Pending" },
            ]}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={taskTrend} margin={{ top:6, right:8, left:-20, bottom:0 }}>
                <GradDefs />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} />
                <Tooltip content={<CTip />} />
                <Area type="monotone" dataKey="Closed"   stroke="#22c55e" strokeWidth={2} fill="url(#gcl)" />
                <Area type="monotone" dataKey="Approved" stroke="#6366f1" strokeWidth={2} fill="url(#gtco)" />
                <Area type="monotone" dataKey="Pending"  stroke="#f59e0b" strokeWidth={2} fill="url(#gtpe)" />
              </AreaChart>
            </ResponsiveContainer>
          </CC>
        </div>

        {/* ROW 3 — 3 bar charts */}
        <div className={styles.row3}>

          <CC dot="#06b6d4" title="Request Types" badge="By access type"
            legend={[
              { color:"#6366f1", label:"Total" },
              { color:"#22c55e", label:"Approved" },
              { color:"#ef4444", label:"Rejected" },
            ]}>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={reqTypesBar} margin={{ top:4, right:4, left:-22, bottom:20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ ...tick, fontSize: 9 }} axisLine={false} tickLine={false}
                  angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={tick} axisLine={false} tickLine={false} />
                <Tooltip content={<CTip />} />
                <Bar dataKey="Total"    fill="#6366f1" radius={[3,3,0,0]} maxBarSize={16} />
                <Bar dataKey="Approved" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={16} />
                <Bar dataKey="Rejected" fill="#ef4444" radius={[3,3,0,0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CC>

          <CC dot="#f59e0b" title="Pending Approvals" badge="Module-wise"
            legend={[
              { color:"#f59e0b", label:"Pending" },
              { color:"#22c55e", label:"Approved" },
              { color:"#ef4444", label:"Rejected" },
            ]}>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={pendingBar} layout="vertical"
                margin={{ top:4, right:8, left:4, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
                <XAxis type="number" tick={tick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ ...tick, fontSize:9 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<CTip />} />
                <Bar dataKey="Pending"  fill="#f59e0b" radius={[0,3,3,0]} maxBarSize={10} />
                <Bar dataKey="Approved" fill="#22c55e" radius={[0,3,3,0]} maxBarSize={10} />
                <Bar dataKey="Rejected" fill="#ef4444" radius={[0,3,3,0]} maxBarSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </CC>

          <CC dot="#ec4899" title="Requester Types" badge="Self · Others · Vendor"
            legend={requesterBar.map(r => ({
              color: r.color, label: r.name, value: r.Total,
            }))}>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={requesterBar} margin={{ top:4, right:4, left:-22, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} />
                <Tooltip content={<CTip />} />
                <Bar dataKey="Total"    fill="#6366f1" radius={[3,3,0,0]} maxBarSize={32} />
                <Bar dataKey="Approved" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={32} />
                <Bar dataKey="Rejected" fill="#ef4444" radius={[3,3,0,0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CC>
        </div>

        {/* ROW 4 — full width location */}
        {locationBar.length > 0 && (
          <div className={styles.row1}>
            <CC dot="#3b82f6" title="Plant / Location Activity" badge="Requests by location"
              legend={[
                { color:"#3b82f6", label:"Total Requests" },
                { color:"#22c55e", label:"Completed" },
              ]}>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={locationBar} margin={{ top:4, right:8, left:-18, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
                  <YAxis tick={tick} axisLine={false} tickLine={false} />
                  <Tooltip content={<CTip />} />
                  <Bar dataKey="Total"     fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={40} />
                  <Bar dataKey="Completed" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CC>
          </div>
        )}

      </div>
    </div>
  );
};

export default DashboardView;