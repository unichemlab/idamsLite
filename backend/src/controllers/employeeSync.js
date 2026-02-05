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

const isActiveUser = (userAccountControl) => {
  if (!userAccountControl) return false;
  return (parseInt(userAccountControl) & 2) === 0;
};

/* ================= GET ALL OUs WITH EMPLOYEES ================= */

const getAllOUsWithEmployees = async () => {
  const baseDN = "DC=uniwin,DC=local";

  return new Promise((resolve, reject) => {
    const ad = new ActiveDirectory({
      url: process.env.AD_SERVER,
      username: process.env.AD_USER,
      password: process.env.AD_PASSWORD,
      baseDN,
    });

    ad.find(
      {
        baseDN,
        filter:
          "(&(objectCategory=person)(objectClass=user)" +
          "(!(userAccountControl:1.2.840.113556.1.4.803:=2))" +
          "(sAMAccountName=*))",
        scope: "sub",
        attributes: ["distinguishedName", "sAMAccountName"],
        paged: { pageSize: 500, pagePause: false },
      },
      (err, result) => {
        if (err) return reject(err);

        const users = result?.users || [];
        const ouMap = {};

        users.forEach((u) => {
          if (!u.distinguishedName || !u.sAMAccountName) return;

          const parts = u.distinguishedName.split(",");

          // Find FIRST OU (top-level)
          for (let i = 0; i < parts.length; i++) {
            if (parts[i].startsWith("OU=")) {
              const ouName = parts[i].replace("OU=", "");
              const ouDN = parts.slice(i).join(",");

              if (!ouMap[ouDN]) {
                ouMap[ouDN] = {
                  ou_name: ouName,
                  ou_dn: ouDN,
                  full_path: ouDN.replace(",DC=uniwin,DC=local", ""),
                  employee_count: 0,
                  employees: new Set(),
                };
              }

              ouMap[ouDN].employees.add(u.sAMAccountName);
              ouMap[ouDN].employee_count = ouMap[ouDN].employees.size;
              break;
            }
          }
        });

        const ous = Object.values(ouMap).map((ou) => ({
          ou_name: ou.ou_name,
          ou_dn: ou.ou_dn,
          full_path: ou.full_path,
          employee_count: ou.employee_count,
        }));

        ous.sort((a, b) => b.employee_count - a.employee_count);

        resolve(ous);
      }
    );
  });
};

/* ================= SYNC SINGLE OU ================= */

