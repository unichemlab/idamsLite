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
    corporatePermissions: {
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

const UserMasterContext = createContext<UserContextType | undefined>(undefined);

// ========================================
// HELPER CONSTANTS AND FUNCTIONS
// ========================================

const PLANT_WISE_MODULES = [
    "Application Master",
    "System Master",
    "Server Management",
];

const CORPORATE_MODULES = [
    "Approval Workflow",
    "Admin Approval",
    "Dashboard",
    "Department Master",
    "Network Master",
    "Plant Master",
    "Role Master",
    "Reviewer",
    "Reports",
    "Task Clouser Bin",
    "Vendor Information",
];

const MODULE_TO_ID: Record<string, string> = {
    "Application Master": "application_master",
    "System Master": "system_master",
    "Server Management": "server_management",
    "Approval Workflow": "approval_workflow",
    "Admin Approval": "admin_approval",
    "Dashboard": "dashboard",
    "Department Master": "department_master",
    "Network Master": "network_master",
    "Plant Master": "plant_master",
    "Role Master": "role_master",
    "Reviewer": "reviewer",
    "Reports": "reports",
    "Task Clouser Bin": "task_clouser_bin",
    "Vendor Information": "vendor_information",
    "Access Log": "access_log",
    "Active User Log": "active_user_log",
};

const toSnakeCase = (str: string) => {
    return MODULE_TO_ID[str] || str.replace(/\s+/g, "_").toLowerCase();
};

// ========================================
// PROVIDER COMPONENT
// ========================================

export const UserMasterProvider: React.FC<{ children: React.ReactNode }> = ({
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

        // Fetch global plant list
        let globalPlantIdToName: Record<string, string> = {};
        try {
            const plantList: any[] = await request("/api/plants");
            (plantList || []).forEach((p) => {
                const id = p.id !== undefined && p.id !== null ? String(p.id) : null;
                const name = p.name || p.plant_name || "";
                if (id && name) globalPlantIdToName[id] = name;
            });
        } catch (e) {
            console.warn("Failed to fetch global plants:", e);
        }

        const mapUser = (user: any) => {
            let permissions: Record<string, string[]> = {};
            let corporatePermissions: Record<string, string[]> = {};

            // You can add logic here to parse existing permissions if needed

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
                corporatePermissions,
                centralPermission: user.central_permission || false,
                comment: user.comment || "",
                corporateAccessEnabled: user.corporate_access_enabled || false,
                activityLogs: user.activityLogs || [],
                location: user.location,
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
        console.log("Plant-wise permissions:", Object.keys(user.permissions || {}).length);
        console.log("Corporate permissions:", Object.keys(user.corporatePermissions || {}).length);
        console.groupEnd();

        // Fetch plant mapping
        let plantsByName: Record<string, number> = {};
        try {
            const plantList: any[] = await request("/api/plants");
            (plantList || []).forEach((p) => {
                const name = p.name || p.plant_name || "";
                if (name) plantsByName[String(name)] = p.id;
            });
            console.log("📋 [ADD USER] Plant mapping loaded:", Object.keys(plantsByName).length, "plants");
        } catch (e) {
            console.error("❌ [ADD USER] Failed to fetch plants:", e);
        }

        const resolvePlantId = (plantName: string): number | null => {
            if (plantsByName[plantName]) return plantsByName[plantName];

            const lowerPlantName = plantName.toLowerCase().trim();
            for (const [name, id] of Object.entries(plantsByName)) {
                if (name.toLowerCase().trim() === lowerPlantName) {
                    return id;
                }
            }

            console.error(`❌ [ADD USER] Could not resolve plant: "${plantName}"`);
            return null;
        };

        // Create user in user_master
        const payload: any = {
            username: user.email.split("@")[0],
            full_name: user.fullName,
            email: user.email,
            emp_code: user.empCode,
            department: user.department,
            password: "changeme123",
            status: user.status.toUpperCase(),
            plants: user.plants,
            permissions: [],
            central_permission: user.centralPermission,
            comment: user.comment,
            corporate_access_enabled: user.corporateAccessEnabled,
            location: user.location,
        };

        console.log("📤 [ADD USER] Creating user...");

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

        // Save permissions to user_plant_permission table
        try {
            if (!createdId) {
                throw new Error("No user ID returned from server");
            }

            const permissionRows: any[] = [];

            console.group("🔧 [ADD USER] Building permission rows");

            // 1️⃣ PLANT-WISE PERMISSIONS (plant_id NOT NULL)
            console.log("📍 Processing plant-wise permissions...");
            Object.entries(user.permissions || {}).forEach(([key, actions]) => {
                if (!key.includes('-')) {
                    console.log(`  ⏭️ Skipping "${key}" (no plant delimiter)`);
                    return;
                }

                const [plantName, moduleName] = key.split('-');
                const moduleId = toSnakeCase(moduleName);

                if (!Array.isArray(actions) || actions.length === 0) {
                    console.log(`  ⏭️ Skipping "${key}" (no actions)`);
                    return;
                }

                const plantId = resolvePlantId(plantName);
                if (!plantId) {
                    console.error(`  ❌ Failed to resolve plant: "${plantName}"`);
                    return;
                }

                const row = {
                    plant_id: plantId,
                    module_id: moduleId,
                    can_add: actions.includes("Add"),
                    can_edit: actions.includes("Edit"),
                    can_view: actions.includes("View"),
                    can_delete: actions.includes("Delete"),
                };

                console.log(`  ✅ Plant: ${plantName} (${plantId}) - ${moduleId} [${actions.join(", ")}]`);
                permissionRows.push(row);
            });

            // 2️⃣ CORPORATE PERMISSIONS (plant_id NULL)
            console.log("🏢 Processing corporate permissions...");
            Object.entries(user.corporatePermissions || {}).forEach(([moduleName, actions]) => {
                if (!Array.isArray(actions) || actions.length === 0) {
                    console.log(`  ⏭️ Skipping "${moduleName}" (no actions)`);
                    return;
                }

                const moduleId = toSnakeCase(moduleName);

                const row = {
                    plant_id: null,  // ✅ NULL for corporate permissions
                    module_id: moduleId,
                    can_add: actions.includes("Add"),
                    can_edit: actions.includes("Edit"),
                    can_view: actions.includes("View"),
                    can_delete: actions.includes("Delete"),
                };

                console.log(`  ✅ Corporate: ${moduleId} [${actions.join(", ")}]`);
                permissionRows.push(row);
            });

            console.log(`📊 Total permission rows: ${permissionRows.length}`);
            console.groupEnd();

            if (permissionRows.length > 0) {
                console.log("📤 [ADD USER] Saving permissions...");

                // ✅ SEND AS SINGLE ARRAY (NOT SPLIT)
                const permRes = await fetch(`${API_URL}/${createdId}/plant-permissions`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
                    },
                    body: JSON.stringify({
                        permissions: permissionRows  // ✅ Send all rows together
                    }),
                });

                if (!permRes.ok) {
                    const errorData = await permRes.json().catch(() => ({ error: "Unknown error" }));
                    console.error("❌ [ADD USER] Permission save failed:", errorData);
                    throw new Error(errorData.error || "Failed to save permissions");
                }

                const result = await permRes.json();
                console.log("✅ [ADD USER] Permissions saved:", result);
            } else {
                console.warn("⚠️ [ADD USER] No permissions to save");
            }
        } catch (e: any) {
            console.error("❌ [ADD USER] Permission error:", e);
            alert(`User created but permissions may not have saved: ${e.message}`);
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
        console.log("Plant-wise permissions:", Object.keys(user.permissions || {}).length);
        console.log("Corporate permissions:", Object.keys(user.corporatePermissions || {}).length);
        console.groupEnd();

        // Fetch plant mapping
        let plantsByName: Record<string, number> = {};
        try {
            const plantList: any[] = await request("/api/plants");
            (plantList || []).forEach((p) => {
                const name = p.name || p.plant_name || "";
                if (name) plantsByName[String(name)] = p.id;
            });
            console.log("📋 [EDIT USER] Plant mapping loaded:", Object.keys(plantsByName).length, "plants");
        } catch (e) {
            console.error("❌ [EDIT USER] Failed to fetch plants:", e);
        }

        const resolvePlantId = (plantName: string): number | null => {
            if (plantsByName[plantName]) return plantsByName[plantName];

            const lowerPlantName = plantName.toLowerCase().trim();
            for (const [name, id] of Object.entries(plantsByName)) {
                if (name.toLowerCase().trim() === lowerPlantName) {
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
            permissions: [],
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

        // Save permissions
        try {
            const permissionRows: any[] = [];

            console.group("🔧 [EDIT USER] Building permission rows");

            // 1️⃣ PLANT-WISE PERMISSIONS
            console.log("📍 Processing plant-wise permissions...");
            Object.entries(user.permissions || {}).forEach(([key, actions]) => {
                if (!key.includes('-')) {
                    console.log(`  ⏭️ Skipping "${key}" (no plant delimiter)`);
                    return;
                }

                const [plantName, moduleName] = key.split('-');
                const moduleId = toSnakeCase(moduleName);

                if (!Array.isArray(actions) || actions.length === 0) {
                    console.log(`  ⏭️ Skipping "${key}" (no actions)`);
                    return;
                }

                const plantId = resolvePlantId(plantName);
                if (!plantId) {
                    console.error(`  ❌ Failed to resolve plant: "${plantName}"`);
                    return;
                }

                const row = {
                    plant_id: plantId,
                    module_id: moduleId,
                    can_add: actions.includes("Add"),
                    can_edit: actions.includes("Edit"),
                    can_view: actions.includes("View"),
                    can_delete: actions.includes("Delete"),
                };

                console.log(`  ✅ Plant: ${plantName} (${plantId}) - ${moduleId} [${actions.join(", ")}]`);
                permissionRows.push(row);
            });

            // 2️⃣ CORPORATE PERMISSIONS
            console.log("🏢 Processing corporate permissions...");
            Object.entries(user.corporatePermissions || {}).forEach(([moduleName, actions]) => {
                if (!Array.isArray(actions) || actions.length === 0) {
                    console.log(`  ⏭️ Skipping "${moduleName}" (no actions)`);
                    return;
                }

                const moduleId = toSnakeCase(moduleName);

                const row = {
                    plant_id: null,  // ✅ NULL for corporate permissions
                    module_id: moduleId,
                    can_add: actions.includes("Add"),
                    can_edit: actions.includes("Edit"),
                    can_view: actions.includes("View"),
                    can_delete: actions.includes("Delete"),
                };

                console.log(`  ✅ Corporate: ${moduleId} [${actions.join(", ")}]`);
                permissionRows.push(row);
            });

            console.log(`📊 Total permission rows: ${permissionRows.length}`);
            console.groupEnd();

            console.log("📤 [EDIT USER] Saving permissions...");

            // ✅ SEND AS SINGLE ARRAY (NOT SPLIT)
            const permRes = await fetch(`${API_URL}/${userId}/plant-permissions`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
                },
                body: JSON.stringify({
                    permissions: permissionRows  // ✅ Send all rows together
                }),
            });

            if (!permRes.ok) {
                const errorData = await permRes.json().catch(() => ({ error: "Unknown error" }));
                console.error("❌ [EDIT USER] Permission save failed:", errorData);
                throw new Error(errorData.error || "Failed to save permissions");
            }

            const result = await permRes.json();
            console.log("✅ [EDIT USER] Permissions saved:", result);
        } catch (e: any) {
            console.error("❌ [EDIT USER] Permission error:", e);
            alert(`User updated but permissions may not have saved: ${e.message}`);
        }

        await fetchUsers();
        console.log("✅ [EDIT USER] Complete");
    };

    const deleteUser = (idx: number) => {
        setUsers((prev) => prev.filter((_, i) => i !== idx));
    };

    return (
        <UserMasterContext.Provider
            value={{ users, addUser, editUser, deleteUser, currentUser }}
        >
            {children}
        </UserMasterContext.Provider>
    );
};

export function useUserContext() {
    const ctx = useContext(UserMasterContext);
    if (!ctx) throw new Error("useUserContext must be used within UserProvider");
    return ctx;
}