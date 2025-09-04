import React from "react";
import styles from "./UserManagement.module.css";
import { useAuth } from "../../context/AuthContext";
import { can } from "../../utils/rbac";

type User = {
  id: string;
  name: string;
  department: string;
  role: string;
  status: string;
  email: string;
};

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers }) => {
  const { user } = useAuth();
  const role = user?.role || "admin";

  // Example handler for future API integration
  // const handleEdit = (id: string) => { ... }

  return (
    <>
      <h1 className={styles.title}>User Management</h1>
      <div className={styles.filtersRow}>
        <input className={styles.search} placeholder="Search users..." />
        <select className={styles.filter} defaultValue="All Departments">
          <option>All Departments</option>
        </select>
        <select className={styles.filter} defaultValue="All Roles">
          <option>All Roles</option>
        </select>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.usersTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.department}</td>
                  <td>
                    <span className={styles.roleBadge}>{user.role}</span>
                  </td>
                  <td>
                    <span
                      className={
                        user.status === "Active"
                          ? styles.statusActive
                          : styles.statusInactive
                      }
                    >
                      {user.status}
                    </span>
                  </td>
                  <td>
                    {can(role, "users:edit") && (
                      <button className={styles.actionBtn}>Edit</button>
                    )}
                    <button className={styles.actionBtn}>Reset Password</button>
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

export default UserManagement;
