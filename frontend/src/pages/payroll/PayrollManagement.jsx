import { useState, useEffect, useCallback } from "react";
import {
  getAllPayroll,
  updatePayroll,
  generateBulkPayroll,
  downloadPayslip,
} from "../../services/payrollService";
import PayslipCard from "../../components/payroll/PayslipCard";
import "./PayrollManagement.css";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const fmt = (n) =>
  `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const yearOptions  = Array.from({ length: 4 }, (_, i) => currentYear - i);

export default function PayrollManagement() {
  const [records,      setRecords]      = useState([]);
  const [summary,      setSummary]      = useState(null);
  const [pagination,   setPagination]   = useState({});
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [selected,     setSelected]     = useState(null);    // for payslip modal
  const [bulkLoading,  setBulkLoading]  = useState(false);
  const [bulkResult,   setBulkResult]   = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({});     // { id: "loading" | "done" }
  const [downloading,  setDownloading]  = useState({});     // { id: true }

  // Filters
  const [month,  setMonth]  = useState(currentMonth);
  const [year,   setYear]   = useState(currentYear);
  const [status, setStatus] = useState("");
  const [page,   setPage]   = useState(1);

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { month, year, page, limit: 20 };
      if (status) params.status = status;
      const res = await getAllPayroll(params);
      const { records: recs, summary: sum, pagination: pag } = res.data.data;
      setRecords(recs || []);
      setSummary(sum || null);
      setPagination(pag || {});
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load payroll records.");
    } finally {
      setLoading(false);
    }
  }, [month, year, status, page]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);
  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [month, year, status]);

  // ── Mark as Paid ──
  const handleMarkPaid = async (id) => {
    setStatusUpdate(s => ({ ...s, [id]: "loading" }));
    try {
      await updatePayroll(id, { status: "paid" });
      setRecords(prev =>
        prev.map(r => r._id === id ? { ...r, status: "paid", paidAt: new Date() } : r)
      );
      setStatusUpdate(s => ({ ...s, [id]: "done" }));
      // If modal is open for this record, update it too
      if (selected?._id === id) {
        setSelected(prev => ({ ...prev, status: "paid", paidAt: new Date() }));
      }
    } catch {
      setStatusUpdate(s => ({ ...s, [id]: null }));
    }
  };

  // ── Download ──
  const handleDownload = async (record) => {
    setDownloading(d => ({ ...d, [record._id]: true }));
    try {
      const emp      = record.employee;
      const filename = `Payslip_${emp.employeeId}_${MONTHS[record.month - 1]}_${record.year}.pdf`;
      await downloadPayslip(record._id, filename);
    } finally {
      setDownloading(d => ({ ...d, [record._id]: false }));
    }
  };

  // ── Bulk Generate ──
  const handleBulkGenerate = async () => {
    if (!window.confirm(`Generate payroll for ALL active employees for ${MONTHS[month - 1]} ${year}? Already-generated records will be skipped.`)) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await generateBulkPayroll({ month, year });
      setBulkResult(res.data.data.summary);
      fetchPayroll();
    } catch (err) {
      setBulkResult({ error: err?.response?.data?.message || "Bulk generation failed." });
    } finally {
      setBulkLoading(false);
    }
  };

  const monthLabel = `${MONTHS[month - 1]} ${year}`;

  return (
    <div className="pm-page">

      {/* ── Page Header ── */}
      <div className="pm-header">
        <div>
          <h1 className="pm-header__title">Payroll Management</h1>
          <p className="pm-header__sub">Generate, review, and manage employee payroll</p>
        </div>
        <button
          className="pm-bulk-btn"
          onClick={handleBulkGenerate}
          disabled={bulkLoading}
        >
          {bulkLoading ? (
            <><span className="pm-spinner pm-spinner--sm" /> Generating...</>
          ) : (
            <>⚡ Bulk Generate — {monthLabel}</>
          )}
        </button>
      </div>

      {/* ── Bulk Result Banner ── */}
      {bulkResult && (
        <div className={`pm-banner ${bulkResult.error ? "pm-banner--error" : "pm-banner--success"}`}>
          {bulkResult.error ? (
            <span>⚠️ {bulkResult.error}</span>
          ) : (
            <span>
              ✓ Bulk generation complete — {bulkResult.generated} generated, {bulkResult.skipped} skipped, {bulkResult.failed} failed
            </span>
          )}
          <button className="pm-banner__close" onClick={() => setBulkResult(null)}>✕</button>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="pm-filters">
        <select className="pm-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select className="pm-select" value={year} onChange={e => setYear(Number(e.target.value))}>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="pm-select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="generated">Generated</option>
          <option value="paid">Paid</option>
          <option value="draft">Draft</option>
        </select>
        <button className="pm-refresh-btn" onClick={fetchPayroll}>↻ Refresh</button>
      </div>

      {/* ── Summary Cards ── */}
      {summary && !loading && (
        <div className="pm-summary-row">
          {[
            { label: "Employees",     value: summary.count,             suffix: "" },
            { label: "Total Gross",   value: fmt(summary.totalGross),   suffix: "" },
            { label: "Total Net",     value: fmt(summary.totalNet),     suffix: "" },
            { label: "Tax + PF",      value: fmt(summary.totalTax + summary.totalPF), suffix: "" },
          ].map(({ label, value }) => (
            <div key={label} className="pm-stat-card">
              <div className="pm-stat-val">{value}</div>
              <div className="pm-stat-lbl">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="pm-table-wrap">
        {loading ? (
          <div className="pm-state">
            <div className="pm-spinner" />
            <span>Loading payroll records...</span>
          </div>
        ) : error ? (
          <div className="pm-state pm-state--error">
            <span>⚠️ {error}</span>
            <button className="pm-retry-btn" onClick={fetchPayroll}>Retry</button>
          </div>
        ) : records.length === 0 ? (
          <div className="pm-state">
            <div className="pm-state-icon">📭</div>
            <span>No payroll records for {monthLabel}.</span>
            <span className="pm-state-sub">Use "Bulk Generate" to create records for all active employees.</span>
          </div>
        ) : (
          <table className="pm-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th className="pm-th--right">Gross</th>
                <th className="pm-th--right">Deductions</th>
                <th className="pm-th--right">Net Pay</th>
                <th>Attendance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => {
                const emp = record.employee || {};
                const totalDed =
                  (record.deductions    || 0) +
                  (record.taxDeduction  || 0) +
                  (record.pfDeduction   || 0) +
                  (record.lateDeduction || 0);

                return (
                  <tr key={record._id} className="pm-row">
                    <td className="pm-td-emp">
                      <div className="pm-emp-name">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="pm-emp-id">{emp.employeeId}</div>
                    </td>
                    <td className="pm-td-dept">
                      {emp.department?.name || "—"}
                    </td>
                    <td className="pm-td--right pm-td-gross">
                      {fmt(record.grossSalary)}
                    </td>
                    <td className="pm-td--right pm-td-ded">
                      -{fmt(totalDed)}
                    </td>
                    <td className="pm-td--right pm-td-net">
                      {fmt(record.netSalary)}
                    </td>
                    <td className="pm-td-att">
                      <span className="pm-att-pill pm-att-pill--present">{record.presentDays}P</span>
                      <span className="pm-att-pill pm-att-pill--leave">{record.leaveDays}L</span>
                      {record.absentDays > 0 && (
                        <span className="pm-att-pill pm-att-pill--absent">{record.absentDays}A</span>
                      )}
                    </td>
                    <td>
                      <span className={`pm-badge pm-badge--${record.status}`}>
                        {record.status === "paid" ? "✓ Paid" : record.status === "generated" ? "Generated" : "Draft"}
                      </span>
                    </td>
                    <td className="pm-td-actions">
                      {/* View Payslip */}
                      <button
                        className="pm-action-btn pm-action-btn--view"
                        onClick={() => setSelected(record)}
                        title="View payslip"
                      >
                        👁
                      </button>

                      {/* Download PDF */}
                      <button
                        className="pm-action-btn pm-action-btn--download"
                        onClick={() => handleDownload(record)}
                        disabled={downloading[record._id]}
                        title="Download PDF"
                      >
                        {downloading[record._id] ? <span className="pm-spinner pm-spinner--xs" /> : "↓"}
                      </button>

                      {/* Mark as Paid */}
                      {record.status !== "paid" && (
                        <button
                          className="pm-action-btn pm-action-btn--pay"
                          onClick={() => handleMarkPaid(record._id)}
                          disabled={statusUpdate[record._id] === "loading"}
                          title="Mark as paid"
                        >
                          {statusUpdate[record._id] === "loading"
                            ? <span className="pm-spinner pm-spinner--xs" />
                            : "✓ Pay"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {pagination.totalPages > 1 && (
        <div className="pm-pagination">
          <button
            className="pm-page-btn"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            ← Prev
          </button>
          <span className="pm-page-info">
            Page {pagination.page} of {pagination.totalPages}
            <span className="pm-page-total"> · {pagination.total} records</span>
          </span>
          <button
            className="pm-page-btn"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* ── Payslip Modal ── */}
      {selected && (
        <PayslipCard
          payroll={selected}
          employee={selected.employee}
          onClose={() => setSelected(null)}
        />
      )}

    </div>
  );
}
