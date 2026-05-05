import api from "../utils/api";

export const getAttritionRisk        = () => api.get("/predictive/attrition");
export const getDepartmentHealth     = () => api.get("/predictive/department-health");
export const getLeaveForecast        = () => api.get("/predictive/leave-forecast");
export const getPerformanceInsights  = () => api.get("/predictive/performance-insights");