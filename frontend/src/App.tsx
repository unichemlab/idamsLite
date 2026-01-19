// src/App.tsx
import React from "react";
import { BrowserRouter } from "react-router-dom";
import "./App.module.css";

import { DepartmentProvider } from "pages/DepartmentMaster/DepartmentContext";
import { FormProvider } from "./context/FormContext";
import { AuthProvider } from "./context/AuthContext";
import { PermissionProvider } from "./context/PermissionContext";
import { RolesProvider } from "./RoleMaster/RolesContext";
import { UserProvider } from "./context/UserContext";
import { ApplicationsProvider } from "./context/ApplicationsContext";
import { ApproverProvider } from "./context/ApproverContext";
import { PlantProvider } from "pages/PlantMaster/PlantContext";
import { PlantProviderUser } from "pages/Plant/PlantContext";
import { VendorProvider } from "pages/VendorMaster/VendorContext";
import { ActivityLogProvider } from "pages/ActivityMasterTable/ActivityLogContext";
import { SystemProvider } from "pages/SystemInventoryMaster/SystemContext";
import { ServerProvider } from "pages/ServerInventoryMaster/ServerContext";
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
              <PlantProviderUser>
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
              </PlantProviderUser>
            </PlantProvider>
          </PermissionProvider>
        </AuthProvider>
      </ApproverProvider>
    </BrowserRouter>
  );
};

export default App;