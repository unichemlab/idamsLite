const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const pool = require("../config/db");
const userRequestController = require("../controllers/userRequest");
const authorize = require("../middleware/authorize");
// 📂 Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    // Save with timestamp prefix
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/**
 * Routes
 */


// ✅ Approvers route must come first (above any "/:param" routes)
// router.get("/approvers", async (req, res) => {
//   const email = req.query.email;
//   if (!email) return res.status(400).json({ error: "Email is required" });
// console.log("approver email",email);
//   try {
//     console.log("➡️ [Approvers API] Checking approver email:", email);
//     const result = await pool.query(
//       `SELECT * FROM user_requests WHERE approver1_email = $1 OR approver2_email = $1`,
//       [email]
//     );
//     res.json(result.rows || []);
//   } catch (err) {
//     console.error("❌ Error fetching approver requests:", err);
//     res.status(500).json({ error: err });
//   }
// });

router.get("/approvers", async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  console.log("➡️ [Approvers API] Checking approver email:", email);

  try {
    const { rows } = await pool.query(
      `
      SELECT 
        ur.id AS user_request_id,
        ur.transaction_id AS user_request_transaction_id,
        ur.request_for_by,
        ur.name,
        ur.employee_code,
        ur.employee_location,
        ur.access_request_type,
        ur.training_status,
        ur.training_attachment,
        ur.training_attachment_name,
        ur.vendor_name,
        ur.vendor_firm,
        ur.vendor_code,
        ur.vendor_allocated_id,
        ur.status AS user_request_status,
        ur.created_on,

        tr.id AS task_id,
        tr.transaction_id AS task_request_transaction_id,
        tr.application_equip_id,
        app.display_name AS application_name,
        tr.department,
        d.department_name,
        tr.role,
        r.role_name,
        p.plant_name,
        tr.location,
        tr.reports_to,
        tr.task_status,
        tr.remarks

      FROM user_requests ur
      LEFT JOIN task_requests tr ON ur.id = tr.user_request_id
      LEFT JOIN department_master d ON tr.department = d.id
      LEFT JOIN role_master r ON tr.role = r.id
      LEFT JOIN plant_master p ON tr.location = p.id
      LEFT JOIN application_master app ON tr.application_equip_id = app.id

      WHERE ur.approver1_email = $1
         OR ur.approver2_email = $1

      ORDER BY ur.created_on DESC, tr.id
      `,
      [email]
    );

    const requestsMap = {};

    for (const row of rows) {
      if (!requestsMap[row.user_request_id]) {
        requestsMap[row.user_request_id] = {
          id: row.user_request_id,
          transaction_id: row.user_request_transaction_id,
          request_for_by: row.request_for_by,
          name: row.name,
          employee_code: row.employee_code,
          employee_location: row.employee_location,
          access_request_type: row.access_request_type,
          training_status: row.training_status,
          training_attachment: row.training_attachment,
          training_attachment_name: row.training_attachment_name,
          vendor_name: row.vendor_name,
          vendor_firm: row.vendor_firm,
          vendor_code: row.vendor_code,
          vendor_allocated_id: row.vendor_allocated_id,
          status: row.user_request_status,
          created_on: row.created_on,
          tasks: [],
        };
      }

      if (row.task_id) {
        requestsMap[row.user_request_id].tasks.push({
          task_id: row.task_id,
          transaction_id: row.task_request_transaction_id,
          application_equip_id: row.application_equip_id,
          application_name: row.application_name,
          department_id: row.department,
          department_name: row.department_name,
          role_id: row.role,
          role_name: row.role_name,
          location: row.plant_name,
          reports_to: row.reports_to,
          task_status: row.task_status,
          remarks: row.remarks,
        });
      }
    }

    res.json(Object.values(requestsMap));
  } catch (err) {
    console.error("❌ Error fetching approver requests:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/bulk-deactivation", authorize(), userRequestController.createBulkDeactivationRequest);
router.get("/", userRequestController.getAllUserRequests);
// Search user requests
router.get("/search", userRequestController.searchUserRequests);
router.post("/", upload.single("training_attachment"), userRequestController.createUserRequest);
router.get("/:id", userRequestController.getUserRequestById);
router.put("/:id", upload.single("training_attachment"), userRequestController.updateUserRequest);
router.delete("/:id", userRequestController.deleteUserRequest);
router.post("/inflight-check",userRequestController.checkInFlightRequest);
router.post("/validate-bulk",authorize(),userRequestController.validateBulkCreation);


// 📥 Download attachment
router.get("/:id/attachment", userRequestController.downloadAttachment);

module.exports = router;
