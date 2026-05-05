// ── goalService.js ────────────────────────────────────────
import api from "../utils/api";

export const createGoal           = (data)       => api.post("/goals", data);
export const getAllGoals           = (params)     => api.get("/goals", { params });
export const getMyGoals           = (params)     => api.get("/goals/my", { params });
export const getEmployeeGoals     = (employeeId) => api.get(`/goals/employee/${employeeId}`);
export const updateGoal           = (id, data)   => api.put(`/goals/${id}`, data);
export const deleteGoal           = (id)         => api.delete(`/goals/${id}`);