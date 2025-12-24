const db = require("../config/db");

// GET /api/workflows?plant=GOA-1 OR ?transaction_id=APPR0000001
exports.getWorkflows = async (req, res) => {
  try {
    const { plant, plant_id, transaction_id, approver_id,type,corporate_type } = req.query;
    const { user_id, isApprover } = req.user;

    // Build base query
    let where = [];
    let params = [];

    // If user is an approver, only show workflows they're part of
    if (isApprover) {
      where.push(`(
        approver_1_id = $${params.length + 1} OR 
        approver_2_id = $${params.length + 1} OR 
        approver_3_id = $${params.length + 1} OR 
        approver_4_id = $${params.length + 1} OR 
        approver_5_id = $${params.length + 1}
      )`);
      params.push(user_id.toString());
    }

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

    // If approver_id provided, filter workflows where any approver_N_id contains the id
    if (approver_id) {
      // Use a LIKE match against the comma-separated approver columns
      params.push(`%${approver_id}%`);
      const placeholder = `$${params.length}`;
      where.push(
        `(approver_1_id LIKE ${placeholder} OR approver_2_id LIKE ${placeholder} OR approver_3_id LIKE ${placeholder} OR approver_4_id LIKE ${placeholder} OR approver_5_id LIKE ${placeholder})`
      );
    }

    // Filter by workflow_type (from ?type=)
if (type) {
  params.push(type);
  where.push(`workflow_type = $${params.length}`);
}

// Filter by corporate_type (from ?corporate_type=)
if (corporate_type) {
  params.push(corporate_type);
  where.push(`corporate_type = $${params.length}`);
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

    // Collect all approver IDs (split comma-separated values)
    const approverIds = new Set();
    rows.forEach((r) => {
      [
        r.approver_1_id,
        r.approver_2_id,
        r.approver_3_id,
        r.approver_4_id,
        r.approver_5_id,
      ].forEach((val) => {
        if (val) {
          String(val)
            .split(",")
            .forEach((id) => {
              if (id && id.trim()) approverIds.add(id.trim());
            });
        }
      });
    });

    const idArray = Array.from(approverIds);
    let usersById = {};
    if (idArray.length) {
      const numericIds = idArray
        .filter((x) => Number.isInteger(Number(x)))
        .map((x) => Number(x));
      if (numericIds.length) {
        const placeholders = numericIds.map((_, i) => `$${i + 1}`).join(",");
        const usersQ = `SELECT id, employee_name, employee_id, employee_code, email FROM user_master WHERE id IN (${placeholders})`;
        const { rows: users } = await db.query(usersQ, numericIds);
        users.forEach((u) => {
          usersById[u.id] = u;
        });
      }
    }

    // Map workflows to include approver user objects (array per approver row)
    const workflows = rows.map((r) => ({
      id: r.id,
      transaction_id: r.transaction_id,
      workflow_type: r.workflow_type,
      plant_id: r.plant_id,
      department_id: r.department_id,
      max_approvers: r.max_approvers,
      is_active: r.is_active,
      approver_1_id: r.approver_1_id,
      approver_2_id: r.approver_2_id,
      approver_3_id: r.approver_3_id,
      approver_4_id: r.approver_4_id,
      approver_5_id: r.approver_5_id,
      approvers: [
        r.approver_1_id
          ? String(r.approver_1_id)
              .split(",")
              .map((id) => usersById[Number(id)])
              .filter(Boolean)
          : [],
        r.approver_2_id
          ? String(r.approver_2_id)
              .split(",")
              .map((id) => usersById[Number(id)])
              .filter(Boolean)
          : [],
        r.approver_3_id
          ? String(r.approver_3_id)
              .split(",")
              .map((id) => usersById[Number(id)])
              .filter(Boolean)
          : [],
        r.approver_4_id
          ? String(r.approver_4_id)
              .split(",")
              .map((id) => usersById[Number(id)])
              .filter(Boolean)
          : [],
        r.approver_5_id
          ? String(r.approver_5_id)
              .split(",")
              .map((id) => usersById[Number(id)])
              .filter(Boolean)
          : [],
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

// GET /api/workflows/is-approver/:id
// Small debug endpoint to check whether a given user id appears as an approver in any workflow
exports.isApprover = async (req, res) => {
  try {
    const id = req.params.id || req.query.id;
    if (!id) return res.status(400).json({ error: "approver id required" });

    const q = `
      SELECT id, transaction_id, plant_id, approver_1_id, approver_2_id, approver_3_id, approver_4_id, approver_5_id
      FROM approval_workflow_master
      WHERE (
        approver_1_id LIKE '%' || $1 || '%' OR
        approver_2_id LIKE '%' || $1 || '%' OR
        approver_3_id LIKE '%' || $1 || '%' OR
        approver_4_id LIKE '%' || $1 || '%' OR
        approver_5_id LIKE '%' || $1 || '%'
      ) AND is_active = true
      LIMIT 100
    `;

    const { rows } = await db.query(q, [String(id)]);
    const isApprover = Array.isArray(rows) && rows.length > 0;
    return res.json({ isApprover, workflows: rows });
  } catch (err) {
    console.error("[WORKFLOW isApprover ERROR]", err);
    return res.status(500).json({ error: err.message });
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
      corporate_type
    } = req.body;

    // Convert approver columns to comma-separated string if array
    const approver_1_id_str = Array.isArray(approver_1_id)
      ? approver_1_id.join(",")
      : approver_1_id || null;
    const approver_2_id_str = Array.isArray(approver_2_id)
      ? approver_2_id.join(",")
      : approver_2_id || null;
    const approver_3_id_str = Array.isArray(approver_3_id)
      ? approver_3_id.join(",")
      : approver_3_id || null;
    const approver_4_id_str = Array.isArray(approver_4_id)
      ? approver_4_id.join(",")
      : approver_4_id || null;
    const approver_5_id_str = Array.isArray(approver_5_id)
      ? approver_5_id.join(",")
      : approver_5_id || null;
if (workflow_type === "CORPORATE" && !corporate_type) {
  return res.status(400).json({ error: "corporate_type is required" });
}
    const q = `
  INSERT INTO approval_workflow_master (
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
    corporate_type,
    created_on,
    updated_on
  )
  VALUES (
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW()
  )
  RETURNING *
`;

    const params = [
  transaction_id,
  workflow_type,
  plant_id,
  department_id,
  approver_1_id_str,
  approver_2_id_str,
  approver_3_id_str,
  approver_4_id_str,
  approver_5_id_str,
  max_approvers || 0,
  is_active === undefined ? true : is_active,
  corporate_type || null
];

    console.log("[WORKFLOW CREATE] SQL:", q);
    console.log("[WORKFLOW CREATE] PARAMS:", params);
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
      corporate_type,
    } = req.body;

    // Convert approver columns to comma-separated string if array
    const approver_1_id_str = Array.isArray(approver_1_id)
      ? approver_1_id.join(",")
      : approver_1_id || null;
    const approver_2_id_str = Array.isArray(approver_2_id)
      ? approver_2_id.join(",")
      : approver_2_id || null;
    const approver_3_id_str = Array.isArray(approver_3_id)
      ? approver_3_id.join(",")
      : approver_3_id || null;
    const approver_4_id_str = Array.isArray(approver_4_id)
      ? approver_4_id.join(",")
      : approver_4_id || null;
    const approver_5_id_str = Array.isArray(approver_5_id)
      ? approver_5_id.join(",")
      : approver_5_id || null;

    const q = `
  UPDATE approval_workflow_master SET
    transaction_id = $1,
    workflow_type   = $2,
    plant_id        = $3,
    department_id   = $4,
    approver_1_id   = $5,
    approver_2_id   = $6,
    approver_3_id   = $7,
    approver_4_id   = $8,
    approver_5_id   = $9,
    max_approvers   = $10,
    is_active       = $11,
    corporate_type  = $12,
    updated_on      = NOW()
  WHERE id = $13
  RETURNING *
`;

    const params = [
  transaction_id,
  workflow_type,
  plant_id,
  department_id,
  approver_1_id_str,
  approver_2_id_str,
  approver_3_id_str,
  approver_4_id_str,
  approver_5_id_str,
  max_approvers || 0,
  is_active === undefined ? true : is_active,
  corporate_type || null,
  id
];

    console.log("[WORKFLOW UPDATE] SQL:", q);
    console.log("[WORKFLOW UPDATE] PARAMS:", params);
    const { rows } = await db.query(q, params);
    res.json(rows[0]);
  } catch (err) {
    console.error("[WORKFLOW UPDATE ERROR]", err);
    res
      .status(500)
      .json({ error: "Failed to update workflow", details: err.message });
  }
};
