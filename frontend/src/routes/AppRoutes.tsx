// ...imports...
// (All import statements remain at the top)
import React from "react";
import { Routes, Route, useLocation, useParams } from "react-router-dom";
import UserInformation from "../pages/UserInformation/UserInformation";
import AccessDetails from "../pages/AccessDetails/AccessDetails";
import ReviewSubmit from "../pages/ReviewSubmit/ReviewSubmit";
import ApplicationMasterTable from "../pages/ApplicationMasterTable/ApplicationMasterTable";
import AddApplicationFormPage from "../pages/ApplicationMasterTable/AddApplicationFormPage";
import EditApplicationFormPage from "../pages/ApplicationMasterTable/EditApplicationFormPage";
import ApplicationMaster from "../pages/ApplicationMaster/ApplicationMasterTable";
import AddApplicationForm from "../pages/ApplicationMaster/AddApplicationFormPage";
import EditApplicationForm from "../pages/ApplicationMaster/EditApplicationFormPage";
import GenerateCredentials from "../pages/GenerateCredentials/GenerateCredentials";
import AddUserRequest from "pages/UserRequest/UserRequestForm";
import AddServiceRequest from "pages/ServiceRequest/ServiceRequestForm";
import TrackRequest from "../pages/TaskRequest/TrackRequest";
import Login from "../pages/Login";
import ApproverDashboard from "../pages/ApproverDashboard";
import AccessRequestDetails from "../pages/AccessRequestDetails";
import AccessDenied from "../pages/AccessDenied";
import RoleMasterTable from "../pages/RoleMasterTable/RoleMasterTable";
import UserMasterTable from "../pages/UserMasterTable/UserMasterTable";
import UserRequestTable from "../pages/UserRequestTable/UserRequestTable";
import ServiceRequestTable from "../pages/ServiceRequestTable/ServiceRequestTable";
import AddUserFormPage from "../pages/AddUserPanel/AddUserFormPage";
import EditUserFormPage from "../pages/AddUserPanel/EditUserFormPage";
import AddRoleFormPage from "../RoleMaster/AddRoleFormPage";
import EditRoleFormPage from "../RoleMaster/EditRoleFormPage";
import VendorMasterTable from "../pages/VendorMasterTable/VendorMasterTable";
import ActivityMasterTable from "../pages/ActivityMasterTable/ActivityMasterTable";
import PlantITSupportMaster from "../pages/PlantITSupport/PlantITSupportMaster";
import EditPlantITSupportMaster from "../pages/PlantITSupport/EditAddPlantITSupportMaster";
import AddPlantITSupportMaster from "../pages/PlantITSupport/AddPlantITSupportMaster";
import TaskClosureBINMaster from "../pages/TaskClosureBin/PlantITSupportMaster";
import EditTaskClosureBINMaster from "../pages/TaskClosureBin/EditAddPlantITSupportMaster";
import AddTaskClosureBINMaster from "../pages/TaskClosureBin/AddPlantITSupportMaster";
import WorkflowBuilder from "../pages/Approvalworkflow/WorkflowBuilder";
import PlantWorkflowList from "../pages/Approvalworkflow/PlantWorkflowList";
import PlantWorkflowBuilder from "../pages/Approvalworkflow/PlantWorkflowBuilder";
import CorporateWorkflowList from "../pages/Approvalworkflow/CorporateWorkflowList";
import CorporateWorkflowBuilder from "../pages/Approvalworkflow/CorporateWorkflowBuilder";
import SuperAdmin from "../pages/SuperAdmin/SuperAdmin";
import PlantMasterTable from "../pages/PlantMasterTable/PlantMasterTable";
import AddPlantMaster from "../pages/PlantMaster/AddPlantMaster";
import EditPlantMaster from "../pages/PlantMaster/EditPlantMaster";
/**************new master************* */
import DashboardMain from "../pages/Dashboard/dashboard";
import AccessLog from "../pages/AccessLog/AccessLogTable";
import PlantMasterUserTable from "../pages/Plant/PlantMasterTable";
import AddPlantMasterUser from "../pages/Plant/AddPlantMaster";
import EditPlantMasterUser from "../pages/Plant/EditPlantMaster";
import UserMaster from "../pages/UserMaster/UserMasterTable";
import AddUserMasterUser from "../pages/UserMaster/AddUserFormPage";
import EditUserMasterUser from "../pages/UserMaster/EditUserFormPage";
import RoleMaster from "../pages/RoleMasterUser/RoleMasterTable";
import AddRoleMasterUser from "../pages/RoleMasterUser/AddRoleFormPage";
import EditRoleMasterUser from "../pages/RoleMasterUser/EditRoleFormPage";
import ServerInventoryMasterUser from "../pages/ServerInventorymasterUser/ServerInventoryMasterTable";
import AddServerInventoryUser from "../pages/ServerInventorymasterUser/AddServerInventoryMaster";
import EditServerInventoryUser from "../pages/ServerInventorymasterUser/EditServerInventoryMaster";
import SystemInventoryMasterTableUser from "../pages/SystemInventoryMasterUser/SystemInventoryMasterTable";
import AddSystemInventoryUser from "../pages/SystemInventoryMasterUser/AddSystemInventory";
import EditSystemInventoryUser from "../pages/SystemInventoryMasterUser/EditSystemInventory";
import VendorInformation from "../pages/VendorMasterInformation/VendorMasterTable";
import AddVendorInformation from "../pages/VendorMasterInformation/AddVendorMaster";
import EditVendorInformation from "../pages/VendorMasterInformation/EditVendorMaster";
import ActivityLog from "../pages/ActivityMaster/ActivityMasterTable";
import AdminApprovalBin from "pages/MasterDataApprovalBin/MasterApprovalBin";
import AdminApprovalDetails from "pages/MasterDataApprovalBin/MasterApprovalDetails";
import ApprovalWorkflow from "pages/ApprovalworkflowUser/WorkflowBuilder";


