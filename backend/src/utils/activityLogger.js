// activitylogger.js
// Activity Logger with verbose DEBUG mode

const pool = require("../config/db");

/* -------------------------
 * Config / caches
 * ------------------------- */
const _requestInFlight = new Map();
const DEDUP_WINDOW_MS = 2000;
let _cachedColumns = null;
let _cachedAt = 0;
const COLUMN_CACHE_TTL_MS = 60 * 1000;

// DEBUG flag
const DEBUG = process.env.ACTIVITY_LOG_DEBUG === "true";

/* -------------------------
 * Constants
 * ------------------------- */
const ACTION = { CREATE:"create", UPDATE:"update", DELETE:"delete", VIEW:"view", APPROVE:"approve", REJECT:"reject" };
const MODULE = { USER:"user", VENDOR:"vendor", PLANT:"plant", ROLE:"role", TASK:"task" };

/* -------------------------
 * Helpers
 * ------------------------- */
function safeStringify(obj){ try{ return JSON.stringify(obj);}catch{try{return String(obj);}catch{return null;}}}
function sanitizeObject(obj, opts={}) {
  if(!obj||typeof obj!=="object") return obj;
  const sensitive = new Set((opts.extra||[]).concat(["password","pass","pwd","token","secret","authorization","auth","apiKey","api_key","ssn","creditcard","card_number"]));
  const out = Array.isArray(obj)?[]:{};
  for(const k of Object.keys(obj)){
    const lk = k.toLowerCase();
    if(sensitive.has(k)||sensitive.has(lk)||lk.includes("password")||lk.includes("token")||lk.includes("secret")||lk.includes("card")) out[k]="[REDACTED]";
    else out[k] = (obj[k]&&typeof obj[k]==="object")?sanitizeObject(obj[k], opts):obj[k];
  }
  return out;
}
function diffObjects(oldObj,newObj){
  if(!oldObj||typeof oldObj!=="object"||!newObj||typeof newObj!=="object") return oldObj!==newObj?{from:oldObj,to:newObj}:{};
  const diff={}; const allKeys = new Set([...Object.keys(oldObj),...Object.keys(newObj)]);
  for(const key of allKeys){
    if(["password","token","secret"].includes(key)) continue;
    const oldVal=oldObj[key]; const newVal=newObj[key];
    if(oldVal&&typeof oldVal==="object"&&newVal&&typeof newVal==="object"){
      const nested = diffObjects(oldVal,newVal);
      if(Object.keys(nested).length>0) diff[key]=nested;
    }else if(oldVal!==newVal) diff[key]={from:oldVal,to:newVal};
  }
  return diff;
}
function normalizeForHash(value){ const volatileKeys=new Set(["updated_on","created_on","date_time_ist","transaction_id"]); function recurse(v){ if(v==null) return null; if(typeof v!=="object") return v; if(Array.isArray(v)) return v.map(recurse); const keys=Object.keys(v).filter(k=>!volatileKeys.has(k)).sort(); const out={}; for(const k of keys) out[k]=recurse(v[k]); return out;} try{return JSON.stringify(recurse(value));}catch{return safeStringify(value);}}
function parseUserAgent(ua){ if(!ua||typeof ua!=="string") return {browser:null,os:null}; let browser="Unknown",osName="Unknown"; if(/chrome\/\d+/i.test(ua)&&!/edg\//i.test(ua)) browser="Chrome"; if(/edg\//i.test(ua)) browser="Edge"; if(/firefox\/\d+/i.test(ua)) browser="Firefox"; if(/safari\/\d+/i.test(ua)&&!/chrome\/\d+/i.test(ua)) browser="Safari"; if(/opr\/|opera\//i.test(ua)) browser="Opera"; if(/windows nt 10/i.test(ua)) osName="Windows 10"; else if(/windows nt 6\./i.test(ua)) osName="Windows"; else if(/android/i.test(ua)) osName="Android"; else if(/iphone|ipad|ipod/i.test(ua)) osName="iOS"; else if(/mac os x/i.test(ua)) osName="macOS"; else if(/linux/i.test(ua)) osName="Linux"; return {browser,os:osName};}

/* -------------------------
 * Dedup helpers
 * ------------------------- */
function buildDedupKey({userId,module,tableName,recordId,action,reqMeta={}}){
  const uid=userId??reqMeta.userId??"anonymous";
  const mid=module??"unknown";
  const t=tableName??(reqMeta.tableName||"unknown");
  const rid=recordId==null?"null":String(recordId);
  const act=action??"unknown";
  return `${uid}|${mid}|${t}|${rid}|${act}`;
}
function isDuplicateAndMark(key){
  try{
    const now=Date.now(); const last=_requestInFlight.get(key);
    if(last&&now-last<DEDUP_WINDOW_MS){ if(DEBUG) console.log(`[DEBUG] Duplicate detected: ${key}`); return true; }
    _requestInFlight.set(key,now);
    setTimeout(()=>_requestInFlight.delete(key), DEDUP_WINDOW_MS+500);
    return false;
  }catch(e){ console.warn("[ACTIVITY LOG DEDUP ERROR]",e); return false; }
}

/* -------------------------
 * Main logger
 * ------------------------- */
async function logActivity({
  userId, performedByRole=null, module, module_id=null, tableName, recordId, action,
  oldValue=null, newValue=null, comments="", approveStatus=null, reqMeta={}, options={}
}){
  action = typeof action==="string"?action.toLowerCase():action;
  const dedupKey = buildDedupKey({userId,module,tableName,recordId,action,reqMeta});
  if(isDuplicateAndMark(dedupKey)){ return null; }

  const sanitizeExtras=Array.isArray(options.sanitizeExtraKeys)?options.sanitizeExtraKeys:[];
  const safeOld = oldValue?sanitizeObject(oldValue,{extra:sanitizeExtras}):null;
  const safeNew = newValue?sanitizeObject(newValue,{extra:sanitizeExtras}):null;
  const changes = (safeOld&&safeNew)?diffObjects(safeOld,safeNew):null;

  const ip=reqMeta.ip??reqMeta.req?.ip??reqMeta.req?.headers?.["x-forwarded-for"]??null;
  const ua=reqMeta.userAgent??reqMeta.req?.get?.("User-Agent")??null;
  const uaParsed=parseUserAgent(ua);
  const performed_by = userId??reqMeta.userId??null;
  const performed_by_role = performedByRole??reqMeta.role??null;

  if(DEBUG){
    console.log("[DEBUG] logActivity called:");
    console.log("  dedupKey:", dedupKey);
    console.log("  oldValue:", safeOld);
    console.log("  newValue:", safeNew);
    console.log("  changes:", changes);
    console.log("  module/table/action:", module, tableName, action);
    console.log("  user:", performed_by, "role:", performed_by_role);
  }

  if(process.env.ACTIVITY_LOG_DRY_RUN==="true"){ return null; } // skip actual insert

  const details = safeStringify({module,tableName,recordId,action,old_value:safeOld,new_value:safeNew,changes,comments,reqMeta:{ip,userAgent:ua,browser:uaParsed.browser,os:uaParsed.os},performed_by,performed_by_role,timestamp:new Date().toISOString()});

  const cols = ["transaction_id","user_id","plant_id","module_id","table_name","record_id","action","old_value","new_value","action_performed_by","approve_status","date_time_ist","comments","ip_address","device","created_on","module","changes","user_agent","details"];
  const values = [reqMeta.transaction_id??null,performed_by,reqMeta.plant_id??null,module_id,tableName,recordId==null?null:String(recordId),action??null,safeOld?safeStringify(safeOld):null,safeNew?safeStringify(safeNew):null,performed_by,approveStatus??null,comments||null,ip,reqMeta.device??reqMeta.req?.headers?.["sec-ch-ua-platform"]??null,module??null,changes?safeStringify(changes):null,ua,details];
  const placeholders=[]; const sqlValues=[]; let paramIndex=1;
  for(let i=0,valIdx=0;i<cols.length;i++){
    if(cols[i]==="date_time_ist"||cols[i]==="created_on"){placeholders.push("NOW()");continue;}
    placeholders.push(`$${paramIndex++}`); sqlValues.push(values[valIdx++]);
  }
  try{
    const r = await pool.query(`INSERT INTO activity_log (${cols.join(",")}) VALUES (${placeholders.join(",")}) RETURNING id`, sqlValues);
    if(DEBUG) console.log(`[DEBUG] Inserted id:${r.rows?.[0]?.id ?? null}`);
    return r.rows?.[0]?.id ?? null;
  }catch(err){ console.error("[ACTIVITY LOG ERROR]",err); return null;}
}

/* -------------------------
 * Middleware
 * ------------------------- */
function activityLoggerMiddleware(opts={}) {
  const { autoLogMethods=["POST","PUT","DELETE"], autoLogPaths=null, sanitizeExtraKeys=[], attachToReqName="logActivity", autoLog=true }=opts;
  return function(req,res,next){
    req[attachToReqName]=async function(params={}){ const final={...params, reqMeta:{...params.reqMeta, ip:req.ip, userAgent:req.get?.("User-Agent"), req, userId:req.user?.id??req.user?.userId, role:req.user?.role??req.user?.roles??null, plant_id:req.user?.plant_id}}; final.userId=final.userId??final.reqMeta.userId??null; return logActivity(final); };
    if(!autoLog||!autoLogMethods.includes(req.method)) return next();
    if(Array.isArray(autoLogPaths)&&autoLogPaths.length>0&&!autoLogPaths.some(p=>p instanceof RegExp?p.test(req.path):req.path.includes(p))) return next();
    res.on("finish",async()=>{
      try{
        const performed_by=req.user?.id??req.user?.userId;
        const performed_by_role=req.user?.role??req.user?.roles;
        const oldRes=req.oldResource?sanitizeObject(req.oldResource,{extra:sanitizeExtraKeys}):null;
        const newRes=req.body?sanitizeObject(req.body,{extra:sanitizeExtraKeys}):null;
        if(DEBUG) console.log(`[DEBUG] Auto-log HTTP ${req.method} ${req.originalUrl} status ${res.statusCode}`);
        await req[attachToReqName]({userId:performed_by,performedByRole:performed_by_role,module:req.baseUrl?.split("/").filter(Boolean).join("_")??"http",tableName:req.path?.split("/").filter(Boolean)[0]??null,recordId:req.params?.id??req.params?.recordId??null,action:req.method.toLowerCase(),oldValue:oldRes,newValue:newRes,comments:`HTTP ${req.method} ${req.originalUrl} -> ${res.statusCode}`,reqMeta:{ip:req.ip,userAgent:req.get?.("User-Agent"),req},options:{sanitizeExtraKeys}});
      }catch(e){console.warn("[ACTIVITY LOG AUTO-LOG ERROR]",e);}
    });
    return next();
  };
}

/* -------------------------
 * List activity logs
 * ------------------------- */
async function getActivityLogs(req,res){
  try{
    const { module,action,userId,role,tableName,q,page=1,perPage=25,from,to,sort="date_time_ist",order="desc" }=req.query;
    const pageNum=Math.max(1,parseInt(page,10)||1); const limit=Math.max(1,Math.min(200,parseInt(perPage,10)||25)); const offset=(pageNum-1)*limit;
    const wheres=[]; const vals=[]; let idx=1;
    if(module){wheres.push(`module=$${idx++}`);vals.push(module);}
    if(action){wheres.push(`action=$${idx++}`);vals.push(action);}
    if(userId){wheres.push(`(action_performed_by=$${idx} OR user_id=$${idx})`);vals.push(userId);}
    if(role){wheres.push(`performed_by_role=$${idx++}`);vals.push(role);}
    if(tableName){wheres.push(`table_name=$${idx++}`);vals.push(tableName);}
    if(from){wheres.push(`date_time_ist >= $${idx++}`);vals.push(from);}
    if(to){wheres.push(`date_time_ist <= $${idx++}`);vals.push(to);}
    if(q){wheres.push(`(COALESCE(details::text,'') ILIKE $${idx++} OR COALESCE(changes::text,'') ILIKE $${idx++})`); vals.push(`%${q}%`,`%${q}%`);}
    const whereSql=wheres.length?`WHERE ${wheres.join(" AND ")}`:"";
    const countRes=await pool.query(`SELECT COUNT(*)::int as total FROM activity_log ${whereSql}`,vals);
    const total=countRes.rows?.[0]?.total??0;
    const allowedSortCols=["date_time_ist","created_on","id"]; const sortCol=allowedSortCols.includes(sort)?sort:"date_time_ist";
    const ord=order?.toLowerCase()==="asc"?"ASC":"DESC"; vals.push(limit,offset);
    const dataQ=`SELECT * FROM activity_log ${whereSql} ORDER BY ${sortCol} ${ord} LIMIT $${idx++} OFFSET $${idx++}`;
    const dataRes=await pool.query(dataQ,vals);
    return res.json({meta:{total,page:pageNum,perPage:limit,pages:Math.ceil(total/limit)},data:dataRes.rows});
  }catch(err){console.error("[ACTIVITY LOG LIST ERROR]",err);return res.status(500).json({error:"Failed to fetch activity logs"});}
}

/* -------------------------
 * Exports
 * ------------------------- */
module.exports = {
  logActivity,
  activityLoggerMiddleware,
  getActivityLogs,
  diffObjects,
  safeStringify,
  normalizeForHash,
  ACTION,
  MODULE
};
