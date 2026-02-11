// ...imports...
// (All import statements remain at the top)
import React from "react";
import { Routes, Route, useLocation, useParams } from "react-router-dom";
import AddUserRequest from "pages/UserRequest/UserRequestForm";
import TrackRequest from "../pages/TaskRequest/TrackRequest";
import Login from "../pages/Login";
import ProtectedRoute from "../components/Common/ProtectedRoute";
import ApproverDashboard from "../pages/ApproverDashboard";
import AccessRequestDetails from "../pages/AccessRequestDetails";
import AccessDenied from "../pages/AccessDenied";
import UserRequestTable from "../pages/UserRequestTable/UserRequestTable";
/****************************Plant IT Support ******************************** */
import PlantITSupportMaster from "../pages/PlantITSupport/PlantITSupportMaster";
import EditPlantITSupportMaster from "../pages/PlantITSupport/EditAddPlantITSupportMaster";
import AddPlantITSupportMaster from "../pages/PlantITSupport/AddPlantITSupportMaster";
/********************Task Closure Bin***************************************************** */
import TaskClosureBINMaster from "../pages/TaskClosureBin/PlantITSupportMaster";
import EditTaskClosureBINMaster from "../pages/TaskClosureBin/EditAddPlantITSupportMaster";
import AddTaskClosureBINMaster from "../pages/TaskClosureBin/AddPlantITSupportMaster";
/**************new master************* */
import DashboardMain from "../pages/Dashboard/dashboard";
import AccessLog from "../pages/AccessLog/AccessLogTable";
/*************************Plant master************************ */
import PlantMasterUserTable from "../pages/Plant/PlantMasterTable";
import AddPlantMasterUser from "../pages/Plant/AddPlantMaster";
import EditPlantMasterUser from "../pages/Plant/EditPlantMaster";
import ImportPlant from "pages/Plant/ImportPlant";
/**************************User Master****************************** */
import UserMaster from "../pages/UserMaster/UserMasterTable";
import AddUserMasterUser from "../pages/UserMaster/AddUserFormPage";
import EditUserMasterUser from "../pages/UserMaster/EditUserFormPage";
/***********************Role master********************* */
import RoleMaster from "../pages/RoleMasterUser/RoleMasterTable";
import AddRoleMasterUser from "../pages/RoleMasterUser/AddRoleFormPage";
import EditRoleMasterUser from "../pages/RoleMasterUser/EditRoleFormPage";
import ImportRole from "pages/RoleMasterUser/ImportRole";
/******************************Sever Inventory master********************************** */
import ServerInventoryMasterUser from "../pages/ServerInventorymasterUser/ServerInventoryMasterTable";
import AddServerInventoryUser from "../pages/ServerInventorymasterUser/AddServerInventoryMaster";
import EditServerInventoryUser from "../pages/ServerInventorymasterUser/EditServerInventoryMaster";
import ImportServerInventory from 'pages/ServerInventorymasterUser/ImportServerInventory';
/********************System inventory master*************************** */
import SystemInventoryMasterTableUser from "../pages/SystemInventoryMasterUser/SystemInventoryMasterTable";
import AddSystemInventoryUser from "../pages/SystemInventoryMasterUser/AddSystemInventory";
import EditSystemInventoryUser from "../pages/SystemInventoryMasterUser/EditSystemInventory";
import ImportSystemInventory from 'pages/SystemInventoryMasterUser/ImportSystemInventory';
/**********************************Vendor Information master******************************************** */
import VendorInformation from "../pages/VendorMasterInformation/VendorMasterTable";
import AddVendorInformation from "../pages/VendorMasterInformation/AddVendorMaster";
import EditVendorInformation from "../pages/VendorMasterInformation/EditVendorMaster";
import ImportVendor from "pages/VendorMasterInformation/ImportVendor";

