const pool = require("../config/db");

exports.getAllPlants = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM plant_master ORDER BY id");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPlant = async (req, res) => {
  const { plant_name, description, location } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO plant_master (plant_name, description, location) VALUES ($1, $2, $3) RETURNING *",
      [plant_name, description, location]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePlant = async (req, res) => {
  const { id } = req.params;
  const { plant_name, description, location, status } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE plant_master SET plant_name=$1, description=$2, location=$3, status=$4, updated_on=NOW() WHERE id=$5 RETURNING *",
      [plant_name, description, location, status, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePlant = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM plant_master WHERE id=$1", [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};