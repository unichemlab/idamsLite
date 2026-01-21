const pool = require("../config/db");

/**
 * Automatically checks unique constraint duplicates
 * Supports single + composite unique constraints
 */
async function checkDuplicateRecord({ tableName, payload, excludeId = null }) {

  // Fetch UNIQUE constraints with constraint name
  const uniqueColsRes = await pool.query(`
    SELECT 
      c.conname AS constraint_name,
      a.attname AS column_name
    FROM pg_constraint c
    JOIN pg_attribute a 
      ON a.attnum = ANY(c.conkey) 
     AND a.attrelid = c.conrelid
    WHERE c.contype = 'u'
      AND c.conrelid = $1::regclass
    ORDER BY c.conname, a.attnum
  `, [tableName]);

  if (!uniqueColsRes.rows.length) return null;

  // Group columns by constraint
  const constraints = {};
  for (const row of uniqueColsRes.rows) {
    if (!constraints[row.constraint_name]) {
      constraints[row.constraint_name] = [];
    }
    constraints[row.constraint_name].push(row.column_name);
  }

  // Check each unique constraint
  for (const [constraintName, columns] of Object.entries(constraints)) {

    // Skip if payload doesn't contain all columns
    const missingColumn = columns.find(col => payload[col] === undefined);
    if (missingColumn) continue;

    let whereClause = [];
    let params = [];

    columns.forEach((col, index) => {
      whereClause.push(`${col} = $${index + 1}`);
      params.push(payload[col]);
    });

    let query = `
      SELECT 1
      FROM ${tableName}
      WHERE ${whereClause.join(" AND ")}
    `;

    if (excludeId) {
      query += ` AND id <> $${params.length + 1}`;
      params.push(excludeId);
    }

    const exists = await pool.query(query, params);

    if (exists.rowCount > 0) {
      return {
        constraint: constraintName,
        columns,
        values: columns.reduce((obj, col) => {
          obj[col] = payload[col];
          return obj;
        }, {})
      };
    }
  }

  return null;
}

module.exports = { checkDuplicateRecord };