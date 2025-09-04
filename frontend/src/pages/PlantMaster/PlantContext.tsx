
import React, { createContext, useState, ReactNode } from "react";

export const usePlantContext = () => {
  const ctx = React.useContext(PlantContext);
  if (!ctx) throw new Error("usePlantContext must be used within PlantProvider");
  return ctx;
};

export interface Plant {
  name: string;
  description: string;
  location: string;
  status: "ACTIVE" | "INACTIVE";
}

interface PlantContextType {
  plants: Plant[];
  addPlant: (plant: Plant) => void;
  updatePlant: (index: number, updated: Plant) => void;
  deletePlant: (index: number) => void;
}

const defaultPlants: Plant[] = [
  {
    name: "Mumbai Plant",
    description: "Manufacturing facility in Mumbai",
    location: "Maharashtra, India",
    status: "ACTIVE",
  },
  {
    name: "Goa Plant",
    description: "Oral solid dosage facility in Goa",
    location: "Goa, India",
    status: "ACTIVE",
  },
  {
    name: "Chennai Plant",
    description: "API manufacturing facility",
    location: "Tamil Nadu, India",
    status: "ACTIVE",
  },
  {
    name: "Pune Plant",
    description: "R&D and formulation center",
    location: "Maharashtra, India",
    status: "ACTIVE",
  },
];

export const PlantContext = createContext<PlantContextType | undefined>(undefined);

export const PlantProvider = ({ children }: { children: ReactNode }) => {
  const [plants, setPlants] = useState<Plant[]>(defaultPlants);

  const addPlant = (plant: Plant) => setPlants((prev) => [...prev, plant]);

  const updatePlant = (index: number, updated: Plant) =>
    setPlants((prev) => prev.map((p, i) => (i === index ? updated : p)));

  const deletePlant = (index: number) =>
    setPlants((prev) => prev.filter((_, i) => i !== index));

  return (
    <PlantContext.Provider value={{ plants, addPlant, updatePlant, deletePlant }}>
      {children}
    </PlantContext.Provider>
  );
};
