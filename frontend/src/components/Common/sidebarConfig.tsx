import React from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FactoryIcon from "@mui/icons-material/Factory";
import SecurityIcon from "@mui/icons-material/Security";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AppsIcon from "@mui/icons-material/Apps";
import PersonIcon from "@mui/icons-material/Person";
import AssignmentIcon from "@mui/icons-material/Assignment";

export interface SidebarConfigItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  perm?: string;
}

export // ----- Sidebar config -----
  const sidebarConfig: SidebarConfigItem[] = [
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
    { key: "system", label: "System Inventory", icon: <AssignmentIcon fontSize="small" />, perm: "system:view" },
    { key: "it-support", label: "IT Support", icon: <ListAltIcon fontSize="small" />, perm: "TaskPlantITSupport:view" },
    { key: "server",label: "Server Inventory",icon: <AssignmentIcon fontSize="small" />,perm: "server:view",},
  ];

