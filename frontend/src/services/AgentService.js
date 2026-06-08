// ── AgentService.js ───────────────────────────────────────
import api from "../utils/api";

// ── Attendance ────────────────────────────────────────────
export const agentCheckIn = () =>
  api.post("/attendance/checkin");

export const agentCheckOut = () =>
  api.post("/attendance/checkout");

// ── Leave ─────────────────────────────────────────────────
export const agentApplyLeave = (data) =>
  api.post("/leave", data);

export const agentGetLeaveBalance = () =>
  api.get("/leave/balance");

export const agentGetMyLeaves = () =>
  api.get("/leave/my");

// ── Goals / Tasks ─────────────────────────────────────────
export const agentGetMyGoals = () =>
  api.get("/goals/my");

// ── Performance ───────────────────────────────────────────
export const agentGetMyReviews = () =>
  api.get("/performance/my");

// ── Notifications ─────────────────────────────────────────
export const agentGetNotifications = () =>
  api.get("/notifications?limit=5");

// ── Documents ─────────────────────────────────────────────
export const agentGetMyDocuments = () =>
  api.get("/documents/my");

// ── Announcements ─────────────────────────────────────────
export const agentGetAnnouncements = () =>
  api.get("/announcements?limit=3&isActive=true");

// ── Shifts ────────────────────────────────────────────────
export const agentGetMyShifts = () =>
  api.get("/shifts/my");

// ── Today's attendance ────────────────────────────────────
export const agentGetTodayAttendance = () =>
  api.get("/attendance/today");

// ── My attendance this month ──────────────────────────────
export const agentGetMyAttendance = () =>
  api.get("/attendance/my");

// ── My payroll ────────────────────────────────────────────
export const agentGetMyPayroll = () =>
  api.get(`/payroll/my?year=${new Date().getFullYear()}`);