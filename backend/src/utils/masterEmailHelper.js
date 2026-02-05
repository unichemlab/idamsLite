const nodemailer = require("nodemailer");

// Configure email transporter
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
 * Send approval request email
 * @param {Object} params - Email parameters
 * @param {number} params.approvalId - ID of the approval request
 * @param {string} params.module - Module name
 * @param {string} params.action - Action type (create/update/delete)
 * @param {string} params.requestedBy - Username who requested
 * @param {string} params.comments - Description of change
 * @param {Array<string>} params.recipientEmails - List of email addresses
 * @param {Object} params.recordData - Data being changed
 */
async function sendApprovalEmail({
  approvalId,
  module,
  action,
  requestedBy,
  comments,
  recipientEmails,
  recordData,
}) {
  try {
    if (!recipientEmails || recipientEmails.length === 0) {
      console.warn("No recipient emails configured for approval notifications");
      return;
    }

    const actionText = {
      create: "Creation",
      update: "Update",
      delete: "Deletion",
    }[action] || action;

    const appUrl = process.env.REACT_APP_API_URL || "http://localhost:3000";
    const approvalUrl = `${appUrl}/admin-approval/${approvalId}`;

    // Format record data for email
    const recordSummary = recordData
      ? Object.entries(recordData)
          .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
          .join("")
      : "";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0b63ce; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .button { 
      display: inline-block; 
      background-color: #0b63ce; 
      color: white; 
      padding: 12px 30px; 
      text-decoration: none; 
      border-radius: 5px; 
      margin: 20px 0;
    }
    .details { background-color: white; padding: 15px; border-left: 4px solid #0b63ce; margin: 15px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔔 Approval Request - ${module.toUpperCase()} Master</h2>
    </div>
    <div class="content">
      <p>Dear Approver,</p>
      
      <p>A new approval request has been submitted for the <strong>${module.toUpperCase()} Master</strong>.</p>
      
      <div class="details">
        <h3>Request Details:</h3>
        <ul>
          <li><strong>Action:</strong> ${actionText}</li>
          <li><strong>Requested By:</strong> ${requestedBy}</li>
          <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
          <li><strong>Comments:</strong> ${comments || "No comments provided"}</li>
        </ul>
        
        ${recordSummary ? `<h3>Record Data:</h3><ul>${recordSummary}</ul>` : ""}
      </div>
      
      <p>Please review and approve/reject this request:</p>
      
      <center>
        <a href="${approvalUrl}" class="button">Review Approval Request</a>
      </center>
      
      <p style="color: #666; font-size: 14px;">
        <em>Note: This change will not be applied to the master data until approved.</em>
      </p>
    </div>
    <div class="footer">
      <p>Unichem Laboratories - Master Data Management System</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"Unichem Approval System" <${process.env.SMTP_USER}>`,
      to: recipientEmails.join(", "),
      subject: `Approval Required: ${actionText} in ${module.toUpperCase()} Master`,
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Approval email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("Error sending approval email:", err);
    throw err;
  }
}

/**
 * Send approval decision notification to requester
 * @param {Object} params - Email parameters
 */
async function sendApprovalDecisionEmail({
  requesterEmail,
  requesterName,
  module,
  action,
  decision, // 'APPROVED' or 'REJECTED'
  approverName,
  comments,
  recordData,
}) {
  try {
    if (!requesterEmail) {
      console.warn("No requester email available");
      return;
    }

    const isApproved = decision === "APPROVED";
    const statusColor = isApproved ? "#28a745" : "#dc3545";
    const statusText = isApproved ? "✅ Approved" : "❌ Rejected";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${statusColor}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .details { background-color: white; padding: 15px; border-left: 4px solid ${statusColor}; margin: 15px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${statusText}</h2>
    </div>
    <div class="content">
      <p>Dear ${requesterName},</p>
      
      <p>Your request for <strong>${action}</strong> in <strong>${module.toUpperCase()} Master</strong> has been <strong>${decision.toLowerCase()}</strong>.</p>
      
      <div class="details">
        <h3>Details:</h3>
        <ul>
          <li><strong>Decision By:</strong> ${approverName}</li>
          <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
          ${comments ? `<li><strong>Comments:</strong> ${comments}</li>` : ""}
        </ul>
      </div>
      
      ${
        isApproved
          ? "<p>The changes have been successfully applied to the master data.</p>"
          : "<p>The request was not approved. Please review the comments and resubmit if necessary.</p>"
      }
    </div>
    <div class="footer">
      <p>Unichem Laboratories - Master Data Management System</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"Unichem Approval System" <${process.env.SMTP_USER}>`,
      to: requesterEmail,
      subject: `${statusText}: ${action} in ${module.toUpperCase()} Master`,
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Decision email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("Error sending decision email:", err);
    throw err;
  }
}

module.exports = {
  sendApprovalEmail,
  sendApprovalDecisionEmail,
};