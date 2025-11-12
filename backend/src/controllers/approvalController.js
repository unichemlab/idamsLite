// controllers/approvalController.js

const pool = require("../config/db");
const { sendEmail } = require("../utils/email");
const { getApprovalEmail } = require("../utils/emailTemplate");
const path = require("path");

// --------------------- TOKEN HELPERS ---------------------
const generateToken = (requestId, approverEmail) => {
  return Buffer.from(`${requestId}|${approverEmail}`).toString("base64");
};

const verifyToken = (token, approverEmail) => {
  try {
    const decoded = Buffer.from(token, "base64").toString("ascii");
    const [requestId, email] = decoded.split("|");
    return email === approverEmail ? requestId : null;
  } catch (err) {
    return null;
  }
};

// --------------------- FETCH REQUEST + TASK DATA ---------------------
const getUserRequestWithTasks = async (id) => {
  const { rows: userRows } = await pool.query(
    `SELECT * FROM user_requests WHERE id=$1`,
    [id]
  );
  if (!userRows[0]) return null;
  const request = userRows[0];

  const { rows: taskRows } = await pool.query(
    `SELECT 
      tr.transaction_id AS task_id,
      tr.application_equip_id,
      app.display_name AS application_name,
      tr.department,
      d.department_name,
      tr.role,
      r.role_name AS role_name,
      tr.location,
      p.plant_name AS location_name,
      tr.reports_to,
      tr.task_status,
      approv.approver_2_id,
      string_agg(DISTINCT u2.employee_name, ', ') AS approver_2_names,
      string_agg(DISTINCT u2.email, ', ') AS approver_2_emails
   FROM task_requests tr
   LEFT JOIN department_master d ON tr.department = d.id
   LEFT JOIN role_master r ON tr.role = r.id
   LEFT JOIN plant_master p ON tr.location = p.id
   LEFT JOIN application_master app ON tr.application_equip_id = app.id
   LEFT JOIN approval_workflow_master approv ON tr.location = approv.plant_id
   LEFT JOIN user_master u1 
        ON u1.id::text = ANY(string_to_array(approv.approver_1_id, ','))
   LEFT JOIN user_master u2 
        ON u2.id::text = ANY(string_to_array(approv.approver_2_id, ','))
   WHERE tr.user_request_id = $1
   GROUP BY 
        tr.transaction_id, tr.application_equip_id, app.display_name,
        tr.department, d.department_name, tr.role, r.role_name,
        tr.location, p.plant_name, tr.reports_to, tr.task_status,
        approv.approver_1_id, approv.approver_2_id,tr.id
   ORDER BY tr.id`,
    [id]
  );

  const tasks = taskRows.map((t) => ({
    task_id: t.task_id,
    application_equip_id: t.application_equip_id,
    application_name: t.application_name,
    department_id: t.department,
    department_name: t.department_name,
    role_id: t.role,
    role_name: t.role_name,
    location: t.location_name,
    reports_to: t.reports_to,
    task_status: t.task_status,
    approver2_emails: t.approver_2_emails,
  }));

  return { request, tasks };
};

