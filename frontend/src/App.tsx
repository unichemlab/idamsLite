// src/App.tsx
import React from "react";
import { BrowserRouter } from "react-router-dom";
import "./App.module.css";

import { DepartmentProvider } from "pages/DepartmentTable/DepartmentContext";
import { FormProvider } from "./context/FormContext";
import { AuthProvider } from "./context/AuthContext";
import { PermissionProvider } from "./context/PermissionContext";
import { RolesProvider } from "pages/RoleMasterUser/RolesContext";
import { UserProvider } from "./context/UserContext";
import { ApplicationsProvider } from "./context/ApplicationsContext";
import { ApproverProvider } from "./context/ApproverContext";
import { PlantProvider } from "pages/Plant/PlantContext";
import { VendorProvider } from "pages/VendorMasterInformation/VendorContext";
import { ActivityLogProvider } from "pages/ActivityMaster/ActivityLogContext";
import { SystemProvider } from "pages/SystemInventoryMasterUser/SystemContext";
import { ServerProvider } from "pages/ServerInventorymasterUser/ServerContext";
import { TaskProvider } from "pages/TaskClosureTracking/TaskContext";
import { UserRequestProvider } from "pages/UserRequest/UserRequestContext";
import {NetworkProvider} from "./context/NetworkContext";
import {UserMasterProvider} from "./context/UserMasterContext";

import AppRoutes from "./routes/AppRoutes";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ApproverProvider>
        <AuthProvider>
          <PermissionProvider>
            <PlantProvider>
             
                <UserRequestProvider>
                  <ActivityLogProvider>
                    <TaskProvider>
                      <FormProvider>
                        <RolesProvider>
                          <DepartmentProvider>
                            <UserProvider>
                              <UserMasterProvider>
                              <ApplicationsProvider>
                                <VendorProvider>
                                  <SystemProvider>
                                    <NetworkProvider>
                                    <ServerProvider>
                                      {/* Main App Routes */}
                                      <AppRoutes />

                                      {/* Vercel Integrations */}
                                      <SpeedInsights />
                                      <Analytics />
                                    </ServerProvider>
                                    </NetworkProvider>
                                  </SystemProvider>
                                </VendorProvider>
                              </ApplicationsProvider>
                              </UserMasterProvider>
                            </UserProvider>
                          </DepartmentProvider>
                        </RolesProvider>
                      </FormProvider>
                    </TaskProvider>
                  </ActivityLogProvider>
                </UserRequestProvider>
              
            </PlantProvider>
          </PermissionProvider>
        </AuthProvider>
      </ApproverProvider>
    </BrowserRouter>
  );
};

export default App;