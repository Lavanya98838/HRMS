// ── announcementService.js ────────────────────────────────
import api from "../utils/api";

export const getAnnouncements       = (params)   => api.get("/announcements", { params });
export const createAnnouncement     = (data)     => api.post("/announcements", data);
export const markAnnouncementRead   = (id)       => api.put(`/announcements/${id}/read`);
export const updateAnnouncement     = (id, data) => api.put(`/announcements/${id}`, data);
export const deleteAnnouncement     = (id)       => api.delete(`/announcements/${id}`);