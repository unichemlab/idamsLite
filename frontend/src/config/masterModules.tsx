import {
  FiHome,
  FiGrid,
  FiActivity,
  FiCheckSquare,
  FiClock,
  FiDatabase,
  FiUsers,
  FiFileText,
} from "react-icons/fi";

export interface MenuItem {
  label: string;
  route?: string;
  icon?: any;
  condition?: (user: any) => boolean;
  permission?: string;
  children?: MenuItem[];
}

export const MENU_CONFIG: MenuItem[] = [
  {
    label: "Homepage",
    route: "/homepage",
    icon: FiHome,
  },
  {
    label: "Dashboard",
    route: "/dashboard",
    icon: FiGrid,
    permission: "read:dashboard",
  },
  {
    label: "Activity Logs",
    route: "/activity-log",
    icon: FiActivity,
    permission: "read:activity_logs",
  },
  {
    label: "Admin Approval",
    route: "/admin-approval",
    icon: FiCheckSquare,
    // permission: "read:admin_approval",
     condition: (user) => user?.isCorporateApprover,
  },
  {
    label: "Access Log",
    route: "/access-logs",
    icon: FiFileText,
    permission: "read:access_log",
  },

  // 🔹 Approval Group
  {
    label: "Approval",
    icon: FiClock,
    children: [
      {
        label: "Pending Approval",
        route: "/approver/pending",
        condition: (user) => user?.isApprover,
      },
      {
        label: "Approval History",
        route: "/approver/history",
        condition: (user) => user?.isApprover,
      },
    ],
  },

  {
    label: "Approval Workflow",
    route: "/approval-workflows",
    icon: FiClock,
    permission: "read:approval_workflow",
  },

  // 🔹 MASTER GROUP
  {
    label: "Master",
    icon: FiDatabase,
    children: [
      {
        label: "Application Master",
        route: "/application-masters",
        permission: "read:application_master",
      },
      {
        label: "Department Master",
        route: "/department-master",
        permission: "read:department_master",
      },
      // {
      //   label: "Network Master",
      //   route: "/network-master",
      //   permission: "read:network_master",
      // },
      {
        label: "Plant Master",
        route: "/plant-master",
        permission: "read:plant_master",
      },
      {
        label: "Role Master",
        route: "/role-master",
        permission: "read:role_master",
      },
      {
        label: "System Inventory",
        route: "/system-master",
        permission: "read:system_inventory",
      },
      {
        label: "Server Inventory",
        route: "/server-master",
        permission: "read:server_inventory",
      },
      {
        label: "User Master",
        route: "/user-master",
        permission: "read:user_master",
      },
      {
        label: "Vendor Information",
        route: "/vendor-information",
        permission: "read:vendor_information",
      },
    ],
  },

  {
    label: "Task Closure",
    route: "/task",
    icon: FiCheckSquare,
    condition: (user) => user?.isITBin,
  },
  {
    label: "Task Closure Bin",
    route: "/task-closure-bin",
    icon: FiClock,
    permission: "read:task_clouser_bin",
  },
  {
    label: "User Request Management",
    route: "/user-access-management",
    icon: FiUsers,
  },
];
