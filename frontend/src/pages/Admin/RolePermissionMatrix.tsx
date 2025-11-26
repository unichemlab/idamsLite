import React, { useEffect, useState } from "react";
import { getRoles, getPermissions, getRolePermissions, assignRolePermission, removeRolePermission } from "../../utils/api";
import "../../pages/Admin/rbac-premium.css"; // adjust path if needed

export default function RolePermissionMatrix(){
  const [roles, setRoles] = useState<any[]>([]);
  const [perms, setPerms] = useState<any[]>([]);
  const [mapping, setMapping] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async ()=>{
    try {
      setLoading(true);
      const [r, p, m] = await Promise.all([getRoles(), getPermissions(), getRolePermissions()]);
      setRoles(Array.isArray(r)?r:[]);
      setPerms(Array.isArray(p)?p:[]);
      setMapping(Array.isArray(m)?m:[]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); const onRefresh=()=>load(); window.addEventListener("rbac:refresh", onRefresh as any); return ()=>window.removeEventListener("rbac:refresh", onRefresh as any); }, []);

  const findMapRow = (roleId:number, permId:number) => mapping.find((m:any)=> m.role_id===roleId && m.permission_id===permId);

  const toggle = async (roleId:number, permId:number, field:"can_add"|"can_edit"|"can_view"|"can_delete")=>{
    const row = findMapRow(roleId, permId);
    if(!row){
      const payload:any = { role_id: roleId, permission_id: permId, can_add:false, can_edit:false, can_view:false, can_delete:false };
      payload[field] = true;
      await assignRolePermission(payload);
    } else {
      const payload = {
        role_id: roleId,
        permission_id: permId,
        can_add: field==="can_add" ? !row.can_add : row.can_add,
        can_edit: field==="can_edit" ? !row.can_edit : row.can_edit,
        can_view: field==="can_view" ? !row.can_view : row.can_view,
        can_delete: field==="can_delete" ? !row.can_delete : row.can_delete,
      };
      const allFalse = !payload.can_add && !payload.can_edit && !payload.can_view && !payload.can_delete;
      if (allFalse) {
        if (row.id) await removeRolePermission(row.id);
      } else {
        await assignRolePermission(payload);
      }
    }
    await load();
  };

  return (
    <div>
      <div className="rbac-header">
        <div className="icon">🔁</div>
        <div className="title">
          <h2>Role Permission Matrix</h2>
          <p className="small">Assign module actions to roles across the system</p>
          <div className="rbac-underline" />
        </div>
      </div>

      <div className="matrix-grid" style={{ marginTop:8 }}>
        <div style={{ display:"flex", gap:12, padding:"8px 12px", alignItems:"center", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
          <div className="module-col">Module</div>
          {roles.map(r=> <div key={r.id} className="matrix-cell" style={{ fontWeight:700 }}>{r.role_name}</div>)}
        </div>

        {perms.map(p => (
          <div className="matrix-row" key={p.id} >
            <div className="module-col">{p.module_name}</div>
            {roles.map(r => {
              const row = findMapRow(r.id, p.id);
              return (
                <div key={r.id} className="matrix-cell">
                  <div style={{ display:"flex", gap:8, justifyContent:"center", alignItems:"center" }}>
                    <label className="switch">
                      <input type="checkbox" checked={!!row?.can_add} onChange={()=>toggle(r.id,p.id,"can_add")} />
                      <span className="track"></span><span className="thumb"></span>
                    </label>
                    <span className="small" style={{ marginLeft:6 }}>Add</span>
                  </div>

                  <div style={{ display:"flex", gap:8, justifyContent:"center", alignItems:"center", marginTop:8 }}>
                    <label className="switch">
                      <input type="checkbox" checked={!!row?.can_edit} onChange={()=>toggle(r.id,p.id,"can_edit")} />
                      <span className="track"></span><span className="thumb"></span>
                    </label>
                    <span className="small" style={{ marginLeft:6 }}>Edit</span>
                  </div>

                  <div style={{ display:"flex", gap:8, justifyContent:"center", alignItems:"center", marginTop:8 }}>
                    <label className="switch">
                      <input type="checkbox" checked={!!row?.can_view} onChange={()=>toggle(r.id,p.id,"can_view")} />
                      <span className="track"></span><span className="thumb"></span>
                    </label>
                    <span className="small" style={{ marginLeft:6 }}>View</span>
                  </div>

                  <div style={{ display:"flex", gap:8, justifyContent:"center", alignItems:"center", marginTop:8 }}>
                    <label className="switch">
                      <input type="checkbox" checked={!!row?.can_delete} onChange={()=>toggle(r.id,p.id,"can_delete")} />
                      <span className="track"></span><span className="thumb"></span>
                    </label>
                    <span className="small" style={{ marginLeft:6 }}>Delete</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
