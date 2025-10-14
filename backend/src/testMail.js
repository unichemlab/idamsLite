// testMail.js
const nodemailer = require("nodemailer");

// 1️⃣ Create transporter with static credentials and SSL
const transporter = nodemailer.createTransport({
  host: "email.unichemlabs.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: "nishant1.singh@unichemlabs.com",
    pass: "Admin@123",
  },
  tls: {
    rejectUnauthorized: false, // ignore cert issues for testing
  },
  logger: true,
  debug: true,
});

// 2️⃣ Define email options
const mailOptions = {
  from: '"Nishant Singh" <nishant1.singh@unichemlabs.com>', // sender
  to: "nishant1.singh@unichemlabs.com", // recipient (your real email)
  subject: "SMTP Test via Node.js (Port 465 SSL)",
  html: "<p>Hello! This is a test email sent via email.unichemlabs.com using port 465.</p>",
};

// 3️⃣ Send email
transporter.sendMail(mailOptions, (err, info) => {
  if (err) {
    console.error("Email sending failed:", err);
  } else {
    console.log("Email sent successfully:", info.response);
  }
});
