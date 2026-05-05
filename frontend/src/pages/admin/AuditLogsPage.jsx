import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { getAuditLogs, getAuditStats, exportAuditLogs } from "../../services/auditService";
import "./AuditLogsPage.css";

const CATEGORIES = ["auth", "employee", "leave", "payroll", "document", "performance", "goal", "announcement", "shift", "system"];

const ACTION_COLORS = {
  LOGIN: "#10b981", LOGOUT: "#6b7280", LOGIN_FAILED: "#ef4444", REGISTER: "#3b82f6",
  PASSWORD_RESET: "#f59e0b",
  EMPLOYEE_CREATED: "#10b981", EMPLOYEE_UPDATED: "#3b82f6", EMPLOYEE_DELETED: "#ef4444",
  EMPLOYEE_BULK_UPLOAD: "#8b5cf6", AVATAR_UPDATED: "#06b6d4",
  LEAVE_APPLIED: "#f59e0b", LEAVE_APPROVED: "#10b981", LEAVE_REJECTED: "#ef4444", LEAVE_CANCELLED: "#6b7280",
  PAYROLL_GENERATED: "#10b981", PAYSLIP_VIEWED: "#3b82f6",
  DOCUMENT_UPLOADED: "#10b981", DOCUMENT_DELETED: "#ef4444",
  GLOBAL_DOCUMENT_UPLOADED: "#8b5cf6", GLOBAL_DOCUMENT_DELETED: "#ef4444",
  REVIEW_CREATED: "#10b981", REVIEW_UPDATED: "#3b82f6",
  GOAL_CREATED: "#10b981", GOAL_UPDATED: "#3b82f6", GOAL_DELETED: "#ef4444",
  ANNOUNCEMENT_CREATED: "#10b981", ANNOUNCEMENT_DELETED: "#ef4444",
  SHIFT_ASSIGNED: "#10b981", SHIFT_UPDATED: "#3b82f6",
};

const CAT_ICONS = {
  auth: "🔐", employee: "👥", leave: "📅", payroll: "💰",
  document: "📁", performance: "📈", goal: "🎯",
  announcement: "📢", shift: "🗓️", system: "⚙️",
};

const timeStr = (date) =>
  new Date(date).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

