import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { fetchPermissionsAPI, loginAPI, API_BASE,fetchCorporateWorkflows } from "../utils/api";
import AbilityProvider from "./AbilityContext";

// Interface for workflow data
interface PlantPermission {
  moduleId: string;
  plantId: number;
  actions: {
    create: boolean;
    update: boolean;
    read: boolean;
    delete: boolean;
  };
}

interface Workflow {
  id?: number;
  workflow_id?: number;
  _id?: number;
  plant_id: number;
  approver_1_id: string | null;
  approver_2_id: string | null;
  approver_3_id: string | null;
  approver_4_id: string | null;
  approver_5_id: string | null;
  approvers?: any[][];
}

// Interface for approver detection result
interface ApproverDetectionResult {
  isApprover: boolean;
  isApprover1: boolean;
  isWorkflowApprover: boolean;
   isCorporateApprover?:boolean;
  approverPlants?: number[];
}

export interface AuthUser {
  id: number;
  username: string;
  employee_code: string;
  location: string;
  department: string;
  designation: string;
  reporting_manager: string;
  managers_manager: string;
  name: string;
  email: string;
  role_id: number | number[];
  status: string;
  token: string;
  isApprover?: boolean;
  isApprover1?: boolean;
  isWorkflowApprover?: boolean;
  isCorporateApprover?:boolean;
  isITBin?: boolean;
  isSuperAdmin?: boolean;
  roleName?: string;
  permissions?: string[];
  approverPlants?: number[];
  approverTypes?: string[];
  itPlants?: any[];
  itPlantIds?: number[];
  plantPermissions?: PlantPermission[];
  permittedPlantIds?: number[];
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  permissions: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  const determineInitialRoute = (userData: AuthUser) => {
    const isApprover =
      userData.permissions?.includes("approve:requests") ||
      userData.role_id === 4 ||
      (Array.isArray(userData.role_id) && userData.role_id.includes(4));

    if (Array.isArray(userData.role_id) && userData.role_id.includes(1)) {
      return "/home";
    } else if (isApprover) {
      return "/approver";
    } else if (
      Array.isArray(userData.role_id) &&
      userData.role_id.includes(2)
    ) {
      return "/plantadmin";
    } else {
      return "/user";
    }
  };

  const normalizePermissions = (permissions: any): string[] => {
    if (Array.isArray(permissions)) return permissions;
    if (permissions && typeof permissions === "object") {
      return Object.values(permissions);
    }
    return [];
  };

  /**
   * Fetches plant-wise user permissions from the User Permissions API.
   */
  const fetchPermissions = useCallback(async (): Promise<{
    permissions: string[];
    plantPermissions: PlantPermission[];
    permittedPlantIds: number[];
  }> => {
    try {
      const data: any = await fetchPermissionsAPI();
      console.log("Fetched permissions:", data);

      const normalized = normalizePermissions(data?.permissions);
      const plantPerms = data?.plantPermissions || [];
      const plantIds = data?.permittedPlantIds || [];

      setPermissions(normalized);

      return {
        permissions: normalized,
        plantPermissions: plantPerms,
        permittedPlantIds: plantIds,
      };
    } catch (err) {
      console.error("fetchPermissions error", err);
      setPermissions([]);
      return {
        permissions: [],
        plantPermissions: [],
        permittedPlantIds: [],
      };
    }
  }, []);

  /**
   * Check if user is Approver 1 (from user_requests and task_requests tables)
   */
  const checkApprover1Status = useCallback(
    async (userEmail: string, token?: string): Promise<boolean> => {
      const authToken = token || localStorage.getItem("token");
      const headers: HeadersInit = authToken ? { Authorization: `Bearer ${authToken}` } : {};

      console.log("=== Checking Approver 1 Status ===");
      console.log("Email:", userEmail);

      try {
        const userReqRes = await fetch(
          `${API_BASE}/api/user-requests/approvers?email=${encodeURIComponent(userEmail)}`,
          { method: "GET", headers }
        );

        if (userReqRes.ok) {
          const userReqData = await userReqRes.json();
          const foundInUserReq = Array.isArray(userReqData) && userReqData.length > 0;

          if (foundInUserReq) {
            console.log("✓ Found as Approver1 in user_requests:", userReqData.length, "records");
            return true;
          }
        }

        const taskReqRes = await fetch(
          `${API_BASE}/api/task-requests/approvers?email=${encodeURIComponent(userEmail)}`,
          { method: "GET", headers }
        );

        if (taskReqRes.ok) {
          const taskReqData = await taskReqRes.json();
          const foundInTaskReq = Array.isArray(taskReqData) && taskReqData.length > 0;

          if (foundInTaskReq) {
            console.log("✓ Found as Approver1 in task_requests:", taskReqData.length, "records");
            return true;
          }
        }

        console.log("✗ Not found as Approver1 in user_requests or task_requests");
        return false;
      } catch (err) {
        console.error("Error checking Approver1 status:", err);
        return false;
      }
    },
    []
  );

