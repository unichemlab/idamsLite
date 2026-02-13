const express = require("express");
const router = express.Router();
const accessLogController = require("../controllers/accessLog");
const authorize = require("../middleware/authorize");

// ⚠️ IMPORTANT: Specific routes MUST come BEFORE parameterized routes like /:id
router.get("/by-user", authorize(), accessLogController.getAccessLogsByUser);
// Get activity logs for access log module
router.get("/activity-logs/all", authorize(), accessLogController.getAccessLogActivityLogs);
router.get('/active-user-logs', accessLogController.getAllActiveUserLogs);
// Get access logs by vendor firm
router.get("/firm/:vendor_firm", authorize(), accessLogController.getAccessLogByFirm);

router.get('/bulk-deactivation', async (req, res) => {
  const { plant, department, name, employee_code } = req.query;

  if (!plant || !department|| !name|| !employee_code) {
    return res.status(400).json({ 
      error: 'Plant,Name,Employee Code and department are required' 
    });
  }

  try {
    const pool = require("../config/db");

    let params = [plant, department];
    let paramIndex = 3;

    let filters = `
      al.location::text = $1::text
      AND al.department::text = $2::text
    `;

    // ✅ Optional Filters
    if (name) {
      filters += ` AND al.name ILIKE $${paramIndex++}`;
      params.push(`%${name}%`);
    }

    if (employee_code) {
      filters += ` AND al.employee_code ILIKE $${paramIndex++}`;
      params.push(`%${employee_code}%`);
    }

    const query = `
      SELECT 
        al.id,
        al.name AS requestor_name,
        al.employee_code,
        plant.plant_name AS location_name,
        dept.department_name,
        al.application_equip_id,
        app.display_name AS application_name,
        al.role,
        role.role_name,
        al.task_status
      FROM access_log al
      LEFT JOIN application_master app 
        ON al.application_equip_id::text = app.id::text
      LEFT JOIN department_master dept 
        ON al.department::text = dept.id::text
      LEFT JOIN plant_master plant 
        ON al.location::text = plant.id::text
      LEFT JOIN role_master role 
        ON al.role::text = role.id::text
      WHERE ${filters}
      ORDER BY al.name, al.application_equip_id
    `;
console.log("query bulk",query,params);
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching bulk deactivation logs:', error);
    res.status(500).json({ error: 'Failed to fetch access logs' });
  }
});


// Conflict check route - MUST come before /:id
router.post("/conflict-check", authorize(), accessLogController.checkAccessLogConflict);

// Get all access logs with related master data
router.get("/", authorize(), accessLogController.getAllAccessLogs);

// ⚠️ Parameterized routes MUST come LAST
// Get single access log by ID
router.get("/:id", authorize(), accessLogController.getAccessLogById);

// Create new access log (requires approval)
router.post("/", authorize(), accessLogController.createAccessLog);

// Update access log (requires approval)
router.put("/:id", authorize(), accessLogController.updateAccessLog);

// Delete access log (requires approval)
router.delete("/:id", authorize(), accessLogController.deleteAccessLog);

// Update approver status (approval action)
router.patch("/:id/approver-status", authorize(), accessLogController.updateApproverStatus);

module.exports = router;