import React from "react";
import {
  Dashboard as DashboardIcon,
  Factory as FactoryIcon,
  Security as SecurityIcon,
  ListAlt as ListAltIcon,
  Apps as AppsIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Home as HomeIcon,
  Storage as StorageIcon,
  Inventory as InventoryIcon,
  AccountTree as AccountTreeIcon,
  PlaylistAddCheck as PlaylistAddCheckIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

export interface SidebarConfigItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  perm?: string;
  children?: SidebarConfigItem[];
}

export const sidebarConfig: SidebarConfigItem[] = [
  {
    key: "home",
    label: "Home",
    icon: <HomeIcon fontSize="small" />,
    perm: "dashboard:view",
  },
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <DashboardIcon fontSize="small" />,
    perm: "dashboard:view",
  },
   {
    key: "activity-logs",
    label: "Activity Logs",
    icon: <ListAltIcon fontSize="small" />,
    perm: "activityMaster:view",
  },
  {
    key: "master-approval",
    label: "Admin Approval",
    icon: <ListAltIcon fontSize="small" />,
    perm: "dashboard:view",
  },
  {
    key: "workflow",
    label: "Approval Workflow",
    icon: <AccountTreeIcon fontSize="small" />,
    perm: "workflow:view",
  },
 
  {
    key: "masters",
    label: "Masters",
    icon: <SettingsIcon fontSize="small" />,
    children: [
      {
        key: "application",
        label: "Application Master",
        icon: <AppsIcon fontSize="small" />,
        perm: "applicationMaster:view",
  },
  {
        key: "department",
        label: "Department Master",
        icon: <FactoryIcon fontSize="small" />,
        perm: "department:view",
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
        key: "system",
        label: "System Inventory",
        icon: <InventoryIcon fontSize="small" />,
        perm: "system:view",
      },
      {
        key: "server",
        label: "Server Inventory",
        icon: <StorageIcon fontSize="small" />,
        perm: "server:view",
      },
      {
        key: "user",
        label: "User Master",
        icon: <PersonIcon fontSize="small" />,
        perm: "userMaster:view",
      },
      {
        key: "vendor",
        label: "Vendor Information",
        icon: <ListAltIcon fontSize="small" />,
        perm: "vendorMaster:view",
      },
    ],
  },
   {
    key: "plant-itsupport",
    label: "Plant IT Support Bin",
    icon: <AccountTreeIcon fontSize="small" />,
    perm: "workflow:view",
  },
  {
    key: "request",
    label: "User Requests",
    icon: <AssignmentIcon fontSize="small" />,
    perm: "userRequest:view",
  },
  {
    key: "task",
    label: "Task Closure",
    icon: <PlaylistAddCheckIcon fontSize="small" />,
    perm: "Task:view",
  }, 
];