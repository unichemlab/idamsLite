// ============================================================
// FILE: backend/services/employeeSync.js
// PURPOSE: AD sync for user_master table with last_seen_in_ad tracking
// ============================================================
// FEATURES:
// 1. ✅ Syncs to user_master table (not employees)
// 2. ✅ Tracks last_seen_in_ad timestamp
// 3. ✅ Auto-deactivates users not seen in AD for X days
// 4. ✅ Updates status field and is_active boolean
// 5. ✅ Maintains transaction_id format (EMP00000XXX)
// 6. ✅ Logs to ad_sync_runs, ad_sync_ou_log, and ad_sync_log tables
// ============================================================

const ActiveDirectory = require("activedirectory2");
const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");

/* ================= CONFIGURATION ================= */

// Number of days after which users not found in AD will be deactivated
const STALE_USER_THRESHOLD_DAYS = parseInt(process.env.STALE_USER_DAYS || '7', 10);

/* ================= EMAIL CONFIGURATION ================= */

const transporter = nodemailer.createTransport({
  host: "email.unichemlabs.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: "nishant1.singh@unichemlabs.com",
    pass: "Mail$2026",
  },
  tls: {
    rejectUnauthorized: false, // ignore cert issues for testing
  },
  logger: true,
  debug: true,
});

/**
 * Generate beautiful HTML email with OU-wise breakdown
 */
