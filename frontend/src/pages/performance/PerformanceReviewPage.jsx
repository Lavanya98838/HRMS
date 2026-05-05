import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  createReview, getAllReviews, getMyReviews, deleteReview,
} from "../../services/performanceService";
import api from "../../utils/api";
import "./PerformanceReviewPage.css";

const RATING_LABELS = { 1: "Poor", 2: "Below Average", 3: "Average", 4: "Good", 5: "Excellent" };
const RATING_COLORS = { 1: "#ef4444", 2: "#f97316", 3: "#f59e0b", 4: "#3b82f6", 5: "#10b981" };
const CATEGORIES = ["workQuality", "communication", "punctuality", "teamwork", "initiative"];
const CAT_LABELS = {
  workQuality: "Work Quality", communication: "Communication",
  punctuality: "Punctuality", teamwork: "Teamwork", initiative: "Initiative",
};

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

  // Close on outside click
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
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
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
              <div
                key={emp._id}
                className="emp-search-item"
                onMouseDown={() => handleSelect(emp)}
              >
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

// ── Star Rating ───────────────────────────────────────────
const StarRating = ({ value, onChange, readonly }) => (
  <div className="pr-stars">
    {[1,2,3,4,5].map(n => (
      <button
        key={n}
        type="button"
        className={`pr-star ${n <= value ? "pr-star--filled" : ""}`}
        onClick={() => !readonly && onChange?.(n)}
        disabled={readonly}
        style={{ color: n <= value ? RATING_COLORS[value] : undefined }}
      >★</button>
    ))}
    {value > 0 && (
      <span className="pr-star-label" style={{ color: RATING_COLORS[value] }}>
        {RATING_LABELS[value]}
      </span>
    )}
  </div>
);

const OverallBadge = ({ rating }) => {
  const color = rating >= 4.5 ? "#10b981" : rating >= 3.5 ? "#3b82f6" : rating >= 2.5 ? "#f59e0b" : "#ef4444";
  const label = rating >= 4.5 ? "Excellent" : rating >= 3.5 ? "Good" : rating >= 2.5 ? "Average" : "Needs Improvement";
  return (
    <span className="pr-overall-badge" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {rating}/5 · {label}
    </span>
  );
};

