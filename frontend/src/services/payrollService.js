import api from "../utils/api"; // your existing axios instance

// ── Employee self-service ─────────────────────────────────
export const getMyPayroll = (year) =>
  api.get("/payroll/my", { params: { year } });

// ── Admin / HR ────────────────────────────────────────────
export const getAllPayroll = (params) =>
  api.get("/payroll", { params });

export const getEmployeePayroll = (employeeId) =>
  api.get(`/payroll/employee/${employeeId}`);

export const generatePayroll = (employeeId, data) =>
  api.post(`/payroll/generate/${employeeId}`, data);

export const generateBulkPayroll = (data) =>
  api.post("/payroll/generate-all", data);

export const updatePayroll = (id, data) =>
  api.put(`/payroll/${id}`, data);

// ── PDF Download ──────────────────────────────────────────
// Hits GET /api/payroll/:id/download — backend streams the PDF
export const downloadPayslip = async (id, filename) => {
  const response = await api.get(`/payroll/${id}/download`, {
    responseType: "blob",
  });
  const url  = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href  = url;
  link.setAttribute("download", filename || "payslip.pdf");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
