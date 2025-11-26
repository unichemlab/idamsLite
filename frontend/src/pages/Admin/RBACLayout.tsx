import React, { useState, useEffect } from "react";
import RoleEditor from "./RoleEditor";
import PermissionEditor from "./PermissionEditor";
import RolePermissionMatrix from "./RolePermissionMatrix";
import PlantPermissionEditor from "./PlantPermissionEditor";
import RoleForm from "./RoleForm";
import { IconUsers, IconRoles, IconPermissions, IconPlants } from "./icons";
//import "../../pages/Admin/rbac-premium.css"; // adjust path if needed

export default function RBACLayout(){
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light"|"dark">("light");
  const [activeTab, setActiveTab] = useState<"roles"|"permissions"|"matrix"|"plant">("roles");

  useEffect(()=> {
    const saved = localStorage.getItem("rbac_theme");
    if (saved === "dark" || saved === "light") setTheme(saved as any);
    document.documentElement.classList.toggle("theme-light", theme === "light");
    localStorage.setItem("rbac_theme", theme);
  }, [theme]);

  const onCreated = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("rbac:refresh"));
  };

  const tabs = [
    { id: "roles", name: "Roles", icon: <IconRoles/> },
    { id: "permissions", name: "Permissions", icon: <IconPermissions/> },
    { id: "matrix", name: "Role Matrix", icon: <IconUsers/> },
    { id: "plant", name: "Plant Perms", icon: <IconPlants/> },
  ];

  return (
    <div className="rbac-page">
      <aside className="rbac-sidebar">
        <div className="brand">
          <div className="logo">RB</div>
          <div>
            <h3>RBAC Admin</h3>
            <div style={{ fontSize:12, color:"var(--muted)" }}>Manage roles & permissions</div>
          </div>
        </div>

        <nav>
          {tabs.map(t=> (
            <a key={t.id} onClick={()=>setActiveTab(t.id as any)} className={activeTab===t.id ? "active":""}>
              <span className="dot" />
              <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}>{t.icon} {t.name}</span>
            </a>
          ))}
        </nav>

        <div style={{ marginTop:18, display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ marginRight:6 }}>
            <button className="btn secondary" onClick={()=>setTheme(theme==="light"?"dark":"light")}>
              {theme==="light" ? "Light" : "Dark"}
            </button>
          </div>
          <div style={{ marginLeft:"auto", color:"var(--muted)", fontSize:13 }}>v1.1</div>
        </div>
      </aside>

      <main className="rbac-main">
        <section className="rbac-card" style={{ display: activeTab==="roles" ? "block":"none" }}><RoleEditor/></section>
        <section className="rbac-card" style={{ display: activeTab==="permissions" ? "block":"none" }}><PermissionEditor/></section>
        <section className="rbac-card" style={{ display: activeTab==="matrix" ? "block":"none" }}><RolePermissionMatrix/></section>
        <section className="rbac-card" style={{ display: activeTab==="plant" ? "block":"none" }}><PlantPermissionEditor/></section>
      </main>

      <button className="fab" title="Add Role" onClick={()=>setOpen(true)}>+</button>

      {open && (
        <div className="modal-backdrop" onClick={()=>setOpen(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <h3 style={{ margin:0 }}>Create Role</h3>
              <button className="btn secondary" onClick={()=>setOpen(false)}>Close</button>
            </div>
            <RoleForm onCreated={onCreated} />
          </div>
        </div>
      )}
    </div>
  );
}
