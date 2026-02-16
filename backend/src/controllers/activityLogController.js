// backend/controllers/activityLogController.js
const db = require("../config/db");
const { canAccessPlant } = require("../middleware/permissionMiddleware");

/**
 * Check if user is super admin
 */
const isSuperAdmin = (user) => {
  if (!user) return false;
  
  // Check role_id directly
  if (user.role_id === 1) return true;
  if (Array.isArray(user.role_id) && user.role_id.includes(1)) return true;
  
  // Check roles array
  if (Array.isArray(user.roles) && user.roles.includes(1)) return true;
  if (user.roles === 1) return true;
  
  return false;
};

/**
 * 🔧 SIMPLE TEST ENDPOINT - Raw database query
 * Route: GET /api/activity-logs/test/:recordId
 */
exports.testActivityLogs = async (req, res) => {
  try {
    const { recordId } = req.params;
    
    console.log('\n========================================');
    console.log('🧪 TEST ENDPOINT - Activity Logs');
    console.log('========================================');
    console.log(`Record ID (param): ${recordId}`);
    console.log(`Record ID type: ${typeof recordId}`);
    console.log(`User:`, req.user);
    console.log('========================================\n');
    
    // Test 1: Check if table exists
    console.log('📋 Test 1: Check if activity_log table exists');
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'activity_log'
      );
    `);
    console.log('✅ Table exists:', tableExists.rows[0].exists);
    
    // Test 2: Count total rows
    console.log('\n📋 Test 2: Count total rows');
    const totalCount = await db.query('SELECT COUNT(*) FROM activity_log');
    console.log('✅ Total rows:', totalCount.rows[0].count);
    
    // Test 3: Count application_master rows
    console.log('\n📋 Test 3: Count application_master rows');
    const appCount = await db.query(
      "SELECT COUNT(*) FROM activity_log WHERE table_name = 'application_master'"
    );
    console.log('✅ Application_master rows:', appCount.rows[0].count);
    
    // Test 4: List all unique record_ids for application_master
    console.log('\n📋 Test 4: List unique record_ids');
    const uniqueRecords = await db.query(`
      SELECT DISTINCT record_id, COUNT(*) as count
      FROM activity_log 
      WHERE table_name = 'application_master'
      GROUP BY record_id
      ORDER BY record_id
    `);
    console.log('✅ Unique record_ids:', uniqueRecords.rows);
    
    // Test 5: Try exact match with recordId
    console.log(`\n📋 Test 5: Query with record_id = ${recordId}`);
    const exactMatch = await db.query(
      `SELECT * FROM activity_log 
       WHERE table_name = 'application_master' 
       AND record_id = $1`,
      [recordId]
    );
    console.log(`✅ Exact match found: ${exactMatch.rows.length} rows`);
    
    // Test 6: Try casting to integer
    console.log(`\n📋 Test 6: Query with CAST(record_id AS INTEGER) = ${recordId}`);
    const intMatch = await db.query(
      `SELECT * FROM activity_log 
       WHERE table_name = 'application_master' 
       AND CAST(record_id AS INTEGER) = $1`,
      [parseInt(recordId, 10)]
    );
    console.log(`✅ Integer cast match found: ${intMatch.rows.length} rows`);
    
    // Test 7: Try text comparison
    console.log(`\n📋 Test 7: Query with record_id::text = '${recordId}'`);
    const textMatch = await db.query(
      `SELECT * FROM activity_log 
       WHERE table_name = 'application_master' 
       AND record_id::text = $1`,
      [String(recordId)]
    );
    console.log(`✅ Text match found: ${textMatch.rows.length} rows`);
    
    // Test 8: Get first 5 rows for application_master
    console.log('\n📋 Test 8: Get first 5 application_master logs');
    const sampleLogs = await db.query(`
      SELECT id, record_id, pg_typeof(record_id) as type, action, date_time_ist
      FROM activity_log 
      WHERE table_name = 'application_master'
      ORDER BY id
      LIMIT 5
    `);
    console.log('✅ Sample logs:');
    sampleLogs.rows.forEach(log => {
      console.log(`   ID: ${log.id}, record_id: ${log.record_id} (${log.type}), action: ${log.action}`);
    });
    
    console.log('\n========================================');
    console.log('🎯 RESULT SUMMARY');
    console.log('========================================');
    
    res.json({
      success: true,
      requested_record_id: recordId,
      database_checks: {
        table_exists: tableExists.rows[0].exists,
        total_logs: totalCount.rows[0].count,
        application_master_logs: appCount.rows[0].count,
        unique_record_ids: uniqueRecords.rows,
        exact_match_count: exactMatch.rows.length,
        int_match_count: intMatch.rows.length,
        text_match_count: textMatch.rows.length,
      },
      sample_logs: sampleLogs.rows,
      matched_logs: exactMatch.rows.length > 0 ? exactMatch.rows : 
                    intMatch.rows.length > 0 ? intMatch.rows :
                    textMatch.rows.length > 0 ? textMatch.rows : [],
    });
    
  } catch (err) {
    console.error('\n❌ TEST ERROR:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      error: err.message,
      stack: err.stack,
      code: err.code 
    });
  }
};

/**
 * Get activity logs for a specific record in a table - WITH PERMISSION FILTERING
 * 
 * Route: GET /api/activity-logs/:tableName/:recordId
 * Example: GET /api/activity-logs/application_master/1
 */
exports.getActivityLogsByRecord = async (req, res) => {
  try {
    const { tableName, recordId } = req.params;
    
    console.log('\n========================================');
    console.log('📋 GET ACTIVITY LOGS BY RECORD');
    console.log('========================================');
    console.log(`Table: ${tableName}`);
    console.log(`Record ID: ${recordId}`);
    console.log(`User:`, req.user ? {
      id: req.user.id,
      role_id: req.user.role_id,
      username: req.user.username
    } : 'No user');
    console.log('========================================\n');
    
    // Validate table name
    const allowedTables = [
      'application_master',
      'department_master',
      'plant_master',
      'role_master',
      'user_master',
      'equipment_master',
      'system_master',
    ];
    
    if (!allowedTables.includes(tableName)) {
      console.log('❌ Invalid table name:', tableName);
      return res.status(400).json({ 
        error: "Invalid table name",
        allowedTables 
      });
    }

    console.log('✅ Table name is valid');

    // Try multiple query approaches
    console.log('\n🔍 Attempting query...');
    
    // Query 1: Try exact match
    let query = `
      SELECT * FROM activity_log
      WHERE table_name = $1 
        AND record_id = $2
      ORDER BY COALESCE(date_time_ist, created_on, NOW()) DESC
    `;
    
    console.log('Query:', query);
    console.log('Params:', [tableName, recordId]);
    
    let { rows: rawRows } = await db.query(query, [tableName, recordId]);
    
    console.log(`📊 Query result: ${rawRows.length} rows`);
    
    // If no results, try with type conversion
    if (rawRows.length === 0) {
      console.log('\n⚠️ No exact match. Trying with type conversion...');
      
      query = `
        SELECT * FROM activity_log
        WHERE table_name = $1 
          AND (
            record_id = $2 
            OR CAST(record_id AS TEXT) = $3
            OR CAST(record_id AS INTEGER) = $4
          )
        ORDER BY COALESCE(date_time_ist, created_on, NOW()) DESC
      `;
      
      const result = await db.query(query, [
        tableName, 
        recordId, 
        String(recordId),
        isNaN(parseInt(recordId)) ? null : parseInt(recordId, 10)
      ]);
      
      rawRows = result.rows;
      console.log(`📊 Type conversion result: ${rawRows.length} rows`);
    }
    
    if (rawRows.length === 0) {
      console.log('\n⚠️ Still no results. Checking what record_ids exist...');
      
      const existing = await db.query(
        `SELECT DISTINCT record_id, pg_typeof(record_id) as type 
         FROM activity_log 
         WHERE table_name = $1 
         LIMIT 10`,
        [tableName]
      );
      
      console.log('Existing record_ids:', existing.rows);
    }

    console.log(`\n✅ Found ${rawRows.length} raw logs`);

    // Parse and normalize the logs
    const rows = rawRows.map((r) => {
      if (r.details) {
        try {
          const parsed = JSON.parse(r.details);
          r.table_name = r.table_name || parsed.tableName;
          r.old_value = r.old_value || (parsed.old_value ? JSON.stringify(parsed.old_value) : null);
          r.new_value = r.new_value || (parsed.new_value ? JSON.stringify(parsed.new_value) : null);
          r.action = r.action || parsed.action;
          r.action_performed_by = r.action_performed_by || r.user_id || parsed.userId || null;
          r.record_id = r.record_id || parsed.recordId;
        } catch (e) {
          console.error('Error parsing log details:', e);
        }
      }
      return r;
    });

    // Check if super admin
    if (isSuperAdmin(req.user)) {
      console.log(`👑 Super admin - returning all ${rows.length} logs\n`);
      return res.json(rows);
    }

    // Filter by plant permissions
    const filteredRows = rows.filter((log) => {
      let plantId = null;

      if (log.old_value) {
        try {
          const oldVal = typeof log.old_value === "string" ? JSON.parse(log.old_value) : log.old_value;
          plantId = oldVal.plant_location_id || oldVal.plant_id;
        } catch (e) {}
      }

      if (!plantId && log.new_value) {
        try {
          const newVal = typeof log.new_value === "string" ? JSON.parse(log.new_value) : log.new_value;
          plantId = newVal.plant_location_id || newVal.plant_id;
        } catch (e) {}
      }

      if (!plantId) return true;
      return canAccessPlant(req.user, plantId);
    });

    console.log(`🔒 After permission filtering: ${filteredRows.length} logs\n`);
    res.json(filteredRows);
    
  } catch (err) {
    console.error('\n❌ ERROR:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      error: err.message, 
      stack: err.stack 
    });
  }
};

/**
 * Get activity logs for a specific table - WITH PERMISSION FILTERING
 */
exports.getActivityLogsByTable = async (req, res) => {
  try {
    const { tableName } = req.params;
    
    const allowedTables = [
      'application_master',
      'department_master',
      'plant_master',
      'role_master',
      'user_master',
      'equipment_master',
      'system_master',
    ];
    
    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({ 
        error: "Invalid table name",
        allowedTables 
      });
    }

    const { rows: rawRows } = await db.query(
      `SELECT * FROM activity_log
       WHERE table_name = $1
       ORDER BY COALESCE(date_time_ist, created_on, NOW()) DESC`,
      [tableName]
    );

    const rows = rawRows.map((r) => {
      if (r.details) {
        try {
          const parsed = JSON.parse(r.details);
          r.table_name = r.table_name || parsed.tableName || r.table_name;
          r.old_value = r.old_value || (parsed.old_value ? JSON.stringify(parsed.old_value) : null);
          r.new_value = r.new_value || (parsed.new_value ? JSON.stringify(parsed.new_value) : null);
          r.action = r.action || parsed.action || r.action;
          r.action_performed_by = r.action_performed_by || r.user_id || parsed.userId || null;
          r.record_id = r.record_id || parsed.recordId || null;
        } catch (e) {}
      }
      return r;
    });

    if (isSuperAdmin(req.user)) {
      return res.json(rows);
    }

    const filteredRows = rows.filter((log) => {
      let plantId = null;

      if (log.old_value) {
        try {
          const oldVal = typeof log.old_value === "string" ? JSON.parse(log.old_value) : log.old_value;
          plantId = oldVal.plant_location_id || oldVal.plant_id;
        } catch (e) {}
      }

      if (!plantId && log.new_value) {
        try {
          const newVal = typeof log.new_value === "string" ? JSON.parse(log.new_value) : log.new_value;
          plantId = newVal.plant_location_id || newVal.plant_id;
        } catch (e) {}
      }

      if (!plantId) return true;
      return canAccessPlant(req.user, plantId);
    });

    res.json(filteredRows);
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get all activity logs (admin only)
 */
exports.getAllActivityLogs = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM activity_log
       ORDER BY COALESCE(date_time_ist, created_on, NOW()) DESC
       LIMIT 1000`
    );

    const parsedRows = rows.map((r) => {
      if (r.details) {
        try {
          const parsed = JSON.parse(r.details);
          r.table_name = r.table_name || parsed.tableName;
          r.old_value = r.old_value || (parsed.old_value ? JSON.stringify(parsed.old_value) : null);
          r.new_value = r.new_value || (parsed.new_value ? JSON.stringify(parsed.new_value) : null);
          r.action = r.action || parsed.action;
          r.action_performed_by = r.action_performed_by || r.user_id || parsed.userId;
          r.record_id = r.record_id || parsed.recordId;
        } catch (e) {}
      }
      return r;
    });

    if (isSuperAdmin(req.user)) {
      return res.json(parsedRows);
    }

    const filteredRows = parsedRows.filter((log) => {
      let plantId = null;

      if (log.old_value) {
        try {
          const oldVal = typeof log.old_value === "string" ? JSON.parse(log.old_value) : log.old_value;
          plantId = oldVal.plant_location_id || oldVal.plant_id;
        } catch (e) {}
      }

      if (!plantId && log.new_value) {
        try {
          const newVal = typeof log.new_value === "string" ? JSON.parse(log.new_value) : log.new_value;
          plantId = newVal.plant_location_id || newVal.plant_id;
        } catch (e) {}
      }

      if (!plantId) return true;
      return canAccessPlant(req.user, plantId);
    });

    res.json(filteredRows);
  } catch (err) {
    console.error("Error fetching all activity logs:", err);
    res.status(500).json({ error: err.message });
  }
};