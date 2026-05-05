import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getUnreadCount,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} from "../../services/notificationService";
import "./NotificationBell.css";

const TYPE_ICONS = {
  leave_submitted:   "📋",
  leave_approved:    "✅",
  leave_rejected:    "❌",
  payroll_generated: "💰",
  document_uploaded: "📄",
  document_deleted:  "🗑️",
  profile_updated:   "👤",
};

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60)   return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [unread,   setUnread]   = useState(0);
  const [notifs,   setNotifs]   = useState([]);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const dropRef = useRef(null);

  // Poll unread count every 30 seconds
  const fetchCount = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      setUnread(res.data.data.count || 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = async () => {
    setOpen(o => !o);
    if (!open) {
      setLoading(true);
      try {
        const res = await getMyNotifications({ limit: 10 });
        setNotifs(res.data.data.notifications || []);
        setUnread(res.data.data.unreadCount || 0);
      } catch {}
      finally { setLoading(false); }
    }
  };

  const handleMarkRead = async (notif) => {
    if (!notif.isRead) {
      await markAsRead(notif._id);
      setNotifs(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      setUnread(u => Math.max(0, u - 1));
    }
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const role = user?.role;

  return (
    <div className="nb-wrap" ref={dropRef}>
      {/* Bell button */}
      <button className="nb-btn" onClick={handleOpen} title="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span className="nb-badge">{unread > 99 ? "99+" : unread}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="nb-dropdown">
          <div className="nb-dropdown__header">
            <span className="nb-dropdown__title">Notifications</span>
            {unread > 0 && (
              <button className="nb-mark-all" onClick={handleMarkAll}>
                Mark all read
              </button>
            )}
          </div>

          <div className="nb-dropdown__list">
            {loading ? (
              <div className="nb-state">
                <div className="nb-spinner" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="nb-state">
                <div className="nb-state-icon">🔔</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n._id}
                  className={`nb-item ${!n.isRead ? "nb-item--unread" : ""}`}
                  onClick={() => handleMarkRead(n)}
                >
                  <div className="nb-item__icon">
                    {TYPE_ICONS[n.type] || "🔔"}
                  </div>
                  <div className="nb-item__body">
                    <div className="nb-item__title">{n.title}</div>
                    <div className="nb-item__msg">{n.message}</div>
                    <div className="nb-item__time">{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.isRead && <div className="nb-item__dot" />}
                </div>
              ))
            )}
          </div>

          <div className="nb-dropdown__footer">
            <button
              className="nb-view-all"
              onClick={() => { setOpen(false); navigate(`/${role}/notifications`); }}
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
