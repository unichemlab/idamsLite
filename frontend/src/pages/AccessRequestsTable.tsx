import React from "react";
import styles from "./AccessRequestsTable.module.css";

// Generic table for access requests
const AccessRequestsTable = ({
  requests,
  onView,
}: {
  requests: any[];
  onView: (request: any) => void;
}) => {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Request ID</th>
            <th>User</th>
            <th>Application</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id}>
              <td>{req.id}</td>
              <td>{req.user}</td>
              <td>{req.application}</td>
              <td>{req.role}</td>
              <td>{req.requestStatus}</td>
              <td>
                <button className={styles.viewBtn} onClick={() => onView(req)}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AccessRequestsTable;
