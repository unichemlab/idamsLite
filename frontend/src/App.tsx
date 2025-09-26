import React from "react";
import { BrowserRouter } from "react-router-dom";
import "./App.module.css";

import { DepartmentProvider } from "pages/DepartmentMaster/DepartmentContext";
import { FormProvider } from "./context/FormContext";
import { AuthProvider } from "./context/AuthContext";
import { RolesProvider } from "./RoleMaster/RolesContext";
import { UserProvider } from "./context/UserContext";
import { ApplicationsProvider } from "./context/ApplicationsContext";
import { ApproverProvider } from "./context/ApproverContext";
import { PlantProvider } from "pages/PlantMaster/PlantContext";
import { VendorProvider } from "pages/VendorMaster/VendorContext";
import { SystemProvider } from "pages/SystemInventoryMaster/SystemContext";
import { ServerProvider } from "pages/ServerInventoryMaster/ServerContext";
// Import the new contexts
import { UserRequestProvider } from "pages/UserRequest/UserRequestContext";
// import { TaskProvider } from "pages/TaskClosureTracking/TaskContext";
// import { AccessLogProvider } from "pages/AccessLog/AccessLogContext";

import AppRoutes from "./routes/AppRoutes";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

const App: React.FC = () => {
  return (
    <ApproverProvider>
      <AuthProvider>
        <PlantProvider>
          <UserRequestProvider>
                <FormProvider>
                  <RolesProvider>
                    <DepartmentProvider>
                      <UserProvider>
                        <ApplicationsProvider>
                          <VendorProvider>
                            <SystemProvider>
                              <ServerProvider>
                            <BrowserRouter>
                              {/* Main App Routes */}
                              <AppRoutes />

                              {/* Vercel Integrations */}
                              <SpeedInsights />
                              <Analytics />
                            </BrowserRouter>
                            </ServerProvider>
                            </SystemProvider>
                          </VendorProvider>
                        </ApplicationsProvider>
                      </UserProvider>
                    </DepartmentProvider>
                  </RolesProvider>
                </FormProvider>
          </UserRequestProvider>
        </PlantProvider>
      </AuthProvider>
    </ApproverProvider>
  );
};

export default App;
