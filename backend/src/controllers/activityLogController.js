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
 * Get all activity logs (admin only), with optional date range
 */
/**
 * activityLogController.js
 *
 * Enriched activity log endpoint — resolves ALL numeric IDs to human-readable
 * names via LEFT JOINs directly in SQL, so the frontend never sees raw numbers.
 *
 * Returned extra columns (aliased with _name suffix):
 *   performed_by_name     — employee_name of the user who did the action
 *   performed_by_email    — their email
 *   performed_by_role     — their role name
 *   subject_user_name     — employee_name of the affected user (user_id on the record)
 *   plant_name            — plant/location name  (location_master)
 *   department_name       — department name       (department_master)
 *   role_name             — role name             (role_master)
 *   application_name      — application HMI name  (application_master / equipment_master)
 *   vendor_name_resolved  — vendor display name   (vendor_master)
 *   module_label          — human-readable module label
 */


/* ── helpers ─────────────────────────────────────────────────────────────── */

// const canAccessPlant = (u, id) => !id || (u?.plants||[]).includes(Number(id));

const MODULE_LABEL = {
  plant_master:"Plant Master", application_master:"Application Master",
  equipment_master:"Application Master", user_master:"User",
  user_requests:"Access Request (RITM)", task_requests:"Task / Approval",
  vendor_master:"Vendor Master", role_master:"Role Master",
  department_master:"Department Master", approvals:"Approval Workflow", auth:"Authentication",
};
const moduleLabel = (t,m) => MODULE_LABEL[m]||MODULE_LABEL[t]||(t||m||"System").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());

const safeJSON = (s) => { if(!s) return null; if(typeof s==="object") return s; try{return JSON.parse(s);}catch{return null;} };
const display  = (v) => { if(v==null) return null; if(typeof v==="object"){const s=JSON.stringify(v); return s==="{}"||s==="[]"?null:s;} return String(v).trim()||null; };

/* ── enrichObj: replace numeric IDs with names inside a JSON record ─────── */
const makeEnricher = (userMap, empCodeMap, roleMap, deptMap, plantMap, appMap) =>
  function enrichObj(obj) {
    if(!obj||typeof obj!=="object"||Array.isArray(obj)) return obj;
    const o = {...obj};

    // role (single) → role_name
    if(o.role!=null && !o.role_name){
      const r=roleMap[String(Number(o.role))];
      if(r){o.role_name=r; o.role_id_raw=o.role; delete o.role;}
    }
    // role_id (array "[12]" or [12]) → role_names
    if(o.role_id!=null && !o.role_names){
      let ids=Array.isArray(o.role_id)?o.role_id:safeJSON(o.role_id);
      if(Array.isArray(ids)&&ids.length){
        o.role_names=ids.map(id=>roleMap[String(Number(id))]||String(id)).join(", ");
        o.role_id_raw=o.role_id; delete o.role_id;
      }
    }
    // department → department_name
    if(o.department!=null && !o.department_name){
      const n=Number(o.department);
      if(!isNaN(n)&&n>0){const d=deptMap[String(n)]; if(d){o.department_name=d; o.department_id_raw=o.department; delete o.department;}}
    }
    // location → location_name (plant)
    if(o.location!=null && !o.location_name && typeof o.location!=="string"){
      const n=Number(o.location);
      if(!isNaN(n)&&n>0){const p=plantMap[String(n)]; if(p){o.location_name=p; o.location_id_raw=o.location; delete o.location;}}
    }
    // plant_id → plant_name
    if(o.plant_id!=null && !o.plant_name){
      const n=Number(o.plant_id);
      if(!isNaN(n)&&n>0){const p=plantMap[String(n)]; if(p){o.plant_name=p; o.plant_id_raw=o.plant_id; delete o.plant_id;}}
    }
    // application_equip_id → application_name
    if(o.application_equip_id!=null && !o.application_name){
      const a=appMap[String(Number(o.application_equip_id))];
      if(a){o.application_name=a; o.app_id_raw=o.application_equip_id; delete o.application_equip_id;}
    }
    // approver1_id / approver2_id (stored as employee_code)
    ["approver1_id","approver2_id"].forEach(key=>{
      const nameKey=key.replace("_id","_name");
      if(o[key]!=null && !o[nameKey]){
        const found=empCodeMap[String(o[key])]||userMap[String(Number(o[key]))];
        if(found) o[nameKey]=found;
      }
    });
    // user_id inside nested objects
    if(o.user_id!=null && !o.user_name){
      const u=userMap[String(Number(o.user_id))]; if(u) o.user_name=u;
    }
    return o;
  };

