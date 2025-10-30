import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import serviceRequestStyles from "./AddServiceRequest.module.css";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { API_BASE } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ServiceRequestForm = () => {
  const navigate = useNavigate();
  const [attachments, setAttachments] = useState<File[]>([]);
  const { user, logout } = useAuth();

  // ===================== States =====================
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [filterResults, setFilterResults] = useState([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [departments, setDepartments] = useState([]);

  const [form, setForm] = useState({
    requestType: "Service Request",
    category: "",
    subcategory: "",
    systemName: "",
    priority: "",
    impact: "",
    department: "",
    requester_name: "",
    requester_location: "",
    requester_department: "",
    description: "",
    attachment: null,
    approver1: "",
    approver2: "",
    adhocApprovalFrom: "",
  });

  const [filter, setFilter] = useState({
    department: "",
    category: "",
    priority: "",
    transactionId: "",
  });

  // ===================== API Calls =====================
  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/departments`);
      const data = await res.json();
      setDepartments(data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  // ===================== Handlers =====================
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) formData.append(key, value as any);
      });

      const res = await fetch(`${API_BASE}/api/service-requests`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        alert("Service Request submitted successfully");
        navigate("/service-requests");
      } else {
        alert("Failed to submit service request");
      }
    } catch (error) {
      console.error("Submit Error:", error);
    }
  };

  const handleFilterChange = (e: any) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterSearch = async () => {
    try {
      const params = new URLSearchParams(filter as any).toString();
      const res = await fetch(`${API_BASE}/api/service-requests?${params}`);
      const data = await res.json();
      setFilterResults(data);
      setResultModalOpen(true);
      setFilterModalOpen(false);
    } catch (error) {
      console.error("Search Error:", error);
    }
  };

  const handleExportPDF = (username: string) => {
    const doc = new jsPDF();
    doc.text("Service Request Report", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [["Transaction ID", "Category", "Department", "Priority", "Impact", "Status"]],
      body: filterResults.map((r: any) => [
        r.transaction_id,
        r.category,
        r.department,
        r.priority,
        r.impact,
        r.status,
      ]),
    });
    doc.save(`ServiceRequest_${username}_${Date.now()}.pdf`);
  };

  // ===================== JSX =====================
  return (
    <div className={serviceRequestStyles["main-container"]}>
      {/* ===================== Filter Modal ===================== */}
      {filterModalOpen && (
        <div className={serviceRequestStyles.modalOverlay}>
          <div className={serviceRequestStyles.filterModalBox}>
            <h2 className={serviceRequestStyles.advancedFilterHeader}>
              Filter Service Requests
            </h2>
            <div className={serviceRequestStyles.twoColForm}>
              <div className={serviceRequestStyles.twoCol}>
                <div className={serviceRequestStyles.formGroup}>
                  <select
                    name="department"
                    value={filter.department}
                    onChange={handleFilterChange}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept: any) => (
                      <option key={dept.id} value={dept.department_name}>
                        {dept.department_name}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="department">Department</label>
                </div>
                <div className={serviceRequestStyles.formGroup}>
                  <select
                    name="category"
                    value={filter.category}
                    onChange={handleFilterChange}
                  >
                    <option value="">Select Category</option>
                    <option>Application</option>
                    <option>Network</option>
                    <option>Server</option>
                    <option>Infrastructure</option>
                    <option>Plant Operation</option>
                  </select>
                  <label htmlFor="category">Category</label>
                </div>
              </div>
              <div className={serviceRequestStyles.twoCol}>
                <div className={serviceRequestStyles.formGroup}>
                  <input
                    type="text"
                    name="transactionId"
                    value={filter.transactionId}
                    onChange={handleFilterChange}
                  />
                  <label htmlFor="transactionId">Transaction ID</label>
                </div>
                <div className={serviceRequestStyles.formGroup}>
                  <select
                    name="priority"
                    value={filter.priority}
                    onChange={handleFilterChange}
                  >
                    <option value="">Select Priority</option>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                  <label htmlFor="priority">Priority</label>
                </div>
              </div>
            </div>
            <div className={serviceRequestStyles.advancedFilterActions}>
              <button onClick={handleFilterSearch}>Search</button>
              <button
                onClick={() =>
                  setFilter({ department: "", category: "", priority: "", transactionId: "" })
                }
              >
                Clear
              </button>
              <button onClick={() => setFilterModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Result Modal ===================== */}
      {resultModalOpen && (
        <div className={serviceRequestStyles.modalOverlay}>
          <div className={serviceRequestStyles.modalBox}>
            <div className={serviceRequestStyles.modalHeader}>
              <h2>Search Results</h2>
              <div className={serviceRequestStyles.modalActions}>
                <button
                  className={serviceRequestStyles.primaryBtn}
                  onClick={() => handleExportPDF(user?.username || "admin")}
                >
                  Export PDF
                </button>
                <button
                  className={serviceRequestStyles.secondaryBtn}
                  onClick={() => setResultModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <div className={serviceRequestStyles.modalContent}>
              <div style={{ overflowX: "auto" }}>
                <table className={serviceRequestStyles.table}>
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Category</th>
                      <th>Department</th>
                      <th>Priority</th>
                      <th>Impact</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterResults.length > 0 ? (
                      filterResults.map((r: any, idx: number) => (
                        <tr key={idx}>
                          <td>{r.transaction_id}</td>
                          <td>{r.category}</td>
                          <td>{r.department}</td>
                          <td>{r.priority}</td>
                          <td>{r.impact}</td>
                          <td>{r.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center" }}>
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

      {/* ===================== Main Form ===================== */}
      <main className={serviceRequestStyles["main-content"]}>
        <header className={serviceRequestStyles["main-header"]}>
          <div className={serviceRequestStyles["header-left"]}>
            <div className={serviceRequestStyles["logo-wrapper"]}>
              <img
                src={login_headTitle2}
                alt="Logo"
                className={serviceRequestStyles.logo}
              />
              <span className={serviceRequestStyles.version}>v1.00</span>
            </div>
            <h1 className={serviceRequestStyles["header-title"]}>
              Service Request Management
            </h1>
          </div>
          <div className={serviceRequestStyles["header-right"]}>
            <button
              className={serviceRequestStyles["addUserBtn"]}
              onClick={() => setFilterModalOpen(true)}
            >
              Filter Requests
            </button>
            <button
              className={serviceRequestStyles["logoutBtn"]}
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </header>

        {/* ===================== Form ===================== */}
        <div className={serviceRequestStyles.container}>
          <form
            className={serviceRequestStyles.form}
            onSubmit={handleSubmit}
          >
            <div className={serviceRequestStyles.scrollFormContainer}>
              <div className={serviceRequestStyles.section}>
                <span className={serviceRequestStyles.sectionHeaderTitle}>
                  Request Details
                </span>
                <div className={serviceRequestStyles.threeCol}>
                  <div className={serviceRequestStyles.formGroup}>
                    <input name="requester_name" value={form.requester_name} onChange={handleChange} />
                    <label>Requester Name</label>
                  </div>
                  <div className={serviceRequestStyles.formGroup}>
                    <input name="requester_location" value={form.requester_location} onChange={handleChange} />
                    <label>Requester Location</label>
                  </div>
                  <div className={serviceRequestStyles.formGroup}>
                    <select
                      name="requester_department"
                      value={form.requester_department}
                      onChange={handleChange}
                    >
                      <option value="">Select Requester Department</option>
                      {departments.map((dept: any) => (
                        <option key={dept.id} value={dept.department_name}>
                          {dept.department_name}
                        </option>
                      ))}
                    </select>
                    <label>Requester Department</label>
                  </div>
                </div>
                <div className={serviceRequestStyles.threeCol}>
                  <div className={serviceRequestStyles.formGroup}>
                    <select name="request_type" value={form.requestType} onChange={handleChange} required>
                      <option value="">Select Request Type</option>
                      <option value="service_request">Service Request</option>
                      <option value="incident">Incident</option>
                      <option value="change">Change</option>
                    </select>
                    <label>Request Type</label>
                  </div>
                  <div className={serviceRequestStyles.formGroup}>
                    <select name="category" value={form.category} onChange={handleChange} required>
                      <option value="">Select Category</option>
                      <option value="application">Application</option>
                      <option value="network">Network</option>
                      <option value="server">Server</option>
                      <option value="infrastructure">Infrastructure</option>
                      <option value="plant_operation">Plant Operation</option>
                    </select>
                    <label>Category</label>
                  </div>
                  <div className={serviceRequestStyles.formGroup}>
                    <input name="systemName" value={form.systemName} onChange={handleChange} />
                    <label>System / Asset Name</label>
                  </div>
                </div>
                <div className={serviceRequestStyles.formGroup}>
                  <input name="subcategory" value={form.subcategory} onChange={handleChange} />
                  <label>Subcategory / Issue description</label>
                </div>

                <div className={serviceRequestStyles.threeCol}>
                  <div className={serviceRequestStyles.formGroup}>
                    <select
                      name="priority"
                      value={form.priority || "low"}   // Default to 'low' if not set
                      onChange={handleChange}
                      disabled
                    >
                      <option value="">Select Priority</option>
                      <option value="critical">Critical</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <label>Priority</label>
                  </div>
                  <div className={serviceRequestStyles.formGroup}>
                    <select name="impact" value={form.impact} onChange={handleChange}>
                      <option value="">Select Impact</option>
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                    <label>Impact</label>
                  </div>
                  
                  <div className={serviceRequestStyles.formGroup}>
                    <input
                      type="file"
                      name="attachment"
                      accept=".pdf,.jpg,.png"
                      onChange={handleFileChange}
                    />
                    <label>Attachment</label>
                  </div>
                </div>

                <div className={serviceRequestStyles.formGroup}>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                  />
                  <label>Description</label>
                </div>
              </div>
            </div>

            <div className={serviceRequestStyles.formFooter}>
              <div className={serviceRequestStyles.formActions}>
                <button type="submit" className={serviceRequestStyles.saveBtn}>
                  Submit
                </button>
                <button
                  type="button"
                  className={serviceRequestStyles.cancelBtn}
                  onClick={() => navigate("/dashboard")}
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

export default ServiceRequestForm;