/*************************************Department master******************************************* */
import DepartmentTable from "pages/DepartmentTable/DepartmentMasterTable";
import AddDeptTableFormPage from "pages/DepartmentTable/AddDeptFormPage";
import EditDeptTableFormPage from "pages/DepartmentTable/EditDeptFormPage";
import ImportDepartment from "pages/DepartmentTable/ImportDepartment";
/*********************************Application Master********************************************* */
import ApplicationMaster from "../pages/ApplicationMaster/ApplicationMasterTable";
import AddApplicationForm from "../pages/ApplicationMaster/AddApplicationFormPage";
import EditApplicationForm from "../pages/ApplicationMaster/EditApplicationFormPage";
import ImportApplication from "pages/ApplicationMaster/ImportApplication";

/****************************************network master****************************************** */
import NetworkMasterTable from "pages/NetworkMaster/NetworkMasterTable";
import AddNetwork from "pages/NetworkMaster/AddNetwork";
import EditNetwork from "pages/NetworkMaster/EditNetwork";
import ImportNetwork from "pages/NetworkMaster/ImportNetwork";

import ActivityLog from "../pages/ActivityMaster/ActivityMasterTable";
import AdminApprovalBin from "pages/MasterDataApprovalBin/MasterApprovalBin";
import AdminApprovalDetails from "pages/MasterDataApprovalBin/MasterApprovalDetails";
import ApprovalWorkflow from "pages/ApprovalworkflowUser/WorkflowBuilder";
/****************************************** */
import AddTaskClosureForm from "../pages/TaskClosureTracking/AddTaskClosureForm";
import TaskTable from "pages/TaskClosureTracking/TaskClosureTracking";
import TaskDetailView from "pages/TaskClosureTracking/TaskDetailView";
import Home from "pages/HomePage/homepageUser";
import PendingApprovalPage from "pages/ApproverDashboard/PendingApproval";
import ApprovalHistoryPage from "pages/ApproverDashboard/ApprovalHistory";
/************************AD Sync Dashboard************************************* */
 import ADSyncDashboard from "../components/ADSyncDashboard";

/***************************************************************** */
import { Dashboard } from "@mui/icons-material";

// ✅ IMPORT AUTO-REFRESH MIDDLEWARE
import RouteWrapper from "../components/RouteWrapper";

// List of allowed routes for matching
const allowedRoutes = [
  "/", // login
  "/users",
  "/add-user",
  "/edit-user/:idx",
  "/user-requests",
  "/service-requests",
  "/user-access-management",
  "/service-access-management",
  "/access-details",
  "/approver-step/:step/:id",
  "/review-submit",
  "/generate-credentials",
  "/track-request",
  "/approver",
  "/approvers",
  "/superadmin",
  "/plants",
  "/plants/add",
  "/plants/edit/:id",
  "/departments",
  "/departments/add",
  "/departments/edit/:id",
  "/roles",
  "/roles/add",
  "/roles/edit/:id",
  "/application-master",
  "/add-application",
  "/edit-application/:idx",
  "/vendors",
  "/vendors/add",
  "/vendors/edit/:id",
  "/activity-logs",
  "/appliction-workflow",
  "/user-information",
  "/systems",
  "/systems/add",
  "/systems/edit/:id",
   "/servers",
  "/servers/add",
  "/servers/edit/:id",
  "/task",
  "/task/:id",
  "/task-detail/:id",
  "/plant-itsupport",
  "/plant-itsupport/add",
  "/plant-itsupport/edit/:id",
  "/approval-workflow",
  "/approval-workflow/plant-list",
  "/approval-workflow/plant-builder",
  "/approval-workflow/corporate-list",
  "/approval-workflow/corporate-builder",
  "/admin/roles",
  "/master-approvals",
  "/master-approvals/:id",
  "/admin-approval",
  "/admin-approval/:id",
  "/home",
  "/homepage",
  "/approver/pending",
  "/approver/history",
  "/access-request/:id",
  "/access-log",
  "/dashboard",
  "/ad-sync-dashboard",
  "/plant-master",
  "/plant-master/add",
  "/plant-master/edit/:id",
  "/plant-master/import",
   "/application-masters",
  "/add-application-masters",
  "/edit-application-masters/:idx",
  "/application-masters/import",
  "/task-closure-bin",
  "/task-closure-bin/add",
  "/task-closure-bin/edit/:id",
   "/department-master",
   "/department-master/add",
   "/department-master/edit/:id",
   "/department-master/import",
   "/user-master",
   "/user-master/add",
   "/user-master/edit/:id",
   "/role-master",
   "/role-master/add",
   "/role-master/edit/:id",
   "/role-master/import",
   "/server-master",
   "/server-master/add",
   "/server-master/edit/:id",
   "/system-master",
   "/system-master/add",
   "/system-master/edit/:id",
   "/vendor-information",
   "/vendor-information/add",
   "/vendor-information/edit/:id",
   "/vendor-information/import",
   "/access-logs",
   "/activity-log",
   "/admin-approval",
   "/admin-approval/:id",
    "/approval-workflows",
    "/system-master/import",
  "/server-master/import",
  "/network-master",
   "/network-master/add",
   "/network-master/edit/:id",
   "/network-master/import",
];

