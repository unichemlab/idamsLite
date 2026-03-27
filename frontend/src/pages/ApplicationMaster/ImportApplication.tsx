import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../../components/Common/AppHeader";
import { useAuth } from "../../context/AuthContext";
import styles from "../Plant/AddPlantMaster.module.css";
import { API_BASE } from "../../utils/api";
import ExcelJS from "exceljs";
const XLSX = require("xlsx");

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

interface ImportRecord {
  rowNumber: number;
  data: any;
  errors: ValidationError[];
  isValid: boolean;
}

interface Plant {
  id: number;
  plant_name: string;
}

interface Department {
  id: number;
  department_name: string;
}

interface Role {
  id: number;
  role_name: string;
}

interface SystemRow {
  id: number;
  equipment_instrument_id: string;
  host_name: string;
  plant_id?: number;
  department_id?: number;
}

interface ServerRow {
  id: number;
  application: string;
  host_name: string;
  plant_id?: number;
  department_id?: number;
}

const ImportApplication: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validRecords, setValidRecords] = useState<any[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<ImportRecord[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [systems, setSystems] = useState<SystemRow[]>([]);
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Required fields — matches addApplication backend exactly ──────────────
  const requiredFields = [
    "plant_location_id",
    "department_id",
    "application_hmi_name",
    "application_hmi_version",
    "equipment_instrument_id",
    "role_id",
  ];

  // ── Valid dropdown options — MUST match AddApplicationFormPage exactly ────
  const validOptions: Record<string, string[]> = {
    application_hmi_type: ["Application", "HMI"],       // ← fixed (was Web-Based/Desktop/Mobile)
    status: ["ACTIVE", "INACTIVE"],
    multiple_role_access: ["true", "false", "yes", "no", "1", "0"],
    role_lock: ["true", "false", "yes", "no", "1", "0"],
  };

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [plantsRes, deptsRes, rolesRes, systemsRes, serversRes] = await Promise.all([
        fetch(`${API_BASE}/api/plants`, { headers }),
        fetch(`${API_BASE}/api/departments`, { headers }),
        fetch(`${API_BASE}/api/roles`, { headers }),
        fetch(`${API_BASE}/api/systems/list`, { headers }),
        fetch(`${API_BASE}/api/servers/list`, { headers }),
      ]);

      if (plantsRes.ok)   setPlants(await plantsRes.json());
      if (deptsRes.ok)    setDepartments(await deptsRes.json());
      if (rolesRes.ok)    setRoles(await rolesRes.json());
      if (systemsRes.ok)  setSystems(await systemsRes.json());
      if (serversRes.ok)  setServers(await serversRes.json());
    } catch (error) {
      console.error("Error fetching reference data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setShowResults(false);
      setValidRecords([]);
      setInvalidRecords([]);
    }
  };

  // ── Download Template ──────────────────────────────────────────────────────
  const downloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();

      // ── Sheet 1: Application Template ─────────────────────────────────────
      const ws = workbook.addWorksheet("Application Template");
      ws.columns = [
        { header: "plant_location_id",      key: "plant_location_id",      width: 38 },
        { header: "department_id",           key: "department_id",           width: 38 },
        { header: "application_hmi_name",   key: "application_hmi_name",   width: 25 },
        { header: "application_hmi_version",key: "application_hmi_version",width: 22 },
         { header: "application_hmi_type",   key: "application_hmi_type",   width: 20 },
        { header: "equipment_instrument_id",key: "equipment_instrument_id",width: 25 },
        { header: "system_name",            key: "system_name",            width: 25 },
        { header: "system_inventory_id",    key: "system_inventory_id",    width: 20 },
        { header: "role_id",                key: "role_id",                width: 30 },
        { header: "multiple_role_access",   key: "multiple_role_access",   width: 20 },
        { header: "role_lock",              key: "role_lock",              width: 15 },
        { header: "status",                 key: "status",                 width: 12 },
      ];

      // Style header row
      ws.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1569B0" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      // Sample data row
      ws.addRow({
        plant_location_id:      plants.length > 0 ? `${plants[0].id} - ${plants[0].plant_name}` : "",
        department_id:          departments.length > 0 ? `${departments[0].id} - ${departments[0].department_name}` : "",
        application_hmi_name:   "SAP ERP",
        application_hmi_version:"v1.0",
         application_hmi_type:   "Application",
        equipment_instrument_id: systems.length > 0 ? systems[0].equipment_instrument_id : "EQP-001",
        system_name:            systems.length > 0 ? systems[0].host_name : "",
        system_inventory_id:    systems.length > 0 ? String(systems[0].id) : "",
        role_id:                roles.length >= 2 ? `${roles[0].id} - ${roles[0].role_name}, ${roles[1].id} - ${roles[1].role_name}` : roles.length === 1 ? `${roles[0].id} - ${roles[0].role_name}` : "1",
        
        multiple_role_access:   "false",
        role_lock:              "false",
        status:                 "ACTIVE",
      });

      // Dropdowns for data rows 2–1000
      const maxDataRow = 1000;
      for (let i = 2; i <= maxDataRow; i++) {
        // Plant dropdown
        if (plants.length > 0) {
          ws.getCell(`A${i}`).dataValidation = {
            type: "list",
            allowBlank: false,
            formulae: [`'Lookup Data'!$A$2:$A$${plants.length + 1}`],
            showErrorMessage: true,
            errorTitle: "Invalid Plant",
            error: "Please select a plant from the dropdown",
          };
        }
        // Department dropdown
        if (departments.length > 0) {
          ws.getCell(`B${i}`).dataValidation = {
            type: "list",
            allowBlank: false,
            formulae: [`'Lookup Data'!$B$2:$B$${departments.length + 1}`],
            showErrorMessage: true,
            errorTitle: "Invalid Department",
            error: "Please select a department from the dropdown",
          };
        }
        // Application/HMI Type dropdown
        ws.getCell(`E${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`'Lookup Data'!$D$2:$D$3`],
        };
        // Multiple Role Access dropdown
        ws.getCell(`J${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`'Lookup Data'!$E$2:$E$3`],
        };
        // Role Lock dropdown
        ws.getCell(`K${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`'Lookup Data'!$F$2:$F$3`],
        };
        // Status dropdown
        ws.getCell(`L${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`'Lookup Data'!$G$2:$G$3`],
        };
      }

      // ── Sheet 2: Lookup Data ───────────────────────────────────────────────
      const lookupSheet = workbook.addWorksheet("Lookup Data");
      lookupSheet.columns = [
        { header: "PlantOptions",  key: "plants",  width: 42 },
        { header: "DeptOptions",   key: "depts",   width: 42 },
        { header: "RoleOptions",   key: "roles",   width: 32 },
        { header: "HMIType",       key: "hmi",     width: 16 },
        { header: "RoleAccess",    key: "access",  width: 14 },
        { header: "RoleLock",      key: "lock",    width: 14 },
        { header: "Status",        key: "status",  width: 12 },
      ];
      lookupSheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
      });

      const maxLookup = Math.max(plants.length, departments.length, roles.length, 2);
      for (let i = 0; i < maxLookup; i++) {
        lookupSheet.addRow({
          plants: plants[i]      ? `${plants[i].id} - ${plants[i].plant_name}` : "",
          depts:  departments[i] ? `${departments[i].id} - ${departments[i].department_name}` : "",
          roles:  roles[i]       ? `${roles[i].id} - ${roles[i].role_name}` : "",
          hmi:    i === 0 ? "Application" : i === 1 ? "HMI" : "",
          access: i === 0 ? "true" : i === 1 ? "false" : "",
          lock:   i === 0 ? "true" : i === 1 ? "false" : "",
          status: i === 0 ? "ACTIVE" : i === 1 ? "INACTIVE" : "",
        });
      }

      // ── Sheet 3: System & Server Inventory ────────────────────────────────
      // Lists all systems and servers so users can look up equipment IDs and
      // system_name / system_inventory_id for the template.
      const inventorySheet = workbook.addWorksheet("System & Server Inventory");
      inventorySheet.columns = [
        { header: "Type",                   key: "type",       width: 14 },
        { header: "equipment_instrument_id",key: "equip_id",   width: 28 },
        { header: "host_name",              key: "host_name",  width: 28 },
        { header: "system_inventory_id",    key: "inv_id",     width: 22 },
        { header: "plant_id",               key: "plant_id",   width: 12 },
        { header: "plant_name",             key: "plant_name", width: 30 },
        { header: "department_id",          key: "dept_id",    width: 16 },
        { header: "application_name",       key: "app_name",   width: 30 },
      ];
      inventorySheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E7A3A" } };
      });

      // Add systems
      systems.forEach((sys) => {
        const plant = plants.find((p) => p.id === sys.plant_id);
        inventorySheet.addRow({
          type:       "System",
          equip_id:   sys.equipment_instrument_id,
          host_name:  sys.host_name,
          inv_id:     String(sys.id),
          plant_id:   sys.plant_id ?? "",
          plant_name: plant?.plant_name ?? "",
          dept_id:    sys.department_id ?? "",
          app_name:   "",
        });
      });

      // Add servers
      servers.forEach((srv) => {
        const plant = plants.find((p) => p.id === srv.plant_id);
        inventorySheet.addRow({
          type:       "Server",
          equip_id:   String(srv.id),            // for servers, value = server id
          host_name:  srv.host_name,
          inv_id:     "",
          plant_id:   srv.plant_id ?? "",
          plant_name: plant?.plant_name ?? "",
          dept_id:    srv.department_id ?? "",
          app_name:   srv.application,
        });
      });

      // ── Write file ─────────────────────────────────────────────────────────
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "application_import_template.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error creating template:", error);
      alert("Error creating template. Please try again.");
    }
  };

  // ── validateRecord — all local validations (no API calls here) ─────────────
  const validateRecord = (data: any, rowNumber: number): ImportRecord => {
    const errors: ValidationError[] = [];

    // ── Parse "ID - Name" format for plant and department ────────────────────
    if (typeof data.plant_location_id === "string" && data.plant_location_id.includes(" - ")) {
      data.plant_location_id = data.plant_location_id.split(" - ")[0].trim();
    }
    if (typeof data.department_id === "string" && data.department_id.includes(" - ")) {
      data.department_id = data.department_id.split(" - ")[0].trim();
    }

    // ── Parse role_id: "ID - Name, ID - Name" or "1,2,3" → "1,2,3" ─────────
    if (data.role_id && data.role_id !== "") {
      const roleString = String(data.role_id);
      let roleIds: string[];

      if (roleString.includes(" - ")) {
        roleIds = roleString.split(",").map((r: string) => r.trim().split(" - ")[0].trim());
      } else {
        roleIds = roleString.split(",").map((r: string) => r.trim());
      }

      const invalidRoles = roleIds.filter((r: string) => isNaN(Number(r)) || r === "");
      if (invalidRoles.length > 0) {
        errors.push({
          row: rowNumber,
          field: "role_id",
          message: 'role_id must be comma-separated numbers or "ID - Name" format (e.g., "1,2,3" or "1 - Admin, 2 - User")',
          value: data.role_id,
        });
      } else {
        // Validate each role ID exists in the fetched roles list
        if (roles.length > 0) {
          const unknownRoles = roleIds.filter(
            (rid: string) => !roles.some((r) => r.id === Number(rid))
          );
          if (unknownRoles.length > 0) {
            errors.push({
              row: rowNumber,
              field: "role_id",
              message: `Unknown role ID(s): ${unknownRoles.join(", ")}. Must be valid IDs from the Lookup Data sheet.`,
              value: data.role_id,
            });
          }
        }
        data.role_id = roleIds.join(",");
      }
    }

    // ── Auto-generate display_name if missing ─────────────────────────────────
    if (!data.display_name || data.display_name === "") {
      const name    = String(data.application_hmi_name    || "").trim();
      const version = String(data.application_hmi_version || "").trim();
      const equip   = String(data.equipment_instrument_id || "").trim();
      if (name || version || equip) {
        data.display_name = `${name} | ${version} | ${equip}`;
      }
    }

    // ── Required fields ───────────────────────────────────────────────────────
    requiredFields.forEach((field) => {
      if (!data[field] || String(data[field]).trim() === "") {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} is required`,
          value: data[field],
        });
      }
    });

    // ── Validate plant_location_id exists ─────────────────────────────────────
    if (data.plant_location_id && plants.length > 0) {
      const exists = plants.some((p) => p.id === Number(data.plant_location_id));
      if (!exists) {
        errors.push({
          row: rowNumber,
          field: "plant_location_id",
          message: "Invalid plant_location_id — must match a Plant ID from the Lookup Data sheet",
          value: data.plant_location_id,
        });
      }
    }

    // ── Validate department_id exists ─────────────────────────────────────────
    if (data.department_id && departments.length > 0) {
      const exists = departments.some((d) => d.id === Number(data.department_id));
      if (!exists) {
        errors.push({
          row: rowNumber,
          field: "department_id",
          message: "Invalid department_id — must match a Department ID from the Lookup Data sheet",
          value: data.department_id,
        });
      }
    }

    // ── Validate numeric fields ───────────────────────────────────────────────
    const numericFields = ["plant_location_id", "department_id", "system_inventory_id"];
    numericFields.forEach((field) => {
      if (data[field] && String(data[field]).trim() !== "" && isNaN(Number(data[field]))) {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} must be a number`,
          value: data[field],
        });
      }
    });

    // ── Validate dropdown options ─────────────────────────────────────────────
    Object.keys(validOptions).forEach((field) => {
      if (data[field] && String(data[field]).trim() !== "") {
        const val = String(data[field]).toLowerCase().trim();
        if (!validOptions[field].map((v) => v.toLowerCase()).includes(val)) {
          errors.push({
            row: rowNumber,
            field,
            message: `Invalid value for ${field}. Must be one of: ${validOptions[field].join(", ")}`,
            value: data[field],
          });
        }
      }
    });

    // ── Default values for optional fields ───────────────────────────────────
    if (!data.application_hmi_type) data.application_hmi_type = "Application";
    if (!data.status)               data.status = "ACTIVE";
    if (!data.multiple_role_access) data.multiple_role_access = "false";
    if (!data.role_lock)            data.role_lock = "false";

    return {
      rowNumber,
      data,
      errors,
      isValid: errors.length === 0,
    };
  };

  // ── handleValidate — runs local validation + API duplicate check ───────────
  const handleValidate = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    setValidating(true);
    setShowResults(false);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        alert("No data rows found in the file.");
        setValidating(false);
        return;
      }

      // ── Step 1: Local validations ─────────────────────────────────────────
      const localValidated: ImportRecord[] = jsonData.map((row, index) =>
        validateRecord({ ...row }, index + 2)
      );

      // ── Step 2: API duplicate check for locally-valid records ─────────────
      // Each locally-valid row is checked against /check-duplicate.
      // This matches exactly what addApplication and editApplication do.
      const token = localStorage.getItem("token");
      const finalRecords: ImportRecord[] = await Promise.all(
        localValidated.map(async (record) => {
          if (!record.isValid) return record; // already invalid — skip API call

          try {
            const checkRes = await fetch(`${API_BASE}/api/applications/check-duplicate`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                plant_location_id:      record.data.plant_location_id,
                department_id:          record.data.department_id,
                application_hmi_type:   record.data.application_hmi_type,
                equipment_instrument_id:record.data.equipment_instrument_id,
              }),
            });

            if (checkRes.status === 409) {
              const errData = await checkRes.json();
              return {
                ...record,
                isValid: false,
                errors: [
                  ...record.errors,
                  {
                    row: record.rowNumber,
                    field: "combination",
                    message: errData.error || "Duplicate combination: same Plant + Department + Type + Equipment ID already exists",
                    value: `Plant:${record.data.plant_location_id} Dept:${record.data.department_id} Type:${record.data.application_hmi_type} Equip:${record.data.equipment_instrument_id}`,
                  },
                ],
              };
            }
          } catch (err) {
            console.warn(`Row ${record.rowNumber}: duplicate check failed (network), proceeding`, err);
            // Network error on duplicate check — treat as a warning, not a block
          }

          return record;
        })
      );

      const valid   = finalRecords.filter((r) => r.isValid);
      const invalid = finalRecords.filter((r) => !r.isValid);

      setValidRecords(valid.map((r) => r.data));
      setInvalidRecords(invalid);
      setShowResults(true);
    } catch (error) {
      console.error("Validation error:", error);
      alert("Error validating file. Please check the file format.");
    } finally {
      setValidating(false);
    }
  };

  // ── handleImport ───────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (validRecords.length === 0) {
      alert("No valid records to import");
      return;
    }

    setImporting(true);
    try {
      const response = await fetch(`${API_BASE}/api/applications/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          records: validRecords,
          requestedBy: user?.id,
          requestedByUsername: user?.username,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Import failed");
      }

      const result = await response.json();
      alert(
        `Import successful!\n${result.successfulImports ?? validRecords.length} record(s) submitted for approval.` +
        (result.failedImports > 0 ? `\n${result.failedImports} record(s) failed.` : "")
      );
      navigate("/application-masters");
    } catch (error: any) {
      console.error("Import error:", error);
      alert(`Error importing records: ${error.message || "Please try again."}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Import Applications" />

      <div className={styles.contentArea}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Import Applications from Excel</h2>
            <p>Upload an Excel file to bulk import application records</p>
          </div>

          <div style={{ padding: "20px" }}>
            {/* Step 1 */}
            <div style={{ marginBottom: "30px" }}>
              <h3>Step 1: Download Template</h3>
              <button
                className={styles.saveBtn}
                onClick={downloadTemplate}
                disabled={loading || plants.length === 0 || departments.length === 0 || roles.length === 0}
                style={{ marginTop: "10px" }}
              >
                {loading ? "Loading..." : "Download Excel Template"}
              </button>

              {loading && (
                <p style={{ marginTop: "10px", color: "#6b7280" }}>
                  Loading plants, departments, roles and inventory…
                </p>
              )}
              {!loading && (plants.length === 0 || departments.length === 0 || roles.length === 0) && (
                <p style={{ marginTop: "10px", color: "#ef4444" }}>
                  Unable to load reference data. Please refresh the page.
                </p>
              )}

              <div style={{ marginTop: "10px", padding: "12px 16px", background: "#f0f9ff", borderRadius: "6px", fontSize: 14 }}>
                <strong>Template Guide:</strong>
                <ul style={{ marginTop: "6px", lineHeight: "1.8" }}>
                  <li><strong>plant_location_id</strong> — select from dropdown (ID - Name format)</li>
                  <li><strong>department_id</strong> — select from dropdown (ID - Name format)</li>
                  <li><strong>application_hmi_name</strong> — required text field</li>
                  <li><strong>application_hmi_version</strong> — required text field</li>
                  <li><strong>equipment_instrument_id</strong> — required; use IDs from the <em>System &amp; Server Inventory</em> sheet</li>
                  <li><strong>application_hmi_type</strong> — <code>Application</code> or <code>HMI</code></li>
                  <li><strong>display_name</strong> — auto-generated if left blank (Name | Version | EquipID)</li>
                  <li><strong>role_id</strong> — required; comma-separated IDs or "ID - Name" from Lookup Data sheet (e.g., <code>1 - Admin, 2 - User</code>)</li>
                  <li><strong>system_name</strong> — hostname from System &amp; Server Inventory sheet</li>
                  <li><strong>system_inventory_id</strong> — system_inventory_id from System &amp; Server Inventory sheet</li>
                  <li><strong>multiple_role_access</strong> — <code>true</code> or <code>false</code></li>
                  <li><strong>role_lock</strong> — <code>true</code> or <code>false</code></li>
                  <li><strong>status</strong> — <code>ACTIVE</code> or <code>INACTIVE</code> (defaults to ACTIVE)</li>
                </ul>
                <p style={{ marginTop: "8px", fontStyle: "italic", color: "#374151" }}>
                  ✓ See the <strong>System &amp; Server Inventory</strong> sheet for all equipment IDs, hostnames, and inventory IDs.<br />
                  ✓ See the <strong>Lookup Data</strong> sheet for plant, department, and role options.<br />
                  ✓ Validation runs a duplicate check against the database before import.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ marginBottom: "30px" }}>
              <h3>Step 2: Upload File</h3>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ marginTop: "10px" }}
              />
              {file && <p style={{ marginTop: "10px", color: "#22c55e" }}>Selected: {file.name}</p>}
            </div>

            {/* Step 3 */}
            <div style={{ marginBottom: "30px" }}>
              <h3>Step 3: Validate Data</h3>
              <button
                className={styles.saveBtn}
                onClick={handleValidate}
                disabled={!file || validating}
                style={{ marginTop: "10px" }}
              >
                {validating ? "Validating…" : "Validate File"}
              </button>
              {validating && (
                <p style={{ marginTop: "8px", color: "#6b7280", fontSize: 13 }}>
                  Running local validations and duplicate checks…
                </p>
              )}
            </div>

            {/* Results */}
            {showResults && (
              <div style={{ marginBottom: "30px" }}>
                <h3>Validation Results</h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" }}>
                  <div style={{ padding: "20px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #22c55e" }}>
                    <h4 style={{ color: "#22c55e", margin: "0 0 6px 0" }}>✓ Valid Records: {validRecords.length}</h4>
                    <p style={{ margin: 0, fontSize: 13, color: "#166534" }}>
                      Ready to import after approval.
                    </p>
                  </div>
                  <div style={{ padding: "20px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #ef4444" }}>
                    <h4 style={{ color: "#ef4444", margin: "0 0 6px 0" }}>✗ Invalid Records: {invalidRecords.length}</h4>
                    <p style={{ margin: 0, fontSize: 13, color: "#991b1b" }}>
                      Fix errors below and re-validate.
                    </p>
                  </div>
                </div>

                {invalidRecords.length > 0 && (
                  <div style={{ marginTop: "20px" }}>
                    <h4>Validation Errors:</h4>
                    <div
                      style={{
                        maxHeight: "340px",
                        overflow: "auto",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        marginTop: "10px",
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead style={{ background: "#f9fafb", position: "sticky", top: 0 }}>
                          <tr>
                            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Row</th>
                            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Field</th>
                            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Error</th>
                            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invalidRecords.flatMap((record) =>
                            record.errors.map((error, idx) => (
                              <tr
                                key={`${record.rowNumber}-${idx}`}
                                style={{ borderBottom: "1px solid #f3f4f6" }}
                              >
                                <td style={{ padding: "12px" }}>{error.row}</td>
                                <td style={{ padding: "12px", fontWeight: 500 }}>{error.field}</td>
                                <td style={{ padding: "12px", color: "#ef4444" }}>{error.message}</td>
                                <td style={{ padding: "12px", fontFamily: "monospace", fontSize: 12 }}>
                                  {String(error.value ?? "")}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {validRecords.length > 0 && (
                  <div style={{ marginTop: "30px" }}>
                    <h3>Step 4: Import Valid Records</h3>
                    <button
                      className={styles.saveBtn}
                      onClick={handleImport}
                      disabled={importing}
                      style={{ marginTop: "10px" }}
                    >
                      {importing ? "Importing…" : `Import ${validRecords.length} Record(s)`}
                    </button>
                    <p style={{ marginTop: "10px", fontSize: "14px", color: "#6b7280" }}>
                      Records will be submitted for approval before being added to the system.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: "30px" }}>
              <button className={styles.cancelBtn} onClick={() => navigate("/application-masters")}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportApplication;