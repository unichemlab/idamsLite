import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE, request } from "../utils/api";

// Backend API base URL
const API_URL = `${API_BASE}/api/users`;

export type UserForm = {
  fullName: string;
  email: string;
  empCode: string;
  department: string;
  location: string;
  status: string;
  plants: string[];
  permissions: {
    [key: string]: string[];
  };
  centralPermission: boolean;
  comment: string;
  corporateAccessEnabled: boolean;
};

export interface UserWithLogs extends UserForm {
  centralMaster: string[];
  activityLogs: any[];
}

interface UserContextType {
  users: UserWithLogs[];
  addUser: (user: UserForm) => Promise<void>;
  editUser: (userId: string, user: UserForm) => Promise<void>;
  deleteUser: (idx: number) => void;
  currentUser?: any;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// ========================================
// HELPER CONSTANTS AND FUNCTIONS
// ========================================

const VALID_MODULES = [
  "Application Master",
  "Approval Workflow",
  "Admin Approval",
  "Dashboard",
  "Department Master",
  "Plant Master",
  "Role Master",
  "Reviewer",
  "Reports",
  "Server Inventory",
  "System Inventory",
  "Task Clouser Bin",
  "Vendor Information",
];

const MODULE_TO_ID: Record<string, string> = {
  "Application Master": "application_master",
  "Approval Workflow": "approval_workflow",
  "Admin Approval": "admin_approval",
  "Dashboard": "dashboard",
  "Department Master": "department_master",
  "Plant Master": "plant_master",
  "Role Master": "role_master",
  "Reviewer": "reviewer",
  "Reports": "reports",
  "Server Inventory": "server_inventory",
  "System Inventory": "system_inventory",
  "Task Clouser Bin": "task_clouser_bin",
  "Vendor Information": "vendor_information",
};

// Smart parser that knows about valid module names
const parsePermissionKey = (key: string): { 
  plantName?: string; 
  moduleName: string; 
  moduleId: string 
} => {
  // Try to find a valid module name that this key ends with
  for (const validModule of VALID_MODULES) {
    if (key.endsWith(validModule)) {
      // Check if there's a plant prefix
      const plantPart = key.substring(0, key.length - validModule.length);
      
      if (plantPart === "") {
        // No plant, just module
        return {
          plantName: undefined,
          moduleName: validModule,
          moduleId: MODULE_TO_ID[validModule] || validModule.toLowerCase().replace(/\s+/g, "_")
        };
      } else if (plantPart.endsWith("-")) {
        // Has plant prefix
        const plantName = plantPart.slice(0, -1); // Remove trailing dash
        return {
          plantName: plantName,
          moduleName: validModule,
          moduleId: MODULE_TO_ID[validModule] || validModule.toLowerCase().replace(/\s+/g, "_")
        };
      }
    }
  }
  
  // Fallback: couldn't match a known module
  console.warn(`[PARSE] Could not parse key: "${key}"`);
  return {
    plantName: undefined,
    moduleName: key,
    moduleId: key.toLowerCase().replace(/\s+/g, "_")
  };
};

// ========================================
// PROVIDER COMPONENT
// ========================================

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [users, setUsers] = useState<UserWithLogs[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  useEffect(() => {
    const stored = localStorage.getItem("authUser");
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }
  }, []);

