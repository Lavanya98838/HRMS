import api from "../utils/api";

export const getAuditLogs   = (params) => api.get("/audit",        { params });
export const getAuditStats  = ()       => api.get("/audit/stats");
export const exportAuditLogs = async (params) => {
  const res = await api.get("/audit/export", {
    params,
    responseType: "blob",
  });
  const url  = window.URL.createObjectURL(new Blob([res.data]));
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `audit-logs-${Date.now()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};