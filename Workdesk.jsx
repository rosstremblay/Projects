import { useState, useEffect } from "react";

const ICONS = {
  Links: "⬡", Projects: "◈", Proposals: "◇",
  "To-Dos": "□", Decisions: "◉", "Parking Lot": "▷", "Proactive Contacts": "◎",
};

const STATUS_COLORS = {
  "On Track": "#22c55e", "At Risk": "#f59e0b", Delayed: "#ef4444", Complete: "#6366f1",
  Submitted: "#3b82f6", Won: "#22c55e", Lost: "#ef4444", Pending: "#f59e0b",
  Open: "#f59e0b", Closed: "#6366f1", Approved: "#22c55e", Rejected: "#ef4444",
};

const initialData = {
  Links: [
    { id: 1, label: "Project Tracker", url: "https://example.com", category: "Internal" },
    { id: 2, label: "Design System", url: "https://example.com", category: "Design" },
    { id: 3, label: "Slack Workspace", url: "https://slack.com", category: "Comms" },
  ],
  Projects: [
    { id: 1, name: "Website Redesign", status: "On Track", nextSteps: "Finalize homepage mockups" },
    { id: 2, name: "Q2 Campaign", status: "At Risk", nextSteps: "Align on budget with marketing" },
    { id: 3, name: "API Integration", status: "Delayed", nextSteps: "Unblock dev team dependency" },
  ],
  Proposals: [
    { id: 1, name: "Enterprise Deal — Acme Corp", status: "Submitted", nextSteps: "Awaiting client review", priority: "High" },
    { id: 2, name: "Consulting Retainer — Globex", status: "Open", nextSteps: "Draft scope of work", priority: "Medium" },
    { id: 3, name: "SaaS License — Initech", status: "Submitted", nextSteps: "Follow up end of week", priority: "Low" },
  ],
  "Proactive Contacts": [
    { id: 1, name: "Jane Smith", company: "Acme Corp", topic: "Q2 expansion opportunity" },
    { id: 2, name: "Mark Levi", company: "Globex", topic: "Renewal conversation" },
    { id: 3, name: "Sara Chen", company: "Initech", topic: "Intro meeting" },
  ],
  "To-Dos": [
    { id: 1, text: "Review Q1 budget report", done: false, priority: "High" },
    { id: 2, text: "Send follow-up to Acme", done: false, priority: "High" },
    { id: 3, text: "Update project timelines", done: true, priority: "Medium" },
    { id: 4, text: "Schedule design review", done: false, priority: "Low" },
  ],
  Decisions: [
    { id: 1, decision: "Migrate to new CRM platform", status: "Approved", date: "Feb 28", owner: "Leadership" },
    { id: 2, decision: "Hire 2 contractors for Q2", status: "Open", date: "Mar 1", owner: "You" },
    { id: 3, decision: "Pause podcast series", status: "Rejected", date: "Feb 15", owner: "Marketing" },
  ],
  "Parking Lot": [
    { id: 1, item: "Explore AI tooling for ops", addedBy: "You", date: "Feb 10" },
    { id: 2, item: "Consider rebrand in H2", addedBy: "Team", date: "Feb 22" },
    { id: 3, item: "Evaluate new office space", addedBy: "Ops", date: "Mar 1" },
  ],
};

// Shared inline edit helpers
function InlineText({ value, onChange, style = {}, placeholder = "click to edit" }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);
  const commit = () => { setEditing(false); onChange(val); };
  if (editing) return (
    <input
      autoFocus value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(value); setEditing(false); } }}
      style={{ ...inlineInputStyle, ...style }}
    />
  );
  return (
    <span onClick={() => setEditing(true)} title="Click to edit"
      style={{ cursor: "pointer", display: "inline-block", minWidth: 80, minHeight: 18, borderBottom: "1px dashed #cbd5e1", color: value ? "inherit" : "transparent", ...style }}>
      {value || "        "}
    </span>
  );
}

