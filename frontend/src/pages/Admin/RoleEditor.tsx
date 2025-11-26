import React, { useEffect, useState } from "react";
import { getRoles, createRole, updateRole, deleteRole } from "../../utils/api";

type Role = { id:number; role_name:string; description?:string };

export default function RoleEditor(){
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [editing, setEditing] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getRoles();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(()=> {
    load();
    const onRefresh = () => load();
    window.addEventListener("rbac:refresh", onRefresh as any);
    return () => window.removeEventListener("rbac:refresh", onRefresh as any);
  }, []);

  const onCreate = async () => {
    if(!name.trim()) return alert("Enter name");
    try {
      await createRole({ role_name: name.trim(), description: desc });
      setName(""); setDesc(""); await load();
    } catch (err) { console.error(err); alert("Create failed"); }
  };

  const onUpdate = async () => {
    if(!editing) return;
    try {
      await updateRole(editing.id, { role_name: name.trim(), description: desc });
      setEditing(null); setName(""); setDesc(""); await load();
    } catch (err) { console.error(err); alert("Update failed"); }
  };

  const onDelete = async (id:number) => {
    if (!window.confirm("Delete role?")) return;
    try { await deleteRole(id); await load(); } catch (err) { console.error(err); alert("Delete failed"); }
  };

  const startEdit = (r:Role) => { setEditing(r); setName(r.role_name); setDesc(r.description || ""); };

  return (
    <div>
      <div className="rbac-header">
        <div className="icon">🛡</div>
        <div className="title">
          <h2>Roles Management</h2>
          <p className="small">Create, edit and manage system roles</p>
          <div className="rbac-underline" />
        </div>
      </div>

      <div className="form-row" style={{ alignItems: "flex-start" }}>
        <input placeholder="role name" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="description" value={desc} onChange={e=>setDesc(e.target.value)} />
        {editing ? (
          <>
            <button className="btn" onClick={onUpdate}>Update</button>
            <button className="btn secondary" onClick={()=>{ setEditing(null); setName(""); setDesc(""); }}>Cancel</button>
          </>
        ) : <button className="btn" onClick={onCreate}>Create</button>}
      </div>

      <div style={{ overflowX:"auto" }}>
        <table className="rbac-table">
          <thead><tr><th>Name</th><th>Description</th><th style={{ width:200 }}>Actions</th></tr></thead>
          <tbody>
            {roles.map(r=>(
              <tr key={r.id}>
                <td>{r.role_name}</td>
                <td>{r.description}</td>
                <td>
                  <button className="btn secondary" onClick={()=>startEdit(r)}>Edit</button>{" "}
                  <button className="btn secondary" onClick={()=>onDelete(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {roles.length===0 && <tr><td colSpan={3}>No roles found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
