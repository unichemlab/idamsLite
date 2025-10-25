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
  const [selectedUsers, setSelectedUsers] = useState([]);
const [isModalOpen, setIsModalOpen] = useState(false);
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
const handleViewUsers = (users) => {
  setSelectedUsers(users);
  setIsModalOpen(true);
};

const handleCloseModal = () => {
  setSelectedUsers([]);
  setIsModalOpen(false);
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
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

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
                    {Array.isArray(tx.users) && tx.users.length > 0 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        {tx.users.slice(0, 2).map((u, idx) =>
                          u.profile_pic ? (
                            <img
                              key={idx}
                              src={u.profile_pic}
                              alt={u.user_name}
                              title={u.user_name}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "1px solid #ccc",
                              }}
                            />
                          ) : (
                            <div
                              key={idx}
                              title={u.user_name}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                backgroundColor: "#64748b",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: "bold",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid #ccc",
                              }}
                            >
                              {getInitials(u.user_name)}
                            </div>
                          )
                        )}

                        {tx.users.length > 2 && (
                          <button
                            onClick={() => handleViewUsers(tx.users)}
                            title="View all users"
                            style={{
                              backgroundColor: "#e2e8f0",
                              border: "none",
                              borderRadius: "12px",
                              padding: "4px 8px",
                              fontSize: "12px",
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            +{tx.users.length - 2} more
                          </button>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>


                  <td>{tx.status}</td>
                  <td>{formatDate(tx.created_on)}</td>
                  <td>{formatDate(tx.updated_on)}</td>
                  <td>
                    <button
                      className={`${styles["action-button"]} ${styles.edit}`}
                      onClick={() => navigate(`/plant-itsupport/edit/${tx.id}`)}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className={`${styles["action-button"]} ${styles.delete}`}
                      onClick={() => handleDelete(tx.id)}
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div
            style={{
              marginTop: 20,
              paddingBottom: 24, // 👈 Add this line
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              fontFamily: "Segoe UI, Roboto, sans-serif",
              fontSize: 14,
            }}
          >
            {/* First */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #d0d5dd",
                backgroundColor: currentPage === 1 ? "#f9fafb" : "#ffffff",
                color: currentPage === 1 ? "#cbd5e1" : "#344054",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                minWidth: 40,
              }}
            >
              {"<<"}
            </button>

            {/* Prev */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #d0d5dd",
                backgroundColor: currentPage === 1 ? "#f9fafb" : "#ffffff",
                color: currentPage === 1 ? "#cbd5e1" : "#344054",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                minWidth: 40,
              }}
            >
              Prev
            </button>

            {/* Page Numbers (Dynamic max 5 pages) */}
            {(() => {
              const pageButtons = [];
              const maxPagesToShow = 5;
              let start = Math.max(1, currentPage - 2);
              let end = Math.min(totalPages, start + maxPagesToShow - 1);
              if (end - start < maxPagesToShow - 1) {
                start = Math.max(1, end - maxPagesToShow + 1);
              }

              if (start > 1) {
                pageButtons.push(
                  <button
                    key={1}
                    onClick={() => setCurrentPage(1)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #d0d5dd",
                      backgroundColor: currentPage === 1 ? "#007bff" : "#ffffff",
                      color: currentPage === 1 ? "#fff" : "#344054",
                      cursor: "pointer",
                      minWidth: 40,
                    }}
                  >
                    1
                  </button>
                );
                if (start > 2) {
                  pageButtons.push(
                    <span key="ellipsis-left" style={{ padding: "6px 10px", color: "#999" }}>
                      ...
                    </span>
                  );
                }
              }

              for (let i = start; i <= end; i++) {
                pageButtons.push(
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: i === currentPage ? "1px solid #007bff" : "1px solid #d0d5dd",
                      backgroundColor: i === currentPage ? "#007bff" : "#ffffff",
                      color: i === currentPage ? "#fff" : "#344054",
                      cursor: "pointer",
                      minWidth: 40,
                    }}
                  >
                    {i}
                  </button>
                );
              }

              if (end < totalPages) {
                if (end < totalPages - 1) {
                  pageButtons.push(
                    <span key="ellipsis-right" style={{ padding: "6px 10px", color: "#999" }}>
                      ...
                    </span>
                  );
                }
                pageButtons.push(
                  <button
                    key={totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: currentPage === totalPages ? "1px solid #007bff" : "1px solid #d0d5dd",
                      backgroundColor: currentPage === totalPages ? "#007bff" : "#ffffff",
                      color: currentPage === totalPages ? "#fff" : "#344054",
                      cursor: "pointer",
                      minWidth: 40,
                    }}
                  >
                    {totalPages}
                  </button>
                );
              }

              return pageButtons;
            })()}

            {/* Next */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #d0d5dd",
                backgroundColor:
                  currentPage === totalPages || totalPages === 0 ? "#f9fafb" : "#ffffff",
                color:
                  currentPage === totalPages || totalPages === 0 ? "#cbd5e1" : "#344054",
                cursor:
                  currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer",
                minWidth: 40,
              }}
            >
              Next
            </button>

            {/* Last */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #d0d5dd",
                backgroundColor:
                  currentPage === totalPages || totalPages === 0 ? "#f9fafb" : "#ffffff",
                color:
                  currentPage === totalPages || totalPages === 0 ? "#cbd5e1" : "#344054",
                cursor:
                  currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer",
                minWidth: 40,
              }}
            >
              {">>"}
            </button>
          </div>
{isModalOpen && (
  <div
    onClick={handleCloseModal}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0,0,0,0.4)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: "#fff",
        padding: "24px",
        borderRadius: "8px",
        width: "80%",
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      }}
    >
      <h3 style={{ marginBottom: "16px" }}>All Users</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {selectedUsers.map((user, idx) => (
          <div
            key={idx}
            title={user.user_name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "calc(25% - 12px)",
              backgroundColor: "#f8fafc",
              padding: "8px 12px",
              borderRadius: "6px",
            }}
          >
            {user.profile_pic ? (
              <img
                src={user.profile_pic}
                alt={user.user_name}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1px solid #cbd5e1",
                }}
              />
            ) : (
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  backgroundColor: "#64748b",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #cbd5e1",
                }}
              >
                {getInitials(user.user_name)}
              </div>
            )}
            <span style={{ fontSize: 14 }}>{user.user_name}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleCloseModal}
        style={{
          marginTop: 24,
          padding: "8px 16px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          float: "right",
        }}
      >
        Close
      </button>
    </div>
  </div>
)}


        </div>
      </div>
    </div>
    
  );
};

export default TransactionMaster;
