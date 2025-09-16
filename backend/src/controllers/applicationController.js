const db = require("../config/db");

/**
 * @swagger
 * components:
 *   schemas:
 *     Application:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         transaction_id:
 *           type: string
 *         plant_location_id:
 *           type: integer
 *         department_id:
 *           type: integer
 *         application_hmi_name:
 *           type: string
 *         application_hmi_version:
 *           type: string
 *         equipment_instrument_id:
 *           type: string
 *         application_hmi_type:
 *           type: string
 *         display_name:
 *           type: string
 *         role_id:
 *           type: integer
 *         system_name:
 *           type: string
 *         system_inventory_id:
 *           type: integer
 *         multiple_role_access:
 *           type: boolean
 *         status:
 *           type: string
 *         created_on:
 *           type: string
 *         updated_on:
 *           type: string
 */

exports.getAllApplications = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM application_master");
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