const NotFound = () => (
  <div
    style={{
      padding: 40,
      textAlign: "center",
      color: "#e74c3c",
      fontSize: 24,
    }}
  >
    404 - Page Not Found
  </div>
);

function AppRoutes() {
  const location = useLocation();
  
  // Hide all routes from browser bar: if not allowed, show 404
  const isAllowed = allowedRoutes.some((route) => {
    // Handle dynamic params
    if (route.includes(":")) {
      const base = route.split(":")[0];
      return location.pathname.startsWith(base);
    }
    
    return location.pathname === route;
  });

  console.log(isAllowed);
  
  if (!isAllowed) {
    return <NotFound />;
  }

  function EditRoleFormPageWrapperUser() {
    const params = useParams();
    return <EditRoleMasterUser roleId={Number(params.id)} />;
  }

  return (
    // ✅ WRAP ALL ROUTES WITH AUTO-REFRESH MIDDLEWARE
    <RouteWrapper>
      <Routes>
        <Route
          path="/user-requests"
          element={
            <ProtectedRoute>
              <UserRequestTable />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/user-access-management" 
          element={
            <ProtectedRoute>
              <AddUserRequest />
            </ProtectedRoute>
          } 
        />
        <Route path="/homepage" element={<Home />} />

        {/* Transaction Master Routes */}
        <Route
          path="/plant-itsupport"
          element={
            <ProtectedRoute>
              <PlantITSupportMaster />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plant-itsupport/add"
          element={
            <ProtectedRoute>
              <AddPlantITSupportMaster />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plant-itsupport/edit/:id"
          element={
            <ProtectedRoute>
              <EditPlantITSupportMaster />
            </ProtectedRoute>
          }
        />

        {/* Approver step views: Approver 1, 2, 3 */}
        <Route
          path="/approver-step/:step/:id"
          element={
            <ProtectedRoute>
              <AccessRequestDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/track-request"
          element={
            <ProtectedRoute>
              <TrackRequest />
            </ProtectedRoute>
          }
        />

        {/* Approver Flow */}
        <Route path="/" element={<Login />} />
        <Route
          path="/approver"
          element={
            <ProtectedRoute>
              <ApproverDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approver/pending"
          element={
            <ProtectedRoute>
              <PendingApprovalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approver/history"
          element={
            <ProtectedRoute>
              <ApprovalHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route
          path="/access-request/:id"
          element={
            <ProtectedRoute>
              <AccessRequestDetails />
            </ProtectedRoute>
          }
        />
        <Route path="/task" element={<TaskTable />} />
        <Route path="/task/:id" element={<AddTaskClosureForm />} />
        <Route path="/task-detail/:id" element={<TaskDetailView />} />

        {/*********New Master Page**************** */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardMain/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ad-sync-dashboard"
          element={
            <ProtectedRoute>
              <ADSyncDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plant-master"
          element={
            <ProtectedRoute>
              <PlantMasterUserTable />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plant-master/add"
          element={
            <ProtectedRoute>
              <AddPlantMasterUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plant-master/edit/:id"
          element={
            <ProtectedRoute>
              <EditPlantMasterUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plant-master/import"
          element={
            <ProtectedRoute>
              <ImportPlant />
            </ProtectedRoute>
          }
        />
        <Route
          path="/application-masters"
          element={
            <ProtectedRoute>
              <ApplicationMaster />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-application-masters"
          element={
            <ProtectedRoute>
              <AddApplicationForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-application-masters/:idx"
          element={
            <ProtectedRoute>
              <EditApplicationForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/application-masters/import"
          element={
            <ProtectedRoute>
              <ImportApplication />
            </ProtectedRoute>
          }
        />

        {/* Transaction Master Routes */}
        <Route
          path="/task-closure-bin"
          element={
            <ProtectedRoute>
              <TaskClosureBINMaster />
            </ProtectedRoute>
          }
        />
        <Route
          path="/task-closure-bin/add"
          element={
            <ProtectedRoute>
              <AddTaskClosureBINMaster />
            </ProtectedRoute>
          }
        />
        <Route
          path="/task-closure-bin/edit/:id"
          element={
            <ProtectedRoute>
              <EditTaskClosureBINMaster />
            </ProtectedRoute>
          }
        />

        {/* Department Master */}
        <Route
          path="/department-master"
          element={
            <ProtectedRoute>
              <DepartmentTable />
            </ProtectedRoute>
          }
        />
        <Route
          path="/department-master/add"
          element={
            <ProtectedRoute>
              <AddDeptTableFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/department-master/edit/:id"
          element={
            <ProtectedRoute>
              <EditDeptTableFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/department-master/import"
          element={
            <ProtectedRoute>
              <ImportDepartment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-master"
          element={
            <ProtectedRoute>
              <UserMaster />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-master/add"
          element={
            <ProtectedRoute>
              <AddUserMasterUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-master/edit/:id"
          element={
            <ProtectedRoute>
              <EditUserMasterUser />
            </ProtectedRoute>
          }
        />

        <Route
          path="/role-master"
          element={
            <ProtectedRoute>
              <RoleMaster />
            </ProtectedRoute>
          }
        />
        <Route
          path="/role-master/add"
          element={
            <ProtectedRoute>
              <AddRoleMasterUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/role-master/edit/:id"
          element={
            <ProtectedRoute>
              <EditRoleFormPageWrapperUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/role-master/import"
          element={
            <ProtectedRoute>
              <ImportRole />
            </ProtectedRoute>
          }
        />
        <Route
          path="/server-master"
          element={
            <ProtectedRoute>
              <ServerInventoryMasterUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/server-master/add"
          element={
            <ProtectedRoute>
              <AddServerInventoryUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/server-master/edit/:id"
          element={
            <ProtectedRoute>
              <EditServerInventoryUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/network-master"
          element={
            <ProtectedRoute>
              <NetworkMasterTable />
            </ProtectedRoute>
          }
        />
        <Route
          path="/network-master/add"
          element={
            <ProtectedRoute>
              <AddNetwork />
            </ProtectedRoute>
          }
        />
        <Route
          path="/network-master/edit/:id"
          element={
            <ProtectedRoute>
              <EditNetwork />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/network-master/import" 
          element={
            <ProtectedRoute>
              <ImportNetwork />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/system-master"
          element={
            <ProtectedRoute>
              <SystemInventoryMasterTableUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/system-master/add"
          element={
            <ProtectedRoute>
              <AddSystemInventoryUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/system-master/edit/:id"
          element={
            <ProtectedRoute>
              <EditSystemInventoryUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor-information"
          element={
            <ProtectedRoute>
              <VendorInformation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor-information/add"
          element={
            <ProtectedRoute>
              <AddVendorInformation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor-information/edit/:id"
          element={
            <ProtectedRoute>
              <EditVendorInformation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor-information/import"
          element={
            <ProtectedRoute>
              <ImportVendor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/access-logs"
          element={
            <ProtectedRoute>
              <AccessLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity-log"
          element={
            <ProtectedRoute>
              <ActivityLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-approval"
          element={
            <ProtectedRoute>
              <AdminApprovalBin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-approval/:id"
          element={
            <ProtectedRoute>
              <AdminApprovalDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approval-workflows"
          element={
            <ProtectedRoute>
              <ApprovalWorkflow />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/system-master/import" 
          element={
            <ProtectedRoute>
              <ImportSystemInventory />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/server-master/import" 
          element={
            <ProtectedRoute>
              <ImportServerInventory />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all route for 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </RouteWrapper>
  );
}

export default AppRoutes;