import React, { useEffect, useState } from "react";
import styles from "./WorkflowBuilder.module.css";
import { useUserContext } from "../../context/UserContext";
import { fetchPlants } from "../../utils/api";
import Select, { components, MultiValue } from "react-select";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
// CircularProgress removed from UI when plant details are hidden
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloseIcon from "@mui/icons-material/Close";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

type UserOption = {
  value: string;
  label: string;
  user: any;
  isDisabled?: boolean;
};

type ApproverRow = {
  users: UserOption[];
  isVisible: boolean;
};

// UI will represent approver levels starting from approver_2 (skip approver_1)
// Backend has approver_1..approver_5; so UI supports approver_2..approver_5 (4 levels)
const MAX_APPROVERS = 4;
const MAX_USERS_PER_GROUP = 20;
const MAX_VISIBLE_BADGES = 2;

const getInitialApproverRows = (): ApproverRow[] =>
  Array.from({ length: MAX_APPROVERS }).map((_, i) => ({
    users: [],
    isVisible: i === 0,
  }));

const getAbbreviation = (name = "") => {
  if (!name) return "--";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const WorkflowBuilder: React.FC = () => {
  const { users } = useUserContext();
  const [plants, setPlants] = useState<any[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [approverRows, setApproverRows] = useState<ApproverRow[]>(
    getInitialApproverRows()
  );
  const [workflowType, setWorkflowType] = useState<"PLANT" | "CORPORATE">(
    "PLANT"
  );
  const [selectedPlantId, setSelectedPlantId] = useState<string>("");
  const [selectedCorporate, setSelectedCorporate] = useState<string>("");
  const [userModal, setUserModal] = useState<{
    rowIndex: number;
    users: UserOption[];
  } | null>(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<number | null>(
    null
  );
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  // we only set workflow helper data (not read directly) so keep setter to avoid removing logic
  const [, setCurrentWorkflowData] = useState<any>(null);

  // Build userOptions from the user context (normalize various id fields)
  useEffect(() => {
    setUserOptions(
      Array.isArray(users)
        ? users.map((u: any) => ({
            value: String(
              u.id ?? u.user_id ?? u.employee_id ?? u.employee_code ?? ""
            ),
            label: `${u.employee_name || u.fullName || u.name || ""} ${
              u.employee_code ? `| ${u.employee_code}` : ""
            }`.trim(),
            user: u,
          }))
        : []
    );
  }, [users]);

  // Load plants
  useEffect(() => {
    fetchPlants()
      .then((data) =>
        setPlants(
          Array.isArray(data)
            ? data.map((p: any) => ({
                id: p.id,
                plant_name: p.plant_name || p.name || String(p.id),
                details: p,
              }))
            : []
        )
      )
      .catch(() => setPlants([]));
  }, []);

  // When a plant is selected, fetch existing workflow for that plant and populate UI rows.
  useEffect(() => {
    const loadWorkflowForPlant = async () => {
      if (!selectedPlantId) {
        setApproverRows(getInitialApproverRows());
        setCurrentWorkflowId(null);
        setCurrentWorkflowData(null);
        return;
      }

      try {
        setLoadingWorkflow(true);
        const res = await fetch(
          `${API_BASE}/api/workflows?plant_id=${selectedPlantId}`
        );
        if (!res.ok) {
          setApproverRows(getInitialApproverRows());
          setCurrentWorkflowId(null);
          setCurrentWorkflowData(null);
          setLoadingWorkflow(false);
          return;
        }

        const data = await res.json().catch(() => ({}));
        // backend may return { workflows: [...] } or { workflow: {...} }
        let wf: any = null;
        if (Array.isArray(data.workflows) && data.workflows.length) {
          wf = data.workflows[0];
        } else if (data.workflow) {
          wf = data.workflow;
        }

        if (!wf) {
          setApproverRows(getInitialApproverRows());
          setCurrentWorkflowId(null);
          setCurrentWorkflowData(null);
          setLoadingWorkflow(false);
          return;
        }

        // Build rows mapping approver_2..approver_5
        const rows: ApproverRow[] = getInitialApproverRows();

        // helper: try to match a CSV id string to userOptions using multiple possible user id fields
        const matchUserById = (idStr: string) => {
          const norm = String(idStr).trim();
          if (!norm) return null;
          // direct match on option.value
          const direct = userOptions.find((u) => String(u.value) === norm);
          if (direct) return direct;
          // try matching common fields inside original user object
          return (
            userOptions.find((u) => {
              const uu = u.user || {};
              const candidates = [
                uu.id,
                uu.user_id,
                uu.employee_id,
                uu.employee_code,
                uu.employee_number,
                uu.emp_id,
              ]
                .filter(Boolean)
                .map((v: any) => String(v));
              return candidates.includes(norm);
            }) || null
          );
        };

        let hasAnyApprover = false;

        // Prefer backend-provided `approvers` array (it includes user objects when available).
        // workflows.approvers is an array of arrays: [approver_1_arr, approver_2_arr, ...]
        if (wf.approvers && Array.isArray(wf.approvers)) {
          for (let i = 0; i < MAX_APPROVERS; i++) {
            // UI row i corresponds to approver_(i+2)
            const backendIndex = i + 1; // approvers[1] -> approver_2
            const list = wf.approvers[backendIndex] || [];
            const opts: UserOption[] = list.map((u: any) => {
              const val = String(
                u.id ?? u.employee_code ?? u.employee_id ?? u.id ?? ""
              );
              return {
                value: val,
                label: `${u.employee_name || u.fullName || ""} ${
                  u.employee_code ? `| ${u.employee_code}` : ""
                }`.trim(),
                user: u,
              } as UserOption;
            });
            if (opts.length) hasAnyApprover = true;
            rows[i] = {
              isVisible: opts.length > 0 ? true : rows[i].isVisible,
              users: opts,
            };
          }
        } else {
          // Fallback to CSV fields (older backend shape)
          for (let i = 0; i < MAX_APPROVERS; i++) {
            const fieldIndex = i + 2; // 2..5
            const key = `approver_${fieldIndex}_id`;
            const csv = wf[key];
            if (csv && typeof csv === "string") {
              const ids = csv
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean);
              const opts: UserOption[] = ids
                .map(
                  (id) =>
                    matchUserById(id) || {
                      value: id,
                      label: `Unknown user (${id})`,
                      user: { employee_name: `Unknown (${id})`, id },
                    }
                )
                .filter(Boolean) as UserOption[];
              if (opts.length) hasAnyApprover = true;
              rows[i] = {
                isVisible: opts.length > 0 ? true : rows[i].isVisible,
                users: opts,
              };
            } else {
              rows[i] = { isVisible: rows[i].isVisible, users: [] };
            }
          }
        }

        setApproverRows(rows);
        // include a helper flag so the UI can show a hint when workflow exists but no approvers configured
        setCurrentWorkflowData({ ...(wf || {}), hasAnyApprover });
        // set id for update operations (try several fields)
        if (wf && (wf.id || wf.workflow_id || wf._id)) {
          setCurrentWorkflowId(wf.id ?? wf.workflow_id ?? wf._id ?? null);
        } else {
          setCurrentWorkflowId(null);
        }
        setLoadingWorkflow(false);
      } catch (err) {
        setLoadingWorkflow(false);
        console.warn("loadWorkflowForPlant", err);
      }
    };

    loadWorkflowForPlant();
    // note: depends on selectedPlantId, userOptions, plants
  }, [selectedPlantId, userOptions, plants]);

  const selectWorkflowType = (type: "PLANT" | "CORPORATE") => {
    setWorkflowType(type);
    setSelectedPlantId("");
    setSelectedCorporate("");
    setApproverRows(getInitialApproverRows());
    setCurrentWorkflowId(null);
    setCurrentWorkflowData(null);
  };

  const handleApproverChange = (
    rowIndex: number,
    selected: MultiValue<UserOption>
  ) => {
    const arr = Array.isArray(selected) ? (selected as UserOption[]) : [];
    if (arr.length > MAX_USERS_PER_GROUP) return;
    setApproverRows((prev) =>
      prev.map((r, i) => (i === rowIndex ? { ...r, users: arr } : r))
    );
  };

  const handleAddLevel = () => {
    const next = approverRows.findIndex((r) => !r.isVisible);
    if (next === -1) return;
    setApproverRows((prev) =>
      prev.map((r, i) => (i === next ? { ...r, isVisible: true } : r))
    );
  };

  const handleRemoveLevel = (index: number) => {
    setApproverRows((prev) =>
      prev.map((r, i) => (i === index ? { users: [], isVisible: false } : r))
    );
  };

  const openUserModal = (rowIndex: number) => {
    setUserModal({ rowIndex, users: approverRows[rowIndex].users });
  };

  const closeUserModal = () => setUserModal(null);

  const saveWorkflow = async () => {
    const payload: any = {
      transaction_id: `APPR${String(Date.now()).slice(-10)}`,
      workflow_type: workflowType,
      plant_id:
        workflowType === "PLANT" && selectedPlantId
          ? Number(selectedPlantId)
          : null,
      department_id: null,
      approver_1_id: null,
      approver_2_id: null,
      approver_3_id: null,
      approver_4_id: null,
      approver_5_id: null,
      max_approvers: approverRows.filter((r) => r.isVisible).length,
      is_active: true,
    };

    // Map UI rows (UI idx 0 -> approver_2) back to backend CSV fields
    approverRows.forEach((r, idx) => {
      const backendIndex = idx + 2;
      const key = `approver_${backendIndex}_id`;
      if (r.isVisible && r.users.length) {
        payload[key] = r.users.map((u) => u.value).join(",");
      } else {
        payload[key] = null;
      }
    });

    try {
      const url = currentWorkflowId
        ? `${API_BASE}/api/workflows/${currentWorkflowId}`
        : `${API_BASE}/api/workflows`;
      const res = await fetch(url, {
        method: currentWorkflowId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Save failed");
      }
      const saved = await res.json().catch(() => null);
      if (saved && saved.id) setCurrentWorkflowId(saved.id);
      alert("Workflow saved successfully");
    } catch (err) {
      alert("Failed to save workflow: " + (err as Error).message);
    }
  };

  const canAddMoreLevels = approverRows.some((r) => !r.isVisible);

  // react-select portal target to avoid clipping inside scroll containers
  const portalTarget =
    typeof document !== "undefined"
      ? (document.body as HTMLElement)
      : undefined;

  // Build a map of assigned userId -> approver level (2..5) so we can annotate and disable options
  const assignedMap: Map<string, number> = new Map();
  approverRows.forEach((r, idx) => {
    if (r.users && r.users.length) {
      const level = idx + 2;
      r.users.forEach((u) => assignedMap.set(String(u.value), level));
    }
  });

  const getOptionsForRow = (rowIdx: number) =>
    userOptions.map((u) => {
      const assignedLevel = assignedMap.get(String(u.value));
      const isAssignedElsewhere =
        !!assignedLevel && assignedLevel !== rowIdx + 2;
      return {
        ...u,
        label: assignedLevel
          ? `${u.label} (Assigned L${assignedLevel})`
          : u.label,
        isDisabled: isAssignedElsewhere,
      } as UserOption;
    });

  // Custom multi-value label to show initials instead of full name in the selected chips
  const MultiValueLabel = (props: any) => {
    const data: UserOption = props.data;
    const name =
      data.user?.employee_name || data.user?.fullName || data.label || "";
    const abbrev = getAbbreviation(name);
    return (
      <components.MultiValueLabel {...props}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              background: "#e3f2fd",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "#174ea6",
              fontWeight: 700,
            }}
            title={name}
          >
            {abbrev}
          </div>
        </div>
      </components.MultiValueLabel>
    );
  };

  // Previously we showed a hint when a saved workflow existed but had no approvers.
  // That UI was removed per design request; keep currentWorkflowData for logic but do not render a hint here.

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Workflow Builder</h2>
      </header>

      {/* Scrollable content area */}
      <div className={styles.content}>
        {/* Workflow type cards */}
        <div className={styles.cardRow}>
          <Card
            className={`${styles.workflowTypeCard} ${
              workflowType === "PLANT" ? styles.selected : ""
            }`}
            onClick={() => selectWorkflowType("PLANT")}
          >
            <CardContent>
              <Typography variant="h6">Plant Workflow</Typography>
              <Typography variant="body2" color="textSecondary">
                Configure approvals for plant-level requests
              </Typography>
            </CardContent>
          </Card>

          <Card
            className={`${styles.workflowTypeCard} ${
              workflowType === "CORPORATE" ? styles.selected : ""
            }`}
            onClick={() => selectWorkflowType("CORPORATE")}
          >
            <CardContent>
              <Typography variant="h6">Corporate Workflow</Typography>
              <Typography variant="body2" color="textSecondary">
                Configure approvals for corporate-level requests
              </Typography>
            </CardContent>
          </Card>
        </div>

        {/* Details / plant selector */}
        <div className={styles.detailsCard}>
          <Card>
            <CardContent>
              {workflowType === "PLANT" && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    Select Plant
                  </Typography>

                  <Select
                    options={plants.map((p) => ({
                      value: String(p.id),
                      label: p.plant_name,
                    }))}
                    value={
                      selectedPlantId
                        ? {
                            value: selectedPlantId,
                            label:
                              plants.find(
                                (p) => String(p.id) === selectedPlantId
                              )?.plant_name || "",
                          }
                        : null
                    }
                    onChange={(opt) =>
                      setSelectedPlantId(opt ? String(opt.value) : "")
                    }
                    placeholder="Select plant"
                    className={styles.selectPlant}
                    isClearable
                    isSearchable
                    menuPortalTarget={portalTarget}
                    menuPosition="fixed"
                  />

                  {/* plant details intentionally hidden (cleaner UI) */}
                </>
              )}

              {workflowType === "CORPORATE" && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    Select Corporate
                  </Typography>

                  <Select
                    options={[
                      {
                        value: "Administration",
                        label: "Corporate - Administration",
                      },
                      { value: "SAP", label: "Corporate - Application (SAP)" },
                      {
                        value: "IT Support",
                        label: "Corporate - Application (IT Support)",
                      },
                    ]}
                    value={
                      selectedCorporate
                        ? { value: selectedCorporate, label: selectedCorporate }
                        : null
                    }
                    onChange={(opt) =>
                      setSelectedCorporate(opt ? String(opt.value) : "")
                    }
                    placeholder="Select corporate"
                    className={styles.selectPlant}
                    isClearable
                    isSearchable
                    menuPortalTarget={portalTarget}
                    menuPosition="fixed"
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Approver levels */}
        <div className={styles.approverLevelsRow}>
          {approverRows.map((row, idx) =>
            row.isVisible ? (
              <Card key={idx} className={styles.approverCard}>
                <CardContent>
                  <div className={styles.approverCardHeader}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <Chip label={`Step ${idx + 1}`} size="small" />
                      <Typography variant="subtitle2">
                        Approver Level {idx + 2}
                      </Typography>
                    </div>

                    <Tooltip title="Remove this approver level">
                      <Button
                        size="small"
                        onClick={() => handleRemoveLevel(idx)}
                        variant="outlined"
                        color="inherit"
                      >
                        Remove
                      </Button>
                    </Tooltip>
                  </div>

                  <Select
                    isMulti
                    options={getOptionsForRow(idx)}
                    value={row.users}
                    onChange={(sel) => handleApproverChange(idx, sel)}
                    placeholder={`Search and add approvers for Level ${
                      idx + 2
                    } (max ${MAX_USERS_PER_GROUP})`}
                    classNamePrefix="react-select"
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    isSearchable={true}
                    menuPortalTarget={portalTarget}
                    menuPosition="fixed"
                    noOptionsMessage={() => "No users found"}
                    components={{ MultiValueLabel }}
                    isOptionDisabled={(opt: any) => !!opt.isDisabled}
                  />

                  {userOptions.length === 0 && (
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      style={{ marginTop: 8, display: "block" }}
                    >
                      No users available. Please add users in User Management or
                      refresh after users are added.
                    </Typography>
                  )}

                  <div className={styles.badgesWrap}>
                    {row.users.slice(0, MAX_VISIBLE_BADGES).map((opt, i) => {
                      const name =
                        opt.user?.employee_name ||
                        opt.user?.fullName ||
                        opt.label ||
                        "";
                      return (
                        <Tooltip key={i} title={name}>
                          <div className={styles.userBadge}>
                            <div className={styles.badgeAbbrev}>
                              {getAbbreviation(name)}
                            </div>
                          </div>
                        </Tooltip>
                      );
                    })}

                    {row.users.length > MAX_VISIBLE_BADGES && (
                      <button
                        className={styles.moreBtn}
                        onClick={() => openUserModal(idx)}
                        type="button"
                      >
                        +{row.users.length - MAX_VISIBLE_BADGES} more
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null
          )}

          <div className={styles.addApproverBtnWrap}>
            <IconButton
              size="medium"
              title="Add Approver Level"
              onClick={handleAddLevel}
              disabled={!canAddMoreLevels || userOptions.length === 0}
              color="primary"
            >
              <AddCircleOutlineIcon />
            </IconButton>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actionsRow}>
          <Button
            variant="contained"
            color="primary"
            onClick={saveWorkflow}
            disabled={
              loadingWorkflow ||
              !approverRows.some((r) => r.isVisible && r.users.length > 0)
            }
          >
            Save Workflow
          </Button>
        </div>
      </div>

      {/* Approvers modal */}
      <Dialog
        open={!!userModal}
        onClose={closeUserModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Approvers
          <IconButton
            aria-label="close"
            onClick={closeUserModal}
            style={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small" aria-label="approvers-table">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Employee Code</TableCell>
                  <TableCell>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {userModal?.users.map((u, i) => (
                  <TableRow key={i}>
                    <TableCell component="th" scope="row">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            background: "#1976d2",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 600,
                          }}
                        >
                          {getAbbreviation(
                            u.user.employee_name || u.user.fullName
                          )}
                        </div>
                        <div>
                          <Typography variant="subtitle2">
                            {u.user.employee_name || u.user.fullName}
                          </Typography>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.user.employee_code || u.user.employee_id || "-"}
                    </TableCell>
                    <TableCell>{u.user.email || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeUserModal}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default WorkflowBuilder;
