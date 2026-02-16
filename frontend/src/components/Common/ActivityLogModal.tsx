// src/components/Common/ActivityLogModal.tsx
import React, { useState, useMemo } from "react";
import { FaFilePdf, FaFilter, FaTimes, FaChevronLeft, FaChevronRight, FaChevronDown, FaChevronUp } from "react-icons/fa";
import styles from "./ActivityLogModal.module.css";

interface ActivityLog {
  id?: number;
  action?: string;
  oldValue?: any;
  old_value?: any;
  newValue?: any;
  new_value?: any;
  approver?: string;
  action_performed_by?: string;
  approvalStatus?: string;
  approval_status?: string;
  dateTime?: string;
  date_time_ist?: string;
  comments?: string;
  user_id?: number;
}

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  activityLogs: ActivityLog[];
  recordName?: string;
  // Optional: Pass lookup functions to resolve IDs to names
  getPlantName?: (id: number) => string;
  getDepartmentName?: (id: number) => string;
  getRoleName?: (id: number) => string;
  getUserName?: (id: number) => string;
}

/**
 * Compact Expandable Activity Log Modal
 * - Shows summary in one line
 * - Click to expand and see all details
 * - Resolves IDs to names
 */
const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  onClose,
  title,
  activityLogs,
  recordName,
  getPlantName,
  getDepartmentName,
  getRoleName,
  getUserName,
}) => {
  const [showFilter, setShowFilter] = useState(false);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const rowsPerPage = 5;

  // Get unique actions for filter
  const uniqueActions = useMemo(() => {
    const actions = new Set(activityLogs.map(log => log.action?.toUpperCase()).filter(Boolean));
    return Array.from(actions).sort();
  }, [activityLogs]);

  // Filter logs by action
  const filteredLogs = useMemo(() => {
    if (filterAction === "all") return activityLogs;
    return activityLogs.filter(log => log.action?.toUpperCase() === filterAction);
  }, [activityLogs, filterAction]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
  const paginatedLogs = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return filteredLogs.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredLogs, currentPage]);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterAction]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  // Toggle row expansion
  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Resolve ID to name
  const resolveName = (fieldName: string, value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    
    const fieldLower = fieldName.toLowerCase();
    const valueStr = String(value);
    
    // Try to resolve IDs to names
    if (fieldLower.includes('plant') && fieldLower.includes('id') && getPlantName) {
      const id = parseInt(valueStr);
      if (!isNaN(id)) {
        const name = getPlantName(id);
        return `${name} (${id})`;
      }
    }
    
    if (fieldLower.includes('department') && fieldLower.includes('id') && getDepartmentName) {
      const id = parseInt(valueStr);
      if (!isNaN(id)) {
        const name = getDepartmentName(id);
        return `${name} (${id})`;
      }
    }
    
    if (fieldLower.includes('role') && fieldLower.includes('id') && getRoleName) {
      // Handle comma-separated role IDs
      if (valueStr.includes(',')) {
        const ids = valueStr.split(',').map(s => s.trim());
        const names = ids.map(id => {
          const numId = parseInt(id);
          if (!isNaN(numId)) {
            return getRoleName(numId);
          }
          return id;
        });
        return names.join(', ');
      }
      
      const id = parseInt(valueStr);
      if (!isNaN(id)) {
        const name = getRoleName(id);
        return `${name} (${id})`;
      }
    }
    
    if ((fieldLower.includes('user') || fieldLower.includes('performed') || fieldLower.includes('approver')) && getUserName) {
      const id = parseInt(valueStr);
      if (!isNaN(id)) {
        const name = getUserName(id);
        return name || valueStr;
      }
    }
    
    // Boolean formatting
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    
    // Return as is
    return valueStr.length > 50 ? valueStr.substring(0, 50) + '...' : valueStr;
  };

  // Get changes with ID resolution
  const getChanges = (log: ActivityLog) => {
    const changes: Array<{ field: string; oldVal: any; newVal: any; oldDisplay: string; newDisplay: string }> = [];
    
    try {
      const oldValue = typeof log.old_value === "string" 
        ? JSON.parse(log.old_value) 
        : log.old_value || {};
      const newValue = typeof log.new_value === "string" 
        ? JSON.parse(log.new_value) 
        : log.new_value || {};

      const allKeys = new Set([...Object.keys(oldValue || {}), ...Object.keys(newValue || {})]);

      allKeys.forEach(key => {
        if (['id', 'created_on', 'updated_on', 'created_at', 'updated_at'].includes(key)) return;
        
        const oldVal = oldValue[key];
        const newVal = newValue[key];

        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          const fieldName = formatFieldName(key);
          const oldDisplay = resolveName(key, oldVal);
          const newDisplay = resolveName(key, newVal);
          
          changes.push({
            field: fieldName,
            oldVal,
            newVal,
            oldDisplay,
            newDisplay
          });
        }
      });
    } catch (err) {
      console.error("Error parsing log values:", err);
    }

    return changes;
  };

  // Get compact summary
  const getCompactSummary = (log: ActivityLog): string => {
    const changes = getChanges(log);
    if (changes.length === 0) return 'No changes detected';
    
    // Show first 2-3 changes in summary
    const summary = changes.slice(0, 3).map(change => {
      if (change.oldDisplay === '-') {
        return `${change.field}: ${change.newDisplay}`;
      }
      return `${change.field}: ${change.oldDisplay} → ${change.newDisplay}`;
    }).join(' | ');
    
    const remaining = changes.length - 3;
    return remaining > 0 ? `${summary} | +${remaining} more` : summary;
  };

  // Format field names
  const formatFieldName = (fieldName: string): string => {
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format date/time
  const formatDateTime = (dateTime: string | undefined): string => {
    if (!dateTime) return "-";
    
    try {
      const date = new Date(dateTime);
      return date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (err) {
      return dateTime;
    }
  };

  // PDF Export
  const handleExportPDF = async () => {
    try {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;
      
      const doc = new jsPDF({ orientation: "landscape" });
      const today = new Date();
      const fileName = `ActivityLog_${recordName?.replace(/\s+/g, '_')}_${today.toISOString().split("T")[0]}.pdf`;
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageMargin = 14;
      const headerHeight = 25;

      // Header
      doc.setFillColor(0, 82, 155);
      doc.rect(0, 0, pageWidth, headerHeight, "F");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(`Activity Log - ${recordName || 'Record'}`, pageMargin, 16);

      // Table data
      const headers = [["Action", "Changes", "Performed By", "Date/Time"]];
      const rows = filteredLogs.map(log => [
        log.action?.toUpperCase() || "-",
        getCompactSummary(log),
        log.action_performed_by || log.user_id || "-",
        formatDateTime(log.dateTime || log.date_time_ist),
      ]);

      autoTable(doc, {
        head: headers,
        body: rows,
        startY: headerHeight + 5,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [0, 82, 155], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 245, 255] },
        margin: { left: pageMargin, right: pageMargin },
      });

      doc.save(fileName);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("Failed to export PDF. Please try again.");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.activityModal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <h3>{title}{recordName && ` - ${recordName}`}</h3>
            <span className={styles.recordCount}>
              {filteredLogs.length} {filteredLogs.length === 1 ? 'log' : 'logs'}
            </span>
          </div>
          
          <div className={styles.headerRight}>
            <button 
              onClick={() => setShowFilter(!showFilter)} 
              className={`${styles.iconBtn} ${showFilter ? styles.active : ''}`}
              title="Filter logs"
            >
              <FaFilter />
              {filterAction !== "all" && <span className={styles.filterBadge}>1</span>}
            </button>

            <button 
              onClick={handleExportPDF} 
              className={styles.iconBtn}
              title="Export to PDF"
            >
              <FaFilePdf />
            </button>

            <button onClick={onClose} className={styles.closeBtn} aria-label="Close modal">
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilter && (
          <div className={styles.filterPanel}>
            <label>Filter:</label>
            <select 
              value={filterAction} 
              onChange={(e) => setFilterAction(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All ({activityLogs.length})</option>
              {uniqueActions.map(action => {
                const count = activityLogs.filter(log => log.action?.toUpperCase() === action).length;
                return (
                  <option key={action} value={action}>{action} ({count})</option>
                );
              })}
            </select>
            {filterAction !== "all" && (
              <button onClick={() => setFilterAction("all")} className={styles.clearFilterBtn}>
                Clear
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={styles.modalBody}>
          {filteredLogs.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{filterAction === "all" ? "No activity logs found" : `No ${filterAction} logs found`}</p>
            </div>
          ) : (
            <div className={styles.expandableListContainer}>
              {paginatedLogs.map((log, index) => {
                const changes = getChanges(log);
                const isExpanded = expandedRows.has(index);
                
                return (
                  <div key={log.id || index} className={styles.logRow}>
                    {/* Summary Row - Always Visible */}
                    <div 
                      className={styles.summaryRow}
                      onClick={() => toggleRowExpansion(index)}
                    >
                      <div className={styles.summaryLeft}>
                        <button className={styles.expandBtn}>
                          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                        <span className={`${styles.actionBadge} ${styles[`action${log.action?.toUpperCase() || 'DEFAULT'}`]}`}>
                          {log.action?.toUpperCase() || "ACTION"}
                        </span>
                        <span className={styles.summaryText}>
                          {getCompactSummary(log)}
                        </span>
                      </div>
                      <div className={styles.summaryRight}>
                        <span className={styles.userBadge}>
                          {log.action_performed_by || log.approver || log.user_id || "Unknown"}
                        </span>
                        <span className={styles.dateBadge}>
                          {formatDateTime(log.dateTime || log.date_time_ist)}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Details - Show on Click */}
                    {isExpanded && (
                      <div className={styles.expandedDetails}>
                        {changes.length === 0 ? (
                          <div className={styles.noChanges}>No field changes detected</div>
                        ) : (
                          <div className={styles.detailsGrid}>
                            {changes.map((change, idx) => (
                              <div key={idx} className={styles.detailRow}>
                                <div className={styles.detailLabel}>{change.field}:</div>
                                <div className={styles.detailValues}>
                                  {change.oldDisplay !== '-' && (
                                    <>
                                      <span className={styles.oldValue}>{change.oldDisplay}</span>
                                      <span className={styles.arrow}>→</span>
                                    </>
                                  )}
                                  <span className={styles.newValue}>{change.newDisplay}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Additional Info */}
                        {(log.approvalStatus || log.approval_status || log.comments) && (
                          <div className={styles.additionalInfo}>
                            {(log.approvalStatus || log.approval_status) && (
                              <span className={`${styles.statusBadge} ${styles[`status${(log.approvalStatus || log.approval_status || "").replace(/\s/g, "")}`]}`}>
                                Status: {log.approvalStatus || log.approval_status}
                              </span>
                            )}
                            {log.comments && (
                              <span className={styles.commentsBadge}>
                                💬 {log.comments}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          {filteredLogs.length > rowsPerPage && (
            <div className={styles.pagination}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={styles.paginationBtn}
              >
                <FaChevronLeft />
              </button>
              <span className={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={styles.paginationBtn}
              >
                <FaChevronRight />
              </button>
            </div>
          )}
          <button onClick={onClose} className={styles.closeButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogModal;