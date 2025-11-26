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

// No initialUsers: always fetch from backend

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [users, setUsers] = useState<UserWithLogs[]>([]);
  // Get current user from localStorage (set by AuthContext)
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    const stored = localStorage.getItem("authUser");
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }
  }, []);

  // Fetch users from backend
  const fetchUsers = async () => {
    // use centralized request helper so Authorization header and base URL are applied
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
        roles: "Role Master",
        plants: "Plant Master",
        vendors: "Vendor Master",
        applications: "Application Master",
        workflows: "Approval Workflow",
        audit: "Audit Review",
        reports: "Reports",
        plant_it_admin: "Plant IT Admin",
      };
      const actionReverse: Record<string, string> = {
        create: "Add",
        update: "Edit",
        read: "View",
        delete: "Delete",
      };
      // Start with global plant id->name map, overlay user's plants when provided
      const plantIdToName: Record<string, string> = { ...globalPlantIdToName };
      (userPlants || []).forEach((plant) => {
        if (typeof plant === "object" && plant !== null) {
          if (plant.id && plant.name)
            plantIdToName[String(plant.id)] = plant.name;
        } else if (typeof plant === "string") {
          // If plant is a string, assume name only (map name->name so lookups by name work)
          plantIdToName[plant] = plant;
        }
      });
      const permsObj: Record<string, string[]> = {};
      tokens.forEach((token) => {
        const parts = token.split(":");
        if (parts.length < 2) return;
        const action = actionReverse[parts[0]] || parts[0];
        const subject = parts[1];
        // Ignore malformed tokens like "create:" which have empty subject
        if (!subject || subject.trim() === "") return;
        const plantId = parts[2];
        const moduleName = subjectToModule[subject] || subject;
        let key = moduleName;
        if (plantId) {
          // Try to match plantId to plant name
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
        // If permissions is an array of tokens, convert to object
        permissions = tokensToObject(user.permissions, user.plants || []);
      } else if (
        typeof user.permissions === "object" &&
        user.permissions !== null
      ) {
        // If permissions is already an object, use as-is
        permissions = user.permissions;
      } else if (typeof user.permissions === "string") {
        // If permissions is a stringified array, parse and convert
        try {
          const arr = JSON.parse(user.permissions);
          if (Array.isArray(arr)) {
            permissions = tokensToObject(arr, user.plants || []);
          }
        } catch {}
      }
      // Normalize user's plants into an array of plant names so UI checkboxes match
      const normalizedPlants = (user.plants || []).map((p: any) => {
        if (typeof p === "object" && p !== null) {
          return p.name || p.plant_name || String(p.id || "");
        }
        // if it's a number-like id, resolve via global map
        if (typeof p === "number" || /^[0-9]+$/.test(String(p))) {
          return globalPlantIdToName[String(p)] || String(p);
        }
        // otherwise assume it's a name string
        return String(p);
      });

      return {
        id: user.id,
        fullName: user.full_name || user.employee_name || user.fullName || "",
        email: user.email,
        empCode: user.employee_code || user.empCode || "",
        department: user.department || "-", // Optionally map department_id to name
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

  // Add user via backend
  const addUser = async (user: UserForm) => {
    // Convert frontend permission object into an array of permission tokens
    // Example token: "create:roles:3" meaning create on roles for plant id 3
    const permissionTokens: string[] = [];
    // Map human-friendly module names to backend subjects
    const moduleToSubject: Record<string, string> = {
      "Role Master": "roles",
      "Plant Master": "plants",
      "Vendor Master": "vendors",
      "Application Master": "applications",
      "Approval Workflow": "workflows",
      "Audit Review": "audit",
      Reports: "reports",
      "Plant IT Admin": "plant_it_admin",
    };

    const actionMap: Record<string, string> = {
      Add: "create",
      Edit: "update",
      View: "read",
      Delete: "delete",
    };

    // Try to map plant names (used in AddUserPanel) to plant ids via API
    let plantsByName: Record<string, number> = {};
    try {
      const plantList: any[] = await request("/api/plants");
      (plantList || []).forEach((p) => {
        const name = p.name || p.plant_name || "";
        if (name) plantsByName[String(name)] = p.id;
      });
    } catch (e) {
      // If mapping fails, continue and emit tokens without numeric plant id
      console.warn("Failed to fetch plants for permission mapping:", e);
    }

    // helper: fuzzy resolve plant name -> id (handles minor name differences)
    const normalize = (s: string) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    const resolvePlantId = (plantName?: string) => {
      if (!plantName) return null;
      if (plantsByName[plantName]) return plantsByName[plantName];
      const target = normalize(plantName);
      for (const k of Object.keys(plantsByName)) {
        if (normalize(k) === target) return plantsByName[k];
      }
      for (const k of Object.keys(plantsByName)) {
        const nk = normalize(k);
        if (nk.includes(target) || target.includes(nk)) return plantsByName[k];
      }
      return null;
    };

    // Robustly handle empty, null, or unexpected permissions object
    if (user.permissions && typeof user.permissions === "object") {
      Object.keys(user.permissions).forEach((moduleKey) => {
        // moduleKey may be either "PlantName-Module Name" or just "Module Name"
        const split = moduleKey.split("-");
        let plantName: string | undefined;
        let moduleName: string;
        if (split.length > 1) {
          plantName = split[0];
          moduleName = split.slice(1).join("-");
        } else {
          plantName = undefined;
          moduleName = moduleKey;
        }
        const subject =
          moduleToSubject[moduleName] ||
          moduleName.toLowerCase().replace(/\s+/g, "_");
        const actions = Array.isArray(user.permissions[moduleKey])
          ? user.permissions[moduleKey]
          : [];
        actions.forEach((act) => {
          const mapped = actionMap[act] || act.toLowerCase();
          if (plantName) {
            const plantId = plantsByName[plantName];
            if (plantId) {
              permissionTokens.push(`${mapped}:${subject}:${plantId}`);
            } else {
              // fallback: include plant name so frontend can reconcile if needed
              permissionTokens.push(`${mapped}:${subject}:${plantName}`);
            }
          } else {
            // global permission (no plant)
            permissionTokens.push(`${mapped}:${subject}`);
          }
        });
      });
    }

    const payload: any = {
      username: user.email.split("@")[0],
      full_name: user.fullName,
      email: user.email,
      emp_code: user.empCode,
      department: user.department,
      password: "changeme123",
      status: user.status.toUpperCase(),
      plants: user.plants,
      // send transformed permission tokens to backend
      permissions: permissionTokens,
      central_permission: user.centralPermission,
      comment: user.comment,
      corporate_access_enabled: user.corporateAccessEnabled,
      location: user.location,
    };
    // TEMP LOG: inspect payload in browser console to debug mismatches
    try {
      // eslint-disable-next-line no-console
      console.log("[DEBUG][frontend] addUser payload:", payload);
    } catch (e) {}

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to add user");
    const created = await res.json();

    // If permissions present, convert to plant-permission rows and send to backend
    try {
      const createdId = created?.user?.id || created?.id;
      if (
        createdId &&
        user.permissions &&
        typeof user.permissions === "object"
      ) {
        const permissionRows: any[] = [];
        Object.keys(user.permissions).forEach((moduleKey) => {
          const split = moduleKey.split("-");
          let plantName: string | undefined;
          let moduleName: string;
          if (split.length > 1) {
            plantName = split[0];
            moduleName = split.slice(1).join("-");
          } else {
            plantName = undefined;
            moduleName = moduleKey;
          }
          const moduleId = moduleName
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "");
          const actions = Array.isArray(user.permissions[moduleKey])
            ? user.permissions[moduleKey]
            : [];
          // Map actions to booleans
          const can_add = actions.includes("Add");
          const can_edit = actions.includes("Edit");
          const can_view = actions.includes("View");
          const can_delete = actions.includes("Delete");
          // Resolve plant id via plantsByName map (with fuzzy fallback)
          const plantId = resolvePlantId(plantName);
          if (!plantId) {
            console.warn(
              "Skipping permission for unresolved plant:",
              plantName,
              moduleName
            );
            return; // skip global or unresolved plants
          }
          permissionRows.push({
            plant_id: plantId,
            module_id: moduleId,
            can_add,
            can_edit,
            can_view,
            can_delete,
          });
        });
        if (permissionRows.length > 0) {
          await fetch(`${API_URL}/${createdId}/plant-permissions`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ permissions: permissionRows }),
          });
        }
      }
    } catch (e) {
      console.warn("Failed to save plant permissions after create:", e);
    }

    await fetchUsers();
  };

  // Edit user via backend
  const editUser = async (userId: string, user: UserForm) => {
    // Transform permissions similar to addUser
    const permissionTokens: string[] = [];
    const moduleToSubject: Record<string, string> = {
      "Role Master": "roles",
      "Plant Master": "plants",
      "Vendor Master": "vendors",
      "Application Master": "applications",
      "Approval Workflow": "workflows",
      "Audit Review": "audit",
      Reports: "reports",
      "Plant IT Admin": "plant_it_admin",
    };
    const actionMap: Record<string, string> = {
      Add: "create",
      Edit: "update",
      View: "read",
      Delete: "delete",
    };

    let plantsByName: Record<string, number> = {};
    try {
      const plantList: any[] = await request("/api/plants");
      (plantList || []).forEach((p) => {
        const name = p.name || p.plant_name || "";
        if (name) plantsByName[String(name)] = p.id;
      });
    } catch (e) {
      console.warn("Failed to fetch plants for permission mapping:", e);
    }

    // helper: fuzzy resolve plant name -> id (handles minor name differences)
    const normalize = (s: string) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    const resolvePlantId = (plantName?: string) => {
      if (!plantName) return null;
      if (plantsByName[plantName]) return plantsByName[plantName];
      const target = normalize(plantName);
      for (const k of Object.keys(plantsByName)) {
        if (normalize(k) === target) return plantsByName[k];
      }
      for (const k of Object.keys(plantsByName)) {
        const nk = normalize(k);
        if (nk.includes(target) || target.includes(nk)) return plantsByName[k];
      }
      return null;
    };

    // Robustly handle empty, null, or unexpected permissions object
    if (user.permissions && typeof user.permissions === "object") {
      Object.keys(user.permissions).forEach((moduleKey) => {
        let plantName: string | undefined;
        let moduleName: string;
        const split = moduleKey.split("-");
        if (split.length > 1) {
          plantName = split[0];
          moduleName = split.slice(1).join("-");
        } else {
          plantName = undefined;
          moduleName = moduleKey;
        }
        const subject =
          moduleToSubject[moduleName] ||
          moduleName.toLowerCase().replace(/\s+/g, "_");
        const actions = Array.isArray(user.permissions[moduleKey])
          ? user.permissions[moduleKey]
          : [];
        actions.forEach((act) => {
          const mapped = actionMap[act] || act.toLowerCase();
          // Skip if subject empty for any reason
          if (!subject || String(subject).trim() === "") return;
          if (plantName) {
            const plantId = resolvePlantId(plantName);
            if (plantId) {
              permissionTokens.push(`${mapped}:${subject}:${plantId}`);
            } else {
              // fallback to plant name when id resolution fails
              permissionTokens.push(`${mapped}:${subject}:${plantName}`);
            }
          } else {
            permissionTokens.push(`${mapped}:${subject}`);
          }
        });
      });
    }

    const payload: any = {
      full_name: user.fullName,
      email: user.email,
      emp_code: user.empCode,
      department: user.department,
      status: user.status.toUpperCase(),
      plants: user.plants,
      permissions: permissionTokens,
      central_permission: user.centralPermission,
      comment: user.comment,
      corporate_access_enabled: user.corporateAccessEnabled,
      location: user.location,
    };
    // TEMP LOG: inspect payload in browser console to debug mismatches
    try {
      // eslint-disable-next-line no-console
      console.log("[DEBUG][frontend] editUser payload:", payload);
    } catch (e) {}

    const res = await fetch(`${API_URL}/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to edit user");
    // After updating user_master, also update user_plant_permission
    try {
      // Build permission rows similar to addUser
      const permissionRows: any[] = [];
      Object.keys(user.permissions || {}).forEach((moduleKey) => {
        const split = moduleKey.split("-");
        let plantName: string | undefined;
        let moduleName: string;
        if (split.length > 1) {
          plantName = split[0];
          moduleName = split.slice(1).join("-");
        } else {
          plantName = undefined;
          moduleName = moduleKey;
        }
        const moduleId = moduleName
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "");
        const actions = Array.isArray(user.permissions[moduleKey])
          ? user.permissions[moduleKey]
          : [];
        const can_add = actions.includes("Add");
        const can_edit = actions.includes("Edit");
        const can_view = actions.includes("View");
        const can_delete = actions.includes("Delete");
        const plantId = plantsByName[plantName || ""];
        if (!plantId) return; // skip unresolved or global
        permissionRows.push({
          plant_id: plantId,
          module_id: moduleId,
          can_add,
          can_edit,
          can_view,
          can_delete,
        });
      });
      if (permissionRows.length > 0) {
        await fetch(`${API_URL}/${userId}/plant-permissions`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: permissionRows }),
        });
      } else {
        // If no permissions provided, clear existing
        await fetch(`${API_URL}/${userId}/plant-permissions`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: [] }),
        });
      }
    } catch (e) {
      console.warn("Failed to save plant permissions after edit:", e);
    }

    await fetchUsers();
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
