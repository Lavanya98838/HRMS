import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  createGoal, getAllGoals, getMyGoals, updateGoal, deleteGoal,
} from "../../services/goalService";

import api from "../../utils/api";
import "./GoalsPage.css";

const STATUS_COLORS = {
  not_started: { bg: "rgba(107,114,128,.12)", color: "#9ca3af", border: "rgba(107,114,128,.2)" },
  in_progress: { bg: "rgba(59,130,246,.12)",  color: "#60a5fa", border: "rgba(59,130,246,.25)" },
  on_track:    { bg: "rgba(16,185,129,.12)",   color: "#34d399", border: "rgba(16,185,129,.25)" },
  at_risk:     { bg: "rgba(245,158,11,.12)",   color: "#fbbf24", border: "rgba(245,158,11,.25)" },
  completed:   { bg: "rgba(16,185,129,.15)",   color: "#10b981", border: "rgba(16,185,129,.3)"  },
  cancelled:   { bg: "rgba(239,68,68,.1)",     color: "#f87171", border: "rgba(239,68,68,.2)"   },
};

const STATUS_LABELS = {
  not_started: "Not Started", in_progress: "In Progress", on_track: "On Track",
  at_risk: "At Risk", completed: "Completed", cancelled: "Cancelled",
};

const PRIORITY_COLORS = { low: "#9ca3af", medium: "#f59e0b", high: "#ef4444" };
const PRIORITY_BG     = { low: "rgba(156,163,175,.12)", medium: "rgba(245,158,11,.12)", high: "rgba(239,68,68,.12)" };
const CAT_ICONS = { performance: "📈", learning: "📚", project: "🎯", personal: "🌱", other: "📋" };

const currentYear = new Date().getFullYear();
const currentQ    = Math.ceil((new Date().getMonth() + 1) / 3);