  /**
   * Check if user is a Workflow Approver (from approval_workflow_master)
   */
  const checkWorkflowApproverStatus = useCallback(
    async (userId: number, token?: string): Promise<{ found: boolean; plants: number[] }> => {
      const authToken = token || localStorage.getItem("token");
      const headers: HeadersInit = authToken ? { Authorization: `Bearer ${authToken}` } : {};

      console.log("=== Checking Workflow Approver Status ===");
      console.log("User ID:", userId);

      try {
        const res = await fetch(
          `${API_BASE}/api/workflows?approver_id=${userId}`,
          { method: "GET", headers }
        );

        if (!res.ok) {
          console.log("✗ Workflow API request failed");
          return { found: false, plants: [] };
        }

        const data = await res.json();
        const workflows = Array.isArray(data) ? data : data.workflows || [];

        console.log("Workflows retrieved:", workflows.length);

        const matchingWorkflows = workflows.filter((wf: Workflow) => {
          const approverIds = [
            wf.approver_1_id,
            wf.approver_2_id,
            wf.approver_3_id,
            wf.approver_4_id,
            wf.approver_5_id,
          ];
          return approverIds.some((id) => id === String(userId));
        });

        if (matchingWorkflows.length > 0) {
          const plants = [
            ...new Set(
              matchingWorkflows
                .map((w: Workflow) => w.plant_id)
                .filter((pid: number | null | undefined): pid is number => pid != null)
            ),
          ] as number[];
          console.log("✓ Found as Workflow Approver in plants:", plants);
          return { found: true, plants };
        }

        console.log("✗ Not found in approval_workflow_master");
        return { found: false, plants: [] };
      } catch (err) {
        console.error("Error checking workflow approver status:", err);
        return { found: false, plants: [] };
      }
    },
    []
  );

  

  /**
   * Combined approver check
   */
  const checkApproverStatus = useCallback(
    async (userId: number, userEmail: string, token?: string): Promise<ApproverDetectionResult> => {
      console.log("=== Starting Combined Approver Check ===");

      const isApprover1 = await checkApprover1Status(userEmail, token);
      const workflowResult = await checkWorkflowApproverStatus(userId, token);
      const dataCorporate=await fetchCorporateWorkflows(userId,'CORPORATE','Administration');
console.log("data corporate",dataCorporate); 
      const result: ApproverDetectionResult = {
        isApprover: isApprover1 || workflowResult.found,
        isApprover1,
        isCorporateApprover:(dataCorporate.length > 0)?true:false,
        isWorkflowApprover: workflowResult.found,
        approverPlants: workflowResult.plants,
      };

      console.log("=== Approver Check Summary ===");
      console.log("User ID:", userId);
      console.log("Email:", userEmail);
      console.log("Is Approver (any type):", result.isApprover);
      console.log("Is Approver1:", result.isApprover1);
      console.log("Is Workflow Approver:", result.isWorkflowApprover);
      console.log("Approver Plants:", result.approverPlants);
      console.log("==============================");

      return result;
    },
    [checkApprover1Status, checkWorkflowApproverStatus]
  );

