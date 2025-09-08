exports.getVendorActivityLogs = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM activity_log WHERE table_name = 'vendor_master' ORDER BY date_time_ist DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const pool = require("../config/db");

exports.getAllVendors = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM vendor_master ORDER BY id");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createVendor = async (req, res) => {
  const { vendor_name, description } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO vendor_master (vendor_name, description) VALUES ($1, $2) RETURNING *",
      [vendor_name, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateVendor = async (req, res) => {
  const { id } = req.params;
  const { vendor_name, description, location, status } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE vendor_master SET vendor_name=$1, description=$2,  status=$3, updated_on=NOW() WHERE id=$4 RETURNING *",
      [vendor_name, description, status, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteVendor = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM vendor_master WHERE id=$1", [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
