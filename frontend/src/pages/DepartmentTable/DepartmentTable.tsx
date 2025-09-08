import React, { useState, useEffect } from "react";
import styles from "./DepartmentTable.module.css";
import { fetchDepartments } from "../../utils/api";

const DepartmentTable: React.FC = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const data = await fetchDepartments();
        setDepartments(data);
      } catch (err) {
        setError("Failed to load departments");
      } finally {
        setLoading(false);
      }
    };
    loadDepartments();
  }, []);

  if (loading) return <div>Loading departments...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className={styles.tableWrapper}>
      <h2>Department Table</h2>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Department Name</th>
            <th>Description</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept.id}>
              <td>{dept.id}</td>
              <td>{dept.name}</td>
              <td>{dept.description}</td>
              <td>{dept.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DepartmentTable;
