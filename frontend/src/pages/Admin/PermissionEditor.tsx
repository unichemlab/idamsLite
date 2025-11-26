import React, { useEffect, useState } from "react";
import { getPermissions, createPermission, deletePermission } from "../../utils/api";

export default function PermissionEditor() {
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getPermissions();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading permissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async () => {
    if (!name.trim()) return alert("Enter module name");
    try {
      await createPermission({ module_name: name.trim() });
      setName("");
      await load();
    } catch (err) {
      console.error(err);
      alert("Failed to create permission");
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm("Delete permission?")) return;
    try {
      await deletePermission(id);
      await load();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <div>
      <div className="rbac-header">
        <div className="icon">🔐</div>
        <div className="title">
          <h2>Permissions / Modules</h2>
          <p className="small">Manage system modules used in RBAC mapping</p>
          <div className="rbac-underline" />
        </div>
      </div>

      <div className="form-row">
        <input placeholder="Module name (e.g. ROLE_MASTER)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" onClick={onCreate}>Create</button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="rbac-table">
          <thead>
            <tr><th>Module</th><th style={{ width: 120 }}>Action</th></tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>{p.module_name}</td>
                <td>
                  <button className="btn secondary" onClick={() => onDelete(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={2}>No modules found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
