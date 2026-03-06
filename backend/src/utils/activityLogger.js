// activityLogger.js
// Enhanced Activity Logger — full Audit Trail support
// Covers: Login/Logout, CRUD, Task/Request, Approval workflow

const pool  = require("../config/db");
const http  = require("http");
const https = require("https");

/* ─────────────────────────────────────────────────────────────────────────────
 * Config
 * ───────────────────────────────────────────────────────────────────────────── */
const _requestInFlight = new Map();
const DEDUP_WINDOW_MS  = 2000;
const DEBUG            = process.env.ACTIVITY_LOG_DEBUG === "true";

/* ─────────────────────────────────────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────────────────────────────────────── */
const ACTION = {
  LOGIN:         "login",
  LOGOUT:        "logout",
  LOGIN_FAILED:  "login_failed",
  TOKEN_REFRESH: "token_refresh",
  CREATE:        "create",
  UPDATE:        "update",
  DELETE:        "delete",
  VIEW:          "view",
  SUBMIT:        "submit_for_approval",
  APPROVE:       "approve",
  REJECT:        "reject",
  TASK_OPEN:     "task_open",
  TASK_CLOSE:    "task_closure",
  TASK_REQUEST:  "task_request",
  USER_REQUEST:  "user_request",
};

const MODULE = {
  AUTH:              "auth",
  USER:              "user_master",
  VENDOR:            "vendor_information",
  PLANT:             "plant_master",
  ROLE:              "role_master",
  TASK_CLOSE:        "task_clouser",
  TASK_CLOSE_BIN:    "task_clouser_bin",
  DEPARTMENT:        "department_master",
  MASTER_APPROVAL:   "master_approval",
  APPROVAL_WORKFLOW: "approval_workflow",
  SYSTEM:            "system",
  SERVER:            "server",
  NETWORK:           "network",
  USER_REQUEST:      "user_request",
  APPLICATION:       "application",
};

/* ─────────────────────────────────────────────────────────────────────────────
 * Utility helpers
 * ───────────────────────────────────────────────────────────────────────────── */
function safeStringify(obj) {
  try { return JSON.stringify(obj); }
  catch { try { return String(obj); } catch { return null; } }
}

function sanitizeObject(obj, opts = {}) {
  if (!obj || typeof obj !== "object") return obj;
  const sensitive = new Set(
    (opts.extra || []).concat([
      "password", "pass", "pwd", "token", "secret", "authorization",
      "auth", "apiKey", "api_key", "ssn", "creditcard", "card_number",
      "refresh_token", "access_token",
    ])
  );
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const lk = k.toLowerCase();
    if (
      sensitive.has(k) || sensitive.has(lk) ||
      lk.includes("password") || lk.includes("token") ||
      lk.includes("secret")   || lk.includes("card")
    ) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = obj[k] && typeof obj[k] === "object"
        ? sanitizeObject(obj[k], opts)
        : obj[k];
    }
  }
  return out;
}

