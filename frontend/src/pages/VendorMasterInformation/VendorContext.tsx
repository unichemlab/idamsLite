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
  code?: string;
  description?: string;
  status?: "ACTIVE" | "INACTIVE";
}

interface VendorContextType {
  vendors: Vendor[];
   refreshVendors: () => void; 
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
          code: p.vendor_code, // use vendor_code as code
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

const getErrorMessage = (err: any): string =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  "Something went wrong";



  // Add vendor via API
  const addVendor = async (vendor: Vendor) => {
  try {
    await addVendorAPI({
      vendor_name: vendor.name,
      vendor_code: vendor.code,
      description: vendor.description,
      status: vendor.status,
    });

    fetchAndSetVendors();
  } catch (err: any) {
    throw new Error(getErrorMessage(err));
  }
};


  // Update vendor via API
  const updateVendor = async (index: number, updated: Vendor) => {
  const vendor = vendors[index];
  if (!vendor || !vendor.id) return;

  try {
    await updateVendorAPI(vendor.id, {
      vendor_name: updated.name,
      vendor_code: updated.code,
      description: updated.description,
      status: updated.status,
    });

    fetchAndSetVendors();
  } catch (err: any) {
    throw new Error(getErrorMessage(err));
  }
};


  // Delete vendor via API
  const deleteVendor = async (index: number) => {
  const vendor = vendors[index];
  if (!vendor || !vendor.id) return;

  try {
    await deleteVendorAPI(vendor.id);
    fetchAndSetVendors();
  } catch (err: any) {
    throw new Error(getErrorMessage(err));
  }
};


  return (
  <VendorContext.Provider
    value={{
      vendors,
      refreshVendors: fetchAndSetVendors,   // ✅ expose refresh
      addVendor,
      updateVendor,
      deleteVendor,
    }}
  >
      {children}
    </VendorContext.Provider>
  );
};