function generateEmailBody(runData, ouResults) {
  const { run_id, status, total_ous, total_users, inserted, updated, failed, skipped, deactivated, duration_seconds, triggered_by } = runData;

  const statusColor = status === 'SUCCESS' ? '#28a745' : status === 'PARTIAL' ? '#ffc107' : '#dc3545';
  const statusIcon = status === 'SUCCESS' ? '✅' : status === 'PARTIAL' ? '⚠️' : '❌';

  let ouTableRows = '';
  ouResults.forEach((ou, idx) => {
    const ouStatus = ou.status === 'SUCCESS' ? '✅' : '❌';
    const rowClass = ou.status === 'SUCCESS' ? 'success-row' : 'failure-row';

    ouTableRows += `
      <tr class="${rowClass}">
        <td>${idx + 1}</td>
        <td>${ou.ou_path}</td>
        <td>${ou.total_users}</td>
        <td>${ou.inserted}</td>
        <td>${ou.updated}</td>
        <td>${ou.failed}</td>
        <td>${ou.skipped}</td>
        <td>${ouStatus} ${ou.status}</td>
      </tr>
    `;
  });

  const deactivatedRow = deactivated > 0 ? `
    <div class="summary-item">
      <div class="summary-label">Deactivated (Stale)</div>
      <div class="summary-value" style="color: #ffc107;">${deactivated}</div>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #eee; }
        .status-badge { display: inline-block; padding: 10px 20px; background: ${statusColor}; color: white; border-radius: 5px; font-weight: bold; font-size: 18px; }
        .summary { margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 5px; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .summary-item { padding: 10px; }
        .summary-label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; }
        .summary-value { font-size: 24px; font-weight: bold; color: #333; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #343a40; color: white; padding: 12px; text-align: left; font-weight: 600; }
        td { padding: 10px 12px; border-bottom: 1px solid #dee2e6; }
        .success-row { background: #d4edda; }
        .failure-row { background: #f8d7da; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; color: #333;">AD Sync Report</h1>
          <div style="margin-top: 15px;">
            <span class="status-badge">${statusIcon} ${status}</span>
          </div>
        </div>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Run ID</div>
              <div class="summary-value" style="font-size: 14px; color: #666;">${run_id}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Triggered By</div>
              <div class="summary-value" style="font-size: 16px;">${triggered_by}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Duration</div>
              <div class="summary-value">${duration_seconds}s</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total OUs</div>
              <div class="summary-value">${total_ous}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Users</div>
              <div class="summary-value">${total_users}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Inserted</div>
              <div class="summary-value" style="color: #28a745;">${inserted}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Updated</div>
              <div class="summary-value" style="color: #17a2b8;">${updated}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Failed</div>
              <div class="summary-value" style="color: #dc3545;">${failed}</div>
            </div>
            ${deactivatedRow}
          </div>
        </div>

        <h2 style="margin-top: 30px; color: #333;">OU-Wise Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>OU Path</th>
              <th>Users</th>
              <th>Inserted</th>
              <th>Updated</th>
              <th>Failed</th>
              <th>Skipped</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${ouTableRows}
          </tbody>
        </table>

        <div class="footer">
          <p>This is an automated email from AD Sync Service</p>
          <p>Stale User Threshold: ${STALE_USER_THRESHOLD_DAYS} days</p>
          <p>Timestamp: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendSyncEmail(runData, ouResults) {
  try {
    const subject = `AD Sync ${runData.status} - ${runData.total_users} users, ${runData.deactivated || 0} stale`;
    const html = generateEmailBody(runData, ouResults);

    await transporter.sendMail({
      from: '"AD Sync Service" <nishant1.singh@unichemlabs.com>',
      to: [process.env.ALERT_EMAIL, "nishant1.singh@unichemlabs.com"],
      subject,
      html,
    });

    console.log(`📧 Email sent: ${subject}`);
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
  }
}

/* ================= CONFIG ================= */

const PAGE_SIZE = 500;
const DB_BATCH = 500;

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

/**
 * ✅ Determine if user is ACTIVE based ONLY on AD disabled flag
 */
const isActiveUser = (userAccountControl) => {
  if (userAccountControl === null || userAccountControl === undefined) {
    return true;
  }

  const uac = parseInt(userAccountControl, 10);

  if (Number.isNaN(uac)) {
    return true;
  }

  // Check disabled flag (bit 2)
  return (uac & 2) === 0;
};

/**
 * Generate transaction_id in format EMP00000XXX
 */
const generateTransactionId = async () => {
  const result = await pool.query(
    `SELECT transaction_id FROM user_master 
     WHERE transaction_id LIKE 'EMP%' 
     ORDER BY id DESC 
     LIMIT 1`
  );

  if (result.rows.length === 0) {
    return 'EMP00000001';
  }

  const lastId = result.rows[0].transaction_id;
  const numPart = parseInt(lastId.replace('EMP', ''), 10);
  const newNum = numPart + 1;
  return `EMP${newNum.toString().padStart(8, '0')}`;
};

/**
 * Parse manager DN to extract manager information
 */
// Manager cache (avoid repeated LDAP hits)
const managerCache = new Map();

const parseManagerInfo = async (managerDN) => {
  if (!managerDN) return null;

  if (managerCache.has(managerDN)) {
    return managerCache.get(managerDN);
  }

  const ad = new ActiveDirectory({
    url: process.env.AD_SERVER,
    username: process.env.AD_USER,
    password: process.env.AD_PASSWORD,
    baseDN: "DC=uniwin,DC=local",
  });

  return new Promise((resolve) => {
    ad.find(
      {
        baseDN: managerDN,
        scope: "base", // 🔥 VERY IMPORTANT
        attributes: [
          "displayName",
          "mail",
          "sAMAccountName",
          "employeeID",
          "manager",
          "department",
          "title",
          "company",
          "physicalDeliveryOfficeName",
        ],
      },
      (err, result) => {
        if (err || !result?.users?.length) {
          managerCache.set(managerDN, null);
          return resolve(null);
        }

        const m = result.users[0];

        const managerObj = {
          dn: managerDN,
          employee_id: safe(m.sAMAccountName),
          sAMAccountName: safe(m.sAMAccountName),
          employeeCode: safe(m.employeeID),
          displayName: safe(m.displayName),
          email: safe(m.mail),
          department: safe(m.department),
          designation: safe(m.title),
          company: safe(m.company),
          location: safe(m.physicalDeliveryOfficeName),
          managerDN: m.manager || null,
        };

        managerCache.set(managerDN, managerObj);
        resolve(managerObj);
      }
    );
  });
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
        filter: "(&(objectClass=organizationalUnit)(ou=*))",
        attributes: ["ou", "distinguishedName"],
      },
      async (err, results) => {
        if (err) return reject(err);

        const allOUs = (results?.other || []).filter((ou) => ou.ou);

        const ousWithEmployees = [];

        for (const ou of allOUs) {
          const empCount = await new Promise((res) => {
            ad.find(
              {
                baseDN: ou.dn,
                filter: "(&(objectClass=user)(sAMAccountName=*))",
                attributes: ["sAMAccountName"],
                scope: "one",
              },
              (e, r) => {
                if (e) return res(0);
                res((r?.users || []).length);
              }
            );
          });

          if (empCount > 0) {
            ousWithEmployees.push({
              name: ou.ou,
              full_path: ou.distinguishedName || ou.dn,
              employee_count: empCount,
            });
          }
        }
        resolve(ousWithEmployees);
      }
    );
  });
};

/* ================= FETCH USERS FROM AD ================= */

const fetchUsersFromAD = (ouPath, page = 1) => {
  const baseDN = "DC=uniwin,DC=local";
  const skip = (page - 1) * PAGE_SIZE;

  return new Promise((resolve, reject) => {
    const ad = new ActiveDirectory({
      url: process.env.AD_SERVER,
      username: process.env.AD_USER,
      password: process.env.AD_PASSWORD,
      baseDN,
    });

    ad.find(
      {
        baseDN: ouPath,
        filter: "(&(objectClass=user)(sAMAccountName=*))",
        attributes: ATTRS,
        scope: "one",
        sizeLimit: PAGE_SIZE,
        paged: true,
      },
      (err, results) => {
        if (err) return reject(err);

        const users = (results?.users || [])
          .slice(skip, skip + PAGE_SIZE)
          .map(deepClean);

        const hasMore = users.length === PAGE_SIZE;

        resolve({ users, hasMore });
      }
    );
  });
};

/* ================= UPSERT BATCH TO user_master ================= */

const upsertBatch = async (batch, runId, ouPath) => {
  const values = [];
  const placeholders = [];

  batch.forEach((user, i) => {
    const offset = i * 14; // ✅ FIXED (was 15)

    placeholders.push(
      `(
        $${offset + 1},  $${offset + 2},  $${offset + 3},  $${offset + 4},
        $${offset + 5},  $${offset + 6},  $${offset + 7},  $${offset + 8},
        $${offset + 9},  $${offset + 10}, $${offset + 11}, $${offset + 12},
        $${offset + 13}, $${offset + 14}
      )`
    );

    values.push(
      user.employee_name,
      user.employee_id,
      user.employee_code,
      user.department,
      user.location,
      user.reporting_manager,
      user.managers_manager,
      user.status,
      user.company,
      user.mobile,
      user.email,
      user.designation,
      user.ou_path,
      user.last_seen_in_ad
    );
  });

  const sql = `
    INSERT INTO user_master (
      employee_name,
      employee_id,
      employee_code,
      department,
      location,
      reporting_manager,
      managers_manager,
      status,
      company,
      mobile,
      email,
      designation,
      ou_path,
      last_seen_in_ad
    )
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (employee_id) DO UPDATE SET
      employee_name = EXCLUDED.employee_name,
      employee_code = EXCLUDED.employee_code,
      department = EXCLUDED.department,
      location = EXCLUDED.location,
      reporting_manager = EXCLUDED.reporting_manager,
      managers_manager = EXCLUDED.managers_manager,
      status = EXCLUDED.status,
      company = EXCLUDED.company,
      mobile = EXCLUDED.mobile,
      email = EXCLUDED.email,
      designation = EXCLUDED.designation,
      ou_path = EXCLUDED.ou_path,
      last_seen_in_ad = EXCLUDED.last_seen_in_ad,
      last_sync = CURRENT_TIMESTAMP,
      updated_on = CURRENT_TIMESTAMP,
      is_active = (EXCLUDED.status = 'Active')
    RETURNING employee_id, (xmax = 0) AS was_inserted
  `;

  const result = await pool.query(sql, values);
  return result.rows;
};


/* ================= SYNC SINGLE OU ================= */

const syncSingleOU = async (ouPath, runId) => {
  console.log(`\n[OU: ${ouPath}] Starting sync...`);

  let page = 1;
  let hasMore = true;

  let total = 0;
  let inserted = 0;
  let updated = 0;
  let failed = 0;
  let skipped = 0;

  try {
    while (hasMore) {
      const { users, hasMore: more } = await fetchUsersFromAD(ouPath, page);
      hasMore = more;

      console.log(`  [Page ${page}] Fetched ${users.length} users`);

      const batch = [];

      for (const u of users) {
        const employeeId = safe(u.sAMAccountName);
        const employeeCode = safe(u.employeeID);

        if (!employeeId) {
          skipped++;
          continue;
        }

        const isActive = isActiveUser(u.userAccountControl);
        const status = isActive ? 'Active' : 'Inactive';

        // Check if user exists to get transaction_id
        const existingUser = await pool.query(
          'SELECT transaction_id FROM user_master WHERE employee_id = $1',
          [employeeId]
        );

        let transactionId;
        if (existingUser.rows.length > 0) {
          transactionId = existingUser.rows[0].transaction_id;
        } 
        // else {
        //   transactionId = await generateTransactionId();
        // }

        let reportingManager = null;
let managersManager = null;

if (u.manager) {
  const mgr = await parseManagerInfo(u.manager);

  if (mgr) {
    reportingManager = mgr;

    // 🔥 Get Manager's Manager
    if (mgr.managerDN) {
      const mgr2 = await parseManagerInfo(mgr.managerDN);
      if (mgr2) {
        managersManager = mgr2;
      }
    }
  }
}


        batch.push({
         // transaction_id: transactionId,
          employee_name: safe(u.displayName),
          employee_id: employeeId,
          employee_code: employeeCode,
          department: safe(u.department),
          location: safe(u.physicalDeliveryOfficeName),
          reporting_manager: reportingManager
  ? JSON.stringify(reportingManager)
  : null,

managers_manager: managersManager
  ? JSON.stringify(managersManager)
  : null,

          status: status,
          company: safe(u.company),
          mobile: safe(u.mobile),
          email: safe(u.mail),
          designation: safe(u.title),
          ou_path: ouPath,
          last_seen_in_ad: new Date(),
        });

        if (batch.length >= DB_BATCH) {
          const results = await upsertBatch(batch, runId, ouPath);

          results.forEach((r) => {
            if (r.was_inserted) inserted++;
            else updated++;
          });

          total += batch.length;
          batch.length = 0;
        }
      }

      if (batch.length > 0) {
        const results = await upsertBatch(batch, runId, ouPath);

        results.forEach((r) => {
          if (r.was_inserted) inserted++;
          else updated++;
        });

        total += batch.length;
      }

      page++;
    }

    console.log(`  [OU: ${ouPath}] ✓ Total: ${total}, Inserted: ${inserted}, Updated: ${updated}, Failed: ${failed}, Skipped: ${skipped}`);

    // Log to ad_sync_ou_log
    await pool.query(
      `INSERT INTO ad_sync_ou_log (run_id, ou_path, total_users, inserted, updated, failed, skipped, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [runId, ouPath, total, inserted, updated, failed, skipped, 'SUCCESS']
    );

    // Also log to ad_sync_log for backward compatibility
    const syncId = await pool.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_id FROM 5) AS INTEGER)), 0) + 1 as next_id 
       FROM ad_sync_log 
       WHERE transaction_id LIKE 'SYNC%'`
    );
    const nextSyncId = `SYNC${syncId.rows[0].next_id.toString().padStart(8, '0')}`;

    await pool.query(
      `INSERT INTO ad_sync_log 
       (transaction_id, sync_timestamp, ou, total_records, inserted_records, updated_records, failed_records, status, last_sync)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [nextSyncId, new Date(), ouPath, total, inserted, updated, failed, 'Success', new Date()]
    );

    return { total, inserted, updated, failed, skipped };
  } catch (err) {
    console.error(`  [OU: ${ouPath}] ✗ Error:`, err.message);

    await pool.query(
      `INSERT INTO ad_sync_ou_log (run_id, ou_path, total_users, inserted, updated, failed, skipped, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [runId, ouPath, 0, 0, 0, 0, 0, 'FAILURE', err.message]
    );

    throw { error: err.message };
  }
};

/* ================= DEACTIVATE STALE USERS ================= */

const deactivateStaleUsers = async (thresholdDays = STALE_USER_THRESHOLD_DAYS) => {
  console.log(`\n🧹 Starting cleanup of users not seen in AD for ${thresholdDays} days...`);

  try {
    const result = await pool.query(
      `UPDATE user_master 
       SET status = 'Inactive',
           is_active = false,
           inactive_reason = 'Not found in AD for ' || $1 || ' days',
           updated_on = CURRENT_TIMESTAMP
       WHERE last_seen_in_ad < NOW() - INTERVAL '${thresholdDays} days'
         AND status = 'Active'
         AND is_active = true
       RETURNING employee_id, employee_name, last_seen_in_ad`,
      [thresholdDays]
    );

    if (result.rowCount > 0) {
      console.log(`🧹 Deactivated ${result.rowCount} stale users:`);
      result.rows.forEach(user => {
        console.log(`   - ${user.employee_id}: ${user.employee_name} (last seen: ${user.last_seen_in_ad})`);
      });
    } else {
      console.log(`✅ No stale users found (all users seen within ${thresholdDays} days)`);
    }

    return result.rowCount;
  } catch (err) {
    console.error("❌ Stale user cleanup failed:", err);
    throw err;
  }
};

/* ================= SYNC ALL OUs ================= */

const syncAllOUs = async (req, res, triggeredBy = 'MANUAL') => {
  const runId = uuidv4();
  const startTime = new Date();
  
  // ✅ Truncate triggered_by to fit VARCHAR(50) constraint
  //const safeTriggeredBy = String(triggeredBy).substring(0, 50);
  const safeTriggeredBy = 'MANUAL';
    
  console.log("\n========================================");
  console.log(`🔄 STARTING AD SYNC (Run ID: ${runId})`);
  console.log(`⏰ Triggered by: ${safeTriggeredBy}`);
  console.log(`🗓️  Stale threshold: ${STALE_USER_THRESHOLD_DAYS} days`);
  console.log("========================================");

  try {
    const ous = await getAllOUsWithEmployees();

    console.log(`📂 Found ${ous.length} OU(s) with employees\n`);

    const ouResults = [];

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalUsers = 0;

    for (const ou of ous) {
      try {
        const result = await syncSingleOU(ou.full_path, runId);

        ouResults.push({
          ou_path: ou.full_path,
          total_users: result.total,
          inserted: result.inserted,
          updated: result.updated,
          failed: result.failed,
          skipped: result.skipped,
          status: 'SUCCESS'
        });

        totalInserted += result.inserted;
        totalUpdated += result.updated;
        totalFailed += result.failed;
        totalSkipped += result.skipped;
        totalUsers += result.total;
      } catch (error) {
        console.error(`  [OU: ${ou.full_path}] ✗ Error: ${error.error || error.message}`);

        ouResults.push({
          ou_path: ou.full_path,
          total_users: 0,
          inserted: 0,
          updated: 0,
          failed: 0,
          skipped: 0,
          status: 'FAILURE'
        });
      }
    }

    // ✅ Deactivate stale users
    const deactivatedCount = await deactivateStaleUsers(STALE_USER_THRESHOLD_DAYS);

    const endTime = new Date();
    const durationSeconds = Math.round((endTime - startTime) / 1000);

    const successCount = ouResults.filter(ou => ou.status === 'SUCCESS').length;
    let overallStatus = 'SUCCESS';
    if (successCount === 0) {
      overallStatus = 'FAILURE';
    } else if (successCount < ous.length) {
      overallStatus = 'PARTIAL';
    }

    // ✅ Log field lengths to help debug VARCHAR errors
    if (safeTriggeredBy.length > 45) {
      console.log(`⚠️  Warning: triggered_by length is ${safeTriggeredBy.length} chars (max 50)`);
    }

    await pool.query(
      `INSERT INTO ad_sync_runs 
       (run_id, start_time, end_time, duration_seconds, total_ous, total_users, 
        inserted, updated, failed, skipped, status, triggered_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        runId,
        startTime,
        endTime,
        durationSeconds,
        ous.length,
        totalUsers,
        totalInserted,
        totalUpdated,
        totalFailed,
        totalSkipped,
        overallStatus,
        safeTriggeredBy
      ]
    );

    console.log("\n========================================");
    console.log(`${overallStatus === 'SUCCESS' ? '✅' : overallStatus === 'PARTIAL' ? '⚠️' : '❌'} SYNC ${overallStatus}`);
    console.log("========================================");
    console.log(`⏱️  Duration: ${durationSeconds}s`);
    console.log(`📊 OUs Processed: ${ous.length} (${successCount} success, ${ous.length - successCount} failed)`);
    console.log(`👥 Total Users: ${totalUsers}`);
    console.log(`➕ Inserted: ${totalInserted}`);
    console.log(`🔄 Updated: ${totalUpdated}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`⏭️  Skipped: ${totalSkipped}`);
    console.log(`🧹 Deactivated (Stale): ${deactivatedCount}`);
    console.log("========================================\n");

    const runData = {
      run_id: runId,
      status: overallStatus,
      total_ous: ous.length,
      total_users: totalUsers,
      inserted: totalInserted,
      updated: totalUpdated,
      failed: totalFailed,
      skipped: totalSkipped,
      deactivated: deactivatedCount,
      duration_seconds: durationSeconds,
      triggered_by: safeTriggeredBy
    };

    await sendSyncEmail(runData, ouResults);

    if (res) {
      return res.json({
        status: true,
        message: `Sync completed with status: ${overallStatus}`,
        run_id: runId,
        summary: {
          status: overallStatus,
          total_ous: ous.length,
          total_users: totalUsers,
          inserted: totalInserted,
          updated: totalUpdated,
          failed: totalFailed,
          skipped: totalSkipped,
          deactivated: deactivatedCount,
          duration_seconds: durationSeconds,
        },
        ous: ouResults,
      });
    }

    return { success: true, run_id: runId };
  } catch (err) {
    console.error("❌ SYNC ALL OUs CRASHED:", err);

    const endTime = new Date();
    const durationSeconds = Math.round((endTime - startTime) / 1000);

    await pool.query(
      `INSERT INTO ad_sync_runs 
       (run_id, start_time, end_time, duration_seconds, total_ous, total_users, 
        inserted, updated, failed, skipped, status, triggered_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [runId, startTime, endTime, durationSeconds, 0, 0, 0, 0, 0, 0, 'FAILURE', safeTriggeredBy]
    );

    const runData = {
      run_id: runId,
      status: 'FAILURE',
      total_ous: 0,
      total_users: 0,
      inserted: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      deactivated: 0,
      duration_seconds: durationSeconds,
      triggered_by: safeTriggeredBy
    };

    await sendSyncEmail(runData, [{
      ou_path: 'ALL',
      total_users: 0,
      inserted: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      status: 'FAILURE'
    }]);

    if (res) {
      return res.status(500).json({
        status: false,
        error: err.message,
        run_id: runId
      });
    }

    return { success: false, run_id: runId, error: err.message };
  }
};

