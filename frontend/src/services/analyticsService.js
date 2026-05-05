import api from "../utils/api"; // same axios instance as rest of project

export const getOverview          = ()             => api.get("/analytics/overview");
export const getHeadcountTrends   = ()             => api.get("/analytics/headcount-trends");
export const getAttendanceTrends  = ()             => api.get("/analytics/attendance-trends");
export const getDepartmentBreakdown = ()           => api.get("/analytics/department-breakdown");
export const getSalaryOverview    = (month, year)  => api.get("/analytics/salary-overview", { params: { month, year } });
export const getLeaveSummary      = (year)         => api.get("/analytics/leave-summary", { params: { year } });
export const getEmploymentTypes   = ()             => api.get("/analytics/employment-types");