// ── Main Page ─────────────────────────────────────────────
export default function PerformanceReviewPage() {
  const { user } = useAuth();
  const role = user?.role;
  const isHRManager = ["admin", "hr", "manager"].includes(role);

  const [reviews,    setReviews]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);
  const [formError,  setFormError]  = useState(null);
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterQ,    setFilterQ]    = useState("");
  const [expanded,   setExpanded]   = useState(null);

  const [form, setForm] = useState({
    employeeId: "", period: "quarterly", quarter: currentQ, year: currentYear,
    ratings: { workQuality: 0, communication: 0, punctuality: 0, teamwork: 0, initiative: 0 },
    comments: "", strengths: "", improvements: "",
  });

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { year: filterYear };
      if (filterQ) params.quarter = filterQ;
      const res = isHRManager
        ? await getAllReviews(params)
        : await getMyReviews(params);
      setReviews(res.data.data.reviews || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterQ, isHRManager]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allRated = CATEGORIES.every(c => form.ratings[c] > 0);
    if (!allRated)        return setFormError("Please rate all 5 categories.");
    if (!form.employeeId) return setFormError("Please select an employee.");
    setSubmitting(true);
    setFormError(null);
    try {
      await createReview(form);
      setShowForm(false);
      setForm({
        employeeId: "", period: "quarterly", quarter: currentQ, year: currentYear,
        ratings: { workQuality: 0, communication: 0, punctuality: 0, teamwork: 0, initiative: 0 },
        comments: "", strengths: "", improvements: "",
      });
      fetchReviews();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    await deleteReview(id);
    setReviews(prev => prev.filter(r => r._id !== id));
  };

  return (
    <DashboardLayout>
      <div className="pr-page">

        {/* Header */}
        <div className="pr-header">
          <div>
            <h1 className="pr-title">Performance Reviews</h1>
            <p className="pr-sub">{isHRManager ? "Manage and track employee performance" : "View your performance reviews"}</p>
          </div>
          <div className="pr-header-actions">
            <select className="pr-select" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
              {[currentYear, currentYear-1, currentYear-2].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="pr-select" value={filterQ} onChange={e => setFilterQ(e.target.value)}>
              <option value="">All quarters</option>
              {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
            </select>
            {isHRManager && (
              <button className="pr-add-btn" onClick={() => setShowForm(s => !s)}>
                {showForm ? "✕ Cancel" : "+ Add Review"}
              </button>
            )}
          </div>
        </div>

        {/* Create Form */}
        {showForm && isHRManager && (
          <div className="pr-form-card">
            <h3 className="pr-form-title">New Performance Review</h3>
            <form onSubmit={handleSubmit}>
              <div className="pr-form-grid">

                {/* Employee Search */}
                <div className="pr-field pr-field--full">
                  <label>Employee *</label>
                  <EmployeeSearch
                    value={form.employeeId}
                    onChange={id => setForm(f => ({ ...f, employeeId: id }))}
                  />
                </div>

                <div className="pr-field">
                  <label>Period</label>
                  <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                {form.period === "quarterly" && (
                  <div className="pr-field">
                    <label>Quarter</label>
                    <select value={form.quarter} onChange={e => setForm(f => ({ ...f, quarter: Number(e.target.value) }))}>
                      {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
                    </select>
                  </div>
                )}
                <div className="pr-field">
                  <label>Year</label>
                  <select value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}>
                    {[currentYear, currentYear-1].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Ratings */}
              <div className="pr-ratings-section">
                <h4 className="pr-ratings-title">Performance Ratings</h4>
                {CATEGORIES.map(cat => (
                  <div key={cat} className="pr-rating-row">
                    <span className="pr-rating-label">{CAT_LABELS[cat]}</span>
                    <StarRating
                      value={form.ratings[cat]}
                      onChange={v => setForm(f => ({ ...f, ratings: { ...f.ratings, [cat]: v } }))}
                    />
                  </div>
                ))}
              </div>

              <div className="pr-form-grid">
                <div className="pr-field pr-field--full">
                  <label>Strengths</label>
                  <textarea rows={2} placeholder="What the employee does well..." value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} />
                </div>
                <div className="pr-field pr-field--full">
                  <label>Areas for Improvement</label>
                  <textarea rows={2} placeholder="Where can they improve..." value={form.improvements} onChange={e => setForm(f => ({ ...f, improvements: e.target.value }))} />
                </div>
                <div className="pr-field pr-field--full">
                  <label>Additional Comments</label>
                  <textarea rows={2} placeholder="Any other notes..." value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} />
                </div>
              </div>

              {formError && <p className="pr-form-error">⚠ {formError}</p>}
              <button type="submit" className="pr-submit-btn" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>
        )}

        {/* Reviews List */}
        {loading ? (
          <div className="pr-state"><div className="pr-spinner" /><p>Loading reviews...</p></div>
        ) : error ? (
          <div className="pr-state pr-state--error"><p>⚠ {error}</p></div>
        ) : reviews.length === 0 ? (
          <div className="pr-state">
            <div className="pr-state-icon">📊</div>
            <p>No performance reviews found for {filterYear}{filterQ ? ` Q${filterQ}` : ""}.</p>
          </div>
        ) : (
          <div className="pr-list">
            {reviews.map(review => (
              <div key={review._id} className="pr-card">
                <div className="pr-card__header" onClick={() => setExpanded(expanded === review._id ? null : review._id)}>
                  <div className="pr-card__left">
                    <div className="pr-card__avatar">
                      {review.employee?.firstName?.[0]}{review.employee?.lastName?.[0]}
                    </div>
                    <div>
                      <div className="pr-card__name">
                        {isHRManager
                          ? `${review.employee?.firstName} ${review.employee?.lastName}`
                          : `${review.period} Review`}
                      </div>
                      <div className="pr-card__meta">
                        {isHRManager && <span>{review.employee?.employeeId} · </span>}
                        {review.period === "quarterly" ? `Q${review.quarter} ` : ""}{review.year}
                        · Reviewed by {review.reviewer?.name}
                      </div>
                    </div>
                  </div>
                  <div className="pr-card__right">
                    <OverallBadge rating={review.overallRating} />
                    <span className="pr-chevron">{expanded === review._id ? "▲" : "▼"}</span>
                  </div>
                </div>

                {expanded === review._id && (
                  <div className="pr-card__body">
                    <div className="pr-card__ratings">
                      {CATEGORIES.map(cat => (
                        <div key={cat} className="pr-card__rating-row">
                          <span className="pr-card__rating-label">{CAT_LABELS[cat]}</span>
                          <StarRating value={review.ratings[cat]} readonly />
                        </div>
                      ))}
                    </div>
                    {review.strengths && (
                      <div className="pr-card__section">
                        <span className="pr-card__section-label">Strengths</span>
                        <p>{review.strengths}</p>
                      </div>
                    )}
                    {review.improvements && (
                      <div className="pr-card__section">
                        <span className="pr-card__section-label">Areas for improvement</span>
                        <p>{review.improvements}</p>
                      </div>
                    )}
                    {review.comments && (
                      <div className="pr-card__section">
                        <span className="pr-card__section-label">Comments</span>
                        <p>{review.comments}</p>
                      </div>
                    )}
                    <div className="pr-card__footer">
                      <span className={`pr-status pr-status--${review.status}`}>{review.status}</span>
                      {isHRManager && (
                        <button className="pr-delete-btn" onClick={() => handleDelete(review._id)}>🗑 Delete</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}