  // Fetch users from backend
  const fetchUsers = async () => {
    const data: any = await request("/api/users");

    // Fetch global plant list to resolve plant IDs -> names when mapping permissions
    let globalPlantIdToName: Record<string, string> = {};
    try {
      const plantList: any[] = await request("/api/plants");
      (plantList || []).forEach((p) => {
        const id = p.id !== undefined && p.id !== null ? String(p.id) : null;
        const name = p.name || p.plant_name || "";
        if (id && name) globalPlantIdToName[id] = name;
      });
    } catch (e) {
      console.warn("Failed to fetch global plants for permission mapping:", e);
    }

    // Helper: convert tokens to object shape, matching plant IDs to plant names
    const tokensToObject = (tokens: string[], userPlants?: any[]) => {
      const subjectToModule: Record<string, string> = {
        "roles": "Role Master",
        "plants": "Plant Master",
        "vendors": "Vendor Master",
        "applications": "Application Master",
        "workflows": "Approval Workflow",
        "audit": "Audit Review",
        "reports": "Reports",
        "plant_it_admin": "Plant IT Admin",
        "role_master": "Role Master",
        "plant_master": "Plant Master",
        "vendor_master": "Vendor Master",
        "application_master": "Application Master",
        "approval_workflow": "Approval Workflow",
        "audit_review": "Audit Review",
        "admin_approval": "Admin Approval",
        "dashboard": "Dashboard",
        "department_master": "Department Master",
        "reviewer": "Reviewer",
        "server_inventory": "Server Inventory",
        "system_inventory": "System Inventory",
        "task_clouser_bin": "Task Clouser Bin",
        "task_closure_bin": "Task Closure Bin",
        "vendor_information": "Vendor Information",
      };
      
      const actionReverse: Record<string, string> = {
        create: "Add",
        update: "Edit",
        read: "View",
        delete: "Delete",
      };
      
      const plantIdToName: Record<string, string> = { ...globalPlantIdToName };
      (userPlants || []).forEach((plant) => {
        if (typeof plant === "object" && plant !== null) {
          if (plant.id && plant.name)
            plantIdToName[String(plant.id)] = plant.name;
        } else if (typeof plant === "string") {
          plantIdToName[plant] = plant;
        }
      });
      
      const permsObj: Record<string, string[]> = {};
      tokens.forEach((token) => {
        const parts = token.split(":");
        if (parts.length < 2) return;
        const action = actionReverse[parts[0]] || parts[0];
        const subject = parts[1];
        if (!subject || subject.trim() === "") return;
        const plantId = parts[2];
        const moduleName = subjectToModule[subject] || subject;
        let key = moduleName;
        if (plantId) {
          const plantName = plantIdToName[plantId] || plantId;
          key = `${plantName}-${moduleName}`;
        }
        if (!permsObj[key]) permsObj[key] = [];
        permsObj[key].push(action);
      });
      return permsObj;
    };

    // Map backend fields to frontend camelCase fields
    const mapUser = (user: any) => {
      let permissions: Record<string, string[]> = {};
      if (Array.isArray(user.permissions)) {
        permissions = tokensToObject(user.permissions, user.plants || []);
      } else if (
        typeof user.permissions === "object" &&
        user.permissions !== null
      ) {
        permissions = user.permissions;
      } else if (typeof user.permissions === "string") {
        try {
          const arr = JSON.parse(user.permissions);
          if (Array.isArray(arr)) {
            permissions = tokensToObject(arr, user.plants || []);
          }
        } catch {}
      }
      
      const normalizedPlants = (user.plants || []).map((p: any) => {
        if (typeof p === "object" && p !== null) {
          return p.name || p.plant_name || String(p.id || "");
        }
        if (typeof p === "number" || /^[0-9]+$/.test(String(p))) {
          return globalPlantIdToName[String(p)] || String(p);
        }
        return String(p);
      });

      return {
        id: user.id,
        fullName: user.full_name || user.employee_name || user.fullName || "",
        email: user.email,
        empCode: user.employee_code || user.empCode || "",
        department: user.department || "-",
        department_id: user.department_id,
        status: user.status,
        plants: normalizedPlants || [],
        centralMaster: user.centralMaster || [],
        permissions,
        centralPermission: user.central_permission || false,
        comment: user.comment || "",
        corporateAccessEnabled: user.corporate_access_enabled || false,
        activityLogs: user.activityLogs || [],
        employee_name: user.employee_name,
        employee_code: user.employee_code,
        employee_id: user.employee_id,
        location: user.location,
        designation: user.designation,
        company: user.company,
        mobile: user.mobile,
        role_id: user.role_id,
        created_on: user.created_on,
        updated_on: user.updated_on,
      };
    };
    
    setUsers(Array.isArray(data.users) ? data.users.map(mapUser) : []);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ========================================
  // ADD USER
  // ========================================
  const addUser = async (user: UserForm) => {
    console.group("🔵 [ADD USER] Starting");
    console.log("User:", user.fullName, user.email);
    console.log("Plants:", user.plants);
    console.log("Permissions keys:", Object.keys(user.permissions || {}));
    console.groupEnd();

    // Fetch plant mapping first
    let plantsByName: Record<string, number> = {};
    try {
      const plantList: any[] = await request("/api/plants");
      (plantList || []).forEach((p) => {
        const name = p.name || p.plant_name || "";
        if (name) plantsByName[String(name)] = p.id;
      });
      console.log("📋 [ADD USER] Plant mapping loaded:", Object.keys(plantsByName));
    } catch (e) {
      console.error("❌ [ADD USER] Failed to fetch plants:", e);
    }

    // Helper to resolve plant name to ID with fuzzy matching
    const resolvePlantId = (plantName?: string): number | null => {
      if (!plantName) return null;
      
      // Direct exact match
      if (plantsByName[plantName]) {
        return plantsByName[plantName];
      }
      
      // Case-insensitive match
      const lowerPlantName = plantName.toLowerCase().trim();
      for (const [name, id] of Object.entries(plantsByName)) {
        if (name.toLowerCase().trim() === lowerPlantName) {
          return id;
        }
      }
      
      // Partial match
      for (const [name, id] of Object.entries(plantsByName)) {
        if (name.includes(plantName) || plantName.includes(name)) {
          console.warn(`⚠️ [ADD USER] Fuzzy matched "${plantName}" to "${name}"`);
          return id;
        }
      }
      
      console.error(`❌ [ADD USER] Could not resolve plant: "${plantName}"`);
      console.log("Available plants:", Object.keys(plantsByName));
      return null;
    };

    // Create user in user_master (don't send complex permission tokens)
    const payload: any = {
      username: user.email.split("@")[0],
      full_name: user.fullName,
      email: user.email,
      emp_code: user.empCode,
      department: user.department,
      password: "changeme123",
      status: user.status.toUpperCase(),
      plants: user.plants,
      permissions: [], // Empty - we'll save to user_plant_permission instead
      central_permission: user.centralPermission,
      comment: user.comment,
      corporate_access_enabled: user.corporateAccessEnabled,
      location: user.location,
    };

    console.log("📤 [ADD USER] Sending user payload...");

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
      },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const error = await res.text();
      console.error("❌ [ADD USER] Failed:", error);
      throw new Error("Failed to add user");
    }
    
