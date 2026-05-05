import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../../services/notificationService";
import "./NotificationsPage.css";

const TYPE_ICONS = {
  leave_submitted:   "📋",
  leave_approved:    "✅",
  leave_rejected:    "❌",
  payroll_generated: "💰",
  document_uploaded: "📄",
  document_deleted:  "🗑️",
  profile_updated:   "👤",
};

const TYPE_COLORS = {
  leave_submitted:   "#3b82f6",
  leave_approved:    "#10b981",
  leave_rejected:    "#ef4444",
  payroll_generated: "#7c3aed",
  document_uploaded: "#f59e0b",
  document_deleted:  "#ef4444",
  profile_updated:   "#e11d74",
};

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60)    return "just now";
  if (seconds < 3600)  return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifs,      setNotifs]      = useState([]);
  const [unread,      setUnread]      = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [pagination,  setPagination]  = useState({});
  const [filter,      setFilter]      = useState("all"); // all | unread
  const [page,        setPage]        = useState(1);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter === "unread") params.unreadOnly = true;
      const res = await getMyNotifications(params);
      setNotifs(res.data.data.notifications || []);
      setUnread(res.data.data.unreadCount   || 0);
      setPagination(res.data.data.pagination || {});
    } catch {}
    finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);
  useEffect(() => { setPage(1); }, [filter]);

  const handleRead = async (notif) => {
    if (!notif.isRead) {
      await markAsRead(notif._id);
      setNotifs(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      setUnread(u => Math.max(0, u - 1));
    }
    if (notif.link) navigate(notif.link);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteNotification(id);
    setNotifs(prev => prev.filter(n => n._id !== id));
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const handleClearAll = async () => {
    if (!window.confirm("Clear all notifications? This cannot be undone.")) return;
    await clearAllNotifications();
    setNotifs([]);
    setUnread(0);
  };

  return (
    <DashboardLayout>
      <div className="np-page">

        {/* ── Header ── */}
        <div className="np-header">
          <div>
            <h1 className="np-title">Notifications</h1>
            <p className="np-sub">
              {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "All caught up!"}
            </p>
          </div>
          <div className="np-actions">
            {unread > 0 && (
              <button className="np-btn np-btn--ghost" onClick={handleMarkAll}>
                ✓ Mark all read
              </button>
            )}
            {notifs.length > 0 && (
              <button className="np-btn np-btn--danger" onClick={handleClearAll}>
                🗑 Clear all
              </button>
            )}
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="np-tabs">
          <button
            className={`np-tab ${filter === "all" ? "np-tab--active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`np-tab ${filter === "unread" ? "np-tab--active" : ""}`}
            onClick={() => setFilter("unread")}
          >
            Unread {unread > 0 && <span className="np-tab-badge">{unread}</span>}
          </button>
        </div>

        {/* ── List ── */}
        <div className="np-list">
          {loading ? (
            <div className="np-state">
              <div className="np-spinner" />
              <p>Loading notifications...</p>
            </div>
          ) : notifs.length === 0 ? (
            <div className="np-state">
              <div className="np-state-icon">🔔</div>
              <p>{filter === "unread" ? "No unread notifications." : "No notifications yet."}</p>
            </div>
          ) : (
            notifs.map(n => (
              <div
                key={n._id}
                className={`np-item ${!n.isRead ? "np-item--unread" : ""}`}
                onClick={() => handleRead(n)}
              >
                <div
                  className="np-item__icon"
                  style={{ background: `${TYPE_COLORS[n.type] || "#7c3aed"}18`, border: `1px solid ${TYPE_COLORS[n.type] || "#7c3aed"}30` }}
                >
                  {TYPE_ICONS[n.type] || "🔔"}
                </div>

                <div className="np-item__body">
                  <div className="np-item__top">
                    <span className="np-item__title">{n.title}</span>
                    <span className="np-item__time">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="np-item__msg">{n.message}</p>
                </div>

                <div className="np-item__right">
                  {!n.isRead && <div className="np-item__dot" />}
                  <button
                    className="np-item__del"
                    onClick={(e) => handleDelete(e, n._id)}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Pagination ── */}
        {pagination.totalPages > 1 && (
          <div className="np-pagination">
            <button className="np-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span className="np-page-info">Page {pagination.page} of {pagination.totalPages}</span>
            <button className="np-page-btn" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
