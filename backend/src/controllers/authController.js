/**
 * authController.js
 *
 * Security features:
 *   1. AD auth — fixed: timeout, tlsOptions, distinguishes bad_password vs unreachable
 *   2. Default password ONLY when AD is disabled (USE_AD_AUTH != "true")
 *      OR when AD is unreachable AND ALLOW_DEFAULT_FALLBACK="true" explicitly set
 *   3. Single active session per user — new login kills the old session first
 *   4. Logout closes exactly one session by transaction_id (idempotent)
 *   5. Inactivity timeout — /api/auth/heartbeat extends the session;
 *      background sweeper kills sessions idle > 10 min
 *   6. Full audit trail via logLogin / logLogout
 */

const jwt             = require("jsonwebtoken");
const db              = require("../config/db");
const ActiveDirectory = require("activedirectory2");
const { logLogin, logLogout } = require("../utils/activityLogger");

/* ─────────────────────────────────────────────────────────────────────────────
 * ENV / constants
 * ───────────────────────────────────────────────────────────────────────────── */
const AD_SERVER        = process.env.AD_SERVER;
const AD_USER          = process.env.AD_USER;
const AD_PASSWORD      = process.env.AD_PASSWORD;
const AD_DOMAIN        = process.env.AD_DOMAIN;         // e.g. "UNIWIN"
const AD_BASE_DN       = process.env.AD_BASE_DN || "DC=uniwin,DC=local";
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || "Admin@123";
const USE_AD_AUTH      = process.env.USE_AD_AUTH === "true";
const ALLOW_FALLBACK   = process.env.ALLOW_DEFAULT_FALLBACK === "true";
const JWT_EXPIRES      = "8h";

/* ─────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────────────────────────────────────── */
function logDebug(...args) {
  if (process.env.NODE_ENV !== "production") console.log("[AUTH DEBUG]", ...args);
}

function getClientInfo(req) {
  return {
    ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
      || req.socket?.remoteAddress
      || null,
    device: req.headers["user-agent"] || "UNKNOWN",
  };
}

const txnId = () => `USRL${Date.now()}`;

/* ─────────────────────────────────────────────────────────────────────────────
 * AD Authentication — fixed version
 *
 * WHY AD WAS SILENTLY FAILING (original bugs):
 *   1. No connectTimeout/timeout  → library hangs, catch triggers, falls to default pwd
 *   2. No tlsOptions              → self-signed internal CA throws, catch triggers
 *   3. All errors treated equally → "wrong password" and "server down" both set
 *                                   authenticated=false and THEN the default-password
 *                                   check ran, so Admin@123 always worked
 *   4. baseDN hardcoded           → if env didn't match, lookup fails silently
 *   5. Error only sent to logDebug → never visible in production logs
 *
 * Returns:
 *   { ok: true }                           — AD accepted
 *   { ok: false, reason: "bad_password" }  — AD explicitly rejected
 *   { ok: false, reason: "unreachable" }   — network / config / timeout
 * ───────────────────────────────────────────────────────────────────────────── */
