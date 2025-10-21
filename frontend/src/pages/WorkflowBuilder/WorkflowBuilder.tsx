// This is a placeholder for existing code context
// ...existing code...
// This is a placeholder for existing code context
import React, { useState, useEffect } from "react";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import ProfileIconWithLogout from "../PlantMasterTable/ProfileIconWithLogout";
import styles from "./WorkflowBuilder.module.css";
import { fetchPlants } from "../../utils/api";
import Button from "../../components/Common/Button";
import InputField from "../../components/Common/InputField";
import { useUserContext } from "../../context/UserContext";
export const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:4000";
const EditIcon = () => (
  <span title="Edit" style={{ fontSize: 18, cursor: "pointer" }}>
    ✏️
  </span>
);
const DeleteIcon = () => (
  <span title="Delete" style={{ fontSize: 18, cursor: "pointer" }}>
    🗑️
  </span>
);
const AddIcon = () => (
  <span title="Add" style={{ fontSize: 18, cursor: "pointer" }}>
    ➕
  </span>
);

const plantOptionsStatic: string[] = ["GOA-1", "GOA-2", "GOA-3", "Gaziabad"];
const corporateOptions = [
  {
    label: "Corporate - Administration",
    maxApprovers: 1,
    value: "Administration",
  },
  { label: "Corporate - Application (SAP)", maxApprovers: 5, value: "SAP" },
  {
    label: "Corporate - Application (IT Support)",
    maxApprovers: 1,
    value: "IT Support",
  },
];

const MAX_APPROVER_UI_ROWS = 5;
const MAX_USERS_PER_GROUP = 20;

type Approver = {
  name: string;
  empCode: string;
  email: string;
  employee_id?: string;
  userId?: number | null;
};
type ApproverMap = {
  [key: string]: Approver[];
};

const defaultApprovers: ApproverMap = {
  "GOA-1": [
    { name: "Krishna", empCode: "10001", email: "krishna@unichemin.com" },
    { name: "", empCode: "", email: "" },
    { name: "", empCode: "", email: "" },
  ],
  "GOA-2": [
    { name: "Namrata", empCode: "10002", email: "namrata@unichemin.com" },
    { name: "", empCode: "", email: "" },
    { name: "", empCode: "", email: "" },
  ],
  "GOA-3": [
    { name: "Nehal", empCode: "10003", email: "nehal@unichemin.com" },
    { name: "", empCode: "", email: "" },
    { name: "", empCode: "", email: "" },
  ],
  Gaziabad: [
    { name: "", empCode: "", email: "" },
    { name: "", empCode: "", email: "" },
    { name: "", empCode: "", email: "" },
  ],
  "Corporate - Administration": [
    { name: "Bhaumik", empCode: "90754", email: "Bhaumik.joshi@unichemin.com" },
  ],
  "Corporate - Application (SAP)": [
    { name: "Nehal", empCode: "10003", email: "nehal@unichemin.com" },
    { name: "", empCode: "", email: "" },
    { name: "", empCode: "", email: "" },
    { name: "", empCode: "", email: "" },
    { name: "", empCode: "", email: "" },
  ],
  "Corporate - Application (ZingHR)": [
    { name: "", empCode: "", email: "" },
    { name: "", empCode: "", email: "" },
    { name: "", empCode: "", email: "" },
    { name: "", empCode: "", email: "" },
    { name: "", empCode: "", email: "" },
  ],
};

type ApproverRow = { users: Approver[] };