const syncSingleOU = async (ouPath) => {
  const baseDN = `${ouPath},DC=uniwin,DC=local`;

  let totalRecords = 0,
    insertedRecords = 0,
    updatedRecords = 0,
    failedRecords = 0,
    skippedRecords = 0;

  return new Promise((resolve, reject) => {
    (async () => {
      try {
        /* ---------- LAST SYNC ---------- */
        let lastSyncTime = null;
        let isFirstSync = false;
        try {
          const r = await pool.query(
            `SELECT last_sync FROM ad_sync_log WHERE ou=$1 ORDER BY last_sync DESC LIMIT 1`,
            [ouPath]
          );
          lastSyncTime = r.rows[0]?.last_sync || null;
          isFirstSync = !lastSyncTime;
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
            "(|(whenChanged>=" +
            ts +
            ")(whenCreated>=" +
            ts +
            ")))";
        }

        console.log(`  [OU: ${ouPath}] Starting sync...`);

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
                [ouPath, err.message]
              );
              return reject({
                ou: ouPath,
                error: err.message,
                total: 0,
                inserted: 0,
                updated: 0,
                failed: 0,
                skipped: 0,
              });
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
                    baseDN: "DC=uniwin,DC=local", // Search entire domain for managers
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

              const adEmployeeIds = new Set();

              for (let i = 0; i < users.length; i += DB_BATCH) {
                const chunk = users.slice(i, i + DB_BATCH);

                const values = [];
                const params = [];
                let p = 1;

                const managerPromises = [];
                const userManagerMap = new Map();

                for (const raw of chunk) {
                  const user = deepClean(raw);
                  const employeeId = safe(user.sAMAccountName);

                  if (!employeeId) {
                    skippedRecords++;
                    continue;
                  }

                  const isActive = isActiveUser(user.userAccountControl);

                  if (isFirstSync && isActive) {
                    adEmployeeIds.add(employeeId);
                  } else if (!isFirstSync) {
                    adEmployeeIds.add(employeeId);
                  }

                  if (user.manager) {
                    const promise = getManager(user.manager).then((mgr) => {
                      if (mgr?.managerDN) {
                        return getManager(mgr.managerDN).then((mgr2) => ({
                          manager: mgr,
                          managersManager: mgr2,
                        }));
                      }
                      return { manager: mgr, managersManager: null };
                    });
                    managerPromises.push(promise);
                    userManagerMap.set(employeeId, managerPromises.length - 1);
                  }
                }

                const managerResults = await Promise.all(managerPromises);

                for (const raw of chunk) {
                  try {
                    const user = deepClean(raw);
                    const employeeId = safe(user.sAMAccountName);

                    if (!employeeId) continue;

                    let manager = null,
                      managersManager = null;

                    if (userManagerMap.has(employeeId)) {
                      const idx = userManagerMap.get(employeeId);
                      const result = managerResults[idx];
                      manager = result?.manager || null;
                      managersManager = result?.managersManager || null;
                    }

                    const isActive = isActiveUser(user.userAccountControl);
                    const status = isActive ? "Active" : "Inactive";

                    values.push(`(
                      $${p++},$${p++},$${p++},$${p++},$${p++},
                      $${p++},$${p++},$${p++},$${p++},
                      $${p++}::text::jsonb,$${p++}::text::jsonb,
                      $${p++},NOW(),NOW()
                    )`);

                    params.push(
                      safe(user.displayName),
                      employeeId,
                      safe(user.employeeID),
                      safe(user.department),
                      safe(user.physicalDeliveryOfficeName),
                      status,
                      safe(user.company),
                      safe(user.mobile),
                      safe(user.mail),
                      manager ? JSON.stringify(deepClean(manager)) : null,
                      managersManager
                        ? JSON.stringify(deepClean(managersManager))
                        : null,
                      ouPath // Store OU path
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
                   ou_path, last_sync, updated_on)
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
                    ou_path = EXCLUDED.ou_path,
                    last_sync = NOW(),
                    updated_on = NOW()
                  RETURNING xmax = 0 AS inserted;
                `;

                const r = await client.query(q, params);
                r.rows.forEach((row) =>
                  row.inserted ? insertedRecords++ : updatedRecords++
                );
              }

              /* ---------- SOFT DELETE ---------- */
              if (adEmployeeIds.size > 0) {
                const adIdArray = Array.from(adEmployeeIds);

                await client.query(
                  `
                  UPDATE user_master
                  SET status='Inactive', updated_on=NOW()
                  WHERE employee_id NOT IN (SELECT unnest($1::text[]))
                    AND status = 'Active'
                    AND ou_path = $2
                `,
                  [adIdArray, ouPath]
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
                ouPath,
                totalRecords,
                insertedRecords,
                updatedRecords,
                failedRecords,
                "Success",
                null,
              ]
            );

            console.log(
              `  [OU: ${ouPath}] ✓ Total: ${totalRecords}, Inserted: ${insertedRecords}, Updated: ${updatedRecords}`
            );

            resolve({
              ou: ouPath,
              total: totalRecords,
              inserted: insertedRecords,
              updated: updatedRecords,
              failed: failedRecords,
              skipped: skippedRecords,
            });
          }
        );
      } catch (err) {
        reject({
          ou: ouPath,
          error: err.message,
          total: 0,
          inserted: 0,
          updated: 0,
          failed: 0,
          skipped: 0,
        });
      }
    })();
  });
};

/* ================= SYNC ALL OUs ================= */

const syncAllOUs = async (req, res) => {
  const startTime = Date.now();

  try {
    console.log("\n========================================");
    console.log("🔄 STARTING SYNC FOR ALL OUs");
    console.log("========================================\n");

    // Get all OUs
    const ous = await getAllOUsWithEmployees();
    console.log(`📋 Found ${ous.length} OUs with employees:\n`);
    
    ous.forEach((ou, idx) => {
      console.log(`  ${idx + 1}. ${ou.ou_name} (${ou.employee_count} employees)`);
    });
    console.log("");

    // Sync each OU sequentially
    const results = [];
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalUsers = 0;

    for (const ou of ous) {
      try {
        const result = await syncSingleOU(ou.full_path);
        results.push({ ...result, status: "success" });
        
        totalInserted += result.inserted;
        totalUpdated += result.updated;
        totalFailed += result.failed;
        totalSkipped += result.skipped;
        totalUsers += result.total;
      } catch (error) {
        console.error(`  [OU: ${ou.full_path}] ✗ Error: ${error.error || error.message}`);
        results.push({ 
          ...error, 
          status: "failed",
          ou: ou.full_path 
        });
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n========================================");
    console.log("✅ SYNC COMPLETE");
    console.log("========================================");
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 OUs Processed: ${ous.length}`);
    console.log(`👥 Total Users: ${totalUsers}`);
    console.log(`➕ Inserted: ${totalInserted}`);
    console.log(`🔄 Updated: ${totalUpdated}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`⏭️  Skipped: ${totalSkipped}`);
    console.log("========================================\n");

    return res.json({
      status: true,
      message: "All OUs synced successfully",
      summary: {
        total_ous: ous.length,
        total_users: totalUsers,
        inserted: totalInserted,
        updated: totalUpdated,
        failed: totalFailed,
        skipped: totalSkipped,
        duration_seconds: parseFloat(duration),
      },
      ous: results,
    });
  } catch (err) {
    console.error("❌ SYNC ALL OUs CRASHED:", err);
    return res.status(500).json({
      status: false,
      error: err.message,
    });
  }
};

/* ================= SYNC SINGLE OU (API) ================= */

const syncADUsers = async (req, res) => {
  const ou = req.query.ou || "OU=COE-Ghaziabad";
  
  try {
    const result = await syncSingleOU(ou);
    return res.json({
      status: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.error || error.message,
    });
  }
};

/* ================= GET OUs ENDPOINT ================= */

const getOUsWithEmployees = async (req, res) => {
  try {
    const ous = await getAllOUsWithEmployees();
    
    return res.json({
      status: true,
      message: `Fetched ${ous.length} OU(s) having active employees`,
      summary: {
        total_ous: ous.length,
        total_users: ous.reduce((sum, ou) => sum + ou.employee_count, 0),
      },
      ous,
    });
  } catch (err) {
    console.error("[OU Fetch Error]", err);
    return res.status(500).json({
      status: false,
      message: "LDAP error",
      error: err.message,
    });
  }
};

module.exports = { 
  syncADUsers,      // Sync single OU
  syncAllOUs,       // Sync all OUs
  getOUsWithEmployees // Get OU list
};