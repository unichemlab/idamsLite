import React, { createContext, useState, useEffect, ReactNode } from "react";
import {
  fetchVendors,
  addVendorAPI,
  updateVendorAPI,
  deleteVendorAPI,
} from "../../utils/api";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface Vendor {
  id?: number;
  transaction_id?: string;
  name?: string;
  vendor_name?: string;
  code?: string;
  description?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface ApprovalResponse {
  message: string;
  approvalId: number;
  status: "PENDING_APPROVAL";
  data: any;
}

// ── Context type ──────────────────────────────────────────────────────────────

interface VendorContextType {
  vendors: Vendor[];
  refreshVendors: () => void;
  addVendor:    (vendor: Vendor)              => Promise<ApprovalResponse | Vendor>;
  updateVendor: (index: number, updated: Vendor) => Promise<ApprovalResponse | Vendor>;
  deleteVendor: (index: number)               => Promise<void>;
}

export const VendorContext = createContext<VendorContextType | undefined>(undefined);

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useVendorContext = () => {
  const ctx = React.useContext(VendorContext);
  if (!ctx)
    throw new Error("useVendorContext must be used within VendorProvider");
  return ctx;
};

// ── Provider ──────────────────────────────────────────────────────────────────

export const VendorProvider = ({ children }: { children: ReactNode }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const fetchAndSetVendors = () => {
    fetchVendors()
      .then((data) => {
        const normalized = data.map((p: any) => ({
          id:             p.id,
          transaction_id: p.transaction_id,
          name:           p.vendor_name,
          code:           p.vendor_code,
          description:    p.description,
          status:         p.status,
        }));
        setVendors(normalized);
      })
      .catch(() => {
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

  // ── Add Vendor ──────────────────────────────────────────────────────────────
  const addVendor = async (
    vendor: Vendor
  ): Promise<ApprovalResponse | Vendor> => {
    try {
      const response = await addVendorAPI({
        vendor_name: vendor.name,
        vendor_code: vendor.code,
        description: vendor.description,
        status:      vendor.status,
      });

      if (response?.status === "PENDING_APPROVAL") {
        return response as ApprovalResponse;
      }

      fetchAndSetVendors();
      return response as Vendor;
    } catch (err: any) {
      throw new Error(getErrorMessage(err));
    }
  };

  // ── Update Vendor ───────────────────────────────────────────────────────────
  const updateVendor = async (
    index: number,
    updated: Vendor
  ): Promise<ApprovalResponse | Vendor> => {
    const vendor = vendors[index];
    if (!vendor || !vendor.id) throw new Error("Vendor not found");

    try {
      const response = await updateVendorAPI(vendor.id, {
        vendor_name: updated.name,
        vendor_code: updated.code,
        description: updated.description,
        status:      updated.status,
      });

      if (response?.status === "PENDING_APPROVAL") {
        return response as ApprovalResponse;
      }

      fetchAndSetVendors();
      return response as Vendor;
    } catch (err: any) {
      throw new Error(getErrorMessage(err));
    }
  };

  // ── Delete Vendor ───────────────────────────────────────────────────────────
  const deleteVendor = async (index: number): Promise<void> => {
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
        refreshVendors: fetchAndSetVendors,
        addVendor,
        updateVendor,
        deleteVendor,
      }}
    >
      {children}
    </VendorContext.Provider>
  );
};