    const created = await res.json();
    const createdId = created?.user?.id || created?.id;
    console.log("✅ [ADD USER] User created with ID:", createdId);

    // Now save plant permissions to user_plant_permission table
    try {
      if (!createdId) {
        throw new Error("No user ID returned from server");
      }

      if (user.permissions && typeof user.permissions === "object") {
        const permissionRows: any[] = [];
        
        console.group("🔧 [ADD USER] Building permission rows");
        
        Object.keys(user.permissions).forEach((key) => {
          const parsed = parsePermissionKey(key);
          
          console.log(`  Key: "${key}"`);
          console.log(`    → Plant: "${parsed.plantName}", Module: "${parsed.moduleName}", ID: "${parsed.moduleId}"`);
          
          if (!parsed.plantName) {
            console.log("    ⏭️ Skipping (no plant)");
            return;
          }
          
          const actions = Array.isArray(user.permissions[key]) ? user.permissions[key] : [];
          
          if (actions.length === 0) {
            console.log("    ⏭️ Skipping (no actions)");
            return;
          }
          
          const plantId = resolvePlantId(parsed.plantName);
          
          if (!plantId) {
            console.error(`    ❌ Failed to resolve plant ID`);
            return;
          }
          
          const row = {
            plant_id: plantId,
            module_id: parsed.moduleId,
            can_add: actions.includes("Add"),
            can_edit: actions.includes("Edit"),
            can_view: actions.includes("View"),
            can_delete: actions.includes("Delete"),
          };
          
          console.log(`    ✅ Row: Plant ${plantId}, Module ${parsed.moduleId}, Actions: ${actions.join(", ")}`);
          permissionRows.push(row);
        });
        
        console.log(`📊 Total permission rows: ${permissionRows.length}`);
        console.groupEnd();
        
        if (permissionRows.length > 0) {
          console.log("📤 [ADD USER] Saving plant permissions...");
          
          const permRes = await fetch(`${API_URL}/${createdId}/plant-permissions`, {
            method: "PUT",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: JSON.stringify({ permissions: permissionRows }),
          });
          
          if (!permRes.ok) {
            const errorData = await permRes.json().catch(() => ({ error: "Unknown error" }));
            console.error("❌ [ADD USER] Permission save failed:", errorData);
            throw new Error(errorData.error || "Failed to save plant permissions");
          }
          
          const result = await permRes.json();
          console.log("✅ [ADD USER] Permissions saved successfully:", result);
        } else {
          console.warn("⚠️ [ADD USER] No permission rows to save");
        }
      }
    } catch (e: any) {
      console.error("❌ [ADD USER] Permission error:", e);
      alert(`User created but permissions may not have saved: ${e.message}\n\nPlease check console for details.`);
    }

