import React, { useState } from "react";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import ProfileIconWithLogout from "../PlantMasterTable/ProfileIconWithLogout";
import styles from "./WorkflowBuilder.module.css";
import Button from "../../components/Common/Button";
import InputField from "../../components/Common/InputField";

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

const plantOptions = ["GOA-1", "GOA-2", "GOA-3", "Gaziabad"];
const corporateOptions = [
  { label: "Corporate - Administration", maxApprovers: 1 },
  { label: "Corporate - Application (SAP)", maxApprovers: 5 },
  { label: "Corporate - Application (ZingHR)", maxApprovers: 5 },
];

type Approver = { name: string; empCode: string; email: string };
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
  const [form, setForm] = useState({ name: "", empCode: "", email: "" });

  // Helper to check if a user is empty
  const isEmptyUser = (user: Approver) =>
    !user.name && !user.empCode && !user.email;

  // Handle selection change
  const handlePlantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setPlant(value);
    setCorporate("");
    setApproverRows([
      {
        users:
          defaultApprovers[value][0] && defaultApprovers[value][0].name
            ? [defaultApprovers[value][0]]
            : [],
      },
      {
        users:
          defaultApprovers[value][1] && defaultApprovers[value][1].name
            ? [defaultApprovers[value][1]]
            : [],
      },
      {
        users:
          defaultApprovers[value][2] && defaultApprovers[value][2].name
            ? [defaultApprovers[value][2]]
            : [],
      },
    ]);
    setEditRowIndex(null);
    setEditUserIndex(null);
    setForm({ name: "", empCode: "", email: "" });
  };

  const handleCorporateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCorporate(value);
    setPlant("");
    const max =
      corporateOptions.find((c) => c.label === value)?.maxApprovers || 1;
    setApproverRows(
      Array.from({ length: max }, (_, i) => ({
        users:
          defaultApprovers[value][i] && defaultApprovers[value][i].name
            ? [defaultApprovers[value][i]]
            : [],
      }))
    );
    setEditRowIndex(null);
    setEditUserIndex(null);
    setForm({ name: "", empCode: "", email: "" });
  };

  // Add/Edit/Delete user within an approver row
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddUser = (rowIdx: number) => {
    // Prevent adding empty user
    if (isEmptyUser(form)) return;

    setApproverRows((prev) => {
      const updated = [...prev];
      // Prevent duplicate user (by empCode)
      if (
        updated[rowIdx].users.some(
          (u) =>
            u.empCode.trim().toLowerCase() === form.empCode.trim().toLowerCase()
        )
      ) {
        return prev;
      }
      updated[rowIdx].users = [...updated[rowIdx].users, { ...form }];
      return updated;
    });
    setForm({ name: "", empCode: "", email: "" });
    setEditRowIndex(null);
    setEditUserIndex(null);
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
      setForm({ name: "", empCode: "", email: "" });
    }
  };

  const handleDeleteUser = (rowIdx: number, userIdx: number) => {
    setApproverRows((prev) => {
      const updated = [...prev];
      updated[rowIdx].users = updated[rowIdx].users.filter(
        (_: any, i: number) => i !== userIdx
      );
      return updated;
    });
    setEditRowIndex(null);
    setEditUserIndex(null);
    setForm({ name: "", empCode: "", email: "" });
  };

  // Add/Delete Approver Row
  const handleAddApproverRow = () => {
    let maxRows = 5;
    if (plant) maxRows = 5;
    if (corporate) {
      maxRows =
        corporateOptions.find((c) => c.label === corporate)?.maxApprovers || 5;
    }
    if (approverRows.length < maxRows) {
      setApproverRows((prev) => [...prev, { users: [] }]);
    }
  };

  const handleDeleteApproverRow = (rowIdx: number) => {
    setApproverRows((prev) => prev.filter((_: any, i: number) => i !== rowIdx));
    setEditRowIndex(null);
    setEditUserIndex(null);
    setForm({ name: "", empCode: "", email: "" });
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
              {plantOptions.map((p) => (
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
            <div className={styles.approverListWrap}>
              {approverRows.map((row, rowIdx) => (
                <div key={rowIdx} className={styles.approverCard}>
                  <div className={styles.approverCardHeader}>
                    <span className={styles.approverCardTitle}>{`Approver ${
                      rowIdx + 1
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
                          {u.name} ({u.empCode}) - {u.email}
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
                          setForm({ name: "", empCode: "", email: "" });
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
                      <InputField
                        label="Name"
                        name="name"
                        value={form.name}
                        onChange={handleInputChange}
                        placeholder="Enter name"
                      />
                      <InputField
                        label="Emp Code"
                        name="empCode"
                        value={form.empCode}
                        onChange={handleInputChange}
                        placeholder="Enter emp code"
                      />
                      <InputField
                        label="Email ID"
                        name="email"
                        value={form.email}
                        onChange={handleInputChange}
                        placeholder="Enter email"
                        type="email"
                      />
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
                            setForm({ name: "", empCode: "", email: "" });
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
