import api from '../utils/api.js';

// ── Employee API ─────────────────────────────────────────
export const employeeAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/employees?${query}`);
  },
  getById: (id) => api.get(`/employees/${id}`),
  getMe: () => api.get('/employees/me'),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),

  // File uploads
  uploadAvatar: (id, file) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post(`/employees/${id}/avatar`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadDocument: (id, file, name, type) => {
    const form = new FormData();
    form.append('document', file);
    form.append('name', name);
    form.append('type', type);
    return api.post(`/employees/${id}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteDocument: (empId, docId) =>
    api.delete(`/employees/${empId}/documents/${docId}`),

  // Bulk upload
  bulkUpload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/employees/bulk-upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  downloadTemplate: () =>
    api.get('/employees/csv-template', { responseType: 'blob' }),
};

// ── Department API ───────────────────────────────────────
export const departmentAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/departments?${query}`);
  },
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

// ── Role API ─────────────────────────────────────────────
export const roleAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/roles?${query}`);
  },
  getById: (id) => api.get(`/roles/${id}`),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
};
