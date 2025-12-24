import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/PlantMasterTable.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
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

  const sortedTransactions = [...transactions].sort((a, b) => {
    let valA = a[sortConfig.key] || "";
    let valB = b[sortConfig.key] || "";
    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();

    if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

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

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="IT Support Management" />

      <div className={styles.contentArea}>
        <div className={styles.controlPanel}>
          <div className={styles.actionRow}>
            <input
              type="text"
              placeholder="🔍 Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            <button
              className={styles.addBtn}
              onClick={() => navigate("/task-closure-bin/add")}
            >
              + Add New Transaction
            </button>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2>IT Support Transactions</h2>
            <span className={styles.recordCount}>{filtered.length} Records</span>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th onClick={() => handleSort("transaction_id")} style={{ cursor: 'pointer' }}>
                    Transaction ID ↕
                  </th>
                  <th onClick={() => handleSort("plant_id")} style={{ cursor: 'pointer' }}>
                    Plant ID ↕
                  </th>
                  <th onClick={() => handleSort("assignment_it_group")} style={{ cursor: 'pointer' }}>
                    IT Group ↕
                  </th>
                  <th>Users</th>
                  <th onClick={() => handleSort("status")} style={{ cursor: 'pointer' }}>
                    Status ↕
                  </th>
                  <th>Created On</th>
                  <th>Updated On</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className={styles.emptyState}>
                      No records found.
                    </td>
                  </tr>
                )}
                {paginated.map((tx) => (
                  <tr key={tx.id}>
                    <td className={styles.transactionId}>{tx.transaction_id}</td>
                    <td>{tx.plant_name}</td>
                    <td>{tx.assignment_it_group}</td>
                    <td>
                      {Array.isArray(tx.users) && tx.users.length > 0 ? (
                        <div className={styles.userAvatarGroup}>
                          {tx.users.slice(0, 2).map((u, idx) =>
                            u.profile_pic ? (
                              <img
                                key={idx}
                                src={u.profile_pic}
                                alt={u.user_name}
                                title={u.user_name}
                                className={styles.userAvatar}
                              />
                            ) : (
                              <div
                                key={idx}
                                title={u.user_name}
                                className={styles.userAvatarInitials}
                              >
                                {getInitials(u.user_name)}
                              </div>
                            )
                          )}

                          {tx.users.length > 2 && (
                            <button
                              onClick={() => handleViewUsers(tx.users)}
                              className={styles.moreUsersBtn}
                            >
                              +{tx.users.length - 2}
                            </button>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <span className={styles.statusBadge}>{tx.status}</span>
                    </td>
                    <td>{formatDate(tx.created_on)}</td>
                    <td>{formatDate(tx.updated_on)}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.editBtn}
                          onClick={() => navigate(`/task-closure-bin/edit/${tx.id}`)}
                          title="Edit"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(tx.id)}
                          title="Delete"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={currentPage === 1 ? styles.paginationBtnDisabled : styles.paginationBtn}
            >
              {"<<"}
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={currentPage === 1 ? styles.paginationBtnDisabled : styles.paginationBtn}
            >
              Previous
            </button>

            <span className={styles.pageInfo}>
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={currentPage === totalPages ? styles.paginationBtnDisabled : styles.paginationBtn}
            >
              Next
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className={currentPage === totalPages ? styles.paginationBtnDisabled : styles.paginationBtn}
            >
              {">>"}
            </button>
          </div>
        </div>
      </div>

      {/* Users Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>All Users</h3>
              <button onClick={handleCloseModal} className={styles.modalCloseBtn}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.userGrid}>
                {selectedUsers.map((user, idx) => (
                  <div key={idx} className={styles.userCard}>
                    {user.profile_pic ? (
                      <img
                        src={user.profile_pic}
                        alt={user.user_name}
                        className={styles.userCardAvatar}
                      />
                    ) : (
                      <div className={styles.userCardAvatarInitials}>
                        {getInitials(user.user_name)}
                      </div>
                    )}
                    <span className={styles.userCardName}>{user.user_name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={handleCloseModal} className={styles.modalOkBtn}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionMaster;