import React, { createContext, useContext, useState } from "react";

interface LogEntry {
  timestamp: string;
  message: string;
}

type RequestStatus = "draft" | "pending" | "approved" | "denied";

interface FormData {
  accessTypes: string[];
  trainingStatus: string;
  equipmentId: string;
  requestType: string; // New field for request type,
  appName: string;
  role: string;
  version: string;
  employeeCode?: string;
  requestId?: string;
  approvedAt?: string;
  validUntil?: string;
  userId?: string;
  requestStatus?: RequestStatus;
  logs?: LogEntry[];
}

interface FormContextType {
  data: FormData;
  setData: React.Dispatch<React.SetStateAction<FormData>>;
}

const defaultData: FormData = {
  accessTypes: [],
  
  trainingStatus: "",
  equipmentId: "",
  requestType: "",
  appName: "",
  role: "",
  version: "",
  employeeCode: "",
  requestId: undefined,
  approvedAt: undefined,
  validUntil: undefined,
  userId: undefined,
  requestStatus: "draft",
  logs: [
    { timestamp: new Date().toISOString(), message: "Request created (draft)" },
  ],
};

const FormContext = createContext<FormContextType | undefined>(undefined);

export const FormProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<FormData>(defaultData);

  return (
    <FormContext.Provider value={{ data, setData }}>
      {children}
    </FormContext.Provider>
  );
};

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context)
    throw new Error("useFormContext must be used inside FormProvider");
  return context;
};



