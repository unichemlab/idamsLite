// utils/emailTemplate.js

const getApprovalEmail = ({ userRequest, tasks = [], approveLink, rejectLink, approverName }) => {
  // Generate task rows
  const taskRows = tasks.length
    ? tasks.map((t, index) => `
      <tr>
        <td>${t.location || "-"}</td>
        <td>${t.department_name || "-"}</td>
        <td>${userRequest.access_request_type}</td>
        <td>${userRequest.request_for_by}</td>
        <td>${t.application_name || "-"}</td>
        <td>${t.role_name || "-"}</td>  
      </tr>
    `).join('')
    : `<tr><td colspan="7" style="text-align:center;">No tasks assigned</td></tr>`;

  return `
<html>
  <body>
    <p>Dear ${approverName},</p>
    <p>A new user request has been submitted by <b>${userRequest.name}</b> (${userRequest.employee_code}) and Requested ID is (${userRequest.transaction_id}) .</p>
    
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr>
          <th>Location</th>
          <th>Department</th>
          <th>Access Request Type</th>
          <th>Requestor For/By</th>
          <th>Application Access</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        ${taskRows}
      </tbody>
    </table>

    ${userRequest.training_attachment ? `<p>Training Certificate attached for your reference.</p>` : ''}

    <p>You can send approval or rejection mail by clicking below:</p>
    <a href="${approveLink}" style="padding:10px 20px;background:green;color:white;text-decoration:none;border-radius:5px;">Approve</a>
    &nbsp;
    <a href="${rejectLink}" style="padding:10px 20px;background:red;color:white;text-decoration:none;border-radius:5px;">Reject</a>

    <p>Regards,<br/>IDMASLite UAM Support Team</p>
  </body>
</html>
  `;
};

module.exports = { getApprovalEmail };
