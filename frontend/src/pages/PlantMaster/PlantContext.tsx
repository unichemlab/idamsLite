import React, { createContext, useState, useEffect, ReactNode } from "react";
import { fetchPlants } from "../../utils/api";

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

  useEffect(() => {
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
        // Optionally handle error
        setPlants([]);
      });
  }, []);

  // Keep add/update/delete for local changes (not persisted)
  const addPlant = (plant: Plant) => setPlants((prev) => [...prev, plant]);
  const updatePlant = (index: number, updated: Plant) =>
    setPlants((prev) => prev.map((p, i) => (i === index ? updated : p)));
  const deletePlant = (index: number) =>
    setPlants((prev) => prev.filter((_, i) => i !== index));

  return (
    <PlantContext.Provider
      value={{ plants, addPlant, updatePlant, deletePlant }}
    >
      {children}
    </PlantContext.Provider>
  );
};
