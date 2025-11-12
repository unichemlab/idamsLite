import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { fetchPermissionsAPI, fetchWorkflows, loginAPI } from "../utils/api";
import AbilityProvider from "./AbilityContext";

// Interface for workflow data
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
  // allow single number or array if backend sometimes returns multiple role ids
  role_id: number | number[];
  status: string;
  token: string;
  // true when this user appears as an approver in any workflow
  isApprover?: boolean;
  // Role name for easier checks
  roleName?: string;
  // User's permissions array
  permissions?: string[];
  // Plant IDs where user is approver
  approverPlants?: number[];
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
  const [loading, setLoading] = useState(true); // true until localStorage check is done
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  // Determine user's landing page
  const determineInitialRoute = (userData: AuthUser) => {
    // Check if user is an approver (either through role or permissions)
    const isApprover =
      userData.permissions?.includes("approve:requests") ||
      userData.role_id === 4 ||
      (Array.isArray(userData.role_id) && userData.role_id.includes(4));

    if (Array.isArray(userData.role_id) && userData.role_id.includes(1)) {
      return "/superadmin"; // SuperAdmin
    } else if (isApprover) {
      return "/approver"; // Approver
    } else if (
      Array.isArray(userData.role_id) &&
      userData.role_id.includes(2)
    ) {
      return "/plantadmin"; // Plant IT Admin
    } else {
      return "/user"; // Default user route
    }
  };

  // fetch permissions from backend (uses centralized helper that injects Authorization)
  const fetchPermissions = useCallback(async (token?: string) => {
    try {
      const data: any = await fetchPermissionsAPI();
      const userPermissions = Array.isArray(data.permissions)
        ? data.permissions
        : Array.isArray(data.data?.permissions)
        ? data.data.permissions
        : [];

      setPermissions(userPermissions);

      return userPermissions;
    } catch (err) {
      console.error("fetchPermissions error", err);
      setPermissions([]);
      return [];
    }
  }, []); // Remove user dependency to prevent circular updates

  // Check whether a given user id appears in any workflow approver lists.
  // Uses setUser updater safely to avoid stale closures / unnecessary deps.
  const fetchWorkflowsForUser = useCallback(
    async (userId: number, token?: string) => {
      if (!userId) {
        console.warn("fetchWorkflowsForUser called without userId");
        return false;
      }

      try {
        // Ask backend to return workflows that include this approver id
        const workflows = await fetchWorkflows(userId);
        if (!Array.isArray(workflows)) {
          console.warn("fetchWorkflows did not return an array");
          return false;
        }

        const found = workflows.some((wf: Workflow) => {
          const approverIds = [
            wf.approver_1_id,
            wf.approver_2_id,
            wf.approver_3_id,
            wf.approver_4_id,
            wf.approver_5_id,
          ];
          return approverIds.some((id) => id === String(userId));
        });

        if (found) {
          setUser((prev) => {
            if (!prev || prev.isApprover) return prev;
            const updated = { ...prev, isApprover: true };
            try {
              localStorage.setItem("authUser", JSON.stringify(updated));
            } catch (e) {
              console.warn("Failed to update localStorage:", e);
            }
            return updated;
          });
        }

        return found;
      } catch (err) {
        console.error("fetchWorkflowsForUser error", err);
        return false;
      }
    },
    [setUser]
  );

  // Restore user from localStorage on app load for persistent login
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stored = localStorage.getItem("authUser");
        if (stored && mounted) {
          const parsed: AuthUser = JSON.parse(stored);
          setUser(parsed);

          const token = localStorage.getItem("token");
          if (token) {
            try {
              // First fetch permissions
              const userPermissions = await fetchPermissions(token);

              if (!mounted) return;

              // Then check workflows for approver membership regardless of role id
              let isApproverFound = false;
              try {
                isApproverFound = await fetchWorkflowsForUser(parsed.id, token);
              } catch (e) {
                console.warn("Error checking workflows on restore:", e);
              }

              if (!mounted) return;

              if (isApproverFound) {
                // compute approver plants list for UI convenience
                try {
                  const workflows = await fetchWorkflows(parsed.id);
                  const approverPlants = (workflows || [])
                    .filter((w) =>
                      [
                        w.approver_1_id,
                        w.approver_2_id,
                        w.approver_3_id,
                        w.approver_4_id,
                        w.approver_5_id,
                      ].some((id) => id === String(parsed.id))
                    )
                    .map((w) => w.plant_id)
                    .filter((pid) => pid != null);

                  setUser((prev) =>
                    prev
                      ? {
                          ...prev,
                          permissions: userPermissions,
                          isApprover: true,
                          approverPlants: [...new Set(approverPlants)],
                        }
                      : null
                  );
                } catch (e) {
                  // fallback: set isApprover only
                  setUser((prev) =>
                    prev
                      ? {
                          ...prev,
                          permissions: userPermissions,
                          isApprover: true,
                        }
                      : null
                  );
                }
              } else {
                setUser((prev) =>
                  prev ? { ...prev, permissions: userPermissions } : null
                );
              }
            } catch (e) {
              console.warn("Error restoring session:", e);
              if (mounted) {
                setError(
                  "Failed to restore session. Please try logging in again."
                );
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
  }, [fetchWorkflowsForUser, fetchPermissions]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // Use centralized login helper (adds consistent error handling and header behavior)
      const data: any = await loginAPI({ username, password });

      // Validate backend response
      if (!data.user || !data.token) {
        throw new Error("Invalid login response: missing user or token");
      }

      // Map backend user fields to frontend AuthUser interface.
      // Accept role_id as number or array.
      // Map backend role string identifiers to numeric role IDs used in the app
      const roleMap: Record<string, number> = {
        superAdmin: 1,
        plantAdmin: 2,
        approver: 4, // align 'approver' string to role id 4
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
      // Normalize status to upper-case ACTIVE
      if (status && status.toLowerCase() === "active") status = "ACTIVE";

      // Try to get user id from multiple possible fields
      const userId =
        (typeof data.user.user_id === "number" && data.user.user_id) ||
        (typeof data.user.id === "number" && data.user.id) ||
        null;

      if (!userId || !data.user.username || !status || !data.token) {
        setError("Login failed: invalid user data returned from server");
        setUser(null);
        return;
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
      };

      setUser(authUser);
      try {
        localStorage.setItem("authUser", JSON.stringify(authUser));
        localStorage.setItem("token", authUser.token);

        // fetch permissions for the logged in user and initialize AbilityProvider
        await fetchPermissions(authUser.token);
      } catch (e) {
        console.warn("Error saving auth data or fetching permissions:", e);
        /* localStorage may fail in some environments; continue anyway */
      }

      // check if user is approver in any workflow and set flag (best-effort)
      // Await this so callers (e.g. Login component) see user.isApprover set
      // before they perform a redirect based on the flag.
      try {
        await fetchWorkflowsForUser(authUser.id, authUser.token);
      } catch (e) {
        console.warn("fetchWorkflowsForUser", e);
      }

      console.log("[AuthContext] User set after login:", authUser);

      // Determine initial route and store it
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
      // Clear ALL storage to prevent any stale state
      localStorage.clear();
      sessionStorage.clear();

      // Force a complete reload and redirect to login
      window.location.href = "/";
    } catch (e) {
      console.warn("Error during logout cleanup:", e);
      // Even if cleanup fails, redirect to login
      window.location.href = "/";
    }
  };

  if (loading) {
    // Optionally, show a spinner or blank screen while restoring auth state
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