  const fetchITBinForUser = useCallback(
    async (userId: number, token?: string) => {
      try {
        const res = await fetch(`${API_BASE}/api/plant-itsupport`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return false;

        const data = await res.json().catch(() => []);
        const workflows = Array.isArray(data) ? data : [];

        const matched = workflows.filter(
          (wf: any) =>
            wf &&
            Array.isArray(wf.users) &&
            wf.users.some((u: any) => u && Number(u.user_id) === Number(userId))
        );

        const found = matched.length > 0;

        if (found) {
          const plantList = matched.map((wf) => ({
            plant_id: wf.plant_id,
            plant_name: wf.plant_name,
          }));

          const plantIds = plantList.map(p => p.plant_id);

          setUser((prev) => {
            if (!prev) return prev;

            const updated = {
              ...prev,
              isITBin: true,
              itPlants: plantList,
              itPlantIds: plantIds,
            };

            try {
              localStorage.setItem("authUser", JSON.stringify(updated));
            } catch { }

            return updated;
          });
        }

        console.log("ITBin result:", found);
        console.log("ITBin plants:", matched);
        return { found, plants: matched };
      } catch (err) {
        console.error("fetchITBinForUser error", err);
        return false;
      }
    },
    []
  );

  // Restore user from localStorage on app load
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stored = localStorage.getItem("authUser");
        const token = localStorage.getItem("token");

        if (stored && mounted) {
          const parsed: AuthUser = JSON.parse(stored);

          // First, try to get permissions from token
          let tokenPermissions: string[] = [];
          let tokenPlantPermissions: PlantPermission[] = [];
          let tokenPlantIds: number[] = [];

          if (token) {
            try {
              const payload = JSON.parse(atob(token.split(".")[1]));
              console.log("Token payload:", payload);

              if (payload?.permissions) {
                tokenPermissions = normalizePermissions(payload.permissions);
              }
              if (payload?.plantPermissions) {
                tokenPlantPermissions = payload.plantPermissions || [];
              }
              if (payload?.permittedPlantIds) {
                tokenPlantIds = payload.permittedPlantIds || [];
              }
            } catch (e) {
              console.warn("Error decoding token:", e);
            }
          }

          // Set initial user with token data
          setUser({
            ...parsed,
            permissions: tokenPermissions,
            plantPermissions: tokenPlantPermissions,
            permittedPlantIds: tokenPlantIds,
          });
          setPermissions(tokenPermissions);

          // Fetch fresh permissions if needed
          if (token && (!tokenPermissions.length || !tokenPlantPermissions.length)) {
            try {
              const freshPerms = await fetchPermissions();
              
              if (!mounted) return;

              setUser((prev) =>
                prev
                  ? {
                      ...prev,
                      permissions: freshPerms.permissions,
                      plantPermissions: freshPerms.plantPermissions,
                      permittedPlantIds: freshPerms.permittedPlantIds,
                    }
                  : null
              );

              // Update localStorage
              const updatedUser = {
                ...parsed,
                permissions: freshPerms.permissions,
                plantPermissions: freshPerms.plantPermissions,
                permittedPlantIds: freshPerms.permittedPlantIds,
              };
              localStorage.setItem("authUser", JSON.stringify(updatedUser));
            } catch (e) {
              console.warn("Error fetching fresh permissions:", e);
            }
          }

          // Check approver status
          if (token && mounted) {
            try {
              const approverResult = await checkApproverStatus(
                parsed.id,
                parsed.email,
                token
              );

              if (!mounted) return;

              if (approverResult.isApprover) {
                setUser((prev) =>
                  prev
                    ? {
                        ...prev,
                        isApprover: true,
                        isApprover1: approverResult.isApprover1,
                        isWorkflowApprover: approverResult.isWorkflowApprover,
                         isCorporateApprover: approverResult.isCorporateApprover,
                        approverPlants: approverResult.approverPlants,
                      }
                    : null
                );

                const updatedUser = JSON.parse(localStorage.getItem("authUser") || "{}");
                localStorage.setItem(
                  "authUser",
                  JSON.stringify({
                    ...updatedUser,
                    isApprover: true,
                    isApprover1: approverResult.isApprover1,
                    isWorkflowApprover: approverResult.isWorkflowApprover,
                     isCorporateApprover: approverResult.isCorporateApprover,
                    approverPlants: approverResult.approverPlants,
                  })
                );
              }
            } catch (e) {
              console.warn("Error checking approver status:", e);
            }
          }

          // Check IT Bin status
          if (token && mounted) {
            try {
              await fetchITBinForUser(parsed.id, token);
            } catch (e) {
              console.warn("Error checking IT Bin status:", e);
            }
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fetchPermissions, checkApproverStatus, fetchITBinForUser]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await loginAPI({ username, password });

      if (!data.user || !data.token) {
        throw new Error("Invalid login response: missing user or token");
      }
console.log("Auth data after data login",data.user);
      const roleMap: Record<string, number> = {
        superAdmin: 1,
        plantAdmin: 2,
        approver: 4,
        auditReviewer: 3,
        user: 5,
        vendor: 6,
      };

      let role_id: number | number[] = data.user.role_id;
      if (typeof role_id !== "number" && Array.isArray(data.user.role_id)) {
        role_id = data.user.role_id;
      } else if (
        typeof role_id !== "number" &&
        typeof data.user.role === "string"
      ) {
        role_id = roleMap[data.user.role] || 0;
      }

      let status = (data.user.status ?? "").toString();
      if (status && status.toLowerCase() === "active") status = "ACTIVE";

      const userId =
        (typeof data.user.user_id === "number" && data.user.user_id) ||
        (typeof data.user.id === "number" && data.user.id) ||
        null;

      if (!userId || !data.user.username || !status || !data.token) {
        setError("Login failed: invalid user data returned from server");
        setUser(null);
        return;
      }

      console.log("Login data details:", data);

      // Extract permissions from token
      let tokenPermissions: string[] = [];
      let tokenPlantPermissions: PlantPermission[] = [];
      let tokenPlantIds: number[] = [];
      let isSuperAdmin = false;

      try {
        const payload = JSON.parse(atob(data.token.split(".")[1]));
        console.log("Token payload on login:", payload);

        if (payload?.permissions) {
          tokenPermissions = normalizePermissions(payload.permissions);
        }
        if (payload?.plantPermissions) {
          tokenPlantPermissions = payload.plantPermissions || [];
        }
        if (payload?.permittedPlantIds) {
          tokenPlantIds = payload.permittedPlantIds || [];
        }
        // Check for super admin from token
        isSuperAdmin = payload?.isSuperAdmin || false;
      } catch (e) {
        console.warn("Error decoding token on login:", e);
      }

      const authUser: AuthUser = {
        id: userId,
        username: data.user.username,
        name: data.user.full_name ?? data.user.name ?? "",
        email: data.user.email ?? "",
        employee_code: data.user.employee_code ?? "",
        location: data.user.location ?? "",
        department: data.user.department ?? "",
        designation: data.user.designation ?? "",
        reporting_manager: data.user.reporting_manager ?? "",
        managers_manager: data.user.managers_manager ?? "",
        role_id,
        status,
        token: data.token,
        permissions: tokenPermissions,
        plantPermissions: tokenPlantPermissions,
        permittedPlantIds: tokenPlantIds,
        isSuperAdmin,
      };

      setUser(authUser);
      setPermissions(tokenPermissions);

      try {
        localStorage.setItem("authUser", JSON.stringify(authUser));
        localStorage.setItem("token", authUser.token);

        // Fetch additional permissions if not in token
        if (!tokenPermissions.length || !tokenPlantPermissions.length) {
          const freshPerms = await fetchPermissions();
          setUser((prev) =>
            prev
              ? {
                  ...prev,
                  permissions: freshPerms.permissions,
                  plantPermissions: freshPerms.plantPermissions,
                  permittedPlantIds: freshPerms.permittedPlantIds,
                }
              : prev
          );

          const updatedUser = {
            ...authUser,
            permissions: freshPerms.permissions,
            plantPermissions: freshPerms.plantPermissions,
            permittedPlantIds: freshPerms.permittedPlantIds,
          };
          localStorage.setItem("authUser", JSON.stringify(updatedUser));
        }
      } catch (e) {
        console.warn("Error saving auth data or fetching permissions:", e);
      }

      // Check approver status
      try {
        const approverResult = await checkApproverStatus(
          authUser.id,
          authUser.email,
          authUser.token
        );

        if (approverResult.isApprover) {
          setUser((prev) =>
            prev
              ? {
                  ...prev,
                  isApprover: true,
                  isApprover1: approverResult.isApprover1,
                  isWorkflowApprover: approverResult.isWorkflowApprover,
                   isCorporateApprover: approverResult.isCorporateApprover,
                  approverPlants: approverResult.approverPlants,
                }
              : prev
          );

          const updatedUser = JSON.parse(localStorage.getItem("authUser") || "{}");
          localStorage.setItem(
            "authUser",
            JSON.stringify({
              ...updatedUser,
              isApprover: true,
              isApprover1: approverResult.isApprover1,
              isWorkflowApprover: approverResult.isWorkflowApprover,
               isCorporateApprover: approverResult.isCorporateApprover,
              approverPlants: approverResult.approverPlants,
            })
          );
        }
      } catch (e) {
        console.warn("checkApproverStatus error:", e);
      }

      // Check IT Bin
      try {
        await fetchITBinForUser(authUser.id, authUser.token);
      } catch (e) {
        console.warn("fetchITBinForUser error:", e);
      }

      console.log("[AuthContext] User set after login:", authUser);

      const initialRoute = determineInitialRoute(authUser);
      try {
        localStorage.setItem("initialRoute", initialRoute);
      } catch (e) {
        console.warn("Error saving initial route:", e);
      }
    } catch (err: any) {
      setError(err.message || String(err));
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setPermissions([]);
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    } catch (e) {
      console.warn("Error during logout cleanup:", e);
      window.location.href = "/";
    }
  };

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, error, permissions }}
    >
      <AbilityProvider>{children}</AbilityProvider>
    </AuthContext.Provider>
  );
};