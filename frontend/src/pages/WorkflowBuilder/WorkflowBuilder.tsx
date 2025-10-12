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
  { label: "Corporate - Administration", maxApprovers: 1, value: "Administration"},
  { label: "Corporate - Application (SAP)", maxApprovers: 5,value: "SAP" },
  { label: "Corporate - Application (IT Support)", maxApprovers: 1 ,value: "IT Support"},
];

// UI shows only approver_2 and approver_3
const MAX_APPROVER_UI_ROWS = 2;

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
  const [corporate_type, setCorporateType] = useState<string>("");
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

  // Prepare options for select
  const [userOptions, setUserOptions] = useState<any[]>([]);
  useEffect(() => {
    setUserOptions(
      users.map((u: any) => ({
        label: `${u.employee_name || u.fullName || u.full_name || ""} | ${
          u.employee_code || ""
        } | ${u.employee_id || ""}`,
        // use numeric user id as the option value (stringified) so we can prefer numeric ids
        value: String(u.id),
        user: u,
      }))
    );
  }, [users]);

  useEffect(() => {
      fetchPlants()
        .then((data) =>
          setPlants(
            data.map((p: any) => ({ id: p.id, plant_name: p.plant_name }))
          )
        )
        .catch(() => setPlants([]));
    }, []);


  // Helper to check if a user is empty
  const isEmptyUser = (user: Approver) =>
    !user.name && !user.empCode && !user.email;

  // helper to pick a numeric id (prefer userId, else numeric empCode)
  const pickNumericId = (u: any) => {
    if (!u) return null;
    if (u.userId !== undefined && u.userId !== null) return Number(u.userId);
    if (u.empCode && /^\d+$/.test(String(u.empCode))) return Number(u.empCode);
    // cannot produce numeric id; return null to avoid DB integer errors
    console.warn("Approver id not numeric, skipping:", u);
    return null;
  };

  // Handle selection change (plant)
  const handlePlantChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setPlant(value);
    setCorporate("");
    setCorporateType("");
    setEditRowIndex(null);
    setEditUserIndex(null);
    setForm({ name: "", empCode: "", email: "", employee_id: "" });
    setCurrentWorkflowId(null);

    // Fetch workflow for the selected plant from backend
    try {
      const res = await fetch(
        `${API_BASE}/api/workflows?plant=${encodeURIComponent(value)}`
      );
      if (!res.ok) throw new Error("Failed to fetch workflows");
      const data = await res.json();
      if (data.workflows && data.workflows.length) {
        // For simplicity pick first workflow
        const wf = data.workflows[0];
        setCurrentWorkflowId(wf.id || null);
        // We want to start from approver 2 and ignore approver 1 per requirements
        const approvers = wf.approvers || [];
        // approvers array corresponds to approver_1..approver_5 -> remove index 0
        const rows = approvers.slice(1).map((u: any) => ({
          users: u
            ? [
                {
                  name: u.employee_name || "",
                  empCode: u.employee_code || "",
                  email: u.email || "",
                  employee_id: u.employee_id || "",
                  userId: u.id || null,
                },
              ]
            : [],
        }));
        setApproverRows(rows);
        return;
      }
    } catch (err) {
      console.warn("Workflow fetch failed, falling back to defaults", err);
    }

    // Fallback to defaults (existing behaviour)
    setApproverRows([
      {
        users:
          defaultApprovers[value] &&
          defaultApprovers[value][0] &&
          defaultApprovers[value][0].name
            ? [defaultApprovers[value][0]]
            : [],
      },
      {
        users:
          defaultApprovers[value] &&
          defaultApprovers[value][1] &&
          defaultApprovers[value][1].name
            ? [defaultApprovers[value][1]]
            : [],
      },
      {
        users:
          defaultApprovers[value] &&
          defaultApprovers[value][2] &&
          defaultApprovers[value][2].name
            ? [defaultApprovers[value][2]]
            : [],
      },
    ]);
    setCurrentWorkflowId(null);
  };

  const handleCorporateChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value;
    console.log("corporateChange",e.target.value);
    setCorporate(value);
    setCorporateType(value);
    setPlant("");
    setEditRowIndex(null);
    setEditUserIndex(null);
    setForm({ name: "", empCode: "", email: "", employee_id: "" });
    setCurrentWorkflowId(null);

    const max =
      corporateOptions.find((c) => c.label === value)?.maxApprovers || 1;

    // Try fetching workflow for corporate label (transaction_id or plant_id may differ)
    try {
      const res = await fetch(
        `${API_BASE }/api/workflows?plant=${encodeURIComponent(value)}`
      );
      if (!res.ok) throw new Error("Failed to fetch workflows");
      const data = await res.json();
      if (data.workflows && data.workflows.length) {
        const wf = data.workflows[0];
        setCurrentWorkflowId(wf.id || null);
        const approvers = wf.approvers || [];
        const rows = approvers.slice(1, 1 + max).map((u: any) => ({
          users: u
            ? [
                {
                  name: u.employee_name || "",
                  empCode: u.employee_code || "",
                  email: u.email || "",
                  employee_id: u.employee_id || "",
                  userId: u.id || null,
                },
              ]
            : [],
        }));
        // If fewer rows than max, pad
        while (rows.length < max) rows.push({ users: [] });
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
      Array.from({ length: max }, (_, i) => ({
        users:
          defaultApprovers[value] &&
          defaultApprovers[value][i] &&
          defaultApprovers[value][i].name
            ? [defaultApprovers[value][i]]
            : [],
      }))
    );
  };

  // Save workflow (create or update)
  const saveWorkflow = async () => {
    // build payload
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
    // resolve plant id
    const selectedPlant = plants.find(
      (p) => String(p.id) === String(plant) || p.plant_name === plant
    );
    if (selectedPlant) body.plant_id = selectedPlant.id;
    // helper to pick a numeric id (prefer userId, else numeric empCode)
    const pickNumericId = (u: any) => {
      if (!u) return null;
      if (u.userId !== undefined && u.userId !== null) return Number(u.userId);
      if (u.empCode && /^\d+$/.test(String(u.empCode)))
        return Number(u.empCode);
      // cannot produce numeric id; return null to avoid DB integer errors
      console.warn("Approver id not numeric, skipping:", u);
      return null;
    };

    if (approverRows[0] && approverRows[0].users[0])
      body.approver_2_id = pickNumericId(approverRows[0].users[0]);
    if (approverRows[1] && approverRows[1].users[0])
      body.approver_3_id = pickNumericId(approverRows[1].users[0]);

    try {
      let res;
      if (currentWorkflowId) {
        res = await fetch(
          `${API_BASE}/api/workflows/${currentWorkflowId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
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
      alert("Workflow saved");
    } catch (err) {
      console.error("Save workflow failed", err);
      alert("Save failed: " + (err as any).message);
    }
  };

  // Add/Edit/Delete user within an approver row

  const handleAddUser = (rowIdx: number) => {
    // Prevent adding empty user
    if (isEmptyUser(form)) return;
    // Build updated rows locally so we can save immediately
    const updatedRows = approverRows.map((r, i) => {
      if (i !== rowIdx) return r;
      // Prevent duplicate user (by empCode)
      if (
        r.users.some(
          (u) =>
            u.empCode.trim().toLowerCase() === form.empCode.trim().toLowerCase()
        )
      ) {
        return r; // no change
      }
      return { users: [...r.users, { ...form }] };
    });
    setApproverRows(updatedRows);
    setForm({ name: "", empCode: "", email: "", employee_id: "" });
    setEditRowIndex(null);
    setEditUserIndex(null);

    // Persist updated workflow to backend
    (async () => {
      // prepare payload similar to saveWorkflow
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
      if (updatedRows[0] && updatedRows[0].users[0])
        body.approver_2_id = pickNumericId(updatedRows[0].users[0]);
      if (updatedRows[1] && updatedRows[1].users[0])
        body.approver_3_id = pickNumericId(updatedRows[1].users[0]);

      try {
        let res;
        if (currentWorkflowId) {
          res = await fetch(
            `${API_BASE}/api/workflows/${currentWorkflowId}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          );
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
      } catch (err) {
        console.error("Auto-save after add failed", err);
        // optionally notify user
      }
    })();
  };

  const handleEditUser = (rowIdx: number, userIdx: number) => {
    setEditRowIndex(rowIdx);
    setEditUserIndex(userIdx);
    setForm(approverRows[rowIdx].users[userIdx]);
  };

  const handleSaveEdit = () => {
    if (editRowIndex !== null && editUserIndex !== null) {
      // Prevent empty user and duplicate empCode
      if (isEmptyUser(form)) return;
      setApproverRows((prev) => {
        const updated = [...prev];
        // Check for duplicate empCode except for the one being edited
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

    // Persist deletion
    (async () => {
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
      if (updatedRows[0] && updatedRows[0].users[0])
        body.approver_2_id = pickNumericId(updatedRows[0].users[0]);
      if (updatedRows[1] && updatedRows[1].users[0])
        body.approver_3_id = pickNumericId(updatedRows[1].users[0]);

      try {
        let res;
        if (currentWorkflowId) {
          res = await fetch(
            `${API_BASE}/api/workflows/${currentWorkflowId}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          );
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
      } catch (err) {
        console.error("Auto-save after delete failed", err);
      }
    })();
  };

  // Add/Delete Approver Row
  const handleAddApproverRow = () => {
    // UI only supports approver 2 & 3 (max 2 rows)
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
                <option key={c.label} value={c.label} >
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
                <Button
                  style={{
                    minWidth: 80,
                    background: "#16a34a",
                    color: "#fff",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                  onClick={saveWorkflow}
                  type="button"
                >
                  Save
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
                      {/* Select user spans full width */}
                      <div className={styles.selectFull}>
                        <label className={styles.label}>Select User</label>
                        <select
                          className={styles.select}
                          value={form.empCode || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const opt = userOptions.find(
                              (o) => o.value === val
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
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* First column */}
                      <div>
                        <InputField
                          label="Name"
                          name="name"
                          value={form.name}
                          onChange={(e: any) =>
                            setForm({ ...form, name: e.target.value })
                          }
                          placeholder="Enter name"
                        />
                        <InputField
                          label="Emp Code"
                          name="empCode"
                          value={form.empCode}
                          onChange={(e: any) =>
                            setForm({ ...form, empCode: e.target.value })
                          }
                          placeholder="Enter emp code"
                        />
                      </div>

                      {/* Second column */}
                      <div>
                        <InputField
                          label="Email ID"
                          name="email"
                          value={form.email}
                          onChange={(e: any) =>
                            setForm({ ...form, email: e.target.value })
                          }
                          placeholder="Enter email"
                          type="email"
                        />
                        <InputField
                          label="Employee_id"
                          name="employee_id"
                          value={(form as any).employee_id || ""}
                          onChange={(e: any) =>
                            setForm({ ...form, employee_id: e.target.value })
                          }
                          placeholder="Enter employee id"
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
