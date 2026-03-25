const cron = require("node-cron");
const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { logActivity } = require("../utils/activityLogger");

// cron.schedule("*/10 * * * * *", async () => {
//     console.log("🔄 Enterprise Access Monitor Cron Running...");
//     await monitorAccess();
// });

exports.runAccessMonitor = async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

      //  await handleInactiveUsers(client);
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

       // await handleInactiveUsers(client);
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
);
  `);
// return users.row;
    for (const user of users.rows) {
        console.log("INActive User",user);

      // --------------------------------------------------
  // 2️⃣ Reject Open Requests (Pending / In Progress)
  // --------------------------------------------------
//   const openRequests = await client.query(`
//     SELECT id
//     FROM user_requests
//     WHERE employee_code = $1
//     AND status IN ('Pending', 'In Progress') AND request_for_by IN ('Self','Others')
//   `, [user.employee_code]);
// console.log("openRequest",openRequests);
//   for (const req of openRequests.rows) {

//     await client.query(`
//       UPDATE user_requests
//       SET status = 'Rejected',
//           approver1_status = 
//             CASE WHEN approver1_status = 'Pending' THEN 'Rejected' ELSE approver1_status END,
//           approver2_status = 
//             CASE WHEN approver2_status = 'Pending' THEN 'Rejected' ELSE approver2_status END,
//           updated_on = NOW()
//       WHERE id = $1
//     `, [req.id]);

//     await client.query(`
//       UPDATE task_requests
//       SET task_status = 'Rejected',
//           approver1_action = 
//             CASE WHEN approver1_action IS NULL THEN 'Rejected' ELSE approver1_action END,
//           approver2_action = 
//             CASE WHEN approver2_action IS NULL THEN 'Rejected' ELSE approver2_action END,
//           updated_on = NOW()
//       WHERE user_request_id = $1
//     `, [req.id]);

//     console.log(`❌ Open request rejected for ${user.employee_code}`);
//   }




    //     const transactionId = `RITM${Date.now()}`;

    //     const newReq = await client.query(
    //         `INSERT INTO user_request
    //   (transaction_id, request_for_by, name, employee_code,
    //    employee_location, access_request_type, status,
    //    created_on, updated_on)
    //   VALUES ($1,'System',$2,$3,$4,'Auto Deactivation','Pending',NOW(),NOW())
    //   RETURNING id`,
    //         [transactionId, user.name, user.employee_id, user.location]
    //     );

    //     const userRequestId = newReq.rows[0].id;

    //     // Insert Task
    //     await client.query(
    //         `INSERT INTO task_requests
    //   (transaction_id, user_request_id, task_status, created_on, updated_on)
    //   VALUES ($1,$2,'Pending',NOW(),NOW())`,
    //         [`TASK${Date.now()}`, userRequestId]
    //     );

    //     // Insert Access Log
    //     await client.query(
    //         `INSERT INTO access_log
    //   (user_request_id, name, employee_code,
    //    access_request_type, user_request_status,
    //    task_status, created_on)
    //   VALUES ($1,$2,$3,'Auto Deactivation','Pending','Pending',NOW())`,
    //         [userRequestId, user.name, user.employee_id]
    //     );

    //     // ✅ Audit Log
    //     await logActivity({
    //         userId: null,
    //         module: "ACCESS_AUTO",
    //         tableName: "user_request",
    //         recordId: userRequestId,
    //         action: "AUTO_DEACTIVATION",
    //         actionType: "system",
    //         comments: "Auto raised due to inactive user"
    //     });

        // ✅ Email Approver
        // await sendApprovalEmail({
        //     employeeName: user.name,
        //     employeeCode: user.employee_id,
        //     type: "Auto Deactivation"
        // });
    }
}




async function handleExpiredTemporaryAccess(client) {
    const expired = await client.query(`
      SELECT * FROM user_requests
      WHERE user_request_type = 'Temporary'
      AND to_date < CURRENT_DATE
      AND status = 'Completed'
  `);
    console.log("expired log",expired.rows);
    // for (const req of expired.rows) {
    //     const transactionId = `RITM${Date.now()}`;

    //     const newReq = await client.query(
    //         `INSERT INTO user_request
    //   (transaction_id, request_for_by, name, employee_code,
    //    employee_location, access_request_type, status,
    //    created_on, updated_on)
    //   VALUES ($1,'System',$2,$3,$4,'Auto Revoke','Pending',NOW(),NOW())
    //   RETURNING id`,
    //         [transactionId, req.name, req.employee_code, req.employee_location]
    //     );

    //     const userRequestId = newReq.rows[0].id;

    //     await client.query(
    //         `INSERT INTO task_requests
    //   (transaction_id, user_request_id, task_status,
    //    created_on, updated_on)
    //   VALUES ($1,$2,'Pending',NOW(),NOW())`,
    //         [`TASK${Date.now()}`, userRequestId]
    //     );

    //     await client.query(
    //         `INSERT INTO access_log
    //   (user_request_id, name, employee_code,
    //    access_request_type, user_request_status,
    //    task_status, created_on)
    //   VALUES ($1,$2,$3,'Auto Revoke','Pending','Pending',NOW())`,
    //         [userRequestId, req.name, req.employee_code]
    //     );

    //     await logActivity({
    //         userId: null,
    //         module: "ACCESS_AUTO",
    //         tableName: "user_request",
    //         recordId: userRequestId,
    //         action: "AUTO_REVOKE",
    //         actionType: "system",
    //         comments: "Temporary access expired"
    //     });

    //     await sendApprovalEmail({
    //         employeeName: req.name,
    //         employeeCode: req.employee_code,
    //         type: "Auto Revoke"
    //     });
    // }
}