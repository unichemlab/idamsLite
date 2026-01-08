const ActiveDirectory = require("activedirectory2");
const pool = require("../config/db");

/* ================= CONFIG ================= */

const PAGE_SIZE = 500;
const DB_BATCH = 200;

const ATTRS = [
  "distinguishedName",
  "displayName",
  "sAMAccountName",
  "employeeID",
  "department",
  "physicalDeliveryOfficeName",
  "company",
  "mobile",
  "mail",
  "title",
  "manager",
  "userAccountControl",
  "whenChanged",
  "whenCreated",
];

/* ================= SANITIZERS ================= */

// remove NULL + control chars
const clean = (v) => {
  if (v === null || v === undefined) return null;

  if (typeof v === "string") {
    return v
      .replace(/\u0000/g, "")
      .replace(/[\u0001-\u001F]/g, "")
      .trim();
  }

  return v;
};

const safe = (v) => {
  const x = clean(v);
  return x === "" ? null : x;
};

const deepClean = (obj) => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === "string") return safe(obj);
  if (Array.isArray(obj)) return obj.map(deepClean);

  if (typeof obj === "object") {
    const out = {};
    for (const k in obj) out[k] = deepClean(obj[k]);
    return out;
  }
  return obj;
};

const safeDN = (dn) =>
  dn
    .replace(/\\/g, "\\5c")
    .replace(/\(/g, "\\28")
    .replace(/\)/g, "\\29");

/* ================= CONTROLLER ================= */

