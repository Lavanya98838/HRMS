import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  createReview, getAllReviews, getPendingReviews,
  getMyReviews, fillReview, acknowledgeReview, deleteReview,
} from "../../services/performanceService";
import api from "../../utils/api";
import "./PerformanceReviewPage.css";

const RATING_LABELS = { 1: "Poor", 2: "Below Avg", 3: "Average", 4: "Good", 5: "Excellent" };
const RATING_COLORS = { 1: "#ef4444", 2: "#f97316", 3: "#f59e0b", 4: "#3b82f6", 5: "#10b981" };
const CATEGORIES    = ["workQuality", "communication", "punctuality", "teamwork", "initiative"];
const CAT_LABELS    = {
  workQuality: "Work Quality", communication: "Communication",
  punctuality: "Punctuality", teamwork: "Teamwork", initiative: "Initiative",
};

const currentYear = new Date().getFullYear();
const currentQ    = Math.ceil((new Date().getMonth() + 1) / 3);

const EMPTY_RATINGS = { workQuality: 0, communication: 0, punctuality: 0, teamwork: 0, initiative: 0 };

// ── Status badge config ───────────────────────────────────
const STATUS_CONFIG = {
  pending_manager: { label: "Pending Manager",  cls: "pr-status--pending"      },
  submitted:       { label: "Submitted",         cls: "pr-status--submitted"    },
  acknowledged:    { label: "Acknowledged",      cls: "pr-status--acknowledged" },
};

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
    finally  { setLoading(false); }
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
    setSelected(null); setQuery(""); onChange(""); setResults([]);
  };

  return (
    <div className="emp-search-wrap" ref={wrapRef}>
      <div className="emp-search-input-wrap">
        <input
          type="text" className="emp-search-input"
          placeholder="Search by name or employee ID..."
          value={query} onChange={handleInput}
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

// ── Star Rating ───────────────────────────────────────────
const StarRating = ({ value, onChange, readonly }) => (
  <div className="pr-stars">
    {[1,2,3,4,5].map(n => (
      <button
        key={n} type="button"
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
      ★ {rating}/5 · {label}
    </span>
  );
};

// ── Ratings Form (shared by Manager fill + Admin create) ──
const RatingsForm = ({ ratings, onChange, disabled }) => (
  <div className="pr-ratings-section">
    <h4 className="pr-ratings-title">Performance Ratings</h4>
    {CATEGORIES.map(cat => (
      <div key={cat} className="pr-rating-row">
        <span className="pr-rating-label">{CAT_LABELS[cat]}</span>
        <StarRating
          value={ratings[cat]}
          onChange={v => onChange({ ...ratings, [cat]: v })}
          readonly={disabled}
        />
      </div>
    ))}
  </div>
);

// ── Review Card ───────────────────────────────────────────
const ReviewCard = ({ review, expanded, onToggle, onDelete, onFill, onAcknowledge, role }) => {
  const statusCfg  = STATUS_CONFIG[review.status] || STATUS_CONFIG.submitted;
  const canDelete  = ["admin", "hr"].includes(role);
  const canFill    = ["admin", "manager"].includes(role) && review.status === "pending_manager";
  const canAck     = role === "employee" && review.status === "submitted";
  const isExpanded = expanded === review._id;

  return (
    <div className={`pr-card pr-card--${review.status}`}>
      <div className="pr-card__header" onClick={onToggle}>
        <div className="pr-card__left">
          <div className="pr-card__avatar">
            {review.employee?.firstName?.[0]}{review.employee?.lastName?.[0]}
          </div>
          <div>
            <div className="pr-card__name">
              {role === "employee"
                ? `Q${review.quarter} ${review.year} Review`
                : `${review.employee?.firstName} ${review.employee?.lastName}`}
            </div>
            <div className="pr-card__meta">
              {role !== "employee" && <span>{review.employee?.employeeId} · </span>}
              Q{review.quarter} {review.year}
              {review.reviewer
                ? ` · Reviewed by ${review.reviewer?.name}`
                : ` · Initiated by ${review.createdBy?.name}`}
            </div>
          </div>
        </div>
        <div className="pr-card__right">
          {review.overallRating
            ? <OverallBadge rating={review.overallRating} />
            : <span className={`pr-status ${statusCfg.cls}`}>{statusCfg.label}</span>}
          <span className="pr-chevron">{isExpanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="pr-card__body">

          {/* Pending — manager needs to fill */}
          {review.status === "pending_manager" && !canFill && (
            <div className="pr-pending-notice">
              ⏳ Awaiting manager input. Ratings not yet filled.
            </div>
          )}

          {/* Ratings — only show when filled */}
          {review.ratings?.workQuality && (
            <div className="pr-card__ratings">
              {CATEGORIES.map(cat => (
                <div key={cat} className="pr-card__rating-row">
                  <span className="pr-card__rating-label">{CAT_LABELS[cat]}</span>
                  <StarRating value={review.ratings[cat]} readonly />
                </div>
              ))}
            </div>
          )}

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
            <span className={`pr-status ${statusCfg.cls}`}>{statusCfg.label}</span>
            {review.acknowledgedAt && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Acknowledged {new Date(review.acknowledgedAt).toLocaleDateString("en-IN")}
              </span>
            )}
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              {canFill      && <button className="pr-fill-btn"    onClick={() => onFill(review)}>✏️ Fill Review</button>}
              {canAck       && <button className="pr-ack-btn"     onClick={() => onAcknowledge(review._id)}>✓ Acknowledge</button>}
              {canDelete    && <button className="pr-delete-btn"  onClick={() => onDelete(review._id)}>🗑 Delete</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────
export default function PerformanceReviewPage() {
  const { user } = useAuth();
  const role = user?.role;

  const isHR      = ["admin", "hr"].includes(role);
  const isManager = role === "manager";
  const isEmp     = role === "employee";

  // ── State ─────────────────────────────────────────────
  const [tab,        setTab]        = useState(isEmp ? "mine" : "all");
  const [reviews,    setReviews]    = useState([]);
  const [pending,    setPending]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);
  const [formError,  setFormError]  = useState(null);
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterQ,    setFilterQ]    = useState("");
  const [expanded,   setExpanded]   = useState(null);

  // Fill modal (manager filling a pending review)
  const [fillModal,   setFillModal]  = useState(null);
  const [fillForm,    setFillForm]   = useState({ ratings: { ...EMPTY_RATINGS }, strengths: "", improvements: "", comments: "" });
  const [fillLoading, setFillLoading] = useState(false);
  const [fillError,   setFillError]  = useState("");

  // HR create form
  const [form, setForm] = useState({
    employeeId: "", quarter: currentQ, year: currentYear,
  });

  // ── Fetch ──────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { year: filterYear };
      if (filterQ) params.quarter = filterQ;

      if (isEmp) {
        const res = await getMyReviews(params);
        setReviews(res.data.data.reviews || []);
      } else {
        // Fetch all reviews AND pending in parallel
        const [allRes, pendRes] = await Promise.all([
          getAllReviews(params),
          getPendingReviews(),
        ]);
        setReviews(allRes.data.data.reviews   || []);
        setPending(pendRes.data.data.reviews  || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterQ, isEmp]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── HR: Create review shell ────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.employeeId) return setFormError("Please select an employee.");
    setSubmitting(true); setFormError(null);
    try {
      await createReview({ ...form, period: "quarterly" });
      setShowForm(false);
      setForm({ employeeId: "", quarter: currentQ, year: currentYear });
      fetchAll();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to create review.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Manager: Open fill modal ───────────────────────────
  const openFillModal = (review) => {
    setFillModal(review);
    setFillForm({ ratings: { ...EMPTY_RATINGS }, strengths: "", improvements: "", comments: "" });
    setFillError("");
  };

  // ── Manager: Submit ratings ────────────────────────────
  const handleFillSubmit = async (e) => {
    e.preventDefault();
    const r = fillForm.ratings;
    if (Object.values(r).some(v => !v || v === 0)) {
      return setFillError("Please rate all 5 categories.");
    }
    setFillLoading(true); setFillError("");
    try {
      await fillReview(fillModal._id, fillForm);
      setFillModal(null);
      fetchAll();
    } catch (err) {
      setFillError(err?.response?.data?.message || "Failed to submit ratings.");
    } finally {
      setFillLoading(false);
    }
  };

  // ── Employee: Acknowledge ─────────────────────────────
  const handleAcknowledge = async (id) => {
    if (!window.confirm("Acknowledge this review? This confirms you have read it.")) return;
    try {
      await acknowledgeReview(id);
      fetchAll();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to acknowledge.");
    }
  };

  // ── Delete ────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this review? This cannot be undone.")) return;
    await deleteReview(id);
    fetchAll();
  };

  // ── Displayed list based on tab ───────────────────────
  const displayList = tab === "pending" ? pending : reviews;

  // ── Counts for tab badges ─────────────────────────────
  const pendingCount = pending.length;

  return (
    <DashboardLayout>
      <div className="pr-page">

        {/* ── Header ── */}
        <div className="pr-header">
          <div>
            <h1 className="pr-title">Performance Reviews</h1>
            <p className="pr-sub">
              {isHR      && "Initiate and track quarterly performance reviews"}
              {isManager && "Fill in ratings for your team's pending reviews"}
              {isEmp     && "View and acknowledge your performance reviews"}
            </p>
          </div>
          <div className="pr-header-actions">
            {!isEmp && (
              <>
                <select className="pr-select" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
                  {[currentYear, currentYear-1, currentYear-2].map(y => <option key={y}>{y}</option>)}
                </select>
                <select className="pr-select" value={filterQ} onChange={e => setFilterQ(e.target.value)}>
                  <option value="">All quarters</option>
                  {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
                </select>
              </>
            )}
            {isHR && (
              <button className="pr-add-btn" onClick={() => setShowForm(s => !s)}>
                {showForm ? "✕ Cancel" : "+ Initiate Review"}
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs (HR / Manager / Admin only) ── */}
        {!isEmp && (
          <div className="pr-tabs">
            <button
              className={`pr-tab ${tab === "all" ? "pr-tab--active" : ""}`}
              onClick={() => setTab("all")}
            >
              All Reviews
              <span className="pr-tab-count">{reviews.length}</span>
            </button>
            <button
              className={`pr-tab ${tab === "pending" ? "pr-tab--active" : ""}`}
              onClick={() => setTab("pending")}
            >
              Pending Manager
              {pendingCount > 0 && <span className="pr-tab-count pr-tab-count--alert">{pendingCount}</span>}
            </button>
          </div>
        )}

        {/* ── HR: Create review shell form ── */}
        {showForm && isHR && (
          <div className="pr-form-card">
            <h3 className="pr-form-title">Initiate Q{form.quarter} {form.year} Review</h3>
            <p className="pr-form-hint">
              HR selects the employee and period. The manager will be notified to fill in the ratings.
            </p>
            <form onSubmit={handleCreate}>
              <div className="pr-form-grid">
                <div className="pr-field pr-field--full">
                  <label>Employee *</label>
                  <EmployeeSearch
                    value={form.employeeId}
                    onChange={id => setForm(f => ({ ...f, employeeId: id }))}
                  />
                </div>

                <div className="pr-field">
                  <label>Quarter *</label>
                  <select value={form.quarter} onChange={e => setForm(f => ({ ...f, quarter: Number(e.target.value) }))}>
                    {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
                  </select>
                </div>
                <div className="pr-field">
                  <label>Year *</label>
                  <select value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}>
                    {[currentYear, currentYear-1].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              {formError && <p className="pr-form-error">⚠ {formError}</p>}
              <button type="submit" className="pr-submit-btn" disabled={submitting}>
                {submitting ? "Creating..." : "📋 Initiate Review → Notify Manager"}
              </button>
            </form>
          </div>
        )}

        {/* ── States ── */}
        {loading && (
          <div className="pr-state"><div className="pr-spinner" /><p>Loading reviews...</p></div>
        )}
        {error && !loading && (
          <div className="pr-state pr-state--error"><p>⚠ {error}</p></div>
        )}
        {!loading && !error && displayList.length === 0 && (
          <div className="pr-state">
            <div className="pr-state-icon">{tab === "pending" ? "⏳" : "📊"}</div>
            <p>
              {tab === "pending"
                ? "No reviews pending manager input."
                : `No reviews found for ${filterYear}${filterQ ? ` Q${filterQ}` : ""}.`}
            </p>
            {tab === "pending" && isHR && (
              <span className="pr-state-sub">Use "Initiate Review" to create one.</span>
            )}
          </div>
        )}

        {/* ── Review list ── */}
        {!loading && !error && displayList.length > 0 && (
          <div className="pr-list">
            {displayList.map(review => (
              <ReviewCard
                key={review._id}
                review={review}
                expanded={expanded}
                onToggle={() => setExpanded(expanded === review._id ? null : review._id)}
                onDelete={handleDelete}
                onFill={openFillModal}
                onAcknowledge={handleAcknowledge}
                role={role}
              />
            ))}
          </div>
        )}

        {/* ── Manager: Fill modal ── */}
        {fillModal && (
          <div className="pr-modal-overlay">
            <div className="pr-modal">
              <div className="pr-modal__header">
                <div>
                  <div className="pr-modal__title">Fill Performance Review</div>
                  <div className="pr-modal__sub">
                    {fillModal.employee?.firstName} {fillModal.employee?.lastName} — Q{fillModal.quarter} {fillModal.year}
                  </div>
                </div>
                <button className="pr-modal__close" onClick={() => setFillModal(null)}>✕</button>
              </div>

              <form onSubmit={handleFillSubmit}>
                <RatingsForm
                  ratings={fillForm.ratings}
                  onChange={r => setFillForm(f => ({ ...f, ratings: r }))}
                />

                <div className="pr-form-grid" style={{ marginTop: 12 }}>
                  <div className="pr-field pr-field--full">
                    <label>Strengths</label>
                    <textarea rows={2} placeholder="What the employee does well..."
                      value={fillForm.strengths}
                      onChange={e => setFillForm(f => ({ ...f, strengths: e.target.value }))} />
                  </div>
                  <div className="pr-field pr-field--full">
                    <label>Areas for Improvement</label>
                    <textarea rows={2} placeholder="Where can they improve..."
                      value={fillForm.improvements}
                      onChange={e => setFillForm(f => ({ ...f, improvements: e.target.value }))} />
                  </div>
                  <div className="pr-field pr-field--full">
                    <label>Additional Comments</label>
                    <textarea rows={2} placeholder="Any other notes..."
                      value={fillForm.comments}
                      onChange={e => setFillForm(f => ({ ...f, comments: e.target.value }))} />
                  </div>
                </div>

                {fillError && <p className="pr-form-error">⚠ {fillError}</p>}

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button type="button" className="pr-cancel-btn" onClick={() => setFillModal(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="pr-submit-btn" disabled={fillLoading} style={{ flex: 2 }}>
                    {fillLoading ? "Submitting..." : "✓ Submit Review"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}