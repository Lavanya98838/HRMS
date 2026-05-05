import api from './api.js';

// ── Attendance API ───────────────────────────────────────
export const attendanceAPI = {
  checkIn:             (data = {}) => api.post('/attendance/checkin', data),
  checkOut:            (data = {}) => api.post('/attendance/checkout', data),
  getToday:            ()          => api.get('/attendance/today'),
  getMy: (params={}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined && v !== ''));
  return api.get(`/leave/my?${new URLSearchParams(clean)}`);},
  getAll: (params={}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined && v !== ''));
  return api.get(`/leave?${new URLSearchParams(clean)}`);},
  getByEmployee:       (id, params={}) => api.get(`/attendance/employee/${id}?${new URLSearchParams(params)}`),
  update:              (id, data)  => api.put(`/attendance/${id}`, data),
  getSummary:          ()          => api.get('/attendance/summary'),
};

// ── Leave API ────────────────────────────────────────────
export const leaveAPI = {
  apply:               (data)      => api.post('/leave', data),
  getMy: (params={}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined && v !== ''));
  return api.get(`/leave/my?${new URLSearchParams(clean)}`);},
  getAll: (params={}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined && v !== ''));
  return api.get(`/leave?${new URLSearchParams(clean)}`);},
  getBalance: (params={}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined && v !== ''));
  return api.get(`/leave/balance?${new URLSearchParams(clean)}`); },
  getPending:          ()          => api.get('/leave/pending'),
  approve:             (id)        => api.put(`/leave/${id}/approve`),
  reject:              (id, data)  => api.put(`/leave/${id}/reject`, data),
  cancel:              (id)        => api.put(`/leave/${id}/cancel`),
  getByEmployee:       (id, params={}) => api.get(`/leave/employee/${id}?${new URLSearchParams(params)}`),
};
