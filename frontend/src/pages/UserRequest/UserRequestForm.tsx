import React, { useState, useRef, useEffect } from "react";
import Select, { SingleValue, MultiValue } from "react-select";
import { useNavigate } from "react-router-dom";
import { useUserRequestContext, UserRequest, TaskRequest, Manager, BulkDeactivationLog } from "./UserRequestContext";
import { FiChevronDown, FiLogOut } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { fetchPlants, fetchVendors, fetchAccessLogsForFirm } from "../../utils/api";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import addUserRequestStyles from "./AddUserRequest.module.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import styles from "../../pages/HomePage/homepageUser.module.css";
import AppMenu from "../../components/AppMenu";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
export const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:4000";

type RoleOption = {
  value: string;
  label: string;
};
type BulkRow = {
  location: string;
  department: string;
  applicationId: string;
  role: string[];
};
const AddUserRequest: React.FC = () => {
  const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
  const [showUserMenu, setShowUserMenu] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const ROLE_ENABLED_ACCESS_TYPES = ["New User Creation", "Modify Access", "Bulk New User Creation",];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const { addUserRequest, fetchBulkDeactivationLogs } = useUserRequestContext();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // ===================== Bulk Deactivation State =====================
  const [bulkDeactivationLogs, setBulkDeactivationLogs] = useState<BulkDeactivationLog[]>([]);
  const [loadingBulkLogs, setLoadingBulkLogs] = useState(false);

  // ===================== Filter + Search State =====================
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filter, setFilter] = useState({
    plant_location: "",
    department: "",
    applicationId: "", // ← add this
    employeeCode: "",
    transactionId: "",
  });

  const [filterResults, setFilterResults] = useState<UserRequest[]>([]);
  const [userrequests, setUserRequests] = useState<UserRequest[]>([]);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  // extra state for the filter modal
  const [filterApplications, setFilterApplications] = useState<
    { id: string; name: string }[]
  >([]);
  const [filterRoles, setFilterRoles] = useState<
    { id: number; name: string }[]
  >([]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<TaskRequest[]>([]);
  const [vendorAccessLogs, setVendorAccessLogs] = useState<any[]>([]);
  const [selectedAccessLog, setSelectedAccessLog] = useState<any>(null);
  // ── Access-log role lookup status (non-New / non-Bulk access types) ──
  const [accessLogRoleLoaded, setAccessLogRoleLoaded] = useState(false); // true once the fetch settles
  const [accessLogRoleFound,  setAccessLogRoleFound]  = useState(false); // true only when a role was returned
  // ── Modify Access: duplicate-role banner (same role already active) ──
  const [duplicateRoleError, setDuplicateRoleError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  
  // ===================== Main Form State =====================
  const [form, setForm] = useState<UserRequest>({
    request_for_by: "Self",
    name: user?.name || "",
    employeeCode: user?.employee_code || "",
    location: user?.location || "",
    plant_location: "",
    accessType: "",
    applicationId: "",
    department: "",
    role: [] as string[],
    reportsTo: "",
    reportsToOptions: [],
    trainingStatus: "Yes",
    remarks: "",
    approver1_email: "",
    approver2_email: [],
    approver1_status: "Pending",
    approver2_status: "Pending",
    status: "Pending",
    vendorName: [],
    vendorFirm: "",
    vendorCode: "",
    allocatedId: [],
    userRequestType: "" as "Permanent" | "Temporary" | "",
    fromDate: "",
    toDate: "",

  });
  console.log("form data", form);

// ── Auto-clear validation errors when user changes relevant fields ──
  useEffect(() => {
    if (validationError || duplicateRoleError) {
      setValidationError(null);
      setDuplicateRoleError(null);
    }
  }, [
    form.accessType,
    form.plant_location,
    form.department,
    form.applicationId,
    form.role,
    form.employeeCode,
    form.vendorFirm,
    form.allocatedId,
  ]);

  console.log(user);

  const isRoleEnabled = ROLE_ENABLED_ACCESS_TYPES.includes(form.accessType);
  console.log("isRoleEnabled", isRoleEnabled);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([
    {
      location: "",
      department: "",
      applicationId: "",
      role: [],
    },
  ]);

  const [modalTasks, setModalTasks] = useState<TaskRequest[] | null>(null);
  const [plants, setPlants] = useState<{ id: number; plant_name: string }[]>(
    []
  );
  const [vendorFirms, setVendorFirm] = useState<{ id: number; vendor_name: string; vendor_code: string }[]>(
    []
  );
  const vendorFirmOptions = vendorFirms.map(v => ({
    label: v.vendor_name,
    value: v.vendor_name,
    vendorCode: v.vendor_code, // keep code here
  }));
  // State for expandable comments
  const [expandedComments, setExpandedComments] = useState<{
    [key: string]: { a1: boolean; a2: boolean };
  }>({});
  const [departments, setDepartments] = useState<
    { id: number; department_name: string }[]
  >([]);
  const [roles, setRoles] = useState<{ id: number; name: string; }[]>([]);
  const [applications, setApplications] = useState<
    { id: string; name: string; multiple_role_access: boolean; }[]
  >([]);

  const roleOptions: RoleOption[] = roles.map(role => ({
    value: String(role.id),
    label: role.name,
    isDisabled: false,
  }));
  const getUsedRolesForApplication = (appId: string, currentIndex: number) => {
    return bulkRows
      .filter((row, idx) => row.applicationId === appId && idx !== currentIndex)
      .flatMap(row => row.role);
  };
  const buildBulkRoleOptions = (rowIndex: number, appId: string): RoleOption[] => {
    const usedRoles = getUsedRolesForApplication(appId, rowIndex);

    return roles.map(role => {
      const roleId = String(role.id);
      const disabled = usedRoles.includes(roleId);

      return {
        value: roleId,
        label: role.name,
        isDisabled: disabled,
      };
    });
  };
  const handleRoleChange = (
    selected: SingleValue<RoleOption> | MultiValue<RoleOption>,
    setValue: (roles: string[]) => void
  ) => {
    if (!selected) {
      setValue([]);
      return;
    }

    // MULTI SELECT
    if (Array.isArray(selected)) {
      setValue(selected.map((opt) => opt.value));
      return;
    }

    // SINGLE SELECT (TS-safe)
    setValue([(selected as RoleOption).value]);
  };

  const selectedApplication = applications.find(
    app => String(app.id) === String(form.applicationId)
  );

  const isMultipleRoleAllowed = selectedApplication?.multiple_role_access === true;
  useEffect(() => {
    if (
      !isMultipleRoleAllowed &&
      roleOptions.length === 1 &&
      form.role.length === 0
    ) {
      setForm(prev => ({
        ...prev,
        role: [roleOptions[0].value],
      }));
    }
  }, [roleOptions, isMultipleRoleAllowed]);

  useEffect(() => {
    console.log("ROLE:", form.role, "MULTI:", isMultipleRoleAllowed, "Application:", applications);
  }, [form.role, isMultipleRoleAllowed]);

  useEffect(() => {
    if (validationError && errorRef.current) {
      errorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [validationError]);






  // ===================== Helper Functions =====================
  const truncateText = (text: string | undefined, wordLimit: number = 12): string => {
    if (!text) return "----";
    const words = text.split(' ');
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  const getRule1Key = (req: {
    plant_location: string;
    department: string;
    applicationId: string;
  }) => {
    return `${req.plant_location}|${req.department}|${req.applicationId}`;
  };

  const validateAccessRules = async (): Promise<boolean> => {
    setValidationError(null);

    const ruleKey = getRule1Key({
      plant_location: form.plant_location,
      department: form.department,
      applicationId: form.applicationId,
    });

    if (!form.plant_location || !form.department || !form.applicationId) {
      setValidationError("Plant, Department and Application are mandatory");
      return false;
    }

    /* ---------------------------
       1️⃣ CHECK IN-FLIGHT REQUESTS
    ----------------------------*/
    const conflictingInFlight = userrequests.find((req) => {
      if (!req.plant_location || !req.department || !req.applicationId) return false;

      const reqKey = `${req.plant_location}|${req.department}|${req.applicationId}`;

      return (
        reqKey === ruleKey &&
        ["Pending", "Approved"].includes(req.status || "")
      );
    });

    if (conflictingInFlight) {
      if (form.accessType === "New User Creation") {
        setValidationError(
          "Duplicate New User Creation request already exists for the selected access."
        );
        return false;
      } else {
        setValidationError(
          "Another request is already in progress for the selected Plant, Department and Application."
        );
        return false;
      }
    }

    /* ---------------------------
       2️⃣ CHECK ACCESS LOG (BACKEND)
    ----------------------------*/
    try {
      const res = await fetch(
        `/api/access-logs/validate?plant=${form.plant_location}&department=${form.department}&application=${form.applicationId}`
      );

      if (!res.ok) return true; // fail-safe

      const data = await res.json();

      if (data.exists) {
        if (form.accessType === "New User Creation") {
          setValidationError(
            "Access already exists for the selected Plant, Department and Application."
          );
          return false;
        }

        if (data.task_status !== "Closed" && data.task_status !== "Rejected") {
          setValidationError(
            "Access is still active or request is not closed. Modification is not allowed."
          );
          return false;
        }
      }
    } catch (err) {
      console.error("Validation API failed", err);
    }

    return true;
  };


  const toggleComment = (transactionId: string, approver: 'a1' | 'a2') => {
    setExpandedComments(prev => ({
      ...prev,
      [transactionId]: {
        ...prev[transactionId],
        [approver]: !prev[transactionId]?.[approver]
      }
    }));
  };


  // ===================== Form Handlers =====================

  const [reportsToOptions, setReportsToOptions] = useState<string[]>([]);

  const fetchUserByEmployeeCode = async (employeeCode: string) => {
    if (!employeeCode) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/users/users/${employeeCode}`
      );
      if (!res.ok) throw new Error("User not found");

      const data = await res.json();

      // Build Manager[] from strings or partial data
      const mergedManagers: Manager[] = [];

      if (data.reporting_manager?.displayName) {
        mergedManagers.push({
          dn: data.reporting_manager.dn || "",
          email: data.reporting_manager.email || "",
          managerDN: data.reporting_manager.managerDN || "",
          displayName: data.reporting_manager.displayName,
          employeeCode: data.reporting_manager.employeeCode || "",
          sAMAccountName: data.reporting_manager.sAMAccountName || "",
        });
      }

      if (data.managers_manager?.displayName) {
        mergedManagers.push({
          dn: data.managers_manager.dn || "",
          email: data.managers_manager.email || "",
          managerDN: data.managers_manager.managerDN || "",
          displayName: data.managers_manager.displayName,
          employeeCode: data.managers_manager.employeeCode || "",
          sAMAccountName: data.managers_manager.sAMAccountName || "",
        });
      }

      console.log("Merged managers:", mergedManagers);

      setForm((prev) => ({
        ...prev,
        name: data.name || "",
        location: data.location || "",
        department: data.department || "",
        reportsToOptions: mergedManagers,
        reportsTo: mergedManagers[0]?.displayName || "", // default selected
      }));
    } catch (err) {
      console.error(err);
      //alert("No user found with this Employee Code");

      setForm((prev) => ({
        ...prev,
        name: "",
        location: "",
        department: "",
        reportsToOptions: [],
        reportsTo: "",
      }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "request_for_by") {
      if (value === "Self" || value === "Vendor / OEM") {
        // Autofill from logged-in user
        setForm((prev) => ({
          ...prev,
          request_for_by: value as "Self" | "Vendor / OEM",
          name: user?.name || "",
          employeeCode: user?.employee_code || "",
          location: user?.location || "",
        }));
      } else {
        // Clear fields for Others/Vendor
        setForm((prev) => ({
          ...prev,
          request_for_by: value as "Others",
          name: "",
          employeeCode: "",
          location: "",
          department: "",
          reportsTo: "",
          managersManager: "",
        }));
      }
    } else if (name === "employeeCode" && form.request_for_by !== "Self") {
      setForm((prev) => ({ ...prev, employeeCode: value }));
      if (value.length >= 3) fetchUserByEmployeeCode(value); // fetch when code entered
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);

    if (files.length > 1) {
      alert("You can only upload one file.");
      e.target.value = "";
      return;
    }

    if (files[0].size > MAX_FILE_SIZE) {
      alert("The file size must be less than or equal to 4 MB.");
      e.target.value = "";
      return;
    }

    setAttachments(files);
  };

  const handleAddRow = () => {
    if (bulkRows.length < 7) {
      setBulkRows([
        ...bulkRows,
        {
          location: form.plant_location,
          department: form.department,
          applicationId: "",
          role: [],
        },
      ]);
    } else {
      alert("You can only add up to 7 applications.");
    }
  };

  const handleRemoveRow = (index: number) => {
    const updatedRows = [...bulkRows];
    updatedRows.splice(index, 1);
    setBulkRows(updatedRows);
  };

  const handleBulkRowChange = (index: number, field: string, value: string) => {
    const updated = [...bulkRows];
    updated[index] = { ...updated[index], [field]: value };
    setBulkRows(updated);
  };

  // ===================== Filter Handlers =====================
  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  // inside your component
  const handleFilterSearch = async () => {
    const plantId = parseInt(filter.plant_location, 10);
    const departmentId = parseInt(filter.department, 10);
    const applicationId = filter.applicationId
      ? parseInt(filter.applicationId, 10)
      : undefined;

    // Validate numeric fields on frontend
    if (isNaN(plantId) || isNaN(departmentId)) {
      alert("Please enter valid plant and department IDs");
      return;
    }

    const queryParams: Record<string, string> = {
      transactionId: filter.transactionId || "",
      employeeCode: filter.employeeCode || "",
      plant_location: plantId.toString(),
      department: departmentId.toString(),
      applicationId: applicationId ? applicationId.toString() : "",
    };

    // remove empty
    Object.keys(queryParams).forEach((key) => {
      if (!queryParams[key]) delete queryParams[key];
    });

    const query = new URLSearchParams(queryParams).toString();
    console.log("Outgoing query:", query); // Debug

    try {
      const res = await fetch(
        `${API_BASE}/api/user-requests/search?${query}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        console.error("API Error:", errorData);
        alert(errorData.error || "Search failed");
        setFilterResults([]);
        return;
      }

      const data = await res.json();
      console.log("data", data);
      const mappedData = data.map((item: any) => ({
        ...item,

        // 🔥 backend → frontend mapping
        vendorName: item.vendor_name ? [item.vendor_name] : [],
        vendorFirm: item.vendor_firm || "",
        vendorCode: item.vendor_code || "",
        allocatedId: item.vendor_allocated_id
          ? [item.vendor_allocated_id]
          : [],
          attachmentName: item.training_attachment || "",
          trainingStatus:item.training_status || "",
      }));

      setFilterResults(mappedData);
      // ✅ Close filter modal and open result modal
      setFilterModalOpen(false);
      setResultModalOpen(true);
    } catch (err) {
      console.error("Fetch failed:", err);
      alert("Network error");
    }
  };

  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const toggleRowExpansion = (transactionId: string) => {
    setExpandedRows((prev) =>
      prev.includes(transactionId)
        ? prev.filter((id) => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const openTaskModal = (tasks?: TaskRequest[]) => {
    if (!tasks) return;
    setSelectedTasks(tasks);
    setTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setSelectedTasks([]);
    setTaskModalOpen(false);
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  };

  const handleExportPDF = async (exportedBy: string) => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const fileName = `UserRequests_${today.toISOString().split("T")[0]}.pdf`;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMargin = 14;
    const headerHeight = 28;
    const footerHeight = 12;
    let startY = headerHeight + 8;

    // --- HEADER ---
    const drawHeader = async () => {
      doc.setFillColor(0, 82, 155);
      doc.rect(0, 0, pageWidth, headerHeight, "F");

      // Logo
      let logoWidth = 0;
      let logoHeight = 0;
      if (login_headTitle2) {
        try {
          const img = await loadImage(login_headTitle2);
          const maxLogoHeight = headerHeight * 0.6;
          const scale = maxLogoHeight / img.height;
          logoWidth = img.width * scale;
          logoHeight = img.height * scale;
          const logoY = headerHeight / 2 - logoHeight / 2;
          doc.addImage(img, "PNG", pageMargin, logoY, logoWidth, logoHeight);
        } catch (e) {
          console.warn("Logo load failed", e);
        }
      }

      // Title + Exported by on the same line
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      const titleX = pageMargin + logoWidth + 10;
      const titleY = headerHeight / 2 + 5;
      doc.text("User Access Requests", titleX, titleY);

      doc.setFontSize(9);
      doc.setTextColor(220, 230, 245);
      const exportedText = `Exported by: ${exportedBy}  On: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
      const textWidth = doc.getTextWidth(exportedText);
      doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);

      doc.setDrawColor(0, 82, 155);
      doc.setLineWidth(0.5);
      doc.line(0, headerHeight, pageWidth, headerHeight);
    };

    // --- FOOTER ---
    const drawFooter = () => {
      const pageCount =
        (doc as any).getNumberOfPages?.() ||
        (doc as any).internal?.getNumberOfPages?.() ||
        1;
      doc.setFontSize(9);
      doc.setTextColor(100);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text("Unichem Laboratories", pageMargin, pageHeight - 6);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - pageMargin - 30,
          pageHeight - 6
        );
      }
    };

    await drawHeader();

    // --- REQUEST CARDS + TASK TABLES ---
    for (let index = 0; index < filterResults.length; index++) {
      const req = filterResults[index];

      // Card background color
      const cardBgColor = index % 2 === 0 ? [245, 247, 250] : [230, 235, 245];

      // Card text
      const textContent = `Transaction ID: ${req.transaction_id || "-"
        } | Name: ${req.name || "-"} | Employee Code: ${req.employeeCode || "-"
        } | Location: ${req.tasks?.[0]?.location || "-"} | Department: ${req.tasks?.[0]?.department || "-"
        } | Access Type: ${req.accessType || "-"} | Approver 1: ${req.approver1_status || "Pending"} 
    | Approver 2: ${req.approver2_status || "Pending"} | Status: ${req.status || "Pending"}`;
      const textLines = doc.splitTextToSize(
        textContent,
        pageWidth - 2 * pageMargin - 4
      );
      const lineHeight = 6;
      const cardHeight = textLines.length * lineHeight + 10;

      const tableEstimateHeight = req.tasks ? req.tasks.length * 12 + 20 : 0;
      const neededSpace =
        cardHeight + 6 + tableEstimateHeight + 8 + footerHeight;

      if (startY + neededSpace > pageHeight) {
        doc.addPage();
        startY = headerHeight + 8;
        await drawHeader();
      }

      // Draw card
      doc.setFillColor(cardBgColor[0], cardBgColor[1], cardBgColor[2]);
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.roundedRect(
        pageMargin,
        startY,
        pageWidth - 2 * pageMargin,
        cardHeight,
        3,
        3,
        "FD"
      );

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(textLines, pageMargin + 2, startY + 6);

      startY += cardHeight + 6;

      // Task table
      if (req.tasks && req.tasks.length > 0) {
        autoTable(doc, {
          head: [
            [
              "Task ID",
              "Application / Equip",
              "Department",
              "Location",
              "Requestor Role",
              "Granted Role",
              "Status",
            ],
          ],
          body: req.tasks.map((t) => [
            t.transaction_id || "-",
            t.application_equip_id || "-",
            t.department || "-",
            t.location || "-",
            t.role || "-",
            t.role || "-",
            t.task_status || "-",
          ]),
          startY,
          styles: {
            fontSize: 10,
            cellPadding: 4,
            overflow: "linebreak",
            valign: "middle",
          },
          headStyles: {
            fillColor: [0, 118, 255],
            textColor: 255,
            fontStyle: "bold",
            halign: "center",
          },
          alternateRowStyles: { fillColor: [245, 250, 255] },
          margin: { left: pageMargin, right: pageMargin },
          theme: "grid",
          showHead: "everyPage",
          didDrawPage: (data) => {
            startY = (data.cursor?.y ?? startY) + 8;
          },
        });
      } else startY += 6;
    }

    drawFooter();
    doc.save(fileName);
  };

  // ===================== Form Submission =====================
  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();

  //   // =================== Validations ===================
  //   if (
  //     form.request_for_by === "Vendor / OEM" &&
  //     form.accessType === "Modify Access"
  //   ) {
  //     if (!form.vendorFirm || !form.allocatedId) {
  //       alert(
  //         "Vendor Firm and Allocated ID are required for Vendor/OEM Modify."
  //       );
  //       return;
  //     }
  //   }

  //   if (form.accessType === "Bulk New User Creation" && bulkRows.length === 0) {
  //     alert("Please add at least one bulk entry.");
  //     return;
  //   }

  //   if (
  //     form.trainingStatus === "Yes" &&
  //     (form.accessType === "New User Creation" ||
  //       form.accessType === "Bulk New User Creation") &&
  //     attachments.length === 0
  //   ) {
  //     alert("Attachment is mandatory for training records.");
  //     return;
  //   }

  //   // =================== Approver Info ===================
  //   const approver1 = form.reportsToOptions[0]; // Manager
  //   const approver2 = form.reportsToOptions[1]; // Managers Manager (second level)

  //   // Convert to string to satisfy TypeScript
  //   const approver1_id_str = String(approver1?.employeeCode || "");
  //   const approver2_id_str = "";

  //   const approver1_email = approver1?.email || "";
  //   const approver2_email = "";

  //   // =================== Build Tasks ===================
  //   const tasks: TaskRequest[] = [];

  //   if (form.accessType === "Bulk New User Creation") {
  //     bulkRows.forEach((row) => {
  //       tasks.push({
  //         application_equip_id: row.applicationId,
  //         department: form.department,
  //         role: row.role,
  //         location: form.plant_location,
  //         reports_to: form.reportsTo,
  //         task_status: "Pending",
  //         approver1_id: approver1_id_str,
  //         approver2_id: '',
  //       });
  //     });
  //   } else {
  //     tasks.push({
  //       application_equip_id: form.applicationId,
  //       department: form.department,
  //       role: form.role,
  //       location: form.plant_location,
  //       reports_to: form.reportsTo,
  //       task_status: "Pending",
  //       approver1_id: approver1_id_str,
  //       approver2_id: '',
  //     });
  //   }

  //   // =================== Build FormData ===================
  //   const formData = new FormData();

  //   formData.append("request_for_by", form.request_for_by || "");
  //   formData.append("name", form.name || "");
  //   formData.append("employee_code", form.employeeCode || "");
  //   formData.append("employee_location", form.location || "");
  //   formData.append("plant_location", form.plant_location || "");
  //   formData.append("department", form.department || "");
  //   formData.append("role", form.role || "");
  //   formData.append("status", form.status || "Pending");
  //   formData.append("reports_to", form.reportsTo || "");
  //   formData.append("training_status", form.trainingStatus || "");
  //   formData.append("access_request_type", form.accessType || "");
  //   formData.append("vendor_name", form.vendorName?.toString() || "");
  //   formData.append("vendor_firm", form.vendorFirm?.toString() || "");
  //   formData.append("vendor_code", form.vendorCode?.toString() || "");
  //   formData.append("vendor_allocated_id", form.allocatedId?.toString() || "");

  //   // Approver info
  //   formData.append("approver1_email", approver1_email);
  //   formData.append("approver2_email", "");
  //   formData.append("approver1_status", "Pending");
  //   formData.append("approver2_status", "Pending");

  //   // Attach file
  //   if (attachments.length > 0) {
  //     formData.append("training_attachment", attachments[0]);
  //   }

  //   // Attach tasks
  //   formData.append("tasks", JSON.stringify(tasks));

  //   console.log("Submitting FormData:", Object.fromEntries(formData.entries()));

  //   try {
  //     const response = await addUserRequest(formData); // send FormData to backend

  //     alert("Request submitted successfully!");
  //     window.location.href = "/user-access-management";
  //     // navigate("/user-access-management");
  //     // window.location.reload();
  //   } catch (err) {
  //     console.error("Failed to save request:", err);
  //     alert("Something went wrong while saving the request.");
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setValidationError(null);
    setSuccessMessage(null);

    const token = localStorage.getItem("token");

    // =====================================================
    // HANDLE BULK DEACTIVATION (NO APPROVAL NEEDED)
    // =====================================================
    if (form.accessType === "Bulk De-activation") {
      if (!form.plant_location || !form.department) {
        setValidationError("Plant and Department are required for Bulk De-activation");
        return;
      }

      if (bulkDeactivationLogs.length === 0) {
        setValidationError("No active access logs found to deactivate");
        return;
      }

      try {
        setIsSubmitting(true);

        console.log("[BULK DEACTIVATION] Submitting:", {
          plant_location: form.plant_location,
          department: form.department,
          logsCount: bulkDeactivationLogs.length
        });

        const response = await fetch(
          `${API_BASE}/api/user-requests/bulk-deactivation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              request_for_by: form.request_for_by,
              name: form.name,
              employee_code: form.employeeCode,
              employee_location: form.location,
              plant_location: form.plant_location,
              department: form.department,
              remarks: form.remarks || "Bulk deactivation"
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Bulk deactivation failed");
        }

        const data = await response.json();

        console.log("[BULK DEACTIVATION] Success:", data);

        setSuccessMessage(
          `✅ Successfully deactivated ${data.summary.totalDeactivated} access logs! ` +
          `Transaction ID: ${data.userRequest.transaction_id}`
        );
        setIsSubmitting(false);

        setTimeout(() => {
          window.location.href = "/user-access-management";
        }, 2000);

        return; // ⚠️ EXIT EARLY - Don't run normal submission
      } catch (err) {
        console.error("[BULK DEACTIVATION] Error:", err);
        setValidationError(
          err instanceof Error ? err.message : "Bulk deactivation failed. Please try again."
        );
        setIsSubmitting(false);
        return;
      }
    }

    // =====================================================
    // BASIC VALIDATIONS
    // =====================================================
    if (
      form.request_for_by === "Vendor / OEM" &&
      form.accessType === "Modify Access"
    ) {
      if (!form.vendorFirm || !form.allocatedId?.length) {
        setValidationError(
          "Vendor Firm and Allocated ID are required for Vendor/OEM Modify."
        );
        return;
      }
    }

    if (form.accessType === "Bulk New User Creation" && bulkRows.length === 0) {
      setValidationError("Please add at least one bulk entry.");
      return;
    }

    // ── Temporary-user date validation ────────────────────────────
    if (
      (form.accessType === "New User Creation" ||
        form.accessType === "Bulk New User Creation") &&
      form.userRequestType === "Temporary"
    ) {
      if (!form.toDate) {
        setValidationError("To Date is required for Temporary user type.");
        return;
      }
      const today = new Date().toISOString().split("T")[0];
      if (form.toDate < today) {
        setValidationError("To Date must not be in the past.");
        return;
      }
    }

    if (
      form.trainingStatus === "Yes" &&
      (form.accessType === "New User Creation" ||
        form.accessType === "Bulk New User Creation") &&
      attachments.length === 0
    ) {
      setValidationError("Attachment is mandatory for training records.");
      return;
    }

    try {
      setIsSubmitting(true);
      const isBulk = form.accessType === "Bulk New User Creation";
      const isBulkDeact = form.accessType === "Bulk De-activation";

      // Define applicationIds outside the conditional block
      const applicationIds = isBulkDeact
        ? []
        : isBulk
          ? bulkRows.map(r => r.applicationId).filter(Boolean)
          : [form.applicationId].filter(Boolean);

      // Skip application validation for bulk deactivation
      if (!isBulkDeact) {
        if (applicationIds.length === 0) {
          setValidationError("Please select at least one application.");
          setIsSubmitting(false);
          return;
        }

        // Existing validation logic for non-bulk-deactivation
        if (isBulk) {
          const bulkValidationRes = await fetch(
            `${API_BASE}/api/user-requests/validate-bulk`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                plant_location: form.plant_location,
                department: form.department,
                applicationIds
              })
            }
          );

          if (!bulkValidationRes.ok) {
            throw new Error("Bulk validation failed");
          }

          const bulkData = await bulkValidationRes.json();

          if (!bulkData.valid) {
            setValidationError(bulkData.message || "Bulk validation failed");
            setIsSubmitting(false);
            return;
          }
        }
      }
      // =====================================================
      // Prepare validation payload
      // =====================================================
      // Additional validations for non-bulk-deactivation
      const validationPayload = {
        request_for_by: form.request_for_by,
        name: form.name,
        vendor_name: Array.isArray(form.vendorName)
          ? form.vendorName[0] || ""
          : form.vendorName || "",
        plant_location: form.plant_location,
        department: form.department,
        applicationId: applicationIds,
        accessType: form.accessType,
      };

      console.log("\nValidation payload:", validationPayload);

      // =====================================================
      // RULE 1/3/4: Check In-Flight Requests
      // =====================================================
      console.log("\n[RULE 1/3/4] Checking in-flight requests...");

      const inflightRes = await fetch(
        `${API_BASE}/api/user-requests/inflight-check`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(validationPayload)
        }
      );

      if (!inflightRes.ok) {
        throw new Error("In-flight validation failed");
      }

      const inflightData = await inflightRes.json();
      console.log("[RULE 1/3/4] Result:", inflightData);

      if (inflightData?.conflict) {
        console.error(`[${inflightData.rule}] ❌ CONFLICT`);
        console.groupEnd();
        setValidationError(
          inflightData.message ||
          "A request is already in progress for this combination."
        );
        setIsSubmitting(false);
        return;
      }

      console.log("[RULE 1/3/4] ✅ PASS - No in-flight conflicts");

      // =====================================================
      // RULE 2/3: Check Access Log
      // =====================================================
      console.log("\n[RULE 2/3] Checking access log...");

      const accessLogRes = await fetch(
        `${API_BASE}/api/access-logs/conflict-check`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(validationPayload)
        }
      );

      if (!accessLogRes.ok) {
        throw new Error("Access log validation failed");
      }

      const accessLogData = await accessLogRes.json();
      console.log("[RULE 2/3] Result:", accessLogData);

      if (accessLogData?.conflict) {
        console.error(`[${accessLogData.rule}] ❌ CONFLICT`);
        console.groupEnd();
        setValidationError(
          accessLogData.message ||
          "Access log validation failed."
        );
        setIsSubmitting(false);
        return;
      }

      console.log("[RULE 2/3] ✅ PASS - Access log validation successful");

      console.log("\n✅ ALL VALIDATION RULES PASSED");
      console.groupEnd();

      // =====================================================
      // RULE 8: Build Approver Information
      // =====================================================
      const approver1 = form.reportsToOptions[0]; // Manager
      const approver2 = form.reportsToOptions[1]; // Manager's Manager

      const approver1_id_str = String(approver1?.employeeCode || "");
      const approver1_email = approver1?.email || "";

      // Note: Add approver2 and approver3 logic when required
      // const approver2_id_str = String(approver2?.employeeCode || "");
      // const approver2_email = approver2?.email || "";

      // =====================================================
      // BUILD TASKS
      // =====================================================
      const tasks: TaskRequest[] = [];
      // const selectedRoles = Array.isArray(form.role)
      //   ? form.role
      //   : [form.role];
      // if (isBulk) {
      //   bulkRows.forEach((row) => {
      //     console.log("Building tasks for bulk row:", row, "with roles:", form.role); return false;
      //     selectedRoles.forEach((roleId) => {
      //       tasks.push({
      //         application_equip_id: row.applicationId,
      //         department: form.department,
      //         role: roleId,
      //         location: form.plant_location,
      //         reports_to: form.reportsTo,
      //         task_status: "Pending",
      //         approver1_id: approver1_id_str,
      //         approver2_id: "",
      //       });
      //     });
      //   });
      // } else {
      //   selectedRoles.forEach((roleId) => {
      //     tasks.push({
      //       application_equip_id: form.applicationId,
      //       department: form.department,
      //       role: roleId,
      //       location: form.plant_location,
      //       reports_to: form.reportsTo,
      //       task_status: "Pending",
      //       approver1_id: approver1_id_str,
      //       approver2_id: "",
      //     });
      //   });
      // }


      // =====================================================
      // BUILD TASKS - FIXED VERSION
      // Replace the task building section in handleSubmit
      // =====================================================

      if (isBulk) {
        // For bulk creation, iterate through each bulk row
        bulkRows.forEach((row) => {
          // Get the roles for THIS specific row
          const rowRoles = Array.isArray(row.role) ? row.role : [row.role];

          // Create a task for each role in this row
          rowRoles.forEach((roleId) => {
            if (roleId) { // Only add if role exists
              tasks.push({
                application_equip_id: row.applicationId,
                department: form.department,
                role: roleId,
                location: form.plant_location,
                reports_to: form.reportsTo,
                task_status: "Pending",
                approver1_id: approver1_id_str,
                approver2_id: "",
              });
            }
          });
        });
      } else {
        // For single creation, use form.role
        const selectedRoles = Array.isArray(form.role) ? form.role : [form.role];

        selectedRoles.forEach((roleId) => {
          if (roleId) { // Only add if role exists
            tasks.push({
              application_equip_id: form.applicationId,
              department: form.department,
              role: roleId,
              location: form.plant_location,
              reports_to: form.reportsTo,
              task_status: "Pending",
              approver1_id: approver1_id_str,
              approver2_id: "",
            });
          }
        });
      }

      console.log("[SUBMIT] Generated tasks:", tasks);

      // Validation: Ensure at least one task was created
      if (tasks.length === 0) {
        setValidationError("No valid tasks created. Please check your selections.");
        setIsSubmitting(false);
        return;
      }

      // =====================================================
      // BUILD FORM DATA
      // =====================================================
      const formData = new FormData();

      formData.append("request_for_by", form.request_for_by || "");
      formData.append("name", form.name || "");
      formData.append("employee_code", form.employeeCode || "");
      formData.append("employee_location", form.location || "");
      formData.append("plant_location", form.plant_location || "");
      formData.append("department", form.department || "");
      formData.append("role", Array.isArray(form.role) ? form.role.join(",") : form.role);
      formData.append("status", "Pending"); // RULE 8: Initial status
      formData.append("reports_to", form.reportsTo || "");
      formData.append("training_status", form.trainingStatus || "");
      formData.append("access_request_type", form.accessType || "");
      formData.append("vendor_name", form.vendorName?.toString() || "");
      formData.append("vendor_firm", form.vendorFirm || "");
      formData.append("vendor_code", form.vendorCode || "");
      formData.append("vendor_allocated_id", form.allocatedId?.toString() || "");

      // ── Temporary / Permanent user-type dates ──────────────────
      formData.append("user_request_type", form.userRequestType || "");
      formData.append("from_date", form.fromDate || "");
      formData.append("to_date", form.toDate || "");

      // RULE 8: Approver information
      formData.append("approver1_email", approver1_email);
      formData.append("approver2_email", "");
      formData.append("approver1_status", "Pending");
      formData.append("approver2_status", "Pending");

      if (attachments.length > 0) {
        formData.append("training_attachment", attachments[0]);
      }

      formData.append("tasks", JSON.stringify(tasks));

      console.log("[SUBMIT] Sending request to backend...", bulkRows, tasks);

      // =====================================================
      // SUBMIT
      // =====================================================
      await addUserRequest(formData);

      setSuccessMessage("✅ Request submitted successfully!");
      setIsSubmitting(false);

      setTimeout(() => {
        window.location.href = "/user-access-management";
      }, 1200);

    } catch (err) {
      console.error("[SUBMIT] Error:", err);
      setValidationError(
        err instanceof Error
          ? err.message
          : "Failed to submit request. Please try again."
      );
      setIsSubmitting(false);
    }
  };



  const isVendorModify =
    form.request_for_by === "Vendor / OEM" &&
    form.accessType === "Modify Access";
  const isBulkDeactivation = form.accessType === "Bulk De-activation";
  const isBulkNew = form.accessType === "Bulk New User Creation";

  const accessOptions =
    form.request_for_by === "Vendor / OEM"
      ? [
        "New User Creation",
        "Modify Access",
        "Active / Enable User Access",
        "Deactivation / Disable / Remove User Access",
        "Password Reset",
        "Account Unlock",
        "Account Unlock and Password Reset",
      ]
      : [
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

  // ===================== Data Fetch =====================

  useEffect(() => {
    if (form.request_for_by === "Self" && user) {
      const managers: Manager[] = [];

      // handle reporting_manager
      if (user.reporting_manager) {
        if (typeof user.reporting_manager === "string") {
          managers.push({
            dn: "",
            email: "",
            managerDN: "",
            displayName: user.reporting_manager,
            employeeCode: "",
            sAMAccountName: "",
          });
        } else {
          managers.push(user.reporting_manager);
        }
      }

      // handle managers_manager
      if (user.managers_manager) {
        if (typeof user.managers_manager === "string") {
          managers.push({
            dn: "",
            email: "",
            managerDN: "",
            displayName: user.managers_manager,
            employeeCode: "",
            sAMAccountName: "",
          });
        } else {
          managers.push(user.managers_manager);
        }
      }

      setForm((prev) => ({
        ...prev,
        name: user.name || "",
        location: user.location || "",
        department: user.department || "",
        reportsToOptions: managers,
        reportsTo: managers[0]?.displayName || "",
        employeeCode: user.employee_code || "",
      }));

      if (!managers.length && user.employee_code) {
        fetchUserByEmployeeCode(user.employee_code);
      }
    }
  }, [form.request_for_by, user]);

  useEffect(() => {
    fetchPlants()
      .then((data) =>
        setPlants(
          data.map((p: any) => ({ id: p.id, plant_name: p.plant_name }))
        )
      )
      .catch(() => setPlants([]));
  }, []);
  useEffect(() => {
    if (form.plant_location)
      fetch(
        `${API_BASE}/api/applications/${form.plant_location}`
      )
        .then((res) => res.json())
        .then((data) => setDepartments(Array.isArray(data) ? data : []))
        .catch(() => setDepartments([]));
  }, [form.plant_location]);
  useEffect(() => {
    if (form.plant_location && form.department) {
      fetch(
        `${API_BASE}/api/applications/${form.plant_location}/${form.department}`
      )
        .then((res) => res.json())
        .then((data) => {
          setRoles(Array.isArray(data.roles) ? data.roles : []);
          setApplications(
            Array.isArray(data.applications) ? data.applications : []
          );
        })
        .catch(() => {
          setRoles([]);
          setApplications([]);
        });
    }
  }, [form.plant_location, form.department]);
  useEffect(() => {

    fetchVendors()
      .then((data) =>
        setVendorFirm(
          data.map((p: any) => ({ id: p.id, vendor_name: p.vendor_name, vendor_code: p.vendor_code }))
        )
      ).catch(() => setVendorFirm([]));
  }, []);

  // Fetch departments when plant changes
  useEffect(() => {
    if (filter.plant_location) {
      fetch(
        `${API_BASE}/api/applications/${filter.plant_location}`
      )
        .then((res) => res.json())
        .then((data) => setDepartments(Array.isArray(data) ? data : []))
        .catch(() => setDepartments([]));
    }
  }, [filter.plant_location]);
  useEffect(() => {
    setFilter((prev) => ({ ...prev, department: "" })); // reset department
    if (filter.plant_location) {
      fetch(
        `${API_BASE}/api/applications/${filter.plant_location}`
      )
        .then((res) => res.json())
        .then((data) => setDepartments(Array.isArray(data) ? data : []))
        .catch(() => setDepartments([]));
    } else {
      setDepartments([]);
    }
  }, [filter.plant_location]);
  // fetch applications when department changes in filter modal
  useEffect(() => {
    if (filter.plant_location && filter.department) {
      fetch(
        `${API_BASE}/api/applications/${filter.plant_location}/${filter.department}`
      )
        .then((res) => res.json())
        .then((data) => {
          setFilterApplications(
            Array.isArray(data.applications) ? data.applications : []
          );
          setFilterRoles([]); // reset roles
          setFilter((prev) => ({ ...prev, applicationId: "", role: "" })); // reset values in filter object
        })
        .catch(() => {
          setFilterApplications([]);
          setFilterRoles([]);
        });
    }
  }, [filter.plant_location, filter.department]);

  // fetch roles when application changes in filter modal
  useEffect(() => {
    if (filter.applicationId) {
      fetch(
        `${API_BASE}/api/roles/${filter.applicationId}`
      )
        .then((res) => res.json())
        .then((data) => setFilterRoles(Array.isArray(data) ? data : []))
        .catch(() => setFilterRoles([]));
    } else {
      setFilterRoles([]);
    }
  }, [filter.applicationId]);
  useEffect(() => {
    if (filterModalOpen && user?.employee_code) {
      setFilter((prev) => ({
        ...prev,
        employeeCode: user.employee_code,
      }));
    }
  }, [filterModalOpen, user]);

  useEffect(() => {
    if (form.request_for_by !== "Vendor / OEM") {
      setForm(prev => ({
        ...prev,
        vendorFirm: "",
        vendorCode: "",
        vendorName: [],
      }));
    }
  }, [form.request_for_by]);

  useEffect(() => {
    const fetchVendorAccessLogs = async () => {
      if (isVendorModify && form.vendorFirm) {
        try {
          console.log("[VENDOR MODIFY] Fetching access logs for:", form.vendorFirm);
          const logs = await fetchAccessLogsForFirm(form.vendorFirm);
          console.log("[VENDOR MODIFY] Received logs:", logs);

          // Filter logs with closed task status
          const closedLogs = Array.isArray(logs)
            ? logs.filter(log => log.task_status === 'Closed')
            : [];

          setVendorAccessLogs(closedLogs);

          // If only one log, auto-select it
          if (closedLogs.length === 1) {
            handleAccessLogSelect(closedLogs[0]);
          } else {
            // Reset form if multiple or no logs
            setSelectedAccessLog(null);
            setForm(prev => ({
              ...prev,
              allocatedId: [],
              vendorName: [],
              vendorCode: '',
              plant_location: '',
              department: '',
              applicationId: '',
              role: ''
            }));
          }
        } catch (error) {
          console.error("[VENDOR MODIFY] Error fetching access logs:", error);
          setVendorAccessLogs([]);
          // alert("Failed to fetch vendor access logs. Please try again.");
        }
      } else {
        setVendorAccessLogs([]);
        setSelectedAccessLog(null);
      }
    };

    fetchVendorAccessLogs();
  }, [form.vendorFirm, isVendorModify]);

  // Add handler function for allocated ID selection:

  const handleAccessLogSelect = (log: any) => {
    if (!log) {
      setSelectedAccessLog(null);
      return;
    }

    console.log("[VENDOR MODIFY] Selected log:", log);

    setSelectedAccessLog(log);

    // Populate form with selected access log data
    setForm(prev => ({
      ...prev,
      allocatedId: log.vendor_allocated_id || '',
      vendorName: log.vendor_name || '',
      vendorCode: log.vendor_code || '',
      plant_location: log.location || '', // plant ID
      department: log.department || '', // department ID
      applicationId: log.application_equip_id || '', // application ID
      role: log.role || '' // role ID
    }));
  };
  // ===================== Bulk Deactivation: Fetch Logs =====================
  useEffect(() => {
    const fetchLogs = async () => {
      if (
        isBulkDeactivation &&
        form.plant_location &&
        form.department
      ) {
        setLoadingBulkLogs(true);
        try {
          const logs = await fetchBulkDeactivationLogs(
            form.plant_location,
            form.department,
            form.employeeCode,
            form.name
          );
          setBulkDeactivationLogs(logs);
        } catch (error) {
          console.error("Error fetching bulk deactivation logs:", error);
          setBulkDeactivationLogs([]);
        } finally {
          setLoadingBulkLogs(false);
        }
      } else {
        setBulkDeactivationLogs([]);
      }
    };

    fetchLogs();
  }, [form.location, form.department, form.employeeCode, form.name, isBulkDeactivation]);

  // ===================== Fetch Role from Access Log =====================
  // Called for all access types except Bulk De-activation.
  //   Modify Access        → pre-fill role from log, dropdown EDITABLE,
  //                           duplicateRoleError set initially (user must change role to clear it)
  //   New / Bulk-New       → do NOT pre-fill form.role; store existing role(s) in separate
  //                           state for optional informational warning (non-blocking)
  //   All other types      → pre-fill role, dropdown LOCKED (unchanged)
  const [existingAccessLogRoles, setExistingAccessLogRoles] = useState<string[]>([]);

  useEffect(() => {
    // Skip entirely for Bulk De-activation (no single app) and when nothing is selected
    if (
      form.accessType === "Bulk De-activation" ||
      !form.accessType
    ) {
      setAccessLogRoleLoaded(false);
      setAccessLogRoleFound(false);
      setDuplicateRoleError(null);
      setExistingAccessLogRoles([]);
      return;
    }

    // Need all three keys to query
    if (!form.plant_location || !form.department || !form.applicationId) {
      setAccessLogRoleLoaded(false);
      setAccessLogRoleFound(false);
      setDuplicateRoleError(null);
      setExistingAccessLogRoles([]);
      return;
    }

    // Reset before every new fetch
    setAccessLogRoleLoaded(false);
    setAccessLogRoleFound(false);
    setDuplicateRoleError(null);
    setExistingAccessLogRoles([]);

    // Only clear the selected role for types that will pre-fill and lock it
    if (
      form.accessType !== "New User Creation" &&
      form.accessType !== "Bulk New User Creation" &&
      form.accessType !== "Modify Access"
    ) {
      setForm(prev => ({ ...prev, role: [] }));
    }

    const fetchRoleFromAccessLog = async () => {
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams({
          employee_code: form.employeeCode || "",
          plant:         form.plant_location,
          department:    form.department,
          application:   form.applicationId,
        });

        const res = await fetch(
          `${API_BASE}/api/access-logs/by-user?${params.toString()}`,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type":  "application/json",
            },
          }
        );

        if (!res.ok) {
          console.warn("[ACCESS-LOG ROLE] No matching log found – status", res.status);
          setAccessLogRoleLoaded(true);
          setAccessLogRoleFound(false);
          return;
        }

        const data = await res.json();
        console.log("[ACCESS-LOG ROLE] Fetched log data:", data.data?.[0]?.role);

        if (data.data?.[0]?.role) {
          const roleArr = Array.isArray(data.data[0].role)
            ? data.data[0].role
            : [data.data[0].role];
          const roleStrArr: string[] = roleArr.map(String);

          setAccessLogRoleFound(true);
          setExistingAccessLogRoles(roleStrArr); // save for comparison in separate effect

          if (form.accessType === "Modify Access") {
            // ── Modify Access: pre-fill BUT keep dropdown editable ──
            setForm(prev => ({ ...prev, role: roleStrArr }));
            // Set duplicateRoleError immediately (user must change role to clear it)
            const roleLabels = roleStrArr
              .map((id: string) => roles.find(r => String(r.id) === id)?.name)
              .filter(Boolean)
              .join(", ");
            setDuplicateRoleError(
              `Access is already provided for role: ${roleLabels || roleStrArr.join(", ")}. ` +
              `Please select a different role to modify access.`
            );
          } else if (
            form.accessType === "New User Creation" ||
            form.accessType === "Bulk New User Creation"
          ) {
            // ── New / Bulk-New: do NOT touch form.role ──
            // duplicateRoleError may be set later by a separate effect (optional, informational)
          } else {
            // ── All other types: pre-fill, read-only ──
            setForm(prev => ({ ...prev, role: roleStrArr }));
          }
        } else {
          setAccessLogRoleFound(false);
        }

        setAccessLogRoleLoaded(true);
      } catch (err) {
        console.error("[ACCESS-LOG ROLE] Fetch failed:", err);
        setAccessLogRoleLoaded(true);
        setAccessLogRoleFound(false);
      }
    };

    fetchRoleFromAccessLog();
  }, [form.accessType, form.plant_location, form.department, form.applicationId, form.employeeCode]);

  // ── Separate effect: watch form.role and compare against existingAccessLogRoles ──
  // For Modify Access: clear duplicateRoleError when user changes role to something different
  // For New / Bulk-New: show informational warning (amber) if user picks a role that already exists
  useEffect(() => {
    if (
      form.accessType !== "Modify Access" &&
      form.accessType !== "New User Creation" &&
      form.accessType !== "Bulk New User Creation"
    ) {
      // not relevant for other types
      return;
    }

    // Normalize form.role to always be an array (it can be string | string[] in the interface)
    const roleArray = Array.isArray(form.role) ? form.role : (form.role ? [form.role] : []);

    if (existingAccessLogRoles.length === 0 || roleArray.length === 0) {
      // nothing to compare yet
      if (form.accessType === "Modify Access") {
        // only clear if it was previously set
        setDuplicateRoleError(null);
      }
      return;
    }

    // Compare: are the selected roles identical to the existing ones?
    const selectedRoleSet = new Set(roleArray.map(String));
    const existingRoleSet = new Set(existingAccessLogRoles.map(String));

    const identical =
      selectedRoleSet.size === existingRoleSet.size &&
      [...selectedRoleSet].every((r: string) => existingRoleSet.has(r));

    if (form.accessType === "Modify Access") {
      if (identical) {
        // User has not changed the role → show error
        const roleLabels = [...selectedRoleSet]
          .map((id: string) => roles.find(r => String(r.id) === id)?.name)
          .filter(Boolean)
          .join(", ");
        setDuplicateRoleError(
          `Access is already provided for role: ${roleLabels || roleArray.join(", ")}. ` +
          `Please select a different role to modify access.`
        );
      } else {
        // User changed the role → clear error, allow submit
        setDuplicateRoleError(null);
      }
    } else {
      // New / Bulk-New: informational warning only (non-blocking)
      if (identical) {
        const roleLabels = [...selectedRoleSet]
          .map((id: string) => roles.find(r => String(r.id) === id)?.name)
          .filter(Boolean)
          .join(", ");
        setDuplicateRoleError(
          `Role "${roleLabels || roleArray.join(", ")}" already exists in the access log ` +
          `for the selected Plant, Department & Application. You may still submit this request.`
        );
      } else {
        setDuplicateRoleError(null);
      }
    }
  }, [form.role, existingAccessLogRoles, form.accessType]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };
  console.log("filter requests to display:", filterResults);

  // ===================== Submit-button disabled logic =====================
  // The button is disabled whenever:
  //   • a submission is already in-flight
  //   • there is an active validationError (from backend or frontend checks)
  //   • Modify Access: duplicateRoleError is set (user has not changed the role)
  //   • For access types that require existing log: no access-log was found
  //   • required fields are still empty
  const isSubmitDisabled = (() => {
    // already submitting
    if (isSubmitting) return true;

    // general validation error blocks all types
    if (validationError) return true;

    // duplicateRoleError ONLY blocks Modify Access (for New/Bulk-New it's just informational)
    if (form.accessType === "Modify Access" && duplicateRoleError) return true;

    // Access types that REQUIRE an existing access-log to operate on
    const requiresExistingLog = [
      "Modify Access",
      "Password Reset",
      "Account Unlock",
      "Account Unlock and Password Reset",
      "Active / Enable User Access",
      "Deactivation / Disable / Remove User Access",
    ];

    // Block submission if access type requires existing log but none was found
    if (
      requiresExistingLog.includes(form.accessType) &&
      !isVendorModify &&                          // vendor-modify has its own flow
      form.plant_location &&
      form.department &&
      form.applicationId &&
      accessLogRoleLoaded &&
      !accessLogRoleFound
    ) return true;

    // ── required fields (always) ──
    if (!form.accessType) return true;
    if (!form.employeeCode) return true;
    if (!form.name) return true;

    // ── required fields per access-type ──
    if (form.accessType === "Bulk De-activation") {
      if (!form.plant_location || !form.department) return true;
      if (bulkDeactivationLogs.length === 0) return true;
    } else if (form.accessType === "Bulk New User Creation") {
      if (!form.plant_location || !form.department) return true;
      if (bulkRows.length === 0) return true;
      // every bulk row must have an application and at least one role
      if (bulkRows.some(r => !r.applicationId || r.role.length === 0)) return true;
    } else {
      // single-row flows (New, Modify, Password Reset, etc.)
      if (!isVendorModify) {
        // Card 4 is visible → plant + dept required; app + role required when role is enabled
        if (!form.plant_location || !form.department) return true;
        if (isRoleEnabled) {
          if (!form.applicationId) return true;
          if (!form.role || form.role.length === 0) return true;
        }
      } else {
        // Vendor Modify: vendorFirm + allocatedId required
        if (!form.vendorFirm) return true;
        if (!form.allocatedId || (Array.isArray(form.allocatedId) && form.allocatedId.length === 0)) return true;
      }
    }

    // Approver required (except Bulk De-activation)
    if (form.accessType !== "Bulk De-activation" && !form.reportsTo) return true;

    // Training attachment required when training = Yes AND it is a creation type
    if (
      form.trainingStatus === "Yes" &&
      (form.accessType === "New User Creation" || form.accessType === "Bulk New User Creation") &&
      attachments.length === 0
    ) return true;

    // Temporary user → toDate mandatory
    if (
      (form.accessType === "New User Creation" || form.accessType === "Bulk New User Creation") &&
      form.userRequestType === "Temporary" &&
      !form.toDate
    ) return true;

    return false;
  })();
  // ===================== JSX =====================
  return (
    <div className={addUserRequestStyles["main-container"]}>
      {/* ===================== Filter Modal ===================== */}
      {filterModalOpen && (
        <div className={addUserRequestStyles.modalOverlay}>
          <div className={addUserRequestStyles.filterModalBox}>
            <h2 className={addUserRequestStyles.advancedFilterHeader}>
              Filter User Requests
            </h2>

            <div className={addUserRequestStyles.twoColForm}>
              {/* Column 1 */}
              <div className={addUserRequestStyles.twoCol}>
                <div className={addUserRequestStyles.formGroup}>
                  <select
                    name="plant_location"
                    value={filter.plant_location}
                    onChange={(e) => {
                      handleFilterChange(e);
                      setFilter((prev) => ({ ...prev, department: "" }));
                    }}
                    required
                  >
                    <option value="">Select Plant</option>
                    {plants.map((plant) => (
                      <option
                        key={plant.id}
                        value={plant.id}
                        title={plant.plant_name}
                      >
                        {plant.plant_name}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="plant_location" className={addUserRequestStyles.floatingLabel}>
                    Plant <span style={{ color: "red" }}>*</span>
                  </label>
                </div>
                <div className={addUserRequestStyles.formGroup}>
                  <select
                    name="department"
                    value={filter.department}
                    onChange={handleFilterChange}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option
                        key={dept.id}
                        value={dept.id}
                        title={dept.department_name}
                      >
                        {dept.department_name}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="department" className={addUserRequestStyles.floatingLabel}>
                    Req. App. Department <span style={{ color: "red" }}>*</span>
                  </label>
                </div>
                <div className={addUserRequestStyles.formGroup}>
                  <select
                    name="applicationId"
                    value={filter.applicationId}
                    onChange={handleFilterChange}
                  >
                    <option value="">Select Application / Equipment ID</option>
                    {filterApplications.map((app) => (
                      <option key={app.id} value={app.id} title={app.name}>
                        {app.name}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="applicationId" className={addUserRequestStyles.floatingLabel}>Application</label>
                </div>
              </div>

              {/* Column 2 */}
              <div className={addUserRequestStyles.twoCol}>
                <div className={addUserRequestStyles.formGroup}>
                  <input
                    type="text"
                    name="transactionId"
                    value={filter.transactionId}
                    onChange={handleFilterChange}
                    placeholder=""
                    autoFocus
                  />
                  <label htmlFor="transactionId" className={addUserRequestStyles.floatingLabel}>Transaction ID</label>
                </div>
                <div className={addUserRequestStyles.formGroup}>
                  <input
                    type="text"
                    name="employeeCode"
                    value={filter.employeeCode}
                    onChange={handleFilterChange}
                    placeholder=" "
                    autoFocus
                  />
                  <label htmlFor="employeeCode" className={addUserRequestStyles.floatingLabel}>Employee Code</label>
                </div>
                <div className={addUserRequestStyles.formGroup}></div>
              </div>
            </div>

            <div className={addUserRequestStyles.advancedFilterActions}>
              <button
                type="button"
                className={addUserRequestStyles.advancedApplyBtn}
                onClick={handleFilterSearch}
              >
                Search
              </button>
              <button
                type="button"
                className={addUserRequestStyles.advancedClearBtn}
                onClick={() =>
                  setFilter({
                    plant_location: "",
                    department: "",
                    applicationId: "",
                    employeeCode: "",
                    transactionId: "",
                  })
                }
              >
                Clear
              </button>
              <button
                type="button"
                className={addUserRequestStyles.advancedClearBtn}
                onClick={() => setFilterModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Result Modal ===================== */}
      {resultModalOpen && (
        <div className={addUserRequestStyles.modalOverlay}>
          <div className={addUserRequestStyles.modalBox}>
            <div className={addUserRequestStyles.modalHeader}>
              <h2>Search Results</h2>
              <div className={addUserRequestStyles.modalActions}>
                <button
                  className={addUserRequestStyles.primaryBtn}
                  onClick={() =>
                    handleExportPDF(user ? user.username : "admin")
                  }
                >
                  Export PDF
                </button>
                <button
                  className={addUserRequestStyles.secondaryBtn}
                  onClick={() => setResultModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className={addUserRequestStyles.modalContent}>
              <div style={{
                maxHeight: 400,
                overflowY: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                boxShadow: "0 0 4px rgba(0,0,0,0.05)",
              }}>

                <table className={addUserRequestStyles.table}>
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Name</th>
                      <th>Employee Code</th>
                      <th>Location</th>
                      <th>Department</th>
                      <th>Access Type</th>
                      <th>Vendor Firm</th>
                      <th>Vendor Code</th>
                      <th>Vendor Name</th>
                       <th>Vendor Allocated ID</th>
                    <th>Training Status</th>
                    <th>Training Attachment</th>
                      <th>Approver status & Comment</th>
                      <th>Created On</th>
                      <th>Status</th>
                      <th>Task</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterResults.length === 0 ? (
                      <tr>
                        <td colSpan={11} className={styles.emptyState}>
                          No pending requests found.
                        </td>
                      </tr>
                    ) : (
                      filterResults.map((a, idx) => (
                        <React.Fragment key={idx}>
                          <tr>
                            <td>{a.transaction_id}</td>
                            <td>{a.name}</td>
                            <td>{a.employeeCode}</td>
                            <td>{a.tasks?.[0]?.location}</td>
                            <td>{a.tasks?.[0]?.department || "—"}</td>
                            <td>{a.accessType || "—"}</td>
                            <td>{a.vendorFirm || "—"}</td>
                            <td>{a.vendorCode || "—"}</td>
                            <td>{a.vendorName || "—"}</td>
                            <td>{a.allocatedId || "-"}</td>
                                                    <td>{a.trainingStatus || "-"}</td>
                                              <td>
                                                {a.attachmentName ? (
                                                  <a
                                                    href={`${API_BASE}/api/user-requests/${a.id}/attachment`}
                                                    download={a.attachmentName}
                                                    style={{ display: "inline-flex", alignItems: "center" }}
                                                    title={`Download ${a.attachmentName}`}
                                                  >
                                                    <PictureAsPdfIcon
                                                      fontSize="small"
                                                      style={{ color: "#e53935" }}
                                                    />
                                                  </a>
                                                ) : (
                                                  "-"
                                                )}
                                              </td>
                            <td>
                              <div style={{ fontSize: "0.55rem", lineHeight: '1.5', minWidth: '250px' }}>
                                {/* Approver 1 */}
                                <div style={{
                                  marginBottom: '8px',
                                  padding: '8px',
                                  backgroundColor: '#f5f9ff',
                                  borderRadius: '6px',
                                  border: '1px solid #e3f2fd'
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '5px'
                                  }}>
                                    <strong style={{ fontSize: '0.7rem', color: '#1565c0', fontWeight: 600 }}>A1</strong>
                                    <span style={{
                                      fontSize: '0.65rem',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontWeight: 500,
                                      backgroundColor: a.approver1_status === "Approved" ? "#2e7d32" :
                                        a.approver1_status === "Rejected" ? "#d32f2f" : "#ed6c02",
                                      color: '#fff'
                                    }}>
                                      {a.approver1_status || "Pending"}
                                    </span>
                                  </div>
                                  <div style={{
                                    fontSize: '0.7rem',
                                    color: '#424242',
                                    wordBreak: 'break-word',
                                    lineHeight: '1.4'
                                  }}>
                                    {expandedComments[a.transaction_id || idx.toString()]?.a1
                                      ? a.tasks?.[0]?.approver1_comments || "----"
                                      : truncateText(a.tasks?.[0]?.approver1_comments, 12)}
                                  </div>
                                  {a.tasks?.[0]?.approver1_comments &&
                                    a.tasks[0].approver1_comments.split(' ').length > 12 && (
                                      <button
                                        onClick={() => toggleComment(a.transaction_id || idx.toString(), 'a1')}
                                        style={{
                                          marginTop: '5px',
                                          fontSize: '0.65rem',
                                          color: '#1976d2',
                                          background: 'none',
                                          border: 'none',
                                          cursor: 'pointer',
                                          padding: '0',
                                          textDecoration: 'underline',
                                          fontWeight: 500
                                        }}
                                      >
                                        {expandedComments[a.transaction_id || idx.toString()]?.a1 ? 'Show less' : 'Show more'}
                                      </button>
                                    )}
                                </div>

                                {/* Approver 2 */}
                                <div style={{
                                  padding: '8px',
                                  backgroundColor: '#f1f8f4',
                                  borderRadius: '6px',
                                  border: '1px solid #e8f5e9'
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '5px'
                                  }}>
                                    <strong style={{ fontSize: '0.7rem', color: '#2e7d32', fontWeight: 600 }}>A2</strong>
                                    <span style={{
                                      fontSize: '0.65rem',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontWeight: 500,
                                      backgroundColor: a.approver2_status === "Approved" ? "#2e7d32" :
                                        a.approver2_status === "Rejected" ? "#d32f2f" : "#ed6c02",
                                      color: '#fff'
                                    }}>
                                      {a.approver1_status === "Rejected" ? 'N/A' : a.approver2_status || "Pending"}
                                    </span>
                                  </div>
                                  <div style={{
                                    fontSize: '0.7rem',
                                    color: '#424242',
                                    wordBreak: 'break-word',
                                    lineHeight: '1.4'
                                  }}>
                                    {a.approver1_status === "Rejected" ? 'N/A' : (
                                      expandedComments[a.transaction_id || idx.toString()]?.a2
                                        ? a.tasks?.[0]?.approver2_comments || "----"
                                        : truncateText(a.tasks?.[0]?.approver2_comments, 12)
                                    )}
                                  </div>
                                  {a.approver1_status !== "Rejected" &&
                                    a.tasks?.[0]?.approver2_comments &&
                                    a.tasks[0].approver2_comments.split(' ').length > 12 && (
                                      <button
                                        onClick={() => toggleComment(a.transaction_id || idx.toString(), 'a2')}
                                        style={{
                                          marginTop: '5px',
                                          fontSize: '0.65rem',
                                          color: '#2e7d32',
                                          background: 'none',
                                          border: 'none',
                                          cursor: 'pointer',
                                          padding: '0',
                                          textDecoration: 'underline',
                                          fontWeight: 500
                                        }}
                                      >
                                        {expandedComments[a.transaction_id || idx.toString()]?.a2 ? 'Show less' : 'Show more'}
                                      </button>
                                    )}
                                </div>
                              </div>
                            </td>
                            <td>
                              {a.created_on
                                ? new Date(a.created_on).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                                : "-"}
                            </td>
                            <td>{a.status}</td>
                            <td>
                              <button
                                className={addUserRequestStyles.viewTaskBtn}
                                onClick={() =>
                                  toggleRowExpansion(
                                    a.transaction_id || idx.toString()
                                  )
                                }
                              >
                                {expandedRows.includes(
                                  a.transaction_id || idx.toString()
                                )
                                  ? "Hide Tasks"
                                  : `View Tasks (${a.tasks?.length || 0})`}
                              </button>
                            </td>
                          </tr>

                          {expandedRows.includes(
                            a.transaction_id || idx.toString()
                          ) &&
                            a.tasks &&
                            a.tasks.length > 0 && (
                              <tr>
                                <td colSpan={12} style={{ padding: 0 }}>
                                  <div style={{
                                    maxHeight: 400,
                                    overflowY: "auto",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 8,
                                    boxShadow: "0 0 4px rgba(0,0,0,0.05)",
                                  }}>
                                    <table
                                      className={addUserRequestStyles.subTable}
                                    >
                                      <thead>
                                        <tr>
                                          <th>Task Transaction ID</th>
                                          <th>Application / Equip ID</th>
                                          <th>Department</th>
                                          <th>Location</th>
                                          <th>Requestor Role</th>
                                          <th>Granted Role</th>
                                          <th>Status</th>
                                          <th>Comment</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {a.tasks.map((task, tIdx) => (
                                          <tr key={tIdx}>
                                            <td>
                                              {task.transaction_id || "-"}
                                            </td>
                                            <td>
                                              {task.application_name || "-"}
                                            </td>
                                            <td>{task.department || "-"}</td>
                                            <td>{task.location || "-"}</td>
                                            <td>{task.role || "-"}</td>
                                            <td>{task.role || "-"}</td>
                                            <td>{task.task_status || "-"}</td>
                                            <td>{task.remarks || "-"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      <main className={addUserRequestStyles["main-content"]}>
        <header className={styles["main-header"]}>
          <div className={styles.navLeft}>
            <div className={styles.logoWrapper}>
              <img src={login_headTitle2} alt="Logo" className={styles.logo} />
              <span className={styles.version}>version-1.0</span>
            </div>
            <h1 className={styles.title}>User Request Management</h1>
          </div>


          <div className={styles.navRight}>
            <button
              className={addUserRequestStyles["addUserBtn"]}
              onClick={() => {
                setFilter({
                  plant_location: "",
                  department: "",
                  applicationId: "",
                  transactionId: "",
                  employeeCode: user?.employee_code || "",
                });

                setFilterModalOpen(true);
              }}
            >
              Filter User Requests
            </button>

            {user && (

              <div style={{ position: "relative" }} ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={styles.userButton}
                >
                  {/* Avatar */}
                  <div className={styles.avatarContainer}>
                    <div className={styles.avatar}>
                      {(user.name || user.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className={styles.statusDot}></div>
                  </div>

                  {/* User Name */}
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>
                      {user.name || user.username}
                    </span>
                    {user.isITBin && (
                      <span className={styles.userRole}>IT Admin</span>
                    )}
                    {user.isApprover && (
                      <span className={styles.userRole}>Approver</span>
                    )}
                  </div>

                  {/* Dropdown Arrow */}
                  <FiChevronDown
                    size={16}
                    color="#64748b"
                    style={{
                      transition: "transform 0.2s",
                      transform: showUserMenu ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className={styles.dropdownMenu}>
                    <div className={styles.dropdownHeader}>
                      <div className={styles.dropdownAvatar}>
                        <div className={styles.dropdownAvatarCircle}>
                          {(user.name || user.username || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className={styles.dropdownUserInfo}>
                          <span className={styles.dropdownUserName}>
                            {user.name || user.username}
                          </span>
                          {user.employee_code && (
                            <span className={styles.dropdownEmployeeCode}>
                              {user.employee_code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className={styles.dropdownActions}>
                      <AppMenu />
                      <button
                        onClick={handleLogout}
                        className={`${styles.dropdownButton} ${styles.logoutButton}`}
                      >
                        <FiLogOut size={18} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        {/* ===================== Original Form JSX ===================== */}
        <div className={addUserRequestStyles.container}>
          <form
            id="userRequestForm"
            className={addUserRequestStyles.form}
            onSubmit={handleSubmit}
            style={{ width: "100%" }}
          >
            <div className={addUserRequestStyles.scrollFormContainer}>
              {/* ========== VALIDATION ERROR - MOVED TO TOP ========== */}
              {validationError && (
                <div
                  ref={errorRef}
                  style={{
                    padding: "15px 20px",
                    background: "#fdecea",
                    color: "#b71c1c",
                    border: "2px solid #f5c6cb",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    fontSize: "14px",
                    fontWeight: "500",
                    boxShadow: "0 2px 8px rgba(183, 28, 28, 0.15)",
                    animation: "slideDown 0.3s ease-out",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}
                >
                  <span style={{ fontSize: "20px" }}>⚠️</span>
                  <div>
                    <strong style={{ display: "block", marginBottom: "4px" }}>Validation Error</strong>
                    {validationError}
                  </div>
                </div>
              )}

              {/* ========== SUCCESS MESSAGE - ALSO AT TOP ========== */}
              {successMessage && (
                <div style={{
                  padding: "15px 20px",
                  background: "#e6f4ea",
                  color: "#1e7e34",
                  border: "2px solid #c3e6cb",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  fontWeight: "500",
                  boxShadow: "0 2px 8px rgba(30, 126, 52, 0.15)",
                  animation: "slideDown 0.3s ease-out",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}>
                  <span style={{ fontSize: "20px" }}>✅</span>
                  <div>{successMessage}</div>
                </div>
              )}

              {/* Card 1 */}
              <div className={addUserRequestStyles.section}>
                <span className={addUserRequestStyles.sectionHeaderTitle}>
                  Requestor Details
                </span>
                <div className={addUserRequestStyles.fourCol}>
                  <div className={addUserRequestStyles.formGroup}>
                    <select
                      name="request_for_by"
                      value={form.request_for_by}
                      onChange={handleChange}
                      required
                    >
                      <option value="Self">Self</option>
                      <option value="Others">Others</option>
                      <option value="Vendor / OEM">Vendor / OEM</option>
                    </select>
                    <label htmlFor="request_for_by" className={addUserRequestStyles.floatingLabel}>
                      Access For <span style={{ color: "red" }}>*</span></label>
                  </div>
                  <div className={addUserRequestStyles.formGroup}>
                    <input
                      name="employeeCode"
                      value={form.employeeCode}
                      onChange={handleChange}
                      disabled={
                        form.request_for_by === "Self" && !!form.employeeCode
                      }
                      required
                    />
                    <label htmlFor="employeeCode" className={addUserRequestStyles.floatingLabel}>
                      Employee Code <span style={{ color: "red" }}>*</span></label>
                  </div>
                  <div className={addUserRequestStyles.formGroup}>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      disabled={form.request_for_by === "Self" && !!form.name}
                    />
                    <label htmlFor="name" className={addUserRequestStyles.floatingLabel}>
                      Requestor For /By <span style={{ color: "red" }}>*</span></label>
                  </div>

                  <div className={addUserRequestStyles.formGroup}>
                    <input
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      required
                      disabled={!!form.location}
                    />
                    <label htmlFor="location" className={addUserRequestStyles.floatingLabel}>
                      Location <span style={{ color: "red" }}>*</span></label>
                  </div>
                </div>
                <div className={addUserRequestStyles.fourCol}>
                  <div className={addUserRequestStyles.formGroup}>
                    <select
                      name="accessType"
                      value={form.accessType}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select</option>
                      {accessOptions.map((type) => (
                        <option key={type} value={type} title={type}>
                          {type}
                        </option>
                      ))}
                    </select>

                    <label htmlFor="accessType" className={addUserRequestStyles.floatingLabel}>
                      Access Request Type <span style={{ color: "red" }}>*</span></label>
                  </div>
                  {!isBulkDeactivation && (
                    <div className={addUserRequestStyles.formGroup}>
                      <select
                        name="reportsTo"
                        value={form.reportsTo}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            reportsTo: e.target.value,
                          }))
                        }
                        required
                      >
                        <option value="">Select Approver</option>
                        {form.reportsToOptions?.map((mgr) => (
                          <option
                            key={mgr.employeeCode}
                            value={mgr.displayName}
                          >
                            {mgr.displayName}
                          </option>
                        ))}
                      </select>
                      <label htmlFor="reportsTo" className={addUserRequestStyles.floatingLabel}>
                        Approver 1(Manager/Manager's Manager) <span style={{ color: "red" }}>*</span></label>
                    </div>
                  )}
                  <div className={addUserRequestStyles.formGroup}>
                    <select
                      name="trainingStatus"
                      value={form.trainingStatus}
                      onChange={handleChange}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    <label htmlFor="trainingStatus" className={addUserRequestStyles.floatingLabel}>
                      Training Completed <span style={{ color: "red" }}>*</span></label>
                  </div>
                  {form.trainingStatus === "Yes" && (
                    <div className={addUserRequestStyles.formGroup}>
                      <input
                        type="file"
                        name="trainingAttachment"
                        accept="application/pdf"
                        multiple
                        onChange={handleFileChange}
                      />

                      <label htmlFor="trainingAttachment" className={addUserRequestStyles.floatingLabel}>
                        Attachment (PDF,Max 4MB)</label>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2 Vendor Details */}
              {form.request_for_by === "Vendor / OEM" && !isVendorModify && (
                <div className={addUserRequestStyles.section}>
                  <span className={addUserRequestStyles.sectionHeaderTitle}>
                    Vendor Details
                  </span>
                  <div className={addUserRequestStyles.threeCol}>
                    <div className={addUserRequestStyles.formGroup}>
                      <input
                        name="vendorName"
                        value={form.vendorName}
                        onChange={handleChange}
                        required
                      />
                      <label htmlFor="trainingAttachment" className={addUserRequestStyles.floatingLabel}>
                        Vendor Name <span style={{ color: "red" }}>*</span></label>
                    </div>

                    <div className={addUserRequestStyles.formGroup}>
                      <Select
                        classNamePrefix="react-select"
                        placeholder="Search Vendor Firm"
                        options={vendorFirmOptions}
                        value={vendorFirmOptions.find(
                          opt => opt.value === form.vendorFirm
                        )}
                        onChange={(selected) => {
                          setForm(prev => ({
                            ...prev,
                            vendorFirm: selected?.value || "",
                            vendorCode: selected?.vendorCode || "",
                          }));
                        }}
                        isClearable
                      />
                      <label htmlFor="vendorFirm" className={addUserRequestStyles.floatingLabel}>
                        Vendor Firm <span style={{ color: "red" }}>*</span></label>
                    </div>

                    <div className={addUserRequestStyles.formGroup}>
                      <input
                        name="vendorCode"
                        value={form.vendorCode}
                        readOnly
                      />
                      <label htmlFor="vendorCode" className={addUserRequestStyles.floatingLabel}>
                        Vendor Code </label>
                    </div>

                  </div>
                </div>
              )}

              {/* Card 3 Vendor Modify */}
              {isVendorModify && (
                <div className={addUserRequestStyles.section}>
                  <span className={addUserRequestStyles.sectionHeaderTitle}>
                    Vendor Modify
                  </span>

                  {/* Row 1: Vendor Firm Selection */}
                  <div className={addUserRequestStyles.fourCol}>
                    <div className={addUserRequestStyles.formGroup}>
                      <Select
                        classNamePrefix="react-select"
                        placeholder="Search Vendor Firm"
                        options={vendorFirmOptions}
                        value={vendorFirmOptions.find(
                          opt => opt.value === form.vendorFirm
                        )}
                        onChange={(selected) => {
                          setForm(prev => ({
                            ...prev,
                            vendorFirm: selected?.value || "",
                            vendorCode: selected?.vendorCode || "",
                            // Reset dependent fields
                            allocatedId: [],
                            vendorName: [],
                            plant_location: '',
                            department: '',
                            applicationId: '',
                            role: ''
                          }));
                          setSelectedAccessLog(null);
                        }}
                        isClearable
                      />
                      <label htmlFor="vendorFirm" className={addUserRequestStyles.floatingLabel}>
                        Vendor Firm <span style={{ color: "red" }}>*</span>
                      </label>
                    </div>

                    {/* Show Allocated ID dropdown if multiple logs found */}
                    {vendorAccessLogs.length > 1 && (
                      <div className={addUserRequestStyles.formGroup}>
                        <select
                          name="allocatedId"
                          value={selectedAccessLog?.vendor_allocated_id || ''}
                          onChange={(e) => {
                            const selected = vendorAccessLogs.find(
                              log => log.vendor_allocated_id === e.target.value
                            );
                            handleAccessLogSelect(selected);
                          }}
                          required
                        >
                          <option value="">Select Allocated ID</option>
                          {vendorAccessLogs.map((log, idx) => (
                            <option
                              key={idx}
                              value={log.vendor_allocated_id}
                              title={`${log.vendor_allocated_id} - ${log.vendor_name}`}
                            >
                              {log.vendor_allocated_id}
                            </option>
                          ))}
                        </select>
                        <label htmlFor="allocatedId" className={addUserRequestStyles.floatingLabel}>
                          Allocated ID <span style={{ color: "red" }}>*</span>
                        </label>
                      </div>
                    )}

                    {/* Show Allocated ID as input if only one log found */}
                    {vendorAccessLogs.length === 1 && (
                      <div className={addUserRequestStyles.formGroup}>
                        <input
                          name="allocatedId"
                          value={form.allocatedId}
                          readOnly
                        />
                        <label htmlFor="allocatedId" className={addUserRequestStyles.floatingLabel}>
                          Allocated ID <span style={{ color: "red" }}>*</span>
                        </label>
                      </div>
                    )}

                    <div className={addUserRequestStyles.formGroup}>
                      <input
                        name="vendorName"
                        value={form.vendorName}
                        readOnly
                      />
                      <label htmlFor="vendorName" className={addUserRequestStyles.floatingLabel}>
                        Vendor Name <span style={{ color: "red" }}>*</span>
                      </label>
                    </div>

                    <div className={addUserRequestStyles.formGroup}>
                      <input
                        name="vendorCode"
                        value={form.vendorCode}
                        readOnly
                      />
                      <label htmlFor="vendorCode" className={addUserRequestStyles.floatingLabel}>
                        Vendor Code
                      </label>
                    </div>
                  </div>

                  {/* Row 2: Access Information (auto-filled from selected log) */}
                  <div className={addUserRequestStyles.fourCol}>
                    <div className={addUserRequestStyles.formGroup}>
                      <select
                        name="plant_location"
                        value={form.plant_location}
                        onChange={handleChange}
                        disabled
                        required
                      >
                        <option value="">Select Plant</option>
                        {plants.map((plant) => (
                          <option
                            key={plant.id}
                            value={plant.id}
                            title={plant.plant_name}
                          >
                            {plant.plant_name}
                          </option>
                        ))}
                      </select>
                      <label htmlFor="plant_location" className={addUserRequestStyles.floatingLabel}>
                        Plant Location <span style={{ color: "red" }}>*</span>
                      </label>
                    </div>

                    <div className={addUserRequestStyles.formGroup}>
                      <select
                        name="department"
                        value={form.department}
                        onChange={handleChange}
                        disabled
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option
                            key={dept.id}
                            value={dept.id}
                            title={dept.department_name}
                          >
                            {dept.department_name}
                          </option>
                        ))}
                      </select>
                      <label htmlFor="department" className={addUserRequestStyles.floatingLabel}>
                        Req. App. Department <span style={{ color: "red" }}>*</span>
                      </label>
                    </div>

                    <div className={addUserRequestStyles.formGroup}>
                      <select
                        name="applicationId"
                        value={form.applicationId}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Application / Equipment ID</option>
                        {applications.map((app, index) => (
                          <option key={index} value={app.id} title={app.name}>
                            {app.name}
                          </option>
                        ))}
                      </select>
                      <label htmlFor="applicationId" className={addUserRequestStyles.floatingLabel}>
                        Application / Equipment ID <span style={{ color: "red" }}>*</span>
                      </label>
                    </div>

                    <div className={addUserRequestStyles.formGroup}>
                      <Select<RoleOption, boolean>
                        isMulti={isMultipleRoleAllowed}
                        options={roleOptions}
                        isDisabled={!isRoleEnabled}
                        value={
                          isMultipleRoleAllowed
                            ? roleOptions.filter(opt => form.role.includes(opt.value))
                            : roleOptions.find(opt => opt.value === form.role[0]) ?? null
                        }
                        onChange={(selected) =>
                          handleRoleChange(selected, (roles) =>
                            setForm(prev => ({ ...prev, role: roles }))
                          )
                        }
                        // placeholder={
                        //   isRoleEnabled ? "Select Role" : "Role not applicable"
                        // }
                        closeMenuOnSelect={!isMultipleRoleAllowed}
                        classNamePrefix="react-select"
                      />

                      <label htmlFor="role" className={addUserRequestStyles.floatingLabel}>
                        Role1{" "}
                        {isRoleEnabled && <span style={{ color: "red" }}>*</span>}
                      </label>
                    </div>

                  </div>
                  {/* ── User Type (Permanent / Temporary) – single New User Creation ── */}
                  {(form.accessType === "New User Creation" || form.accessType === "Bulk New User Creation") && (
                    <div className={addUserRequestStyles.fourCol}>
                      <div className={addUserRequestStyles.formGroup}>
                        <select
                          name="userRequestType"
                          value={form.userRequestType}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "Temporary") {
                              const today = new Date().toISOString().split("T")[0];
                              setForm((prev) => ({
                                ...prev,
                                userRequestType: "Temporary",
                                fromDate: today,
                                toDate: "",
                              }));
                            } else {
                              setForm((prev) => ({
                                ...prev,
                                userRequestType: value as "Permanent" | "",
                                fromDate: "",
                                toDate: "",
                              }));
                            }
                          }}
                          className={addUserRequestStyles.selectBox}
                          required
                        >
                          <option value="">-- Select User Type --</option>
                          <option value="Permanent">Permanent</option>
                          <option value="Temporary">Temporary</option>
                        </select>
                        <label htmlFor="userRequestType" className={addUserRequestStyles.floatingLabel}>
                          User Type <span style={{ color: "red" }}>*</span>
                        </label>
                      </div>

                      {form.userRequestType === "Temporary" && (
                        <>
                          <div className={addUserRequestStyles.formGroup}>
                            <input
                              type="date"
                              name="fromDate"
                              value={form.fromDate}
                              readOnly
                              className={addUserRequestStyles.inputField}
                            />
                            <label htmlFor="fromDate" className={addUserRequestStyles.floatingLabel}>From Date</label>
                          </div>
                          <div className={addUserRequestStyles.formGroup}>
                            <input
                              type="date"
                              name="toDate"
                              value={form.toDate}
                              min={form.fromDate}
                              onChange={handleChange}
                              className={addUserRequestStyles.inputField}
                              required
                            />
                            <label htmlFor="toDate" className={addUserRequestStyles.floatingLabel}>
                              To Date <span style={{ color: "red" }}>*</span>
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {/* Row 3: Remarks */}
                  <div className={addUserRequestStyles.formGroup}>
                    <textarea
                      name="remarks"
                      value={form.remarks}
                      onChange={handleChange}
                      style={{
                        minHeight: "40px",
                        maxHeight: "42px",
                        resize: "vertical",
                      }}
                      maxLength={50}
                    />
                    <label htmlFor="remarks" className={addUserRequestStyles.floatingLabel}>
                      Remarks
                    </label>
                  </div>

                  {/* Info message */}
                  {vendorAccessLogs.length === 0 && form.vendorFirm && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffc107',
                      borderRadius: '4px',
                      color: '#856404',
                      fontSize: '14px',
                      marginTop: '10px'
                    }}>
                      ⚠️ No closed access logs found for this vendor firm.
                    </div>
                  )}
                </div>
              )}

              {/* Card 4 Access Information */}
              {(isBulkDeactivation ||
                (!isVendorModify && !isBulkDeactivation)) && (
                  <div className={addUserRequestStyles.section}>
                    <span className={addUserRequestStyles.sectionHeaderTitle}>
                      Access Information
                    </span>
                    <div className={addUserRequestStyles.fourCol}>
                      <div className={addUserRequestStyles.formGroup}>
                        <select
                          name="plant_location"
                          value={form.plant_location}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select Plant</option>
                          {plants.map((plant) => (
                            <option
                              key={plant.id}
                              value={plant.id}
                              title={plant.plant_name}
                            >
                              {plant.plant_name}
                            </option>
                          ))}
                        </select>
                        <label htmlFor="plant_location" className={addUserRequestStyles.floatingLabel}>
                          Plant Location <span style={{ color: "red" }}>*</span></label>
                      </div>
                      <div className={addUserRequestStyles.formGroup}>
                        <select
                          name="department"
                          value={form.department}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept) => (
                            <option
                              key={dept.id}
                              value={dept.id}
                              title={dept.department_name}
                            >
                              {dept.department_name}
                            </option>
                          ))}
                        </select>

                        <label htmlFor="department" className={addUserRequestStyles.floatingLabel}>
                          Req. App. Department <span style={{ color: "red" }}>*</span></label>
                      </div>
                      {!isBulkDeactivation && !isBulkNew && (
                        <div className={addUserRequestStyles.formGroup}>
                          <select
                            name="applicationId"
                            value={form.applicationId}
                            onChange={handleChange}
                            required
                          >
                            <option value="">
                              Select Application / Equipment ID
                            </option>
                            {applications.map((app, index) => (
                              <option key={index} value={app.id} title={app.name}>
                                {app.name}
                              </option>
                            ))}
                          </select>
                          <label htmlFor="applicationId" className={addUserRequestStyles.floatingLabel}>
                            Application / Equipment ID <span style={{ color: "red" }}>*</span></label>
                        </div>
                      )}

                      {/* Role selector + status banners */}
                      {!isBulkDeactivation && !isBulkNew && (
                        <div className={addUserRequestStyles.formGroup}>

                          <Select<RoleOption, boolean>
                            isMulti={isMultipleRoleAllowed}
                            options={roleOptions}
                            value={
                              isMultipleRoleAllowed
                                ? roleOptions.filter(opt => form.role.includes(opt.value))
                                : roleOptions.find(opt => opt.value === form.role[0]) ?? null
                            }
                            onChange={(selected) =>
                              handleRoleChange(selected, (newRoles) =>
                                setForm(prev => ({ ...prev, role: newRoles }))
                              )
                            }
                            placeholder={isRoleEnabled ? "Select Role" : "Role not applicable"}
                            closeMenuOnSelect={!isMultipleRoleAllowed}
                            classNamePrefix="react-select"
                            isDisabled={
                              // 1. Role not applicable at all (Password Reset, etc.)
                              !isRoleEnabled ||
                              // 2. Other non-creation/modify types that pre-fill from log and should be locked
                              (
                                form.accessType !== "Modify Access" &&
                                form.accessType !== "New User Creation" &&
                                form.accessType !== "Bulk New User Creation" &&
                                accessLogRoleLoaded &&
                                accessLogRoleFound
                              )
                            }
                          />

                          <label htmlFor="role" className={addUserRequestStyles.floatingLabel}>
                            Role{" "}
                            {isRoleEnabled && <span style={{ color: "red" }}>*</span>}
                          </label>

                          {/* ─────────────────────────────────────────────────────────
                              STATUS BANNERS
                              Shown when all 3 keys are filled AND accessType is relevant
                          ───────────────────────────────────────────────────────── */}
                          {form.accessType &&
                            form.accessType !== "Bulk De-activation" &&
                            form.plant_location &&
                            form.department &&
                            form.applicationId && (
                              <>
                                {/* ── LOADING ── */}
                                {!accessLogRoleLoaded && (
                                  <div style={{
                                    marginTop: '6px', padding: '8px 10px',
                                    backgroundColor: '#e3f2fd', border: '1px solid #90caf9',
                                    borderRadius: '4px', color: '#1565c0', fontSize: '13px'
                                  }}>
                                    ⏳ Fetching role from access log…
                                  </div>
                                )}

                                {/* ── MODIFY ACCESS banners ── */}
                                {form.accessType === "Modify Access" && accessLogRoleLoaded && (
                                  <>
                                    {/* user has NOT changed role from what's in log → red error (blocks submit) */}
                                    {accessLogRoleFound && duplicateRoleError && (
                                      <div style={{
                                        marginTop: '6px', padding: '10px 12px',
                                        backgroundColor: '#fdecea', border: '2px solid #f5c6cb',
                                        borderRadius: '4px', color: '#b71c1c',
                                        fontSize: '13px', fontWeight: '500'
                                      }}>
                                        ⛔ {duplicateRoleError}
                                      </div>
                                    )}
                                    {/* user HAS changed role to something different → green confirmation */}
                                    {accessLogRoleFound && !duplicateRoleError && (
                                      <div style={{
                                        marginTop: '6px', padding: '8px 10px',
                                        backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7',
                                        borderRadius: '4px', color: '#2e7d32', fontSize: '13px'
                                      }}>
                                        ✅ Role changed. You may submit to modify access.
                                      </div>
                                    )}
                                    {/* no log at all → red error (blocks submit) */}
                                    {!accessLogRoleFound && (
                                      <div style={{
                                        marginTop: '6px', padding: '10px 12px',
                                        backgroundColor: '#fdecea', border: '2px solid #f5c6cb',
                                        borderRadius: '4px', color: '#b71c1c',
                                        fontSize: '13px', fontWeight: '500'
                                      }}>
                                        ⛔ No access log data found for the selected Plant, Department &amp; Application for this user.
                                        Cannot modify access that does not exist.
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* ── NEW USER CREATION banners ── */}
                                {(form.accessType === "New User Creation" || form.accessType === "Bulk New User Creation") && accessLogRoleLoaded && (
                                  <>
                                    {/* user picked a role that already exists → amber warning (not blocking) */}
                                    {duplicateRoleError && (
                                      <div style={{
                                        marginTop: '6px', padding: '10px 12px',
                                        backgroundColor: '#fff3cd', border: '1px solid #ffc107',
                                        borderRadius: '4px', color: '#856404', fontSize: '13px'
                                      }}>
                                        ⚠️ {duplicateRoleError}
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* ── OTHER non-creation/modify types (Password Reset, Active, Deactivation…) ── */}
                                {form.accessType !== "Modify Access" &&
                                  form.accessType !== "New User Creation" &&
                                  form.accessType !== "Bulk New User Creation" &&
                                  accessLogRoleLoaded && (
                                    <>
                                      {accessLogRoleFound && (
                                        <div style={{
                                          marginTop: '6px', padding: '8px 10px',
                                          backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7',
                                          borderRadius: '4px', color: '#2e7d32', fontSize: '13px'
                                        }}>
                                          ✅ Role pre-filled from existing access log (read-only).
                                        </div>
                                      )}
                                      {!accessLogRoleFound && (
                                        <div style={{
                                          marginTop: '6px', padding: '10px 12px',
                                          backgroundColor: '#fdecea', border: '2px solid #f5c6cb',
                                          borderRadius: '4px', color: '#b71c1c',
                                          fontSize: '13px', fontWeight: '500'
                                        }}>
                                          ⛔ No access log data found for the selected Plant, Department &amp; Application for this user.
                                          Cannot process request without existing access.
                                        </div>
                                      )}
                                    </>
                                  )}
                              </>
                            )}
                        </div>
                      )}
                    </div>
                    {/* ── User Type (Permanent / Temporary) – single New User Creation ── */}
                    {(form.accessType === "New User Creation" || form.accessType === "Bulk New User Creation") && (
                      <div className={addUserRequestStyles.fourCol}>
                        <div className={addUserRequestStyles.formGroup}>
                          <select
                            name="userRequestType"
                            value={form.userRequestType}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "Temporary") {
                                const today = new Date().toISOString().split("T")[0];
                                setForm((prev) => ({
                                  ...prev,
                                  userRequestType: "Temporary",
                                  fromDate: today,
                                  toDate: "",
                                }));
                              } else {
                                setForm((prev) => ({
                                  ...prev,
                                  userRequestType: value as "Permanent" | "",
                                  fromDate: "",
                                  toDate: "",
                                }));
                              }
                            }}
                            className={addUserRequestStyles.selectBox}
                            required
                          >
                            <option value="">-- Select User Type --</option>
                            <option value="Permanent">Permanent</option>
                            <option value="Temporary">Temporary</option>
                          </select>
                          <label htmlFor="userRequestType" className={addUserRequestStyles.floatingLabel}>
                            User Type <span style={{ color: "red" }}>*</span>
                          </label>
                        </div>

                        {form.userRequestType === "Temporary" && (
                          <>
                            <div className={addUserRequestStyles.formGroup}>
                              <input
                                type="date"
                                name="fromDate"
                                value={form.fromDate}
                                readOnly
                                className={addUserRequestStyles.inputField}
                              />
                              <label htmlFor="fromDate" className={addUserRequestStyles.floatingLabel}>From Date</label>
                            </div>
                            <div className={addUserRequestStyles.formGroup}>
                              <input
                                type="date"
                                name="toDate"
                                value={form.toDate}
                                min={form.fromDate}
                                onChange={handleChange}
                                className={addUserRequestStyles.inputField}
                                required
                              />
                              <label htmlFor="toDate" className={addUserRequestStyles.floatingLabel}>
                                To Date <span style={{ color: "red" }}>*</span>
                              </label>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <div className={addUserRequestStyles.formGroup}>
                      <label></label>
                      <textarea
                        name="remarks"
                        value={form.remarks}
                        onChange={handleChange}
                        maxLength={50}
                      />

                      <label htmlFor="remarks" className={addUserRequestStyles.floatingLabel}>
                        Remarks</label>
                    </div>
                  </div>
                )}
              {isBulkDeactivation && (
                <div className={addUserRequestStyles.section}>
                  <span className={addUserRequestStyles.sectionHeaderTitle}>
                    Bulk De-activation - Active Access Logs
                  </span>

                  {loadingBulkLogs ? (
                    <div style={{ padding: "20px", textAlign: "center" }}>
                      Loading access logs...
                    </div>
                  ) : bulkDeactivationLogs.length === 0 ? (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffc107',
                      borderRadius: '4px',
                      color: '#856404',
                      fontSize: '14px'
                    }}>
                      No active access logs found for the selected Plant and Department.
                    </div>
                  ) : (
                    <div className={addUserRequestStyles.tableContainer}>
                      <table className={addUserRequestStyles.table}>
                        <thead>
                          <tr>
                            <th>Location</th>
                            <th>Department</th>
                            <th>Application / Equipment</th>
                            <th>Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkDeactivationLogs.map((log, index) => (
                            <tr key={index}>

                              <td>{log.location_name}</td>
                              <td>{log.department_name}</td>
                              <td>{log.application_name}</td>
                              <td>{log.role_name}</td>

                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{
                        marginTop: '12px',
                        padding: '10px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        color: '#1565c0'
                      }}>
                        <strong>{bulkDeactivationLogs.length}</strong> active access log(s) will be deactivated upon submission.
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Card 6 Bulk User Creation */}
              {form.request_for_by !== "Vendor / OEM" && isBulkNew && (
                <div className={addUserRequestStyles.section}>
                  <span className={addUserRequestStyles.sectionHeaderTitle}>
                    Bulk User Creation
                  </span>


                  <div>
                    <div>
                      {bulkRows.length < 7 && (
                        <div className={addUserRequestStyles.addRowWrapper}>
                          <button
                            type="button"
                            onClick={handleAddRow}
                            className={addUserRequestStyles.addRowBtn}
                          >
                            +
                          </button>
                        </div>
                      )}
                      <div className={addUserRequestStyles.tableContainer}>
                        <table className={addUserRequestStyles.table}>
                          <thead>
                            <tr>
                              <th>Location</th>
                              <th>Department</th>
                              <th>Application / Equipment ID</th>
                              <th>Role</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkRows.map((row, index) => (
                              <tr key={index}>
                                {/* Plant Location (read-only, from main form) */}
                                <td>
                                  <select
                                    value={form.plant_location} // stores ID
                                    disabled
                                  >
                                    {plants.map((plant) => (
                                      <option key={plant.id} value={plant.id}>
                                        {plant.plant_name}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                {/* Department (read-only, from main form) */}
                                <td>
                                  <select
                                    value={form.department} // stores ID
                                    disabled
                                  >
                                    {departments.map((dept) => (
                                      <option key={dept.id} value={dept.id}>
                                        {dept.department_name}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                {/* Application dropdown */}
                                <td>
                                  <select
                                    value={row.applicationId}
                                    onChange={(e) =>
                                      handleBulkRowChange(
                                        index,
                                        "applicationId",
                                        e.target.value
                                      )
                                    }
                                    required
                                  >
                                    <option value="">Select Application</option>
                                    {applications.map((app) => (
                                      <option
                                        key={app.id}
                                        value={app.id}
                                        title={app.name}
                                      >
                                        {app.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                {/* Role dropdown */}
                                <td>
                                  <Select
                                    isMulti={isMultipleRoleAllowed}
                                    options={buildBulkRoleOptions(index, row.applicationId)}
                                    value={buildBulkRoleOptions(index, row.applicationId).filter(opt =>
                                      row.role.includes(opt.value)
                                    )}
                                    onChange={(selected) =>
                                      handleRoleChange(selected, (roles) => {
                                        const updated = [...bulkRows];
                                        updated[index].role = roles;
                                        setBulkRows(updated);
                                      })
                                    }
                                    closeMenuOnSelect={!isMultipleRoleAllowed}
                                    classNamePrefix="react-select"
                                  />

                                </td>

                                {/* Delete button */}
                                <td>
                                  <button
                                    type="button"
                                    className={addUserRequestStyles.deleteBtn}
                                    onClick={() => handleRemoveRow(index)}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Move the footer buttons to the top */}
              <div className={addUserRequestStyles.formFooter}>
                <div className={addUserRequestStyles.formActions}>
                  <button
                    type="submit"
                    className={addUserRequestStyles.saveBtn}
                    disabled={isSubmitDisabled}
                    style={isSubmitDisabled ? {
                      opacity: 0.45,
                      cursor: 'not-allowed',
                      pointerEvents: 'none',
                    } : {}}
                    title={isSubmitDisabled ? "Please fill all required fields and resolve any errors before submitting." : ""}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                  <button
                    type="button"
                    className={addUserRequestStyles.cancelBtn}
                    onClick={() => navigate("/homepage")}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
export default AddUserRequest;