// ── Employee Search Dropdown ──────────────────────────────
const EmployeeSearch = ({ value, onChange }) => {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const [selected, setSelected] = useState(null);
  const wrapRef = useRef(null);
  const timer   = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await api.get("/employees", { params: { search: q, limit: 8, isActive: true } });
      setResults(res.data.data.employees || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(q), 300);
  };

  const handleSelect = (emp) => {
    setSelected(emp);
    setQuery(`${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
    setOpen(false);
    onChange(emp._id);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    onChange("");
    setResults([]);
  };

  return (
    <div className="emp-search-wrap" ref={wrapRef}>
      <div className="emp-search-input-wrap">
        <input
          type="text" className="emp-search-input"
          placeholder="Search by name or employee ID..."
          value={query} onChange={handleInput}
          onFocus={() => query && setOpen(true)} autoComplete="off"
        />
        {selected && <button className="emp-search-clear" onClick={handleClear} type="button">✕</button>}
      </div>
      {open && (
        <div className="emp-search-dropdown">
          {loading ? (
            <div className="emp-search-state">Searching...</div>
          ) : results.length === 0 && query ? (
            <div className="emp-search-state">No employees found</div>
          ) : (
            results.map(emp => (
              <div key={emp._id} className="emp-search-item" onMouseDown={() => handleSelect(emp)}>
                <div className="emp-search-avatar">
                  {emp.profilePicture?.url
                    ? <img src={emp.profilePicture.url} alt="" />
                    : `${emp.firstName?.[0]}${emp.lastName?.[0]}`}
                </div>
                <div>
                  <div className="emp-search-name">{emp.firstName} {emp.lastName}</div>
                  <div className="emp-search-meta">{emp.employeeId} · {emp.department?.name || "—"}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ── Mini Progress Bar ─────────────────────────────────────
const MiniProgress = ({ value }) => {
  const color = value === 100 ? "#10b981" : value >= 60 ? "#3b82f6" : value >= 30 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 6, background: "var(--bg-elevated)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 32 }}>{value}%</span>
    </div>
  );
};

// ── Task Row ──────────────────────────────────────────────
const TaskRow = ({ goal, isHRManager, onProgressUpdate, onStatusUpdate, onDelete, onComplete }) => {
  const sc        = STATUS_COLORS[goal.status];
  const isLocked  = goal.status === "completed";
  const [slider, setSlider] = useState(goal.progress);
  const [expanded, setExpanded] = useState(false);

  const dueDate = goal.dueDate
    ? new Date(goal.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const isOverdue = goal.dueDate && new Date(goal.dueDate) < new Date() && !isLocked;

  return (
    <>
      <tr
        className={`task-row ${isLocked ? "task-row--locked" : ""}`}
        onClick={() => setExpanded(e => !e)}
        style={{ cursor: "pointer" }}
      >
        {/* Category icon + Title */}
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>{CAT_ICONS[goal.category]}</span>
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>
                {goal.title}
                {isLocked && <span style={{ marginLeft: 8, fontSize: 10, background: "rgba(16,185,129,.15)", color: "#10b981", border: "1px solid rgba(16,185,129,.3)", padding: "2px 6px", borderRadius: 99 }}>✓ Done</span>}
              </div>
              {isHRManager && goal.employee && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {goal.employee.firstName} {goal.employee.lastName} · {goal.employee.employeeId}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Priority */}
        <td>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99,
            background: PRIORITY_BG[goal.priority], color: PRIORITY_COLORS[goal.priority],
            textTransform: "capitalize",
          }}>{goal.priority}</span>
        </td>

        {/* Status */}
        <td>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
            background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
          }}>{STATUS_LABELS[goal.status]}</span>
        </td>

        {/* Progress */}
        <td onClick={e => e.stopPropagation()}>
          <MiniProgress value={slider} />
        </td>

        {/* Due date */}
        <td style={{ fontSize: 12, color: isOverdue ? "#ef4444" : "var(--text-muted)" }}>
          {dueDate || "—"}
          {isOverdue && <span style={{ marginLeft: 4 }}>⚠</span>}
        </td>

        {/* Quarter */}
        <td style={{ fontSize: 12, color: "var(--text-muted)" }}>Q{goal.quarter} {goal.year}</td>

        {/* Actions */}
        <td onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            {!isLocked && (
              <button
                title="Mark as Complete"
                onClick={() => onComplete(goal)}
                style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: "rgba(16,185,129,.12)", color: "#10b981",
                  border: "1px solid rgba(16,185,129,.3)", cursor: "pointer",
                }}
              >✓ Complete</button>
            )}
            {isHRManager && !isLocked && (
              <select
                className="gp-status-select"
                value={goal.status}
                onChange={e => { e.stopPropagation(); onStatusUpdate(goal._id, e.target.value); }}
                style={{ fontSize: 11 }}
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            )}
            {isHRManager && (
              <button className="gp-delete-btn" onClick={() => onDelete(goal._id)} title="Delete">🗑</button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded row */}
      {expanded && (
        <tr className="task-row-expanded">
          <td colSpan={7}>
            <div style={{ padding: "12px 16px 16px", background: "var(--bg-elevated)", borderRadius: 8, margin: "0 4px 8px" }}>
              {goal.target && (
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Target</span>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>🎯 {goal.target}</div>
                </div>
              )}
              {goal.description && (
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Description</span>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{goal.description}</div>
                </div>
              )}
              {!isLocked && (
                <div style={{ marginTop: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Update Progress</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={slider}
                      onChange={e => setSlider(Number(e.target.value))}
                      className="gp-range"
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--violet)", minWidth: 36 }}>{slider}%</span>
                    {slider !== goal.progress && (
                      <button
                        className="gp-save-progress-btn"
                        onClick={() => onProgressUpdate(goal._id, slider)}
                      >Save {slider}%</button>
                    )}
                  </div>
                </div>
              )}
              {goal.feedback && (
                <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
                  💬 {goal.feedback}
                </div>
              )}
              {isLocked && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#10b981", display: "flex", alignItems: "center", gap: 6 }}>
                  🔒 This task is completed and locked from further edits.
                  {goal.completedAt && ` Completed on ${new Date(goal.completedAt).toLocaleDateString("en-IN")}.`}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ── Main Page ─────────────────────────────────────────────
export default function TasksPage() {
  const { user } = useAuth();
  const role = user?.role;
  const isHRManager = ["admin", "hr", "manager"].includes(role);

  const [goals,        setGoals]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState(null);
  const [formError,    setFormError]    = useState(null);
  const [filterYear,   setFilterYear]   = useState(currentYear);
  const [filterQ,      setFilterQ]      = useState(currentQ);
  const [filterStatus, setFilterStatus] = useState("");
  const [activeTab,    setActiveTab]    = useState("active"); // "active" | "archive"

  const [form, setForm] = useState({
    employeeId: "", title: "", description: "", category: "performance",
    target: "", priority: "medium", dueDate: "", quarter: currentQ, year: currentYear,
  });

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { year: filterYear, quarter: filterQ };
      if (filterStatus) params.status = filterStatus;
      const res = isHRManager ? await getAllGoals(params) : await getMyGoals(params);
      setGoals(res.data.data.goals || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterQ, filterStatus, isHRManager]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const activeGoals   = goals.filter(g => g.status !== "completed");
  const archivedGoals = goals.filter(g => g.status === "completed");
  const displayGoals  = activeTab === "active" ? activeGoals : archivedGoals;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim())      return setFormError("Title is required.");
    if (!form.employeeId.trim()) return setFormError("Please select an employee.");
    setSubmitting(true);
    setFormError(null);
    try {
      await createGoal(form);
      setShowForm(false);
      setForm({
        employeeId: "", title: "", description: "", category: "performance",
        target: "", priority: "medium", dueDate: "", quarter: currentQ, year: currentYear,
      });
      fetchGoals();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to create task.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProgressUpdate = async (goalId, progress) => {
    const goal = goals.find(g => g._id === goalId);
    if (goal?.status === "completed") return; // locked
    await updateGoal(goalId, { progress: Number(progress) });
    setGoals(prev => prev.map(g =>
      g._id === goalId
        ? { ...g, progress: Number(progress), status: Number(progress) === 100 ? "completed" : Number(progress) > 0 ? "in_progress" : g.status }
        : g
    ));
  };

  const handleComplete = async (goal) => {
    if (goal.status === "completed") return;
    if (!window.confirm(`Mark "${goal.title}" as completed? This cannot be undone.`)) return;

    await updateGoal(goal._id, { progress: 100, status: "completed" });
    setGoals(prev => prev.map(g =>
      g._id === goal._id ? { ...g, progress: 100, status: "completed", completedAt: new Date() } : g
    ));

    // Notify assigned manager
    try {
      await api.post("/notifications", {
        recipientRole: "manager",
        type: "goal_completed",
        title: "Task Completed",
        message: `${user?.name} has completed the task: "${goal.title}" successfully.`,
        link: `/${role}/goals`,
      });
    } catch { /* silent — notification is non-critical */ }
  };

  const handleStatusUpdate = async (goalId, status) => {
    const goal = goals.find(g => g._id === goalId);
    if (goal?.status === "completed") return; // locked
    await updateGoal(goalId, { status });
    setGoals(prev => prev.map(g => g._id === goalId ? { ...g, status } : g));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    await deleteGoal(id);
    setGoals(prev => prev.filter(g => g._id !== id));
  };

  const total       = goals.length;
  const completed   = archivedGoals.length;
  const atRisk      = goals.filter(g => g.status === "at_risk").length;
  const avgProgress = total > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / total) : 0;

  return (
    <DashboardLayout>
      <div className="gp-page">

        {/* Header */}
        <div className="gp-header">
          <div>
            <h1 className="gp-title">Tasks</h1>
            <p className="gp-sub">{isHRManager ? "Assign and track employee tasks" : "Track your tasks and progress"}</p>
          </div>
          <div className="gp-header-actions">
            <select className="gp-select" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
              {[currentYear, currentYear - 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="gp-select" value={filterQ} onChange={e => setFilterQ(e.target.value)}>
              <option value="">All quarters</option>
              {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
            </select>
            <select className="gp-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {isHRManager && (
              <button className="gp-add-btn" onClick={() => setShowForm(s => !s)}>
                {showForm ? "✕ Cancel" : "+ Add Task"}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {goals.length > 0 && (
          <div className="gp-summary-row">
            {[
              { label: "Total Tasks",  value: total,             color: "#7c3aed" },
              { label: "Completed",    value: completed,         color: "#10b981" },
              { label: "At Risk",      value: atRisk,            color: "#f59e0b" },
              { label: "Avg Progress", value: `${avgProgress}%`, color: "#3b82f6" },
            ].map(s => (
              <div key={s.label} className="gp-stat" style={{ borderColor: `${s.color}30` }}>
                <div className="gp-stat-val" style={{ color: s.color }}>{s.value}</div>
                <div className="gp-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Add Task Form */}
        {showForm && isHRManager && (
          <div className="gp-form-card">
            <h3 className="gp-form-title">New Task</h3>
            <form onSubmit={handleSubmit}>
              <div className="gp-form-grid">
                <div className="gp-field gp-field--full">
                  <label>Employee *</label>
                  <EmployeeSearch value={form.employeeId} onChange={id => setForm(f => ({ ...f, employeeId: id }))} />
                </div>
                <div className="gp-field gp-field--full">
                  <label>Task Title *</label>
                  <input type="text" placeholder="e.g. Improve customer response time" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="gp-field gp-field--full">
                  <label>Description</label>
                  <textarea rows={2} placeholder="More details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="gp-field gp-field--full">
                  <label>Target / Key Result</label>
                  <input type="text" placeholder="e.g. Achieve 95% customer satisfaction" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} />
                </div>
                <div className="gp-field">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {["performance", "learning", "project", "personal", "other"].map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="gp-field">
                  <label>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="gp-field">
                  <label>Quarter</label>
                  <select value={form.quarter} onChange={e => setForm(f => ({ ...f, quarter: Number(e.target.value) }))}>
                    {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
                  </select>
                </div>
                <div className="gp-field">
                  <label>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              {formError && <p className="gp-form-error">⚠ {formError}</p>}
              <button type="submit" className="gp-submit-btn" disabled={submitting}>
                {submitting ? "Creating..." : "Create Task"}
              </button>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
          {[
            { key: "active",  label: `Active Tasks (${activeGoals.length})` },
            { key: "archive", label: `Archive (${archivedGoals.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 20px", border: "none", background: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body)",
                color: activeTab === tab.key ? "var(--violet-light)" : "var(--text-muted)",
                borderBottom: activeTab === tab.key ? "2px solid var(--violet)" : "2px solid transparent",
                transition: "all 0.2s", marginBottom: -1,
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* Task Table */}
        {loading ? (
          <div className="gp-state"><div className="gp-spinner" /><p>Loading tasks...</p></div>
        ) : error ? (
          <div className="gp-state gp-state--error"><p>⚠ {error}</p></div>
        ) : displayGoals.length === 0 ? (
          <div className="gp-state">
            <div className="gp-state-icon">{activeTab === "archive" ? "📦" : "🎯"}</div>
            <p>{activeTab === "archive" ? "No completed tasks yet." : "No active tasks found for this period."}</p>
          </div>
        ) : (
          <div className="table-container">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
                  {["Task", "Priority", "Status", "Progress", "Due Date", "Period", "Actions"].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left",
                      fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayGoals.map(goal => (
                  <TaskRow
                    key={goal._id}
                    goal={goal}
                    isHRManager={isHRManager}
                    onProgressUpdate={handleProgressUpdate}
                    onStatusUpdate={handleStatusUpdate}
                    onDelete={handleDelete}
                    onComplete={handleComplete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}