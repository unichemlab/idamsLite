import React from "react";
import "./App.module.css";
import { BrowserRouter } from "react-router-dom";
import { DepartmentProvider} from "pages/DepartmentMaster/DepartmentContext";
import { FormProvider } from "./context/FormContext";
import { AuthProvider } from "./context/AuthContext";
import { RolesProvider } from "./RoleMaster/RolesContext";
import { UserProvider } from "./context/UserContext";
import { ApplicationsProvider } from "./context/ApplicationsContext";
import { ApproverProvider } from "./context/ApproverContext";

import AppRoutes from "./routes/AppRoutes";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { PlantProvider } from "pages/PlantMaster/PlantContext";

import { VendorProvider } from "./context/VendorContext";

const App: React.FC = () => {
  return (
    <ApproverProvider>
      <AuthProvider>
        <PlantProvider>
          <FormProvider>
            <RolesProvider>
              <DepartmentProvider>
              <UserProvider>
                <ApplicationsProvider>
                  <VendorProvider>
                    <BrowserRouter>
                      {/* Main App Routes */}
                      <AppRoutes />

                      {/* Vercel Integrations */}
                      <SpeedInsights />
                      <Analytics />
                    </BrowserRouter>
                  </VendorProvider>
                </ApplicationsProvider>
              </UserProvider>
              </DepartmentProvider>
            </RolesProvider>
          </FormProvider>
        </PlantProvider>
      </AuthProvider>
    </ApproverProvider>
  );
};

export default App;