// --------------------- HANDLE APPROVAL ---------------------
exports.handleApproval = async (req, res) => {
  const { id } = req.params;
  const { action, token, approverEmail } = req.query;

  try {
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).send("Invalid action type");
    }

    // Fetch the full request + task data
    const data = await getUserRequestWithTasks(id);
    if (!data) return res.status(404).send("Request not found");

    const { request, tasks } = data;
    request.approver2_emails = tasks[0]?.approver2_emails;
    console.log("request", request);
    console.log("tasks", tasks[0]?.approver2_emails);

    // ---------------- VALIDATE TOKEN ----------------
    let validRequestId = verifyToken(token, approverEmail);
    let approverType = "approver1";

    // Check if token exists in DB
    const { rows: tokenRows } = await pool.query(
      `SELECT * FROM approver2_tokens 
       WHERE token=$1 
         AND approver_email=$2 
         AND is_valid=TRUE`,
      [token, approverEmail]
    );

    if (tokenRows.length) {
      approverType = tokenRows[0].approver_type || "approver2";
    }

    // Approver 2 must have a valid DB token
    if (!tokenRows.length && approverEmail !== request.approver1_email) {
      return res
        .status(400)
        .send("This approval link has expired or already been used.");
    }

    // Verify token matches request and email
    if (!validRequestId || parseInt(validRequestId) !== parseInt(id)) {
      return res.status(400).send("Invalid token or approver.");
    }

    // ---------------- APPROVER 1 LOGIC ----------------
    if (
      approverEmail === request.approver1_email &&
      request.approver1_status === "Pending"
    ) {
      if (action === "approve") {
        // Get approver1 name from user_master
        const approver1Result = await pool.query(
          `SELECT employee_name FROM user_master WHERE email = $1`,
          [approverEmail]
        );
        const approver1Name =
          approver1Result.rows[0]?.employee_name || approverEmail;

        await pool.query(
          `UPDATE user_requests 
           SET approver1_status='Approved', updated_on=NOW() 
           WHERE id=$1`,
          [id]
        );

        // Update task_requests with approver1 action details
        await pool.query(
          `UPDATE task_requests 
           SET approver1_action='Approved', approver1_action_timestamp=NOW(),
               approver1_comments=$1
           WHERE user_request_id=$2`,
          [null, id]
        );

        // Create and send tokens for all Approver 2 users
        if (request.approver2_emails) {
          const approver2Emails = request.approver2_emails
            .split(",")
            .map((e) => e.trim());
          console.log("approver2Emails", approver2Emails);
          for (const email of approver2Emails) {
            const approver2Token = generateToken(id, email);

            // Get approver2 name
            const approver2Result = await pool.query(
              `SELECT employee_name FROM user_master WHERE email = $1`,
              [email]
            );
            const approver2Name =
              approver2Result.rows[0]?.employee_name || email;

            await pool.query(
              `INSERT INTO approver_tokens (request_id, approver_email, token, approver_type) 
               VALUES ($1, $2, $3, 'approver2')
               ON CONFLICT DO NOTHING`,
              [id, email, approver2Token]
            );

            // Update task_requests with approver2 info
            await pool.query(
              `UPDATE task_requests 
               SET approver2_name=$1, approver2_email=$2
               WHERE user_request_id=$3`,
              [approver2Name, email, id]
            );

            const approveLink = `${process.env.FRONTEND_URL}/approve-request/${id}?token=${approver2Token}&action=approve&approverEmail=${email}`;
            const rejectLink = `${process.env.FRONTEND_URL}/approve-request/${id}?token=${approver2Token}&action=reject&approverEmail=${email}`;

            await sendEmail({
              to: email,
              subject: `User Request Approval Needed - Approver 2 (from ${approver1Name})`,
              html: getApprovalEmail({
                userRequest: request,
                tasks,
                approveLink,
                rejectLink,
                approverName: approver2Name,
              }),
              attachments: request.training_attachment
                ? [
                    {
                      filename: request.training_attachment_name,
                      path: path.join(
                        __dirname,
                        "../uploads",
                        request.training_attachment
                      ),
                    },
                  ]
                : [],
            });
          }
        }

        return res.send(
          "✅ You approved. Request has been forwarded to Approver 2."
        );
      } else if (action === "reject") {
        const approver1Result = await pool.query(
          `SELECT employee_name FROM user_master WHERE email = $1`,
          [approverEmail]
        );
        const approver1Name =
          approver1Result.rows[0]?.employee_name || approverEmail;

        await pool.query(
          "UPDATE user_requests SET status='Rejected', approver1_status='Rejected', updated_on=NOW() WHERE id=$1",
          [id]
        );

        // Update task_requests with approver1 rejection
        await pool.query(
          `UPDATE task_requests 
           SET approver1_action='Rejected', approver1_action_timestamp=NOW()
           WHERE user_request_id=$1`,
          [id]
        );

        return res.send("❌ You rejected the request.");
      }
    }

    // ---------------- APPROVER 2 LOGIC ----------------
    if (
      request.approver2_emails?.includes(approverEmail) &&
      request.approver2_status === "Pending"
    ) {
      if (action === "approve") {
        const approver2Result = await pool.query(
          `SELECT employee_name FROM user_master WHERE email = $1`,
          [approverEmail]
        );
        const approver2Name =
          approver2Result.rows[0]?.employee_name || approverEmail;

        await pool.query(
          "UPDATE user_requests SET approver2_status='Approved', status='Completed', completed_at=NOW() WHERE id=$1",
          [id]
        );

        // Update task_requests with approver2 action details
        await pool.query(
          `UPDATE task_requests 
           SET approver2_action='Approved', approver2_action_timestamp=NOW(),
               approver2_name=$1, approver2_email=$2
           WHERE user_request_id=$3`,
          [approver2Name, approverEmail, id]
        );

        // Invalidate all approver2 tokens
        await pool.query(
          `UPDATE approver_tokens 
           SET is_valid=FALSE, acted_at=NOW(), action=$2 
           WHERE request_id=$1 AND approver_type='approver2'`,
          [id, action]
        );

        // INSERT ACCESS LOG FOR EACH TASK
        for (const task of tasks) {
          await insertAccessLog(
            request,
            task,
            action,
            approverEmail,
            approver2Name
          );
        }

        return res.send("✅ Request approved and completed.");
      } else if (action === "reject") {
        const approver2Result = await pool.query(
          `SELECT employee_name FROM user_master WHERE email = $1`,
          [approverEmail]
        );
        const approver2Name =
          approver2Result.rows[0]?.employee_name || approverEmail;

        await pool.query(
          "UPDATE user_requests SET status='Rejected', approver2_status='Rejected', updated_on=NOW() WHERE id=$1",
          [id]
        );

        // Update task_requests with approver2 rejection
        await pool.query(
          `UPDATE task_requests 
           SET approver2_action='Rejected', approver2_action_timestamp=NOW(),
               approver2_name=$1, approver2_email=$2
           WHERE user_request_id=$3`,
          [approver2Name, approverEmail, id]
        );

        await pool.query(
          `UPDATE approver_tokens 
           SET is_valid=FALSE, acted_at=NOW(), action=$2 
           WHERE request_id=$1 AND approver_type='approver2'`,
          [id, action]
        );
        // INSERT ACCESS LOG FOR EACH TASK
        for (const task of tasks) {
          await insertAccessLog(
            request,
            task,
            action,
            approverEmail,
            approver2Name
          );
        }
        return res.send("❌ Request rejected by Approver 2.");
      }
    }

    // ---------------- DEFAULT ----------------
    return res.send(
      "⚠️ This link has expired or the request is already processed."
    );
  } catch (err) {
    console.error("Approval error:", err);
    res.status(500).send("Server error");
  }
};

