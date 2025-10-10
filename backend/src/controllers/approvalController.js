// controllers/approvalController.js
const pool = require("../config/db");
const { sendEmail } = require("../utils/email");
const { getApprovalEmail } = require("../utils/emailTemplate");
const path = require("path");

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

// Helper: fetch user request and tasks
const getUserRequestWithTasks = async (id) => {
  const { rows: userRows } = await pool.query( `SELECT * FROM user_requests WHERE id=$1`, [id]  );
  if (!userRows[0]) return null;
  const request = userRows[0];

  const { rows: taskRows } = await pool.query(
    `SELECT tr.transaction_id AS task_id,
            tr.application_equip_id,
            app.display_name AS application_name,
            tr.department,
            d.department_name,
            tr.role,
            r.role_name AS role_name,
            tr.location,
            p.plant_name AS location_name,
            tr.reports_to,
            tr.task_status
     FROM task_requests tr
     LEFT JOIN department_master d ON tr.department = d.id
     LEFT JOIN role_master r ON tr.role = r.id
     LEFT JOIN plant_master p ON tr.location = p.id
     LEFT JOIN application_master app ON tr.application_equip_id = app.id
     WHERE tr.user_request_id=$1
     ORDER BY tr.id`,
    [id]
  );

  const tasks = taskRows.map(t => ({
    task_id: t.task_id,
    application_equip_id: t.application_equip_id,
    application_name: t.application_name,
    department_id: t.department,
    department_name: t.department_name,
    role_id: t.role,
    role_name: t.role_name,
    location: t.location_name,
    reports_to: t.reports_to,
    task_status: t.task_status
  }));

  return { request, tasks };
};

// ================== handleApproval ==================
exports.handleApproval = async (req, res) => {
  const { id } = req.params;
  const { action, token, approverEmail } = req.query;

  const validRequestId = verifyToken(token, approverEmail);
  if (!validRequestId || parseInt(validRequestId) !== parseInt(id)) {
    return res.status(400).send("Invalid token or approver.");
  }
  try {
    const data = await getUserRequestWithTasks(id);
    if (!data) return res.status(404).send("Request not found");

    const { request, tasks } = data;

    // Approver 1 workflow
    if (request.approver1_status === "Pending" && request.approver1_email === approverEmail) {
      if (action === "approve") {
        await pool.query(
          "UPDATE user_requests SET approver1_status='Approved' WHERE id=$1",
          [id]
        );

        // Email to Approver 2
        if (request.approver2_email) {
          const approveLink = `${process.env.FRONTEND_URL}/approve-request/${id}?token=${generateToken(id, request.approver2_email)}&action=approve&approverEmail=${request.approver2_email}`;
          const rejectLink = `${process.env.FRONTEND_URL}/approve-request/${id}?token=${generateToken(id, request.approver2_email)}&action=reject&approverEmail=${request.approver2_email}`;

          await sendEmail({
            to:`nishant1.singh@unichemlabs.com`,
           // to: request.approver2_email,
            subject: "User Request Approval Needed",
            html: getApprovalEmail({ userRequest: request, tasks, approveLink, rejectLink, approverName: "Approver 2" }),
            attachments: request.training_attachment ? [{
              filename: request.training_attachment_name,
              path: path.join(__dirname, "../uploads", request.training_attachment),
            }] : [],
          });
        }

        return res.send("You approved. Request forwarded to Approver 2.");
      } else if (action === "reject") {
        await pool.query("UPDATE user_requests SET status='Rejected' WHERE id=$1", [id]);
        return res.send("You rejected the request.");
      }
    }

    // Approver 2 workflow
    if (request.approver2_status === "Pending" && request.approver2_email === approverEmail) {
      if (action === "approve") {
        await pool.query(
          "UPDATE user_requests SET approver2_status='Approved', status='Completed', completed_at=NOW() WHERE id=$1",
          [id]
        );
        return res.send("Request approved and completed.");
      } else if (action === "reject") {
        await pool.query("UPDATE user_requests SET status='Rejected' WHERE id=$1", [id]);
        return res.send("Request rejected by Approver 2.");
      }
    }

    res.send("Action not allowed or already processed.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// ================== approveRejectRequest ==================
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
      await pool.query("UPDATE user_requests SET approver1_status=$1 WHERE id=$2", [
        action === "approve" ? "Approved" : "Rejected",
        id
      ]);
      if (action === "approve" && request.approver2_email) nextStep = request.approver2_email;

    } else if (approverEmail === request.approver2_email) {
      await pool.query("UPDATE user_requests SET approver2_status=$1 WHERE id=$2", [
        action === "approve" ? "Approved" : "Rejected",
        id
      ]);
      if (action === "approve") nextStep = process.env.IT_SUPPORT_EMAIL;

    } else if (approverEmail === process.env.IT_SUPPORT_EMAIL) {
      await pool.query("UPDATE user_requests SET status=$1 WHERE id=$2", [
        action === "approve" ? "Completed" : "Rejected",
        id
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
        html: getApprovalEmail({ userRequest: request, tasks, approveLink, rejectLink, approverName: nextStep }),
      });
    }

    res.send(`<h3>User request ${action === "approve" ? "approved" : "rejected"} successfully!</h3>`);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
