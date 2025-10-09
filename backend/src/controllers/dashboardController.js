/**
 * @swagger
 * /api/dashboard/counts:
 *   get:
 *     summary: Get counts for dashboard cards
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard counts
 */
const pool = require("../config/db"); // your PostgreSQL pool

exports.getDashboardCounts = async (req, res) => {
  try {
    const queries = {
      plants: `SELECT COUNT(*) AS total, SUM(CASE WHEN status='ACTIVE' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='INACTIVE' THEN 1 ELSE 0 END) AS inactive FROM plant_master`,
      roles: `SELECT COUNT(*) AS total, SUM(CASE WHEN status='ACTIVE' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='INACTIVE' THEN 1 ELSE 0 END) AS inactive FROM role_master`,
      vendors: `SELECT COUNT(*) AS total, SUM(CASE WHEN status='ACTIVE' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='INACTIVE' THEN 1 ELSE 0 END) AS inactive FROM vendor_master`,
      departments: `SELECT COUNT(*) AS total, SUM(CASE WHEN status='ACTIVE' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='INACTIVE' THEN 1 ELSE 0 END) AS inactive FROM department_master`,
      applications: `SELECT COUNT(*) AS total, SUM(CASE WHEN status='ACTIVE' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='INACTIVE' THEN 1 ELSE 0 END) AS inactive FROM application_master`,
      networkInventory: `SELECT COUNT(*) AS total, SUM(CASE WHEN status='Active' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='Inactive' THEN 1 ELSE 0 END) AS inactive FROM network_inventory_master`,
      serverInventory: `SELECT COUNT(*) AS total, SUM(CASE WHEN status='Active' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='Inactive' THEN 1 ELSE 0 END) AS inactive FROM server_inventory_master`,
      systemInventory: `SELECT COUNT(*) AS total, SUM(CASE WHEN status='Active' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='Inactive' THEN 1 ELSE 0 END) AS inactive FROM system_inventory_master`,
      users: `SELECT COUNT(*) AS total, SUM(CASE WHEN status='Active' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status='Inactive' THEN 1 ELSE 0 END) AS inactive FROM user_master`,
      userRequests: `SELECT SUM(CASE WHEN status='Pending' THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status='Approved' THEN 1 ELSE 0 END) AS approved, SUM(CASE WHEN status='Rejected' THEN 1 ELSE 0 END) AS rejected FROM user_requests`
    };

    const result = {};
    for (const key in queries) {
      const { rows } = await pool.query(queries[key]);
      result[key] = rows[0];
    }

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
