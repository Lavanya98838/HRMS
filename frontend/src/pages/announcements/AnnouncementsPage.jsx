import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  getAnnouncements, createAnnouncement,
  markAnnouncementRead, deleteAnnouncement, updateAnnouncement,
} from "../../services/announcementService";
import "./AnnouncementsPage.css";

const PRIORITY_COLORS = {
  normal:    { bg: "rgba(124,58,237,.12)", color: "#a78bfa", border: "rgba(124,58,237,.25)" },
  important: { bg: "rgba(245,158,11,.12)", color: "#fbbf24", border: "rgba(245,158,11,.25)" },
  urgent:    { bg: "rgba(239,68,68,.12)",  color: "#f87171", border: "rgba(239,68,68,.25)"  },
};

const PRIORITY_ICONS = { normal: "📢", important: "⚠️", urgent: "🚨" };

const timeAgo = (date) => {
  const s = Math.floor((new Date() - new Date(date)) / 1000);
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const role = user?.role;
  const isHRAdmin = ["admin", "hr"].includes(role);

  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState(null);
  const [formError,     setFormError]     = useState(null);
  const [expanded,      setExpanded]      = useState(null);

  const [form, setForm] = useState({
    title: "", content: "", targetType: "all",
    priority: "normal", isPinned: false, expiresAt: "",
  });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnnouncements({ limit: 50 });
      setAnnouncements(res.data.data.announcements || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleRead = async (id) => {
    await markAnnouncementRead(id);
    setAnnouncements(prev => prev.map(a =>
      a._id === id ? { ...a, isRead: true } : a
    ));
  };

  const handleExpand = (id, isRead) => {
    setExpanded(expanded === id ? null : id);
    if (!isRead) handleRead(id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      return setFormError("Title and content are required.");
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createAnnouncement({
        ...form,
        expiresAt: form.expiresAt || null,
      });
      setShowForm(false);
      setForm({ title: "", content: "", targetType: "all", priority: "normal", isPinned: false, expiresAt: "" });
      fetchAnnouncements();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to create announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    await deleteAnnouncement(id);
    setAnnouncements(prev => prev.filter(a => a._id !== id));
  };

  const handlePin = async (id, isPinned) => {
    await updateAnnouncement(id, { isPinned: !isPinned });
    setAnnouncements(prev => prev.map(a =>
      a._id === id ? { ...a, isPinned: !isPinned } : a
    ));
  };

  const pinned  = announcements.filter(a => a.isPinned);
  const regular = announcements.filter(a => !a.isPinned);
  const unread  = announcements.filter(a => !a.isRead).length;

  const AnnouncementCard = ({ a }) => {
    const pc = PRIORITY_COLORS[a.priority];
    return (
      <div
        className={`an-card ${!a.isRead ? "an-card--unread" : ""} ${a.isPinned ? "an-card--pinned" : ""}`}
        style={{ borderColor: !a.isRead ? pc.border : undefined }}
      >
        <div className="an-card__header" onClick={() => handleExpand(a._id, a.isRead)}>
          <div className="an-card__icon" style={{ background: pc.bg }}>
            {PRIORITY_ICONS[a.priority]}
          </div>
          <div className="an-card__info">
            <div className="an-card__title-row">
              <span className="an-card__title">{a.title}</span>
              {a.isPinned && <span className="an-pin-badge">📌 Pinned</span>}
              <span className="an-priority-badge" style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>
                {a.priority}
              </span>
            </div>
            <div className="an-card__meta">
              By {a.author?.name} · {timeAgo(a.createdAt)}
              {a.targetType !== "all" && <span> · {a.targetType}</span>}
            </div>
          </div>
          <div className="an-card__right">
            {!a.isRead && <div className="an-unread-dot" />}
            <span className="an-chevron">{expanded === a._id ? "▲" : "▼"}</span>
          </div>
        </div>

        {expanded === a._id && (
          <div className="an-card__body">
            <p className="an-card__content">{a.content}</p>
            {isHRAdmin && (
              <div className="an-card__actions">
                <button className="an-action-btn an-action-btn--pin" onClick={() => handlePin(a._id, a.isPinned)}>
                  {a.isPinned ? "📌 Unpin" : "📌 Pin"}
                </button>
                <button className="an-action-btn an-action-btn--delete" onClick={() => handleDelete(a._id)}>
                  🗑 Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="an-page">

        {/* Header */}
        <div className="an-header">
          <div>
            <h1 className="an-title">Announcements</h1>
            <p className="an-sub">
              {unread > 0 ? `${unread} unread announcement${unread > 1 ? "s" : ""}` : "All caught up!"}
            </p>
          </div>
          {isHRAdmin && (
            <button className="an-add-btn" onClick={() => setShowForm(s => !s)}>
              {showForm ? "✕ Cancel" : "+ New Announcement"}
            </button>
          )}
        </div>

        {/* Create Form */}
        {showForm && isHRAdmin && (
          <div className="an-form-card">
            <h3 className="an-form-title">New Announcement</h3>
            <form onSubmit={handleSubmit}>
              <div className="an-form-grid">
                <div className="an-field an-field--full">
                  <label>Title *</label>
                  <input type="text" placeholder="Announcement title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="an-field an-field--full">
                  <label>Content *</label>
                  <textarea rows={4} placeholder="Write your announcement here..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
                </div>
                <div className="an-field">
                  <label>Target Audience</label>
                  <select value={form.targetType} onChange={e => setForm(f => ({ ...f, targetType: e.target.value }))}>
                    <option value="all">All Employees</option>
                    <option value="role">By Role</option>
                    <option value="department">By Department</option>
                  </select>
                </div>
                <div className="an-field">
                  <label>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="an-field">
                  <label>Expires On (optional)</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
                </div>
                <div className="an-field an-field--check">
                  <label className="an-checkbox-label">
                    <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} />
                    Pin this announcement to the top
                  </label>
                </div>
              </div>
              {formError && <p className="an-form-error">⚠ {formError}</p>}
              <button type="submit" className="an-submit-btn" disabled={submitting}>
                {submitting ? "Publishing..." : "Publish Announcement"}
              </button>
            </form>
          </div>
        )}

        {/* Announcements */}
        {loading ? (
          <div className="an-state"><div className="an-spinner" /><p>Loading announcements...</p></div>
        ) : error ? (
          <div className="an-state an-state--error"><p>⚠ {error}</p></div>
        ) : announcements.length === 0 ? (
          <div className="an-state">
            <div className="an-state-icon">📢</div>
            <p>No announcements yet.</p>
          </div>
        ) : (
          <div className="an-list">
            {pinned.length > 0 && (
              <>
                <div className="an-section-label">📌 Pinned</div>
                {pinned.map(a => <AnnouncementCard key={a._id} a={a} />)}
                {regular.length > 0 && <div className="an-section-label">Recent</div>}
              </>
            )}
            {regular.map(a => <AnnouncementCard key={a._id} a={a} />)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}