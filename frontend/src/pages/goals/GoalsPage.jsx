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
const CAT_ICONS = { performance: "📈", learning: "📚", project: "🎯", personal: "🌱", other: "📋" };

const currentYear = new Date().getFullYear();
const currentQ    = Math.ceil((new Date().getMonth() + 1) / 3);

// ── Employee Search Dropdown (reusable) ───────────────────
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
          type="text"
          className="emp-search-input"
          placeholder="Search by name or employee ID..."
          value={query}
          onChange={handleInput}
          onFocus={() => query && setOpen(true)}
          autoComplete="off"
        />
        {selected && (
          <button className="emp-search-clear" onClick={handleClear} type="button">✕</button>
        )}
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

const ProgressBar = ({ value, color }) => (
  <div className="gp-progress-bar">
    <div className="gp-progress-fill" style={{ width: `${value}%`, background: color }} />
    <span className="gp-progress-label">{value}%</span>
  </div>
);

export default function GoalsPage() {
  const { user } = useAuth();
  const role = user?.role;
  const isHRManager = ["admin", "hr", "manager"].includes(role);

  const [goals,        setGoals]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState(null);
  const [formError,    setFormError]    = useState(null);
  const [editProgress, setEditProgress] = useState({});
  const [filterYear,   setFilterYear]   = useState(currentYear);
  const [filterQ,      setFilterQ]      = useState(currentQ);
  const [filterStatus, setFilterStatus] = useState("");

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
      setError(err?.response?.data?.message || "Failed to load goals.");
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterQ, filterStatus, isHRManager]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

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
      setFormError(err?.response?.data?.message || "Failed to create goal.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProgressUpdate = async (goalId, progress) => {
    await updateGoal(goalId, { progress: Number(progress) });
    setGoals(prev => prev.map(g =>
      g._id === goalId
        ? { ...g, progress: Number(progress), status: Number(progress) === 100 ? "completed" : Number(progress) > 0 ? "in_progress" : g.status }
        : g
    ));
    setEditProgress(p => ({ ...p, [goalId]: undefined }));
  };

  const handleStatusUpdate = async (goalId, status) => {
    await updateGoal(goalId, { status });
    setGoals(prev => prev.map(g => g._id === goalId ? { ...g, status } : g));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this goal?")) return;
    await deleteGoal(id);
    setGoals(prev => prev.filter(g => g._id !== id));
  };

  const total       = goals.length;
  const completed   = goals.filter(g => g.status === "completed").length;
  const atRisk      = goals.filter(g => g.status === "at_risk").length;
  const avgProgress = total > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / total) : 0;

  return (
    <DashboardLayout>
      <div className="gp-page">

        <div className="gp-header">
          <div>
            <h1 className="gp-title">Goals & OKRs</h1>
            <p className="gp-sub">{isHRManager ? "Set and track employee goals" : "Track your goals and progress"}</p>
          </div>
          <div className="gp-header-actions">
            <select className="gp-select" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
              {[currentYear, currentYear-1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="gp-select" value={filterQ} onChange={e => setFilterQ(e.target.value)}>
              <option value="">All quarters</option>
              {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
            </select>
            <select className="gp-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {isHRManager && (
              <button className="gp-add-btn" onClick={() => setShowForm(s => !s)}>
                {showForm ? "✕ Cancel" : "+ Add Goal"}
              </button>
            )}
          </div>
        </div>

        {goals.length > 0 && (
          <div className="gp-summary-row">
            {[
              { label: "Total Goals",  value: total,           color: "#7c3aed" },
              { label: "Completed",    value: completed,       color: "#10b981" },
              { label: "At Risk",      value: atRisk,          color: "#f59e0b" },
              { label: "Avg Progress", value: `${avgProgress}%`, color: "#3b82f6" },
            ].map(s => (
              <div key={s.label} className="gp-stat" style={{ borderColor: `${s.color}30` }}>
                <div className="gp-stat-val" style={{ color: s.color }}>{s.value}</div>
                <div className="gp-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {showForm && isHRManager && (
          <div className="gp-form-card">
            <h3 className="gp-form-title">New Goal</h3>
            <form onSubmit={handleSubmit}>
              <div className="gp-form-grid">
                <div className="gp-field gp-field--full">
                  <label>Employee *</label>
                  <EmployeeSearch
                    value={form.employeeId}
                    onChange={id => setForm(f => ({ ...f, employeeId: id }))}
                  />
                </div>
                <div className="gp-field gp-field--full">
                  <label>Goal Title *</label>
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
                    {["performance","learning","project","personal","other"].map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
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
                    {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
                  </select>
                </div>
                <div className="gp-field">
                  <label>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              {formError && <p className="gp-form-error">⚠ {formError}</p>}
              <button type="submit" className="gp-submit-btn" disabled={submitting}>
                {submitting ? "Creating..." : "Create Goal"}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="gp-state"><div className="gp-spinner" /><p>Loading goals...</p></div>
        ) : error ? (
          <div className="gp-state gp-state--error"><p>⚠ {error}</p></div>
        ) : goals.length === 0 ? (
          <div className="gp-state">
            <div className="gp-state-icon">🎯</div>
            <p>No goals found for this period.</p>
          </div>
        ) : (
          <div className="gp-list">
            {goals.map(goal => {
              const sc = STATUS_COLORS[goal.status];
              return (
                <div key={goal._id} className="gp-card">
                  <div className="gp-card__top">
                    <div className="gp-card__icon">{CAT_ICONS[goal.category]}</div>
                    <div className="gp-card__info">
                      <div className="gp-card__title">{goal.title}</div>
                      {isHRManager && (
                        <div className="gp-card__emp">
                          {goal.employee?.firstName} {goal.employee?.lastName} · {goal.employee?.employeeId}
                        </div>
                      )}
                      <div className="gp-card__meta">
                        Q{goal.quarter} {goal.year}
                        {goal.dueDate && ` · Due ${new Date(goal.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                        · Assigned by {goal.assignedBy?.name}
                      </div>
                    </div>
                    <div className="gp-card__badges">
                      <span className="gp-priority-dot" style={{ background: PRIORITY_COLORS[goal.priority] }} title={goal.priority} />
                      <span className="gp-status-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {STATUS_LABELS[goal.status]}
                      </span>
                    </div>
                  </div>

                  {goal.target && <div className="gp-card__target">🎯 {goal.target}</div>}
                  {goal.description && <div className="gp-card__desc">{goal.description}</div>}

                  <ProgressBar value={goal.progress} color={goal.progress === 100 ? "#10b981" : goal.progress >= 60 ? "#3b82f6" : "#f59e0b"} />

                  <div className="gp-card__footer">
                    <div className="gp-progress-update">
                      <input
                        type="range" min="0" max="100" step="5"
                        value={editProgress[goal._id] ?? goal.progress}
                        onChange={e => setEditProgress(p => ({ ...p, [goal._id]: e.target.value }))}
                        className="gp-range"
                      />
                      {editProgress[goal._id] !== undefined && editProgress[goal._id] != goal.progress && (
                        <button className="gp-save-progress-btn" onClick={() => handleProgressUpdate(goal._id, editProgress[goal._id])}>
                          Save {editProgress[goal._id]}%
                        </button>
                      )}
                    </div>
                    <div className="gp-card__actions">
                      {isHRManager && (
                        <select className="gp-status-select" value={goal.status} onChange={e => handleStatusUpdate(goal._id, e.target.value)}>
                          {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      )}
                      {isHRManager && (
                        <button className="gp-delete-btn" onClick={() => handleDelete(goal._id)}>🗑</button>
                      )}
                    </div>
                  </div>

                  {goal.feedback && <div className="gp-card__feedback">💬 <em>{goal.feedback}</em></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
