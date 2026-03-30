import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../../components/Common/AppHeader";
import { useAuth } from "../../context/AuthContext";
import styles from "../Plant/AddPlantMaster.module.css";
import { API_BASE } from "../../utils/api";
import ExcelJS from "exceljs";
const XLSX = require("xlsx");

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
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
  application_id?: number;
}

interface Application {
  id: number;
  name: string;
  display_name?: string;
  multiple_role_access?: boolean;
}

interface AppRole {
  role_id: number;
  role_name: string;
  application_id: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants — mirror UserRequestForm exactly
// ─────────────────────────────────────────────────────────────────────────────
const ACCESS_TYPES_ALL = [
  "New User Creation",
  "Modify Access",
  "Password Reset",
  "Account Unlock",
  "Account Unlock and Password Reset",
  "Active / Enable User Access",
  "Deactivation / Disable / Remove User Access",
  "Bulk De-activation",
  "Bulk New User Creation",
];

const ACCESS_TYPES_VENDOR = [
  "New User Creation",
  "Modify Access",
  "Active / Enable User Access",
  "Deactivation / Disable / Remove User Access",
  "Password Reset",
  "Account Unlock",
  "Account Unlock and Password Reset",
];

const ROLE_ENABLED_ACCESS_TYPES = [
  "New User Creation",
  "Modify Access",
  "Bulk New User Creation",
];

const SINGLE_TASK_ACCESS_TYPES = [
  "Password Reset",
  "Account Unlock",
  "Account Unlock and Password Reset",
  "Active / Enable User Access",
];

const REQUEST_FOR_OPTIONS = ["Self", "Others", "Vendor / OEM"];
const USER_REQUEST_TYPE_OPTIONS = ["Permanent", "Temporary"];
const TRAINING_OPTIONS = ["Yes", "No"];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const ImportUserRequest: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── File / UI state ────────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validRecords, setValidRecords] = useState<any[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<ImportRecord[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
    results: any[];
    errors: any[];
  } | null>(null);

  // ── Reference data ─────────────────────────────────────────────────────────
  const [plants, setPlants] = useState<Plant[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allAppRoles, setAllAppRoles] = useState<AppRole[]>([]);

  // ── Preview expanded rows ──────────────────────────────────────────────────
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // ── On mount: fetch all reference data ────────────────────────────────────
  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Fetch plants
      const plantsRes = await fetch(`${API_BASE}/api/plants`, { headers });
      if (plantsRes.ok) setPlants(await plantsRes.json());

      // Fetch all departments (we'll use first plant to get dept list, or a global endpoint)
      const deptsRes = await fetch(`${API_BASE}/api/departments`, { headers });
      if (deptsRes.ok) setAllDepartments(await deptsRes.json());

      // Fetch all roles
      const rolesRes = await fetch(`${API_BASE}/api/roles`, { headers });
      if (rolesRes.ok) setAllRoles(await rolesRes.json());
    } catch (err) {
      console.error("Error fetching reference data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Download Template
  // Mirrors UserRequestForm fields exactly — one row per task.
  // For Bulk New User Creation, multiple rows share the same RITM key.
  // ─────────────────────────────────────────────────────────────────────────
  const downloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();

      // ── Sheet 1: User Request Template ──────────────────────────────────
      const ws = workbook.addWorksheet("User Request Template");
      ws.columns = [
        // Requestor Details
        { header: "request_for_by",              key: "request_for_by",              width: 18 },
        { header: "name",                         key: "name",                         width: 22 },
        { header: "employee_code",               key: "employee_code",               width: 16 },
        { header: "employee_location",           key: "employee_location",           width: 20 },
        { header: "access_request_type",         key: "access_request_type",         width: 36 },
        { header: "training_status",             key: "training_status",             width: 16 },
        { header: "user_request_type",           key: "user_request_type",           width: 18 },
        { header: "from_date",                   key: "from_date",                   width: 14 },
        { header: "to_date",                     key: "to_date",                     width: 14 },
        { header: "approver1_email",             key: "approver1_email",             width: 28 },
        { header: "approver2_email",             key: "approver2_email",             width: 28 },
        { header: "remarks",                     key: "remarks",                     width: 30 },
        { header: "request_raised_by",           key: "request_raised_by",           width: 22 },
        { header: "request_raised_by_emp_code",  key: "request_raised_by_emp_code",  width: 24 },
        // Vendor fields (only for Vendor / OEM)
        { header: "vendor_name",                 key: "vendor_name",                 width: 22 },
        { header: "vendor_firm",                 key: "vendor_firm",                 width: 22 },
        { header: "vendor_code",                 key: "vendor_code",                 width: 16 },
        { header: "vendor_allocated_id",         key: "vendor_allocated_id",         width: 20 },
        // Access / Task fields (one task per row; Bulk rows share same requestor columns)
        { header: "plant_location_id",           key: "plant_location_id",           width: 36 },
        { header: "department_id",               key: "department_id",               width: 36 },
        { header: "application_equip_id",        key: "application_equip_id",        width: 36 },
        { header: "role_id",                     key: "role_id",                     width: 36 },
        { header: "reports_to",                  key: "reports_to",                  width: 24 },
        // Closure fields (used by importGrantTasks backend — optional for standard import)
        { header: "assignment_group",            key: "assignment_group",            width: 22 },
        { header: "allocated_id",                key: "allocated_id",                width: 18 },
        { header: "role_granted",                key: "role_granted",                width: 24 },
      ];

      // Style header row
      ws.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1569B0" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFB0C4DE" } },
        };
      });
      ws.getRow(1).height = 32;

      // Sample row — New User Creation (Self)
      const samplePlant = plants[0];
      const sampleDept  = allDepartments[0];
      const sampleRole  = allRoles[0];

      ws.addRow({
        request_for_by:             "Self",
        name:                       "John Doe",
        employee_code:              "EMP001",
        employee_location:          "Mumbai",
        access_request_type:        "New User Creation",
        training_status:            "Yes",
        user_request_type:          "Permanent",
        from_date:                  "",
        to_date:                    "",
        approver1_email:            "manager@company.com",
        approver2_email:            "",
        remarks:                    "New joiner access",
        request_raised_by:          user?.name || "Admin",
        request_raised_by_emp_code: user?.employee_code || "ADMIN01",
        vendor_name:                "",
        vendor_firm:                "",
        vendor_code:                "",
        vendor_allocated_id:        "",
        plant_location_id:          samplePlant ? `${samplePlant.id} - ${samplePlant.plant_name}` : "1 - Plant Name",
        department_id:              sampleDept  ? `${sampleDept.id} - ${sampleDept.department_name}` : "1 - Department",
        application_equip_id:       "5 - Application Name",
        role_id:                    sampleRole  ? `${sampleRole.id} - ${sampleRole.role_name}` : "1 - Role Name",
        reports_to:                 "Manager Name",
        assignment_group:           "",
        allocated_id:               "EMP001",
        role_granted:               "",
      });

      // Sample row — Vendor / OEM
      ws.addRow({
        request_for_by:             "Vendor / OEM",
        name:                       "Vendor Contact",
        employee_code:              "",
        employee_location:          "Delhi",
        access_request_type:        "New User Creation",
        training_status:            "No",
        user_request_type:          "Temporary",
        from_date:                  "2024-01-01",
        to_date:                    "2024-12-31",
        approver1_email:            "manager@company.com",
        approver2_email:            "",
        remarks:                    "Vendor access",
        request_raised_by:          user?.name || "Admin",
        request_raised_by_emp_code: user?.employee_code || "ADMIN01",
        vendor_name:                "Vendor Person Name",
        vendor_firm:                "Vendor Firm Ltd",
        vendor_code:                "VND001",
        vendor_allocated_id:        "VALOC001",
        plant_location_id:          samplePlant ? `${samplePlant.id} - ${samplePlant.plant_name}` : "1 - Plant Name",
        department_id:              sampleDept  ? `${sampleDept.id} - ${sampleDept.department_name}` : "1 - Department",
        application_equip_id:       "5 - Application Name",
        role_id:                    sampleRole  ? `${sampleRole.id} - ${sampleRole.role_name}` : "1 - Role Name",
        reports_to:                 "Manager Name",
        assignment_group:           "",
        allocated_id:               "VALOC001",
        role_granted:               "",
      });

      // Style sample rows
      [2, 3].forEach((rn) => {
        ws.getRow(rn).eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F7FF" } };
        });
      });

      // Dropdowns for data rows 4–2000
      const maxRow = 2000;
      for (let i = 4; i <= maxRow; i++) {
        // request_for_by — col A
        ws.getCell(`A${i}`).dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: [`"Self,Others,Vendor / OEM"`],
          showErrorMessage: true,
          errorTitle: "Invalid",
          error: "Select: Self, Others, or Vendor / OEM",
        };
        // access_request_type — col E
        ws.getCell(`E${i}`).dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: [`'Lookup Data'!$A$2:$A$${ACCESS_TYPES_ALL.length + 1}`],
          showErrorMessage: true,
          errorTitle: "Invalid Access Type",
          error: "Select a valid access request type",
        };
        // training_status — col F
        ws.getCell(`F${i}`).dataValidation = {
          type: "list", allowBlank: false,
          formulae: [`"Yes,No"`],
        };
        // user_request_type — col G
        ws.getCell(`G${i}`).dataValidation = {
          type: "list", allowBlank: true,
          formulae: [`"Permanent,Temporary"`],
        };
        // plant_location_id — col S
        if (plants.length > 0) {
          ws.getCell(`S${i}`).dataValidation = {
            type: "list", allowBlank: false,
            formulae: [`'Lookup Data'!$B$2:$B$${plants.length + 1}`],
            showErrorMessage: true,
            errorTitle: "Invalid Plant",
            error: "Select from Lookup Data sheet",
          };
        }
        // department_id — col T
        if (allDepartments.length > 0) {
          ws.getCell(`T${i}`).dataValidation = {
            type: "list", allowBlank: false,
            formulae: [`'Lookup Data'!$C$2:$C$${allDepartments.length + 1}`],
            showErrorMessage: true,
            errorTitle: "Invalid Department",
            error: "Select from Lookup Data sheet",
          };
        }
      }

      // ── Sheet 2: Lookup Data ─────────────────────────────────────────────
      const lookupSheet = workbook.addWorksheet("Lookup Data");
      lookupSheet.columns = [
        { header: "AccessRequestType", key: "access_type", width: 40 },
        { header: "PlantOptions",      key: "plants",      width: 44 },
        { header: "DeptOptions",       key: "depts",       width: 44 },
        { header: "RoleOptions",       key: "roles",       width: 36 },
        { header: "RequestForBy",      key: "req_for",     width: 18 },
        { header: "UserRequestType",   key: "ur_type",     width: 18 },
        { header: "TrainingStatus",    key: "training",    width: 16 },
      ];
      lookupSheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
        cell.alignment = { horizontal: "center" };
      });

      const maxLookup = Math.max(
        ACCESS_TYPES_ALL.length,
        plants.length,
        allDepartments.length,
        allRoles.length,
        REQUEST_FOR_OPTIONS.length,
        USER_REQUEST_TYPE_OPTIONS.length
      );

      for (let i = 0; i < maxLookup; i++) {
        lookupSheet.addRow({
          access_type: ACCESS_TYPES_ALL[i]      || "",
          plants:      plants[i]                ? `${plants[i].id} - ${plants[i].plant_name}` : "",
          depts:       allDepartments[i]        ? `${allDepartments[i].id} - ${allDepartments[i].department_name}` : "",
          roles:       allRoles[i]              ? `${allRoles[i].id} - ${allRoles[i].role_name}` : "",
          req_for:     REQUEST_FOR_OPTIONS[i]   || "",
          ur_type:     USER_REQUEST_TYPE_OPTIONS[i] || "",
          training:    TRAINING_OPTIONS[i]      || "",
        });
      }

      // ── Sheet 3: Field Guide ─────────────────────────────────────────────
      const guideSheet = workbook.addWorksheet("Field Guide");
      guideSheet.columns = [
        { header: "Column",       key: "col",      width: 30 },
        { header: "Required",     key: "req",      width: 12 },
        { header: "Description",  key: "desc",     width: 60 },
        { header: "Example",      key: "example",  width: 34 },
      ];
      guideSheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7B3F00" } };
        cell.alignment = { horizontal: "center" };
      });

      const guide = [
        ["request_for_by",             "YES", "Who the request is for",                         "Self / Others / Vendor / OEM"],
        ["name",                       "YES", "Full name of the person access is for",           "John Doe"],
        ["employee_code",              "YES*","Employee code (*not required for Vendor/OEM)",     "EMP001"],
        ["employee_location",          "NO",  "City / location of the employee",                 "Mumbai"],
        ["access_request_type",        "YES", "Type of access request — see Lookup Data col A",  "New User Creation"],
        ["training_status",            "YES", "Has training been completed?",                    "Yes / No"],
        ["user_request_type",          "NO",  "Permanent or Temporary (Temp needs to/from date)","Permanent"],
        ["from_date",                  "NO",  "Start date for Temporary access (YYYY-MM-DD)",    "2024-01-01"],
        ["to_date",                    "NO",  "End date for Temporary access (YYYY-MM-DD)",       "2024-12-31"],
        ["approver1_email",            "YES", "Email of Approver 1 (Manager)",                  "mgr@company.com"],
        ["approver2_email",            "NO",  "Email of Approver 2 (optional)",                 "dir@company.com"],
        ["remarks",                    "NO",  "Any notes or reason for the request",             "New joiner"],
        ["request_raised_by",          "NO",  "Name of person raising the request",             "HR Admin"],
        ["request_raised_by_emp_code", "NO",  "Employee code of person raising the request",    "ADMIN01"],
        ["vendor_name",                "V",   "Vendor person name (Vendor/OEM only)",            "Vendor Contact"],
        ["vendor_firm",                "V",   "Vendor company name (Vendor/OEM only)",           "Vendor Firm Ltd"],
        ["vendor_code",                "V",   "Vendor code (Vendor/OEM only)",                  "VND001"],
        ["vendor_allocated_id",        "V",   "Allocated ID for vendor (Vendor/OEM only)",       "VALOC001"],
        ["plant_location_id",          "YES", "Plant ID — use format from Lookup Data col B",    "2 - Mumbai Plant"],
        ["department_id",              "YES", "Department ID — use format from Lookup Data col C","3 - IT Department"],
        ["application_equip_id",       "YES*","Application/Equipment ID (required for role types)","5 - SAP ERP"],
        ["role_id",                    "YES*","Role ID (required for New/Modify/Bulk). Comma-sep for multiple","7 - Admin, 8 - User"],
        ["reports_to",                 "NO",  "Manager name the user reports to",                "Jane Smith"],
        ["assignment_group",           "NO",  "IT group to assign the task (import only)",       "IT-GRP-MUM"],
        ["allocated_id",               "NO",  "System ID assigned to the user (defaults to employee_code)","EMP001"],
        ["role_granted",               "NO",  "Exact role granted (defaults to role_id name)",   "Admin Role"],
      ];

      guide.forEach(([col, req, desc, example]) => {
        const row = guideSheet.addRow({ col, req, desc, example });
        if (req === "YES") {
          row.getCell("req").font = { bold: true, color: { argb: "FFB91C1C" } };
        } else if (req === "V") {
          row.getCell("req").font = { bold: true, color: { argb: "FF7C3AED" } };
        }
      });
      guideSheet.getColumn("req").alignment = { horizontal: "center" };

      // ── Write file ──────────────────────────────────────────────────────
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "user_request_import_template.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error creating template:", err);
      alert("Error creating template. Please try again.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Parse "ID - Name" helpers (same as ImportApplication)
  // ─────────────────────────────────────────────────────────────────────────
  const parseIdName = (value: any): string => {
    if (!value) return "";
    const str = String(value).trim();
    if (str.includes(" - ")) return str.split(" - ")[0].trim();
    return str;
  };

  const parseRoleIds = (value: any): { ids: string[]; errors: string[] } => {
    if (!value || String(value).trim() === "") return { ids: [], errors: [] };
    const str = String(value);
    let parts: string[];
    if (str.includes(" - ")) {
      parts = str.split(",").map((r) => r.trim().split(" - ")[0].trim());
    } else {
      parts = str.split(",").map((r) => r.trim());
    }
    const errors: string[] = [];
    const ids: string[] = [];
    parts.forEach((p) => {
      if (isNaN(Number(p)) || p === "") {
        errors.push(p);
      } else {
        ids.push(p);
      }
    });
    return { ids, errors };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // validateRecord — mirrors all UserRequestForm validation logic
  // ─────────────────────────────────────────────────────────────────────────
  const validateRecord = (data: any, rowNumber: number): ImportRecord => {
    const errors: ValidationError[] = [];

    // ── Parse ID-Name combos ──────────────────────────────────────────────
    if (data.plant_location_id)   data.plant_location_id   = parseIdName(data.plant_location_id);
    if (data.department_id)       data.department_id       = parseIdName(data.department_id);
    if (data.application_equip_id) data.application_equip_id = parseIdName(data.application_equip_id);

    // ── Parse role_id ─────────────────────────────────────────────────────
    const { ids: roleIds, errors: badRoles } = parseRoleIds(data.role_id);
    if (badRoles.length > 0) {
      errors.push({
        row: rowNumber,
        field: "role_id",
        message: `Invalid role_id values: ${badRoles.join(", ")}. Use comma-separated IDs or "ID - Name" format.`,
        value: data.role_id,
      });
    } else {
      data.role_id = roleIds.join(",");
    }

    // ── Defaults ──────────────────────────────────────────────────────────
    if (!data.training_status)    data.training_status    = "No";
    if (!data.user_request_type)  data.user_request_type  = "";
    if (!data.request_for_by)     data.request_for_by     = "Self";
    if (!data.approver2_email)    data.approver2_email    = "";

    // Normalise access_request_type case
    const normaliseAccessType = (v: string): string => {
      const found = ACCESS_TYPES_ALL.find(
        (t) => t.toLowerCase() === String(v || "").toLowerCase().trim()
      );
      return found || String(v || "").trim();
    };
    data.access_request_type = normaliseAccessType(data.access_request_type);

    const isBulkDeactivation = data.access_request_type === "Bulk De-activation";
    const isBulkNew          = data.access_request_type === "Bulk New User Creation";
    const isVendorOEM        = String(data.request_for_by || "").trim() === "Vendor / OEM";
    const isRoleEnabled      = ROLE_ENABLED_ACCESS_TYPES.includes(data.access_request_type);

    // ── Required: request_for_by ──────────────────────────────────────────
    if (!REQUEST_FOR_OPTIONS.map((o) => o.toLowerCase()).includes(
      String(data.request_for_by || "").toLowerCase().trim()
    )) {
      errors.push({
        row: rowNumber,
        field: "request_for_by",
        message: `Invalid request_for_by. Must be: ${REQUEST_FOR_OPTIONS.join(", ")}`,
        value: data.request_for_by,
      });
    }

    // ── Required: name ────────────────────────────────────────────────────
    if (!data.name || String(data.name).trim() === "") {
      errors.push({ row: rowNumber, field: "name", message: "name is required", value: data.name });
    }

    // ── Required: employee_code (not for Vendor/OEM) ──────────────────────
    if (!isVendorOEM && (!data.employee_code || String(data.employee_code).trim() === "")) {
      errors.push({
        row: rowNumber,
        field: "employee_code",
        message: "employee_code is required for Self/Others requests",
        value: data.employee_code,
      });
    }

    // ── Required: access_request_type ─────────────────────────────────────
    if (!ACCESS_TYPES_ALL.includes(data.access_request_type)) {
      errors.push({
        row: rowNumber,
        field: "access_request_type",
        message: `Invalid access_request_type. Must be one of the values in Lookup Data sheet column A.`,
        value: data.access_request_type,
      });
    }

    // ── Access type available for Vendor/OEM ──────────────────────────────
    if (isVendorOEM && data.access_request_type &&
      !ACCESS_TYPES_VENDOR.includes(data.access_request_type)) {
      errors.push({
        row: rowNumber,
        field: "access_request_type",
        message: `"${data.access_request_type}" is not available for Vendor / OEM requests.`,
        value: data.access_request_type,
      });
    }

    // ── Required: approver1_email (except Bulk De-activation) ─────────────
    if (!isBulkDeactivation && (!data.approver1_email || String(data.approver1_email).trim() === "")) {
      errors.push({
        row: rowNumber,
        field: "approver1_email",
        message: "approver1_email is required",
        value: data.approver1_email,
      });
    }

    // ── Validate approver email format ────────────────────────────────────
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.approver1_email && !emailRx.test(String(data.approver1_email).trim())) {
      errors.push({
        row: rowNumber,
        field: "approver1_email",
        message: "approver1_email must be a valid email address",
        value: data.approver1_email,
      });
    }

    // ── Vendor fields required when Vendor/OEM ────────────────────────────
    if (isVendorOEM) {
      if (!data.vendor_name || String(data.vendor_name).trim() === "") {
        errors.push({ row: rowNumber, field: "vendor_name", message: "vendor_name is required for Vendor / OEM", value: data.vendor_name });
      }
      if (!data.vendor_firm || String(data.vendor_firm).trim() === "") {
        errors.push({ row: rowNumber, field: "vendor_firm", message: "vendor_firm is required for Vendor / OEM", value: data.vendor_firm });
      }
    }

    // ── Required: plant + department (always) ─────────────────────────────
    if (!data.plant_location_id || String(data.plant_location_id).trim() === "" || isNaN(Number(data.plant_location_id))) {
      errors.push({ row: rowNumber, field: "plant_location_id", message: "plant_location_id is required and must be a valid numeric ID", value: data.plant_location_id });
    } else if (plants.length > 0 && !plants.some((p) => p.id === Number(data.plant_location_id))) {
      errors.push({ row: rowNumber, field: "plant_location_id", message: "plant_location_id does not match any known plant — check Lookup Data sheet", value: data.plant_location_id });
    }

    if (!data.department_id || String(data.department_id).trim() === "" || isNaN(Number(data.department_id))) {
      errors.push({ row: rowNumber, field: "department_id", message: "department_id is required and must be a valid numeric ID", value: data.department_id });
    } else if (allDepartments.length > 0 && !allDepartments.some((d) => d.id === Number(data.department_id))) {
      errors.push({ row: rowNumber, field: "department_id", message: "department_id does not match any known department — check Lookup Data sheet", value: data.department_id });
    }

    // ── application_equip_id — required for role-enabled types ────────────
    if (!isBulkDeactivation && isRoleEnabled) {
      if (!data.application_equip_id || String(data.application_equip_id).trim() === "" || isNaN(Number(data.application_equip_id))) {
        errors.push({ row: rowNumber, field: "application_equip_id", message: "application_equip_id is required and must be a valid numeric ID for this access type", value: data.application_equip_id });
      }
    }

    // ── role_id — required for role-enabled types (max 2) ─────────────────
    if (!isBulkDeactivation && isRoleEnabled) {
      if (roleIds.length === 0) {
        errors.push({ row: rowNumber, field: "role_id", message: "role_id is required for this access type", value: data.role_id });
      } else if (roleIds.length > 2) {
        errors.push({ row: rowNumber, field: "role_id", message: "Maximum 2 roles allowed per task row", value: data.role_id });
      }
    }

    // ── Temporary user: to_date required ─────────────────────────────────
    if (data.user_request_type === "Temporary") {
      if (!data.to_date || String(data.to_date).trim() === "") {
        errors.push({ row: rowNumber, field: "to_date", message: "to_date is required for Temporary user type", value: data.to_date });
      } else {
        const today = new Date().toISOString().split("T")[0];
        if (String(data.to_date) < today) {
          errors.push({ row: rowNumber, field: "to_date", message: "to_date must not be in the past", value: data.to_date });
        }
      }
    }

    // ── Training: attachment note (informational — no file in Excel) ──────
    if (
      String(data.training_status || "").toLowerCase() === "yes" &&
      (data.access_request_type === "New User Creation" || data.access_request_type === "Bulk New User Creation")
    ) {
      // Cannot upload files via Excel; flag as warning (non-blocking)
      data._training_attachment_warning = true;
    }

    return { rowNumber, data, errors, isValid: errors.length === 0 };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Group rows into UserRequest payloads
  // Rows with matching (employee_code OR vendor_allocated_id) + access_request_type
  // + plant + department + approver1_email are grouped into one user request
  // with multiple tasks (mirrors Bulk New User Creation grouping in the form).
  // ─────────────────────────────────────────────────────────────────────────
  const groupIntoRequests = (records: any[]): any[] => {
    const groups: Map<string, any> = new Map();

    records.forEach((rec) => {
      const key = [
        rec.request_for_by,
        rec.employee_code || rec.vendor_allocated_id || rec.name,
        rec.access_request_type,
        rec.plant_location_id,
        rec.department_id,
        rec.approver1_email,
      ].join("|");

      if (!groups.has(key)) {
        groups.set(key, {
          // Requestor
          request_for_by:             rec.request_for_by,
          name:                       rec.name,
          employee_code:              rec.employee_code || null,
          employee_location:          rec.employee_location || null,
          access_request_type:        rec.access_request_type,
          training_status:            rec.training_status || "No",
          user_request_type:          rec.user_request_type || null,
          from_date:                  rec.from_date || null,
          to_date:                    rec.to_date || null,
          approver1_email:            rec.approver1_email || "",
          approver2_email:            rec.approver2_email || "",
          remarks:                    rec.remarks || null,
          request_raised_by:          rec.request_raised_by || null,
          request_raised_by_emp_code: rec.request_raised_by_emp_code || null,
          vendor_name:                rec.vendor_name || null,
          vendor_firm:                rec.vendor_firm || null,
          vendor_code:                rec.vendor_code || null,
          vendor_allocated_id:        rec.vendor_allocated_id || null,
          tasks: [],
          _warnings: [],
        });
      }

      const group = groups.get(key)!;

      // Add training warning
      if (rec._training_attachment_warning) {
        group._warnings.push("Training attachment cannot be uploaded via Excel import. Please attach separately after import.");
      }

      // Build task (Grant only — mirrors form logic)
      const isBulkDeact = rec.access_request_type === "Bulk De-activation";
      if (!isBulkDeact && rec.application_equip_id) {
        const roleIds = rec.role_id
          ? String(rec.role_id).split(",").map((r: string) => r.trim()).filter(Boolean)
          : [];

        const isSingleTask = SINGLE_TASK_ACCESS_TYPES.includes(rec.access_request_type);

        if (isSingleTask) {
          if (roleIds.length > 0) {
            group.tasks.push({
              application_equip_id: Number(rec.application_equip_id),
              department:           Number(rec.department_id),
              role:                 Number(roleIds[0]),
              location:             Number(rec.plant_location_id),
              reports_to:           rec.reports_to || null,
              task_action:          "Grant",
              task_status:          "Pending",
              approver1_id:         "",
              approver2_id:         "",
              assignment_group:     rec.assignment_group || null,
              allocated_id:         rec.allocated_id || rec.employee_code || null,
              role_granted:         rec.role_granted || null,
            });
          }
        } else {
          roleIds.forEach((roleId: string) => {
            group.tasks.push({
              application_equip_id: Number(rec.application_equip_id),
              department:           Number(rec.department_id),
              role:                 Number(roleId),
              location:             Number(rec.plant_location_id),
              reports_to:           rec.reports_to || null,
              task_action:          "Grant",
              task_status:          "Pending",
              approver1_id:         "",
              approver2_id:         "",
              assignment_group:     rec.assignment_group || null,
              allocated_id:         rec.allocated_id || rec.employee_code || null,
              role_granted:         rec.role_granted || null,
            });
          });
        }
      }
    });

    return Array.from(groups.values());
  };

  // ─────────────────────────────────────────────────────────────────────────
  // handleFileChange
  // ─────────────────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setShowResults(false);
      setValidRecords([]);
      setInvalidRecords([]);
      setImportResult(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // handleValidate
  // ─────────────────────────────────────────────────────────────────────────
  const handleValidate = async () => {
    if (!file) { alert("Please select a file first"); return; }
    setValidating(true);
    setShowResults(false);
    setImportResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(ws);

      if (jsonData.length === 0) {
        alert("No data rows found in the file.");
        setValidating(false);
        return;
      }

      // Step 1: local validation
      const localValidated: ImportRecord[] = jsonData.map((row, idx) =>
        validateRecord({ ...row }, idx + 2)
      );

      const valid   = localValidated.filter((r) => r.isValid);
      const invalid = localValidated.filter((r) => !r.isValid);

      // Step 2: group valid records into requests for preview
      const grouped = groupIntoRequests(valid.map((r) => r.data));

      setValidRecords(grouped);
      setInvalidRecords(invalid);
      setShowResults(true);
    } catch (err) {
      console.error("Validation error:", err);
      alert("Error validating file. Please check the file format.");
    } finally {
      setValidating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // handleImport — POST to /api/import/grant-tasks
  // ─────────────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (validRecords.length === 0) { alert("No valid records to import"); return; }
    setImporting(true);
    setImportResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/import/grant-tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(validRecords),
      });

      const result = await response.json();

      setImportResult({
        imported: result.imported ?? 0,
        failed:   result.failed   ?? 0,
        results:  result.results  ?? [],
        errors:   result.errors   ?? [],
      });

      if (result.imported > 0 && result.failed === 0) {
        setTimeout(() => navigate("/user-access-management"), 2500);
      }
    } catch (err: any) {
      console.error("Import error:", err);
      alert(`Error: ${err.message || "Import failed. Please try again."}`);
    } finally {
      setImporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────
  const toggleRow = (idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const totalTaskCount = validRecords.reduce((sum, r) => sum + (r.tasks?.length || 0), 0);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Import User Requests" />

      <div className={styles.contentArea}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Import User Requests from Excel</h2>
            <p>Bulk-import user access requests. Each row = one task. Multiple rows with the same requestor + access type are grouped into a single user request.</p>
          </div>

          <div style={{ padding: "24px" }}>

            {/* ── Step 1: Download Template ──────────────────────────────── */}
            <section style={{ marginBottom: 32 }}>
              <h3 style={{ marginBottom: 6 }}>Step 1 — Download Template</h3>
              <button
                className={styles.saveBtn}
                onClick={downloadTemplate}
                disabled={loading || plants.length === 0}
                style={{ marginTop: 10 }}
              >
                {loading ? "Loading reference data…" : "⬇ Download Excel Template"}
              </button>
              {loading && (
                <p style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>
                  Loading plants, departments and roles…
                </p>
              )}
              {!loading && plants.length === 0 && (
                <p style={{ marginTop: 8, color: "#ef4444", fontSize: 13 }}>
                  Unable to load reference data. Please refresh.
                </p>
              )}

              {/* Template guide */}
              <div style={{ marginTop: 14, padding: "14px 18px", background: "#f0f9ff", borderRadius: 8, border: "1px solid #bae6fd", fontSize: 13 }}>
                <strong>Template has 3 sheets:</strong>
                <ul style={{ marginTop: 6, lineHeight: 2 }}>
                  <li><strong>User Request Template</strong> — fill data here. One row per task.</li>
                  <li><strong>Lookup Data</strong> — plant, department, role IDs and allowed dropdown values.</li>
                  <li><strong>Field Guide</strong> — description and examples for every column.</li>
                </ul>
                <div style={{ marginTop: 8, lineHeight: 1.8 }}>
                  <strong>Grouping logic:</strong> Rows with the same <em>employee_code + access_request_type + plant + department + approver1_email</em> are merged into a single user request with multiple tasks (Bulk New User Creation pattern).
                  <br />
                  <strong>Training attachment:</strong> Cannot be uploaded via Excel. Upload the PDF separately after import via the User Request form.
                  <br />
                  <strong>Modify Access / Revoke:</strong> This importer creates <strong>Grant-only</strong> tasks (auto-approved and auto-closed). For Modify/Revoke workflows, use the standard form.
                </div>
              </div>
            </section>

            {/* ── Step 2: Upload File ────────────────────────────────────── */}
            <section style={{ marginBottom: 32 }}>
              <h3 style={{ marginBottom: 6 }}>Step 2 — Upload File</h3>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ marginTop: 10 }}
              />
              {file && (
                <p style={{ marginTop: 8, color: "#16a34a", fontSize: 13 }}>
                  ✔ Selected: <strong>{file.name}</strong>
                </p>
              )}
            </section>

            {/* ── Step 3: Validate ───────────────────────────────────────── */}
            <section style={{ marginBottom: 32 }}>
              <h3 style={{ marginBottom: 6 }}>Step 3 — Validate Data</h3>
              <button
                className={styles.saveBtn}
                onClick={handleValidate}
                disabled={!file || validating}
                style={{ marginTop: 10 }}
              >
                {validating ? "Validating…" : "Validate File"}
              </button>
              {validating && (
                <p style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>
                  Running field, format and reference-data checks…
                </p>
              )}
            </section>

            {/* ── Validation Results ─────────────────────────────────────── */}
            {showResults && (
              <section style={{ marginBottom: 32 }}>
                <h3 style={{ marginBottom: 12 }}>Validation Results</h3>

                {/* Summary cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                  <div style={{ padding: 18, background: "#f0fdf4", borderRadius: 8, border: "1px solid #22c55e" }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#15803d" }}>{validRecords.length}</div>
                    <div style={{ fontSize: 13, color: "#166534", marginTop: 2 }}>Valid User Requests</div>
                  </div>
                  <div style={{ padding: 18, background: "#f0f9ff", borderRadius: 8, border: "1px solid #38bdf8" }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#0369a1" }}>{totalTaskCount}</div>
                    <div style={{ fontSize: 13, color: "#075985", marginTop: 2 }}>Total Tasks (Grant)</div>
                  </div>
                  <div style={{ padding: 18, background: invalidRecords.length > 0 ? "#fef2f2" : "#f0fdf4", borderRadius: 8, border: `1px solid ${invalidRecords.length > 0 ? "#ef4444" : "#22c55e"}` }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: invalidRecords.length > 0 ? "#dc2626" : "#15803d" }}>{invalidRecords.length}</div>
                    <div style={{ fontSize: 13, color: invalidRecords.length > 0 ? "#991b1b" : "#166534", marginTop: 2 }}>Invalid Rows (fix & re-upload)</div>
                  </div>
                </div>

                {/* Invalid records table */}
                {invalidRecords.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ color: "#dc2626", marginBottom: 8 }}>❌ Validation Errors</h4>
                    <div style={{ maxHeight: 300, overflow: "auto", border: "1px solid #fca5a5", borderRadius: 8 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead style={{ background: "#fef2f2", position: "sticky", top: 0 }}>
                          <tr>
                            {["Row", "Field", "Error Message", "Your Value"].map((h) => (
                              <th key={h} style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #fca5a5", fontWeight: 600 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {invalidRecords.flatMap((record) =>
                            record.errors.map((err, idx) => (
                              <tr key={`${record.rowNumber}-${idx}`} style={{ borderBottom: "1px solid #fee2e2" }}>
                                <td style={{ padding: "10px 12px", fontWeight: 600 }}>Row {err.row}</td>
                                <td style={{ padding: "10px 12px", color: "#9a3412", fontFamily: "monospace" }}>{err.field}</td>
                                <td style={{ padding: "10px 12px", color: "#dc2626" }}>{err.message}</td>
                                <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 11, color: "#6b7280" }}>{String(err.value ?? "—")}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Valid records preview */}
                {validRecords.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ color: "#15803d", marginBottom: 8 }}>✔ Valid Requests Preview</h4>
                    <div style={{ maxHeight: 400, overflow: "auto", border: "1px solid #bbf7d0", borderRadius: 8 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead style={{ background: "#f0fdf4", position: "sticky", top: 0 }}>
                          <tr>
                            {["#", "Name", "Employee Code", "Request Type", "Access Type", "Approver 1", "Tasks", "Warnings", ""].map((h) => (
                              <th key={h} style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #bbf7d0", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {validRecords.map((req, idx) => (
                            <React.Fragment key={idx}>
                              <tr style={{ borderBottom: "1px solid #dcfce7", background: expandedRows.has(idx) ? "#f0fdf4" : undefined }}>
                                <td style={{ padding: "10px 12px", color: "#6b7280" }}>{idx + 1}</td>
                                <td style={{ padding: "10px 12px", fontWeight: 500 }}>{req.name}</td>
                                <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>{req.employee_code || req.vendor_allocated_id || "—"}</td>
                                <td style={{ padding: "10px 12px" }}>{req.request_for_by}</td>
                                <td style={{ padding: "10px 12px" }}>
                                  <span style={{ padding: "2px 8px", background: "#dbeafe", color: "#1e40af", borderRadius: 12, fontSize: 11, fontWeight: 500 }}>
                                    {req.access_request_type}
                                  </span>
                                </td>
                                <td style={{ padding: "10px 12px", fontSize: 12, color: "#374151" }}>{req.approver1_email}</td>
                                <td style={{ padding: "10px 12px" }}>
                                  <span style={{ padding: "2px 8px", background: "#e0f2fe", color: "#0369a1", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                                    {req.tasks?.length || 0} task{(req.tasks?.length || 0) !== 1 ? "s" : ""}
                                  </span>
                                </td>
                                <td style={{ padding: "10px 12px" }}>
                                  {req._warnings?.length > 0 && (
                                    <span style={{ color: "#d97706", fontSize: 12 }}>⚠ {req._warnings.length}</span>
                                  )}
                                </td>
                                <td style={{ padding: "10px 12px" }}>
                                  {req.tasks?.length > 0 && (
                                    <button
                                      onClick={() => toggleRow(idx)}
                                      style={{ fontSize: 12, color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                                    >
                                      {expandedRows.has(idx) ? "Hide tasks ▲" : "View tasks ▼"}
                                    </button>
                                  )}
                                </td>
                              </tr>

                              {/* Task detail rows */}
                              {expandedRows.has(idx) && req.tasks?.map((task: any, tIdx: number) => (
                                <tr key={`task-${idx}-${tIdx}`} style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                                  <td style={{ padding: "8px 12px 8px 28px", color: "#9ca3af" }} colSpan={2}>
                                    ↳ Task {tIdx + 1}
                                  </td>
                                  <td style={{ padding: "8px 12px", fontSize: 12 }}>App ID: <strong>{task.application_equip_id}</strong></td>
                                  <td style={{ padding: "8px 12px", fontSize: 12 }}>Dept: <strong>{task.department}</strong></td>
                                  <td style={{ padding: "8px 12px", fontSize: 12 }}>Role: <strong>{task.role}</strong></td>
                                  <td style={{ padding: "8px 12px", fontSize: 12 }}>Plant: <strong>{task.location}</strong></td>
                                  <td colSpan={3} style={{ padding: "8px 12px" }}>
                                    <span style={{ padding: "2px 8px", background: "#d1fae5", color: "#065f46", borderRadius: 12, fontSize: 11 }}>
                                      {task.task_action}
                                    </span>
                                  </td>
                                </tr>
                              ))}

                              {/* Warnings */}
                              {expandedRows.has(idx) && req._warnings?.length > 0 && (
                                <tr style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a" }}>
                                  <td colSpan={9} style={{ padding: "8px 28px", fontSize: 12, color: "#92400e" }}>
                                    ⚠ {req._warnings.join(" | ")}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Step 4: Import */}
                {validRecords.length > 0 && !importResult && (
                  <section>
                    <h3 style={{ marginBottom: 6 }}>Step 4 — Import Valid Records</h3>
                    <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
                      {validRecords.length} user request{validRecords.length !== 1 ? "s" : ""} with {totalTaskCount} Grant task{totalTaskCount !== 1 ? "s" : ""} will be auto-approved, closed and inserted into the access log.
                    </p>
                    <button
                      className={styles.saveBtn}
                      onClick={handleImport}
                      disabled={importing}
                    >
                      {importing ? "Importing…" : `Import ${validRecords.length} Request${validRecords.length !== 1 ? "s" : ""}`}
                    </button>
                  </section>
                )}
              </section>
            )}

            {/* ── Import Result ──────────────────────────────────────────── */}
            {importResult && (
              <section style={{ marginBottom: 32 }}>
                <h3 style={{ marginBottom: 12 }}>Import Result</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div style={{ padding: 18, background: "#f0fdf4", borderRadius: 8, border: "1px solid #22c55e" }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "#15803d" }}>✔ {importResult.imported}</div>
                    <div style={{ fontSize: 13, color: "#166534" }}>Successfully imported</div>
                  </div>
                  <div style={{ padding: 18, background: importResult.failed > 0 ? "#fef2f2" : "#f0fdf4", borderRadius: 8, border: `1px solid ${importResult.failed > 0 ? "#ef4444" : "#22c55e"}` }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: importResult.failed > 0 ? "#dc2626" : "#15803d" }}>{importResult.failed > 0 ? "✗" : "✔"} {importResult.failed}</div>
                    <div style={{ fontSize: 13, color: importResult.failed > 0 ? "#991b1b" : "#166534" }}>Failed</div>
                  </div>
                </div>

                {/* Success transaction IDs */}
                {importResult.results.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ color: "#15803d", marginBottom: 8 }}>✔ Imported Transactions</h4>
                    <div style={{ maxHeight: 200, overflow: "auto", border: "1px solid #bbf7d0", borderRadius: 8 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead style={{ background: "#f0fdf4", position: "sticky", top: 0 }}>
                          <tr>
                            {["Row", "Transaction ID", "User Request ID", "Tasks Closed"].map((h) => (
                              <th key={h} style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #bbf7d0" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.results.map((r, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #dcfce7" }}>
                              <td style={{ padding: "10px 12px" }}>Row {r.row}</td>
                              <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#0369a1" }}>{r.transaction_id}</td>
                              <td style={{ padding: "10px 12px" }}>{r.user_request_id}</td>
                              <td style={{ padding: "10px 12px" }}>{r.tasks_closed}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Failed rows */}
                {importResult.errors.length > 0 && (
                  <div>
                    <h4 style={{ color: "#dc2626", marginBottom: 8 }}>❌ Failed Rows</h4>
                    <div style={{ maxHeight: 200, overflow: "auto", border: "1px solid #fca5a5", borderRadius: 8 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead style={{ background: "#fef2f2", position: "sticky", top: 0 }}>
                          <tr>
                            {["Row", "Error"].map((h) => (
                              <th key={h} style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #fca5a5" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.errors.map((e, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #fee2e2" }}>
                              <td style={{ padding: "10px 12px" }}>Row {e.row}</td>
                              <td style={{ padding: "10px 12px", color: "#dc2626" }}>{e.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {importResult.imported > 0 && importResult.failed === 0 && (
                  <p style={{ marginTop: 14, color: "#15803d", fontSize: 13 }}>
                    ✔ All records imported. Redirecting to User Access Management…
                  </p>
                )}
              </section>
            )}

            {/* Cancel */}
            <div style={{ marginTop: 16 }}>
              <button
                className={styles.cancelBtn}
                onClick={() => navigate("/user-access-management")}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportUserRequest;