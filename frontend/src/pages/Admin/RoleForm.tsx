import React, { useState } from "react";
import { createRole } from "../../utils/api";

export default function RoleForm({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return alert("Enter role name");
    try {
      setSaving(true);
      await createRole({ role_name: name.trim(), description: desc });
      setName(""); setDesc("");
      if (onCreated) onCreated();
      alert("Role created");
    } catch (err) {
      console.error(err);
      alert("Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="form-row">
        <input placeholder="Role name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn secondary" onClick={() => { setName(""); setDesc(""); }}>Reset</button>
        <button className="btn" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Create Role"}</button>
      </div>
    </div>
  );
}
