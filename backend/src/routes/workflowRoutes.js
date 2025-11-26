const express = require("express");
const router = express.Router();
const db = require("../config/db");
const workflowController = require("../controllers/workflowController");
const authorize = require("../middleware/authorize");

// GET /api/workflows - allow any authenticated user to list workflows (we check membership inside controller)
router.get("/", authorize(), workflowController.getWorkflows);
// Debug endpoint: check if a user id appears as approver in any workflow
router.get("/is-approver/:id", authorize(), workflowController.isApprover);
// POST /api/workflows
router.post(
  "/",
  authorize("create:workflows"),
  workflowController.createWorkflow
);
// PUT /api/workflows/:id
router.put(
  "/:id",
  authorize("update:workflows"),
  workflowController.updateWorkflow
);

// GET /api/workflows/plants
router.get("/plants", async (req, res) => {
  try {
    // Fetch all workflows (non-corporate) with plant and department names
    const { rows } = await db.query(`
      SELECT
        aw.id,
        aw.transaction_id,
        aw.workflow_type,
        aw.plant_id,
        aw.department_id,
        aw.approver_1_id,
        aw.approver_2_id,
        aw.approver_3_id,
        aw.approver_4_id,
        aw.approver_5_id,
        aw.max_approvers,
        aw.is_active,
        pm.plant_name,
        dm.department_name
      FROM approval_workflow_master aw
      LEFT JOIN plant_master pm ON aw.plant_id = pm.id
      LEFT JOIN department_master dm ON aw.department_id = dm.id
      WHERE aw.workflow_type != 'CORPORATE'
      ORDER BY aw.id
    `);

    // Collect unique approver IDs
    const approverIds = new Set();
    rows.forEach((r) => {
      [
        r.approver_1_id,
        r.approver_2_id,
        r.approver_3_id,
        r.approver_4_id,
        r.approver_5_id,
      ].forEach((val) => {
        if (val)
          String(val)
            .split(",")
            .forEach((id) => id && approverIds.add(id.trim()));
      });
    });

    // Fetch all approvers' user details
    let usersById = {};
    const numericIds = Array.from(approverIds)
      .map(Number)
      .filter(Number.isInteger);

    if (numericIds.length) {
      const placeholders = numericIds.map((_, i) => `$${i + 1}`).join(",");
      const { rows: users } = await db.query(
        `SELECT id, employee_name, employee_code, email FROM user_master WHERE id IN (${placeholders})`,
        numericIds
      );
      users.forEach((u) => (usersById[u.id] = u));
    }

    // Map workflow data
    const plantWorkflows = rows.map((r) => {
      const approver1 = r.approver_1_id
        ? String(r.approver_1_id)
            .split(",")
            .map((id) => usersById[Number(id)])
            .filter(Boolean)
        : [];
      const approver2 = r.approver_2_id
        ? String(r.approver_2_id)
            .split(",")
            .map((id) => usersById[Number(id)])
            .filter(Boolean)
        : [];
      const approver3 = r.approver_3_id
        ? String(r.approver_3_id)
            .split(",")
            .map((id) => usersById[Number(id)])
            .filter(Boolean)
        : [];
      const approver4 = r.approver_4_id
        ? String(r.approver_4_id)
            .split(",")
            .map((id) => usersById[Number(id)])
            .filter(Boolean)
        : [];
      const approver5 = r.approver_5_id
        ? String(r.approver_5_id)
            .split(",")
            .map((id) => usersById[Number(id)])
            .filter(Boolean)
        : [];

      // Combine all for flattened list
      const approversFlat = [...approver1, ...approver2, ...approver3, ...approver4, ...approver5]
        .filter(
          (v, i, a) => a.findIndex((x) => x.id === v.id) === i // unique
        );

      return {
        id: r.id,
        transaction_id: r.transaction_id,
        workflow_type: r.workflow_type,
        plant_id: r.plant_id,
        plant_name: r.plant_name || null,
        department_id: r.department_id,
        department_name: r.department_name || null,
        max_approvers: r.max_approvers,
        is_active: r.is_active,
        approver1,
        approver2,
        approver3,
        approver4,
        approver5,
        approversFlat,
      };
    });

    res.json(plantWorkflows);
  } catch (err) {
    console.error("GET /plants ERROR", err);
    res
      .status(500)
      .json({ error: "Failed to fetch plant workflows", details: err.message });
  }
});

// --- New Route 2: List all corporate workflows ---
router.get("/corporate", async (req, res) => {
  try {
    // Assuming corporate workflows have workflow_type = 'corporate'
    const { rows } = await db.query(
      `SELECT
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
      WHERE workflow_type = 'CORPORATE'
      ORDER BY id`
    );
    res.json(rows); // return as array of corporate workflows
  } catch (err) {
    console.error("GET /corporate ERROR", err);
    res.status(500).json({ error: "Failed to fetch corporate workflows", details: err.message });
  }
});


module.exports = router;