function InlineSelect({ value, options, onChange }) {
  const [editing, setEditing] = useState(false);
  const color = STATUS_COLORS[value] || "#475569";
  if (editing) return (
    <select autoFocus value={value}
      onChange={e => { onChange(e.target.value); setEditing(false); }}
      onBlur={() => setEditing(false)}
      style={{ ...inlineInputStyle, padding: "2px 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
  return (
    <span onClick={() => setEditing(true)} title="Click to change status" style={{
      cursor: "pointer", background: color + "22", color, border: `1px solid ${color}33`,
      borderRadius: 3, padding: "2px 8px", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "monospace",
    }}>{value}</span>
  );
}

function InlineNumber({ value, onChange, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);
  const commit = () => { setEditing(false); onChange(Number(val)); };
  if (editing) return (
    <input autoFocus type="number" min={0} max={100} value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") commit(); }}
      style={{ ...inlineInputStyle, width: 60, ...style }}
    />
  );
  return (
    <span onClick={() => setEditing(true)} title="Click to edit"
      style={{ cursor: "pointer", borderBottom: "1px dashed #e2e8f0", color: "#475569", fontSize: 11, fontFamily: "monospace", ...style }}>
      {value}%
    </span>
  );
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || "#475569";
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}33`,
      borderRadius: 3, padding: "2px 8px", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "monospace",
    }}>{status}</span>
  );
}

function ProgressBar({ value }) {
  const color = value >= 70 ? "#22c55e" : value >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ background: "#e2e8f0", borderRadius: 2, height: 4, width: "100%", marginTop: 4 }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
    </div>
  );
}

function LinksSection({ data, setData }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "", url: "", category: "" });

  const update = (id, field, val) => setData(d => ({ ...d, Links: d.Links.map(l => l.id === id ? { ...l, [field]: val } : l) }));
  const add = () => {
    if (!form.label || !form.url) return;
    setData(d => ({ ...d, Links: [...d.Links, { id: Date.now(), ...form }] }));
    setForm({ label: "", url: "", category: "" });
    setAdding(false);
  };
  const remove = (id) => setData(d => ({ ...d, Links: d.Links.filter(l => l.id !== id) }));
  const categories = [...new Set(data.map(l => l.category).filter(Boolean))];

  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "#475569", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>
            {["Label", "URL", "Category", ""].map(h => <th key={h} style={{ textAlign: "left", paddingBottom: 8, fontWeight: 600, paddingRight: 12 }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map(link => (
            <tr key={link.id} style={{ borderTop: "1px solid #f1f5f9" }}>
              <td style={{ padding: "8px 12px 8px 0", fontWeight: 600, color: "#2563eb" }}>
                <InlineText value={link.label} onChange={v => update(link.id, "label", v)} />
              </td>
              <td style={{ padding: "8px 12px 8px 0", color: "#475569", fontSize: 12, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <InlineText value={link.url} onChange={v => update(link.id, "url", v)} placeholder="https://..." />
              </td>
              <td style={{ padding: "8px 12px 8px 0", color: "#475569" }}>
                <InlineText value={link.category} onChange={v => update(link.id, "category", v)} placeholder="category" />
              </td>
              <td><button onClick={() => remove(link.id)} style={deleteBtnStyle}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {adding ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <input placeholder="Label" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={inputStyle} />
          <input placeholder="URL" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} style={{ ...inputStyle, width: 200 }} />
          <input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle} />
          <button onClick={add} style={addBtnStyle}>Add</button>
          <button onClick={() => setAdding(false)} style={cancelBtnStyle}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ ...ghostBtnStyle, marginTop: 10 }}>+ Add Link</button>
      )}
    </div>
  );
}

function ProjectsSection({ data, setData }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", status: "On Track", nextSteps: "" });

  const update = (id, field, val) => setData(d => ({ ...d, Projects: d.Projects.map(p => p.id === id ? { ...p, [field]: val } : p) }));
  const add = () => {
    if (!form.name) return;
    setData(d => ({ ...d, Projects: [...d.Projects, { id: Date.now(), ...form }] }));
    setForm({ name: "", status: "On Track", nextSteps: "" });
    setAdding(false);
  };
  const remove = (id) => setData(d => ({ ...d, Projects: d.Projects.filter(p => p.id !== id) }));

  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "#475569", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>
            {["Project", "Status", "Next Steps", ""].map(h => <th key={h} style={{ textAlign: "left", paddingBottom: 8, fontWeight: 600, paddingRight: 12 }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map(p => (
            <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
              <td style={{ padding: "8px 12px 8px 0", fontWeight: 600, color: "#0f172a", minWidth: 160 }}>
                <InlineText value={p.name} onChange={v => update(p.id, "name", v)} />
              </td>
              <td style={{ padding: "8px 12px 8px 0" }}>
                <InlineSelect value={p.status} options={["On Track", "At Risk", "Delayed", "Complete"]} onChange={v => update(p.id, "status", v)} />
              </td>
              <td style={{ padding: "8px 12px 8px 0", color: "#475569", minWidth: 220 }}>
                <InlineText value={p.nextSteps} onChange={v => update(p.id, "nextSteps", v)} placeholder="" />
              </td>
              <td><button onClick={() => remove(p.id)} style={deleteBtnStyle}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {adding ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <input placeholder="Project name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, width: 200 }} />
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
            {["On Track", "At Risk", "Delayed", "Complete"].map(s => <option key={s}>{s}</option>)}
          </select>
          <input placeholder="Next steps" value={form.nextSteps} onChange={e => setForm(f => ({ ...f, nextSteps: e.target.value }))} style={{ ...inputStyle, width: 240 }} />
          <button onClick={add} style={addBtnStyle}>Add</button>
          <button onClick={() => setAdding(false)} style={cancelBtnStyle}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ ...ghostBtnStyle, marginTop: 12 }}>+ Add Project</button>
      )}
    </div>
  );
}

function ProposalsSection({ data, setData }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", status: "Open", nextSteps: "", priority: "Medium" });

  const priorityRank = { High: 0, Medium: 1, Low: 2 };
  const priorityColor = { High: "#ef4444", Medium: "#f59e0b", Low: "#475569" };

  const update = (id, field, val) => setData(d => ({ ...d, Proposals: d.Proposals.map(p => p.id === id ? { ...p, [field]: val } : p) }));
  const add = () => {
    if (!form.name) return;
    setData(d => ({ ...d, Proposals: [...d.Proposals, { id: Date.now(), ...form }] }));
    setForm({ name: "", status: "Open", nextSteps: "", priority: "Medium" });
    setAdding(false);
  };
  const remove = (id) => setData(d => ({ ...d, Proposals: d.Proposals.filter(p => p.id !== id) }));

  const sorted = [...data].sort((a, b) => (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1));

  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "#475569", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>
            {["Proposal", "Priority", "Status", "Next Steps", ""].map(h => <th key={h} style={{ textAlign: "left", paddingBottom: 8, fontWeight: 600, paddingRight: 12 }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
              <td style={{ padding: "8px 12px 8px 0", fontWeight: 600, color: "#0f172a", minWidth: 160 }}>
                <InlineText value={p.name} onChange={v => update(p.id, "name", v)} />
              </td>
              <td style={{ padding: "8px 12px 8px 0" }}>
                <span onClick={() => {
                  const opts = ["High", "Medium", "Low"];
                  update(p.id, "priority", opts[(opts.indexOf(p.priority ?? "Medium") + 1) % opts.length]);
                }} title="Click to cycle priority" style={{ cursor: "pointer" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: priorityColor[p.priority ?? "Medium"], fontFamily: "monospace", letterSpacing: "0.08em" }}>{p.priority ?? "Medium"}</span>
                </span>
              </td>
              <td style={{ padding: "8px 12px 8px 0" }}>
                <InlineSelect value={p.status} options={["Open", "Submitted"]} onChange={v => update(p.id, "status", v)} />
              </td>
              <td style={{ padding: "8px 12px 8px 0", color: "#475569", minWidth: 180 }}>
                <InlineText value={p.nextSteps} onChange={v => update(p.id, "nextSteps", v)} placeholder="" />
              </td>
              <td><button onClick={() => remove(p.id)} style={deleteBtnStyle}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {adding ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <input placeholder="Proposal name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, width: 220 }} />
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
            {["High", "Medium", "Low"].map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
            {["Open", "Submitted"].map(s => <option key={s}>{s}</option>)}
          </select>
          <input placeholder="Next steps" value={form.nextSteps} onChange={e => setForm(f => ({ ...f, nextSteps: e.target.value }))} style={{ ...inputStyle, width: 220 }} />
          <button onClick={add} style={addBtnStyle}>Add</button>
          <button onClick={() => setAdding(false)} style={cancelBtnStyle}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ ...ghostBtnStyle, marginTop: 12 }}>+ Add Proposal</button>
      )}
    </div>
  );
}

function ProactiveContactsSection({ data, setData }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", topic: "" });

  const update = (id, field, val) => setData(d => ({ ...d, "Proactive Contacts": d["Proactive Contacts"].map(c => c.id === id ? { ...c, [field]: val } : c) }));
  const add = () => {
    if (!form.name) return;
    setData(d => ({ ...d, "Proactive Contacts": [...(d["Proactive Contacts"] || []), { id: Date.now(), ...form }] }));
    setForm({ name: "", company: "", topic: "" });
    setAdding(false);
  };
  const remove = (id) => setData(d => ({ ...d, "Proactive Contacts": d["Proactive Contacts"].filter(c => c.id !== id) }));

  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "#475569", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>
            {["Name", "Company", "Topic", ""].map(h => <th key={h} style={{ textAlign: "left", paddingBottom: 8, fontWeight: 600, paddingRight: 12 }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {(data || []).map(c => (
            <tr key={c.id} style={{ borderTop: "1px solid #f1f5f9" }}>
              <td style={{ padding: "8px 12px 8px 0", fontWeight: 600, color: "#0f172a" }}>
                <InlineText value={c.name} onChange={v => update(c.id, "name", v)} />
              </td>
              <td style={{ padding: "8px 12px 8px 0", color: "#2563eb" }}>
                <InlineText value={c.company} onChange={v => update(c.id, "company", v)} placeholder="company" />
              </td>
              <td style={{ padding: "8px 12px 8px 0", color: "#475569" }}>
                <InlineText value={c.topic} onChange={v => update(c.id, "topic", v)} placeholder="topic" />
              </td>
              <td><button onClick={() => remove(c.id)} style={deleteBtnStyle}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {adding ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, width: 150 }} />
          <input placeholder="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} style={{ ...inputStyle, width: 150 }} />
          <input placeholder="Topic" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} style={{ ...inputStyle, width: 220 }} />
          <button onClick={add} style={addBtnStyle}>Add</button>
          <button onClick={() => setAdding(false)} style={cancelBtnStyle}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ ...ghostBtnStyle, marginTop: 12 }}>+ Add Contact</button>
      )}
    </div>
  );
}

function TodosSection({ data, setData }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ text: "", priority: "Medium" });

  const toggle = (id) => setData(d => ({ ...d, "To-Dos": d["To-Dos"].map(t => t.id === id ? { ...t, done: !t.done } : t) }));
  const update = (id, field, val) => setData(d => ({ ...d, "To-Dos": d["To-Dos"].map(t => t.id === id ? { ...t, [field]: val } : t) }));
  const remove = (id) => setData(d => ({ ...d, "To-Dos": d["To-Dos"].filter(t => t.id !== id) }));
  const add = () => {
    if (!form.text) return;
    setData(d => ({ ...d, "To-Dos": [...d["To-Dos"], { id: Date.now(), ...form, done: false }] }));
    setForm({ text: "", priority: "Medium" });
    setAdding(false);
  };

  const priorityColor = { High: "#ef4444", Medium: "#f59e0b", Low: "#475569" };
  const priorityRank = { High: 0, Medium: 1, Low: 2 };
  const open = [...data.filter(t => !t.done)].sort((a, b) => (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1));
  const done = data.filter(t => t.done);

  return (
    <div>
      {open.map(todo => (
        <div key={todo.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div onClick={() => toggle(todo.id)} style={{ width: 16, height: 16, border: "2px solid #94a3b8", borderRadius: 3, cursor: "pointer", flexShrink: 0 }} />
          <span style={{ flex: 1, color: "#0f172a", fontSize: 13 }}>
            <InlineText value={todo.text} onChange={v => update(todo.id, "text", v)} />
          </span>
          <span style={{ cursor: "pointer" }} onClick={() => {
            const opts = ["High", "Medium", "Low"];
            update(todo.id, "priority", opts[(opts.indexOf(todo.priority) + 1) % opts.length]);
          }} title="Click to cycle priority">
            <span style={{ fontSize: 10, fontWeight: 700, color: priorityColor[todo.priority], fontFamily: "monospace", letterSpacing: "0.08em" }}>{todo.priority}</span>
          </span>
          <button onClick={() => remove(todo.id)} style={deleteBtnStyle}>✕</button>
        </div>
      ))}
      {done.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, fontFamily: "monospace" }}>Completed</div>
          {done.map(todo => (
            <div key={todo.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <div onClick={() => toggle(todo.id)} style={{ width: 16, height: 16, border: "2px solid #22c55e", borderRadius: 3, cursor: "pointer", flexShrink: 0, background: "#22c55e22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#22c55e", fontSize: 10 }}>✓</span>
              </div>
              <span style={{ flex: 1, color: "#475569", fontSize: 13, textDecoration: "line-through" }}>{todo.text}</span>
              <button onClick={() => remove(todo.id)} style={deleteBtnStyle}>✕</button>
            </div>
          ))}
        </div>
      )}
      {adding ? (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input placeholder="Task" value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} onKeyDown={e => e.key === "Enter" && add()} style={{ ...inputStyle, flex: 1 }} autoFocus />
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
            {["High", "Medium", "Low"].map(p => <option key={p}>{p}</option>)}
          </select>
          <button onClick={add} style={addBtnStyle}>Add</button>
          <button onClick={() => setAdding(false)} style={cancelBtnStyle}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ ...ghostBtnStyle, marginTop: 10 }}>+ Add Task</button>
      )}
    </div>
  );
}

function DecisionsSection({ data, setData }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ decision: "", status: "Open", owner: "", date: new Date().toISOString().slice(0, 10) });

  const update = (id, field, val) => setData(d => ({ ...d, Decisions: d.Decisions.map(dec => dec.id === id ? { ...dec, [field]: val } : dec) }));
  const add = () => {
    if (!form.decision) return;
    setData(d => ({ ...d, Decisions: [...d.Decisions, { id: Date.now(), ...form }] }));
    setForm({ decision: "", status: "Open", owner: "", date: new Date().toISOString().slice(0, 10) });
    setAdding(false);
  };
  const remove = (id) => setData(d => ({ ...d, Decisions: d.Decisions.filter(dec => dec.id !== id) }));

  return (
    <div>
      {data.map(d => (
        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ paddingTop: 1 }}>
            <InlineSelect value={d.status} options={["Open", "Approved", "Rejected", "Closed"]} onChange={v => update(d.id, "status", v)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#0f172a", fontSize: 13, fontWeight: 500, marginBottom: 3 }}>
              <InlineText value={d.decision} onChange={v => update(d.id, "decision", v)} />
            </div>
            <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#475569", fontFamily: "monospace" }}>
              <InlineText value={d.owner} onChange={v => update(d.id, "owner", v)} placeholder="owner" style={{ fontSize: 11 }} />
              <span>·</span>
              <InlineText value={d.date} onChange={v => update(d.id, "date", v)} placeholder="date" style={{ fontSize: 11 }} />
            </div>
          </div>
          <button onClick={() => remove(d.id)} style={deleteBtnStyle}>✕</button>
        </div>
      ))}
      {adding ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <input placeholder="Decision" value={form.decision} onChange={e => setForm(f => ({ ...f, decision: e.target.value }))} style={{ ...inputStyle, flex: 1, minWidth: 180 }} autoFocus />
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
            {["Open", "Approved", "Rejected", "Closed"].map(s => <option key={s}>{s}</option>)}
          </select>
          <input placeholder="Owner" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} style={{ ...inputStyle, width: 110 }} />
          <button onClick={add} style={addBtnStyle}>Add</button>
          <button onClick={() => setAdding(false)} style={cancelBtnStyle}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ ...ghostBtnStyle, marginTop: 12 }}>+ Add Decision</button>
      )}
    </div>
  );
}

function ParkingLotSection({ data, setData }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ item: "", addedBy: "" });

  const update = (id, field, val) => setData(d => ({ ...d, "Parking Lot": d["Parking Lot"].map(p => p.id === id ? { ...p, [field]: val } : p) }));
  const add = () => {
    if (!form.item) return;
    setData(d => ({ ...d, "Parking Lot": [...d["Parking Lot"], { id: Date.now(), ...form, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) }] }));
    setForm({ item: "", addedBy: "" });
    setAdding(false);
  };
  const remove = (id) => setData(d => ({ ...d, "Parking Lot": d["Parking Lot"].filter(p => p.id !== id) }));

  return (
    <div>
      {data.map(p => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
          <span style={{ color: "#94a3b8", fontSize: 14, marginTop: 1 }}>▷</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#0f172a", fontSize: 13 }}>
              <InlineText value={p.item} onChange={v => update(p.id, "item", v)} />
            </div>
          </div>
          <button onClick={() => remove(p.id)} style={deleteBtnStyle}>✕</button>
        </div>
      ))}
      {adding ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <input placeholder="Idea or item" value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))} style={{ ...inputStyle, flex: 1, minWidth: 200 }} autoFocus />
          <input placeholder="Added by" value={form.addedBy} onChange={e => setForm(f => ({ ...f, addedBy: e.target.value }))} style={{ ...inputStyle, width: 120 }} />
          <button onClick={add} style={addBtnStyle}>Add</button>
          <button onClick={() => setAdding(false)} style={cancelBtnStyle}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ ...ghostBtnStyle, marginTop: 12 }}>+ Park an Item</button>
      )}
    </div>
  );
}

const inlineInputStyle = {
  background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4,
  color: "#0f172a", padding: "3px 7px", fontSize: 13, outline: "none",
  fontFamily: "inherit", width: "100%",
};
const inputStyle = {
  background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 4,
  color: "#0f172a", padding: "6px 10px", fontSize: 13, outline: "none", fontFamily: "inherit",
};
const addBtnStyle = {
  background: "#3b82f6", border: "none", borderRadius: 4, color: "#fff",
  padding: "6px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600,
};
const cancelBtnStyle = {
  background: "none", border: "1px solid #e2e8f0", borderRadius: 4,
  color: "#475569", padding: "6px 14px", fontSize: 13, cursor: "pointer",
};
const ghostBtnStyle = {
  background: "none", border: "1px dashed #94a3b8", borderRadius: 4,
  color: "#475569", padding: "5px 12px", fontSize: 12, cursor: "pointer", letterSpacing: "0.04em",
};
const deleteBtnStyle = {
  background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12, padding: "0 2px",
};

const STORAGE_KEY = "workdesk_data_v2";
function loadData() {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s); } catch (e) {}
  return initialData;
}

function Card({ title, icon, children, colSpan = 1, rowSpan = 1, fullHeight = false }) {
  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10,
      padding: "18px 22px", gridColumn: `span ${colSpan}`, gridRow: `span ${rowSpan}`,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" }}>
        <span style={{ fontSize: 12, color: "#3b82f6" }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", fontFamily: "'IBM Plex Mono', monospace" }}>{title}</span>
      </div>
      <div style={{ flex: fullHeight ? 1 : "unset", overflow: fullHeight ? "auto" : "unset" }}>{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(loadData);
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 1500);
      return () => clearTimeout(t);
    } catch (e) {}
  }, [data, mounted]);

  const resetData = () => {
    if (window.confirm("Reset all data to defaults?")) { localStorage.removeItem(STORAGE_KEY); setData(initialData); }
  };

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", color: "#0f172a", fontFamily: "'IBM Plex Sans', system-ui, sans-serif", opacity: mounted ? 1 : 0, transition: "opacity 0.3s ease" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #f1f5f9; } ::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 2px; }
        select option { background: #fff; color: #0f172a; }
        input::placeholder { color: #475569; }
        input:focus, select:focus { border-color: #3b82f6 !important; outline: none; }
      `}</style>

      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#3b82f6", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>WORKDESK</span>
          <span style={{ width: 1, height: 14, background: "#e2e8f0", display: "inline-block" }} />
          <span style={{ fontSize: 12, color: "#475569" }}>{today}</span>
          <span style={{ fontSize: 10, color: saved ? "#16a34a" : "transparent", fontFamily: "monospace", transition: "color 0.4s ease" }}>✓ saved</span>
        </div>
        <button onClick={resetData} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 4, color: "#475569", cursor: "pointer", fontSize: 10, letterSpacing: "0.08em", fontFamily: "monospace", padding: "4px 10px" }}>RESET</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gridTemplateRows: "auto auto auto", gap: 14, padding: "18px 32px", maxWidth: 1920, margin: "0 auto" }}>
        <Card title="Projects" icon={ICONS.Projects} colSpan={2} rowSpan={2}>
          <ProjectsSection data={data.Projects} setData={setData} />
        </Card>
        <Card title="To-Dos" icon={ICONS["To-Dos"]} rowSpan={3} fullHeight>
          <TodosSection data={data["To-Dos"]} setData={setData} />
        </Card>
        <Card title="Links" icon={ICONS.Links}>
          <LinksSection data={data.Links} setData={setData} />
        </Card>
        <Card title="Proposals" icon={ICONS.Proposals} colSpan={2}>
          <ProposalsSection data={data.Proposals} setData={setData} />
        </Card>
        <Card title="Parking Lot" icon={ICONS["Parking Lot"]} rowSpan={2}>
          <ParkingLotSection data={data["Parking Lot"]} setData={setData} />
        </Card>
        <Card title="Proactive Contacts" icon={ICONS["Proactive Contacts"]}>
          <ProactiveContactsSection data={data["Proactive Contacts"]} setData={setData} />
        </Card>
        <Card title="Decisions" icon={ICONS.Decisions}>
          <DecisionsSection data={data.Decisions} setData={setData} />
        </Card>
      </div>
    </div>
  );
}
