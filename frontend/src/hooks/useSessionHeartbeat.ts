// useSessionHeartbeat.ts
//
// Two responsibilities:
//   1. On refresh — immediately validate the session BEFORE the app renders
//      (synchronous token check + one fast async heartbeat).
//      Returns { checking: true } while validating so the app can show a
//      spinner instead of flickering into a logged-in state.
//
//   2. While active — calls /api/auth/heartbeat every 2 minutes to keep
//      the server's 10-min inactivity window open. On SESSION_EXPIRED (401)
//      clears storage and redirects to login instantly.

import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
 * Config
 * ───────────────────────────────────────────────────────────────────────────── */
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;   // ping server every 2 min
const INACTIVITY_WARN_MS    = 9 * 60 * 1000;   // warn user at 9 min idle
const TOKEN_EXPIRY_BUFFER_S = 30;               // treat token as expired 30s early

/* ─────────────────────────────────────────────────────────────────────────────
 * Sync helpers — no network, instant
 * ───────────────────────────────────────────────────────────────────────────── */

/** Parse the JWT payload without verifying signature (signature verified server-side) */
function parseTokenPayload(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

/** Check token exists and is not expired — runs synchronously before any render */
function isTokenLocallyValid(): boolean {
  const token = localStorage.getItem("token");
  if (!token) return false;
  const payload = parseTokenPayload(token);
  if (!payload) return false;
  const exp = payload.exp as number | undefined;
  if (!exp) return false;
  // Token is valid if it expires more than BUFFER seconds from now
  return Date.now() / 1000 < exp - TOKEN_EXPIRY_BUFFER_S;
}

function getSessionId(): string | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const payload = parseTokenPayload(token);
  return (payload?.session_id as string) ?? null;
}

function clearAuthStorage() {
  ["token", "authUser", "role", "username",
   "superadmin_activeTab", "initialRoute",
  ].forEach(k => localStorage.removeItem(k));
}

function redirectToLogin() {
  clearAuthStorage();
  // Use replace so the user can't press Back into the protected page
  window.location.replace("/");
}

/* ─────────────────────────────────────────────────────────────────────────────
 * The heartbeat fetch — fire and handle the result
 * ───────────────────────────────────────────────────────────────────────────── */
async function pingHeartbeat(sessionId: string): Promise<"ok" | "expired" | "network_error"> {
  try {
    const res = await fetch("/api/auth/heartbeat", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token") ?? ""}`,
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (res.ok) return "ok";

    if (res.status === 401) {
      const body = await res.json().catch(() => ({}));
      if (body.code === "SESSION_EXPIRED" || body.code === "INVALID_TOKEN") {
        return "expired";
      }
    }

    return "network_error"; // 5xx, etc. — don't log out on server errors
  } catch {
    return "network_error";
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Main hook
 *
 * Usage:
 *   const { sessionChecking } = useSessionHeartbeat();
 *   if (sessionChecking) return <FullPageSpinner />;
 *
 * sessionChecking is true only for the brief async check on mount/refresh.
 * It becomes false within ~200ms (one network round trip to /heartbeat).
 * ───────────────────────────────────────────────────────────────────────────── */
export function useSessionHeartbeat() {
  // true while we wait for the initial async session check on mount
  const [sessionChecking, setSessionChecking] = useState<boolean>(true);

  const intervalRef  = useRef<ReturnType<typeof setInterval>  | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout>   | null>(null);
  const lastActiveMs = useRef<number>(Date.now());

  /* ── Track user activity (for idle warning) ─────────────────────────────── */
  useEffect(() => {
    const touch = () => { lastActiveMs.current = Date.now(); };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, touch, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, touch));
  }, []);

  /* ── Idle warning at 9 minutes ───────────────────────────────────────────── */
  const scheduleIdleWarning = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);

    warnTimerRef.current = setTimeout(async () => {
      const idleMs = Date.now() - lastActiveMs.current;

      if (idleMs >= INACTIVITY_WARN_MS) {
        const stay = window.confirm(
          "You have been inactive for 9 minutes.\n\nClick OK to stay logged in."
        );

        if (!stay) {
          // User chose to leave — logout immediately
          const sessionId = getSessionId();
          if (sessionId) {
            await fetch("/api/auth/logout", {
              method:  "POST",
              headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token") ?? ""}`,
              },
              body: JSON.stringify({ session_id: sessionId }),
            }).catch(() => {});
          }
          redirectToLogin();
          return;
        }

        // User clicked OK — immediately ping heartbeat to reset server timer
        const sessionId = getSessionId();
        if (sessionId) {
          const result = await pingHeartbeat(sessionId);
          if (result === "expired") {
            alert("Your session has already expired. Please login again.");
            redirectToLogin();
            return;
          }
        }
      }

      // Either user was active or chose to stay — re-schedule
      scheduleIdleWarning();
    }, INACTIVITY_WARN_MS);
  }, []);

  /* ── Core effect: validate on mount, then start interval ────────────────── */
  useEffect(() => {
    let cancelled = false; // prevent state updates after unmount

    async function initSession() {
      // ── Step 1: synchronous token check — zero latency ──────────────────
      // If there's no token or it's already expired locally, redirect immediately
      // without even making a network call.
      if (!isTokenLocallyValid()) {
        if (!cancelled) {
          clearAuthStorage();
          // Don't redirect if we're already on the login page
          if (window.location.pathname !== "/") {
            window.location.replace("/");
          } else {
            setSessionChecking(false);
          }
        }
        return;
      }

      const sessionId = getSessionId();
      if (!sessionId) {
        if (!cancelled) {
          clearAuthStorage();
          window.location.replace("/");
        }
        return;
      }

      // ── Step 2: async heartbeat — validates session is alive on server ───
      // This is the one network call on refresh. Usually ~50-200ms.
      const result = await pingHeartbeat(sessionId);

      if (cancelled) return;

      if (result === "expired") {
        alert("Your session has expired. Please login again.");
        redirectToLogin();
        return;
      }

      // "ok" or "network_error" — both allow the app to continue
      // (network_error: be lenient, don't log the user out on a blip)
      setSessionChecking(false);

      // ── Step 3: start the recurring heartbeat interval ───────────────────
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(async () => {
        const sid = getSessionId();
        if (!sid) return;

        // Also re-check local token expiry on every interval
        if (!isTokenLocallyValid()) {
          redirectToLogin();
          return;
        }

        const r = await pingHeartbeat(sid);
        if (r === "expired") {
          alert("Your session has expired due to inactivity. Please login again.");
          redirectToLogin();
        }
      }, HEARTBEAT_INTERVAL_MS);

      // ── Step 4: start idle warning timer ────────────────────────────────
      scheduleIdleWarning();
    }

    initSession();

    return () => {
      cancelled = true;
      if (intervalRef.current)  clearInterval(intervalRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    };
  }, [scheduleIdleWarning]);

  return { sessionChecking };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Usage in your App.tsx or AuthContext:
 *
 *   import { useSessionHeartbeat } from "./hooks/useSessionHeartbeat";
 *
 *   function App() {
 *     const { sessionChecking } = useSessionHeartbeat();
 *
 *     // Block render until session is confirmed — prevents flicker
 *     if (sessionChecking && localStorage.getItem("token")) {
 *       return (
 *         <div style={{ display:"flex", justifyContent:"center",
 *                       alignItems:"center", height:"100vh" }}>
 *           <CircularProgress />
 *         </div>
 *       );
 *     }
 *
 *     return <RouterProvider router={router} />;
 *   }
 *
 * ───────────────────────────────────────────────────────────────────────────── */