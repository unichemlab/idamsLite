const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const ldap = require("ldapjs");
const plantRoutes = require("./routes/plantRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const roleRoutes = require("./routes/roleRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/task");
const userRoutes = require("./routes/userRoutes");
const userRequest = require("./routes/userRequest");
const serviceRequest = require("./routes/serviceRequest");
const applicationRoutes = require("./routes/applicationRoutes");
const systemRoutes = require("./routes/systemRoutes");
const swaggerRoutes = require("./routes/swagger");
const activityLogsRoutes = require("./routes/activityLog");
const ActiveDirectory = require("activedirectory2");
const adSyncRoutes = require("./routes/employeeSyncRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const approvalRoutes = require("./routes/approvalRoutes");
const approvalsRoutes = require("./routes/approvals");
const rbacRoutes = require("./routes/rbac");
const accessLogRoutes = require('./routes/accessLog');
const os = require("os");
const serverRoutes = require("./routes/serverRoutes");
const workflowRoutes = require("./routes/workflowRoutes");
const plantITSupportRoutes = require("./routes/transaction");
const masterApprovalRoutes = require("./routes/masterApprovalRoutes");
const app = express();

// Configure CORS to allow both localhost and deployed frontend
const allowedOrigins = [
  "http://localhost:3000",
  "https://pharmacorp-app-production.up.railway.appE",
  "https://idams-lite.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow non-browser requests like curl/postman
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);
app.use(express.json());

// Request metadata middleware
const requestMetadata = require("./middleware/requestMeta");
app.use(requestMetadata);

// -----------------------------
// Hardcoded AD credentials (for testing)
// -----------------------------
const AD_SERVER = process.env.AD_SERVER;
const AD_USER = process.env.AD_USER;
const AD_PASSWORD = process.env.AD_PASSWORD || process.env.AD_Password;

console.log("Connecting to AD:", AD_SERVER);

// Static file serving middleware (ensuring uploads folder is correctly handled)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/plants", plantRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/systems", systemRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/access-logs', accessLogRoutes);
app.use("/api/user-requests", userRequest);
app.use("/api/service-requests", serviceRequest);
app.use("/api/applications", applicationRoutes);
app.use("/api/docs", swaggerRoutes);
app.use("/api/activity-logs", activityLogsRoutes);
app.use("/api/servers", serverRoutes);
app.use("/api/approval", approvalRoutes);
app.use("/api/task", taskRoutes);
app.use("/api/plant-itsupport", plantITSupportRoutes);
app.use("/api/approvals", approvalsRoutes);
app.use("/api/rbac", rbacRoutes);
app.use("/api/master-approvals",masterApprovalRoutes);
// Use AD sync routes
app.use(adSyncRoutes);
app.use("/api/workflows", workflowRoutes);

app.get("/api/ad-users-sync", async (req, res) => {
  let totalRecords = 0,
    insertedRecords = 0,
    updatedRecords = 0,
    failedRecords = 0,
    syncStatus = "Success",
    errorMessage = null;

  try {
    const ou = req.query.ou || "OU=BADDI"; // dynamic OU support
    const baseDN = `OU=BADDI,DC=uniwin,DC=local`;

    // ----------------------------
    // Fetch previous last_sync for OU
    // ----------------------------
    let lastSyncTime = null;
    try {
      const lastSyncResult = await pool.query(
        `SELECT last_sync FROM ad_sync_status WHERE ou = $1`,
        [ou]
      );
      lastSyncTime = lastSyncResult.rows[0]?.last_sync || null;
    } catch (err) {
      console.warn("Could not fetch last sync timestamp:", err.message);
    }

    // ----------------------------
    // Build LDAP filter for incremental sync
    // ----------------------------
    let ldapFilter = "(objectClass=user)";
    if (lastSyncTime) {
      const pad = (n) => (n < 10 ? "0" + n : n);
      const dt = lastSyncTime;
      const ldapDate = `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(
        dt.getUTCDate()
      )}${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(
        dt.getUTCSeconds()
      )}.0Z`;
      ldapFilter = `(&(objectClass=user)(whenChanged>=${ldapDate}))`;
    }

    const ad = new ActiveDirectory({
      url: AD_SERVER,
      username: AD_USER,
      password: AD_PASSWORD,
      baseDN,
    });

    const managerCache = {};

    const getManager = async (managerDN) => {
      if (!managerDN) return null;
      if (managerCache[managerDN]) return managerCache[managerDN];

      return new Promise((resolve) => {
        ad.find(
          {
            baseDN,
            filter: `(distinguishedName=${managerDN})`,
            attributes: ["*"],
          },
          (err, result) => {
            if (err || !result?.users?.length) return resolve(null);
            const m = result.users[0];
            const info = {
              dn: m.distinguishedName,
              cn: m.cn,
              sAMAccountName: m.sAMAccountName,
              title: m.title || "",
              department: m.department || "",
              mail: m.mail || "",
              managerDN: m.manager || null,
            };
            managerCache[managerDN] = info;
            resolve(info);
          }
        );
      });
    };
console.log("Using LDAP filter:", baseDN, ldapFilter);
    // ----------------------------
    // Fetch AD users incrementally
    // ----------------------------
    ad.find(
      {
        baseDN,
        filter: ldapFilter,
        attributes: ["*"],
        scope: "sub",
      },
      async (err, results) => {
        if (err) {
          syncStatus = "Failed";
          errorMessage = err.message;

          await pool.query(
            `INSERT INTO ad_sync_log 
              (ou, total_records, inserted_records, updated_records, failed_records, status, error_message, last_sync)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [ou, 0, 0, 0, 0, syncStatus, errorMessage, lastSyncTime]
          );

          return res.status(500).json({
            status: false,
            message: "❌ LDAP query error: " + err,
            users: [],
          });
        }

        const users = results.users || [];
        totalRecords = users.length;
        console.log(`Fetched ${totalRecords} user(s) from AD for OU: ${ou}`);
        for (const u of users) {
          try {
            let manager = null;
            let managersManager = null;

            if (u.manager) {
              manager = await getManager(u.manager);
              if (manager?.managerDN)
                managersManager = await getManager(manager.managerDN);
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
              direct_reporting: u.directReports || [],
              reporting_manager: manager,
              managers_manager: managersManager,
              status:
                (parseInt(u.userAccountControl || 0) & 0x2) === 0x2
                  ? "Inactive"
                  : "Active",
            };

            // UPSERT by employee_code
            const result = await pool.query(
              `INSERT INTO user_master (
                  employee_name, employee_id, employee_code, department, location,
                  direct_reporting, reporting_manager, managers_manager,
                  status, company, mobile, email, designation, last_sync, updated_on
                )
                VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13,NOW(),NOW())
                ON CONFLICT (employee_code)
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
                  updated_on = NOW()
                WHERE user_master.employee_name IS DISTINCT FROM EXCLUDED.employee_name
                   OR user_master.employee_id IS DISTINCT FROM EXCLUDED.employee_id
                   OR user_master.department IS DISTINCT FROM EXCLUDED.department
                   OR user_master.location IS DISTINCT FROM EXCLUDED.location
                   OR user_master.direct_reporting IS DISTINCT FROM EXCLUDED.direct_reporting
                   OR user_master.reporting_manager IS DISTINCT FROM EXCLUDED.reporting_manager
                   OR user_master.managers_manager IS DISTINCT FROM EXCLUDED.managers_manager
                   OR user_master.status IS DISTINCT FROM EXCLUDED.status
                   OR user_master.company IS DISTINCT FROM EXCLUDED.company
                   OR user_master.mobile IS DISTINCT FROM EXCLUDED.mobile
                   OR user_master.email IS DISTINCT FROM EXCLUDED.email
                   OR user_master.designation IS DISTINCT FROM EXCLUDED.designation`,
              [
                userObj.employee_name,
                userObj.employee_id,
                userObj.employee_code,
                userObj.department,
                userObj.location,
                JSON.stringify(userObj.direct_reporting),
                JSON.stringify(userObj.reporting_manager),
                JSON.stringify(userObj.managers_manager),
                userObj.status,
                userObj.company,
                userObj.mobile,
                userObj.email,
                userObj.designation,
              ]
            );

            if (result.rowCount === 1) insertedRecords++;
            else updatedRecords++;
          } catch (userErr) {
            failedRecords++;
            console.error("Failed to sync user:", u.sAMAccountName, userErr);
          }
        }

        // ----------------------------
        // Update last sync timestamp for this OU
        // ----------------------------
        await pool.query(
          `INSERT INTO ad_sync_status (ou, last_sync)
           VALUES ($1, NOW())
           ON CONFLICT (ou) DO UPDATE SET last_sync = EXCLUDED.last_sync`,
          [ou]
        );

        // ----------------------------
        // Log sync in ad_sync_log with previous last_sync
        // ----------------------------
        await pool.query(
          `INSERT INTO ad_sync_log 
            (ou, total_records, inserted_records, updated_records, failed_records, status, error_message, last_sync)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            ou,
            totalRecords,
            insertedRecords,
            updatedRecords,
            failedRecords,
            syncStatus,
            errorMessage,
            lastSyncTime,
          ]
        );

        return res.json({
          status: true,
          message: `✅ Synced ${totalRecords} user(s). Inserted: ${insertedRecords}, Updated: ${updatedRecords}, Failed: ${failedRecords}`,
          users: users,
          baseDN,
        });
      }
    );
  } catch (err) {
    console.error(err);
    await pool.query(
      `INSERT INTO ad_sync_log 
        (ou, total_records, inserted_records, updated_records, failed_records, status, error_message, last_sync)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ["N/A", 0, 0, 0, 0, "Failed", err.message, null]
    );
    res.status(500).json({
      status: false,
      message: "❌ Sync failed: " + err.message,
      users: [],
    });
  }
});

// API: Check AD connection
// -----------------------------
app.get("/api/ad-check", async (req, res) => {
  try {
    const baseDN = "OU=BADDI,DC=uniwin,DC=local";

    const config = {
      url: AD_SERVER,
      username: AD_USER,
      password: AD_PASSWORD,
      baseDN,
    };

    const ad = new ActiveDirectory(config);

    ad.findUser(AD_USER, (err, user) => {
      if (err)
        return res
          .status(500)
          .json({ status: false, message: "AD connection failed: " + err });
      res.json({
        status: true,
        message: "✅ AD connected successfully",
        user: user || {},
        baseDN,
      });
    });
  } catch (err) {
    res
      .status(500)
      .json({ status: false, message: "Error detecting Base DN: " + err });
  }
});

app.get("/api/ad-ous-tree", async (req, res) => {
  try {
    const baseDN = "DC=uniwin,DC=local";

    const ad = new ActiveDirectory({
      url: AD_SERVER,
      username: AD_USER,
      password: AD_PASSWORD,
      baseDN,
    });

    const only = (req.query.only || "").toLowerCase();
    let perOULimit = parseInt(req.query.limit || "100", 10);
    if (isNaN(perOULimit) || perOULimit < 0) perOULimit = 100;

    // Step 1: Fetch all OUs
    ad.find(
      {
        baseDN,
        filter: "(objectClass=organizationalUnit)",
        scope: "sub",
        attributes: ["ou", "name", "distinguishedName", "description"],
      },
      async (ouErr, ouRes) => {
        if (ouErr)
          return res.status(500).json({
            status: false,
            message: "OU query error: " + ouErr,
            ousTree: [],
            ousFlat: [],
          });

        const ous = [
          ...(ouRes?.ous || []),
          ...(ouRes?.other || []),
          ...(Array.isArray(ouRes) ? ouRes : []),
        ];
        const ouMap = {};
        const tree = [];
        const managerCache = {}; // cache manager lookups

        // Map OUs
        ous.forEach((ou) => {
          ouMap[ou.distinguishedName] = {
            name: ou.ou || ou.name || "",
            dn: ou.distinguishedName,
            parentDn:
              ou.distinguishedName.split(",").slice(1).join(",") || null,
            description: ou.description || "",
            children: [],
            users: [],
            groups: [],
            allMembers: [],
            totalUsers: 0,
            activeUsers: 0,
            disabledUsers: 0,
            totalUsersIncludingChildren: 0,
            activeUsersIncludingChildren: 0,
            disabledUsersIncludingChildren: 0,
            totalGroupsIncludingChildren: 0,
          };
        });

        // Attach children to parent
        ous.forEach((ou) => {
          const parentDn = ouMap[ou.distinguishedName].parentDn;
          if (parentDn && ouMap[parentDn])
            ouMap[parentDn].children.push(ouMap[ou.distinguishedName]);
          else tree.push(ouMap[ou.distinguishedName]);
        });

        const domainSummary = {
          totalUsers: 0,
          activeUsers: 0,
          disabledUsers: 0,
        };

        // Helper: fetch a manager by DN
        const getManager = async (managerDN) => {
          if (!managerDN) return null;
          if (managerCache[managerDN]) return managerCache[managerDN];

          return new Promise((resolve) => {
            ad.findUser(managerDN, (err, manager) => {
              if (err || !manager) return resolve(null);
              const info = {
                dn: manager.distinguishedName,
                cn: manager.cn,
                sAMAccountName: manager.sAMAccountName,
                title: manager.title || null,
                department: manager.department || null,
                mail: manager.mail || null,
                managerDN: manager.manager || null,
              };
              managerCache[managerDN] = info;
              resolve(info);
            });
          });
        };

        // Recursive function to fetch users and groups per OU
        const fetchObjectsForOU = async (ouNode) => {
          return new Promise((resolve) => {
            let userFilter = "(objectClass=user)";
            if (only === "active")
              userFilter =
                "(&" +
                userFilter +
                "(!(userAccountControl:1.2.840.113556.1.4.803:=2)))";
            else if (only === "disabled")
              userFilter =
                "(&" +
                userFilter +
                "(userAccountControl:1.2.840.113556.1.4.803:=2))";

            ad.find(
              {
                baseDN: ouNode.dn,
                filter: userFilter,
                scope: "one",
                attributes: [
                  "cn",
                  "sAMAccountName",
                  "userPrincipalName",
                  "userAccountControl",
                  "distinguishedName",
                  "manager",
                ],
              },
              async (userErr, userRes) => {
                const users = [];

                if (!userErr && userRes?.entries?.length) {
                  for (const u of userRes.entries) {
                    const uac = parseInt(u.userAccountControl || "0", 10);
                    const isDisabled = (uac & 0x2) === 0x2;
                    if (
                      (only === "active" && isDisabled) ||
                      (only === "disabled" && !isDisabled)
                    )
                      continue;

                    const ouArray = u.distinguishedName
                      .split(",")
                      .filter((part) => part.startsWith("OU="))
                      .map((part) => part.replace("OU=", ""));

                    const userObj = { ...u, isDisabled, ous: ouArray };
                    if (users.length < perOULimit) users.push(userObj);

                    ouNode.totalUsers += 1;
                    if (isDisabled) ouNode.disabledUsers += 1;
                    else ouNode.activeUsers += 1;

                    domainSummary.totalUsers += 1;
                    if (isDisabled) domainSummary.disabledUsers += 1;
                    else domainSummary.activeUsers += 1;
                  }
                }
                ouNode.users = users;

                // --- Groups ---
                ad.find(
                  {
                    baseDN: ouNode.dn,
                    filter: "(objectClass=group)",
                    scope: "one",
                    attributes: [
                      "cn",
                      "sAMAccountName",
                      "distinguishedName",
                      "member",
                    ],
                  },
                  async (groupErr, groupRes) => {
                    if (!groupErr && groupRes?.entries?.length) {
                      ouNode.groups = groupRes.entries.slice(0, perOULimit);
                    }

                    // --- allMembers with manager info ---
                    const allMembers = [];
                    for (const u of users) {
                      let manager = null,
                        managersManager = null;
                      if (u.manager) {
                        manager = await getManager(u.manager);
                        if (manager?.managerDN)
                          managersManager = await getManager(manager.managerDN);
                      }

                      allMembers.push({
                        ...u,
                        manager,
                        managersManager,
                      });
                    }
                    ouNode.allMembers = [...allMembers, ...ouNode.groups];

                    // Recursively fetch children
                    let totalUsersChildren = ouNode.totalUsers;
                    let activeUsersChildren = ouNode.activeUsers;
                    let disabledUsersChildren = ouNode.disabledUsers;
                    let totalGroupsChildren = ouNode.groups.length;

                    for (const child of ouNode.children) {
                      await fetchObjectsForOU(child);
                      totalUsersChildren +=
                        child.totalUsersIncludingChildren || 0;
                      activeUsersChildren +=
                        child.activeUsersIncludingChildren || 0;
                      disabledUsersChildren +=
                        child.disabledUsersIncludingChildren || 0;
                      totalGroupsChildren +=
                        child.totalGroupsIncludingChildren || 0;

                      ouNode.allMembers.push(...child.allMembers);
                    }

                    ouNode.totalUsersIncludingChildren = totalUsersChildren;
                    ouNode.activeUsersIncludingChildren = activeUsersChildren;
                    ouNode.disabledUsersIncludingChildren =
                      disabledUsersChildren;
                    ouNode.totalGroupsIncludingChildren = totalGroupsChildren;

                    resolve();
                  }
                );
              }
            );
          });
        };

        for (const root of tree) {
          await fetchObjectsForOU(root);
        }

        // Flatten tree for convenience
        const flattenedOUs = [];
        const flattenTree = (nodes, depth = 0) => {
          nodes.forEach((n) => {
            flattenedOUs.push({
              dn: n.dn,
              parentDn: n.parentDn,
              name: n.name,
              description: n.description,
              depth,
              totalUsers: n.totalUsers,
              activeUsers: n.activeUsers,
              disabledUsers: n.disabledUsers,
              totalUsersIncludingChildren: n.totalUsersIncludingChildren,
              activeUsersIncludingChildren: n.activeUsersIncludingChildren,
              disabledUsersIncludingChildren: n.disabledUsersIncludingChildren,
              totalGroupsIncludingChildren: n.totalGroupsIncludingChildren,
              users: n.users,
              groups: n.groups,
              allMembers: n.allMembers,
            });
            if (n.children.length > 0) flattenTree(n.children, depth + 1);
          });
        };
        flattenTree(tree);

        res.json({
          status: true,
          message: `Fetched ${ous.length} OU(s) with users, groups, and manager info in allMembers only`,
          summary: domainSummary,
          ousTree: tree,
          ousFlat: flattenedOUs,
        });
      }
    );
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Server error: " + err,
      ousTree: [],
      ousFlat: [],
    });
  }
});

app.get("/api/ad-ous-list", (req, res) => {
  const baseDN = "DC=uniwin,DC=local";

  const config = {
    url: AD_SERVER,
    username: AD_USER,
    password: AD_PASSWORD,
    baseDN,
  };
  const ad = new ActiveDirectory(config);

  ad.find(
    {
      baseDN: config.baseDN,
      filter: "(objectClass=organizationalUnit)",
      scope: "sub",
      attributes: ["distinguishedName"],
    },
    (err, result) => {
      if (err) return res.status(500).json({ status: false, message: err });

      const ous = [
        ...(result?.ous || []),
        ...(result?.other || []),
        ...(Array.isArray(result) ? result : []),
      ];
      let ouNames = [];

      ous.forEach((ou) => {
        if (ou.distinguishedName) {
          // Split DN into parts like ["OU=USERS", "OU=DEPT_UNICHEM-IT", "DC=uniwin", "DC=local"]
          const parts = ou.distinguishedName.split(",");
          parts.forEach((p) => {
            if (p.startsWith("OU=")) {
              ouNames.push(p.replace("OU=", ""));
            }
          });
        }
      });

      // Remove duplicates
      const distinctOUs = [...new Set(ouNames)];

      return res.json({
        status: true,
        message: `Fetched ${distinctOUs.length} distinct OU(s)`,
        ous: distinctOUs,
      });
    }
  );
});

// -----------------------------
// API: Fetch first 100 AD users with manager info
// -----------------------------
app.get("/api/ad-users", async (req, res) => {
  try {
    const baseDN = "OU=BADDI,DC=uniwin,DC=local";

    const config = {
      url: AD_SERVER,
      username: AD_USER,
      password: AD_PASSWORD,
      baseDN,
    };

    const ad = new ActiveDirectory(config);
    const managerCache = {}; // cache for manager lookups

    // Helper to fetch manager by DN
    const getUserByDN = async (userDN) => {
      if (!userDN) return null;

      // Check cache for managers
      if (managerCache[userDN]) return managerCache[userDN];

      return new Promise((resolve) => {
        ad.find(
          {
            baseDN,
            filter: `(distinguishedName=${userDN})`,
            attributes: ["*"],
          },
          (err, result) => {
            if (err || !result || !result.users || !result.users.length)
              return resolve(null);
            const u = result.users[0];
            const userInfo = {
              dn: u.distinguishedName,
              displayName: u.displayName || "",
              sAMAccountName: u.sAMAccountName || "",
              email: u.mail || "",
              employeeCode: u.employeeID,
              managerDN: u.manager || null,
            };
            managerCache[userDN] = userInfo;
            resolve(userInfo);
          }
        );
      });
    };

    // Fetch all users
    ad.find(
      {
        baseDN,
        filter: "(objectClass=user)",
        attributes: ["*"],
        scope: "sub",
      },
      async (err, results) => {
        if (err) {
          return res.status(500).json({
            status: false,
            message: "❌ LDAP query error: " + err,
            users: [],
          });
        }

        if (!results || !results.users || results.users.length === 0) {
          return res.json({
            status: true,
            message: "✅ No users found",
            users: [],
            baseDN,
          });
        }

        // Take first 100 users
        const first100 = results.users;

        // Add manager and manager's manager
        const usersWithManagers = [];
        for (const u of first100) {
          // Manager
          let manager = null;
          let managersManager = null;
          if (u.manager) {
            manager = await getUserByDN(u.manager);
            if (manager?.managerDN) {
              managersManager = await getUserByDN(manager.managerDN);
            }
          }

          // Direct Reports
          let directReportsExpanded = [];
          if (Array.isArray(u.directReports)) {
            directReportsExpanded = await Promise.all(
              u.directReports.map((drDN) => getUserByDN(drDN))
            );
            directReportsExpanded = directReportsExpanded.filter(Boolean);
          }

          usersWithManagers.push({
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
            status:
              ((parseInt(u.userAccountControl || 0) & 0x2) === 0x2) == false
                ? "Active"
                : "Inactive",
          });
        }

        return res.json({
          status: true,
          message: `✅ Fetched ${usersWithManagers.length} user(s) with manager info`,
          users: usersWithManagers,
          baseDN,
        });
      }
    );
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "❌ Error detecting Base DN: " + err,
      users: [],
    });
  }
});

app.get("/api/ad-disabled-users", async (req, res) => {
  try {
    const baseDN = "OU=JOGESHWARI,DC=uniwin,DC=local";

    const config = {
      url: AD_SERVER,
      username: AD_USER,
      password: AD_PASSWORD,
      baseDN,
    };

    const ad = new ActiveDirectory(config);

    ad.find(
      {
        baseDN,
        filter:
          "(&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=2))", // ✅ Disabled users only
        attributes: ["*"], // fetch all attributes
        scope: "sub",
      },
      (err, results) => {
        if (err) {
          return res.status(500).json({
            status: false,
            message: "❌ LDAP query error: " + err,
            users: [],
          });
        }

        if (!results || !results.users || results.users.length === 0) {
          return res.json({
            status: true,
            message: "✅ No disabled users found",
            users: [],
            baseDN,
          });
        }

        // Limit to first 100 for safety
        const first100 = results.users.slice(0, 100);

        return res.json({
          status: true,
          message: `✅ Fetched ${first100.length} disabled user(s)`,
          users: first100,
          baseDN,
        });
      }
    );
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "❌ Error detecting Base DN: " + err,
      users: [],
    });
  }
});

// ✅ API: Get user details with manager and manager's manager
app.get("/api/user/:username", async (req, res) => {
  try {
    const baseDN = "DC=uniwin,DC=local";
    const username = req.params.username;

    const ad = new ActiveDirectory({
      url: AD_SERVER,
      username: AD_USER,
      password: AD_PASSWORD,
      baseDN,
    });

    const managerCache = {}; // cache for managers

    // Helper to fetch a user by DN
    const getUserByDN = async (userDN) => {
      if (!userDN) return null;

      // Check cache for managers
      if (managerCache[userDN]) return managerCache[userDN];

      return new Promise((resolve) => {
        ad.find(
          {
            baseDN,
            filter: `(distinguishedName=${userDN})`,
            attributes: ["*"],
          },
          (err, result) => {
            if (err || !result || !result.users || !result.users.length)
              return resolve(null);
            const u = result.users[0];
            const userInfo = {
              dn: u.distinguishedName,
              displayName: u.displayName || "",
              sAMAccountName: u.sAMAccountName || "",
              email: u.mail || "",
              employeeCode: u.employeeID,
              managerDN: u.manager || null,
            };
            managerCache[userDN] = userInfo;
            resolve(userInfo);
          }
        );
      });
    };

    // Fetch main user
    ad.find(
      {
        baseDN,
        filter: `(sAMAccountName=${username})`,
        attributes: ["*"],
        scope: "sub",
      },
      async (err, results) => {
        if (err)
          return res
            .status(500)
            .json({ status: false, message: "LDAP query error: " + err });
        if (!results || !results.users || !results.users.length) {
          return res
            .status(404)
            .json({ status: false, message: `User '${username}' not found` });
        }

        const u = results.users[0];

        // Manager
        let manager = null;
        let managersManager = null;
        if (u.manager) {
          manager = await getUserByDN(u.manager);
          if (manager?.managerDN) {
            managersManager = await getUserByDN(manager.managerDN);
          }
        }

        // Direct Reports
        let directReportsExpanded = [];
        if (Array.isArray(u.directReports)) {
          directReportsExpanded = await Promise.all(
            u.directReports.map((drDN) => getUserByDN(drDN))
          );
          directReportsExpanded = directReportsExpanded.filter(Boolean);
        }

        // Build final response
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
          status: (parseInt(u.userAccountControl || 0) & 0x2) === 0x2,
        };

        return res.json({
          status: true,
          message: `User '${username}' full details fetched`,
          user: userObj,
        });
      }
    );
  } catch (err) {
    return res
      .status(500)
      .json({ status: false, message: "Server error: " + err });
  }
});

// ✅ API to get laptop login user
app.get("/api/current-user", (req, res) => {
  try {
    const userInfo = os.userInfo(); // username, homedir, shell
    const systemInfo = {
      platform: os.platform(), // e.g., 'win32'
      release: os.release(), // OS version
      arch: os.arch(), // CPU architecture
      hostname: os.hostname(), // machine name
      totalMem: os.totalmem(), // total system memory
      freeMem: os.freemem(), // free memory
      cpus: os.cpus().map((cpu) => cpu.model), // CPU model info
    };

    res.json({
      username: userInfo.username,
      homedir: userInfo.homedir,
      shell: userInfo.shell,
      system: systemInfo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get current user info" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
