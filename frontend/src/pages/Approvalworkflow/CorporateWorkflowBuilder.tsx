// src/pages/Approvalworkflow/CorporateWorkflowBuilder.tsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchCorporateWorkflows, saveCorporateWorkflow } from "./workflowHelpers";
import styles from "./WorkflowBuilder.module.css";

type Workflow = {
  id?: number;
  name?: string;
  status?: "active" | "inactive";
  approvers?: any[];
};

const CorporateWorkflowBuilder: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state: any = (location && (location as any).state) || {};
  const mode = state.mode || "add";
  const editWorkflow: Workflow | undefined = state.workflow;

  const [name, setName] = useState(editWorkflow?.name || "");
  const [approvers, setApprovers] = useState<any[]>(editWorkflow?.approvers || []);
  const [status, setStatus] = useState<"active" | "inactive">(editWorkflow?.status || "active");

  useEffect(() => {
    if (mode === "edit" && editWorkflow) {
      setName(editWorkflow.name || "");
      setApprovers(editWorkflow.approvers || []);
      setStatus(editWorkflow.status || "active");
    }
  }, [mode, editWorkflow]);

  async function handleSave() {
    const payload: Workflow = {
      id: mode === "edit" ? editWorkflow?.id : undefined,
      name,
      approvers,
      status,
    };

    await saveCorporateWorkflow(payload);
    navigate("/approval-workflow/corporate-list");
  }

  return (
    <div className={styles.formWrapper}>
      <h2>{mode === "edit" ? "Edit Corporate Workflow" : "Add Corporate Workflow"}</h2>

      <div className={styles.formRow}>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className={styles.formRow}>
        <label>Approvers</label>
        <textarea
          value={approvers.map((a) => a.name || a).join(", ")}
          onChange={(e) => setApprovers(e.target.value.split(",").map((s) => ({ name: s.trim() })))}
        />
      </div>

      <div className={styles.formRow}>
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={handleSave}>
          Save
        </button>
        <button className={styles.secondaryBtn} onClick={() => navigate(-1)}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CorporateWorkflowBuilder;
