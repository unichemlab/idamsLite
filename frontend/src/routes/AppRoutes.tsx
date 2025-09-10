import { Routes, Route, useLocation } from "react-router-dom";
import UserInformation from "../pages/UserInformation/UserInformation";
import AccessDetails from "../pages/AccessDetails/AccessDetails";
import ReviewSubmit from "../pages/ReviewSubmit/ReviewSubmit";
import ApplicationMasterTable from "../pages/ApplicationMasterTable/ApplicationMasterTable";
import AddApplicationFormPage from "../pages/ApplicationMasterTable/AddApplicationFormPage";
import EditApplicationFormPage from "../pages/ApplicationMasterTable/EditApplicationFormPage";
import GenerateCredentials from "../pages/GenerateCredentials/GenerateCredentials";
import AddUserRequest from "pages/UserRequest/UserRequestForm"; 
import TrackRequest from "../pages/TrackRequest";
import Login from "../pages/Login";
import ApproverDashboard from "../pages/ApproverDashboard";
import AccessRequestDetails from "../pages/AccessRequestDetails";
import RoleMasterTable from "../pages/RoleMasterTable/RoleMasterTable";
import UserMasterTable from "../pages/UserMasterTable/UserMasterTable";
import UserRequestTable from "../pages/UserRequestTable/UserRequestTable";
import AddUserFormPage from "../pages/AddUserPanel/AddUserFormPage";
import EditUserFormPage from "../pages/AddUserPanel/EditUserFormPage";
import AddRoleFormPage from "../RoleMaster/AddRoleFormPage";
import EditRoleFormPage from "../RoleMaster/EditRoleFormPage";
import VendorMasterTable from "../pages/VendorMasterTable/VendorMasterTable";
import SuperAdmin from "../pages/SuperAdmin/SuperAdmin";
import PlantMasterTable from "../pages/PlantMasterTable/PlantMasterTable";
import AddPlantMaster from "../pages/PlantMaster/AddPlantMaster";
import EditPlantMaster from "../pages/PlantMaster/EditPlantMaster";
import AddVendorMaster from "../pages/VendorMaster/AddVendorMaster";
import EditVendorMaster from "../pages/VendorMaster/EditVendorMaster";
import ProtectedRoute from "../components/Common/ProtectedRoute";
import DepartmentMasterTable from "pages/DepartmentMasterTable/DepartmentMasterTable";
import DepartmentTable from "pages/DepartmentTable/DepartmentTable";
import AddDeptFormPage from "pages/DepartmentMaster/AddDeptFormPage";
import EditDeptFormPage from "pages/DepartmentMaster/EditDeptFormPage";

// List of allowed routes for matching
const allowedRoutes = [
  "/", // login
  "/users",
  "/add-user",
  "/edit-user/:idx",
  "/user-requests",
  "/user-requests/add",
  "/access-details",
  "/approver-step/:step/:id",
  "/review-submit",
  "/generate-credentials",
  "/track-request",
  "/approver",
  "/access-request/:id",
  "/superadmin",
  "/plants",
  "/plants/add",
  "/plants/edit/:id",
  "/departments",
  "/departments/add",
  "/departments/edit/:id",
  "/department-table",
  "/roles",
  "/add-role",
  "/edit-role/:idx",
  "/application-master",
  "/add-application",
  "/edit-application/:idx",
  "/vendors",
  "/vendors/add",
  "/vendors/edit/:id",
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

  if (!isAllowed) {
    return <NotFound />;
  }

  return (
    <Routes>
      {/* User Flow */}
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
        path="/user-requests/add"
        element={
          <ProtectedRoute>
            <AddUserRequest />
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


      {/*Department Master */}
      

       {/* Department (important) */}
      <Route path="/departments" element={<ProtectedRoute><DepartmentMasterTable /></ProtectedRoute>} />
      <Route path="/departments/add" element={<ProtectedRoute><AddDeptFormPage /></ProtectedRoute>} />
      <Route path="/departments/edit/:id" element={<ProtectedRoute><EditDeptFormPage /></ProtectedRoute>} />
      <Route path="/department-table" element={<ProtectedRoute><DepartmentTable /></ProtectedRoute>} />



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
        path="/add-role"
        element={
          <ProtectedRoute>
            <AddRoleFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-role/:idx"
        element={
          <ProtectedRoute>
            <EditRoleFormPage />
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
      {/* Catch-all route for 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
