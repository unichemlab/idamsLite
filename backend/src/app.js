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
const bulkImportRoutes = require('./routes/bulkImportRoutes');
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
app.use('/api/networks', require('./routes/networkRoutes'));
app.use("/api/task", taskRoutes);
app.use("/api/plant-itsupport", plantITSupportRoutes);
app.use("/api/approvals", approvalsRoutes);
app.use("/api/rbac", rbacRoutes);
app.use('/api', bulkImportRoutes);
app.use("/api/master-approvals", masterApprovalRoutes);
// Use AD sync routes
app.use(adSyncRoutes);
app.use("/api/workflows", workflowRoutes);
const USER_ATTRIBUTES = [
  "distinguishedName",
  "displayName",
  "employeeID",
  "employeeId",
  "sAMAccountName",
  "mail",
  "department",
  "company",
  "title",
  "mobile",
  "manager",
  "directReports",
  "physicalDeliveryOfficeName",
  "userAccountControl"
];

const normalizeADValue = (val) => {
  if (!val) return "";
  if (Array.isArray(val)) return val[0];
  if (Buffer.isBuffer(val)) return val.toString("utf8");
  return String(val);
};
const LDAP_FILTER =
  "(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(employeeID=*))";

const ACTIVE_EMPLOYEE_FILTER =
  "(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(employeeID=*))";



