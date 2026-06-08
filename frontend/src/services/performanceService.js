// ── performanceService.js ─────────────────────────────────
import api from "../utils/api";

// HR / Admin — create review shell
export const createReview       = (data)       => api.post("/performance", data);

// HR / Admin / Manager — fetch all (role-filtered on backend)
export const getAllReviews       = (params)     => api.get("/performance", { params });

// Manager / HR / Admin — fetch pending_manager reviews
export const getPendingReviews  = (params)     => api.get("/performance/pending", { params });

// Employee — fetch own submitted/acknowledged reviews
export const getMyReviews       = (params)     => api.get("/performance/my", { params });

// Any authorised role — fetch one employee's reviews
export const getEmployeeReviews = (employeeId) => api.get(`/performance/employee/${employeeId}`);

// Manager / Admin — fill ratings into a pending review
export const fillReview         = (id, data)   => api.put(`/performance/${id}/fill`, data);

// Employee — acknowledge a submitted review
export const acknowledgeReview  = (id)         => api.put(`/performance/${id}/acknowledge`);

// HR / Admin — edit review metadata
export const updateReview       = (id, data)   => api.put(`/performance/${id}`, data);

// HR / Admin — delete review
export const deleteReview       = (id)         => api.delete(`/performance/${id}`);