import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useUserRequestContext,
  UserRequest,
  TaskRequest,
  Manager,
} from "./UserRequestContext";
import {
  FiChevronDown,
  FiMail,
  FiMapPin,
  FiBriefcase,
  FiLogOut,
  FiShield,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiTrendingUp,
  FiFileText,
  FiSettings,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { fetchPlants } from "../../utils/api";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import addUserRequestStyles from "./AddUserRequest.module.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import styles from "../../pages/HomePage/homepageUser.module.css";
export const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:4000";
const AddUserRequest: React.FC = () => {
  const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
  
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
  const { addUserRequest } = useUserRequestContext();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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
  console.log(user);
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
    role: "",
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
    vendorFirm: [],
    vendorCode: [],
    allocatedId: [],
  });
console.log("form data",form);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [bulkRows, setBulkRows] = useState([
    { location: "", department: "", applicationId: "", role: "" },
  ]);
  const [modalTasks, setModalTasks] = useState<TaskRequest[] | null>(null);
  const [plants, setPlants] = useState<{ id: number; plant_name: string }[]>(
    []
  );
  const [departments, setDepartments] = useState<
    { id: number; department_name: string }[]
  >([]);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [applications, setApplications] = useState<
    { id: string; name: string }[]
  >([]);

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
      if (value === "Self") {
        // Autofill from logged-in user
        setForm((prev) => ({
          ...prev,
          request_for_by: "Self",
          name: user?.name || "",
          employeeCode: user?.employee_code || "",
          location: user?.location || "",
        }));
      } else {
        // Clear fields for Others/Vendor
        setForm((prev) => ({
          ...prev,
          request_for_by: value as "Others" | "Vendor / OEM",
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
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 1) {
        alert("You can only upload one file.");
        return;
      }
      if (files[0].size > 4 * 1024 * 1024 * 1024) {
        alert("The file size must be less than or equal to 4GB.");
        return;
      }
      setAttachments(files);
    }
  };

  const handleAddRow = () => {
    if (bulkRows.length < 7) {
      setBulkRows([
        ...bulkRows,
        {
          location: form.plant_location,
          department: form.department,
          applicationId: "",
          role: "",
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
      setFilterResults(data);
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
        } | Access Type: ${req.accessType || "-"}
    | Approver 1: ${"Pending"} | Approver 2: ${"Pending"} | Status: ${"Pending"}`;
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // =================== Validations ===================
    if (
      form.request_for_by === "Vendor / OEM" &&
      form.accessType === "Modify Access"
    ) {
      if (!form.vendorFirm || !form.allocatedId) {
        alert(
          "Vendor Firm and Allocated ID are required for Vendor/OEM Modify."
        );
        return;
      }
    }

    if (form.accessType === "Bulk New User Creation" && bulkRows.length === 0) {
      alert("Please add at least one bulk entry.");
      return;
    }

    if (
      form.trainingStatus === "Yes" &&
      (form.accessType === "New User Creation" ||
        form.accessType === "Bulk New User Creation") &&
      attachments.length === 0
    ) {
      alert("Attachment is mandatory for training records.");
      return;
    }

    // =================== Approver Info ===================
    const approver1 = form.reportsToOptions[0]; // Manager
    const approver2 = form.reportsToOptions[1]; // Managers Manager (second level)

    // Convert to string to satisfy TypeScript
    const approver1_id_str = String(approver1?.employeeCode || "");
    const approver2_id_str = "";

    const approver1_email = approver1?.email || "";
    const approver2_email = "";

    // =================== Build Tasks ===================
    const tasks: TaskRequest[] = [];

    if (form.accessType === "Bulk New User Creation") {
      bulkRows.forEach((row) => {
        tasks.push({
          application_equip_id: row.applicationId,
          department: form.department,
          role: row.role,
          location: form.plant_location,
          reports_to: form.reportsTo,
          task_status: "Pending",
          approver1_id: approver1_id_str,
          approver2_id: '',
        });
      });
    } else {
      tasks.push({
        application_equip_id: form.applicationId,
        department: form.department,
        role: form.role,
        location: form.plant_location,
        reports_to: form.reportsTo,
        task_status: "Pending",
        approver1_id: approver1_id_str,
        approver2_id: '',
      });
    }

    // =================== Build FormData ===================
    const formData = new FormData();

    formData.append("request_for_by", form.request_for_by || "");
    formData.append("name", form.name || "");
    formData.append("employee_code", form.employeeCode || "");
    formData.append("employee_location", form.location || "");
    formData.append("plant_location", form.plant_location || "");
    formData.append("department", form.department || "");
    formData.append("role", form.role || "");
    formData.append("status", form.status || "Pending");
    formData.append("reports_to", form.reportsTo || "");
    formData.append("training_status", form.trainingStatus || "");
    formData.append("access_request_type", form.accessType || "");
    formData.append("vendor_name", form.vendorName?.toString() || "");
    formData.append("vendor_firm", form.vendorFirm?.toString() || "");
    formData.append("vendor_code", form.vendorCode?.toString() || "");
    formData.append("vendor_allocated_id", form.allocatedId?.toString() || "");

    // Approver info
    formData.append("approver1_email", approver1_email);
    formData.append("approver2_email",  "");
    formData.append("approver1_status", "Pending");
    formData.append("approver2_status", "Pending");

    // Attach file
    if (attachments.length > 0) {
      formData.append("training_attachment", attachments[0]);
    }

    // Attach tasks
    formData.append("tasks", JSON.stringify(tasks));

    console.log("Submitting FormData:", Object.fromEntries(formData.entries()));

    try {
      await addUserRequest(formData); // send FormData to backend
      alert("Request submitted successfully!");
      navigate("/user-access-management");
    } catch (err) {
      console.error("Failed to save request:", err);
      alert("Something went wrong while saving the request.");
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
    if (form.vendorName.length > 0) {
      fetch(`/api/vendors/${form.vendorName}`)
        .then((res) => res.json())
        .then((data) =>
          setForm((prev) => ({
            ...prev,
            vendorFirm: data.firm,
            vendorCode: data.code,
          }))
        );
    }
  }, [form.vendorName]);

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

  const handleLogout = () => {
    logout();
    navigate("/");
  };

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
                  <label htmlFor="plant_location">
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
                  <label htmlFor="department">
                    Department <span style={{ color: "red" }}>*</span>
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
                  <label htmlFor="applicationId">Application</label>
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
                  <label htmlFor="transactionId">Transaction ID</label>
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
                  <label htmlFor="employeeCode">Employee Code</label>
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
              <div style={{ overflowX: "auto" }}>
                <table className={addUserRequestStyles.table}>
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Name</th>
                      <th>Employee Code</th>
                      <th>Location</th>
                      <th>Department</th>
                      <th>Access Type</th>
                      <th>Approver 1</th>
                      <th>Approver 2</th>
                      <th>Status</th>
                      <th>Task</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterResults.length > 0 ? (
                      filterResults.map((r, idx) => (
                        <React.Fragment key={idx}>
                          <tr>
                            <td>{r.transaction_id}</td>
                            <td>{r.name}</td>
                            <td>{r.employeeCode}</td>
                            <td>{r.tasks?.[0]?.location}</td>
                            <td>{r.tasks?.[0]?.department || "—"}</td>
                            <td>{r.accessType || "—"}</td>
                            <td>{"Pending"}</td>
                            <td>{"Pending"}</td>
                            <td>{r.status}</td>
                            <td>
                              <button
                                className={addUserRequestStyles.viewTaskBtn}
                                onClick={() =>
                                  toggleRowExpansion(
                                    r.transaction_id || idx.toString()
                                  )
                                }
                              >
                                {expandedRows.includes(
                                  r.transaction_id || idx.toString()
                                )
                                  ? "Hide Tasks"
                                  : `View Tasks (${r.tasks?.length || 0})`}
                              </button>
                            </td>
                          </tr>

                          {/* Collapsible task rows */}
                          {expandedRows.includes(
                            r.transaction_id || idx.toString()
                          ) &&
                            r.tasks &&
                            r.tasks.length > 0 && (
                              <tr>
                                <td colSpan={10} style={{ padding: 0 }}>
                                  <div style={{ overflowX: "auto" }}>
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
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {r.tasks.map((task, tIdx) => (
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
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center" }}>
                          No records found
                        </td>
                      </tr>
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
          <h1 className={styles.title}>User Access Management</h1>
        </div>


        <div className={styles.navRight}>
          <button
              className={addUserRequestStyles["addUserBtn"]}
              onClick={() => setFilterModalOpen(true)}
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
                     <button
                      onClick={() => navigate("/homepage")}
                      className={styles.dropdownButton}
                    >
                      <FiBriefcase size={16} />
                      <span>Home</span>
                    </button>
                    <button
                      onClick={() => navigate("/user-access-management")}
                      className={styles.dropdownButton}
                    >
                      <FiBriefcase size={16} />
                      <span>User Access Management</span>
                    </button>
                    {user?.isITBin && (
                      <button
                        onClick={() => navigate("/task")}
                        className={styles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Task Closure</span>
                      </button>
                    )}
                     {user?.isApprover && (
                      <button
                        onClick={() => navigate("/approver/pending")}
                        className={styles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Pending Approval</span>
                      </button>
                    )}
                    {user?.isApprover && (
                      
                      <button
                        onClick={() => navigate("/approver/history")}
                        className={styles.dropdownButton}
                      >
                        <FiBriefcase size={16} />
                         <span>Approval History</span>
                      </button>
                    )}
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
                    <label htmlFor="request_for_by">
                      Access For <span style={{ color: "red" }}>*</span>
                    </label>
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
                    <label htmlFor="employeeCode">
                      Employee Code <span style={{ color: "red" }}>*</span>
                    </label>
                  </div>
                  <div className={addUserRequestStyles.formGroup}>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      disabled={form.request_for_by === "Self" && !!form.name}
                    />
                    <label htmlFor="name">
                      Requestor For /By <span style={{ color: "red" }}>*</span>
                    </label>
                  </div>

                  <div className={addUserRequestStyles.formGroup}>
                    <input
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      required
                      disabled={!!form.location}
                    />
                    <label htmlFor="location">
                      Location <span style={{ color: "red" }}>*</span>
                    </label>
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
                    <label htmlFor="accessType">
                      Access Request Type{" "}
                      <span style={{ color: "red" }}>*</span>
                    </label>
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
                      <label htmlFor="reportsTo">
                        Approver 1(Manager/Manager's Manager){" "}
                        <span style={{ color: "red" }}>*</span>
                      </label>
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
                    <label htmlFor="trainingStatus">
                      Training Completed <span style={{ color: "red" }}>*</span>
                    </label>
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
                      <label htmlFor="trainingAttachment">
                        Attachment (PDF,Max 4MB)
                      </label>
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
                      <label htmlFor="vendorName">
                        Vendor Name <span style={{ color: "red" }}>*</span>
                      </label>
                    </div>
                    <div className={addUserRequestStyles.formGroup}>
                      <input
                        name="vendorFirm"
                        value={form.vendorFirm}
                        onChange={handleChange}
                        required
                      />
                      <label htmlFor="vendorFirm">
                        Vendor Firm <span style={{ color: "red" }}>*</span>
                      </label>
                    </div>
                    <div className={addUserRequestStyles.formGroup}>
                      <input
                        name="vendorCode"
                        value={form.vendorCode}
                        onChange={handleChange}
                      />
                      <label htmlFor="vendorCode">Vendor Code</label>
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
                  <div className={addUserRequestStyles.fourCol}>
                    <div className={addUserRequestStyles.formGroup}>
                      <input
                        name="vendorFirm"
                        value={form.vendorFirm}
                        onChange={handleChange}
                        required
                      />
                      <label htmlFor="vendorFirm">
                        Vendor Firm <span style={{ color: "red" }}>*</span>
                      </label>
                    </div>
                    <div className={addUserRequestStyles.formGroup}>
                      <input
                        name="allocatedId"
                        value={form.allocatedId}
                        onChange={handleChange}
                        required
                      />
                      <label htmlFor="allocatedId">
                        Allocated ID <span style={{ color: "red" }}>*</span>
                      </label>
                    </div>
                    <div className={addUserRequestStyles.formGroup}>
                      <input name="vendorName" value={form.vendorName} />
                      <label htmlFor="vendorName">
                        Vendor Name <span style={{ color: "red" }}>*</span>
                      </label>
                    </div>
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
                      <label htmlFor="plant_location">
                        Plant Location <span style={{ color: "red" }}>*</span>
                      </label>
                    </div>
                  </div>
                  <div className={addUserRequestStyles.fourCol}>
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
                      <label htmlFor="department">
                        Department <span style={{ color: "red" }}>*</span>
                      </label>
                    </div>
                    <div className={addUserRequestStyles.formGroup}>
                      <select
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Role</option>
                        {roles.map((role) => (
                          <option
                            key={role.id}
                            value={role.id}
                            title={role.name}
                          >
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <label htmlFor="role">
                        Role <span style={{ color: "red" }}>*</span>
                      </label>
                    </div>

                    <div className={addUserRequestStyles.formGroup}>
                      <textarea
                        name="remarks"
                        style={{
                          minHeight: "40px",
                          maxHeight: "42px",
                          resize: "vertical",
                        }}
                        maxLength={50}
                      />
                      <label htmlFor="remarks">Remarks </label>
                    </div>
                  </div>
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
                        <label htmlFor="plant_location">
                          Plant Location <span style={{ color: "red" }}>*</span>{" "}
                        </label>
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
                        <label htmlFor="department">
                          Req. App. Department <span style={{ color: "red" }}>*</span>{" "}
                        </label>
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
                          <label htmlFor="applicationId">
                            Application / Equipment ID{" "}
                            <span style={{ color: "red" }}>*</span>
                          </label>
                        </div>
                      )}
                      {!isBulkDeactivation && !isBulkNew && (
                        <div className={addUserRequestStyles.formGroup}>
                          <select
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                            required
                          >
                            <option value="">Select Role</option>
                            {roles.map((role) => (
                              <option
                                key={role.id}
                                value={role.id}
                                title={role.name}
                              >
                                {role.name}
                              </option>
                            ))}
                          </select>
                          <label htmlFor="role">
                            Role <span style={{ color: "red" }}>*</span>
                          </label>
                        </div>
                      )}
                    </div>
                    <div className={addUserRequestStyles.formGroup}>
                      <label></label>
                      <textarea
                        name="remarks"
                        value={form.remarks}
                        onChange={handleChange}
                        maxLength={50}
                      />
                      <label htmlFor="remarks">Remarks</label>
                    </div>
                  </div>
                )}

              {/* Card 5 Bulk User Creation */}
              {form.request_for_by !== "Vendor / OEM" && isBulkNew && (
                <div className={addUserRequestStyles.section}>
                  <span className={addUserRequestStyles.sectionHeaderTitle}>
                    Bulk User Creation
                  </span>
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
                                <select
                                  value={row.role}
                                  onChange={(e) =>
                                    handleBulkRowChange(
                                      index,
                                      "role",
                                      e.target.value
                                    )
                                  }
                                  required
                                >
                                  <option value="">Select Role</option>
                                  {roles.map((role) => (
                                    <option
                                      key={role.id}
                                      value={role.id}
                                      title={role.name}
                                    >
                                      {role.name}
                                    </option>
                                  ))}
                                </select>
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
              )}
            </div>
            {/* Move the footer buttons to the top */}
            <div className={addUserRequestStyles.formFooter}>
              <div className={addUserRequestStyles.formActions}>
                <button type="submit" className={addUserRequestStyles.saveBtn}>
                  Submit
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
          </form>
        </div>
      </main>
    </div>
  );
};

export default AddUserRequest;
