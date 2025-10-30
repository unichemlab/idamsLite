import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ApproverDashboard.module.css";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import AssignmentIcon from "@mui/icons-material/Assignment";
import login_headTitle2 from "../assets/login_headTitle2.png";
import AccessRequestsTable from "./AccessRequestsTable";
import ApprovalHistoryTable from "./ApprovalHistoryTable";
import { useApprover } from "../context/ApproverContext";
import { useAuth } from "../context/AuthContext";

// --- Demo/mock data for all admin sections ---
const initialRequests = [
  {
    id: "TCO01",
    user: "John Smith",
    employeeCode: "EMP001",
    plant: "Manufacturing Site A",
    department: "Quality Control",
    application: "Laboratory Information System v2.1.3",
    equipmentId: "LAB-INS-001",
    role: "Lab Analyst",
    accessStatus: "Granted",
    requestStatus: "Pending",
  },
  {
    id: "TCO02",
    user: "Sarah Johnson",
    employeeCode: "EMP002",
    plant: "Research Facility B",
    department: "R&D",
    application: "Clinical Data Management v1.8.2",
    equipmentId: "CDM-SYS-002",
    role: "Data Reviewer",
    accessStatus: "Granted",
    requestStatus: "Pending",
  },
];

const ApproverDashboard: React.FC = () => {
  const {
    requests,
    setRequests,
    approvalActions,
    setApprovalActions,
    activeTab,
    setActiveTab,
  } = useApprover();
  useEffect(() => {
    if (requests.length === 0) setRequests(initialRequests);
    if (approvalActions.length === 0)
      setApprovalActions([
        {
          approverName: "Amit Kumar",
          approverRole: "Plant Admin (Step 1)",
          plant: "GOA",
          corporate: "Unichem Corp",
          action: "Approved",
          timestamp: "2025-08-16 10:22",
          comments: "All compliance met.",
        },
        {
          approverName: "Priya Sharma",
          approverRole: "QA Head (Step 2)",
          plant: "GOA",
          corporate: "Unichem Corp",
          action: "Approved",
          timestamp: "2025-08-16 11:05",
          comments: "Reviewed and approved.",
        },
        {
          approverName: "Rahul Singh",
          approverRole: "IT Manager (Step 3)",
          plant: "GOA",
          corporate: "Unichem Corp",
          action: "Rejected",
          timestamp: "2025-08-16 11:15",
          comments: "Missing IT clearance.",
        },
      ]);
    // eslint-disable-next-line
  }, []);

  const navigate = useNavigate();
  const user = { username: "approver", role: "Approver" };
  const { logout } = useAuth();

  const handleLogout = () => {
    // Use AuthContext logout to fully clear auth state (authUser, token, permissions)
    try {
      logout();
    } catch (e) {
      // fallback: clear minimal localStorage keys
      localStorage.removeItem("authUser");
      localStorage.removeItem("token");
    }
    // navigate to login/root
    navigate("/");
  };

  const sidebarConfig = [
    {
      key: "access-requests",
      label: "Access Requests",
      icon: <ListAltIcon fontSize="small" />,
    },
    {
      key: "approved-rejected",
      label: "Approved/Rejected By",
      icon: <AssignmentIcon fontSize="small" />,
    },
  ];

  const handleViewRequest = (request: any) => {
    navigate(`/access-request/${request.id}`, {
      state: { request },
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "access-requests":
        return (
          <section className={styles.sectionWrap}>
            <div className={styles.card}>
              <AccessRequestsTable
                requests={requests}
                onView={handleViewRequest}
              />
            </div>
          </section>
        );
      case "approved-rejected":
        return (
          <section className={styles.sectionWrap}>
            <div className={styles.card}>
              <ApprovalHistoryTable actions={approvalActions} />
            </div>
          </section>
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
          {sidebarConfig.map((item) => (
            <button
              key={item.key}
              className={`${styles["nav-button"]} ${
                activeTab === item.key ? styles.active : ""
              }`}
              onClick={() => setActiveTab(item.key)}
            >
              {item.icon} {item.label}
            </button>
          ))}
          <div className={styles["sidebar-footer"]}>
            <div className={styles["admin-info"]}>
              <div className={styles.avatar}>A</div>
              <div>
                <strong>{user ? user.username : "approver"}</strong>
                <div className={styles.subtext}>
                  {user ? user.role : "Approver"}
                </div>
              </div>
            </div>
            <button className={styles["logout-button"]} onClick={handleLogout}>
              <LogoutIcon fontSize="small" /> Logout
            </button>
          </div>
        </nav>
      </aside>
      <main className={styles["main-content"]}>
        <header className={styles["main-header"]}>
          <h2 className={styles["header-title"]}>Approver Dashboard</h2>
          <div className={styles["header-icons"]}>
            <span className={styles["header-icon"]}>
              <NotificationsIcon fontSize="small" />
            </span>
            <span className={styles["header-icon"]}>
              <SettingsIcon fontSize="small" />
            </span>
          </div>
        </header>
        <div className={styles.pageContent}>{renderContent()}</div>
      </main>
    </div>
  );
};

export default ApproverDashboard;
