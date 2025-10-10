const db = require("../config/db");

// GET /api/workflows?plant=GOA-1 OR ?transaction_id=APPR0000001
exports.getWorkflows = async (req, res) => {
  try {
    const { plant, plant_id, transaction_id } = req.query;

    // Build base query
    let where = [];
    let params = [];
    if (transaction_id) {
      params.push(transaction_id);
      where.push(`transaction_id = $${params.length}`);
    }

    // If plant_id provided explicitly, use it. If plant is provided and non-numeric, resolve it to an id
    let resolvedPlantId = null;
    if (plant_id) {
      // accept numeric plant_id
      const n = parseInt(plant_id, 10);
      if (!isNaN(n)) resolvedPlantId = n;
    } else if (plant) {
      const n = parseInt(plant, 10);
      if (!isNaN(n)) {
        resolvedPlantId = n;
      } else {
        // try to resolve plant name -> id from plant_master by plant_name or plant_label
        try {
          const pRes = await db.query(
            `SELECT id FROM plant_master WHERE plant_name = $1 LIMIT 1`,
            [plant]
          );
          if (pRes && pRes.rows && pRes.rows[0])
            resolvedPlantId = pRes.rows[0].id;
        } catch (err) {
          // swallow resolve error and continue (we will fall back to no plant filter)
          console.warn("Plant lookup failed for", plant, err.message);
        }
      }
    }

    if (resolvedPlantId !== null) {
      params.push(resolvedPlantId);
      where.push(`plant_id = $${params.length}`);
    }

    const q = `
      SELECT
        id,
        transaction_id,
        workflow_type,
        plant_id,
        department_id,
        approver_1_id,
        approver_2_id,
        approver_3_id,
        approver_4_id,
        approver_5_id,
        max_approvers,
        is_active
      FROM approval_workflow_master
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY id
      LIMIT 50
    `;

    const { rows } = await db.query(q, params);

    // If no rows, return empty
    if (!rows || rows.length === 0) return res.json({ workflows: [] });

    // Fetch user details for approver ids present in results
    const approverIds = new Set();
    rows.forEach((r) => {
      // support both approver_1_id and approver_1 naming
      const a1 = r.approver_1_id || r.approver_1;
      const a2 = r.approver_2_id || r.approver_2;
      const a3 = r.approver_3_id || r.approver_3;
      const a4 = r.approver_4_id || r.approver_4;
      const a5 = r.approver_5_id || r.approver_5;
      [a1, a2, a3, a4, a5].forEach((id) => {
        if (id) approverIds.add(id);
      });
    });

    const idArray = Array.from(approverIds);
    // Prepare maps for lookups by numeric id, employee_code, or employee_id
    let usersById = {};
    let usersByCode = {};
    let usersByEmpId = {};

    if (idArray.length) {
      // split numeric ids and string identifiers
      const numericIds = idArray
        .filter((x) => Number.isInteger(Number(x)))
        .map((x) => Number(x));
      const stringIds = idArray
        .filter((x) => !Number.isInteger(Number(x)))
        .map((x) => String(x));

      // Query numeric ids
      if (numericIds.length) {
        const placeholders = numericIds.map((_, i) => `$${i + 1}`).join(",");
        const usersQ = `SELECT id, employee_name, employee_id, employee_code, email FROM user_master WHERE id IN (${placeholders})`;
        const { rows: users } = await db.query(usersQ, numericIds);
        users.forEach((u) => {
          usersById[u.id] = u;
          if (u.employee_code) usersByCode[String(u.employee_code)] = u;
          if (u.employee_id) usersByEmpId[String(u.employee_id)] = u;
        });
      }

      // Query string identifiers by employee_code or employee_id
      if (stringIds.length) {
        // build placeholders starting after numericIds length
        const startIndex = 1;
        const placeholders = stringIds.map((_, i) => `$${i + 1}`).join(",");
        const usersQ2 = `SELECT id, employee_name, employee_id, employee_code, email FROM user_master WHERE employee_code IN (${placeholders}) OR employee_id IN (${placeholders})`;
        const { rows: users2 } = await db.query(
          usersQ2,
          stringIds.concat(stringIds)
        );
        users2.forEach((u) => {
          usersById[u.id] = u;
          if (u.employee_code) usersByCode[String(u.employee_code)] = u;
          if (u.employee_id) usersByEmpId[String(u.employee_id)] = u;
        });
      }
    }

    // Map workflows to include approver user objects
    const workflows = rows.map((r) => ({
      id: r.id,
      transaction_id: r.transaction_id,
      workflow_type: r.workflow_type,
      plant_id: r.plant_id,
      department_id: r.department_id,
      max_approvers: r.max_approvers,
      is_active: r.is_active,
      approvers: [
        // lookup helper: try numeric id, then employee_code, then employee_id
        (function () {
          const key = r.approver_1_id || r.approver_1;
          if (!key) return null;
          if (Number.isInteger(Number(key)) && usersById[Number(key)])
            return usersById[Number(key)];
          if (usersByCode[String(key)]) return usersByCode[String(key)];
          if (usersByEmpId[String(key)]) return usersByEmpId[String(key)];
          return null;
        })(),
        (function () {
          const key = r.approver_2_id || r.approver_2;
          if (!key) return null;
          if (Number.isInteger(Number(key)) && usersById[Number(key)])
            return usersById[Number(key)];
          if (usersByCode[String(key)]) return usersByCode[String(key)];
          if (usersByEmpId[String(key)]) return usersByEmpId[String(key)];
          return null;
        })(),
        (function () {
          const key = r.approver_3_id || r.approver_3;
          if (!key) return null;
          if (Number.isInteger(Number(key)) && usersById[Number(key)])
            return usersById[Number(key)];
          if (usersByCode[String(key)]) return usersByCode[String(key)];
          if (usersByEmpId[String(key)]) return usersByEmpId[String(key)];
          return null;
        })(),
        (function () {
          const key = r.approver_4_id || r.approver_4;
          if (!key) return null;
          if (Number.isInteger(Number(key)) && usersById[Number(key)])
            return usersById[Number(key)];
          if (usersByCode[String(key)]) return usersByCode[String(key)];
          if (usersByEmpId[String(key)]) return usersByEmpId[String(key)];
          return null;
        })(),
        (function () {
          const key = r.approver_5_id || r.approver_5;
          if (!key) return null;
          if (Number.isInteger(Number(key)) && usersById[Number(key)])
            return usersById[Number(key)];
          if (usersByCode[String(key)]) return usersByCode[String(key)];
          if (usersByEmpId[String(key)]) return usersByEmpId[String(key)];
          return null;
        })(),
      ],
    }));

    res.json({ workflows });
  } catch (err) {
    console.error("[WORKFLOW GET ERROR]", err);
    res
      .status(500)
      .json({ error: "Failed to fetch workflows", details: err.message });
  }
};

