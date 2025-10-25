// src/pages/Approvalworkflow/PlantWorkflowList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchPlantWorkflows,
  fetchPlants,
  filterInactivePlants,
} from "./workflowHelpers";
import { Workflow, Plant, User } from "./types";
import styles from "./WorkflowBuilder.module.css";



// Utility: Get initials
const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

// Reusable UserAvatars component
const UserAvatars: React.FC<{ users: User[]; handleViewUsers: (users: User[]) => void }> = ({
  users,
  handleViewUsers,
}) => {
  if (!Array.isArray(users) || users.length === 0) return <>-</>;

  const displayedUsers = users.slice(0, 2);
  const remaining = users.length - displayedUsers.length;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {displayedUsers.map((u, idx) =>
        u.profile_pic ? (
          <img
            key={idx}
            src={u.profile_pic}
            alt={u.employee_name}
            title={u.employee_name}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid #ccc",
            }}
          />
        ) : (
          <div
            key={idx}
            title={u.employee_name}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              backgroundColor: "#64748b",
              color: "#fff",
              fontSize: 12,
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #ccc",
            }}
          >
            {getInitials(u.employee_name)}
          </div>
        )
      )}

      {remaining > 0 && (
        <button
          onClick={() => handleViewUsers(users)}
          title="View all users"
          style={{
            backgroundColor: "#e2e8f0",
            border: "none",
            borderRadius: 12,
            padding: "4px 8px",
            fontSize: 12,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          +{remaining} more
        </button>
      )}
    </div>
  );
};

const PlantWorkflowList: React.FC = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [availablePlants, setAvailablePlants] = useState<Plant[]>([]);

  useEffect(() => {
  async function load() {
    try {
      const [wfRes, pRes] = await Promise.all([fetchPlantWorkflows(), fetchPlants()]);

      const mappedPlants: Plant[] = (pRes || []).map((p: any) => ({
        id: p.id,
        name: p.plant_name || p.name || "—",
      }));
console.log("gfgg",wfRes);
      const workflowsTyped: Workflow[] = (wfRes || []).map((wf: any) => ({
        id: wf.id!,
        transcation_id: wf.transaction_id!,
        plant_id: wf.plant_id!,
        plant_name: wf.plant_name || "—",
        department_id: wf.department_id,
        department_name: wf.department_name,
        status: wf.status || (wf.is_active ? "active" : "inactive"),
        max_approvers: wf.max_approvers,
        is_active: wf.is_active,
        approver1: Array.isArray(wf.approver1) ? wf.approver1 : [],
        approver2: Array.isArray(wf.approver2) ? wf.approver2 : [],
        approver3: Array.isArray(wf.approver3) ? wf.approver3 : [],
        approver4: Array.isArray(wf.approver4) ? wf.approver4 : [],
        approver5: Array.isArray(wf.approver5) ? wf.approver5 : [],
        users: Array.isArray(wf.users) ? wf.users : [],
        name: wf.name,
      }));
console.log("wrokflowtyped",workflowsTyped);
      setWorkflows(workflowsTyped);
      setPlants(mappedPlants);
    } catch (err) {
      console.error("Failed to load workflows or plants", err);
    } finally {
      setLoading(false);
    }
  }
  load();
}, []);


  useEffect(() => {
    setAvailablePlants(filterInactivePlants(plants, workflows));
  }, [plants, workflows]);

  const handleAdd = () => {
    navigate("/approval-workflow/plant-builder", {
      state: { mode: "add", availablePlants },
    });
  };

  const handleEdit = (wf: Workflow) => {
    navigate("/approval-workflow/plant-builder", {
      state: { mode: "edit", workflow: wf },
    });
  };

  const handleViewUsers = (users: User[]) => {
    alert(`Users: ${users.map((u) => u.employee_name).join(", ")}`);
  };

  return (
    <div className={styles.listWrapper}>
      <div className={styles.listHeader}>
        <h2>Plant Workflows</h2>
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
              <th>Transaction</th>
              <th>Plant</th>
              <th>Approver 1</th>
              <th>Approver 2</th>
              <th>Approver 3</th>
              <th>Approver 4</th>
              <th>Approver 5</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workflows.length === 0 && (
              <tr>
                <td colSpan={11}>No workflows found.</td>
              </tr>
            )}
            {workflows.map((wf) => (
              <tr key={wf.id}>
                <td>{wf.transcation_id}</td>
                <td>{wf.plant_name}</td>
                
               <td>
  <UserAvatars users={wf.approver1 || []} handleViewUsers={handleViewUsers} />
</td>
<td>
  <UserAvatars users={wf.approver2 || []} handleViewUsers={handleViewUsers} />
</td>
<td>
  <UserAvatars users={wf.approver3 || []} handleViewUsers={handleViewUsers} />
</td>
<td>
  <UserAvatars users={wf.approver4 || []} handleViewUsers={handleViewUsers} />
</td>
<td>
  <UserAvatars users={wf.approver5 || []} handleViewUsers={handleViewUsers} />
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

export default PlantWorkflowList;
