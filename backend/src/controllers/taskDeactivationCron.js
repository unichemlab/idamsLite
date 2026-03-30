const cron = require("node-cron");
const nodemailer = require("nodemailer");
const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { logActivity } = require("../utils/activityLogger");

// =============================================================================
// NODEMAILER TRANSPORTER
// Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in your .env file
// =============================================================================
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

const NOTIFY_EMAIL =  ["nishant1.singh@unichemlabs.com",
        "ashish.sachania@unichemlabs.com"];

// =============================================================================
// EMAIL HELPER — shared by both handlers
//
// @param {string} type       "Inactive User Deactivation" | "Temporary Access Revoke"
// @param {object} employee   { name, employee_code }
// @param {Array}  tasks      [{ application, transaction_id, access_log_id }]
// @param {string} date       formatted IST date-time string
// @param {string} [expiry]   original to_date (only for Temporary Access Revoke)
// =============================================================================
async function sendDeactivationEmail({ type, employee, tasks, date, expiry }) {
    const isRevoke = type === "Temporary Access Revoke";

    const subject = isRevoke
        ? `[Auto-Revoke] Temporary Access Expired — ${employee.name} (${employee.employee_code})`
        : `[Auto-Deactivation] Inactive User Access To Be Removed — ${employee.name} (${employee.employee_code})`;

    const appRows = tasks
        .map(
            (t) => `
            <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${t.transaction_id || "—"}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${t.application || "—"}</td>
                
            </tr>`
        )
        .join("");

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#111827;">

        <!-- Header -->
        <div style="background:#1e3a5f;padding:24px 32px;border-radius:8px 8px 0 0;">
            <h2 style="margin:0;color:#ffffff;font-size:18px;">
                ${isRevoke ? "🔁 Temporary Access Revoked" : "🔒 User Access Deactivated"}
            </h2>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">
                Enterprise Access Management — Automated Notification
            </p>
        </div>

        <!-- Body -->
        <div style="background:#f9fafb;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;">

            <p style="margin:0 0 16px;">
                The following access has been automatically
                <b>${isRevoke ? "revoked" : "deactivated"}</b> by the system.
            </p>

            <!-- Employee Info -->
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;">
                <tr>
                    <td style="padding:10px 16px;width:40%;background:#f3f4f6;font-weight:600;border-bottom:1px solid #e5e7eb;">Employee Name</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">${employee.name}</td>
                </tr>
                <tr>
                    <td style="padding:10px 16px;background:#f3f4f6;font-weight:600;border-bottom:1px solid #e5e7eb;">Employee Code</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">${employee.employee_code}</td>
                </tr>
                <tr>
                    <td style="padding:10px 16px;background:#f3f4f6;font-weight:600;border-bottom:1px solid #e5e7eb;">Action Type</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">${type}</td>
                </tr>
                <tr>
                    <td style="padding:10px 16px;background:#f3f4f6;font-weight:600;border-bottom:1px solid #e5e7eb;">Reason</td>
                    <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                        ${isRevoke
                            ? `Temporary access period ended on <b>${expiry}</b>`
                            : "Employee marked <b>Inactive</b> in the system"}
                    </td>
                </tr>
                <tr>
                    <td style="padding:10px 16px;background:#f3f4f6;font-weight:600;">Date of Action</td>
                    <td style="padding:10px 16px;">${date}</td>
                </tr>
            </table>

            <!-- Applications Table -->
            <p style="margin:0 0 8px;font-weight:600;">
                Applications ${isRevoke ? "Revoked" : "Deactivated"} (${tasks.length})
            </p>
            <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;">
                <thead>
                    <tr style="background:#1e3a5f;color:#ffffff;">
                    <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;">Transaction ID</th>
                    <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;">Application</th>   
                    </tr>
                </thead>
                <tbody>
                    ${appRows}
                </tbody>
            </table>

            <p style="margin:24px 0 0;font-size:12px;color:#6b7280;">
                This is an automated message from the Enterprise Access Management system.
                Please do not reply to this email.
            </p>
        </div>

        <!-- Footer -->
        <div style="background:#e5e7eb;padding:12px 32px;border-radius:0 0 8px 8px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#6b7280;">
                © ${new Date().getFullYear()} Unichemi Labs — Enterprise Access Management
            </p>
        </div>

    </div>`;

    try {
        await transporter.sendMail({
            from: `"Access Management System" <${process.env.SMTP_USER}>`,
            to: NOTIFY_EMAIL,
            subject,
            html,
        });
        console.log(`📧 Email sent → ${NOTIFY_EMAIL} | User: ${employee.employee_code} | Type: ${type}`);
    } catch (err) {
        // Email failure must NOT roll back the DB transaction — log and continue
        console.error(`📧 ❌ Email failed for ${employee.employee_code}:`, err.message);
    }
}


// =============================================================================
// CRON ENTRY POINTS
// =============================================================================

// cron.schedule("*/10 * * * * *", async () => {
//     console.log("🔄 Enterprise Access Monitor Cron Running...");
//     await monitorAccess();
// });

exports.runAccessMonitor = async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await handleInactiveUsers(client);
        await handleExpiredTemporaryAccess(client);

        await client.query("COMMIT");
        console.log("✅ Cron completed successfully");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("❌ Cron rolled back:", error);
    } finally {
        client.release();
    }
};

async function monitorAccess() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await handleInactiveUsers(client);
        await handleExpiredTemporaryAccess(client);

        await client.query("COMMIT");
        console.log("✅ Cron completed successfully");

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("❌ Cron rolled back:", error);

    } finally {
        client.release();
    }
}


// =============================================================================
// HANDLER 1: Inactive Users — deactivate all their active (Closed) access logs
// =============================================================================
async function handleInactiveUsers(client) {
    const users = await client.query(`
        SELECT um.employee_code, um.employee_name, um.location
        FROM user_master um
        WHERE um.status = 'Inactive'
        AND EXISTS (
            SELECT 1
            FROM access_log al
            WHERE al.employee_code = um.employee_code
            AND al.task_status = 'Closed'
            AND al.user_request_status = 'Completed'
        )
        AND NOT EXISTS (
            SELECT 1
            FROM user_requests ur
            WHERE ur.employee_code = um.employee_code
            AND ur.access_request_type = 'Bulk-Deactivation'
            AND ur.status = 'Pending'
        )
    `);

    console.log(`[INACTIVE USERS] Found ${users.rows.length} inactive user(s) to deactivate`);

    for (const user of users.rows) {
        console.log("[INACTIVE USERS] Processing user:", user.employee_code, user.employee_name);

        // ------------------------------------------------------------------
        // STEP 1: Reject any open Pending / In Progress requests for this user
        // ------------------------------------------------------------------
        const openRequests = await client.query(`
            SELECT id
            FROM user_requests
            WHERE employee_code = $1
            AND status IN ('Pending', 'In Progress')
            AND request_for_by IN ('Self', 'Others')
        `, [user.employee_code]);

        console.log(`[INACTIVE USERS] Found ${openRequests.rows.length} open request(s) to reject for ${user.employee_code}`);

        for (const openReq of openRequests.rows) {
            await client.query(`
                UPDATE user_requests
                SET status = 'Rejected',
                    approver1_status = CASE WHEN approver1_status = 'Pending' THEN 'Rejected' ELSE approver1_status END,
                    approver2_status = CASE WHEN approver2_status = 'Pending' THEN 'Rejected' ELSE approver2_status END,
                    updated_on = NOW()
                WHERE id = $1
            `, [openReq.id]);

            await client.query(`
                UPDATE task_requests
                SET task_status = 'Rejected',
                    approver1_action = CASE WHEN approver1_action IS NULL THEN 'Rejected' ELSE approver1_action END,
                    approver2_action = CASE WHEN approver2_action IS NULL THEN 'Rejected' ELSE approver2_action END,
                    updated_on = NOW()
                WHERE user_request_id = $1
            `, [openReq.id]);

            console.log(`❌ [INACTIVE USERS] Open request ${openReq.id} rejected for ${user.employee_code}`);
        }

        // ------------------------------------------------------------------
        // STEP 2: Fetch all active access logs for this user
        // ------------------------------------------------------------------
        const { rows: accessLogs } = await client.query(`
            SELECT
                al.id AS access_log_id,
                al.vendor_name,
                al.vendor_allocated_id,
                al.application_equip_id,
                al.department,
                al.location,
                al.role,
                al.task_status,
                app.display_name AS application_name,
                d.department_name,
                p.plant_name,
                r.role_name
            FROM access_log al
            LEFT JOIN application_master app ON al.application_equip_id::text = app.id::text
            LEFT JOIN department_master d ON al.department::text = d.id::text
            LEFT JOIN plant_master p ON al.location::text = p.id::text
            LEFT JOIN role_master r ON al.role::text = r.id::text
            WHERE al.employee_code = $1
            AND al.task_status = 'Closed'
            AND al.user_request_status = 'Completed'
            AND al.request_for_by IN ('Self','Others')
            ORDER BY al.id
        `, [user.employee_code]);

        if (accessLogs.length === 0) {
            console.log(`[INACTIVE USERS] No active access logs found for ${user.employee_code}, skipping`);
            continue;
        }

        console.log(`[INACTIVE USERS] Found ${accessLogs.length} access log(s) to deactivate for ${user.employee_code}`);

        // ------------------------------------------------------------------
        // STEP 3: Create a User Request (Auto-Approved, Bulk-Deactivation)
        // ------------------------------------------------------------------
        const { rows: userRequestRows } = await client.query(`
            INSERT INTO user_requests (
                request_for_by,
                name,
                employee_code,
                employee_location,
                access_request_type,
                training_status,
                status,
                approver1_email,
                approver1_status,
                approver2_email,
                approver2_status,
                created_on
            ) VALUES (
                'System', $1, $2, $3,
                'Bulk-Deactivation', 'No', 'Approved',
                '', 'Approved', '', 'Approved',
                NOW()
            )
            RETURNING *
        `, [user.employee_name, user.employee_code, user.location]);

        const userRequest = userRequestRows[0];
        console.log(`[INACTIVE USERS] ✅ User Request Created:`, {
            id: userRequest.id,
            transaction_id: userRequest.transaction_id,
            status: userRequest.status
        });

        // ------------------------------------------------------------------
        // STEP 4: Create a Task Request per Access Log + Deactivate Access Log
        // ------------------------------------------------------------------
        const createdTasks = [];

        for (const log of accessLogs) {
            console.log(`[INACTIVE USERS] Creating task for access log ID: ${log.access_log_id}`);

            const { rows: taskRows } = await client.query(`
                INSERT INTO task_requests (
                    user_request_id,
                    application_equip_id,
                    department,
                    role,
                    location,
                    reports_to,
                    task_status,
                    remarks,
                    approver1_id,
                    approver2_id,
                    approver1_name,
                    approver2_name,
                    approver1_email,
                    approver2_email,
                    approver1_action,
                    approver2_action,
                    approver1_action_timestamp,
                    approver2_action_timestamp,
                    task_action,
                    created_on
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    'Approved', $7,
                    NULL, NULL,
                    'System', 'System',
                    NULL, NULL,
                    'Approved', 'Approved',
                    NOW(), NOW(), 'Revoke', NOW()
                )
                RETURNING *
            `, [
                userRequest.id,
                log.application_equip_id,
                log.department,
                log.role,
                log.location,
                user.employee_name,
                `Auto deactivation for inactive user ${user.employee_name} (${user.employee_code}) - ${log.application_name}`
            ]);

            const task = taskRows[0];
            createdTasks.push({
                task_id: task.id,
                transaction_id: task.transaction_id,
                application: log.application_name,
                access_log_id: log.access_log_id
            });

            console.log(`[INACTIVE USERS] ✅ Task Created:`, {
                task_id: task.id,
                transaction_id: task.transaction_id,
                status: task.task_status
            });

            // Update access log to Deactivated
            await client.query(`
                UPDATE access_log
                SET task_status = 'Deactivated',
                    updated_on = NOW()
                WHERE id = $1
            `, [log.access_log_id]);

            console.log(`[INACTIVE USERS] ✅ Access Log Deactivated: ${log.access_log_id}`);
        }

        console.log(`[INACTIVE USERS] 🎉 Deactivated ${createdTasks.length} access log(s) for ${user.employee_code}`);

        // ------------------------------------------------------------------
        // STEP 5: Send notification email
        // Called AFTER all DB work for this user — failure won't affect DB
        // ------------------------------------------------------------------
        await sendDeactivationEmail({
            type: "Inactive User Deactivation",
            employee: {
                name: user.employee_name,
                employee_code: user.employee_code,
            },
            tasks: createdTasks,
            date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        });
    }
}


// =============================================================================
// HANDLER 2: Expired Temporary Access — revoke access logs tied to expired requests
// =============================================================================
async function handleExpiredTemporaryAccess(client) {
    const { rows: expiredRequests } = await client.query(`
        SELECT *
        FROM user_requests
        WHERE user_request_type = 'Temporary'
        AND to_date < CURRENT_DATE
        AND status = 'Completed'
        AND NOT EXISTS (
            SELECT 1
            FROM user_requests ur2
            WHERE ur2.employee_code = user_requests.employee_code
            AND ur2.access_request_type = 'Auto-Revoke'
            AND ur2.status IN ('Pending', 'Approved')
            AND ur2.created_on > user_requests.to_date
        )
    `);

    console.log(`[TEMP ACCESS] Found ${expiredRequests.length} expired temporary request(s) to revoke`);

    for (const expiredReq of expiredRequests) {
        console.log(`[TEMP ACCESS] Processing expired request:`, {
            id: expiredReq.id,
            employee_code: expiredReq.employee_code,
            name: expiredReq.name,
            to_date: expiredReq.to_date
        });

        // ------------------------------------------------------------------
        // STEP 1: Reject any open Pending / In Progress requests for this user
        // ------------------------------------------------------------------
        const openRequests = await client.query(`
            SELECT id
            FROM user_requests
            WHERE employee_code = $1
            AND status IN ('Pending', 'In Progress')
            AND request_for_by IN ('Self', 'Others')
        `, [expiredReq.employee_code]);

        console.log(`[TEMP ACCESS] Found ${openRequests.rows.length} open request(s) to reject for ${expiredReq.employee_code}`);

        for (const openReq of openRequests.rows) {
            await client.query(`
                UPDATE user_requests
                SET status = 'Rejected',
                    approver1_status = CASE WHEN approver1_status = 'Pending' THEN 'Rejected' ELSE approver1_status END,
                    approver2_status = CASE WHEN approver2_status = 'Pending' THEN 'Rejected' ELSE approver2_status END,
                    updated_on = NOW()
                WHERE id = $1
            `, [openReq.id]);

            await client.query(`
                UPDATE task_requests
                SET task_status = 'Rejected',
                    approver1_action = CASE WHEN approver1_action IS NULL THEN 'Rejected' ELSE approver1_action END,
                    approver2_action = CASE WHEN approver2_action IS NULL THEN 'Rejected' ELSE approver2_action END,
                    updated_on = NOW()
                WHERE user_request_id = $1
            `, [openReq.id]);

            console.log(`❌ [TEMP ACCESS] Open request ${openReq.id} rejected for ${expiredReq.employee_code}`);
        }

        // ------------------------------------------------------------------
        // STEP 2: Fetch all active access logs tied to this expired request
        // ------------------------------------------------------------------
        const { rows: accessLogs } = await client.query(`
            SELECT
                al.id AS access_log_id,
                al.vendor_name,
                al.vendor_allocated_id,
                al.application_equip_id,
                al.department,
                al.location,
                al.role,
                al.task_status,
                app.display_name AS application_name,
                d.department_name,
                p.plant_name,
                r.role_name
            FROM access_log al
            LEFT JOIN application_master app ON al.application_equip_id::text = app.id::text
            LEFT JOIN department_master d ON al.department::text = d.id::text
            LEFT JOIN plant_master p ON al.location::text = p.id::text
            LEFT JOIN role_master r ON al.role::text = r.id::text
            WHERE al.employee_code = $1
            AND al.task_status = 'Closed'
            AND al.user_request_status = 'Completed'
            ORDER BY al.id
        `, [expiredReq.employee_code]);

        if (accessLogs.length === 0) {
            console.log(`[TEMP ACCESS] No active access logs found for ${expiredReq.employee_code}, skipping`);
            continue;
        }

        console.log(`[TEMP ACCESS] Found ${accessLogs.length} access log(s) to revoke for ${expiredReq.employee_code}`);

        // ------------------------------------------------------------------
        // STEP 3: Create a User Request (Auto-Approved, Auto-Revoke)
        // ------------------------------------------------------------------
        const { rows: userRequestRows } = await client.query(`
            INSERT INTO user_requests (
                request_for_by,
                name,
                employee_code,
                employee_location,
                access_request_type,
                training_status,
                status,
                approver1_email,
                approver1_status,
                approver2_email,
                approver2_status,
                created_on
            ) VALUES (
                'System', $1, $2, $3,
                'Auto-Revoke', 'No', 'Approved',
                '', 'Approved', '', 'Approved',
                NOW()
            )
            RETURNING *
        `, [expiredReq.name, expiredReq.employee_code, expiredReq.employee_location]);

        const userRequest = userRequestRows[0];
        console.log(`[TEMP ACCESS] ✅ User Request Created:`, {
            id: userRequest.id,
            transaction_id: userRequest.transaction_id,
            status: userRequest.status
        });

        // ------------------------------------------------------------------
        // STEP 4: Create a Task Request per Access Log + Deactivate Access Log
        // ------------------------------------------------------------------
        const createdTasks = [];

        for (const log of accessLogs) {
            console.log(`[TEMP ACCESS] Creating task for access log ID: ${log.access_log_id}`);

            const { rows: taskRows } = await client.query(`
                INSERT INTO task_requests (
                    user_request_id,
                    application_equip_id,
                    department,
                    role,
                    location,
                    reports_to,
                    task_status,
                    remarks,
                    approver1_id,
                    approver2_id,
                    approver1_name,
                    approver2_name,
                    approver1_email,
                    approver2_email,
                    approver1_action,
                    approver2_action,
                    approver1_action_timestamp,
                    approver2_action_timestamp,
                    task_action,
                    created_on
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    'Approved', $7,
                    NULL, NULL,
                    'System', 'System',
                    NULL, NULL,
                    'Approved', 'Approved',
                    NOW(), NOW(), 'Revoke', NOW()
                )
                RETURNING *
            `, [
                userRequest.id,
                log.application_equip_id,
                log.department,
                log.role,
                log.location,
                expiredReq.name,
                `Auto revoke for expired temporary access: ${expiredReq.name} (${expiredReq.employee_code}) - ${log.application_name} - expired on ${expiredReq.to_date}`
            ]);

            const task = taskRows[0];
            createdTasks.push({
                task_id: task.id,
                transaction_id: task.transaction_id,
                application: log.application_name,
                access_log_id: log.access_log_id
            });

            console.log(`[TEMP ACCESS] ✅ Task Created:`, {
                task_id: task.id,
                transaction_id: task.transaction_id,
                status: task.task_status
            });

            // Update access log to Deactivated
            await client.query(`
                UPDATE access_log
                SET task_status = 'Deactivated',
                    updated_on = NOW()
                WHERE id = $1
            `, [log.access_log_id]);

            console.log(`[TEMP ACCESS] ✅ Access Log Deactivated: ${log.access_log_id}`);
        }

        console.log(`[TEMP ACCESS] 🎉 Revoked ${createdTasks.length} access log(s) for ${expiredReq.employee_code}`);

        // ------------------------------------------------------------------
        // STEP 5: Send notification email
        // Called AFTER all DB work for this user — failure won't affect DB
        // ------------------------------------------------------------------
        await sendDeactivationEmail({
            type: "Temporary Access Revoke",
            employee: {
                name: expiredReq.name,
                employee_code: expiredReq.employee_code,
            },
            tasks: createdTasks,
            date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            expiry: new Date(expiredReq.to_date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }),
        });
    }
}