app.get("/api/ad-users", async (req, res) => {
  try {
    const baseDN = "DC=uniwin,DC=local";

    const ad = new ActiveDirectory({
      url: AD_SERVER,
      username: AD_USER,
      password: AD_PASSWORD,
      baseDN,
    });

    ad.find(
      {
        baseDN,
        filter: LDAP_FILTER,
        attributes: USER_ATTRIBUTES,
        scope: "sub",
        paged: {
          pageSize: 500,
          pagePause: false,
        },
      },
      (err, results) => {
        if (err) {
          return res.status(500).json({
            status: false,
            message: "❌ LDAP query error",
            error: err.message,
          });
        }

        const users = results?.users || [];
        if (!users.length) {
          return res.json({
            status: true,
            message: "✅ No users found",
            users: [],
          });
        }

        // 🔥 DN → User map (core optimization)
        const userByDN = {};
        users.forEach((u) => {
          if (u.distinguishedName) {
            userByDN[u.distinguishedName] = u;
          }
        });

        const response = users.map((u) => {
          const manager = userByDN[u.manager] || null;
          const managersManager =
            manager && manager.manager
              ? userByDN[manager.manager] || null
              : null;

          const directReports = Array.isArray(u.directReports)
            ? u.directReports
              .map((dn) => userByDN[dn])
              .filter(Boolean)
              .map((dr) => ({
                dn: dr.distinguishedName,
                displayName: dr.displayName || "",
                employee_id: dr.sAMAccountName || "",
                email: dr.mail || "",
                employee_code: normalizeADValue(
                  dr.employeeID || dr.employeeId
                ),
              }))
            : [];

          return {
            employee_name: u.displayName || "",
            employee_code: normalizeADValue(
              u.employeeID || u.employeeId
            ),
            location: u.physicalDeliveryOfficeName || "",
            company: u.company || "",
            department: u.department || "",
            mobile: u.mobile || "",
            designation: u.title || "",
            employee_id: u.sAMAccountName || "",
            email: u.mail || "",
            direct_reporting: directReports,
            reporting_manager: manager
              ? {
                employee_name: manager.displayName || "",
                employee_id: manager.sAMAccountName || "",
                email: manager.mail || "",
                employee_code: normalizeADValue(
                  manager.employeeID || manager.employeeId
                ),
              }
              : null,
            managers_manager: managersManager
              ? {
                employee_name: managersManager.displayName || "",
                employee_id: managersManager.sAMAccountName || "",
                email: managersManager.mail || "",
              }
              : null,
            status:
              (parseInt(u.userAccountControl || 0) & 0x2) === 0x2
                ? "Inactive"
                : "Active",
          };
        });

        return res.json({
          status: true,
          message: `✅ Fetched ${response.length} users (optimized, paged)`,
          users: response,
          baseDN,
        });
      }
    );
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "❌ Unexpected server error",
      error: err.message,
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

            if (only === "active") {
              userFilter =
                "(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(|(employeeID=*)(employeeId=*)))";
            } else if (only === "disabled") {
              userFilter =
                "(&(objectCategory=person)(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=2)(|(employeeID=*)(employeeId=*)))";
            }


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

app.get("/api/ad-ous-with-employees", (req, res) => {
  const baseDN = "DC=uniwin,DC=local";

  const ad = new ActiveDirectory({
    url: AD_SERVER,
    username: AD_USER,
    password: AD_PASSWORD,
    baseDN,
  });

  ad.find(
    {
      baseDN,
      filter:
        "(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(employeeID=*))",
      scope: "sub",
      attributes: ["distinguishedName"],
      paged: { pageSize: 500, pagePause: false },
    },
    (err, result) => {
      if (err) {
        return res.status(500).json({
          status: false,
          message: "LDAP error",
          error: err.message,
        });
      }

      const users = result?.users || [];
      const ouMap = {}; // OU DN → { name, dn, employee_count }

      users.forEach((u) => {
        if (!u.distinguishedName) return;

        const parts = u.distinguishedName.split(",");

        parts.forEach((p) => {
          if (p.startsWith("OU=")) {
            const ouName = p.replace("OU=", "");
            const ouDN = parts.slice(parts.indexOf(p)).join(",");

            if (!ouMap[ouDN]) {
              ouMap[ouDN] = {
                ou_name: ouName,
                ou_dn: ouDN,
                employee_count: 0,
              };
            }
            ouMap[ouDN].employee_count += 1;
          }
        });
      });

      const ous = Object.values(ouMap);
      const totalUsers = users.length; // ✅ correct & simple

      return res.json({
        status: true,
        message: `Fetched ${ous.length} OU(s) having active employees`,
        summary: {
          total_ous: ous.length,
          total_users: totalUsers,
        },
        ous,
      });
    }
  );
});

/**
 * Get all OUs with active employee counts
 * Improved version with better error handling and structure
 */
app.get("/api/ad-ous-with-employees1", async (req, res) => {
  const baseDN = "DC=uniwin,DC=local";

  try {
    const ad = new ActiveDirectory({
      url: AD_SERVER,
      username: AD_USER,
      password: AD_PASSWORD,
      baseDN,
    });

    // Wrap AD find in Promise for better error handling
    const getUsers = () => {
      return new Promise((resolve, reject) => {
        ad.find(
          {
            baseDN,
            filter:
              "(&(objectCategory=person)(objectClass=user)" +
              "(!(userAccountControl:1.2.840.113556.1.4.803:=2))" +
              "(sAMAccountName=*))", // FIXED: Only users with sAMAccountName
            scope: "sub",
            attributes: ["distinguishedName", "sAMAccountName"],
            paged: { pageSize: 500, pagePause: false },
          },
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        );
      });
    };

    const result = await getUsers();
    const users = result?.users || [];

    console.log(`[OU Fetch] Found ${users.length} active users with valid sAMAccountName`);

    const ouMap = {}; // OU DN → { ou_name, ou_dn, employee_count, employees }

    users.forEach((u) => {
      if (!u.distinguishedName || !u.sAMAccountName) return;

      const parts = u.distinguishedName.split(",");

      // Process each OU in the DN hierarchy
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        if (part.startsWith("OU=")) {
          const ouName = part.replace("OU=", "");
          // Build OU DN from this point to the end
          const ouDN = parts.slice(i).join(",");

          if (!ouMap[ouDN]) {
            ouMap[ouDN] = {
              ou_name: ouName,
              ou_dn: ouDN,
              employee_count: 0,
              employees: new Set(), // Track unique employees
            };
          }
          
          // Add employee to this OU (prevents double counting)
          ouMap[ouDN].employees.add(u.sAMAccountName);
          ouMap[ouDN].employee_count = ouMap[ouDN].employees.size;
        }
      }
    });

    // Convert to array and remove the employees Set
    const ous = Object.values(ouMap).map(ou => ({
      ou_name: ou.ou_name,
      ou_dn: ou.ou_dn,
      employee_count: ou.employee_count
    }));

    // Sort by employee count descending
    ous.sort((a, b) => b.employee_count - a.employee_count);

    const totalUsers = users.length;

    console.log(`[OU Fetch] Returning ${ous.length} OUs`);

    return res.json({
      status: true,
      message: `Fetched ${ous.length} OU(s) having active employees`,
      summary: {
        total_ous: ous.length,
        total_users: totalUsers,
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
});

/**
 * Alternative: Get only top-level OUs with direct employee counts
 */
app.get("/api/ad-ous-top-level", async (req, res) => {
  const baseDN = "DC=uniwin,DC=local";

  try {
    const ad = new ActiveDirectory({
      url: process.env.AD_SERVER,
      username: process.env.AD_USER,
      password: process.env.AD_PASSWORD,
      baseDN,
    });

    const getUsers = () => {
      return new Promise((resolve, reject) => {
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
            resolve(result);
          }
        );
      });
    };

    const result = await getUsers();
    const users = result?.users || [];

    const ouMap = {};

    users.forEach((u) => {
      if (!u.distinguishedName || !u.sAMAccountName) return;

      const parts = u.distinguishedName.split(",");

      // Find the FIRST (top-level) OU
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].startsWith("OU=")) {
          const ouName = parts[i].replace("OU=", "");
          const ouDN = parts.slice(i).join(",");

          if (!ouMap[ouDN]) {
            ouMap[ouDN] = {
              ou_name: ouName,
              ou_dn: ouDN,
              employee_count: 0,
              employees: new Set(),
            };
          }

          ouMap[ouDN].employees.add(u.sAMAccountName);
          ouMap[ouDN].employee_count = ouMap[ouDN].employees.size;
          
          break; // Only count in top-level OU
        }
      }
    });

    const ous = Object.values(ouMap).map(ou => ({
      ou_name: ou.ou_name,
      ou_dn: ou.ou_dn,
      employee_count: ou.employee_count
    }));

    ous.sort((a, b) => b.employee_count - a.employee_count);

    return res.json({
      status: true,
      message: `Fetched ${ous.length} top-level OU(s)`,
      summary: {
        total_ous: ous.length,
        total_users: users.length,
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
