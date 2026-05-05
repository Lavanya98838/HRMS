// ── shiftService.js ───────────────────────────────────────
import api from "../utils/api";

export const getShiftTypes          = ()         => api.get("/shifts/types");
export const createShiftType        = (data)     => api.post("/shifts/types", data);
export const updateShiftType        = (id, data) => api.put(`/shifts/types/${id}`, data);
export const deleteShiftType        = (id)       => api.delete(`/shifts/types/${id}`);

export const getWeeklySchedule      = (params)   => api.get("/shifts/week", { params });
export const getMyShifts            = (params)   => api.get("/shifts/my", { params });
export const assignShift            = (data)     => api.post("/shifts/assign", data);
export const removeShiftAssignment  = (id)       => api.delete(`/shifts/assign/${id}`);