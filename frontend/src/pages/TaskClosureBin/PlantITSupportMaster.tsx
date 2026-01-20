// src/pages/PlantITSupport/PlantITSupportTable.tsx

import React, { useState, useRef, useEffect, useMemo } from "react";
import paginationStyles from "../../styles/Pagination.module.css";
import { FaEdit, FaTrash, FaRegClock } from "react-icons/fa";
import { fetchActivityLog } from "../../utils/api";
import ConfirmDeleteModal from "../../components/Common/ConfirmDeleteModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/api";
import unichemLogoBase64 from "../../assets/unichemLogoBase64";
import login_headTitle2 from "../../assets/login_headTitle2.png";
import { useAuth } from "../../context/AuthContext";
import AppHeader from "../../components/Common/AppHeader";
import styles from "../Plant/PlantMasterTable.module.css";

interface Transaction {
  id: number;
  transaction_id: string;
  plant_id: number;
  plant_name?: string;
  assignment_it_group: string;
  users?: Array<{
    user_id: number;
    user_name: string;
    profile_pic?: string;
  }>;
  status: string;
  created_on?: string;
  updated_on?: string;
}

const PlantITSupportTable: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [filterColumn, setFilterColumn] = useState("assignment_it_group");
  const [filterValue, setFilterValue] = useState("");
  const [tempFilterColumn, setTempFilterColumn] = useState(filterColumn);
  const [tempFilterValue, setTempFilterValue] = useState(filterValue);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLogsTransaction, setActivityLogsTransaction] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 10;

  // Fetch transactions
  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/plant-itsupport`);
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  };

  // Reset page and selection when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedRow(null);
  }, [filterValue, filterColumn]);

  // Filtering logic
  const filteredData = useMemo(() => {
    return transactions.filter((tx) => {
      if (!filterValue.trim()) return true;
      const value = filterValue.toLowerCase();
      switch (filterColumn) {
        case "assignment_it_group":
          return tx.assignment_it_group?.toLowerCase().includes(value);
        case "plant_name":
          return tx.plant_name?.toLowerCase().includes(value);
        case "status":
          return tx.status?.toLowerCase().includes(value);
        default:
          return true;
      }
    });
  }, [transactions, filterValue, filterColumn]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleViewUsers = (users: any[]) => {
    setSelectedUsers(users);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedUsers([]);
    setIsModalOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date();
    const fileName = `PlantITSupport_${today.toISOString().split("T")[0]}.pdf`;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMargin = 14;
    const headerHeight = 28;

    doc.setFillColor(0, 82, 155);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Logo
    let logoWidth = 0;
    let logoHeight = 0;
    try {
      if (login_headTitle2) {
        const img = await loadImage(login_headTitle2);
        const maxLogoHeight = headerHeight * 0.6;
        const scale = maxLogoHeight / img.height;
        logoWidth = img.width * scale;
        logoHeight = img.height * scale;
        const logoY = headerHeight / 2 - logoHeight / 2;
        doc.addImage(img, "PNG", pageMargin, logoY, logoWidth, logoHeight);
      }
    } catch (e) {
      console.warn("Logo load failed", e);
    }

    // Title
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const titleX = pageMargin + logoWidth + 10;
    const titleY = headerHeight / 2 + 5;
    doc.text("Plant IT Support", titleX, titleY);

    doc.setFontSize(9);
    doc.setTextColor(220, 230, 245);
    const exportedByName = (user && (user.name || user.username)) || "Unknown User";
    const exportedText = `Exported by: ${exportedByName}  On: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
    const textWidth = doc.getTextWidth(exportedText);
    doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);

    doc.setDrawColor(0, 82, 155);
    doc.setLineWidth(0.5);
    doc.line(0, headerHeight, pageWidth, headerHeight);

    // Table
    const headers = [[
      "Transaction ID",
      "Plant Name",
      "Assignment IT Group",
      "Assigned Users",
      "Status",
      "Created On",
      "Updated On",
    ]];

    const formatDate = (dateStr: string | null | undefined): string => {
      if (!dateStr) return "-";
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString();
      } catch {
        return dateStr || "-";
      }
    };

    const rows = filteredData.map((tx) => [
      tx.transaction_id || "-",
      tx.plant_name || "-",
      tx.assignment_it_group || "-",
      tx.users?.map((u) => u.user_name).join(", ") || "-",
      tx.status || "-",
      formatDate(tx.created_on),
      formatDate(tx.updated_on),
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: headerHeight + 8,
      styles: {
        fontSize: 11,
        cellPadding: 3,
        halign: "left",
        valign: "middle",
      },
      headStyles: {
        fillColor: [11, 99, 206],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [240, 245, 255],
      },
      margin: { left: pageMargin, right: pageMargin },
      tableWidth: "auto",
    });

    // Footer
    const pageCount =
      (doc as any).getNumberOfPages?.() || (doc as any).internal?.getNumberOfPages?.() || 1;
    doc.setFontSize(9);
    doc.setTextColor(100);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text("Unichem Laboratories", pageMargin, pageHeight - 6);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - pageMargin - 30, pageHeight - 6);
    }

    doc.save(fileName);
  };

  // Delete handler
  const confirmDelete = async () => {
    if (selectedRow === null) return;
    const transaction = filteredData[selectedRow];
    if (!transaction) return;

    try {
      await fetch(`${API_BASE}/api/plant-itsupport/${transaction.id}`, {
        method: "DELETE",
      });
      await fetchTransactions();
      setSelectedRow(null);
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Filter popover click outside handler
  React.useEffect(() => {
    if (!showFilterPopover) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowFilterPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilterPopover]);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="IT Support Assignment" />
      <div className={styles.contentArea}>
        <div className={styles.controlPanel}>
          <div className={styles.actionRow}>
            <form
              className={styles.searchForm}
              onSubmit={(e) => e.preventDefault()}
              autoComplete="off"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                minWidth: 0,
              }}
            >
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}>🔍</span>

                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Search by IT group, plant..."
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  aria-label="Search"
                />

                {filterValue && (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => setFilterValue("")}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </form>

            <button
              className={styles.addBtn}
              onClick={() => navigate("/task-closure-bin/add")}
            >
              + Add New
            </button>

            <button
              className={styles.filterBtn}
              onClick={() => setShowFilterPopover((prev) => !prev)}
              type="button"
            >
              🔽 Filter
            </button>

            <button
              className={`${styles.btn} ${styles.editBtn}`}
              onClick={() => {
                if (selectedRow !== null)
                  navigate(`/task-closure-bin/edit/${filteredData[selectedRow].id}`);
              }}
              disabled={selectedRow === null}
            >
              <FaEdit size={14} /> Edit
            </button>

            <button
              className={`${styles.btn} ${styles.deleteBtn}`}
              disabled={selectedRow === null}
              onClick={() => setShowDeleteModal(true)}
            >
              <FaTrash size={14} /> Delete
            </button>

            <button className={styles.exportBtn} type="button" onClick={handleExportPDF}>
              <span role="img" aria-label="Export PDF" style={{ fontSize: 18 }}>
                🗎
              </span>
              PDF
            </button>
          </div>

          {/* Filter Popover */}
          <div className={styles.controls}>
            {showFilterPopover && (
              <div className={styles.filterPopover} ref={popoverRef}>
                <div className={styles.filterHeader}>Advanced Filter</div>
                <div className={styles.filterBody}>
                  <div className={styles.filterFieldRow}>
                    <label className={styles.filterLabel}>Column</label>
                    <select
                      className={styles.filterDropdown}
                      value={tempFilterColumn}
                      onChange={(e) => setTempFilterColumn(e.target.value)}
                    >
                      <option value="assignment_it_group">IT Group</option>
                      <option value="plant_name">Plant Name</option>
                      <option value="status">Status</option>
                    </select>
                  </div>
                  <div className={styles.filterFieldRow}>
                    <label className={styles.filterLabel}>Value</label>
                    <input
                      className={styles.filterInput}
                      type="text"
                      placeholder={`Enter ${tempFilterColumn}`}
                      value={tempFilterValue}
                      onChange={(e) => setTempFilterValue(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.filterFooter}>
                  <button
                    className={styles.applyBtn}
                    onClick={() => {
                      setFilterColumn(tempFilterColumn);
                      setFilterValue(tempFilterValue);
                      setShowFilterPopover(false);
                    }}
                  >
                    Apply
                  </button>
                  <button
                    className={styles.clearBtn}
                    onClick={() => {
                      setTempFilterValue("");
                      setFilterValue("");
                      setShowFilterPopover(false);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2>IT Support Assignment Records</h2>
            <span className={styles.recordCount}>{filteredData.length} Records</span>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "50px" }}></th>
                  <th>Transaction ID</th>
                  <th>Plant Name</th>
                  <th>Assignment IT Group</th>
                  <th>Assigned Users</th>
                  <th>Status</th>
                  <th>Created On</th>
                  <th>Updated On</th>
                  <th>Activity Log</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((tx, index) => {
                  const globalIdx = (currentPage - 1) * rowsPerPage + index;
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedRow(globalIdx)}
                      style={{
                        background: selectedRow === globalIdx ? "#f0f4ff" : undefined,
                      }}
                    >
                      <td>
                        <input
                          type="radio"
                          className={styles.radioInput}
                          checked={selectedRow === globalIdx}
                          onChange={() => setSelectedRow(globalIdx)}
                        />
                      </td>
                      <td>{tx.transaction_id}</td>
                      <td>{tx.plant_name}</td>
                      <td>{tx.assignment_it_group}</td>
                      <td>
                        {Array.isArray(tx.users) && tx.users.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              flexWrap: "wrap",
                            }}
                          >
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewUsers(tx.users || []);
                                }}
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
                          className={styles.actionBtn}
                          title="View Activity Logs"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const logs = await fetchActivityLog();
                              const filtered = (logs || []).filter((log: any) => {
                                if (
                                  log.table_name === "plant_itsupport" &&
                                  String(log.record_id) === String(tx.id)
                                )
                                  return true;
                                return false;
                              });

                              setActivityLogsTransaction({
                                ...tx,
                                activityLogs: filtered,
                              });
                            } catch (err) {
                              setActivityLogsTransaction({
                                ...tx,
                                activityLogs: [],
                              });
                            }
                            setShowActivityModal(true);
                          }}
                        >
                          <FaRegClock size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            <div className={paginationStyles.pagination}>
              <button
                className={paginationStyles.pageBtn}
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <div className={paginationStyles.pageInfo}>
                Page {currentPage} of {totalPages}
              </div>
              <button
                className={paginationStyles.pageBtn}
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* User Modal */}
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
              <h3 style={{ marginBottom: "16px" }}>All Assigned Users</h3>
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

        <ConfirmDeleteModal
          open={showDeleteModal}
          name={
            selectedRow !== null && filteredData[selectedRow]
              ? filteredData[selectedRow].assignment_it_group ?? "IT assignment"
              : "IT assignment"
          }
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
};

export default PlantITSupportTable;