const syncADUsers = async (req, res) => {
  let totalRecords = 0,
    insertedRecords = 0,
    updatedRecords = 0,
    failedRecords = 0,
    syncStatus = "Success",
    errorMessage = null;

  try {
    const ou = req.query.ou || "OU=COE-Ghaziabad";
    const baseDN = `${ou},DC=uniwin,DC=local`;

    /* ---------- LAST SYNC ---------- */
    let lastSyncTime = null;
    try {
      const r = await pool.query(
        `SELECT last_sync FROM ad_sync_log WHERE ou=$1 ORDER BY last_sync DESC LIMIT 1`,
        [ou]
      );
      lastSyncTime = r.rows[0]?.last_sync || null;
    } catch {}

    /* ---------- LDAP FILTER ---------- */
    const pad = (n) => (n < 10 ? "0" + n : n);

    let ldapFilter;

    if (!lastSyncTime) {
      ldapFilter =
        "(&(objectCategory=person)(objectClass=user)" +
        "(!(userAccountControl:1.2.840.113556.1.4.803:=2)))";
    } else {
      const d = lastSyncTime;
      const ts =
        d.getUTCFullYear().toString() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes()) +
        pad(d.getUTCSeconds()) +
        ".0Z";

      ldapFilter =
        "(&(objectCategory=person)(objectClass=user)" +
        "(!(userAccountControl:1.2.840.113556.1.4.803:=2))" +
        "(|(whenChanged>=" +
        ts +
        ")(whenCreated>=" +
        ts +
        ")))";
    }

    /* ---------- AD CONNECTION ---------- */
    const ad = new ActiveDirectory({
      url: process.env.AD_SERVER,
      username: process.env.AD_USER,
      password: process.env.AD_PASSWORD,
      baseDN,
      pageSize: PAGE_SIZE,
    });

    /* ---------- LDAP SEARCH ---------- */
    ad.find(
      {
        baseDN,
        filter: ldapFilter,
        scope: "sub",
        paged: true,
        attributes: ATTRS,
      },
      async (err, results) => {
        if (err) {
          await pool.query(
            `INSERT INTO ad_sync_log (ou,status,error_message,last_sync)
             VALUES ($1,'Failed',$2,NOW())`,
            [ou, err.message]
          );
          return res.status(500).json({ status: false, error: err.message });
        }

        const users = results?.users || [];
        totalRecords = users.length;

        /* ---------- MANAGER CACHE ---------- */
        const managerCache = {};

        const getManager = async (dn) => {
          if (!dn) return null;
          if (managerCache[dn]) return managerCache[dn];

          return new Promise((resolve) => {
            ad.find(
              {
                baseDN,
                filter: "(distinguishedName=" + safeDN(dn) + ")",
                scope: "sub",
                attributes: ATTRS,
              },
              (e, r) => {
                if (e || !r?.users?.length) return resolve(null);
                const u = deepClean(r.users[0]);
                const obj = {
                  employee_id: safe(u.sAMAccountName),
                  name: safe(u.displayName),
                  email: safe(u.mail),
                  managerDN: u.manager || null,
                };
                managerCache[dn] = obj;
                resolve(obj);
              }
            );
          });
        };

        /* ---------- DB ---------- */
        const client = await pool.connect();
        try {
          await client.query("BEGIN");

          for (let i = 0; i < users.length; i += DB_BATCH) {
            const chunk = users.slice(i, i + DB_BATCH);

            const values = [];
            const params = [];
            let p = 1;

            for (const raw of chunk) {
              try {
                const user = deepClean(raw);

                let manager = null,
                  managersManager = null;

                if (user.manager) {
                  manager = await getManager(user.manager);
                  if (manager?.managerDN)
                    managersManager = await getManager(manager.managerDN);
                }

                values.push(`(
                  $${p++},$${p++},$${p++},$${p++},$${p++},
                  $${p++},$${p++},$${p++},$${p++},
                  $${p++}::text::jsonb,$${p++}::text::jsonb,
                  NOW(),NOW()
                )`);

                params.push(
                  safe(user.displayName),
                  safe(user.sAMAccountName),
                  safe(user.employeeID),
                  safe(user.department),
                  safe(user.physicalDeliveryOfficeName),
                  "Active",
                  safe(user.company),
                  safe(user.mobile),
                  safe(user.mail),
                  manager ? JSON.stringify(deepClean(manager)) : null,
                  managersManager
                    ? JSON.stringify(deepClean(managersManager))
                    : null
                );
              } catch (e) {
                failedRecords++;
              }
            }

            if (!values.length) continue;

            const q = `
              INSERT INTO user_master
              (employee_name, employee_id, employee_code, department, location,
               status, company, mobile, email, reporting_manager, managers_manager,
               last_sync, updated_on)
              VALUES ${values.join(",")}
              ON CONFLICT (employee_id)
              DO UPDATE SET
                employee_name = EXCLUDED.employee_name,
                employee_code = EXCLUDED.employee_code,
                department = EXCLUDED.department,
                location = EXCLUDED.location,
                status = EXCLUDED.status,
                company = EXCLUDED.company,
                mobile = EXCLUDED.mobile,
                email = EXCLUDED.email,
                reporting_manager = EXCLUDED.reporting_manager,
                managers_manager = EXCLUDED.managers_manager,
                last_sync = NOW(),
                updated_on = NOW()
              RETURNING xmax = 0 AS inserted;
            `;

            const r = await client.query(q, params);

            r.rows.forEach((row) =>
              row.inserted ? insertedRecords++ : updatedRecords++
            );
          }

          /* ---------- SOFT DELETE (FIRST SYNC ONLY) ---------- */
          if (!lastSyncTime && users.length) {
            const adIds = users.map((u) => safe(u.sAMAccountName)).filter(Boolean);

            await client.query(
              `
              UPDATE user_master
              SET status='Inactive'
              WHERE employee_id NOT IN (SELECT unnest($1::text[]))
            `,
              [adIds]
            );
          }

          await client.query("COMMIT");
        } catch (dbErr) {
          await client.query("ROLLBACK");
          throw dbErr;
        } finally {
          client.release();
        }

        /* ---------- LOG ---------- */
        await pool.query(
          `INSERT INTO ad_sync_log
           (ou,total_records,inserted_records,updated_records,failed_records,status,error_message,last_sync)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
          [
            ou,
            totalRecords,
            insertedRecords,
            updatedRecords,
            failedRecords,
            syncStatus,
            errorMessage,
          ]
        );

        return res.json({
          status: true,
          total: totalRecords,
          inserted: insertedRecords,
          updated: updatedRecords,
          failed: failedRecords,
        });
      }
    );
  } catch (err) {
    console.error("SYNC CRASH:", err);
    res.status(500).json({ status: false, error: err.message });
  }
};

module.exports = { syncADUsers };