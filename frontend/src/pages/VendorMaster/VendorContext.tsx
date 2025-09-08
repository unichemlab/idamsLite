import React, { createContext, useState, useEffect, ReactNode } from "react";
import {
  fetchVendors,
  addVendorAPI,
  updateVendorAPI,
  deleteVendorAPI,
} from "../../utils/api";

export const useVendorContext = () => {
  const ctx = React.useContext(VendorContext);
  if (!ctx)
    throw new Error("useVendorContext must be used within VendorProvider");
  return ctx;
};

export interface Vendor {
  id?: number;
  transaction_id?: string;
  name?: string;
  vendor_name?: string;
  description?: string;
  status?: "ACTIVE" | "INACTIVE";
}

interface VendorContextType {
  vendors: Vendor[];
  addVendor: (vendor: Vendor) => void;
  updateVendor: (index: number, updated: Vendor) => void;
  deleteVendor: (index: number) => void;
}

// No default vendor, will fetch from API

export const VendorContext = createContext<VendorContextType | undefined>(
  undefined
);

export const VendorProvider = ({ children }: { children: ReactNode }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const fetchAndSetVendors = () => {
    fetchVendors()
      .then((data) => {
        // Normalize API data to match Vendor interface
        const normalized = data.map((p: any) => ({
          id: p.id,
          transaction_id: p.transaction_id,
          name: p.vendor_name, // use vendor_name as name
          description: p.description,
          status: p.status,
        }));
        setVendors(normalized);
      })
      .catch((err) => {
        setVendors([]);
      });
  };

  useEffect(() => {
    fetchAndSetVendors();
  }, []);

  // Add vendor via API
  const addVendor = async (vendor: Vendor) => {
    await addVendorAPI({
      vendor_name: vendor.name,
      description: vendor.description,
      status: vendor.status,
    });
    fetchAndSetVendors();
  };

  // Update vendor via API
  const updateVendor = async (index: number, updated: Vendor) => {
    const vendor = vendors[index];
    if (!vendor || !vendor.id) return;
    await updateVendorAPI(vendor.id, {
      vendor_name: updated.name,
      description: updated.description,
      status: updated.status,
    });
    fetchAndSetVendors();
  };

  // Delete vendor via API
  const deleteVendor = async (index: number) => {
    const vendor = vendors[index];
    if (!vendor || !vendor.id) return;
    await deleteVendorAPI(vendor.id);
    fetchAndSetVendors();
  };

  return (
    <VendorContext.Provider
      value={{ vendors, addVendor, updateVendor, deleteVendor }}
    >
      {children}
    </VendorContext.Provider>
  );
};