// POST /api/workflows
exports.createWorkflow = async (req, res) => {
  try {
    const {
      transaction_id,
      workflow_type,
      plant_id,
      department_id,
      approver_1_id,
      approver_2_id,
      approver_3_id,
      approver_4_id,
      approver_5_id,
      max_approvers,
      is_active,
    } = req.body;

    const q = `INSERT INTO approval_workflow_master (transaction_id, workflow_type, plant_id, department_id, approver_1_id, approver_2_id, approver_3_id, approver_4_id, approver_5_id, max_approvers, is_active, created_on, updated_on) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW()) RETURNING *`;
    const params = [
      transaction_id,
      workflow_type,
      plant_id,
      department_id,
      approver_1_id || null,
      approver_2_id || null,
      approver_3_id || null,
      approver_4_id || null,
      approver_5_id || null,
      max_approvers || 0,
      is_active === undefined ? true : is_active,
    ];
    const { rows } = await db.query(q, params);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("[WORKFLOW CREATE ERROR]", err);
    res
      .status(500)
      .json({ error: "Failed to create workflow", details: err.message });
  }
};

// PUT /api/workflows/:id
exports.updateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      transaction_id,
      workflow_type,
      plant_id,
      department_id,
      approver_1_id,
      approver_2_id,
      approver_3_id,
      approver_4_id,
      approver_5_id,
      max_approvers,
      is_active,
    } = req.body;

    const q = `UPDATE approval_workflow_master SET transaction_id=$1, workflow_type=$2, plant_id=$3, department_id=$4, approver_1_id=$5, approver_2_id=$6, approver_3_id=$7, approver_4_id=$8, approver_5_id=$9, max_approvers=$10, is_active=$11, updated_on=NOW() WHERE id=$12 RETURNING *`;
    const params = [
      transaction_id,
      workflow_type,
      plant_id,
      department_id,
      approver_1_id || null,
      approver_2_id || null,
      approver_3_id || null,
      approver_4_id || null,
      approver_5_id || null,
      max_approvers || 0,
      is_active === undefined ? true : is_active,
      id,
    ];
    const { rows } = await db.query(q, params);
    res.json(rows[0]);
  } catch (err) {
    console.error("[WORKFLOW UPDATE ERROR]", err);
    res
      .status(500)
      .json({ error: "Failed to update workflow", details: err.message });
  }
};
