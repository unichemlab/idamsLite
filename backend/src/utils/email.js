// utils/email.js
const nodemailer = require("nodemailer");
const path = require("path");

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

const sendEmail = async ({ subject, html, attachments = [] }) => {
  try {
    await transporter.sendMail({
      from: `"IDMASLite UAM Notification" <nishant1.singh@unichemlabs.com>`,
      to: [
        "nishant1.singh@unichemlabs.com",
        "ashish.sachania@unichemlabs.com"
      ],
      subject,
      html,
      attachments,
    });

    console.log("Email sent successfully");
  } catch (err) {
    console.error("Email sending failed:", err.message);
  }
};


module.exports = { sendEmail };