/* ================= ENDPOINTS ================= */

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

const getSyncHistory = async (req, res) => {

  try {
    const limit = parseInt(req.query.limit) || 20;

    const result = await pool.query(
      `SELECT * FROM ad_sync_runs 
       ORDER BY created_on DESC 
       LIMIT $1`,
      [limit]
    );

    return res.json({
      status: true,
      runs: result.rows
    });
  } catch (err) {
    console.error("[Sync History Error]", err);
    return res.status(500).json({
      status: false,
      error: err.message
    });
  }
};

const getRunDetails = async (req, res) => {
  try {
    const { runId } = req.params;

    const runResult = await pool.query(
      `SELECT * FROM ad_sync_runs WHERE run_id = $1`,
      [runId]
    );

    if (runResult.rows.length === 0) {
      return res.status(404).json({
        status: false,
        error: 'Run not found'
      });
    }

    const ouResult = await pool.query(
      `SELECT * FROM ad_sync_ou_log 
       WHERE run_id = $1 
       ORDER BY created_on`,
      [runId]
    );

    return res.json({
      status: true,
      run: runResult.rows[0],
      ous: ouResult.rows
    });
  } catch (err) {
    console.error("[Run Details Error]", err);
    return res.status(500).json({
      status: false,
      error: err.message
    });
  }
};

