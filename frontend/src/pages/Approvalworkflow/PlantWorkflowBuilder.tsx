// src/pages/Approvalworkflow/PlantWorkflowBuilder.tsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  fetchPlants,
  fetchPlantWorkflows,
  filterInactivePlants,
  savePlantWorkflow,
} from "./workflowHelpers";
import styles from "./WorkflowBuilder.module.css";

// Types
type Plant = { id: number; name: string };
type User = { id?: number; employee_name: string; email?: string; profile_pic?: string };
type Workflow = {
  id?: number;
  plant_id?: number;
  name?: string;
  status?: "active" | "inactive";
  approver1?: User[];
  approver2?: User[];
  approver3?: User[];
  approver4?: User[];
  approver5?: User[];
  users?: User[];
};

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

const PlantWorkflowBuilder: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state: any = (location && (location as any).state) || {};
  const mode = state.mode || "add";
  const editWorkflow: Workflow | undefined = state.workflow;

  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [availablePlants, setAvailablePlants] = useState<Plant[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<number | undefined>(
    editWorkflow?.plant_id
  );
  const [name, setName] = useState(editWorkflow?.name || "");
  const [status, setStatus] = useState<"active" | "inactive">(editWorkflow?.status || "active");

  // Approvers per level
  const [approver1, setApprover1] = useState<User[]>(editWorkflow?.approver1 || []);
  const [approver2, setApprover2] = useState<User[]>(editWorkflow?.approver2 || []);
  const [approver3, setApprover3] = useState<User[]>(editWorkflow?.approver3 || []);
  const [approver4, setApprover4] = useState<User[]>(editWorkflow?.approver4 || []);
  const [approver5, setApprover5] = useState<User[]>(editWorkflow?.approver5 || []);
  const [users, setUsers] = useState<User[]>(editWorkflow?.users || []);

  useEffect(() => {
    async function load() {
      const [pRes, wfRes] = await Promise.all([fetchPlants(), fetchPlantWorkflows()]);

      const mappedPlants: Plant[] = (pRes || []).map((p: any) => ({
        id: p.id,
        name: p.plant_name || p.name || "—",
      }));

      setAllPlants(mappedPlants);
      setWorkflows(wfRes || []);
    }
    load();
  }, []);


 // Convert your local Workflow/User to the exact shape expected by helpers
const workflowForSave: import("./workflowHelpers").Workflow = {
  id: mode === "edit" && editWorkflow?.id ? editWorkflow.id : 0, // 0 or some default
  plant_id: selectedPlantId,
  name,
  status,
  approver1: approver1.slice(0, 20).map((u) => ({ id: u.id || 0, employee_name: u.employee_name, email: u.email })),
  approver2: approver2.slice(0, 20).map((u) => ({ id: u.id || 0, employee_name: u.employee_name, email: u.email })),
  approver3: approver3.slice(0, 20).map((u) => ({ id: u.id || 0, employee_name: u.employee_name, email: u.email })),
  approver4: approver4.slice(0, 20).map((u) => ({ id: u.id || 0, employee_name: u.employee_name, email: u.email })),
  approver5: approver5.slice(0, 20).map((u) => ({ id: u.id || 0, employee_name: u.employee_name, email: u.email })),
  users: users.map((u) => ({ id: u.id || 0, employee_name: u.employee_name, email: u.email })),
};

useEffect(() => {
  if (mode === "edit" && editWorkflow?.plant_id) setSelectedPlantId(editWorkflow.plant_id);

  // Convert local workflows to helper type before filtering
 const workflowsTyped = workflows.map((wf) => ({
  ...wf,
  id: wf.id || 0,
  approver1: wf.approver1?.map((u) => ({ id: u.id || 0, employee_name: u.employee_name })) || [],
  approver2: wf.approver2?.map((u) => ({ id: u.id || 0, employee_name: u.employee_name })) || [],
  approver3: wf.approver3?.map((u) => ({ id: u.id || 0, employee_name: u.employee_name })) || [],
  approver4: wf.approver4?.map((u) => ({ id: u.id || 0, employee_name: u.employee_name })) || [],
  approver5: wf.approver5?.map((u) => ({ id: u.id || 0, employee_name: u.employee_name })) || [],
  users: wf.users?.map((u) => ({ id: u.id || 0, employee_name: u.employee_name })) || [],
}));

setAvailablePlants(filterInactivePlants(allPlants, workflowsTyped));

}, [allPlants, workflows, mode, editWorkflow]);

  const handleViewUsers = (users: User[]) => {
    alert(`Users: ${users.map((u) => u.employee_name).join(", ")}`);
  };

  async function handleSave() {

    await savePlantWorkflow(workflowForSave);
navigate("/approval-workflow/plant-list");
  }

  return (
    <div className={styles.formWrapper}>
      <h2>{mode === "edit" ? "Edit Plant Workflow" : "Add Plant Workflow"}</h2>

      <div className={styles.formRow}>
        <label>Plant</label>
        {mode === "edit" ? (
          <select value={selectedPlantId} disabled>
            <option>{allPlants.find((p) => p.id === selectedPlantId)?.name || "—"}</option>
          </select>
        ) : (
          <select value={selectedPlantId || ""} onChange={(e) => setSelectedPlantId(Number(e.target.value))}>
            <option value="">Select plant</option>
            {availablePlants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className={styles.formRow}>
        <label>Workflow Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {/* Approvers 1–5 */}
      {[approver1, approver2, approver3, approver4, approver5].map((approverLevel, idx) => (
        <div className={styles.formRow} key={idx}>
          <label>Approver {idx + 1}</label>
          <UserAvatars
            users={approverLevel}
            handleViewUsers={(users) => alert(`Approver ${idx + 1}: ${users.map((u) => u.employee_name).join(", ")}`)}
          />
        </div>
      ))}

      <div className={styles.formRow}>
        <label>Users</label>
        <UserAvatars users={users} handleViewUsers={handleViewUsers} />
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

export default PlantWorkflowBuilder;