function diffObjects(oldObj, newObj) {
  if (!oldObj || typeof oldObj !== "object" || !newObj || typeof newObj !== "object")
    return oldObj !== newObj ? { from: oldObj, to: newObj } : {};
  const diff    = {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  for (const key of allKeys) {
    if (["password", "token", "secret"].includes(key)) continue;
    const oldVal = oldObj[key], newVal = newObj[key];
    if (oldVal && typeof oldVal === "object" && newVal && typeof newVal === "object") {
      const nested = diffObjects(oldVal, newVal);
      if (Object.keys(nested).length > 0) diff[key] = nested;
    } else if (oldVal !== newVal) {
      diff[key] = { from: oldVal, to: newVal };
    }
  }
  return diff;
}

function parseUserAgent(ua, platformVersion) {
  if (!ua || typeof ua !== "string") return { browser: null, os: null, device_type: null, browser_version: null };
  let browser = "Unknown", osName = "Unknown", device_type = "Desktop", browser_version = null;

  // ── Browser detection ──
  if (/chrome\/\d+/i.test(ua)   && !/edg\//i.test(ua))       browser = "Chrome";
  if (/edg\//i.test(ua))                                       browser = "Edge";
  if (/firefox\/\d+/i.test(ua))                                browser = "Firefox";
  if (/safari\/\d+/i.test(ua)   && !/chrome\/\d+/i.test(ua)) browser = "Safari";
  if (/opr\/|opera\//i.test(ua))                               browser = "Opera";

  // ── Browser version extraction ──
  const verPatterns = [
    { re: /edg\/(\d+\.\d+)/i,     name: "Edge"    },
    { re: /opr\/(\d+\.\d+)/i,     name: "Opera"   },
    { re: /firefox\/(\d+\.\d+)/i, name: "Firefox" },
    { re: /chrome\/(\d+\.\d+)/i,  name: "Chrome"  },
    { re: /version\/(\d+\.\d+)/i, name: "Safari"  },
  ];
  for (const { re } of verPatterns) {
    const m = ua.match(re);
    if (m) { browser_version = m[1]; break; }
  }

  // ── OS detection ──
  if (/windows nt 10/i.test(ua)) {
    // Windows 11 still sends "Windows NT 10.0" in UA string.
    // Use Sec-CH-UA-Platform-Version to distinguish: Win11 reports major >= 13.
    if (platformVersion) {
      const major = parseInt(String(platformVersion).split(".")[0], 10);
      osName = major >= 13 ? "Windows 11" : "Windows 10";
    } else {
      osName = "Windows 10"; // UA alone is ambiguous — default to Win10
    }
  }
  else if (/windows nt 6\./i.test(ua))   osName = "Windows";
  else if (/android/i.test(ua))          osName = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) osName = "iOS";
  else if (/mac os x/i.test(ua))         osName = "macOS";
  else if (/linux/i.test(ua))            osName = "Linux";

  // ── Device type detection from UA ──
  if (/mobile/i.test(ua))                          device_type = "Mobile";
  else if (/tablet|ipad/i.test(ua))                device_type = "Tablet";
  else if (/android/i.test(ua) && !/mobile/i.test(ua)) device_type = "Tablet";
  else                                             device_type = "Desktop";

  return { browser, os: osName, device_type, browser_version };
}

/**
 * Extract Windows-specific login/device data from request headers.
 * Browsers supporting Client Hints send these when server responds with:
 *   Accept-CH: Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version,
 *              Sec-CH-UA-Model, Sec-CH-UA-Full-Version-List
 *
 * Frontend can also send these as custom headers for non-Client-Hints browsers:
 *   x-platform, x-platform-version, x-ua-full, x-windows-username, x-domain
 */
function extractWindowsLoginData(req, reqMeta = {}) {
  if (!req && !reqMeta) return {};

  // Sec-CH-UA-Platform: "Windows" | "macOS" | "Android" etc.
  const platform = reqMeta.platform
    ?? req?.headers?.["sec-ch-ua-platform"]?.replace(/"/g, "")
    ?? req?.headers?.["x-platform"]
    ?? null;

  // Sec-CH-UA-Platform-Version: "13.0.0" (Win11) or "0.1.0" / "15.0.0"
  const platformVersion = reqMeta.platform_version
    ?? req?.headers?.["sec-ch-ua-platform-version"]?.replace(/"/g, "")
    ?? req?.headers?.["x-platform-version"]
    ?? null;

  // Sec-CH-UA-Full-Version-List: detailed browser+version string
  const uaFullVersionList = req?.headers?.["sec-ch-ua-full-version-list"]
    ?? req?.headers?.["x-ua-full"]
    ?? null;

  // Sec-CH-UA-Model: device model (mainly mobile)
  const deviceModel = req?.headers?.["sec-ch-ua-model"]?.replace(/"/g, "")
    ?? req?.headers?.["x-device-model"]
    ?? null;

  // Custom headers set by frontend (e.g. via navigator.userAgentData or OS API)
  const windowsUsername = reqMeta.windows_username
    ?? req?.headers?.["x-windows-username"]
    ?? null;

  const windowsDomain = reqMeta.windows_domain
    ?? req?.headers?.["x-domain"]
    ?? null;

  const architecture   = req?.headers?.["x-arch"]              ?? null;
  const bitness        = req?.headers?.["x-bitness"]           ?? null;
  const timezone       = reqMeta.timezone ?? req?.headers?.["x-timezone"] ?? null;
  const language       = req?.headers?.["x-language"]          ?? null;
  const screenRes      = req?.headers?.["x-screen-resolution"] ?? null;
  const connectionType = req?.headers?.["x-connection-type"]   ?? null;

  // ── Fields from /api/current-user (Node os module) sent as custom headers ──
  // x-windows-version: "Windows 11" or "Windows 10" (derived from os.release() build number)
  const windowsVersion = reqMeta.windows_version
    ?? req?.headers?.["x-windows-version"]
    ?? null;

  // x-computer-name: os.hostname()  e.g. "DESKTOP-ABC123"
  const computerName = reqMeta.computer_name
    ?? req?.headers?.["x-computer-name"]
    ?? null;

  // x-os-release: os.release() raw  e.g. "10.0.22621"
  const osRelease = reqMeta.os_release
    ?? req?.headers?.["x-os-release"]
    ?? null;

  // x-os-platform: os.platform() raw  e.g. "win32"
  const osPlatformRaw  = req?.headers?.["x-os-platform"]  ?? null;

  // x-total-mem-mb / x-free-mem-mb: memory in MB from os.totalmem() / os.freemem()
  const totalMemMb     = req?.headers?.["x-total-mem-mb"] ?? null;
  const freeMemMb      = req?.headers?.["x-free-mem-mb"]  ?? null;

  // x-cpu-model: first unique CPU model from os.cpus()  e.g. "Intel Core i7-..."
  const cpuModel       = req?.headers?.["x-cpu-model"]    ?? null;

  // x-homedir: os.userInfo().homedir  e.g. "C:\\Users\\john.doe"
  const homedir        = req?.headers?.["x-homedir"]      ?? null;

  return {
    platform,
    platform_version:     platformVersion,
    ua_full_version_list: uaFullVersionList,
    device_model:         deviceModel,
    windows_username:     windowsUsername,
    windows_domain:       windowsDomain,
    windows_version:      windowsVersion,   // "Windows 11" / "Windows 10" — from os.release()
    computer_name:        computerName,     // from os.hostname()
    os_release:           osRelease,        // raw e.g. "10.0.22621"
    os_platform_raw:      osPlatformRaw,    // "win32" / "darwin" / "linux"
    total_mem_mb:         totalMemMb,
    free_mem_mb:          freeMemMb,
    cpu_model:            cpuModel,
    homedir,
    architecture,
    bitness,
    timezone,
    language,
    screen_resolution:    screenRes,
    connection_type:      connectionType,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Dedup
 * ───────────────────────────────────────────────────────────────────────────── */
function buildDedupKey({ userId, module, tableName, recordId, action, reqMeta = {} }) {
  return [
    userId   ?? reqMeta.userId   ?? "anonymous",
    module   ?? "unknown",
    tableName ?? reqMeta.tableName ?? "unknown",
    recordId == null ? "null" : String(recordId),
    action   ?? "unknown",
  ].join("|");
}

function isDuplicateAndMark(key) {
  try {
    const now = Date.now(), last = _requestInFlight.get(key);
    if (last && now - last < DEDUP_WINDOW_MS) {
      if (DEBUG) console.log(`[DEBUG] Duplicate detected: ${key}`);
      return true;
    }
    _requestInFlight.set(key, now);
    setTimeout(() => _requestInFlight.delete(key), DEDUP_WINDOW_MS + 500);
    return false;
  } catch (e) { console.warn("[ACTIVITY LOG DEDUP ERROR]", e); return false; }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * fetchGeoLocation
 *
 * Calls ip-api.com (free, no API key needed, 45 req/min limit) to get:
 *   city, region, country, lat, lon, isp, org, timezone
 *
 * Cache strategy:
 *   - Results cached per IP for 10 minutes (IPs don't move that fast)
 *   - Private/LAN IPs (192.168.x, 10.x, 172.16.x) are looked up using
 *     the machine's public IP via ip-api.com/json (no IP arg = caller's IP)
 *   - Loopback (::1, 127.x) skipped — geolocation meaningless
 *   - 3-second timeout so it never blocks log inserts
 *
 * ip-api.com free tier: http only, 45 req/min, no key needed.
 * To use HTTPS or higher limits: set IPAPI_KEY in .env
 *   https://members.ip-api.com  ($2.49/mo for HTTPS + 15k req/min)
 * ───────────────────────────────────────────────────────────────────────────── */
const _geoCache    = new Map(); // key: IP string, value: { data, time }
const GEO_TTL_MS   = 10 * 60 * 1000; // 10 minutes per IP
const GEO_FIELDS   = "status,city,regionName,country,countryCode,lat,lon,isp,org,timezone,query";

// IPs that are private/LAN — geo lookup uses public IP endpoint instead
function _isPrivateIP(ip) {
  if (!ip) return true;
  if (ip === "::1" || ip === "127.0.0.1") return true;
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return (
    ip.startsWith("10.")                                    ||
    ip.startsWith("192.168.")                               ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)                 ||
    ip.startsWith("169.254.")                               ||
    ip.startsWith("fc") || ip.startsWith("fd")              // IPv6 ULA
  );
}

async function fetchGeoLocation(ipAddress) {
  // For private/LAN IPs omit the IP param so ip-api uses the server's public IP
  const isPrivate = _isPrivateIP(ipAddress);
  const cacheKey  = isPrivate ? "__public__" : ipAddress;

  // Return from cache if fresh
  const cached = _geoCache.get(cacheKey);
  if (cached && (Date.now() - cached.time) < GEO_TTL_MS) {
    return cached.data;
  }

  return new Promise((resolve) => {
    const apiKey  = process.env.IPAPI_KEY || null;
    // Free tier: http only, no key. Paid: https + key
    const proto   = apiKey ? "https" : "http";
    const keyPart = apiKey ? `?key=${apiKey}&fields=${GEO_FIELDS}` : `?fields=${GEO_FIELDS}`;
    // If private IP, omit IP arg → ip-api detects public IP of the server
    const ipPart  = isPrivate ? "" : `/${ipAddress}`;
    const url     = `${proto}://ip-api.com/json${ipPart}${keyPart}`;
    const client  = proto === "https" ? https : http;

    let settled = false;
    const done  = (val) => {
      if (!settled) {
        settled = true;
        if (val) _geoCache.set(cacheKey, { data: val, time: Date.now() });
        resolve(val);
      }
    };

    const timer = setTimeout(() => {
      if (DEBUG) console.log("[ActivityLogger] GeoIP timeout for", ipAddress);
      done(null);
    }, 3000);

    const reqGeo = client.get(url, { timeout: 3000 }, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        clearTimeout(timer);
        try {
          const geo = JSON.parse(raw);
          if (geo.status !== "success") {
            if (DEBUG) console.log("[ActivityLogger] GeoIP failed:", geo.message, "for", ipAddress);
            return done(null);
          }
          done({
            latitude:         geo.lat        ?? null,
            longitude:        geo.lon        ?? null,
            city:             geo.city       ?? null,
            region:           geo.regionName ?? null,
            country:          geo.country    ?? null,
            country_code:     geo.countryCode ?? null,
            timezone:         geo.timezone   ?? null,
            isp:              geo.isp        ?? null,
            org:              geo.org        ?? null,
            public_ip:        geo.query      ?? null, // actual IP ip-api resolved
          });
        } catch (e) {
          if (DEBUG) console.log("[ActivityLogger] GeoIP parse error:", e.message);
          done(null);
        }
      });
    });

    reqGeo.on("error", (e) => { clearTimeout(timer); done(null); });
    reqGeo.on("timeout", () => { reqGeo.destroy(); done(null); });
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * getChassisType
 *
 * Uses WMI (Windows) / system_profiler (macOS) / DMI (Linux) to detect
 * whether the machine is a Laptop, Desktop, Tablet, or Server.
 * Returns "Laptop" | "Desktop" | "Tablet" | "Server" | null
 *
 * WMI ChassisTypes reference:
 *   Laptop/Portable : 8 9 10 11 12 14 18 21
 *   Desktop         : 3 4 5 6 7 15 16
 *   Tablet          : 30 31 32
 *   Server          : 17 23 25 28
 * ───────────────────────────────────────────────────────────────────────────── */
const { execSync } = require("child_process");

let _chassisCache     = null;
let _chassisCacheTime = 0;
const CHASSIS_TTL_MS  = 5 * 60 * 1000; // 5 minutes — chassis never changes at runtime

function getChassisType() {
  // Return cached value
  if (_chassisCache !== null && (Date.now() - _chassisCacheTime) < CHASSIS_TTL_MS) {
    return _chassisCache;
  }

  const LAPTOP_TYPES  = new Set([8, 9, 10, 11, 12, 14, 18, 21]);
  const DESKTOP_TYPES = new Set([3, 4, 5, 6, 7, 15, 16]);
  const TABLET_TYPES  = new Set([30, 31, 32]);
  const SERVER_TYPES  = new Set([17, 23, 25, 28]);

  try {
    const platform = process.platform;

    if (platform === "win32") {
      // Try wmic first (Win7+), fallback to PowerShell (Win10+)
      let raw = null;
      try {
        raw = execSync(
          "wmic systemenclosure get chassistypes /format:list",
          { timeout: 3000, windowsHide: true }
        ).toString();
      } catch (_) {
        // wmic deprecated on Win11 — try PowerShell
        try {
          raw = execSync(
            `powershell -NoProfile -NonInteractive -Command "(Get-WmiObject -Class Win32_SystemEnclosure).ChassisTypes"`,
            { timeout: 3000, windowsHide: true }
          ).toString();
        } catch (_2) { /* both failed */ }
      }

      if (raw) {
        // Extract numbers from output like "ChassisTypes={10}" or just "10"
        const nums = [...raw.matchAll(/\d+/g)].map(m => parseInt(m[0], 10)).filter(n => n > 0);
        for (const n of nums) {
          if (LAPTOP_TYPES.has(n))  { _chassisCache = "Laptop";  _chassisCacheTime = Date.now(); return "Laptop";  }
          if (TABLET_TYPES.has(n))  { _chassisCache = "Tablet";  _chassisCacheTime = Date.now(); return "Tablet";  }
          if (SERVER_TYPES.has(n))  { _chassisCache = "Server";  _chassisCacheTime = Date.now(); return "Server";  }
          if (DESKTOP_TYPES.has(n)) { _chassisCache = "Desktop"; _chassisCacheTime = Date.now(); return "Desktop"; }
        }
      }
    }

    else if (platform === "darwin") {
      // macOS: system_profiler gives "Model Name: MacBook Pro" etc.
      try {
        const raw = execSync(
          "system_profiler SPHardwareDataType | grep -i \"model name\"",
          { timeout: 3000 }
        ).toString().toLowerCase();
        if (/macbook|notebook|laptop/i.test(raw))       { _chassisCache = "Laptop";  _chassisCacheTime = Date.now(); return "Laptop";  }
        if (/imac|mac pro|mac mini|mac studio/i.test(raw)) { _chassisCache = "Desktop"; _chassisCacheTime = Date.now(); return "Desktop"; }
      } catch (_) {}
    }

    else if (platform === "linux") {
      // Linux: read DMI chassis type from sysfs
      try {
        const raw = execSync(
          "cat /sys/class/dmi/id/chassis_type 2>/dev/null || dmidecode -s chassis-type 2>/dev/null",
          { timeout: 3000 }
        ).toString().trim();
        const n = parseInt(raw, 10);
        if (!isNaN(n)) {
          if (LAPTOP_TYPES.has(n))  { _chassisCache = "Laptop";  _chassisCacheTime = Date.now(); return "Laptop";  }
          if (TABLET_TYPES.has(n))  { _chassisCache = "Tablet";  _chassisCacheTime = Date.now(); return "Tablet";  }
          if (SERVER_TYPES.has(n))  { _chassisCache = "Server";  _chassisCacheTime = Date.now(); return "Server";  }
          if (DESKTOP_TYPES.has(n)) { _chassisCache = "Desktop"; _chassisCacheTime = Date.now(); return "Desktop"; }
        }
      } catch (_) {}
    }

  } catch (err) {
    if (DEBUG) console.log("[ActivityLogger] chassis detection error:", err.message);
  }

  // Could not determine — return null (UI can show "Desktop" as fallback)
  _chassisCache     = null;
  _chassisCacheTime = Date.now();
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * fetchCurrentUserFromServer
 *
 * Calls /api/current-user on the same Express server (localhost) to get
 * real Windows OS data via Node's os module — username, hostname, OS release,
 * CPU, memory, architecture. No frontend changes needed.
 *
 * Uses a short 2-second timeout so it never blocks the activity log insert.
 * Result is cached for 60 seconds to avoid hammering the endpoint on
 * every single log call.
 * ───────────────────────────────────────────────────────────────────────────── */
let _osDataCache     = null;
let _osDataCacheTime = 0;
const OS_CACHE_TTL_MS = 60_000; // 60 seconds

async function fetchCurrentUserFromServer() {
  // Return cached value if still fresh
  if (_osDataCache && (Date.now() - _osDataCacheTime) < OS_CACHE_TTL_MS) {
    return _osDataCache;
  }

  return new Promise((resolve) => {
    // Build the URL — use SERVER_INTERNAL_URL env var if set, else localhost
    const rawUrl  = process.env.SERVER_INTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`;
    const fullUrl = `${rawUrl}/api/current-user`;
    const isHttps = fullUrl.startsWith("https");
    const client  = isHttps ? https : http;

    let settled = false;
    const done  = (val) => { if (!settled) { settled = true; resolve(val); } };

    // 2-second hard timeout
    const timer = setTimeout(() => {
      if (DEBUG) console.log("[ActivityLogger] /api/current-user timeout");
      done(null);
    }, 2000);

    const reqHttp = client.get(fullUrl, { timeout: 2000 }, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        clearTimeout(timer);
        try {
          const json = JSON.parse(raw);
          const platform = json.system?.platform || null;
          const release  = json.system?.release  || null;

          // Determine Windows version from build number (most reliable method)
          // Windows 11 build >= 22000;  Windows 10 build < 22000
          let windowsVersion = null;
          let platformVersion = null;
          if (platform === "win32" && release) {
            const build = parseInt((release.split(".")[2] || "0"), 10);
            windowsVersion  = build >= 22000 ? "Windows 11" : "Windows 10";
            platformVersion = build >= 22000 ? "13.0.0"     : "0.1.0";
          }

          // ── Extract MAC address and machine IP from networkInterfaces ──
          // networkInterfaces is sent as: { eth0: [{address, mac, family},...], ... }
          let mac_address  = null;
          let machine_ip   = null;
          const nets = json.system?.networkInterfaces || {};
          for (const ifaceName of Object.keys(nets)) {
            // Skip loopback interfaces (lo, Loopback, etc.)
            if (/loopback|lo$/i.test(ifaceName)) continue;
            for (const iface of (nets[ifaceName] || [])) {
              // Skip internal (127.x) and link-local (169.254.x) addresses
              if (iface.internal) continue;
              if (iface.address?.startsWith("169.254")) continue;
              // Prefer IPv4
              if (iface.family === "IPv4" || iface.family === 4) {
                if (!machine_ip)  machine_ip  = iface.address;
                if (!mac_address && iface.mac && iface.mac !== "00:00:00:00:00:00") {
                  mac_address = iface.mac.toUpperCase();
                }
              }
              // Fallback to IPv6 if no IPv4 found yet
              if (!machine_ip && (iface.family === "IPv6" || iface.family === 6) && !iface.internal) {
                machine_ip = iface.address;
              }
            }
            if (machine_ip && mac_address) break; // found both, stop scanning
          }

          const result = {
            windows_username:  json.username              || null,
            computer_name:     json.system?.hostname      || null,
            homedir:           json.homedir               || null,
            os_platform_raw:   platform,
            platform:          platform === "win32" ? "Windows"
                             : platform === "darwin" ? "macOS"
                             : platform === "linux"  ? "Linux"
                             : platform,
            os_release:        release,
            windows_version:   windowsVersion,
            platform_version:  platformVersion,
            architecture:      json.system?.arch          || null,
            total_mem_mb:      json.system?.totalMem
                               ? String(Math.round(json.system.totalMem / 1048576))
                               : null,
            free_mem_mb:       json.system?.freeMem
                               ? String(Math.round(json.system.freeMem / 1048576))
                               : null,
            cpu_model:         Array.isArray(json.system?.cpus) && json.system.cpus.length > 0
                               ? [...new Set(json.system.cpus)][0]
                               : null,
            mac_address,                     // from os.networkInterfaces()
            machine_ip,                      // real LAN IP of the machine (not ::1 loopback)
            chassis_type: getChassisType(),  // "Laptop" | "Desktop" | "Tablet" | "Server" | null
          };

          // Cache the result
          _osDataCache     = result;
          _osDataCacheTime = Date.now();
          done(result);
        } catch (parseErr) {
          if (DEBUG) console.log("[ActivityLogger] /api/current-user parse error:", parseErr.message);
          done(null);
        }
      });
    });

    reqHttp.on("error", (err) => {
      clearTimeout(timer);
      if (DEBUG) console.log("[ActivityLogger] /api/current-user error:", err.message);
      done(null);
    });
    reqHttp.on("timeout", () => { reqHttp.destroy(); done(null); });
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * buildEnrichedMeta
 *
 * Field priority for EVERY field:
 *   1. reqMeta snapshot value   ← pre-captured before req can become null
 *   2. Live req header / property
 *   3. null
 *
 * This is critical for the approval path where req is null inside closures.
 * masterApprovalHelper snapshots all headers eagerly and passes them as
 * reqMeta fields, so they survive even when req = null.
 * ───────────────────────────────────────────────────────────────────────────── */
async function buildEnrichedMeta(reqMeta = {}) {
  const req = reqMeta.req;

  // IP — proxy-aware
  // Priority: explicit reqMeta.ip → x-forwarded-for → socket remoteAddress
  // If the result is loopback (::1 / 127.0.0.1), replace with the machine's
  // real LAN IP from os.networkInterfaces() via /api/current-user.
  const forwardedFor = (req?.headers?.["x-forwarded-for"] || "").split(",").shift()?.trim() || null;
  const rawIp        = reqMeta.ip ?? forwardedFor ?? req?.socket?.remoteAddress ?? req?.connection?.remoteAddress ?? null;

  // Fetch OS info + GeoIP in parallel — neither blocks the other
  const [osInfo, geoRaw] = await Promise.all([
    fetchCurrentUserFromServer(),
    fetchGeoLocation(rawIp),   // uses machine_ip fallback internally for private IPs
  ]);

  // Resolve final IP: if rawIp is loopback, use the machine's real LAN IP from osInfo
  const isLoopback = !rawIp || rawIp === "::1" || rawIp === "127.0.0.1" || rawIp.startsWith("::ffff:127.");
  const ip         = isLoopback && osInfo?.machine_ip ? osInfo.machine_ip : (rawIp || null);

  // User-Agent — use os-derived platform_version first (most accurate for Win10/11)
  const ua              = reqMeta.userAgent ?? req?.get?.("User-Agent") ?? null;
  const platformVersion = osInfo?.platform_version
    ?? reqMeta.platform_version
    ?? req?.headers?.["sec-ch-ua-platform-version"]?.replace(/"/g, "")
    ?? req?.headers?.["x-platform-version"]
    ?? null;
  const uaParsed = parseUserAgent(ua, platformVersion);

  // Windows login / device data — merge: os-API wins over Client Hints headers
  const winDataFromHeaders = extractWindowsLoginData(req, reqMeta);
  const winData = {
    ...winDataFromHeaders,
    // os-API fields override header-based ones where available
    windows_username: osInfo?.windows_username ?? winDataFromHeaders.windows_username,
    computer_name:    osInfo?.computer_name    ?? winDataFromHeaders.computer_name,
    platform:         osInfo?.platform         ?? winDataFromHeaders.platform,
    platform_version: osInfo?.platform_version ?? winDataFromHeaders.platform_version,
    windows_version:  osInfo?.windows_version  ?? winDataFromHeaders.windows_version,
    os_release:       osInfo?.os_release       ?? winDataFromHeaders.os_release,
    os_platform_raw:  osInfo?.os_platform_raw  ?? winDataFromHeaders.os_platform_raw,
    architecture:     osInfo?.architecture     ?? winDataFromHeaders.architecture,
    total_mem_mb:     osInfo?.total_mem_mb     ?? winDataFromHeaders.total_mem_mb,
    free_mem_mb:      osInfo?.free_mem_mb      ?? winDataFromHeaders.free_mem_mb,
    cpu_model:        osInfo?.cpu_model        ?? winDataFromHeaders.cpu_model,
    homedir:          osInfo?.homedir          ?? winDataFromHeaders.homedir,
    mac_address:      osInfo?.mac_address      ?? winDataFromHeaders.mac_address,  // from os.networkInterfaces()
    machine_ip:       osInfo?.machine_ip       ?? null,                            // real LAN IP
  };

  // Geolocation — priority: explicit reqMeta → x-lat/lng headers → ip-api.com result
  const latitude  = reqMeta.latitude  != null ? reqMeta.latitude
                  : req?.headers?.["x-lat"] != null ? Number(req.headers["x-lat"])
                  : geoRaw?.latitude  ?? null;
  const longitude = reqMeta.longitude != null ? reqMeta.longitude
                  : req?.headers?.["x-lng"] != null ? Number(req.headers["x-lng"])
                  : geoRaw?.longitude ?? null;
  const geo_city        = geoRaw?.city         ?? null;
  const geo_region      = geoRaw?.region       ?? null;
  const geo_country     = geoRaw?.country      ?? null;
  const geo_country_code= geoRaw?.country_code ?? null;
  const geo_timezone    = geoRaw?.timezone     ?? null;
  const geo_isp         = geoRaw?.isp          ?? null;
  const geo_org         = geoRaw?.org          ?? null;
  const geo_public_ip   = geoRaw?.public_ip    ?? null;

  // Subscription — snapshot wins, then x-subscription header, then req.user
  const subscription = reqMeta.subscription
    ?? req?.headers?.["x-subscription"]
    ?? req?.user?.subscription
    ?? null;

  // ── server_ip: prefer env var, fallback to os.hostname() resolved via DNS ──
  const server_ip = reqMeta.server_ip ?? process.env.SERVER_IP ?? osInfo?.machine_ip ?? null;

  // ── device_type: chassis WMI wins (accurate Laptop/Desktop) → UA fallback (Mobile/Tablet) ──
  // UA string cannot distinguish Laptop from Desktop — both report identical UA.
  // WMI ChassisTypes (via /api/current-user) gives the real hardware form factor.
  const device_type = reqMeta.device_type
    ?? req?.headers?.["x-device-type"]
    ?? osInfo?.chassis_type       // "Laptop" | "Desktop" | "Tablet" | "Server"
    ?? uaParsed.device_type       // fallback: "Mobile" | "Tablet" | "Desktop" from UA
    ?? null;

  return {
    ip_address:           ip,
    server_ip,
    user_agent:           ua,
    browser:              uaParsed.browser,
    browser_version:      uaParsed.browser_version ?? null,
    os:                   uaParsed.os,
    device_id:            reqMeta.device_id ?? req?.headers?.["x-device-id"] ?? null,
    device_type,
    mac_address:          winData.mac_address   ?? reqMeta.mac_address ?? req?.headers?.["x-mac-address"] ?? null,
    computer_name:        winData.computer_name ?? reqMeta.computer_name ?? req?.headers?.["x-computer-name"] ?? null,
    latitude,
    longitude,
    // location: explicit value wins, else build from city + region + country
    location:             reqMeta.location
                          ?? req?.headers?.["x-location"]
                          ?? (geo_city ? [geo_city, geo_region, geo_country].filter(Boolean).join(", ") : null),
    geo_city,
    geo_region,
    geo_country,
    geo_country_code,
    geo_timezone,
    geo_isp,
    geo_org,
    geo_public_ip,
    app_version:          reqMeta.app_version ?? req?.headers?.["x-app-version"] ?? null,
    source:               reqMeta.source      ?? req?.headers?.["x-source"]      ?? "web",
    subscription,
    plant_id:             reqMeta.plant_id ?? req?.user?.plant_id ?? null,
    transaction_id:       reqMeta.transaction_id ?? req?.headers?.["x-transaction-id"] ?? null,
    referrer:             req?.headers?.["referer"] ?? req?.headers?.["referrer"] ?? null,
    endpoint:             req ? `${req.method} ${req.originalUrl}` : null,
    timestamp:            new Date().toISOString(),
    // ── Windows / OS enrichment (from /api/current-user server-side call) ──
    platform:             winData.platform,
    platform_version:     winData.platform_version,
    ua_full_version_list: winData.ua_full_version_list,
    device_model:         winData.device_model,
    windows_username:     winData.windows_username,
    windows_domain:       winData.windows_domain,
    windows_version:      winData.windows_version,
    computer_name:        winData.computer_name,
    os_release:           winData.os_release,
    os_platform_raw:      winData.os_platform_raw,
    total_mem_mb:         winData.total_mem_mb,
    free_mem_mb:          winData.free_mem_mb,
    cpu_model:            winData.cpu_model,
    homedir:              winData.homedir,
    architecture:         winData.architecture,
    bitness:              winData.bitness,
    timezone:             winData.timezone,
    language:             winData.language,
    screen_resolution:    winData.screen_resolution,
    connection_type:      winData.connection_type,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Core logActivity
 * ───────────────────────────────────────────────────────────────────────────── */
async function logActivity({
  userId,
  performedByRole      = null,
  module,
  module_id            = null,
  tableName,
  recordId,
  action,
  actionType           = null,
  oldValue             = null,
  newValue             = null,
  comments             = "",
  approveStatus        = null,
  approvedBy           = null,
  requestTransactionId = null,
  reqMeta              = {},
  options              = {},
}) {
  action = typeof action === "string" ? action.toLowerCase() : action;

  const dedupKey = buildDedupKey({ userId, module, tableName, recordId, action, reqMeta });
  if (isDuplicateAndMark(dedupKey)) return null;
  if (process.env.ACTIVITY_LOG_DRY_RUN === "true") return null;

  const sanitizeExtras = Array.isArray(options.sanitizeExtraKeys) ? options.sanitizeExtraKeys : [];
  const safeOld        = oldValue ? sanitizeObject(oldValue, { extra: sanitizeExtras }) : null;
  const safeNew        = newValue ? sanitizeObject(newValue, { extra: sanitizeExtras }) : null;
  const changes        = safeOld && safeNew ? diffObjects(safeOld, safeNew) : null;

  const meta              = await buildEnrichedMeta(reqMeta);
  const performed_by      = userId ?? reqMeta.userId ?? null;
  const performed_by_role = performedByRole ?? reqMeta.role ?? null;

  if (DEBUG) {
    console.log("[DEBUG] logActivity:", { dedupKey, action, module, tableName, performed_by, meta });
  }

  // Full JSONB blob — complete audit record
  const details = safeStringify({
    user_id:                performed_by,
    performed_by_role,
    module,
    tableName,
    recordId,
    action,
    action_type:            actionType,
    old_value:              safeOld,
    new_value:              safeNew,
    changes,
    approve_status:         approveStatus,
    approved_by:            approvedBy,
    request_transaction_id: requestTransactionId,
    comments,
    ...meta,
  });

  const insertData = {
    transaction_id:          meta.transaction_id,
    user_id:                 performed_by,
    plant_id:                meta.plant_id,
    module_id,
    table_name:              tableName,
    record_id:               recordId == null ? null : String(recordId),
    action:                  action ?? null,
    action_type:             actionType ?? null,
    old_value:               safeOld ? safeStringify(safeOld) : null,
    new_value:               safeNew ? safeStringify(safeNew) : null,
    changes:                 changes ? safeStringify(changes) : null,
    action_performed_by:     performed_by,
    performed_by_role,
    approve_status:          approveStatus ?? null,
    approved_by:             approvedBy    ?? null,
    request_transaction_id:  requestTransactionId ?? null,
    comments:                comments || null,
    ip_address:              meta.ip_address,
    server_ip:               meta.server_ip,
    user_agent:              meta.user_agent,
    browser:                 meta.browser,
    browser_version:         meta.browser_version      ?? null,
    device:                  meta.windows_version ?? meta.os,
    device_id:               meta.device_id,
    device_type:             meta.device_type,
    mac_address:             meta.mac_address,
    computer_name:           meta.computer_name,
    latitude:                meta.latitude,
    longitude:               meta.longitude,
    location:                meta.location,
    geo_city:                meta.geo_city          ?? null,
    geo_region:              meta.geo_region        ?? null,
    geo_country:             meta.geo_country       ?? null,
    geo_country_code:        meta.geo_country_code  ?? null,
    geo_timezone:            meta.geo_timezone      ?? null,
    geo_isp:                 meta.geo_isp           ?? null,
    geo_org:                 meta.geo_org           ?? null,
    geo_public_ip:           meta.geo_public_ip     ?? null,
    app_version:             meta.app_version,
    source:                  meta.source,
    subscription:            meta.subscription,
    // Windows / Client Hints / os-module fields
    platform:                meta.platform             ?? null,
    platform_version:        meta.platform_version     ?? null,
    ua_full_version_list:    meta.ua_full_version_list ?? null,
    device_model:            meta.device_model         ?? null,
    windows_username:        meta.windows_username     ?? null,
    windows_domain:          meta.windows_domain       ?? null,
    windows_version:         meta.windows_version      ?? null,
    computer_name:           meta.computer_name        ?? null,
    os_release:              meta.os_release           ?? null,
    os_platform_raw:         meta.os_platform_raw      ?? null,
    total_mem_mb:            meta.total_mem_mb         ?? null,
    free_mem_mb:             meta.free_mem_mb          ?? null,
    cpu_model:               meta.cpu_model            ?? null,
    homedir:                 meta.homedir              ?? null,
    architecture:            meta.architecture         ?? null,
    bitness:                 meta.bitness              ?? null,
    timezone:                meta.timezone             ?? null,
    language:                meta.language             ?? null,
    screen_resolution:       meta.screen_resolution    ?? null,
    connection_type:         meta.connection_type      ?? null,
    details,
  };
console.log("insert data",insertData);
  const cols         = Object.keys(insertData);
  const sqlValues    = [];
  const placeholders = [];
  let   paramIndex   = 1;

  for (const col of cols) {
    placeholders.push(`$${paramIndex++}`);
    sqlValues.push(insertData[col]);
  }

  const allCols         = [...cols, "date_time_ist", "created_on"];
  const allPlaceholders = [...placeholders, "NOW()", "NOW()"];

  try {
    const r = await pool.query(
      `INSERT INTO activity_log (${allCols.join(",")}) VALUES (${allPlaceholders.join(",")}) RETURNING id`,
      sqlValues
    );
    if (DEBUG) console.log(`[DEBUG] Inserted activity_log id: ${r.rows?.[0]?.id}`);
    return r.rows?.[0]?.id ?? null;
  } catch (err) {
    console.error("[ACTIVITY LOG ERROR]", err);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * logLogin
 *
 * Call after successful authentication.
 * subscription should be `${user.plant_id}+${user.location}` (e.g. "9+Mumbai, MH")
 *
 * @example
 * await logLogin({ userId: user.id, performedByRole: user.role,
 *                  subscription: `${user.plant_id}+${user.location}`, req });
 * ───────────────────────────────────────────────────────────────────────────── */
async function logLogin({ userId, performedByRole, subscription, token, req, extra = {} }) {
  // extra.requestTransactionId = loginTxnId from authController
  // This links the activity_log row back to user_login_log via request_transaction_id
  return logActivity({
    userId,
    performedByRole,
    module:    MODULE.AUTH,
    tableName: "user_master",
    recordId:  userId,
    action:    ACTION.LOGIN,
    actionType:"auth",
    comments:  "User logged in",
    // requestTransactionId links this row to user_login_log.transaction_id
    requestTransactionId: extra.requestTransactionId ?? null,
    // Never store raw token — store only a masked 8-char hint
    newValue:  { login: true, token_hint: token ? `${token.substring(0, 8)}…` : null },
    reqMeta: {
      req,
      ip:            req?.ip,
      userAgent:     req?.get?.("User-Agent"),
      subscription,
      plant_id:      req?.user?.plant_id,
      device_id:     req?.headers?.["x-device-id"],
      device_type:   req?.headers?.["x-device-type"],
      mac_address:   req?.headers?.["x-mac-address"],
      computer_name: req?.headers?.["x-computer-name"],
      latitude:      extra.latitude  ?? (req?.headers?.["x-lat"] != null ? Number(req.headers["x-lat"]) : null),
      longitude:     extra.longitude ?? (req?.headers?.["x-lng"] != null ? Number(req.headers["x-lng"]) : null),
      location:      extra.location  ?? req?.headers?.["x-location"] ?? null,
      app_version:   req?.headers?.["x-app-version"],
      source:        req?.headers?.["x-source"] ?? "web",
      server_ip:     process.env.SERVER_IP,
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * logLogout
 * ───────────────────────────────────────────────────────────────────────────── */
async function logLogout({ userId, performedByRole, subscription, req }) {
  return logActivity({
    userId,
    performedByRole,
    module:    MODULE.AUTH,
    tableName: "user_master",
    recordId:  userId,
    action:    ACTION.LOGOUT,
    actionType:"auth",
    comments:  "User logged out",
    reqMeta: {
      req,
      ip:            req?.ip,
      userAgent:     req?.get?.("User-Agent"),
      subscription,
      plant_id:      req?.user?.plant_id,
      device_id:     req?.headers?.["x-device-id"],
      mac_address:   req?.headers?.["x-mac-address"],
      computer_name: req?.headers?.["x-computer-name"],
      latitude:      req?.headers?.["x-lat"] != null ? Number(req.headers["x-lat"]) : null,
      longitude:     req?.headers?.["x-lng"] != null ? Number(req.headers["x-lng"]) : null,
      location:      req?.headers?.["x-location"] ?? null,
      app_version:   req?.headers?.["x-app-version"],
      source:        req?.headers?.["x-source"] ?? "web",
      server_ip:     process.env.SERVER_IP,
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * logCrud
 *
 * Supports TWO calling patterns:
 *
 * Pattern A — Live request (submit, direct save, reject):
 *   await logCrud({ userId, module, tableName, action, oldValue, newValue, req });
 *   → req is present, headers are read live.
 *
 * Pattern B — Approve path (req may be null inside commitLog closures):
 *   await logCrud({
 *     userId, module, tableName, action, oldValue, newValue,
 *     req:           reqMeta.req,
 *     subscription:  reqMeta.subscription,
 *     ip:            reqMeta.ip,
 *     latitude:      reqMeta.latitude,
 *     longitude:     reqMeta.longitude,
 *     location:      reqMeta.location,
 *     device_id:     reqMeta.device_id,
 *     device_type:   reqMeta.device_type,
 *     mac_address:   reqMeta.mac_address,
 *     computer_name: reqMeta.computer_name,
 *     plant_id:      reqMeta.plant_id,
 *     app_version:   reqMeta.app_version,
 *     source:        reqMeta.source,
 *     requestTransactionId: inserted.transaction_id,   // e.g. "APP0000001"
 *   });
 *   → Pre-snapshotted fields always take priority over live req reads.
 *
 * ───────────────────────────────────────────────────────────────────────────── */
async function logCrud({
  userId,
  performedByRole,
  module,
  tableName,
  recordId,
  action,
  oldValue,
  newValue,
  approveStatus,
  approvedBy,
  comments,
  // Both accepted; requestTransactionId preferred (e.g. "APP0000001" / "ROLE000018")
  transactionId,
  requestTransactionId,
  // Live req object
  req,
  // ── Pre-snapshotted fields from masterApprovalHelper reqMeta ──────────────
  // Passed explicitly so they survive when req = null on the approve path.
  // Each one wins over the equivalent live req header read.
  subscription   = null,
  ip             = null,
  latitude       = null,
  longitude      = null,
  location       = null,
  device_id      = null,
  device_type    = null,
  mac_address    = null,
  computer_name  = null,
  plant_id       = null,
  app_version    = null,
  source         = null,
}) {
  return logActivity({
    userId,
    performedByRole,
    module,
    tableName,
    recordId,
    action,
    actionType:           "crud",
    oldValue,
    newValue,
    approveStatus,
    approvedBy,
    requestTransactionId: requestTransactionId ?? transactionId ?? null,
    comments,
    reqMeta: {
      req,
      // Network — snapshot wins
      ip:            ip            ?? req?.ip                           ?? null,
      userAgent:     req?.get?.("User-Agent")                          ?? null,
      server_ip:     process.env.SERVER_IP                             ?? null,
      // Tenant — snapshot wins
      subscription:  subscription  ?? req?.user?.subscription          ?? null,
      plant_id:      plant_id      ?? req?.user?.plant_id              ?? null,
      // Device — snapshot wins
      device_id:     device_id     ?? req?.headers?.["x-device-id"]    ?? null,
      device_type:   device_type   ?? req?.headers?.["x-device-type"]  ?? null,
      mac_address:   mac_address   ?? req?.headers?.["x-mac-address"]  ?? null,
      computer_name: computer_name ?? req?.headers?.["x-computer-name"] ?? null,
      // Geolocation — snapshot wins; fallback to x-lat/x-lng headers (NOT body)
      latitude:      latitude  != null ? latitude  : (req?.headers?.["x-lat"] != null ? Number(req.headers["x-lat"]) : null),
      longitude:     longitude != null ? longitude : (req?.headers?.["x-lng"] != null ? Number(req.headers["x-lng"]) : null),
      location:      location  ?? req?.headers?.["x-location"]         ?? null,
      // App — snapshot wins
      app_version:   app_version   ?? req?.headers?.["x-app-version"]  ?? null,
      source:        source        ?? req?.headers?.["x-source"]       ?? "web",
      // Transaction
      transaction_id: req?.headers?.["x-transaction-id"]               ?? null,
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * logTaskOrRequest
 * For task open, close, user request, task request events.
 * ───────────────────────────────────────────────────────────────────────────── */
async function logTaskOrRequest({
  userId,
  performedByRole,
  module = MODULE.TASK_CLOSE,
  tableName,
  recordId,
  action,
  oldValue,
  newValue,
  approveStatus,
  approvedBy,
  requestTransactionId,
  subscription,
  req,
  comments,
}) {
  return logActivity({
    userId,
    performedByRole,
    module,
    tableName,
    recordId,
    action,
    actionType:          "task",
    oldValue,
    newValue,
    approveStatus,
    approvedBy,
    requestTransactionId,
    comments,
    reqMeta: {
      req,
      ip:            req?.ip,
      userAgent:     req?.get?.("User-Agent"),
      subscription:  subscription ?? req?.user?.subscription ?? null,
      plant_id:      req?.user?.plant_id,
      device_id:     req?.headers?.["x-device-id"],
      mac_address:   req?.headers?.["x-mac-address"],
      computer_name: req?.headers?.["x-computer-name"],
      latitude:      req?.headers?.["x-lat"] != null ? Number(req.headers["x-lat"]) : null,
      longitude:     req?.headers?.["x-lng"] != null ? Number(req.headers["x-lng"]) : null,
      location:      req?.headers?.["x-location"] ?? null,
      app_version:   req?.headers?.["x-app-version"],
      source:        req?.headers?.["x-source"] ?? "web",
      server_ip:     process.env.SERVER_IP,
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Middleware (auto-log HTTP methods)
 * ───────────────────────────────────────────────────────────────────────────── */
function activityLoggerMiddleware(opts = {}) {
  const {
    autoLogMethods    = ["POST", "PUT", "DELETE"],
    autoLogPaths      = null,
    sanitizeExtraKeys = [],
    attachToReqName   = "logActivity",
    autoLog           = true,
  } = opts;

  return function (req, res, next) {
    // Attach manual logger to req so controllers can call req.logActivity({...})
    req[attachToReqName] = async function (params = {}) {
      const final = {
        ...params,
        reqMeta: {
          ip:            req.ip,
          userAgent:     req.get?.("User-Agent"),
          req,
          userId:        req.user?.id ?? req.user?.userId,
          role:          req.user?.role ?? req.user?.roles ?? null,
          plant_id:      req.user?.plant_id,
          subscription:  req.user?.subscription,
          device_id:     req.headers?.["x-device-id"],
          mac_address:   req.headers?.["x-mac-address"],
          computer_name: req.headers?.["x-computer-name"],
          latitude:      req.headers?.["x-lat"] != null ? Number(req.headers["x-lat"]) : null,
          longitude:     req.headers?.["x-lng"] != null ? Number(req.headers["x-lng"]) : null,
          location:      req.headers?.["x-location"] ?? null,
          app_version:   req.headers?.["x-app-version"],
          source:        req.headers?.["x-source"],
          server_ip:     process.env.SERVER_IP,
          ...params.reqMeta,
        },
      };
      final.userId = final.userId ?? final.reqMeta.userId ?? null;
      return logActivity(final);
    };

    if (!autoLog || !autoLogMethods.includes(req.method)) return next();
    if (
      Array.isArray(autoLogPaths) && autoLogPaths.length > 0 &&
      !autoLogPaths.some(p => p instanceof RegExp ? p.test(req.path) : req.path.includes(p))
    ) return next();

    res.on("finish", async () => {
      try {
        await req[attachToReqName]({
          userId:          req.user?.id ?? req.user?.userId,
          performedByRole: req.user?.role ?? req.user?.roles,
          module:          req.baseUrl?.split("/").filter(Boolean).join("_") ?? "http",
          tableName:       req.path?.split("/").filter(Boolean)[0] ?? null,
          recordId:        req.params?.id ?? req.params?.recordId ?? null,
          action:          req.method.toLowerCase(),
          actionType:      "crud",
          oldValue:        req.oldResource ? sanitizeObject(req.oldResource, { extra: sanitizeExtraKeys }) : null,
          newValue:        req.body        ? sanitizeObject(req.body,        { extra: sanitizeExtraKeys }) : null,
          comments:        `HTTP ${req.method} ${req.originalUrl} → ${res.statusCode}`,
          options:         { sanitizeExtraKeys },
        });
      } catch (e) { console.warn("[ACTIVITY LOG AUTO-LOG ERROR]", e); }
    });

    return next();
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * getActivityLogs — paginated query endpoint
 * ───────────────────────────────────────────────────────────────────────────── */
async function getActivityLogs(req, res) {
  try {
    const {
      module, action, actionType, userId, role, tableName,
      q, page = 1, perPage = 25, from, to,
      sort = "date_time_ist", order = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10)    || 1);
    const limit   = Math.max(1, Math.min(200, parseInt(perPage, 10) || 25));
    const offset  = (pageNum - 1) * limit;

    const wheres = [], vals = [];
    let idx = 1;
    if (module)     { wheres.push(`module=$${idx++}`);             vals.push(module); }
    if (action)     { wheres.push(`action=$${idx++}`);             vals.push(action); }
    if (actionType) { wheres.push(`action_type=$${idx++}`);        vals.push(actionType); }
    if (userId)     { wheres.push(`(action_performed_by=$${idx} OR user_id=$${idx})`); idx++; vals.push(userId); }
    if (role)       { wheres.push(`performed_by_role=$${idx++}`);  vals.push(role); }
    if (tableName)  { wheres.push(`table_name=$${idx++}`);         vals.push(tableName); }
    if (from)       { wheres.push(`date_time_ist >= $${idx++}`);   vals.push(from); }
    if (to)         { wheres.push(`date_time_ist <= $${idx++}`);   vals.push(to); }
    if (q)          { wheres.push(`(COALESCE(details::text,'') ILIKE $${idx++})`); vals.push(`%${q}%`); }

    const whereSql  = wheres.length ? `WHERE ${wheres.join(" AND ")}` : "";
    const countRes  = await pool.query(`SELECT COUNT(*)::int AS total FROM activity_log ${whereSql}`, vals);
    const total     = countRes.rows?.[0]?.total ?? 0;

    const allowedSort = ["date_time_ist", "created_on", "id"];
    const sortCol     = allowedSort.includes(sort) ? sort : "date_time_ist";
    const ord         = order?.toLowerCase() === "asc" ? "ASC" : "DESC";

    vals.push(limit, offset);
    const dataRes = await pool.query(
      `SELECT * FROM activity_log ${whereSql} ORDER BY ${sortCol} ${ord} LIMIT $${idx++} OFFSET $${idx++}`,
      vals
    );

    return res.json({
      meta: { total, page: pageNum, perPage: limit, pages: Math.ceil(total / limit) },
      data: dataRes.rows,
    });
  } catch (err) {
    console.error("[ACTIVITY LOG LIST ERROR]", err);
    return res.status(500).json({ error: "Failed to fetch activity logs" });
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Exports
 * ───────────────────────────────────────────────────────────────────────────── */
module.exports = {
  logActivity,
  logLogin,
  logLogout,
  logCrud,
  logTaskOrRequest,
  activityLoggerMiddleware,
  getActivityLogs,
  diffObjects,
  safeStringify,
  sanitizeObject,
  buildEnrichedMeta,
  extractWindowsLoginData,
  fetchCurrentUserFromServer,
  ACTION,
  MODULE,
};