async function authenticateWithAD(username, password) {
  if (!AD_SERVER || !AD_USER || !AD_PASSWORD || !AD_DOMAIN) {
    console.warn("[AD] AD not fully configured — check AD_SERVER, AD_USER, AD_PASSWORD, AD_DOMAIN env vars");
    return { ok: false, reason: "not_configured" };
  }

  const ad = new ActiveDirectory({
    url:      AD_SERVER,
    baseDN:   AD_BASE_DN,
    username: AD_USER,
    password: AD_PASSWORD,
    // FIX 1 — hard timeouts so the library never hangs indefinitely
    connectTimeout: 5000,
    timeout:        8000,
    // FIX 2 — allow self-signed internal CA certs (common on corp networks)
    tlsOptions: { rejectUnauthorized: false },
  });

  // Try both DOMAIN\user and user@domain.local formats
  const candidates = [
    `${AD_DOMAIN}\\${username}`,
    `${username}@${AD_DOMAIN}.local`,
  ];

  for (const adUser of candidates) {
    const result = await new Promise((resolve) => {
      // FIX 3 — belt-and-suspenders timeout wrapper (library may ignore its own timeout)
      const safetyTimer = setTimeout(() => {
        console.warn(`[AD] Hard timeout hit for ${adUser}`);
        resolve({ ok: false, reason: "unreachable", error: "timeout" });
      }, 9500);

      ad.authenticate(adUser, password, (err, auth) => {
        clearTimeout(safetyTimer);

        if (err) {
          // FIX 4 — distinguish "wrong password" from "server down"
          const msg = (err.lde_message || err.message || "").toLowerCase();
          const isBadPassword =
            err.name === "InvalidCredentialsError" ||
            msg.includes("80090308") ||           // LDAP error code for bad credentials
            msg.includes("invalid credentials");

          // FIX 5 — always log to stderr so operators can see it in production
          if (isBadPassword) {
            console.log(`[AD] Credentials rejected for [${adUser}]: ${err.lde_message || err.message}`);
            resolve({ ok: false, reason: "bad_password" });
          } else {
            console.error(`[AD] Unreachable / config error for [${adUser}]: ${err.message || err}`);
            resolve({ ok: false, reason: "unreachable", error: err.message });
          }
          return;
        }

        if (auth) {
          console.log(`[AD] Authentication SUCCESS for [${adUser}]`);
          resolve({ ok: true });
        } else {
          resolve({ ok: false, reason: "bad_password" });
        }
      });
    });

    // Stop at the first definitive answer
    if (result.ok || result.reason === "bad_password") return result;
    // "unreachable" on first format → try next format
  }

  return { ok: false, reason: "unreachable", error: "All AD username formats failed" };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Session helpers
 * ───────────────────────────────────────────────────────────────────────────── */

/** Kill all active sessions for a user — called before creating a new session */
async function killExistingSession(userId) {
  const result = await db.query(
    `UPDATE user_login_log
        SET logout_time = NOW(),
            action      = 'LOGOUT',
            description = 'Session terminated — superseded by new login'
      WHERE user_id     = $1
        AND logout_time IS NULL
      RETURNING transaction_id`,
    [userId]
  );
  if (result.rows.length > 0) {
    logDebug(`Killed ${result.rows.length} existing session(s) for user ${userId}`);
  }
}

/** Insert a new session row, return its transaction_id */
async function createSession(userId, employeeCode, ip, device, location) {
  const tid = txnId();
  // last_activity column: run migration_add_last_activity.sql if this INSERT fails
  await db.query(
    `INSERT INTO user_login_log
       (transaction_id, user_id, employee_code, action, description,
        ip_address, device, success, login_time, location)
     VALUES ($1,$2,$3,'LOGIN','User logged in successfully',$4,$5,true,NOW(),$6)`,
    [tid, userId, employeeCode, ip, device, location || null]
  );
  // Update last_activity separately — safe if column doesn't exist yet
  await db.query(
    `UPDATE user_login_log SET last_activity = NOW() WHERE transaction_id = $1`,
    [tid]
  ).catch(() => {}); // no-op if column missing — run the migration SQL
  return tid;
}

/** Touch last_activity — called by /heartbeat. Returns false if session is dead */
async function touchSession(transactionId) {
  // Try to update last_activity. If the column doesn't exist yet (migration not run),
  // fall back to a plain existence check so heartbeat still works.
  try {
    const r = await db.query(
      `UPDATE user_login_log
          SET last_activity = NOW()
        WHERE transaction_id = $1
          AND logout_time IS NULL
        RETURNING user_id`,
      [transactionId]
    );
    if (r.rowCount > 0) return true;
    // rowCount 0 means session row not found OR already logged out
    return false;
  } catch (err) {
    // Column missing — fall back to existence check only
    if (err.message?.includes('last_activity') || err.code === '42703') {
      console.warn('[AUTH] last_activity column missing — run migration_add_last_activity.sql');
      const r = await db.query(
        `SELECT 1 FROM user_login_log
          WHERE transaction_id = $1 AND logout_time IS NULL`,
        [transactionId]
      );
      return r.rowCount > 0;
    }
    throw err;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Background inactivity sweeper
 * Runs every 60 s — kills any session where last_activity > 10 min ago.
 * ───────────────────────────────────────────────────────────────────────────── */
(function startSweeper() {
  setInterval(async () => {
    try {
      const r = await db.query(
        `UPDATE user_login_log
            SET logout_time = NOW(),
                action      = 'LOGOUT',
                description = 'Auto-logout: inactivity timeout (10 min)'
          WHERE logout_time  IS NULL
            AND last_activity < NOW() - INTERVAL '10 minutes'
          RETURNING transaction_id, user_id`
      );
      if (r.rows.length > 0) {
        logDebug(`Sweeper: auto-closed ${r.rows.length} idle session(s)`);
      }
    } catch (err) {
      console.error("[SWEEPER ERROR]", err.message);
    }
  }, 60_000);
  logDebug("Inactivity sweeper started (10-min idle, checks every 60 s)");
})();

/* ── Startup: verify user_login_log has required columns ─────────────────── */
(async function checkSchema() {
  try {
    const r = await db.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = $1 ORDER BY ordinal_position`,
      ["user_login_log"]
    );
    const cols = r.rows.map(c => c.column_name);
    const required = ["transaction_id","user_id","logout_time","last_activity","login_time"];
    const missing  = required.filter(c => !cols.includes(c));
    if (missing.length) {
      console.error("╔══════════════════════════════════════════════════════════");
      console.error("║ [AUTH] SCHEMA ERROR — user_login_log is missing columns:");
      missing.forEach(c => console.error(`║   ✗ ${c}`));
      console.error("║ Run: migration_add_last_activity.sql");
      console.error("╚══════════════════════════════════════════════════════════");
    } else {
      logDebug("[AUTH] user_login_log schema OK. Columns:", cols.join(", "));
    }
  } catch (err) {
    console.error("[AUTH] Could not verify user_login_log schema:", err.message);
  }
})();

/* ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/login
 * ───────────────────────────────────────────────────────────────────────────── */
exports.login = async (req, res) => {
  const { username, password } = req.body;
  logDebug("Login attempt:", username);

  if (!username || !password)
    return res.status(400).json({ message: "Username and password are required" });

  try {
    /* 1 — Fetch user */
    const { rows } = await db.query(
      "SELECT * FROM user_master WHERE employee_id = $1", [username]
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    user.status = (user.status ?? "").toUpperCase();
    if (user.status !== "ACTIVE")
      return res.status(403).json({ message: "User is not active" });

    /* 2 — Authenticate */
    let authenticated = false;
    let authMethod    = "none";

    if (USE_AD_AUTH) {
      const adResult = await authenticateWithAD(username, password);

      if (adResult.ok) {
        authenticated = true;
        authMethod    = "active_directory";

      } else if (adResult.reason === "bad_password") {
        // AD explicitly refused — NEVER fall through to default password
        const { ip, device } = getClientInfo(req);
        await db.query(
          `INSERT INTO user_login_log
             (transaction_id,employee_code,action,description,ip_address,device,success,login_time)
           VALUES ($1,$2,'LOGIN','Invalid credentials — AD rejected',$3,$4,false,NOW())`,
          [txnId(), username, ip, device]
        );
        return res.status(401).json({ message: "Invalid credentials" });

      } else {
        // AD unreachable — only use default password if ALLOW_DEFAULT_FALLBACK=true
        console.warn(`[AUTH] AD unreachable for ${username}: ${adResult.error}`);
        if (ALLOW_FALLBACK && password === DEFAULT_PASSWORD) {
          authenticated = true;
          authMethod    = "default_fallback";
          console.warn(`[AUTH] Default password fallback used for ${username} (AD down)`);
        } else {
          const { ip, device } = getClientInfo(req);
          await db.query(
            `INSERT INTO user_login_log
               (transaction_id,employee_code,action,description,ip_address,device,success,login_time)
             VALUES ($1,$2,'LOGIN','Login failed — AD unavailable',$3,$4,false,NOW())`,
            [txnId(), username, ip, device]
          );
          return res.status(503).json({
            message: "Authentication service temporarily unavailable. Please try again.",
          });
        }
      }
    } else {
      // AD disabled — only default password
      if (password === DEFAULT_PASSWORD) {
        authenticated = true;
        authMethod    = "default_password";
      }
    }

    if (!authenticated) {
      const { ip, device } = getClientInfo(req);
      await db.query(
        `INSERT INTO user_login_log
           (transaction_id,employee_code,action,description,ip_address,device,success,login_time)
         VALUES ($1,$2,'LOGIN','Invalid credentials',$3,$4,false,NOW())`,
        [txnId(), username, ip, device]
      );
      return res.status(401).json({ message: "Invalid credentials" });
    }

    logDebug(`Auth OK via [${authMethod}] for`, username);

    /* 3 — Kill any existing session (single-session enforcement) */
    await killExistingSession(user.id);

    /* 4 — Create new session */
    const { ip, device } = getClientInfo(req);
    const loginTxnId = await createSession(user.id, user.employee_code, ip, device, user.location);

    /* 5 — Normalize role_id */
    let roleIds = [];
    if (Array.isArray(user.role_id)) roleIds = user.role_id;
    else if (typeof user.role_id === "number") roleIds = [user.role_id];
    else if (typeof user.role_id === "string")
      roleIds = user.role_id.replace(/[{}]/g, "").split(",")
        .map(r => parseInt(r.trim(), 10)).filter(n => !isNaN(n));
    user.role_id = roleIds;

    /* 6 — Roles */
    const roleResult = await db.query(
      `SELECT id, role_name, description, status FROM role_master WHERE id = ANY($1)`,
      [roleIds]
    );
    user.roles = roleResult.rows.map(r => ({
      id: r.id, name: r.role_name, description: r.description, status: r.status,
    }));

    /* 7 — Permissions */
    let permissions = [], plantPermissions = [], permittedPlantIds = [];
    try {
      const { rows: pr } = await db.query(
        `SELECT module_id,plant_id,can_add,can_edit,can_view,can_delete
           FROM user_plant_permission WHERE user_id=$1`, [user.id]
      );
      plantPermissions  = pr.map(p => ({
        moduleId: p.module_id, plantId: p.plant_id,
        actions: { create: p.can_add, update: p.can_edit, read: p.can_view, delete: p.can_delete },
      }));
      permissions       = pr.flatMap(p => {
        const a = [];
        if (p.can_add)    a.push(`create:${p.module_id}`);
        if (p.can_edit)   a.push(`update:${p.module_id}`);
        if (p.can_view)   a.push(`read:${p.module_id}`);
        if (p.can_delete) a.push(`delete:${p.module_id}`);
        return a;
      });
      permittedPlantIds = [...new Set(pr.map(p => p.plant_id))];
    } catch (err) { console.error("[PERMISSIONS ERROR]", err); }

    if (roleIds.includes(1)) permissions.push("manage:all");

    /* 8 — IT BIN */
    let isITBin = false, itPlantIds = [], itPlants = [];
    try {
      const itRes = await db.query(
        `SELECT piau.plant_it_admin_id, pia.plant_id, pm.plant_name
           FROM plant_it_admin_users piau
           JOIN plant_it_admin pia ON piau.plant_it_admin_id = pia.id
           JOIN plant_master   pm  ON pia.plant_id = pm.id
          WHERE piau.user_id=$1 AND pia.status='ACTIVE'`, [user.id]
      );
      if (itRes.rows.length) {
        isITBin    = true;
        itPlantIds = itRes.rows.map(r => r.plant_id);
        itPlants   = itRes.rows.map(r => ({
          plant_id: r.plant_id, plant_name: r.plant_name,
          plant_it_admin_id: r.plant_it_admin_id,
        }));
        permissions.push("view:tasks", "manage:tasks");
      }
    } catch (err) { console.error("[IT BIN CHECK ERROR]", err); }

    /* 9 — Approver checks */
    let isApprover = false, isCorporateApprover = false;
    let approverTypes = [], pendingApproval1Count = 0, pendingApproval2Count = 0;
    try {
      const a1 = await db.query(
        `SELECT COUNT(*) AS c FROM user_requests
          WHERE LOWER(approver1_email)=LOWER($1) AND approver1_status='Pending'
            AND status NOT IN ('Completed','Rejected','Cancelled')`, [user.email]
      );
      if (+a1.rows[0].c > 0) {
        isApprover = true; approverTypes.push("approver_1");
        pendingApproval1Count = +a1.rows[0].c;
      }
      const a1h = await db.query(
        `SELECT 1 FROM user_requests WHERE LOWER(approver1_email)=LOWER($1) LIMIT 1`, [user.email]
      );
      if (a1h.rows.length && !approverTypes.includes("approver_1")) {
        isApprover = true; approverTypes.push("approver_1");
      }
      const a2 = await db.query(
        `SELECT COUNT(*) AS c FROM user_requests
          WHERE LOWER(approver2_email)=LOWER($1) AND approver2_status='Pending'
            AND status NOT IN ('Completed','Rejected','Cancelled')`, [user.email]
      );
      if (+a2.rows[0].c > 0) {
        isApprover = true; approverTypes.push("workflow_approver");
        pendingApproval2Count = +a2.rows[0].c;
      }
      const wf = await db.query(
        `SELECT 1 FROM approval_workflow_master
          WHERE (approver_2_id LIKE $1 OR approver_3_id LIKE $1
              OR approver_4_id LIKE $1 OR approver_5_id LIKE $1)
            AND is_active=true LIMIT 1`, [`%${user.id}%`]
      );
      if (wf.rows.length && !approverTypes.includes("workflow_approver")) {
        isApprover = true; approverTypes.push("workflow_approver");
      }
      const wfc = await db.query(
        `SELECT 1 FROM approval_workflow_master
          WHERE (approver_2_id LIKE $1 OR approver_3_id LIKE $1
              OR approver_4_id LIKE $1 OR approver_5_id LIKE $1)
            AND is_active=true AND corporate_type='Administration' LIMIT 1`, [`%${user.id}%`]
      );
      if (wfc.rows.length) {
        isCorporateApprover = true;
        if (!approverTypes.includes("corporate_workflow_approver"))
          approverTypes.push("corporate_workflow_approver");
        permissions.push("approve:requests", "read:admin_approval", "update:admin_approval");
      }
      if (roleIds.includes(1) || roleIds.includes(2))
        permissions.push("read:workflows", "create:workflows", "update:workflows");
    } catch (err) { console.error("[APPROVER CHECK ERROR]", err); }

    /* 10 — Location */
    let userLocation = null, userPlantName = null;
    if (user.location) {
      try {
        const locRes = await db.query(
          `SELECT id, plant_name FROM plant_master WHERE plant_name=$1`, [user.location]
        );
        if (locRes.rows.length) {
          userLocation  = locRes.rows[0].id;
          userPlantName = locRes.rows[0].plant_name;
        }
      } catch (err) { console.error("[LOCATION FETCH ERROR]", err); }
    }

    /* 11 — JWT (include session_id so frontend can send it back on heartbeat/logout) */
    const payload = {
      user_id:              user.id || user.user_id || null,
      username:             user.employee_id || user.username || null,
      employee_name:        user.employee_name,
      employee_code:        user.employee_code,
      email:                user.email,
      role_id:              roleIds,
      permissions,
      plantPermissions,
      permittedPlantIds,
      permissions_version:  2,
      isApprover,
      isCorporateApprover,
      approverTypes,
      pendingApproval1Count,
      pendingApproval2Count,
      isITBin,
      itPlants:             isITBin ? itPlants   : [],
      itPlantIds:           isITBin ? itPlantIds : [],
      location:             user.location,
      plant_name:           userPlantName,
      department:           user.department,
      designation:          user.designation,
      loginTime:            new Date().toISOString(),
      session_id:           loginTxnId,   // ← key field for heartbeat + logout
      auth_method:          authMethod,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES });

    /* 12 — Activity log */
    try {
      await logLogin({
        userId:          user.id,
        performedByRole: user.roles?.[0]?.name ?? null,
        subscription:    userLocation ? `${userLocation}+${user.location}` : String(user.plant_id ?? ""),
        token,
        req,
        extra: {
          requestTransactionId: loginTxnId,
          location:  user.location ?? req?.headers?.["x-location"] ?? null,
          latitude:  req?.headers?.["x-lat"]  != null ? Number(req.headers["x-lat"])  : null,
          longitude: req?.headers?.["x-lng"]  != null ? Number(req.headers["x-lng"])  : null,
        },
      });
    } catch (logErr) {
      console.error("[AUTH] Activity log (login) failed:", logErr.message);
    }

    /* 13 — Response */
    return res.json({
      token,
      session_id:           loginTxnId,
      login_transaction_id: loginTxnId,
      auth_method:          authMethod,
      user: {
        id:                   user.id || user.user_id,
        username:             user.employee_id,
        name:                 user.employee_name,
        employee_code:        user.employee_code,
        email:                user.email,
        location:             user.location,
        plant_name:           userPlantName,
        department:           user.department,
        designation:          user.designation,
        reporting_manager:    user.reporting_manager ?? "",
        managers_manager:     user.managers_manager  ?? "",
        role_id:              user.role_id,
        status:               user.status,
        isApprover,
        isCorporateApprover,
        approverTypes,
        pendingApproval1Count,
        pendingApproval2Count,
        isITBin,
        itPlants:             isITBin ? itPlants : [],
        permittedPlantIds,
        plantPermissions,
        hasApproverAccess:    permissions.includes("approve:requests"),
        full_name:            user.employee_name,
      },
    });

  } catch (err) {
    console.error("[AUTH LOGIN ERROR]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/logout
 * Body: { session_id: "USRL..." }  (or transaction_id — both accepted)
 * ───────────────────────────────────────────────────────────────────────────── */
exports.logout = async (req, res) => {
  try {
    const transactionId = req.body?.session_id || req.body?.transaction_id;
    if (!transactionId)
      return res.status(400).json({ message: "session_id required" });

    /* Close the session */
    const result = await db.query(
      `UPDATE user_login_log
          SET logout_time = NOW(),
              action      = 'LOGOUT',
              description = 'User logged out'
        WHERE transaction_id = $1
          AND logout_time IS NULL
        RETURNING user_id`,
      [transactionId]
    );

    if (result.rowCount === 0)
      return res.json({ message: "Session already closed or not found" });

    const { user_id: loggedOutUserId } = result.rows[0];

    /* Activity log */
    try {
      const sub = req?.user?.subscription
        ?? (req?.user?.plant_id != null
          ? `${req.user.plant_id}+${req.user.location ?? ""}` : null);

      await logLogout({
        userId:          loggedOutUserId,
        performedByRole: req?.user?.roles?.[0]?.name ?? req?.user?.role_name ?? null,
        subscription:    sub,
        req,
      });
    } catch (logErr) {
      console.error("[AUTH] Activity log (logout) failed:", logErr.message);
    }

    return res.json({ message: "Logout recorded successfully" });

  } catch (err) {
    console.error("[AUTH LOGOUT ERROR]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/heartbeat
 *
 * Frontend calls this every ~2 minutes to keep the session alive.
 * Returns 401 with code SESSION_EXPIRED if the session was killed by the
 * inactivity sweeper — frontend should redirect to login on that response.
 *
 * Body: { session_id: "USRL..." }
 * ───────────────────────────────────────────────────────────────────────────── */
exports.heartbeat = async (req, res) => {
  try {
    const sessionId = req.body?.session_id
      || req.user?.session_id
      || req.headers?.["x-session-id"];

    // ── Diagnostic: log what we received so 401 is traceable ──
    logDebug("[heartbeat] received session_id:", sessionId ?? "(none)",
      "| body keys:", Object.keys(req.body || {}));

    if (!sessionId) {
      console.warn("[heartbeat] 400 — no session_id in body/headers");
      return res.status(400).json({ message: "session_id required" });
    }

    const alive = await touchSession(sessionId);
    logDebug("[heartbeat] touchSession result:", alive, "for", sessionId);

    if (!alive) {
      // Check if row exists at all (distinguishes expired vs wrong ID)
      const exists = await db.query(
        `SELECT logout_time FROM user_login_log WHERE transaction_id = $1`,
        [sessionId]
      );
      if (exists.rowCount === 0) {
        console.warn("[heartbeat] 401 — session_id not found in DB:", sessionId);
        console.warn("[heartbeat] Likely cause: login failed to INSERT session row.");
        console.warn("[heartbeat] Check: did createSession throw? Is user_login_log schema correct?");
      } else {
        console.warn("[heartbeat] 401 — session found but logout_time is set:",
          exists.rows[0].logout_time, "for", sessionId);
      }
      return res.status(401).json({
        message: "Session expired due to inactivity. Please login again.",
        code:    "SESSION_EXPIRED",
      });
    }

    return res.json({ ok: true, session_id: sessionId });

  } catch (err) {
    console.error("[AUTH HEARTBEAT ERROR]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
 * GET /api/auth/permissions
 * ───────────────────────────────────────────────────────────────────────────── */
exports.getPermissions = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;
    if (authHeader?.startsWith("Bearer ")) token = authHeader.split(" ")[1];
    else if (req.cookies?.token)           token = req.cookies.token;

    if (!token)
      return res.status(401).json({ message: "Missing authentication token" });

    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(401).json({ message: "Invalid token" }); }

    let userId = payload.user_id || payload.id || null;
    if (!userId && payload.username) {
      const r = await db.query(
        "SELECT id FROM user_master WHERE employee_id=$1 LIMIT 1", [payload.username]
      );
      if (r.rows.length) userId = r.rows[0].id;
    }
    if (!userId)
      return res.status(400).json({ message: "Unable to determine user id from token" });

    try {
      const { rows } = await db.query(
        `SELECT id,transaction_id,user_id,plant_id,module_id,
                can_add,can_edit,can_view,can_delete,created_on,updated_on
           FROM user_plant_permission WHERE user_id=$1 ORDER BY id`, [userId]
      );
      return res.json({
        plantPermissions:  rows,
        permittedPlantIds: [...new Set(rows.map(p => p.plant_id))],
      });
    } catch {
      return res.json({ permissions: [] });
    }
  } catch (err) {
    console.error("[GET PERMISSIONS ERROR]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = exports;