export default function AuditLogsPage() {
  const [logs,      setLogs]      = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error,     setError]     = useState(null);
  const [expanded,  setExpanded]  = useState({});

  const [filters, setFilters] = useState({
    category: "", status: "", startDate: "", endDate: "", page: 1,
  });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // ── Fetch stats ───────────────────────────────────────
  useEffect(() => {
    getAuditStats()
      .then(res => setStats(res.data.data))
      .catch(() => {});
  }, []);

  // ── Fetch logs ────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.category)  params.category  = filters.category;
      if (filters.status)    params.status     = filters.status;
      if (filters.startDate) params.startDate  = filters.startDate;
      if (filters.endDate)   params.endDate    = filters.endDate;
      params.page  = filters.page;
      params.limit = 15;

      const res = await getAuditLogs(params);
      setLogs(res.data.data.logs);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));
  const setPage   = (p)        => setFilters(f => ({ ...f, page: p }));

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (filters.category)  params.category  = filters.category;
      if (filters.startDate) params.startDate  = filters.startDate;
      if (filters.endDate)   params.endDate    = filters.endDate;
      await exportAuditLogs(params);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const clearFilters = () => setFilters({ category: "", status: "", startDate: "", endDate: "", page: 1 });

  return (
    <DashboardLayout>
      <div className="al-page">

        {/* ── Header ── */}
        <div className="al-header">
          <div>
            <h1 className="al-title">Audit Logs</h1>
            <p className="al-sub">Track all system actions and changes</p>
          </div>
          <button className="al-export-btn" onClick={handleExport} disabled={exporting}>
            {exporting ? "⏳ Exporting..." : "⬇ Export CSV"}
          </button>
        </div>

        {/* ── Stats Cards ── */}
        {stats && (
          <div className="al-stats">
            <div className="al-stat">
              <div className="al-stat__value">{stats.total?.toLocaleString()}</div>
              <div className="al-stat__label">Total Events</div>
            </div>
            <div className="al-stat">
              <div className="al-stat__value" style={{ color: "#10b981" }}>{stats.todayCount}</div>
              <div className="al-stat__label">Today</div>
            </div>
            <div className="al-stat">
              <div className="al-stat__value" style={{ color: "#ef4444" }}>{stats.recentFailures}</div>
              <div className="al-stat__label">Failures</div>
            </div>
            {stats.byCategory?.slice(0, 3).map(c => (
              <div key={c._id} className="al-stat">
                <div className="al-stat__value">{c.count}</div>
                <div className="al-stat__label">{CAT_ICONS[c._id]} {c._id}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Filters ── */}
        <div className="al-filters">
          <select className="al-select" value={filters.category} onChange={e => setFilter("category", e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
          </select>
          <select className="al-select" value={filters.status} onChange={e => setFilter("status", e.target.value)}>
            <option value="">All statuses</option>
            <option value="success">✅ Success</option>
            <option value="failure">❌ Failure</option>
          </select>
          <input className="al-input" type="date" value={filters.startDate} onChange={e => setFilter("startDate", e.target.value)} title="From date" />
          <input className="al-input" type="date" value={filters.endDate}   onChange={e => setFilter("endDate",   e.target.value)} title="To date" />
          <button className="al-clear-btn" onClick={clearFilters}>✕ Clear</button>
          <span className="al-count">{pagination.total} events</span>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="al-state"><div className="al-spinner" /><p>Loading audit logs...</p></div>
        ) : error ? (
          <div className="al-state al-state--error"><p>⚠️ {error}</p><button onClick={fetchLogs}>Retry</button></div>
        ) : logs.length === 0 ? (
          <div className="al-state"><div style={{ fontSize: 40 }}>📋</div><p>No audit logs found.</p></div>
        ) : (
          <div className="al-table-wrap">
            <table className="al-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Category</th>
                  <th>Performed By</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <>
                    <tr key={log._id} className="al-row">
                      <td className="al-td al-td--time">{timeStr(log.createdAt)}</td>
                      <td className="al-td">
                        <span className="al-action" style={{ color: ACTION_COLORS[log.action] || "#a78bfa" }}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="al-td">
                        <span className="al-cat">{CAT_ICONS[log.category]} {log.category}</span>
                      </td>
                      <td className="al-td">
                        <div className="al-user__name">{log.performedBy?.name || "—"}</div>
                        <div className="al-user__role">{log.performedByRole}</div>
                      </td>
                      <td className="al-td al-td--muted">
                        {log.targetEmployee ? `${log.targetEmployee.firstName} ${log.targetEmployee.lastName}` : "—"}
                      </td>
                      <td className="al-td">
                        <span className={`al-status al-status--${log.status}`}>
                          {log.status === "success" ? "✅" : "❌"} {log.status}
                        </span>
                      </td>
                      <td className="al-td">
                        {Object.keys(log.details || {}).length > 0 && (
                          <button className="al-expand-btn" onClick={() => toggleExpand(log._id)}>
                            {expanded[log._id] ? "▲ Hide" : "▼ Show"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded[log._id] && (
                      <tr key={`${log._id}-details`} className="al-details-row">
                        <td colSpan={7}>
                          <pre className="al-details">{JSON.stringify(log.details, null, 2)}</pre>
                          {log.ipAddress && <div className="al-ip">🌐 IP: {log.ipAddress}</div>}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {pagination.totalPages > 1 && (
          <div className="al-pagination">
            <button className="al-page-btn" disabled={filters.page <= 1} onClick={() => setPage(filters.page - 1)}>← Prev</button>
            <span className="al-page-info">Page {filters.page} of {pagination.totalPages}</span>
            <button className="al-page-btn" disabled={filters.page >= pagination.totalPages} onClick={() => setPage(filters.page + 1)}>Next →</button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}