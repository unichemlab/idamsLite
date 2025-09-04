import React from "react";
import styles from "./AccessRequestsTable.module.css";

export interface ApprovalAction {
  approverName: string;
  approverRole: string;
  plant: string;
  corporate: string;
  action: "Approved" | "Rejected";
  timestamp: string;
  comments?: string;
}

const ApprovalHistoryTable = ({ actions }: { actions: ApprovalAction[] }) => {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Approver Name</th>
            <th>Role</th>
            <th>Plant</th>
            <th>Corporate</th>
            <th>Action</th>
            <th>Timestamp</th>
            <th>Comments</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((a, idx) => (
            <tr key={idx}>
              <td>{a.approverName}</td>
              <td>{a.approverRole}</td>
              <td>{a.plant}</td>
              <td>{a.corporate}</td>
              <td
                style={{
                  color: a.action === "Approved" ? "#43a047" : "#e53935",
                }}
              >
                {a.action}
              </td>
              <td>{a.timestamp}</td>
              <td>{a.comments || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ApprovalHistoryTable;
