const pool = require("../config/db");

// generate transaction id like AT00000001
async function generateATID() {
  const { rows } = await pool.query(`
    SELECT transaction_id 
    FROM audit_trail 
    ORDER BY id DESC 
    LIMIT 1
  `);

  if (!rows.length) return "AT00000001";

  const last = rows[0].transaction_id; // "AT00000015"
  const num = parseInt(last.replace("AT", ""), 10) + 1;
  return "AT" + num.toString().padStart(8, "0");
}

async function auditLog(
  req,
  entity_name,
  record_id,
  operation,
  oldData = {},
  newData = {},
  reason = null
) {
  try {
    const user = req.user || {}; // JWT injected
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const device = req.headers["user-agent"];

    console.log("AUDIT --- START");
    console.log("operation:", operation);
    console.log("entity:", entity_name);
    console.log("record_id:", record_id);
    console.log("req.user:", req.user);

    const user_id = user?.id ?? null;
    const user_email = user?.email ?? null;
    const employee_name = user?.employee_name ?? null;
    const employee_code = user?.employee_code ?? null;
    const employee_id = user?.employee_id ?? null;

    const atID = await generateATID();

    // CASE 1: INSERT / LOGIN / LOGOUT / PRINT / EXPORT / DELETE
    if (operation !== "UPDATE") {
      await pool.query(
        `INSERT INTO audit_trail 
          (transaction_id, user_id, user_email, employee_name, employee_code, employee_id, 
           entity_name, record_id, operation, change_reason, ip_address, device_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          atID,
          user_id,
          user_email,
          employee_name,
          employee_code,
          employee_id,
          entity_name,
          record_id,
          operation,
          reason,
          ip,
          device,
        ]
      );
      console.log("AUDIT INSERT DONE");
      return;
    }

    // CASE 2: UPDATE – create row per field change
    for (const key in newData) {
      if (oldData[key] != newData[key]) {
        await pool.query(
          `INSERT INTO audit_trail
            (transaction_id, user_id, user_email, employee_name, employee_code, employee_id,
             entity_name, record_id, operation, field_name, old_value, new_value, change_reason, ip_address, device_name)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [
            atID,
            user_id,
            user_email,
            employee_name,
            employee_code,
            employee_id,
            entity_name,
            record_id,
            operation,
            key,
            String(oldData[key] ?? ""),
            String(newData[key] ?? ""),
            reason,
            ip,
            device,
          ]
        );
      }
    }

    console.log("AUDIT UPDATE DONE");
  } catch (err) {
    console.error("AUDIT ERROR:", err);
  }
}

module.exports = auditLog;