/****************************************** */
import AddVendorMaster from "../pages/VendorMaster/AddVendorMaster";
import EditVendorMaster from "../pages/VendorMaster/EditVendorMaster";
import ProtectedRoute from "../components/Common/ProtectedRoute";
import DepartmentMasterTable from "pages/DepartmentMasterTable/DepartmentMasterTable";
import DepartmentTable from "pages/DepartmentTable/DepartmentMasterTable";
import AddDeptTableFormPage from "pages/DepartmentTable/AddDeptFormPage";
import EditDeptTableFormPage from "pages/DepartmentTable/EditDeptFormPage";
import AddTaskClosureForm from "../pages/TaskClosureTracking/AddTaskClosureForm";
import AddDeptFormPage from "pages/DepartmentMaster/AddDeptFormPage";
import EditDeptFormPage from "pages/DepartmentMaster/EditDeptFormPage";
import SystemInventoryMasterTable from "../pages/SystemInventoryMasterTable/SystemInventoryMasterTable";
import AddSystemInventory from "../pages/SystemInventoryMaster/AddSystemInventory";
import EditSystemInventory from "../pages/SystemInventoryMaster/EditSystemInventory";
import ServerInventoryMasterTable from "../pages/ServerInventoryMasterTable/ServerInventoryMasterTable";
import AddServerInventory from "../pages/ServerInventoryMaster/AddServerInventoryMaster";
import EditServerInventory from "../pages/ServerInventoryMaster/EditServerInventoryMaster";
import TaskTable from "pages/TaskClosureTracking/TaskClosureTracking";
import TaskDetailView from "pages/TaskClosureTracking/TaskDetailView";
import Home from "pages/HomePage/homepageUser";
import HomePage from "pages/HomePage/HomePage";
import MasterApprovalBin from "pages/MasterApprovalBin/MasterApprovalBin";
import MasterApprovalDetails from "pages/MasterApprovalBin/MasterApprovalDetails";
import PendingApprovalPage from "pages/ApproverDashboard/PendingApproval";
import AccessLogPage from "pages/AccessLogTable/AccessLogTable";
import ApprovalHistoryPage from "pages/ApproverDashboard/ApprovalHistory";
import MasterApprovalUserDetails from "pages/MasterApprovalBin/MasterApprovalUserDetails";
import MasterApprovalUserBin from "pages/MasterApprovalBin/MasterApprovalUserBin";
import { Dashboard } from "@mui/icons-material";
// Removed unused SystemInventoryMasterTable, AddSystemInventory, EditSystemInventory imports
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
  // ✅ New workflow routes
 "/approval-workflow",
  "/approval-workflow/plant-list",
  "/approval-workflow/plant-builder",
  "/approval-workflow/corporate-list",
  "/approval-workflow/corporate-builder",
  "/admin/roles",
  "/master-approvals",
  "/master-approvals/:id",
  "/admin-approvals",
  "/admin-approvals/:id",
  "/home",
  "/homepage",
  "/approver/pending",   // Pending approvals page
  "/approver/history",
  "/access-request/:id",
  "/access-log",
  /*********************New url for master ************************ */
  "/dashboard",
  "/plant-master",
  "/plant-master/add",
  "/plant-master/edit/:id",
   "/application-masters",
  "/add-application-masters",
  "/edit-application-masters/:idx",
  "/task-closure-bin",
  "/task-closure-bin/add",
  "/task-closure-bin/edit/:id",
   "/department-master",
   "/department-master/add",
   "/department-master/edit/:id",
   "/user-master",
   "/user-master/add",
   "/user-master/edit/:id",
   "/role-master",
   "/role-master/add",
   "/role-master/edit/:id",
   "/server-master",
   "/server-master/add",
   "/server-master/edit/:id",
   "/system-master",
   "/system-master/add",
   "/system-master/edit/:id",
   "/vendor-information",
   "/vendor-information/add",
   "/vendor-information/edit/:id",
   "/access-logs",
   "/activity-log",
   "/admin-approval",
   "/admin-approval/:id",
    "/approval-workflows",
  /********************************************************* */
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

  // Wrapper to use useParams correctly
  function EditRoleFormPageWrapper() {
    const params = useParams();
    return <EditRoleFormPage roleId={Number(params.id)} />;
  }
    function EditRoleFormPageWrapperUser()
    {
      const params = useParams();
    return <EditRoleMasterUser roleId={Number(params.id)} />;
    }
  return (
    <Routes>
      {/* User Flow */}
      <Route path="/user-information" element={<UserInformation />} />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UserMasterTable />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-user"
        element={
          <ProtectedRoute>
            <AddUserFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-user/:idx"
        element={
          <ProtectedRoute>
            <EditUserFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-requests"
        element={
          <ProtectedRoute>
            <UserRequestTable />
          </ProtectedRoute>
        }
      />
      <Route
        path="/service-requests"
        element={
          <ProtectedRoute>
            <ServiceRequestTable />
          </ProtectedRoute>
        }
      />
      <Route path="/user-access-management" element={
         <ProtectedRoute>
        <AddUserRequest />
        </ProtectedRoute>
      } 
      />
      <Route path="/service-access-management" element={
         <ProtectedRoute>
        <AddServiceRequest />
        </ProtectedRoute>
      } 
      />
      <Route path="/approval-workflow" element={<WorkflowBuilder />} />
<Route path="/approval-workflow/plant-list" element={<PlantWorkflowList />} />
<Route path="/approval-workflow/plant-builder" element={<PlantWorkflowBuilder />} />
<Route path="/approval-workflow/corporate-list" element={<CorporateWorkflowList />} />
<Route path="/approval-workflow/corporate-builder" element={<CorporateWorkflowBuilder />} />
{/* Approval Routes */}
        <Route path="/master-approvals" element={<MasterApprovalBin />} />
        <Route path="/master-approvals/:id" element={<MasterApprovalDetails />} />
        <Route path="/admin-approvals" element={<MasterApprovalUserBin />} />
        <Route path="/admin-approvals/:id" element={<MasterApprovalUserDetails />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/homepage" element={<Home />} />
        
{/* <Route path="/admin/roles" element={<RolesPage />} /> */}


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
      <Route
        path="/access-details"
        element={
          <ProtectedRoute>
            <AccessDetails />
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
        path="/review-submit"
        element={
          <ProtectedRoute>
            <ReviewSubmit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/generate-credentials"
        element={
          <ProtectedRoute>
            <GenerateCredentials />
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
  path="/access-log"
  element={
    <ProtectedRoute>
      <AccessLogPage />
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

      {/* SuperAdmin Flow */}
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute>
            <SuperAdmin />
          </ProtectedRoute>
        }
      />

      <Route
        path="/plants"
        element={
          <ProtectedRoute>
            <PlantMasterTable />
          </ProtectedRoute>
        }
      />
      <Route
        path="/plants/add"
        element={
          <ProtectedRoute>
            <AddPlantMaster />
          </ProtectedRoute>
        }
      />
      <Route
        path="/plants/edit/:id"
        element={
          <ProtectedRoute>
            <EditPlantMaster />
          </ProtectedRoute>
        }
      />

      {/* Department Master */}
      <Route
        path="/departments"
        element={
          <ProtectedRoute>
            <DepartmentMasterTable />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments/add"
        element={
          <ProtectedRoute>
            <AddDeptFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments/edit/:id"
        element={
          <ProtectedRoute>
            <EditDeptFormPage />
          </ProtectedRoute>
        }
      />

      {/* Role Master */}
      <Route
        path="/roles"
        element={
          <ProtectedRoute>
            <RoleMasterTable />
          </ProtectedRoute>
        }
      />

      <Route
        path="/roles/add"
        element={
          <ProtectedRoute>
            <AddRoleFormPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/roles/edit/:id"
        element={
          <ProtectedRoute>
            <EditRoleFormPageWrapper />
          </ProtectedRoute>
        }
      />

      {/* Application Master */}
      <Route
        path="/application-master"
        element={
          <ProtectedRoute>
            <ApplicationMasterTable />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-application"
        element={
          <ProtectedRoute>
            <AddApplicationFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-application/:idx"
        element={
          <ProtectedRoute>
            <EditApplicationFormPage />
          </ProtectedRoute>
        }
      />

      {/* Vendor Master: just use Route elements, context should be provided in App.tsx */}
      <Route
        path="/vendors"
        element={
          <ProtectedRoute>
            <VendorMasterTable />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendors/add"
        element={
          <ProtectedRoute>
            <AddVendorMaster />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendors/edit/:id"
        element={
          <ProtectedRoute>
            <EditVendorMaster />
          </ProtectedRoute>
        }
      />

      <Route
        path="/activity-logs"
        element={
          <ProtectedRoute>
            <ActivityMasterTable />
          </ProtectedRoute>
        }
      />

      {/* System Inventory Master */}

      <Route
        path="/systems"
        element={
          <ProtectedRoute>
            <SystemInventoryMasterTable />
          </ProtectedRoute>
        }
      />
      <Route
        path="/systems/add"
        element={
          <ProtectedRoute>
            <AddSystemInventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/systems/edit/:id"
        element={
          <ProtectedRoute>
            <EditSystemInventory />
          </ProtectedRoute>
        }
      />
      <Route path="/task" element={<TaskTable />} />
<Route path="/task/:id" element={<AddTaskClosureForm />} />
<Route path="/task-detail/:id" element={<TaskDetailView />} />

      {/* Server Inventory Master */}

      <Route
        path="/servers"
        element={
          <ProtectedRoute>
            <ServerInventoryMasterTable />
          </ProtectedRoute>
        }
      />
      <Route
        path="/servers/add"
        element={
          <ProtectedRoute>
            <AddServerInventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/servers/edit/:id"
        element={
          <ProtectedRoute>
            <EditServerInventory />
          </ProtectedRoute>
        }
      />
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
{/*************************************************************************************** */}
      {/* Catch-all route for 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
