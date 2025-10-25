// src/pages/Approvalworkflow/CorporateWorkflowList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCorporateWorkflows } from "./workflowHelpers";
import styles from "./WorkflowBuilder.module.css";

type Workflow = {
  id: number;
  name?: string;
  status: "active" | "inactive";
  approvers: any[];
  users?: any[];
};

const CorporateWorkflowList: React.FC = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const wf = await fetchCorporateWorkflows();
      setWorkflows(wf || []);
      setLoading(false);
    }
    load();
  }, []);

  function handleAdd() {
    navigate("/approval-workflow/corporate-builder", { state: { mode: "add" } });
  }

  function handleEdit(wf: Workflow) {
    navigate("/approval-workflow/corporate-builder", { state: { mode: "edit", workflow: wf } });
  }

  return (
    <div className={styles.listWrapper}>
      <div className={styles.listHeader}>
        <h2>Corporate Workflows</h2>
        <div>
          <button className={styles.primaryBtn} onClick={handleAdd}>
            + Add Workflow
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Approvers</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workflows.length === 0 && (
              <tr>
                <td colSpan={4}>No corporate workflows found.</td>
              </tr>
            )}
            {workflows.map((wf) => (
              <tr key={wf.id}>
                <td>{wf.name || `Workflow ${wf.id}`}</td>
                <td>
                  {wf.approvers?.length ? wf.approvers.map((a: any) => a.name || a).join(", ") : "—"}
                </td>
                <td>{wf.status}</td>
                <td style={{ textAlign: "right" }}>
                  <button className={styles.linkBtn} onClick={() => handleEdit(wf)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CorporateWorkflowList;
