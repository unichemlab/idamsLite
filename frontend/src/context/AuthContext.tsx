import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { API_BASE } from "../utils/api";

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
  role_id: number;
  status: string;
  token: string;
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

  // Restore user from localStorage on app load for persistent login
  useEffect(() => {
    const stored = localStorage.getItem("authUser");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
    }
    setLoading(false);
  }, []);

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
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }
      const data = await res.json();
      // Validate backend response
      if (!data.user || !data.token) {
        throw new Error("Invalid login response: missing user or token");
      }
      // Map backend user fields to frontend AuthUser interface
      const roleMap: Record<string, number> = {
        superAdmin: 1,
        plantAdmin: 2,
        approver: 3,
        user: 4,
        vendor: 5,
      };
      let role_id = data.user.role_id;
      if (typeof role_id !== "number" && typeof data.user.role === "string") {
        role_id = roleMap[data.user.role] || 0;
      }
      let status = (data.user.status ?? "").toUpperCase();
      if (typeof status === "string" && status.toLowerCase() === "active") {
        status = "ACTIVE";
      }

      // Try to get user id from multiple possible fields
      const userId =
        (typeof data.user.user_id === "number" && data.user.user_id) ||
        (typeof data.user.id === "number" && data.user.id) ||
        null;

      if (
        !userId ||
        !data.user.username ||
        !role_id ||
        !status ||
        !data.token
      ) {
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
      localStorage.setItem("authUser", JSON.stringify(authUser));
      localStorage.setItem("token", authUser.token);
      console.log("[AuthContext] User set after login:", authUser);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("authUser");
    localStorage.removeItem("token");
  };

  if (loading) {
    // Optionally, show a spinner or blank screen
    return null;
  }
  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
