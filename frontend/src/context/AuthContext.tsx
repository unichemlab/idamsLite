import React, { createContext, useContext, useState, ReactNode } from "react";

export interface AuthUser {
  id: number;
  username: string;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No localStorage: user state is only in React context
  // useEffect not needed for localStorage

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:4000/api/auth/login", {
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
      let status = data.user.status;
      if (typeof status === "string" && status.toLowerCase() === "active") {
        status = "ACTIVE";
      }

      // Try to get user id from multiple possible fields
      const userId =
        (typeof data.user.user_id === "number" && data.user.user_id) ||
        (typeof data.user.id === "number" && data.user.id) ||
        null;

      // Validate required fields before constructing user
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
        role_id,
        status,
        token: data.token,
      };
      setUser(authUser);
      console.log("[AuthContext] User set after login:", authUser);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

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
