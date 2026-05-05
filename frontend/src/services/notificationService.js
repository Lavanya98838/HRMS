import api from "../utils/api";

// ── Notifications ─────────────────────────────────────────
export const getMyNotifications  = (params) => api.get("/notifications", { params });
export const getUnreadCount      = ()        => api.get("/notifications/unread-count");
export const markAsRead          = (id)      => api.put(`/notifications/${id}/read`);
export const markAllAsRead       = ()        => api.put("/notifications/mark-all-read");
export const deleteNotification  = (id)      => api.delete(`/notifications/${id}`);
export const clearAllNotifications = ()      => api.delete("/notifications/clear-all");