const WorkflowBuilder: React.FC = () => {
  const [plant, setPlant] = useState<string>("");
  const [corporate, setCorporate] = useState<string>("");
  const [approverRows, setApproverRows] = useState<ApproverRow[]>([]);
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);
  const [editUserIndex, setEditUserIndex] = useState<number | null>(null);
  const [form, setForm] = useState<{
    name: string;
    empCode: string;
    email: string;
    employee_id?: string;
    userId?: number | null;
  }>({ name: "", empCode: "", email: "", employee_id: "" });
  const { users } = useUserContext();
  const [plants, setPlants] = useState<any[]>([]);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<number | null>(
    null
  );

  const [userOptions, setUserOptions] = useState<any[]>([]);
  useEffect(() => {
    setUserOptions(
      users.map((u: any) => ({
        label: `${u.employee_name || u.fullName || u.full_name || ""} | ${
          u.employee_code || ""
        } | ${u.employee_id || ""}`,
        value: String(u.id),
        user: u,
      }))
    );
  }, [users]);

  useEffect(() => {
    if (!currentWorkflowId) return;
    let plantOrCorporate = plant || corporate;
    if (!plantOrCorporate) return;
    const fetchWorkflow = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/workflows?plant=${encodeURIComponent(plantOrCorporate)}`
        );
        if (!res.ok) throw new Error("Failed to fetch workflows");
        const data = await res.json();
        if (data.workflows && data.workflows.length) {
          // Use backend's approvers array for each row
          const wf = data.workflows[0];
          const rows = (wf.approvers || []).map((usersArr: any[]) => ({
            users: (usersArr || []).map((u: any) => ({
              name: u.employee_name || u.fullName || u.full_name || "",
              empCode: u.employee_code || "",
              email: u.email || "",
              employee_id: u.employee_id || "",
              userId: u.id || null,
            })),
          }));
          while (rows.length < MAX_APPROVER_UI_ROWS) rows.push({ users: [] });
          setApproverRows(rows);
        }
      } catch (err) {
        // fallback: do not update
      }
    };
    fetchWorkflow();
  }, [userOptions, users, plant, corporate, currentWorkflowId]);

  useEffect(() => {
    fetchPlants()
      .then((data) =>
        setPlants(
          data.map((p: any) => ({ id: p.id, plant_name: p.plant_name }))
        )
      )
      .catch(() => setPlants([]));
  }, []);

  const isEmptyUser = (user: Approver) =>
    !user.name && !user.empCode && !user.email;

  const handlePlantChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setPlant(value);
    setCorporate("");
    setEditRowIndex(null);
    setEditUserIndex(null);
    setForm({ name: "", empCode: "", email: "", employee_id: "" });
    setCurrentWorkflowId(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/workflows?plant=${encodeURIComponent(value)}`
      );
      if (!res.ok) throw new Error("Failed to fetch workflows");
      const data = await res.json();
      if (data.workflows && data.workflows.length) {
        const wf = data.workflows[0];
        setCurrentWorkflowId(wf.id || null);
        const approverIdsArr = [
          wf.approver_2_id,
          wf.approver_3_id,
          wf.approver_4_id,
          wf.approver_5_id,
        ];
        const rows = approverIdsArr.map((ids) => {
          if (!ids) return { users: [] };
          const idArr = String(ids)
            .split(",")
            .filter((id) => id);
          const usersMapped = idArr
            .map((id) => {
              const opt = userOptions.find(
                (o) => String(o.value) === String(id)
              );
              return opt ? opt.user : null;
            })
            .filter(Boolean)
            .slice(0, MAX_USERS_PER_GROUP);
          return {
            users: usersMapped.map((u: any) => ({
              name: u.employee_name || u.fullName || u.full_name || "",
              empCode: u.employee_code || "",
              email: u.email || "",
              employee_id: u.employee_id || "",
              userId: u.id || null,
            })),
          };
        });
        while (rows.length < MAX_APPROVER_UI_ROWS) rows.push({ users: [] });
        setApproverRows(rows);
        return;
      }
    } catch (err) {
      console.warn("Workflow fetch failed, falling back to defaults", err);
    }

    setApproverRows(
      Array.from({ length: MAX_APPROVER_UI_ROWS }, (_, i) => ({
        users:
          defaultApprovers[value] &&
          defaultApprovers[value][i] &&
          defaultApprovers[value][i].name
            ? [defaultApprovers[value][i]]
            : [],
      }))
    );
    setCurrentWorkflowId(null);
  };

  const handleCorporateChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setCorporate(value);
    setPlant("");
    setEditRowIndex(null);
    setEditUserIndex(null);
    setForm({ name: "", empCode: "", email: "", employee_id: "" });
    setCurrentWorkflowId(null);

    const max =
      corporateOptions.find((c) => c.label === value)?.maxApprovers || 1;

    try {
      const res = await fetch(
        `${API_BASE}/api/workflows?plant=${encodeURIComponent(value)}`
      );
      if (!res.ok) throw new Error("Failed to fetch workflows");
      const data = await res.json();
      if (data.workflows && data.workflows.length) {
        const wf = data.workflows[0];
        setCurrentWorkflowId(wf.id || null);
        const approverIdsArr = [
          wf.approver_2_id,
          wf.approver_3_id,
          wf.approver_4_id,
          wf.approver_5_id,
        ];
        const rows = approverIdsArr.map((ids) => {
          if (!ids) return { users: [] };
          const idArr = String(ids)
            .split(",")
            .filter((id) => id);
          const usersMapped = idArr
            .map((id) => {
              const opt = userOptions.find(
                (o) => String(o.value) === String(id)
              );
              return opt ? opt.user : null;
            })
            .filter(Boolean)
            .slice(0, MAX_USERS_PER_GROUP);
          return {
            users: usersMapped.map((u: any) => ({
              name: u.employee_name || u.fullName || u.full_name || "",
              empCode: u.employee_code || "",
              email: u.email || "",
              employee_id: u.employee_id || "",
              userId: u.id || null,
            })),
          };
        });
        while (rows.length < Math.max(max, MAX_APPROVER_UI_ROWS))
          rows.push({ users: [] });
        setApproverRows(rows);
        return;
      }
    } catch (err) {
      console.warn(
        "Workflow fetch failed for corporate, falling back to defaults",
        err
      );
    }

    setApproverRows(
      Array.from({ length: Math.max(max, MAX_APPROVER_UI_ROWS) }, (_, i) => ({
        users:
          defaultApprovers[value] &&
          defaultApprovers[value][i] &&
          defaultApprovers[value][i].name
            ? [defaultApprovers[value][i]]
            : [],
      }))
    );
  };

  const saveWorkflow = async () => {
    const body: any = {
      transaction_id: `APPR${String(Date.now()).slice(-10)}`,
      workflow_type: plant ? "PLANT" : "CORPORATE",
      plant_id: null,
      department_id: null,
      approver_1_id: null,
      approver_2_id: null,
      approver_3_id: null,
      approver_4_id: null,
      approver_5_id: null,
      max_approvers: 3,
      is_active: true,
    };
    const selectedPlant = plants.find(
      (p) => String(p.id) === String(plant) || p.plant_name === plant
    );
    if (selectedPlant) body.plant_id = selectedPlant.id;
    const pickNumericId = (u: any) => {
      if (!u) return null;
      if (u.userId !== undefined && u.userId !== null) return Number(u.userId);
      if (u.empCode && /^\d+$/.test(String(u.empCode)))
        return Number(u.empCode);
      console.warn("Approver id not numeric, skipping:", u);
      return null;
    };

    for (let i = 0; i < MAX_APPROVER_UI_ROWS; i++) {
      const dbCol = `approver_${i + 2}_id`;
      if (approverRows[i] && approverRows[i].users.length) {
        const ids = approverRows[i].users
          .map((u) => pickNumericId(u))
          .filter((id) => id != null);
        body[dbCol] = ids.length ? ids.join(",") : null;
      } else {
        body[dbCol] = null;
      }
    }

    try {
      let res;
      if (currentWorkflowId) {
        res = await fetch(`${API_BASE}/api/workflows/${currentWorkflowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${API_BASE}/api/workflows`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) throw new Error("Failed to save workflow");
      const saved = await res.json();
      setCurrentWorkflowId(saved.id || currentWorkflowId);
      const plantOrCorporate = plant || corporate;
      if (plantOrCorporate) {
          const wfRes = await fetch(
            `${API_BASE}/api/workflows?plant=${encodeURIComponent(plantOrCorporate)}`
          );
          if (wfRes.ok) {
            const wfData = await wfRes.json();
            if (wfData.workflows && wfData.workflows.length) {
              const wf = wfData.workflows[0];
              // Use backend's approvers array for each row
              const rows = (wf.approvers || []).map((usersArr: any[]) => ({
                users: (usersArr || []).map((u: any) => ({
                  name: u.employee_name || u.fullName || u.full_name || "",
                  empCode: u.employee_code || "",
                  email: u.email || "",
                  employee_id: u.employee_id || "",
                  userId: u.id || null,
                })),
              }));
              while (rows.length < MAX_APPROVER_UI_ROWS) rows.push({ users: [] });
              setApproverRows(rows);
            }
        }
      }
      alert("Workflow saved");
    } catch (err) {
      console.error("Save workflow failed", err);
      alert("Save failed: " + (err as any).message);
    }
  };

  const handleAddUser = (rowIdx: number) => {
    if (isEmptyUser(form) || !form.userId) {
      alert("Please select a user from the dropdown.");
      return;
    }
    const updatedRows = approverRows.map((r, i) => {
      if (i !== rowIdx) return r;
      if (r.users.some((u) => String(u.userId) === String(form.userId))) {
        return r;
      }
      return { users: [...r.users, { ...form }] };
    });
    setApproverRows(updatedRows);
    setForm({ name: "", empCode: "", email: "", employee_id: "" });
    setEditRowIndex(null);
    setEditUserIndex(null);
    setTimeout(async () => {
      const body: Record<string, any> = {};
      body.transaction_id = `APPR${String(Date.now()).slice(-10)}`;
      body.workflow_type = plant ? "PLANT" : "CORPORATE";
      const selectedPlant = plants.find(
        (p: any) => String(p.id) === String(plant) || p.plant_name === plant
      );
      body.plant_id = selectedPlant ? Number(selectedPlant.id) : null;
      body.department_id = null;
      body.max_approvers = 3;
      body.is_active = true;
      for (let i = 0; i < MAX_APPROVER_UI_ROWS; i++) {
        const dbCol = `approver_${i + 2}_id`;
        const ids = updatedRows[i].users
          .map((u: Approver) => u.userId)
          .filter((id: number | null | undefined) => id != null)
          .map((id: number | null | undefined) => String(id));
        body[dbCol] = ids.length ? ids.join(",") : null;
      }
      let workflowId = currentWorkflowId;
      if (!workflowId || typeof workflowId !== "number" || isNaN(workflowId)) {
        try {
          const res = await fetch(`${API_BASE}/api/workflows`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (res.ok) {
            const result = await res.json();
            workflowId = result.id;
            setCurrentWorkflowId(workflowId);
          } else {
            alert("Failed to create workflow");
            return;
          }
        } catch (err) {
          alert("Error creating workflow");
          return;
        }
      }
      try {
        const res = await fetch(`${API_BASE}/api/workflows/${workflowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const newRows = [...updatedRows];
          for (let i = 0; i < MAX_APPROVER_UI_ROWS; i++) {
            const dbCol = `approver_${i + 2}_id`;
            const ids = (body[dbCol] || "")
              .split(",")
              .filter((id: string) => Boolean(id));
            const usersMapped = ids
              .map((id: string) => {
                const opt = userOptions.find(
                  (o: any) => String(o.value) === String(id)
                );
                return opt ? opt.user : null;
              })
              .filter((u: any) => Boolean(u))
              .slice(0, MAX_USERS_PER_GROUP);
            newRows[i].users = usersMapped.map((u: any) => ({
              name: u.employee_name || u.fullName || u.full_name || "",
              empCode: u.employee_code || "",
              email: u.email || "",
              employee_id: u.employee_id || "",
              userId: u.id || null,
            }));
          }
          setApproverRows(newRows);
        } else {
          alert("Failed to update workflow");
        }
      } catch (err) {
        alert("Error updating workflow");
      }
    }, 0);
  };

  const handleEditUser = (rowIdx: number, userIdx: number) => {
    setEditRowIndex(rowIdx);
    setEditUserIndex(userIdx);
    setForm(approverRows[rowIdx].users[userIdx]);
  };

  const handleSaveEdit = () => {
    if (editRowIndex !== null && editUserIndex !== null) {
      if (isEmptyUser(form)) return;
      setApproverRows((prev) => {
        const updated = [...prev];
        if (
          updated[editRowIndex].users.some(
            (u, idx) =>
              idx !== editUserIndex &&
              u.empCode.trim().toLowerCase() ===
                form.empCode.trim().toLowerCase()
          )
        ) {
          return prev;
        }
        updated[editRowIndex].users[editUserIndex] = form;
        return updated;
      });
      setEditRowIndex(null);
      setEditUserIndex(null);
      setForm({ name: "", empCode: "", email: "", employee_id: "" });
    }
  };

  const handleDeleteUser = (rowIdx: number, userIdx: number) => {
    const updatedRows = approverRows.map((r, i) => {
      if (i !== rowIdx) return r;
      return { users: r.users.filter((_, idx) => idx !== userIdx) };
    });
    setApproverRows(updatedRows);
    setEditRowIndex(null);
    setEditUserIndex(null);
    setForm({ name: "", empCode: "", email: "", employee_id: "" });
    setTimeout(() => {
      const body: { [key: string]: any } = {};
      body.transaction_id = `APPR${String(Date.now()).slice(-10)}`;
      body.workflow_type = plant ? "PLANT" : "CORPORATE";
      body.plant_id = plant ? plant : null;
      body.department_id = null;
      body.max_approvers = 3;
      body.is_active = true;
      for (let i = 0; i < MAX_APPROVER_UI_ROWS; i++) {
        const dbCol = `approver_${i + 2}_id`;
        const ids = updatedRows[i].users
          .map((u: Approver) => u.userId)
          .filter((id: number | null | undefined) => id != null)
          .map(String);
        body[dbCol] = ids.length ? ids.join(",") : null;
      }
      fetch(`${API_BASE}/api/workflows/${currentWorkflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then((res) => res.json())
        .then((saved) => {
          const newRows = [...updatedRows];
          for (let i = 0; i < MAX_APPROVER_UI_ROWS; i++) {
            const dbCol = `approver_${i + 2}_id`;
            const ids = (body[dbCol] || "").split(",").filter(Boolean);
            const usersMapped = ids
              .map((id: string) => {
                const opt = userOptions.find(
                  (o: any) => String(o.value) === String(id)
                );
                return opt ? opt.user : null;
              })
              .filter((u: any) => Boolean(u))
              .slice(0, MAX_USERS_PER_GROUP);
            newRows[i].users = usersMapped.map((u: any) => ({
              name: u.employee_name || u.fullName || u.full_name || "",
              empCode: u.employee_code || "",
              email: u.email || "",
              employee_id: u.employee_id || "",
              userId: u.id || null,
            }));
          }
          setApproverRows(newRows);
        });
    }, 0);
  };

  const handleAddApproverRow = () => {
    const maxRows = MAX_APPROVER_UI_ROWS;
    if (approverRows.length < maxRows) {
      setApproverRows((prev) => [...prev, { users: [] }]);
    }
  };

  const handleDeleteApproverRow = (rowIdx: number) => {
    setApproverRows((prev) => prev.filter((_: any, i: number) => i !== rowIdx));
    setEditRowIndex(null);
    setEditUserIndex(null);
    setForm({ name: "", empCode: "", email: "", employee_id: "" });
  };

  return (
    <div>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Approver WorkFlow</h2>
        <div
          style={{ display: "flex", gap: "20px" }}
          className={styles["header-icons"]}
        >
          <span className={styles["header-icon"]}>
            <NotificationsIcon fontSize="small" />
          </span>
          <span className={styles["header-icon"]}>
            <SettingsIcon fontSize="small" />
          </span>
          <ProfileIconWithLogout />
        </div>
      </header>
      <div className={styles.container} aria-label="Workflow Approver Master">
        <div className={styles.selectionRow}>
          <div className={styles.selectGroup}>
            <label className={styles.label} htmlFor="plant-select">
              Plant
            </label>
            <select
              id="plant-select"
              className={styles.select}
              value={plant}
              onChange={handlePlantChange}
              disabled={!!corporate}
            >
              <option value="">Select Plant</option>
              {plants && plants.length
                ? plants.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.plant_name}
                    </option>
                  ))
                : plantOptionsStatic.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
            </select>
          </div>
          <div className={styles.selectGroup}>
            <label className={styles.label} htmlFor="corporate-select">
              Corporate/Central
            </label>
            <select
              id="corporate-select"
              className={styles.select}
              value={corporate}
              onChange={handleCorporateChange}
              disabled={!!plant}
            >
              <option value="">Select Corporate/Central</option>
              {corporateOptions.map((c) => (
                <option key={c.label} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(plant || corporate) && (
          <div className={styles.approverSection}>
            <div className={styles.approverHeader}>
              <h3 className={styles.subTitle}>Approver Rows</h3>
              <span className={styles.approverCount}>
                Rows: {approverRows.length}
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Button
                  style={{
                    minWidth: 40,
                    background: "#222",
                    color: "#fff",
                    borderRadius: 8,
                    fontSize: 18,
                    padding: "6px 10px",
                  }}
                  onClick={handleAddApproverRow}
                  type="button"
                  disabled={
                    plant
                      ? approverRows.length >= 5
                      : corporate
                      ? approverRows.length >=
                        (corporateOptions.find((c) => c.label === corporate)
                          ?.maxApprovers || 5)
                      : false
                  }
                >
                  <AddIcon />
                </Button>
              </div>
            </div>
            <div className={styles.approverListWrap}>
              {approverRows.map((row, rowIdx) => (
                <div key={rowIdx} className={styles.approverCard}>
                  <div className={styles.approverCardHeader}>
                    <span className={styles.approverCardTitle}>{`Approver ${
                      rowIdx + 2
                    }`}</span>
                    <button
                      className={styles.addApproverBtn}
                      onClick={() => handleDeleteApproverRow(rowIdx)}
                      type="button"
                    >
                      Remove Row
                    </button>
                  </div>
                  <div
                    className={styles.usersListWrap}
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}
                  >
                    {row.users.length === 0 && (
                      <span className={styles.noUsersText}>No users added</span>
                    )}
                    {row.users.map((u, userIdx) => (
                      <div
                        key={userIdx}
                        className={styles.userItem}
                        style={{ minWidth: 220, marginRight: 12 }}
                      >
                        <span className={styles.userText}>
                          {u.name} ({u.empCode}) - {u.email}{" "}
                          {u.employee_id
                            ? `| Employee_id: ${u.employee_id}`
                            : ""}
                        </span>
                        <div className={styles.userActions}>
                          <button
                            className={styles.iconBtn}
                            onClick={() => handleEditUser(rowIdx, userIdx)}
                            type="button"
                            title="Edit user"
                          >
                            <EditIcon />
                          </button>
                          <button
                            className={styles.iconBtn}
                            onClick={() => handleDeleteUser(rowIdx, userIdx)}
                            type="button"
                            title="Delete user"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        minWidth: 220,
                      }}
                    >
                      <button
                        className={`${styles.iconBtn} ${styles.addUser}`}
                        onClick={() => {
                          setEditRowIndex(rowIdx);
                          setEditUserIndex(null);
                          setForm({
                            name: "",
                            empCode: "",
                            email: "",
                            employee_id: "",
                          });
                        }}
                        type="button"
                        title="Add user"
                      >
                        <AddIcon />
                      </button>
                    </div>
                  </div>
                  {editRowIndex === rowIdx && (
                    <div className={styles.inlineFormGrid}>
                      <div className={styles.selectFull}>
                        <label className={styles.label}>
                          Select User <span style={{ color: "red" }}>*</span>
                        </label>
                        <select
                          className={styles.select}
                          value={
                            form.userId !== undefined && form.userId !== null
                              ? String(form.userId)
                              : ""
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            const opt = userOptions.find(
                              (o) => String(o.value) === val
                            );
                            if (opt) {
                              const u = opt.user;
                              setForm({
                                name:
                                  u.employee_name ||
                                  u.fullName ||
                                  u.full_name ||
                                  "",
                                empCode: u.employee_code || "",
                                email: u.email || "",
                                employee_id: u.employee_id || "",
                                userId: u.id,
                              } as any);
                            } else {
                              setForm({
                                name: "",
                                empCode: "",
                                email: "",
                                employee_id: "",
                                userId: null,
                              });
                            }
                          }}
                        >
                          <option value="">-- Select user --</option>
                          {userOptions.map((o) => (
                            <option key={o.value} value={String(o.value)}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <InputField
                          label="Name"
                          name="name"
                          value={form.name}
                          onChange={(e) => {}}
                          placeholder="Enter name"
                          disabled={true}
                        />
                        <InputField
                          label="Emp Code"
                          name="empCode"
                          value={form.empCode}
                          onChange={(e) => {}}
                          placeholder="Enter emp code"
                          disabled={true}
                        />
                      </div>
                      <div>
                        <InputField
                          label="Email ID"
                          name="email"
                          value={form.email}
                          onChange={(e) => {}}
                          placeholder="Enter email"
                          type="email"
                          disabled={true}
                        />
                        <InputField
                          label="Employee_id"
                          name="employee_id"
                          value={(form as any).employee_id || ""}
                          onChange={(e) => {}}
                          placeholder="Enter employee id"
                          disabled={true}
                        />
                      </div>
                      <div className={styles.formBtnWrap}>
                        {editUserIndex === null ? (
                          <Button
                            style={{
                              minWidth: 90,
                              background: "#2563eb",
                              color: "#fff",
                              borderRadius: 8,
                              boxShadow: "0 2px 8px rgba(37,99,235,0.08)",
                              fontSize: 15,
                            }}
                            onClick={() => handleAddUser(rowIdx)}
                            type="button"
                          >
                            Add
                          </Button>
                        ) : (
                          <Button
                            style={{
                              minWidth: 90,
                              background: "#27ae60",
                              color: "#fff",
                              borderRadius: 8,
                              boxShadow: "0 2px 8px rgba(39,174,96,0.08)",
                              fontSize: 15,
                            }}
                            onClick={handleSaveEdit}
                            type="button"
                          >
                            Save
                          </Button>
                        )}
                        <Button
                          style={{
                            minWidth: 70,
                            background: "#e74c3c",
                            color: "#fff",
                            borderRadius: 8,
                            marginLeft: 8,
                            fontSize: 15,
                          }}
                          onClick={() => {
                            setEditRowIndex(null);
                            setEditUserIndex(null);
                            setForm({
                              name: "",
                              empCode: "",
                              email: "",
                              employee_id: "",
                            });
                          }}
                          type="button"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowBuilder;
