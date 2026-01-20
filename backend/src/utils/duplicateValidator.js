const pool = require("../config/db");

/**
 * Automatically checks unique constraint duplicates
 */
async function checkDuplicateRecord({ tableName, payload, excludeId = null }) {

  // Fetch all UNIQUE columns dynamically
  const uniqueColsRes = await pool.query(`
    SELECT a.attname AS column_name
    FROM pg_constraint c
    JOIN pg_attribute a 
      ON a.attnum = ANY(c.conkey) 
     AND a.attrelid = c.conrelid
    WHERE c.contype = 'u'
      AND c.conrelid = $1::regclass
  `, [tableName]);

  if (!uniqueColsRes.rows.length) return null;

  for (const row of uniqueColsRes.rows) {
    const col = row.column_name;

    if (!payload[col]) continue;

    let query = `
      SELECT 1 
      FROM ${tableName} 
      WHERE ${col} = $1
    `;
    const params = [payload[col]];

    if (excludeId) {
      query += ` AND id <> $2`;
      params.push(excludeId);
    }

    const exists = await pool.query(query, params);

    if (exists.rowCount > 0) {
      return {
        column: col,
        value: payload[col],
      };
    }
  }

  return null;
}

module.exports = { checkDuplicateRecord };