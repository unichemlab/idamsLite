// utils/emailTemplate.js

const getApprovalEmail = ({ userRequest, tasks = [], approveLink, rejectLink, approverName }) => {
  const taskRows = tasks.length
    ? tasks.map((t) => `
        <tr>
          <td>${t.location || "-"}</td>
          <td>${t.department_name || "-"}</td>
          <td>${userRequest.access_request_type}</td>
          <td>${userRequest.request_for_by}</td>
          <td>${t.application_name || "-"}</td>
          <td>${t.role_name || "-"}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="6" style="text-align:center;">No tasks assigned</td></tr>`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Action Required: New User Request – ${userRequest.transaction_id}</title>
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; }
      .container { max-width: 650px; margin: 30px auto; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
      .header { background-color: #0d6efd; padding: 20px; text-align: center; color: #fff; }
      .header img { max-width: 180px; height: auto; vertical-align: middle; }
      .content { padding: 25px; }
      h2 { color: #333; margin-top: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      th, td { border: 1px solid #ddd; padding: 8px 10px; font-size: 14px; }
      th { background-color: #f3f4f6; color: #333; text-align: left; }
      p { font-size: 14px; color: #444; line-height: 1.6; }
      .button-table { margin: 25px auto; text-align: center; }
      .button {
        display: inline-block;
        background-color: #28a745;
        color: #fff !important;
        font-size: 14px;
        font-weight: bold;
        text-decoration: none;
        padding: 12px 25px;
        border-radius: 4px;
      }
      .button-reject { background-color: #dc3545 !important; margin-left: 15px; }
      @media only screen and (max-width: 600px) {
        .content { padding: 15px; }
        table, th, td { font-size: 12px; }
        .button { display: block; margin: 10px auto; width: 80%; }
        .button-reject { margin-left: 0; }
      }
    </style>
  </head>
  <body>
    <div class="container">

      <!-- Header with inline logo -->
      <div class="header">
        <img src="cid:logo" alt="IDMASLite Logo" />
      </div>

      <div class="content">
        <h2>Action Required: New User Request – ${userRequest.transaction_id}</h2>

        <p>Dear ${approverName},</p>

        <p><b>${userRequest.name} (Employee ID: ${userRequest.employee_code})</b> has submitted a new user request.<br/>
        Request ID: <b>${userRequest.transaction_id}</b></p>

        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Department</th>
              <th>Access Request Type</th>
              <th>Request For/By</th>
              <th>Application Access</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            ${taskRows}
          </tbody>
        </table>

        ${userRequest.training_attachment ? `<p>Training Certificate attached for your reference.</p>` : ''}

        <p>Please provide your approval or rejection by clicking below:</p>

        <!-- Buttons table for Outlook compatibility -->
        <table cellpadding="0" cellspacing="0" class="button-table">
          <tr>
            <td align="center">
              <a href="${approveLink}" class="button">Approve</a>
              <a href="${rejectLink}" class="button button-reject">Reject</a>
            </td>
          </tr>
        </table>

        <p>Regards,<br/><b>IDMASLite UAM Support Team</b></p>

        <p style="font-size:12px; color:#888; text-align:center; margin-top:25px;">
          This is an automated message. Please do not reply.
        </p>
      </div>
    </div>
  </body>
  </html>
  `;
};


/**
 * Load and process email template
 */
const loadEmailTemplate = (templateData) => {
  try {
    // Read the HTML template file
    const templatePath = path.join(__dirname, '../templates/email-template-password.html');
    let template = fs.readFileSync(templatePath, 'utf-8');

    // Replace placeholders with actual data
    template = template.replace(/{{userName}}/g, templateData.userName);
    template = template.replace(/{{taskNumber}}/g, templateData.taskNumber);
    template = template.replace(/{{requestType}}/g, templateData.requestType);
    template = template.replace(/{{applicationName}}/g, templateData.applicationName);
    template = template.replace(/{{allocatedId}}/g, templateData.allocatedId);
    template = template.replace(/{{password}}/g, templateData.password);
    template = template.replace(/{{currentYear}}/g, new Date().getFullYear().toString());

    return template;
  } catch (error) {
    console.error('Error loading email template:', error);
    throw new Error('Failed to load email template');
  }
};

/**
 * Send password email to user
 */
 const sendPasswordEmail = async (req, res) => {
  try {
    const {
      userEmail,
      userName,
      applicationName,
      allocatedId,
      password,
      taskNumber,
      requestType,
    } = req.body;

    // Validate required fields
    if (!userEmail || !userName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userEmail, userName, or password',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Create transporter
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

    // Verify transporter configuration
    await transporter.verify();

    // Load and process email template
    const htmlContent = loadEmailTemplate({
      userName,
      taskNumber,
      requestType,
      applicationName,
      allocatedId,
      password,
    });

    // Email options
    const mailOptions = {
      from: {
        name: 'IT Access Management',
        address: 'nishant1.singh@unichemlabs.com',
      },
      to: userEmail,
      subject: `Your Access Credentials - ${applicationName} (Task: ${taskNumber})`,
      html: htmlContent,
      // Plain text fallback
      text: `
Dear ${userName},

Your access request has been processed successfully.

Request Details:
- Task Number: ${taskNumber}
- Request Type: ${requestType}
- Application: ${applicationName}
- User ID: ${allocatedId}

Your Temporary Password: ${password}

IMPORTANT: This is a temporary password. You will be required to change it upon your first login.

Security Best Practices:
- Change your password immediately after first login
- Use a strong password with a mix of characters
- Never share your password with anyone
- Enable two-factor authentication if available

If you have any questions, please contact IT Support.

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Your Company Name. All rights reserved.
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Password email sent successfully:', info.messageId);

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
    });

  } catch (error) {
    console.error('Error sending password email:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message,
    });
  }
};

module.exports = {
  getApprovalEmail,
  sendPasswordEmail,
};
