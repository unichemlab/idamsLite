import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";

import {
  fetchPlants,
  addPlantAPI,
  updatePlantAPI,
  deletePlantAPI,
} from "../../utils/api";

// ------------------------
// Custom Hook
// ------------------------
export const usePlantContext = () => {
  const ctx = useContext(PlantContext);
  if (!ctx) {
    throw new Error("usePlantContext must be used within PlantProvider");
  }
  return ctx;
};

// ------------------------
// Interfaces
// ------------------------

export interface Plant {
  id?: number;
  transaction_id?: string;
  name?: string;          // Local field
  plant_name?: string;    // API field
  description?: string;
  location?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface ApprovalResponse {
  message: string;
  approvalId: number;
  status: "PENDING_APPROVAL";
  data: any;
}

interface PlantContextType {
  plants: Plant[];
  addPlant: (plant: Plant) => Promise<ApprovalResponse | Plant>;
  updatePlant: (index: number, updated: Plant) => Promise<ApprovalResponse | Plant>;
  deletePlant: (index: number) => void;
  refreshPlants: () => void;
}

// ------------------------
// Context
// ------------------------
export const PlantContext = createContext<PlantContextType | undefined>(
  undefined
);

// ------------------------
// Provider
// ------------------------
export const PlantProvider = ({ children }: { children: ReactNode }) => {
  const [plants, setPlants] = useState<Plant[]>([]);

  // Normalize API → UI
  const normalizePlants = (data: any[]): Plant[] => {
    return data.map((p: any) => ({
      id: p.id,
      transaction_id: p.transaction_id,
      name: p.plant_name ?? p.name, // Safe fallback
      plant_name: p.plant_name,
      description: p.description,
      location: p.location,
      status: p.status,
    }));
  };

  const fetchAndSetPlants = () => {
    fetchPlants()
      .then((data) => {
        if (Array.isArray(data)) {
          setPlants(normalizePlants(data));
        } else {
          console.error("Invalid plant API response:", data);
          setPlants([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching plants:", err);
        setPlants([]);
      });
  };

  useEffect(() => {
    fetchAndSetPlants();
  }, []);

  // ------------------------
  // Add Plant
  // ------------------------
  const addPlant = async (plant: Plant): Promise<ApprovalResponse | Plant> => {
    const payload = {
      plant_name: plant.name,
      description: plant.description,
      location: plant.location,
      status: plant.status,
    };

    const response = await addPlantAPI(payload);

    if (response?.status === "PENDING_APPROVAL") {
      return response as ApprovalResponse;
    }

    fetchAndSetPlants();
    return response as Plant;
  };

  // ------------------------
  // Update Plant
  // ------------------------
  const updatePlant = async (
    index: number,
    updated: Plant
  ): Promise<ApprovalResponse | Plant> => {
    const plant = plants[index];

    if (!plant?.id) {
      throw new Error("Plant not found");
    }

    const payload = {
      plant_name: updated.name,
      description: updated.description,
      location: updated.location,
      status: updated.status,
    };

    const response = await updatePlantAPI(plant.id, payload);

    if (response?.status === "PENDING_APPROVAL") {
      return response as ApprovalResponse;
    }

    fetchAndSetPlants();
    return response as Plant;
  };

  // ------------------------
  // Delete Plant
  // ------------------------
  const deletePlant = async (
    index: number
  ): Promise<ApprovalResponse | void> => {
    const plant = plants[index];

    if (!plant?.id) {
      throw new Error("Plant not found");
    }

    const response = await deletePlantAPI(plant.id);
    

    // if (response?.status === "PENDING_APPROVAL") {
    //   return response as ApprovalResponse;
    // }

    fetchAndSetPlants();
  };

  // ------------------------
  // Refresh
  // ------------------------
  const refreshPlants = () => fetchAndSetPlants();

  return (
    <PlantContext.Provider
      value={{ plants, addPlant, updatePlant, deletePlant, refreshPlants }}
    >
      {children}
    </PlantContext.Provider>
  );
};
