const express = require("express");
const router = express.Router();
const pool = require("../config/db");

/**
 * Helper function to generate a new transaction_id like ITGroup0000001
 */
async function generateTransactionId() {
  const prefix = "ITGroup";
  const result = await pool.query(`SELECT transaction_id FROM plant_it_admin ORDER BY id DESC LIMIT 1`);
  if (result.rows.length === 0) {
    return `${prefix}0000001`;
  } else {
    const lastId = result.rows[0].transaction_id.replace(prefix, "");
    const newId = parseInt(lastId) + 1;
    return `${prefix}${String(newId).padStart(7, "0")}`;
  }
}

/**
 * ✅ GET all plant_it_admin records with linked users
 */
router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.transaction_id,
        p.plant_id,
        pm.plant_name,
        p.assignment_it_group,
        p.status,
        p.created_on,
        p.updated_on,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'user_id', u.id,
              'user_name', u.employee_name,
              'email', u.email
            )
          ) FILTER (WHERE u.id IS NOT NULL), '[]'
        ) AS users
      FROM plant_it_admin p
      LEFT JOIN plant_it_admin_users pu ON p.id = pu.plant_it_admin_id
      LEFT JOIN user_master u ON pu.user_id = u.id
      LEFT JOIN plant_master pm ON p.plant_id = pm.id
      GROUP BY p.id, pm.plant_name
      ORDER BY p.id DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching all:", err);
    res.status(500).send("Server error");
  }
});

/**
 * ✅ GET single record with linked users
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const adminResult = await pool.query("SELECT * FROM plant_it_admin WHERE id=$1", [id]);
    if (adminResult.rows.length === 0) return res.status(404).send("Record not found");

    const usersResult = await pool.query(
      `SELECT u.id, u.employee_name, u.email 
       FROM plant_it_admin_users pu 
       JOIN user_master u ON pu.user_id = u.id 
       WHERE pu.plant_it_admin_id=$1`,
      [id]
    );

    const record = {
      ...adminResult.rows[0],
      users: usersResult.rows,
    };

    res.json(record);
  } catch (err) {
    console.error("Error fetching record:", err);
    res.status(500).send("Server error");
  }
});

/**
 * ✅ POST new record
 */
router.post("/", async (req, res) => {
  const { plant_id, assignment_it_group, user_id = [], status } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const transaction_id = await generateTransactionId();

    // Insert into main table
    const insertMain = await client.query(
      `INSERT INTO plant_it_admin 
       (transaction_id, plant_id, assignment_it_group, status, created_on, updated_on)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, transaction_id`,
      [transaction_id, plant_id, assignment_it_group, status || "ACTIVE"]
    );

    const plantItAdminId = insertMain.rows[0].id;

    // Insert linked users (multi-user support)
    if (Array.isArray(user_id) && user_id.length > 0) {
      const insertUserPromises = user_id.map((uid) =>
        client.query(
          `INSERT INTO plant_it_admin_users (plant_it_admin_id, user_id) VALUES ($1, $2)`,
          [plantItAdminId, uid]
        )
      );
      await Promise.all(insertUserPromises);
    }

    await client.query("COMMIT");

    res.json({
      message: "Record created successfully",
      transaction_id,
      id: plantItAdminId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error inserting:", err);
    res.status(500).send("Server error: " + err.message);
  } finally {
    client.release();
  }
});

/**
 * ✅ PUT update record
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { plant_id, assignment_it_group, user_id = [], status } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Update main table
    const updateMain = await client.query(
      `UPDATE plant_it_admin 
       SET plant_id=$1, assignment_it_group=$2, status=$3, updated_on=NOW()
       WHERE id=$4 RETURNING *`,
      [plant_id, assignment_it_group, status, id]
    );

    if (updateMain.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).send("Record not found");
    }

    // Delete old user mappings
    await client.query("DELETE FROM plant_it_admin_users WHERE plant_it_admin_id=$1", [id]);

    // Insert new user mappings
    if (Array.isArray(user_id) && user_id.length > 0) {
      const insertUserPromises = user_id.map((uid) =>
        client.query(
          `INSERT INTO plant_it_admin_users (plant_it_admin_id, user_id) VALUES ($1, $2)`,
          [id, uid]
        )
      );
      await Promise.all(insertUserPromises);
    }

    await client.query("COMMIT");

    res.json({
      message: "Record updated successfully",
      record: updateMain.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating:", err);
    res.status(500).send("Server error: " + err.message);
  } finally {
    client.release();
  }
});

/**
 * ✅ DELETE record
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM plant_it_admin_users WHERE plant_it_admin_id=$1", [id]);
    const result = await client.query("DELETE FROM plant_it_admin WHERE id=$1 RETURNING *", [id]);

    await client.query("COMMIT");

    if (result.rows.length === 0) {
      return res.status(404).send("Record not found");
    }

    res.json({ message: "Record deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error deleting:", err);
    res.status(500).send("Server error");
  } finally {
    client.release();
  }
});

module.exports = router;

/**
 * ✅ GET all plant_it_admin records with linked users according to plant id
 */
router.get("/plant/:plant_id", async (req, res) => {
  try {
    const { plant_id } = req.params;
    const query = `
      SELECT 
        p.id,
        p.transaction_id,
        p.plant_id,
        pm.plant_name,
        p.assignment_it_group,
        p.status,
        p.created_on,
        p.updated_on,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'user_id', u.id,
              'user_name', u.employee_name,
              'email', u.email
            )
          ) FILTER (WHERE u.id IS NOT NULL), '[]'
        ) AS users
      FROM plant_it_admin p
      LEFT JOIN plant_it_admin_users pu ON p.id = pu.plant_it_admin_id
      LEFT JOIN user_master u ON pu.user_id = u.id
      LEFT JOIN plant_master pm ON p.plant_id = pm.id
      where p.plant_id = $1
      GROUP BY p.id, pm.plant_name
      ORDER BY p.id DESC;
    `;
    const result = await pool.query(query,[plant_id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching all:", err);
    res.status(500).send("Server error");
  }
});
