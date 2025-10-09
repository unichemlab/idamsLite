// utils/emailTemplate.js

const getApprovalEmail = ({ userRequest, approveLink, rejectLink, approverName }) => `
<html>
  <body>
    <p>Dear ${approverName},</p>
    <p>A new user request has been submitted by <b>${userRequest.name}</b> (${userRequest.employee_code}).</p>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr><th>Request Type</th><td>${userRequest.access_request_type}</td></tr>
      <tr><th>Training Status</th><td>${userRequest.training_status}</td></tr>
      <tr><th>Created On</th><td>${new Date(userRequest.created_on).toLocaleString()}</td></tr>
    </table>
    <p>Please take action:</p>
    <a href="${approveLink}" style="padding:10px 20px;background:green;color:white;text-decoration:none;border-radius:5px;">Approve</a>
    &nbsp;
    <a href="${rejectLink}" style="padding:10px 20px;background:red;color:white;text-decoration:none;border-radius:5px;">Reject</a>
    <p>Training Certificate attached for your reference.</p>
    <p>Thank you,<br/>IDMAS Notification System</p>
  </body>
</html>
`;

module.exports = { getApprovalEmail };
