import React, { createContext, useContext, useState } from "react";
import { ApprovalAction } from "../pages/ApprovalHistoryTable";

interface ApproverContextType {
  requests: any[];
  setRequests: React.Dispatch<React.SetStateAction<any[]>>;
  approvalActions: ApprovalAction[];
  setApprovalActions: React.Dispatch<React.SetStateAction<ApprovalAction[]>>;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
}

const ApproverContext = createContext<ApproverContextType | undefined>(
  undefined
);

export const ApproverProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [approvalActions, setApprovalActions] = useState<ApprovalAction[]>([]);
  const [activeTab, setActiveTab] = useState<string>("access-requests");

  return (
    <ApproverContext.Provider
      value={{
        requests,
        setRequests,
        approvalActions,
        setApprovalActions,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </ApproverContext.Provider>
  );
};

export const useApprover = () => {
  const ctx = useContext(ApproverContext);
  if (!ctx) throw new Error("useApprover must be used within ApproverProvider");
  return ctx;
};
