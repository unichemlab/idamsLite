import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { fetchPermissionsAPI, fetchWorkflows, loginAPI, API_BASE } from "../utils/api";
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
  isApprover1: boolean; // From user_requests/task_requests table
  isWorkflowApprover: boolean; // From approval_workflow_master
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
  isApprover1?: boolean; // Approver from user_requests/task_requests
  isWorkflowApprover?: boolean; // Approver from approval_workflow_master
  isITBin?: boolean;
  roleName?: string;
  permissions?: string[];
  approverPlants?: number[];
  itPlants?: any[];
  itPlantIds?: number[];
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
  const [plantPermissions, setPlantPermissions] = useState<PlantPermission[]>([]);
  const [permittedPlantIds, setPermittedPlantIds] = useState<number[]>([]);
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
   * This API returns the permissions assigned to the user via the
   * User Master after the user details are edited or updated.
   */

  const fetchPermissions = useCallback(async (): Promise<string[]> => {
  try {
    const data: any = await fetchPermissionsAPI();
    console.log("Fetched permissions:", data);

    const normalized = normalizePermissions(data?.permissions);

    setPermissions(normalized);
    setPlantPermissions(data?.plantPermissions || []);
    setPermittedPlantIds(data?.permittedPlantIds || []);

    return normalized; // ✅ ALWAYS array
  } catch (err) {
    console.error("fetchPermissions error", err);
    setPermissions([]);
    setPlantPermissions([]);
    setPermittedPlantIds([]);
    return []; // ✅ NEVER null
  }
}, []);



  /**
   * Check if user is Approver 1 (from user_requests and task_requests tables)
   * Approver 1 is always based on email matching in these tables
   */
  const checkApprover1Status = useCallback(
    async (userEmail: string, token?: string): Promise<boolean> => {
      const authToken = token || localStorage.getItem("token");
      const headers: HeadersInit = authToken ? { Authorization: `Bearer ${authToken}` } : {};

      console.log("=== Checking Approver 1 Status ===");
      console.log("Email:", userEmail);

      try {
        // Check user_requests table for approver1_email
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

        // Check task_requests table for approver1_email
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
   * These are approvers assigned to specific plants in the workflow
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
   * Combined approver check - determines both types of approver status
   */
  const checkApproverStatus = useCallback(
    async (userId: number, userEmail: string, token?: string): Promise<ApproverDetectionResult> => {
      console.log("=== Starting Combined Approver Check ===");

      // Check Approver 1 status (from user_requests/task_requests)
      const isApprover1 = await checkApprover1Status(userEmail, token);

      // Check Workflow Approver status (from approval_workflow_master)
      const workflowResult = await checkWorkflowApproverStatus(userId, token);

      const result: ApproverDetectionResult = {
        isApprover: isApprover1 || workflowResult.found,
        isApprover1,
        isWorkflowApprover: workflowResult.found,
        approverPlants: workflowResult.plants,
      };

      console.log("=== Approver Check Summary ===");
      console.log("User ID:", userId);
      console.log("Email:", userEmail);
      console.log("Is Approver (any type):", result.isApprover);
      console.log("Is Approver1 (user_requests/task_requests):", result.isApprover1);
      console.log("Is Workflow Approver (approval_workflow_master):", result.isWorkflowApprover);
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
    [setUser]
  );

  // Restore user from localStorage on app load
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stored = localStorage.getItem("authUser");
        if (stored && mounted) {
          const parsed: AuthUser = JSON.parse(stored);

          const normalizedPermissions = normalizePermissions(parsed.permissions);

          setUser({
            ...parsed,
            permissions: normalizedPermissions,
          });
          setPermissions(normalizedPermissions);

          const token = localStorage.getItem("token");
          if (token) {
            let userPermissions: string[] = [];
            try {
              const payload = JSON.parse(atob(token.split(".")[1]));
              if (payload?.permissions) {
                userPermissions = normalizePermissions(payload.permissions);
                setPermissions(userPermissions);
                setUser((prev) =>
                  prev ? { ...prev, permissions: userPermissions } : prev
                );
              }

            } catch (e) { }

            try {
              if (!userPermissions || userPermissions.length === 0) {
                userPermissions = await fetchPermissions();
              }

              if (!mounted) return;

              // Check both approver types
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
                      permissions: userPermissions,
                      isApprover: true,
                      isApprover1: approverResult.isApprover1,
                      isWorkflowApprover: approverResult.isWorkflowApprover,
                      approverPlants: approverResult.approverPlants,
                    }
                    : null
                );

                // Update localStorage with approver info
                try {
                  const updatedUser = {
                    ...parsed,
                    permissions: userPermissions,
                    isApprover: true,
                    isApprover1: approverResult.isApprover1,
                    isWorkflowApprover: approverResult.isWorkflowApprover,
                    approverPlants: approverResult.approverPlants,
                  };
                  localStorage.setItem("authUser", JSON.stringify(updatedUser));
                } catch (e) {
                  console.warn("Error updating localStorage:", e);
                }
              } else {
                setUser((prev) =>
                  prev ? { ...prev, permissions: userPermissions } : null
                );
              }

              // Check IT Bin status
              if (!mounted) return;
              try {
                await fetchITBinForUser(parsed.id, token);
              } catch (e) {
                console.warn("Error checking IT Bin status:", e);
              }
            } catch (e) {
              console.warn("Error restoring session:", e);
              if (mounted) {
                setError("Failed to restore session. Please try logging in again.");
              }
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
      };

      try {
        const payload = JSON.parse(atob(data.token.split(".")[1]));
        if (payload && Array.isArray(payload.permissions)) {
          const normalized = normalizePermissions(payload.permissions);
          (authUser as any).permissions = normalized;
          setPermissions(normalized);
        }
      } catch (e) { }

      setUser(authUser);

      try {
        localStorage.setItem("authUser", JSON.stringify(authUser));
        localStorage.setItem("token", authUser.token);

        if (
          !(
            (authUser as any).permissions &&
            (authUser as any).permissions.length
          )
        ) {
          const userPermissions = await fetchPermissions();
          setUser((prev) =>
            prev ? { ...prev, permissions: userPermissions } : prev
          );
        }
      } catch (e) {
        console.warn("Error saving auth data or fetching permissions:", e);
      }

      // Check both approver types during login
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
                approverPlants: approverResult.approverPlants,
              }
              : prev
          );

          // Update localStorage with complete approver info
          try {
            const updatedUser = {
              ...authUser,
              isApprover: true,
              isApprover1: approverResult.isApprover1,
              isWorkflowApprover: approverResult.isWorkflowApprover,
              approverPlants: approverResult.approverPlants,
            };
            localStorage.setItem("authUser", JSON.stringify(updatedUser));
          } catch (e) {
            console.warn("Error updating localStorage with approver info:", e);
          }
        }
      } catch (e) {
        console.warn("checkApproverStatus error:", e);
      }

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