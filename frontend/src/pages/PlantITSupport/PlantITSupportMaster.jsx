import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PlantITSupport.module.css";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import { FaEdit, FaTrash } from "react-icons/fa";
import ProfileIconWithLogout from "./ProfileIconWithLogout";
import { API_BASE } from "utils/api";

const TransactionMaster = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "transaction_id", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Fetch transactions from API
  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = () => {
    fetch(`${API_BASE}/api/plant-itsupport`)
      .then((res) => res.json())
      .then((data) => setTransactions(data))
      .catch(console.error);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      fetch(`${API_BASE}/api/plant-itsupport/${id}`, { method: "DELETE" })
        .then(() => fetchTransactions())
        .catch(console.error);
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Sorting
  const sortedTransactions = [...transactions].sort((a, b) => {
    let valA = a[sortConfig.key] || "";
    let valB = b[sortConfig.key] || "";
    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();

    if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  // Search
  const filtered = sortedTransactions.filter((tx) => {
    const lower = search.toLowerCase();
    return (
      tx.transaction_id.toLowerCase().includes(lower) ||
      (tx.assignment_it_group?.toLowerCase().includes(lower) ?? false) ||
      (tx.status?.toLowerCase().includes(lower) ?? false)
    );
  });
  console.log("trasaction_id", transactions);
  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  console.log("trasaction_paginated", paginated);
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  return (
    <div>
      <header className={styles["main-header"]}>
        <h2 className={styles["header-title"]}>Plant Master</h2>
        <div className={styles["header-icons"]}>
          <span className={styles["header-icon"]}>
            <NotificationsIcon fontSize="small" />
          </span>
          <span className={styles["header-icon"]}>
            <SettingsIcon fontSize="small" />
          </span>
          <ProfileIconWithLogout />
        </div>
      </header>
      <div className={styles.headerTopRow}>
        <div className={styles.actionHeaderRow}>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 12, padding: 6, width: "300px" }}
          />
          <button
            className={styles.addUserBtn}
            onClick={() => navigate("/plant-itsupport/add")}
          >
            + Add New
          </button>
        </div>

      </div>
      <div className={styles.container}>
      <div
          style={{
            maxHeight: 380,
            overflowY: "auto",
            borderRadius: 8,
            boxShadow: "0 0 4px rgba(0, 0, 0, 0.05)",
            border: "1px solid #e2e8f0",
            marginTop: "11px",
            height: "100",
          }}
        >
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort("transaction_id")}>Transaction ID</th>
              <th onClick={() => handleSort("plant_id")}>Plant ID</th>
              <th onClick={() => handleSort("assignment_it_group")}>IT Group</th>
              <th>Users</th>
              <th onClick={() => handleSort("status")}>Status</th>
              <th>Created On</th>
              <th>Updated On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center" }}>
                  No records found.
                </td>
              </tr>
            )}
            {paginated.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.transaction_id}</td>
                <td>{tx.plant_name}</td>
                <td>{tx.assignment_it_group}</td>
                <td>
                  {Array.isArray(tx.users)
                    ? tx.users.map((u) => u.user_name).join(", ")
                    : tx.users || "-"}
                </td>
                <td>{tx.status}</td>
                <td>{formatDate(tx.created_on)}</td>
                <td>{formatDate(tx.updated_on)}</td>
                <td>
                  <button onClick={() => navigate(`/plant-itsupport
/edit/${tx.id}`)}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(tx.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ marginTop: 12 }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Previous
          </button>
          <span style={{ margin: "0 12px" }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default TransactionMaster;
