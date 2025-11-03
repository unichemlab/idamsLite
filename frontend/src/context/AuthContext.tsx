
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { API_BASE } from "../utils/api";
import AbilityProvider, { PermissionRow } from "./AbilityContext";

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
  isITBin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true); // true until localStorage check is done
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);

  // fetch permissions from backend
  async function fetchPermissions(token: string) {
    try {
      if (!token) {
        console.warn("fetchPermissions called without token");
        setPermissions([]);
        return;
      }
      const res = await fetch(`${API_BASE}/api/auth/permissions`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.warn("Failed to fetch permissions", res.status);
        setPermissions([]);
        return;
      }
      const data = await res.json();
      setPermissions(
        Array.isArray(data.permissions)
          ? data.permissions
          : data.permissions || []
      );
    } catch (err) {
      console.error("fetchPermissions error", err);
      setPermissions([]);
    }
  }

  // Check whether a given user id appears in any workflow approver lists.
  // Uses setUser updater safely to avoid stale closures / unnecessary deps.
  const fetchWorkflowsForUser = useCallback(
    async (userId: number, token?: string) => {
      try {
        const res = await fetch(`${API_BASE}/api/workflows`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return false;

        const data = await res.json().catch(() => ({}));
        const workflows = Array.isArray(data.workflows) ? data.workflows : [];

        const found = workflows.some((wf: any) => {
          if (!wf || !Array.isArray(wf.approvers)) return false;
          // wf.approvers is an array of arrays (one array per approver level)
          return wf.approvers.some((arr: any[]) =>
            Array.isArray(arr)
              ? arr.some((u) => u && Number(u.id) === Number(userId))
              : false
          );
        });

        if (found) {
          // update user state safely
          setUser((prev) => {
            if (!prev) return prev;
            if (prev.isApprover) return prev;
            const updated = { ...prev, isApprover: true };
            try {
              localStorage.setItem("authUser", JSON.stringify(updated));
            } catch (e) {
              /* ignore localStorage write errors */
            }
            return updated;
          });
        }

        // Step 3: If NOT found in workflow, check user_requests table
        const userEmail = JSON.parse(localStorage.getItem("authUser") || "{}")?.email;
        if (!userEmail) return false;
        console.log("userEmail",userEmail);
        const res2 = await fetch(
          `${API_BASE}/api/user-requests/approvers?email=${encodeURIComponent(userEmail)}`,
          {
            method: "GET",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );

        if (!res2.ok) return false;
        const data2 = await res2.json();

        const foundInUserRequests = Array.isArray(data2) && data2.length > 0;

        if (foundInUserRequests) {
          setUser((prev) => {
            if (!prev) return prev;
            if (prev.isApprover) return prev;
            const updated = { ...prev, isApprover: true };
            try {
              localStorage.setItem("authUser", JSON.stringify(updated));
            } catch { }
            return updated;
          });
          return true;
        }

        return false;
      } catch (err) {
        console.error("fetchWorkflowsForUser error", err);
        return false;
      }
    },
    [setUser]
  );


  // Check whether a given user id appears in any workflow approver lists.
  // Uses setUser updater safely to avoid stale closures / unnecessary deps.
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

      console.log("workflow", workflows);

      // find all workflows where this user exists
      const matched = workflows.filter(
        (wf: any) =>
          wf &&
          Array.isArray(wf.users) &&
          wf.users.some((u: any) => u && Number(u.user_id) === Number(userId))
      );

      const found = matched.length > 0;

      if (found) {
        // extract plant list
        const plantList = matched.map((wf) => ({
          plant_id: wf.plant_id,
          plant_name: wf.plant_name,
        }));

        setUser((prev) => {
          if (!prev) return prev;

          // only update if not already stored
          const updated = {
            ...prev,
            isITBin: true,
            itPlants: plantList,
          };

          try {
            localStorage.setItem("authUser", JSON.stringify(updated));
          } catch {}

          return updated;
        });
      }

      console.log("ITBin result:", found);
      console.log("ITBin plant result:", matched);
      return { found, plants: matched };
    } catch (err) {
      console.error("fetchITBinForUser error", err);
      return false;
    }
  },
  [setUser]
);


  // Restore user from localStorage on app load for persistent login
  useEffect(() => {
    (async () => {
      try {
        const stored = localStorage.getItem("authUser");
        if (stored) {
          const parsed: AuthUser = JSON.parse(stored);
          setUser(parsed);

          const token = localStorage.getItem("token");
          if (token) {
            // restore permissions quietly
            fetchPermissions(token).catch((e) =>
              console.warn("restore perms", e)
            );
            // re-check workflows to know if this user is an approver
            if (parsed && parsed.id) {
              try {
                await fetchWorkflowsForUser(parsed.id, token);
              } catch (e) {
                console.warn("restore workflows", e);
              }

              try {
                await fetchITBinForUser(parsed.id, token);
              } catch (e) {
                console.warn("restore ITBIN", e);
              }
            }
          }
        }
      } finally {
        setLoading(false);
      }
    })();
    // fetchWorkflowsForUser is stable via useCallback
  }, [fetchWorkflowsForUser, fetchITBinForUser]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data && (data.error || data.message)) || "Login failed"
        );
      }

      const data = await res.json();

      // Validate backend response
      if (!data.user || !data.token) {
        throw new Error("Invalid login response: missing user or token");
      }

      // Map backend user fields to frontend AuthUser interface.
      // Accept role_id as number or array.
      const roleMap: Record<string, number> = {
        superAdmin: 1,
        plantAdmin: 2,
        approver: 3,
        user: 4,
        vendor: 5,
        ITBin: 6,
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
      } catch (e) {
        /* localStorage may fail in some environments; ignore */
      }

      // fetch permissions for the logged in user and initialize AbilityProvider
      fetchPermissions(authUser.token).catch((e) =>
        console.warn("permissions fetch", e)
      );

      console.log("fetchuserlogin", authUser);
      // check if user is approver in any workflow and set flag (best-effort)
      // Await this so callers (e.g. Login component) see user.isApprover set
      // before they perform a redirect based on the flag.
      try {
        await fetchWorkflowsForUser(authUser.id, authUser.token);
      } catch (e) {
        console.warn("fetchWorkflowsForUser", e);
      }

      try {
        await fetchITBinForUser(authUser.id, authUser.token);
      } catch (e) {
        console.warn("fetchITBinForUser", e);
      }

      console.log("[AuthContext] User set after login:", authUser);
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
      localStorage.removeItem("authUser");
      localStorage.removeItem("token");
    } catch (e) {
      // ignore localStorage errors
    }
  };

  if (loading) {
    // Optionally, show a spinner or blank screen while restoring auth state
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      <AbilityProvider permissions={permissions}>{children}</AbilityProvider>
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
