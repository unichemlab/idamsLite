import React from "react";
import styles from "./AccessRequests.module.css";
import { useAuth } from "../../context/AuthContext";

type Request = {
  id: string;
  user: string;
  employeeCode: string;
  plant: string;
  department: string;
  application: string;
  equipmentId: string;
  role: string;
  accessStatus: string;
  requestStatus: string;
};

interface AccessRequestsProps {
  requests: Request[];
  setRequests: React.Dispatch<React.SetStateAction<Request[]>>;
}

const AccessRequests: React.FC<AccessRequestsProps> = ({
  requests,
  setRequests,
}) => {
  useAuth();

  // Example handler for future API integration
  // const handleApprove = (id: string) => {
  //   setRequests((prev) => prev.map((req) => req.id === id ? { ...req, requestStatus: "Approved" } : req));
  // };

  return (
    <>
      <h1 className={styles.title}>Access Requests Management</h1>
      <div className={styles.filtersRow}>
        <input className={styles.search} placeholder="Search requests..." />
        <select className={styles.filter} defaultValue="All Departments">
          <option>All Departments</option>
        </select>
        <select className={styles.filter} defaultValue="All Plants">
          <option>All Plants</option>
        </select>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.requestsTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Requested For/By</th>
              <th>Employee Code</th>
              <th>Plant</th>
              <th>Department</th>
              <th>Application</th>
              <th>Equipment ID</th>
              <th>Role</th>
              <th>Access Status</th>
              <th>Request Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={11} className={styles.emptyState}>
                  No access requests found.
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id}>
                  <td>{req.id}</td>
                  <td>{req.user}</td>
                  <td>{req.employeeCode}</td>
                  <td>{req.plant}</td>
                  <td>{req.department}</td>
                  <td>
                    {(() => {
                      const [app, version] = req.application.split(" v");
                      return (
                        <>
                          <b>{app}</b>
                          {version && (
                            <div style={{ fontSize: 12, color: "#888" }}>{`v${version}`}</div>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  <td>{req.equipmentId}</td>
                  <td>{req.role}</td>
                  <td>
                    <span className={styles.statusGranted}>{req.accessStatus}</span>
                  </td>
                  <td>
                    <span className={styles.statusClosed}>{req.requestStatus}</span>
                  </td>
                  <td>{/* Actions here */}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AccessRequests;
