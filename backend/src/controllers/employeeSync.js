const ActiveDirectory = require("activedirectory2");
const pool = require("../config/db"); // PostgreSQL pool

const AD_SERVER = process.env.AD_SERVER;
const AD_USER = process.env.AD_USER;
const AD_PASSWORD = process.env.AD_PASSWORD;

const syncADUsers = async (req, res) => {
  let totalRecords = 0,
      insertedRecords = 0,
      updatedRecords = 0,
      failedRecords = 0,
      syncStatus = "Success",
      errorMessage = null;

  try {
    const ou = req.query.ou || "OU=BADDI"; 
    const baseDN = `${ou},DC=uniwin,DC=local`;

    // Fetch last sync time from log
    let lastSyncTime = null;
    try {
      const lastSyncResult = await pool.query(
        `SELECT last_sync FROM ad_sync_log WHERE ou=$1 ORDER BY last_sync DESC LIMIT 1`,
        [ou]
      );
      lastSyncTime = lastSyncResult.rows[0]?.last_sync || null;
    } catch (err) {
      console.warn("Could not fetch last sync timestamp:", err.message);
    }

    // Build LDAP filter for incremental sync
    let ldapFilter = "(objectClass=user)";
    if (lastSyncTime) {
      const pad = (n) => (n < 10 ? "0" + n : n);
      const dt = lastSyncTime;
      const ldapDate = `${dt.getUTCFullYear()}${pad(dt.getUTCMonth()+1)}${pad(dt.getUTCDate())}${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}.0Z`;
      ldapFilter = `(&(objectClass=user)(whenChanged>=${ldapDate}))`;
    }

    const ad = new ActiveDirectory({ url: AD_SERVER, username: AD_USER, password: AD_PASSWORD, baseDN });
    const managerCache = {};

    // Helper: fetch user/manager by DN
    const getUserByDN = async (userDN) => {
      if (!userDN) return null;
      if (managerCache[userDN]) return managerCache[userDN];

      return new Promise((resolve) => {
        ad.find({ baseDN, filter: `(distinguishedName=${userDN})`, attributes: ["*"] }, (err, result) => {
          if (err || !result?.users?.length) return resolve(null);
          const u = result.users[0];
          const info = {
            dn: u.distinguishedName,
            displayName: u.displayName || "",
            sAMAccountName: u.sAMAccountName || "",
            email: u.mail || "",
            employeeCode: u.employeeID || "",
            managerDN: u.manager || null
          };
          managerCache[userDN] = info;
          resolve(info);
        });
      });
    };

    // Fetch users
    ad.find({ baseDN, filter: ldapFilter, attributes: ["*"], scope: "sub" }, async (err, results) => {
      if (err) {
        syncStatus = "Failed";
        errorMessage = err.message;
        await pool.query(
          `INSERT INTO ad_sync_log (ou,total_records,inserted_records,updated_records,failed_records,status,error_message,last_sync)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [ou, 0, 0, 0, 0, syncStatus, errorMessage, lastSyncTime]
        );
        return res.status(500).json({ status: false, message: "❌ LDAP query error: " + err, users: [] });
      }

      const users = results?.users || [];
      totalRecords = users.length;

      const userMap = {};
      users.forEach(u => { if (u.distinguishedName) userMap[u.distinguishedName] = u; });

      for (const u of users) {
        try {
          let manager = null, managersManager = null;

          if (u.manager) {
            manager = await getUserByDN(u.manager);
            if (manager?.managerDN) managersManager = await getUserByDN(manager.managerDN);
          }

          let directReportsExpanded = [];
          if (Array.isArray(u.directReports)) {
            directReportsExpanded = u.directReports
              .map(drDN => userMap[drDN])
              .filter(Boolean)
              .map(dr => ({
                dn: dr.distinguishedName,
                displayName: dr.displayName || "",
                sAMAccountName: dr.sAMAccountName || "",
                email: dr.mail || ""
              }));
          }

          const userObj = {
            employee_name: u.displayName || "",
            employee_code: u.employeeID || "",
            location: u.physicalDeliveryOfficeName || "",
            company: u.company || "",
            department: u.department || "",
            mobile: u.mobile || "",
            designation: u.title || "",
            employee_id: u.sAMAccountName || "",
            email: u.mail || "",
            direct_reporting: directReportsExpanded,
            reporting_manager: manager,
            managers_manager: managersManager,
            status: ((parseInt(u.userAccountControl || 0) & 0x2) === 0x2) ? "Inactive" : "Active"
          };

          const result = await pool.query(
            `INSERT INTO user_master (
                employee_name, employee_id, employee_code, department, location,
                direct_reporting, reporting_manager, managers_manager,
                status, company, mobile, email, designation, last_sync, updated_on
              )
              VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13,NOW(),NOW())
              ON CONFLICT (employee_id)
              DO UPDATE SET
                employee_name = EXCLUDED.employee_name,
                employee_id = EXCLUDED.employee_id,
                department = EXCLUDED.department,
                location = EXCLUDED.location,
                direct_reporting = EXCLUDED.direct_reporting,
                reporting_manager = EXCLUDED.reporting_manager,
                managers_manager = EXCLUDED.managers_manager,
                status = EXCLUDED.status,
                company = EXCLUDED.company,
                mobile = EXCLUDED.mobile,
                email = EXCLUDED.email,
                designation = EXCLUDED.designation,
                last_sync = NOW(),
                updated_on = NOW()`
            ,
            [
              userObj.employee_name, userObj.employee_id, userObj.employee_code, userObj.department, userObj.location,
              JSON.stringify(userObj.direct_reporting), JSON.stringify(userObj.reporting_manager), JSON.stringify(userObj.managers_manager),
              userObj.status, userObj.company, userObj.mobile, userObj.email, userObj.designation
            ]
          );

          if (result.rowCount === 1) insertedRecords++;
          else updatedRecords++;

        } catch (userErr) {
          failedRecords++;
          console.error("Failed to sync user:", u.sAMAccountName, userErr.message || userErr);
        }
      }

      // Log sync
      await pool.query(
        `INSERT INTO ad_sync_log (ou,total_records,inserted_records,updated_records,failed_records,status,error_message,last_sync)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [ou, totalRecords, insertedRecords, updatedRecords, failedRecords, syncStatus, errorMessage]
      );

      return res.json({
        status: true,
        message: `✅ Synced ${totalRecords} user(s). Inserted: ${insertedRecords}, Updated: ${updatedRecords}, Failed: ${failedRecords}`,
        users: users,
        baseDN
      });
    });

  } catch (err) {
    console.error(err);
    await pool.query(
      `INSERT INTO ad_sync_log (ou,total_records,inserted_records,updated_records,failed_records,status,error_message,last_sync)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      ["N/A", 0, 0, 0, 0, "Failed", err.message]
    );
    res.status(500).json({ status: false, message: "❌ Sync failed: " + err.message, users: [] });
  }
};

module.exports = { syncADUsers };
