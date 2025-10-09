// controllers/approvalController.js
const pool = require("../config/db");
const { sendEmail } = require("../utils/email");
const { getApprovalEmail } = require("../utils/emailTemplate");
const path = require("path");

const generateToken = (requestId, approverEmail) => {
  // Simple token: encode requestId + approverEmail
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

exports.handleApproval = async (req, res) => {
  const { id } = req.params;
  const { action, token, approverEmail } = req.query;

  const validRequestId = verifyToken(token, approverEmail);
  if (!validRequestId || parseInt(validRequestId) !== parseInt(id)) {
    return res.status(400).send("Invalid token or approver.");
  }

  try {
    const { rows } = await pool.query("SELECT * FROM user_requests WHERE id=$1", [id]);
    if (!rows.length) return res.status(404).send("Request not found");

    const request = rows[0];

    // Approver 1 workflow
    if (request.approver1_status === "Pending" && request.approver1_email === approverEmail) {
      if (action === "approve") {
        await pool.query("UPDATE user_requests SET approver1_status='Approved' WHERE id=$1", [id]);

        // Send email to Approver 2
        const approveLink = `${process.env.FRONTEND_URL}/approve-request/${id}?token=${generateToken(id, request.approver2_email)}&action=approve&approverEmail=${request.approver2_email}`;
        const rejectLink = `${process.env.FRONTEND_URL}/approve-request/${id}?token=${generateToken(id, request.approver2_email)}&action=reject&approverEmail=${request.approver2_email}`;
         
        await sendEmail({
          to: request.approver2_email,
          subject: "User Request Approval Needed",
          html: getApprovalEmail({ userRequest: request, approveLink, rejectLink, approverName: "Approver 2" }),
          attachments: request.training_attachment ? [
            {
              filename: request.training_attachment_name,
              path: path.join(__dirname, "../uploads", request.training_attachment),
            },
          ] : [],
        });

        return res.send("You approved. Request forwarded to Approver 2.");
      } else if (action === "reject") {
        await pool.query("UPDATE user_requests SET status='Rejected' WHERE id=$1", [id]);
        return res.send("You rejected the request.");
      }
    }

    // Approver 2 workflow
    if (request.approver2_status === "Pending" && request.approver2_email === approverEmail) {
      if (action === "approve") {
        await pool.query("UPDATE user_requests SET approver2_status='Approved', status='Completed', completed_at=NOW() WHERE id=$1", [id]);
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


/**
 * Handle Approve/Reject action
 * query params: ?action=approve|reject&approverEmail=<email>
 */
exports.approveRejectRequest = async (req, res) => {
  const { id } = req.params;
  const { action, approverEmail } = req.query;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  try {
    // Get the request
    const { rows } = await pool.query(
      "SELECT * FROM user_requests WHERE id=$1",
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Request not found" });

    const request = rows[0];
    let nextStep = null;

    if (approverEmail === request.approver1_email) {
      // Update Approver 1 status
      await pool.query(
        "UPDATE user_requests SET approver1_status=$1 WHERE id=$2",
        [action === "approve" ? "Approved" : "Rejected", id]
      );

      if (action === "approve" && request.approver2_email) {
        nextStep = request.approver2_email; // Send to Approver 2
      }
    } else if (approverEmail === request.approver2_email) {
      // Update Approver 2 status
      await pool.query(
        "UPDATE user_requests SET approver2_status=$1 WHERE id=$2",
        [action === "approve" ? "Approved" : "Rejected", id]
      );

      if (action === "approve") {
        nextStep = process.env.IT_SUPPORT_EMAIL; // Send to IT Support
      }
    } else if (approverEmail === process.env.IT_SUPPORT_EMAIL) {
      // IT support finalizes task
      await pool.query(
        "UPDATE user_requests SET status=$1 WHERE id=$2",
        [action === "approve" ? "Completed" : "Rejected", id]
      );
    }

    // Send next step email if needed
    if (nextStep && action === "approve") {
      const token = Buffer.from(`${id}|${nextStep}`).toString("base64");
      const approveLink = `${process.env.FRONTEND_URL}/approve-request/${id}?token=${token}&action=approve&approverEmail=${nextStep}`;
      const rejectLink = `${process.env.FRONTEND_URL}/approve-request/${id}?token=${token}&action=reject&approverEmail=${nextStep}`;

      await sendEmail({
        to: nextStep,
        subject: `User Request Approval Required`,
        html: getApprovalEmail({ userRequest: request, approveLink, rejectLink, approverName: nextStep }),
      });
    }

    res.send(`<h3>User request ${action === "approve" ? "approved" : "rejected"} successfully!</h3>`);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