const getStaleUsersReport = async (req, res) => {
  try {
    const thresholdDays = parseInt(req.query.days) || STALE_USER_THRESHOLD_DAYS;

    const result = await pool.query(
      `SELECT 
         employee_id,
         employee_name,
         employee_code,
         department,
         email,
         status,
         is_active,
         last_seen_in_ad,
         EXTRACT(DAY FROM (NOW() - last_seen_in_ad)) as days_since_seen
       FROM user_master
       WHERE last_seen_in_ad < NOW() - INTERVAL '${thresholdDays} days'
       ORDER BY last_seen_in_ad ASC`,
      []
    );

    return res.json({
      status: true,
      message: `Found ${result.rowCount} users not seen in ${thresholdDays}+ days`,
      threshold_days: thresholdDays,
      users: result.rows
    });
  } catch (err) {
    console.error("[Stale Users Report Error]", err);
    return res.status(500).json({
      status: false,
      error: err.message
    });
  }
};

const detectADChanges = async (sinceDate) => {
  const baseDN = "DC=uniwin,DC=local";
  
  const adDate = sinceDate.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '.0');

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
        filter: `(&(objectClass=user)(sAMAccountName=*)(whenChanged>=${adDate}))`,
        attributes: ATTRS,
      },
      (err, results) => {
        if (err) return reject(err);
        resolve((results?.users || []).map(deepClean));
      }
    );
  });
};

