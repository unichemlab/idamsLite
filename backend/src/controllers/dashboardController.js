/**
 * @swagger
 * /api/dashboard/counts:
 *   get:
 *     summary: Get all dashboard data — KPI counts + chart data
 *     tags: [Dashboard]
 */
const pool = require("../config/db");

exports.getDashboardCounts = async (req, res) => {
  try {

    /* ── KPI COUNTS ──────────────────────────────────── */
    const kpiQueries = {
      plants:           `SELECT COUNT(*) AS total, SUM(CASE WHEN status='ACTIVE'   THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='INACTIVE'  THEN 1 ELSE 0 END) AS inactive FROM plant_master`,
      roles:            `SELECT COUNT(*) AS total, SUM(CASE WHEN status='ACTIVE'   THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='INACTIVE'  THEN 1 ELSE 0 END) AS inactive FROM role_master`,
      vendors:          `SELECT COUNT(*) AS total, SUM(CASE WHEN status='ACTIVE'   THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='INACTIVE'  THEN 1 ELSE 0 END) AS inactive FROM vendor_master`,
      departments:      `SELECT COUNT(*) AS total, SUM(CASE WHEN status='ACTIVE'   THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='INACTIVE'  THEN 1 ELSE 0 END) AS inactive FROM department_master`,
      applications:     `SELECT COUNT(*) AS total, SUM(CASE WHEN status='ACTIVE'   THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='INACTIVE'  THEN 1 ELSE 0 END) AS inactive FROM application_master`,
      networkInventory: `SELECT COUNT(*) AS total, SUM(CASE WHEN status='ACTIVE'   THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='INACTIVE'  THEN 1 ELSE 0 END) AS inactive FROM network_inventory_master`,
      serverInventory:  `SELECT COUNT(*) AS total, SUM(CASE WHEN status='ACTIVE'   THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='INACTIVE'  THEN 1 ELSE 0 END) AS inactive FROM server_inventory_master`,
      systemInventory:  `SELECT COUNT(*) AS total, SUM(CASE WHEN status='ACTIVE'   THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='INACTIVE'  THEN 1 ELSE 0 END) AS inactive FROM system_inventory_master`,
      users:            `SELECT COUNT(*) AS total, SUM(CASE WHEN lower(status)=lower('Active') THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='Inactive' THEN 1 ELSE 0 END) AS inactive FROM user_master`,
      userRequests:     `SELECT
                           SUM(CASE WHEN status='Pending'  THEN 1 ELSE 0 END) AS pending,
                           SUM(CASE WHEN status='Approved' THEN 1 ELSE 0 END) AS approved,
                           SUM(CASE WHEN status='Rejected' THEN 1 ELSE 0 END) AS rejected,
                           SUM(CASE WHEN status='Completed' THEN 1 ELSE 0 END) AS completed
                         FROM user_requests`,
    };

    const result = {};
    for (const key in kpiQueries) {
      const { rows } = await pool.query(kpiQueries[key]);
      result[key] = rows[0];
    }

    /* ── CHART 1: Request volume by month (last 6 months) ── */
    /* From user_requests — groups by month, splits by status */
    const { rows: requestTrend } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_on), 'Mon') AS month,
        DATE_TRUNC('month', created_on) AS month_date,
        SUM(CASE WHEN status='Approved'  THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status='Rejected'  THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status='Pending'   THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status='Completed' THEN 1 ELSE 0 END) AS completed,
        COUNT(*) AS total
      FROM user_requests
      WHERE created_on >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_on)
      ORDER BY month_date ASC
    `);
    result.requestTrend = requestTrend;

    /* ── CHART 2: Access request types breakdown ── */
    /* From user_requests — New User / Modify / Password Reset / Bulk */
    const { rows: requestTypes } = await pool.query(`
      SELECT
        access_request_type AS type,
        COUNT(*) AS count,
        SUM(CASE WHEN status='Approved' OR status='Completed' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status='Rejected' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status='Pending'  THEN 1 ELSE 0 END) AS pending
      FROM user_requests
      GROUP BY access_request_type
      ORDER BY count DESC
    `);
    result.requestTypes = requestTypes;

    /* ── CHART 3: Task closure status breakdown ── */
    /* From task_requests (task_status field) */
    const { rows: taskStatus } = await pool.query(`
      SELECT
        task_status AS status,
        COUNT(*) AS count
      FROM task_requests
      GROUP BY task_status
      ORDER BY count DESC
    `);
    result.taskStatus = taskStatus;

    /* ── CHART 4: Task action split Grant vs Revoke ── */
    const { rows: taskActions } = await pool.query(`
      SELECT
        task_action AS action,
        COUNT(*) AS count,
        SUM(CASE WHEN task_status='Closed'   THEN 1 ELSE 0 END) AS closed,
        SUM(CASE WHEN task_status='Pending'  THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN task_status='Rejected' THEN 1 ELSE 0 END) AS rejected
      FROM task_requests
      GROUP BY task_action
      ORDER BY count DESC
    `);
    result.taskActions = taskActions;

    /* ── CHART 5: Pending approvals by module (admin_approvals table) ── */
    const { rows: pendingByModule } = await pool.query(`
      SELECT
        module,
        SUM(CASE WHEN status='PENDING'  THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status='APPROVED' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status='REJECTED' THEN 1 ELSE 0 END) AS rejected,
        COUNT(*) AS total
      FROM pending_approvals
      GROUP BY module
      ORDER BY pending DESC
    `);
    result.pendingByModule = pendingByModule;

    /* ── CHART 6: Request for by type (Self / Others / Vendor) ── */
    const { rows: requestForBy } = await pool.query(`
      SELECT
        request_for_by AS requester_type,
        COUNT(*) AS count,
        SUM(CASE WHEN status='Approved' OR status='Completed' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status='Rejected' THEN 1 ELSE 0 END) AS rejected
      FROM user_requests
      GROUP BY request_for_by
      ORDER BY count DESC
    `);
    result.requestForBy = requestForBy;

    /* ── CHART 7: Access log — top locations (from task_closure / access_log) ── */
    const { rows: locationActivity } = await pool.query(`
      SELECT
        employee_location AS location,
        COUNT(*) AS total,
        SUM(CASE WHEN user_request_status='Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN user_request_status='Pending'   THEN 1 ELSE 0 END) AS pending
      FROM access_log
      GROUP BY employee_location
      ORDER BY total DESC
      LIMIT 8
    `);
    result.locationActivity = locationActivity;

    /* ── CHART 8: Monthly task closure rate ── */
    const { rows: taskClosureTrend } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_on), 'Mon') AS month,
        DATE_TRUNC('month', created_on) AS month_date,
        SUM(CASE WHEN task_status='Closed'   THEN 1 ELSE 0 END) AS closed,
        SUM(CASE WHEN task_status='Pending'  THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN task_status='Approved' THEN 1 ELSE 0 END) AS approved,
        COUNT(*) AS total
      FROM task_requests
      WHERE created_on >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_on)
      ORDER BY month_date ASC
    `);
    result.taskClosureTrend = taskClosureTrend;

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};