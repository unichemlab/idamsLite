import React, { useEffect, useState } from "react";
import { getUserPlantPermissions, saveUserPlantPermissions, getPermissions, fetchPlants } from "../../utils/api";
import "../../pages/Admin/rbac-premium.css"; // adjust path if needed

type Row = {
  id?: number;
  user_id:number;
  plant_id:number;
  module_id:number; // permission id
  can_add:boolean;
  can_edit:boolean;
  can_view:boolean;
  can_delete:boolean;
};

export default function PlantPermissionEditor(){
  const [userId, setUserId] = useState<number | "">("");
  const [rows, setRows] = useState<Row[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);

  useEffect(()=>{ (async ()=> {
    const [m, p] = await Promise.all([getPermissions(), fetchPlants()]);
    setModules(Array.isArray(m)?m:[]);
    setPlants(Array.isArray(p)?p:[]);
  })(); }, []);

  const load = async () => {
    if(!userId) return;
    const data = await getUserPlantPermissions(Number(userId));
    setRows(Array.isArray(data)?data:[]);
  };

  const toggle = (idx:number, key: keyof Row) => {
    const copy = [...rows];
    // @ts-ignore
    copy[idx][key] = !copy[idx][key];
    setRows(copy);
  };

  const addRow = () => {
    setRows([...rows, { user_id: Number(userId), plant_id: plants[0]?.id || 0, module_id: modules[0]?.id || 0, can_add:false, can_edit:false, can_view:false, can_delete:false }]);
  };

  const updateRowField = (idx:number, field:string, value:any) => {
    const copy = [...rows];
    // @ts-ignore
    copy[idx][field] = value;
    setRows(copy);
  };

  const save = async () => {
    if(!userId) return alert("Enter user id");
    try {
      await saveUserPlantPermissions(Number(userId), rows);
      alert("Saved");
      await load();
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  return (
    <div>
      <div className="rbac-header">
        <div className="icon">🏭</div>
        <div className="title">
          <h2>Plant-wise Permission Assignment</h2>
          <p className="small">Assign per-plant module access for a user</p>
          <div className="rbac-underline" />
        </div>
      </div>

      <div className="form-row">
        <input placeholder="user id" value={userId} onChange={e=>setUserId(e.target.value ? Number(e.target.value) : "")} />
        <button className="btn" onClick={load}>Load</button>
        <button className="btn secondary" onClick={addRow}>Add Row</button>
        <button className="btn" onClick={save}>Save</button>
      </div>

      <div style={{ overflowX:"auto" }}>
        <table className="rbac-table">
          <thead><tr><th>Plant</th><th>Module</th><th style={{ textAlign:"center" }}>Add</th><th style={{ textAlign:"center" }}>Edit</th><th style={{ textAlign:"center" }}>View</th><th style={{ textAlign:"center" }}>Delete</th></tr></thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td>
                  <select value={r.plant_id} onChange={e=>updateRowField(idx,"plant_id", Number(e.target.value))}>
                    {plants.map(pl => <option key={pl.id} value={pl.id}>{pl.plant_name || pl.plant_code || pl.id}</option>)}
                  </select>
                </td>
                <td>
                  <select value={r.module_id} onChange={e=>updateRowField(idx,"module_id", Number(e.target.value))}>
                    {modules.map(m=> <option key={m.id} value={m.id}>{m.module_name}</option>)}
                  </select>
                </td>
                <td style={{ textAlign:"center" }}>
                  <label className="switch"><input type="checkbox" checked={!!r.can_add} onChange={()=>toggle(idx,"can_add")} /><span className="track"></span><span className="thumb"></span></label>
                </td>
                <td style={{ textAlign:"center" }}>
                  <label className="switch"><input type="checkbox" checked={!!r.can_edit} onChange={()=>toggle(idx,"can_edit")} /><span className="track"></span><span className="thumb"></span></label>
                </td>
                <td style={{ textAlign:"center" }}>
                  <label className="switch"><input type="checkbox" checked={!!r.can_view} onChange={()=>toggle(idx,"can_view")} /><span className="track"></span><span className="thumb"></span></label>
                </td>
                <td style={{ textAlign:"center" }}>
                  <label className="switch"><input type="checkbox" checked={!!r.can_delete} onChange={()=>toggle(idx,"can_delete")} /><span className="track"></span><span className="thumb"></span></label>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6}>No plant-permissions found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
