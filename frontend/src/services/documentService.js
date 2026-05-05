import api from "../utils/api";

// ── Documents ─────────────────────────────────────────────
export const getMyDocuments       = ()           => api.get("/documents/my");
export const getGlobalDocuments   = (category)   => api.get("/documents/global", { params: { category } });
export const getEmployeeDocuments = (employeeId) => api.get(`/documents/employee/${employeeId}`);
export const getAllDocuments      = (params)      => api.get("/documents/all", { params });

export const uploadDocument = (formData) =>
  api.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteDocument = (id) => api.delete(`/documents/${id}`);
