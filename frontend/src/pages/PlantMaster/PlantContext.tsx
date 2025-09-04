import React, { createContext, useState, useEffect, ReactNode } from "react";
import {
  fetchPlants,
  addPlantAPI,
  updatePlantAPI,
  deletePlantAPI,
} from "../../utils/api";

export const usePlantContext = () => {
  const ctx = React.useContext(PlantContext);
  if (!ctx)
    throw new Error("usePlantContext must be used within PlantProvider");
  return ctx;
};

export interface Plant {
  id?: number;
  transaction_id?: string;
  name?: string;
  plant_name?: string;
  description?: string;
  location?: string;
  status?: "ACTIVE" | "INACTIVE";
}

interface PlantContextType {
  plants: Plant[];
  addPlant: (plant: Plant) => void;
  updatePlant: (index: number, updated: Plant) => void;
  deletePlant: (index: number) => void;
}

// No default plants, will fetch from API

export const PlantContext = createContext<PlantContextType | undefined>(
  undefined
);

export const PlantProvider = ({ children }: { children: ReactNode }) => {
  const [plants, setPlants] = useState<Plant[]>([]);

  const fetchAndSetPlants = () => {
    fetchPlants()
      .then((data) => {
        // Normalize API data to match Plant interface
        const normalized = data.map((p: any) => ({
          id: p.id,
          transaction_id: p.transaction_id,
          name: p.plant_name, // use plant_name as name
          description: p.description,
          location: p.location,
          status: p.status,
        }));
        setPlants(normalized);
      })
      .catch((err) => {
        setPlants([]);
      });
  };

  useEffect(() => {
    fetchAndSetPlants();
  }, []);

  // Add plant via API
  const addPlant = async (plant: Plant) => {
    await addPlantAPI({
      plant_name: plant.name,
      description: plant.description,
      location: plant.location,
      status: plant.status,
    });
    fetchAndSetPlants();
  };

  // Update plant via API
  const updatePlant = async (index: number, updated: Plant) => {
    const plant = plants[index];
    if (!plant || !plant.id) return;
    await updatePlantAPI(plant.id, {
      plant_name: updated.name,
      description: updated.description,
      location: updated.location,
      status: updated.status,
    });
    fetchAndSetPlants();
  };

  // Delete plant via API
  const deletePlant = async (index: number) => {
    const plant = plants[index];
    if (!plant || !plant.id) return;
    await deletePlantAPI(plant.id);
    fetchAndSetPlants();
  };

  return (
    <PlantContext.Provider
      value={{ plants, addPlant, updatePlant, deletePlant }}
    >
      {children}
    </PlantContext.Provider>
  );
};
