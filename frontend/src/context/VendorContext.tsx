import React, { createContext, useState } from "react";
import { VendorUser } from "../pages/VendorMasterTable/VendorMasterTable";

// Add id to VendorUser type for context usage
export type VendorUserWithId = VendorUser & { id: string };

interface VendorContextType {
  vendors: VendorUserWithId[];
  addVendor: (vendor: VendorUserWithId) => void;
  updateVendor: (vendor: VendorUserWithId) => void;
  setVendors: (vendors: VendorUserWithId[]) => void;
}

export const VendorContext = createContext<VendorContextType>({
  vendors: [],
  addVendor: () => {},
  updateVendor: () => {},
  setVendors: () => {},
});

export const VendorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Initial dummy data
  const initialVendors: VendorUserWithId[] = [
    {
      id: "1",
      fullName: "Acme Pharma Pvt Ltd",
      comment: "Preferred vendor for chemicals",
      status: "Active",
      activityLogs: [
        {
          action: "Add",
          oldValue: "-",
          newValue: "Vendor Added",
          approver: "Admin1",
          dateTime: "2025-08-10T09:30:00",
          reason: "New vendor onboarded",
        },
      ],
    },
    {
      id: "2",
      fullName: "Zenith Labs",
      comment: "Quality vendor, currently inactive",
      status: "Inactive",
      activityLogs: [
        {
          action: "Add",
          oldValue: "-",
          newValue: "Vendor Added",
          approver: "Admin1",
          dateTime: "2025-08-05T10:00:00",
          reason: "Added for QA supplies",
        },
      ],
    },
    {
      id: "3",
      fullName: "BioGenix Solutions",
      comment: "Supplier for lab equipment",
      status: "Active",
      activityLogs: [
        {
          action: "Add",
          oldValue: "-",
          newValue: "Vendor Added",
          approver: "Admin2",
          dateTime: "2025-08-15T11:20:00",
          reason: "Lab expansion project",
        },
      ],
    },
    {
      id: "4",
      fullName: "MediCore Distributors",
      comment: "Bulk medicine distributor",
      status: "Active",
      activityLogs: [
        {
          action: "Add",
          oldValue: "-",
          newValue: "Vendor Added",
          approver: "Admin3",
          dateTime: "2025-08-18T14:45:00",
          reason: "Annual contract renewal",
        },
      ],
    },
    {
      id: "5",
      fullName: "PharmaTech Inc.",
      comment: "Inactive due to compliance review",
      status: "Inactive",
      activityLogs: [
        {
          action: "Add",
          oldValue: "-",
          newValue: "Vendor Added",
          approver: "Admin1",
          dateTime: "2025-08-20T09:00:00",
          reason: "Added for pilot program",
        },
      ],
    },
  ];
  const [vendors, setVendors] = useState<VendorUserWithId[]>(initialVendors);

  const addVendor = (vendor: VendorUserWithId) => {
    const id = vendor.id || Math.random().toString(36).substr(2, 9);
    setVendors((prev) => [{ ...vendor, id }, ...prev]);
  };

  const updateVendor = (vendor: VendorUserWithId) => {
    setVendors((prev) => {
      const idx = prev.findIndex((v) => v.id === vendor.id);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = vendor;
      return updated;
    });
  };

  return (
    <VendorContext.Provider
      value={{ vendors, addVendor, updateVendor, setVendors }}
    >
      {children}
    </VendorContext.Provider>
  );
};