/* ── plain-English summary ─────────────────────────────────────────────── */
const buildSummary = (r) => {
  const who  = r.performed_by_name||String(r.action_performed_by||r.user_id||"System");
  const verb = {approve:"approved",reject:"rejected",update:"updated",insert:"created",
                create:"created",delete:"deleted",login:"logged in",logout:"logged out"}
                [(r.action||"").toLowerCase()] || (r.action||"").toLowerCase();
  const mod  = r.module_label;
  const txn  = r.request_transaction_id||"";
  const nv   = safeJSON(r.new_value)||{};
  const ov   = safeJSON(r.old_value)||{};
  const rec  = Object.keys(nv).length?nv:ov;

  const target  = r.subject_user_name||display(rec.name)||display(rec.employee_name)||"";
  const app     = r.application_name ||display(rec.application_name)||"";
  const role    = r.role_name        ||display(rec.role_name)||display(rec.role_names)||"";
  const plant   = r.plant_name       ||display(rec.location_name)||display(rec.plant_name)||"";
  const reqType = display(rec.access_request_type)||"";
  const status  = display(rec.status)||display(rec.task_status)||"";

  const parts=[`${who} ${verb} ${mod}`];
  if(txn)     parts.push(`[${txn}]`);
  if(target)  parts.push(`for ${target}`);
  if(reqType) parts.push(`(${reqType})`);
  if(app)     parts.push(`on ${app}`);
  if(role)    parts.push(`as ${role}`);
  if(plant)   parts.push(`@ ${plant}`);
  if(status)  parts.push(`→ ${status}`);
  return parts.join(" ");
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
 * Get audit trail logs (with optional date range)
 */

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN HANDLER
═══════════════════════════════════════════════════════════════════════════ */
exports.getAllActivityLogs = async (req, res) => {
  try {
    // ── date range ──────────────────────────────────────────────────────
    const {dateFrom,dateTo}=req.query;
    let to   = dateTo   ? new Date(dateTo)   : new Date();
    let from = dateFrom ? new Date(dateFrom) : (()=>{const d=new Date(to);d.setMonth(d.getMonth()-1);return d;})();
    const max=new Date(to); max.setMonth(to.getMonth()-6); if(from<max)from=max;
    to.setHours(23,59,59,999);

    // ── STEP 1: raw rows ────────────────────────────────────────────────
    const {rows:rawRows} = await db.query(
      `SELECT * FROM activity_log
        WHERE COALESCE(date_time_ist,created_on,NOW()) BETWEEN $1 AND $2
        ORDER BY COALESCE(date_time_ist,created_on,NOW()) DESC LIMIT 1000`,
      [from.toISOString(), to.toISOString()]
    );

    // ── STEP 2: master data in parallel ────────────────────────────────
    const [
      {rows:allUsers}, {rows:allRoles}, {rows:allDepts},
      {rows:allPlants}, {rows:allApps},
    ] = await Promise.all([
      db.query(`SELECT id, COALESCE(employee_name,employee_code) AS name,
                       email, employee_code, designation FROM user_master`),
      db.query(`SELECT id, role_name AS name FROM role_master`),
      db.query(`SELECT id, department_name AS name FROM department_master`),
      db.query(`SELECT id, plant_name AS name FROM plant_master`),
      db.query(`SELECT id, display_name AS name
                  FROM application_master`)
        .catch(()=>db.query(`SELECT id, application_name AS name FROM application_master`)),
    ]);

    // ── STEP 3: O(1) lookup maps ────────────────────────────────────────
    const userMap    = Object.fromEntries(allUsers.map(r=>[String(r.id),   r.name]));
    const roleMap    = Object.fromEntries(allRoles.map(r=>[String(r.id),   r.name]));
    const deptMap    = Object.fromEntries(allDepts.map(r=>[String(r.id),   r.name]));
    const plantMap   = Object.fromEntries(allPlants.map(r=>[String(r.id),  r.name]));
    const appMap     = Object.fromEntries(allApps.map(r=>[String(r.id),    r.name]));
    const empCodeMap = Object.fromEntries(
      allUsers.filter(r=>r.employee_code).map(r=>[String(r.employee_code), r.name])
    );
    const userRecMap = Object.fromEntries(allUsers.map(r=>[String(r.id), r]));

    const enrich = makeEnricher(userMap, empCodeMap, roleMap, deptMap, plantMap, appMap);

    // ── STEP 4: enrich each row ─────────────────────────────────────────
    const enrichedRows = rawRows.map(r => {

      // 4a. Parse details JSON first — promote missing top-level fields
      const det = safeJSON(r.details) || {};
      if(!r.table_name  && det.tableName)  r.table_name  = det.tableName;
      if(!r.action      && det.action)     r.action      = det.action;
      if(!r.record_id   && det.recordId)   r.record_id   = det.recordId;
      if(!r.browser)    r.browser  = det.browser  || null;
      if(!r.os)         r.os       = det.os        || null;
      if(!r.source)     r.source   = det.source    || null;
      if(!r.endpoint)   r.endpoint = det.endpoint  || null;
      if(!r.request_transaction_id)
        r.request_transaction_id = det.request_transaction_id || null;

      // Promote old/new/changes from inside details when top-level columns are null
      if(!r.old_value && det.old_value)
        r.old_value = typeof det.old_value==="string"?det.old_value:JSON.stringify(det.old_value);
      if(!r.new_value && det.new_value)
        r.new_value = typeof det.new_value==="string"?det.new_value:JSON.stringify(det.new_value);
      if(!r.changes && det.changes)
        r.changes = typeof det.changes==="string"?det.changes:JSON.stringify(det.changes);

      // 4b. Resolve performer: PK from action_performed_by → user_id → details.user_id
      const perfPK = r.action_performed_by || r.user_id || det.user_id || null;
      const perfRec = perfPK ? userRecMap[String(perfPK)] : null;
      r.performed_by_name        = perfRec?.name        || null;
      r.performed_by_email       = perfRec?.email       || null;
      r.performed_by_designation = perfRec?.designation || null;
      r.performed_by_role        = det.performed_by_role || null;

      // 4c. Resolve subject (the record that was acted on)
      if(r.table_name==="user_master" && r.record_id){
        const subRec = userRecMap[String(r.record_id)];
        if(subRec){
          r.subject_user_name  = subRec.name;
          r.subject_user_email = subRec.email;
          r.subject_user_code  = subRec.employee_code;
        }
      }

      // 4d. Enrich old/new JSON — replace all numeric IDs with names
      const nvObj = safeJSON(r.new_value);
      const ovObj = safeJSON(r.old_value);
      const nvEnr = nvObj ? enrich(nvObj) : null;
      const ovEnr = ovObj ? enrich(ovObj) : null;
      if(nvEnr) r.new_value = JSON.stringify(nvEnr);
      if(ovEnr) r.old_value = JSON.stringify(ovEnr);

      // 4e. Surface key resolved names as top-level columns for easy frontend access
      const rec = nvEnr || ovEnr || {};
      if(!r.subject_user_name)
        r.subject_user_name = display(rec.name)||display(rec.employee_name)||display(rec.display_name)||null;

      r.role_name        = display(rec.role_name)||display(rec.role_names)||null;
      r.department_name  = display(rec.department_name)||null;
      r.plant_name       = display(rec.location_name)||display(rec.plant_name)||null;
      r.application_name = display(rec.application_name)||null;

      // 4f. Module label + plain-English summary
      r.module_label = moduleLabel(r.table_name, r.module);
      r.summary      = buildSummary(r);

      return r;
    });

    // ── STEP 5: access control ──────────────────────────────────────────
    if(isSuperAdmin(req.user)) return res.json(enrichedRows);

    const filtered = enrichedRows.filter(log=>{
      const nv=safeJSON(log.new_value)||{}, ov=safeJSON(log.old_value)||{};
      const pid=ov.plant_id_raw||nv.plant_id_raw||ov.plant_location_id||nv.plant_location_id||null;
      return !pid || canAccessPlant(req.user,pid);
    });

    res.json(filtered);

  } catch(err){
    console.error("Error fetching activity logs:", err);
    res.status(500).json({error:err.message});
  }
};