const autoSyncChanges = async (req, res) => {
  const runId = uuidv4();
  const startTime = new Date();

  console.log("\n========================================");
  console.log(`🔄 STARTING AUTO-SYNC (Run ID: ${runId})`);
  console.log("========================================");

  try {
    const lastSyncResult = await pool.query(
      `SELECT end_time FROM ad_sync_runs 
       WHERE status = 'SUCCESS' 
       ORDER BY end_time DESC 
       LIMIT 1`
    );

    const sinceDate = lastSyncResult.rows.length > 0 
      ? new Date(lastSyncResult.rows[0].end_time)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log(`📅 Checking for changes since: ${sinceDate.toISOString()}`);

    const changedUsers = await detectADChanges(sinceDate);

    console.log(`🔍 Found ${changedUsers.length} changed users`);

    if (changedUsers.length === 0) {
      console.log("✅ No changes detected");
      
      const deactivatedCount = await deactivateStaleUsers(STALE_USER_THRESHOLD_DAYS);
      
      return res.json({
        status: true,
        message: "No changes detected in AD",
        run_id: runId,
        summary: {
          changed_users: 0,
          inserted: 0,
          updated: 0,
          failed: 0,
          skipped: 0,
          deactivated: deactivatedCount
        }
      });
    }

    // Process changed users (similar logic to syncSingleOU but for specific users)
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const u of changedUsers) {
      const employeeId = safe(u.sAMAccountName);
      
      if (!employeeId) {
        skipped++;
        continue;
      }

      const isActive = isActiveUser(u.userAccountControl);
      const status = isActive ? 'Active' : 'Inactive';

      const existingUser = await pool.query(
        'SELECT transaction_id FROM user_master WHERE employee_id = $1',
        [employeeId]
      );

      let transactionId;
      if (existingUser.rows.length > 0) {
        transactionId = existingUser.rows[0].transaction_id;
      } else {
        transactionId = await generateTransactionId();
      }

      let reportingManager = null;
let managersManager = null;

if (u.manager) {
  const mgr = await parseManagerInfo(u.manager);

  if (mgr) {
    reportingManager = mgr;

    if (mgr.managerDN) {
      const mgr2 = await parseManagerInfo(mgr.managerDN);
      if (mgr2) managersManager = mgr2;
    }
  }
}


      await pool.query(
        `INSERT INTO user_master 
         ( employee_name, employee_id, employee_code, department, location, 
          reporting_manager, managers_manager, status, company, mobile, email, 
          designation, last_seen_in_ad, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (employee_id) DO UPDATE SET
           employee_name = EXCLUDED.employee_name,
           employee_code = EXCLUDED.employee_code,
           department = EXCLUDED.department,
           location = EXCLUDED.location,
           reporting_manager = EXCLUDED.reporting_manager,
           managers_manager = EXCLUDED.managers_manager,
           status = EXCLUDED.status,
           company = EXCLUDED.company,
           mobile = EXCLUDED.mobile,
           email = EXCLUDED.email,
           designation = EXCLUDED.designation,
           last_seen_in_ad = EXCLUDED.last_seen_in_ad,
           is_active = EXCLUDED.is_active,
           last_sync = CURRENT_TIMESTAMP,
           updated_on = CURRENT_TIMESTAMP`,
        [
          safe(u.displayName),
          employeeId,
          safe(u.employeeID),
          safe(u.department),
          safe(u.physicalDeliveryOfficeName),
          reportingManager ? JSON.stringify(reportingManager) : null,
managersManager ? JSON.stringify(managersManager) : null,

          status,
          safe(u.company),
          safe(u.mobile),
          safe(u.mail),
          safe(u.title),
          new Date(),
          isActive
        ]
      );

      if (existingUser.rows.length > 0) {
        updated++;
      } else {
        inserted++;
      }
    }

    const deactivatedCount = await deactivateStaleUsers(STALE_USER_THRESHOLD_DAYS);

    const endTime = new Date();
    const durationSeconds = Math.round((endTime - startTime) / 1000);

    await pool.query(
      `INSERT INTO ad_sync_runs 
       (run_id, start_time, end_time, duration_seconds, total_ous, total_users, 
        inserted, updated, failed, skipped, status, triggered_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [runId, startTime, endTime, durationSeconds, 0, changedUsers.length, inserted, updated, 0, skipped, 'SUCCESS', 'AUTO_SYNC']
    );

    console.log("\n========================================");
    console.log("✅ AUTO-SYNC COMPLETED");
    console.log("========================================");
    console.log(`⏱️  Duration: ${durationSeconds}s`);
    console.log(`👥 Changed Users: ${changedUsers.length}`);
    console.log(`➕ Inserted: ${inserted}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`🧹 Deactivated (Stale): ${deactivatedCount}`);
    console.log("========================================\n");

    return res.json({
      status: true,
      message: "Auto-sync completed successfully",
      run_id: runId,
      summary: {
        changed_users: changedUsers.length,
        inserted,
        updated,
        failed: 0,
        skipped,
        deactivated: deactivatedCount,
        duration_seconds: durationSeconds
      }
    });
  } catch (err) {
    console.error("❌ AUTO-SYNC FAILED:", err);

    const endTime = new Date();
    const durationSeconds = Math.round((endTime - startTime) / 1000);

    await pool.query(
      `INSERT INTO ad_sync_runs 
       (run_id, start_time, end_time, duration_seconds, total_ous, total_users, 
        inserted, updated, failed, skipped, status, triggered_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [runId, startTime, endTime, durationSeconds, 0, 0, 0, 0, 0, 0, 'FAILURE', 'AUTO_SYNC']
    );

    return res.status(500).json({
      status: false,
      error: err.message,
      run_id: runId
    });
  }
};

module.exports = {
  syncAllOUs,
  getOUsWithEmployees,
  getSyncHistory,
  getRunDetails,
  autoSyncChanges,
  getStaleUsersReport,
  deactivateStaleUsers
};