import React from "react";
import styles from "./ComplianceReports.module.css";
import { useAuth } from "../../context/AuthContext";
import { can, Role } from "../../utils/rbac";

type Report = {
  id: string;
  department: string;
  application: string;
  period: string;
  status: string;
  lastAudit: string;
};

interface ComplianceReportsProps {
  reports: Report[];
  setReports: React.Dispatch<React.SetStateAction<Report[]>>;
}

const ComplianceReports: React.FC<ComplianceReportsProps> = ({
  reports,
  setReports,
}) => {
  const { user } = useAuth();
  function getRoleName(role_id?: number): Role {
    switch (role_id) {
      case 1:
        return "superAdmin";
      case 2:
        return "plantAdmin";
      case 3:
        return "qaManager";
      default:
        return "user";
    }
  }
  const role = getRoleName(user?.role_id);

  // Example handler for future API integration
  // const handleExport = (id: string) => { ... }

  return (
    <>
      <h1 className={styles.title}>Compliance Reports</h1>
      <div className={styles.filtersRow}>
        <input className={styles.search} placeholder="Search reports..." />
        <select className={styles.filter} defaultValue="All Departments">
          <option>All Departments</option>
        </select>
        <select className={styles.filter} defaultValue="All Applications">
          <option>All Applications</option>
        </select>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.reportsTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Department</th>
              <th>Application</th>
              <th>Period</th>
              <th>Status</th>
              <th>Last Audit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  No compliance reports found.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.id}</td>
                  <td>{report.department}</td>
                  <td>{report.application}</td>
                  <td>{report.period}</td>
                  <td>
                    <span
                      className={
                        report.status === "Compliant"
                          ? styles.statusCompliant
                          : styles.statusNonCompliant
                      }
                    >
                      {report.status}
                    </span>
                  </td>
                  <td>{report.lastAudit}</td>
                  <td>
                    <button className={styles.actionBtn}>View</button>
                    {can(role, "compliance:export") && (
                      <button className={styles.actionBtn}>Export</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ComplianceReports;