    await fetchUsers();
    console.log("✅ [ADD USER] Complete");
  };

  // ========================================
  // EDIT USER
  // ========================================
  const editUser = async (userId: string, user: UserForm) => {
    console.group("🔵 [EDIT USER] Starting");
    console.log("User ID:", userId);
    console.log("User:", user.fullName, user.email);
    console.log("Plants:", user.plants);
    console.log("Permissions keys:", Object.keys(user.permissions || {}));
    console.groupEnd();

    // Fetch plant mapping
    let plantsByName: Record<string, number> = {};
    try {
      const plantList: any[] = await request("/api/plants");
      (plantList || []).forEach((p) => {
        const name = p.name || p.plant_name || "";
        if (name) plantsByName[String(name)] = p.id;
      });
      console.log("📋 [EDIT USER] Plant mapping loaded:", Object.keys(plantsByName));
    } catch (e) {
      console.error("❌ [EDIT USER] Failed to fetch plants:", e);
    }

    const resolvePlantId = (plantName?: string): number | null => {
      if (!plantName) return null;
      if (plantsByName[plantName]) return plantsByName[plantName];
      
      const lowerPlantName = plantName.toLowerCase().trim();
      for (const [name, id] of Object.entries(plantsByName)) {
        if (name.toLowerCase().trim() === lowerPlantName) {
          return id;
        }
      }
      
      for (const [name, id] of Object.entries(plantsByName)) {
        if (name.includes(plantName) || plantName.includes(name)) {
          console.warn(`⚠️ [EDIT USER] Fuzzy matched "${plantName}" to "${name}"`);
          return id;
        }
      }
      
      console.error(`❌ [EDIT USER] Could not resolve plant: "${plantName}"`);
      return null;
    };

    // Update user in user_master
    const payload: any = {
      full_name: user.fullName,
      email: user.email,
      emp_code: user.empCode,
      department: user.department,
      status: user.status.toUpperCase(),
      plants: user.plants,
      permissions: [], // Empty - we'll save to user_plant_permission instead
      central_permission: user.centralPermission,
      comment: user.comment,
      corporate_access_enabled: user.corporateAccessEnabled,
      location: user.location,
    };

    console.log("📤 [EDIT USER] Updating user...");

    const res = await fetch(`${API_URL}/${userId}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
      },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const error = await res.text();
      console.error("❌ [EDIT USER] Failed:", error);
      throw new Error("Failed to edit user");
    }

    console.log("✅ [EDIT USER] User updated");

    // Save plant permissions
    try {
      const permissionRows: any[] = [];
      
      console.group("🔧 [EDIT USER] Building permission rows");
      
      Object.keys(user.permissions || {}).forEach((key) => {
        const parsed = parsePermissionKey(key);
        
        console.log(`  Key: "${key}"`);
        console.log(`    → Plant: "${parsed.plantName}", Module: "${parsed.moduleName}", ID: "${parsed.moduleId}"`);
        
        if (!parsed.plantName) {
          console.log("    ⏭️ Skipping (no plant)");
          return;
        }
        
        const actions = Array.isArray(user.permissions[key]) ? user.permissions[key] : [];
        
        if (actions.length === 0) {
          console.log("    ⏭️ Skipping (no actions)");
          return;
        }
        
        const plantId = resolvePlantId(parsed.plantName);
        
        if (!plantId) {
          console.error(`    ❌ Failed to resolve plant ID`);
          return;
        }
        
        const row = {
          plant_id: plantId,
          module_id: parsed.moduleId,
          can_add: actions.includes("Add"),
          can_edit: actions.includes("Edit"),
          can_view: actions.includes("View"),
          can_delete: actions.includes("Delete"),
        };
        
        console.log(`    ✅ Row: Plant ${plantId}, Module ${parsed.moduleId}, Actions: ${actions.join(", ")}`);
        permissionRows.push(row);
      });
      
      console.log(`📊 Total permission rows: ${permissionRows.length}`);
      console.groupEnd();
      
      console.log("📤 [EDIT USER] Saving plant permissions...");
      
      const permRes = await fetch(`${API_URL}/${userId}/plant-permissions`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: JSON.stringify({ permissions: permissionRows }),
      });
      
      if (!permRes.ok) {
        const errorData = await permRes.json().catch(() => ({ error: "Unknown error" }));
        console.error("❌ [EDIT USER] Permission save failed:", errorData);
        throw new Error(errorData.error || "Failed to save plant permissions");
      }
      
      const result = await permRes.json();
      console.log("✅ [EDIT USER] Permissions saved successfully:", result);
    } catch (e: any) {
      console.error("❌ [EDIT USER] Permission error:", e);
      alert(`User updated but permissions may not have saved: ${e.message}\n\nPlease check console for details.`);
    }

    await fetchUsers();
    console.log("✅ [EDIT USER] Complete");
  };

  const deleteUser = (idx: number) => {
    setUsers((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <UserContext.Provider
      value={{ users, addUser, editUser, deleteUser, currentUser }}
    >
      {children}
    </UserContext.Provider>
  );
};

export function useUserContext() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUserContext must be used within UserProvider");
  return ctx;
}