// --------------------- HANDLE APPROVAL ---------------------
async function insertAccessLog(
  request,
  task,
  action,
  approverEmail,
  approverName
) {
  // Determine if this is approver1 or approver2 based on email
  const isApprover2 = request.approver2_emails?.includes(approverEmail);

  await pool.query(
    `INSERT INTO access_log(
      user_request_id,
      task_id,
      ritm_transaction_id,
      task_transaction_id,
      request_for_by, name, employee_code, employee_location,
      access_request_type, training_status,
      vendor_firm, vendor_code, vendor_name, vendor_allocated_id,
      user_request_status, task_status,
      application_equip_id, department, role, location, reports_to,
      approver1_status, approver2_status, approver1_email, approver2_email,
      approver1_name, approver2_name,
      approver1_action, approver2_action,
      approver1_timestamp, approver2_timestamp,
      created_on, updated_on, completed_at, remarks
    ) VALUES(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,
      $17,$18,$19,$20,$21,
      $22,$23,$24,$25,
      $26,$27,$28,$29,
      $30,$31,
      $32,$33,$34,$35
    )`,
    [
      request.id,
      task.id,
      request.transaction_id,
      task.transaction_id,
      request.request_for_by,
      request.name,
      request.employee_code,
      request.employee_location,
      request.access_request_type,
      request.training_status,
      request.vendor_firm,
      request.vendor_code,
      request.vendor_name,
      request.vendor_allocated_id,
      request.status,
      task.task_status,
      task.application_equip_id,
      task.department,
      task.role,
      task.location,
      task.reports_to,
      request.approver1_status,
      request.approver2_status,
      request.approver1_email,
      request.approver2_emails,
      request.approver1_name || null,
      isApprover2 ? approverName : null,
      isApprover2 ? null : action,
      isApprover2 ? action : null,
      request.approver1_timestamp || null,
      isApprover2 ? new Date() : null,
      request.created_on,
      request.updated_on,
      request.completed_at,
      task.remarks,
    ]
  );
}

// --------------------- APPROVE/REJECT API (ALTERNATIVE ENDPOINT) ---------------------
exports.approveRejectRequest = async (req, res) => {
  const { id } = req.params;
  const { action, approverEmail } = req.query;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  try {
    const data = await getUserRequestWithTasks(id);
    if (!data) return res.status(404).json({ error: "Request not found" });

    const { request, tasks } = data;
    let nextStep = null;

    if (approverEmail === request.approver1_email) {
      await pool.query(
        "UPDATE user_requests SET approver1_status=$1 WHERE id=$2",
        [action === "approve" ? "Approved" : "Rejected", id]
      );
      if (action === "approve" && request.approver2_email)
        nextStep = request.approver2_email;
    } else if (request.approver2_email?.includes(approverEmail)) {
      await pool.query(
        "UPDATE user_requests SET approver2_status=$1 WHERE id=$2",
        [action === "approve" ? "Approved" : "Rejected", id]
      );

      // Invalidate all approver 2 tokens
      await pool.query(
        `UPDATE approver_tokens SET is_valid=FALSE WHERE request_id=$1`,
        [id]
      );

      if (action === "approve") nextStep = process.env.IT_SUPPORT_EMAIL;
    } else if (approverEmail === process.env.IT_SUPPORT_EMAIL) {
      await pool.query("UPDATE user_requests SET status=$1 WHERE id=$2", [
        action === "approve" ? "Completed" : "Rejected",
        id,
      ]);
    }

    // Send email for next step
    if (nextStep && action === "approve") {
      const token = generateToken(id, nextStep);
      const approveLink = `${process.env.FRONTEND_URL}/approve-request/${id}?token=${token}&action=approve&approverEmail=${nextStep}`;
      const rejectLink = `${process.env.FRONTEND_URL}/approve-request/${id}?token=${token}&action=reject&approverEmail=${nextStep}`;

      await sendEmail({
        to: nextStep,
        subject: "User Request Approval Required",
        html: getApprovalEmail({
          userRequest: request,
          tasks,
          approveLink,
          rejectLink,
          approverName: nextStep,
        }),
      });
    }

    res.send(
      `<h3>User request ${
        action === "approve" ? "approved" : "rejected"
      } successfully!</h3>`
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
