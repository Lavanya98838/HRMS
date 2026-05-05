// ── performanceService.js ─────────────────────────────────
import api from "../utils/api";

export const createReview         = (data)       => api.post("/performance", data);
export const getAllReviews         = (params)     => api.get("/performance", { params });
export const getMyReviews         = (params)     => api.get("/performance/my", { params });
export const getEmployeeReviews   = (employeeId) => api.get(`/performance/employee/${employeeId}`);
export const updateReview         = (id, data)   => api.put(`/performance/${id}`, data);
export const deleteReview         = (id)         => api.delete(`/performance/${id}`);