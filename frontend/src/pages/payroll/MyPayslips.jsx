import { useState, useEffect, useCallback } from "react";
import { getMyPayroll } from "../../services/payrollService";
import PayslipCard from "../../components/payroll/PayslipCard";
import api from "../../utils/api";
import "./MyPayslips.css";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const fmt = (n) =>
  `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i);

// ── Password Prompt Modal ─────────────────────────────
const PasswordPrompt = ({ onConfirm, onCancel, loading, error }) => {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
      backdropFilter: "blur(6px)", zIndex: 500,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 20, padding: "32px 36px", width: "100%", maxWidth: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            background: "var(--violet-dim)", border: "2px solid var(--violet)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px", fontSize: 26,
          }}>🔒</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
            Verify Identity
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
            Enter your password to view this payslip
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--text-muted)",
            display: "block", marginBottom: 8,
          }}>Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && password && onConfirm(password)}
              placeholder="Enter your login password"
              autoFocus
              style={{
                width: "100%", padding: "12px 44px 12px 14px",
                borderRadius: 10, border: `1.5px solid ${error ? "var(--error)" : "var(--border)"}`,
                background: "var(--bg-elevated)", color: "var(--text-primary)",
                fontSize: 14, fontFamily: "var(--font-body)", outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => setShow(s => !s)}
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "var(--text-muted)",
                cursor: "pointer", fontSize: 16, padding: 0,
              }}
            >{show ? "🙈" : "👁️"}</button>
          </div>
          {error && (
            <div style={{ fontSize: 12, color: "var(--error)", marginTop: 6 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "11px", borderRadius: 10,
              border: "1.5px solid var(--border)", background: "transparent",
              color: "var(--text-secondary)", cursor: "pointer",
              fontSize: 13, fontFamily: "var(--font-body)",
            }}
          >Cancel</button>
          <button
            onClick={() => password && onConfirm(password)}
            disabled={!password || loading}
            style={{
              flex: 2, padding: "11px", borderRadius: 10, border: "none",
              background: password ? "var(--grad-primary)" : "var(--bg-elevated)",
              color: password ? "white" : "var(--text-muted)",
              cursor: password ? "pointer" : "not-allowed",
              fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {loading ? (
              <>
                <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin-slow 0.7s linear infinite", display: "inline-block" }} />
                Verifying...
              </>
            ) : "🔓 View Payslip"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────
export default function MyPayslips() {
  const [records,        setRecords]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [year,           setYear]           = useState(currentYear);
  const [selected,       setSelected]       = useState(null);
  const [pendingRecord,  setPendingRecord]  = useState(null); // record waiting for password
  const [employee,       setEmployee]       = useState(null);
  const [verifying,      setVerifying]      = useState(false);
  const [passError,      setPassError]      = useState("");

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyPayroll(year);
      setRecords(res.data.data.records || []);
      if (res.data.data.records?.[0]?.employee) {
        setEmployee(res.data.data.records[0].employee);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load payroll records.");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  // Clicking View → show password prompt
  const handleViewClick = (e, record) => {
    e.stopPropagation();
    setPassError("");
    setPendingRecord(record);
  };

  // Password confirmed → verify → open payslip
  const handlePasswordConfirm = async (password) => {
    setVerifying(true);
    setPassError("");
    try {
      await api.post("/auth/verify-password", { password });
      setSelected(pendingRecord);
      setPendingRecord(null);
    } catch (err) {
      setPassError(err?.response?.data?.message || "Incorrect password. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const totalNet   = records.reduce((s, r) => s + (r.netSalary   || 0), 0);
  const totalGross = records.reduce((s, r) => s + (r.grossSalary || 0), 0);
  const totalTax   = records.reduce((s, r) => s + (r.taxDeduction || 0) + (r.pfDeduction || 0), 0);

  return (
    <div className="mps-page">

      {/* ── Page Header ── */}
      <div className="mps-header">
        <div>
          <h1 className="mps-header__title">My Payslips</h1>
          <p className="mps-header__sub">View and download your salary statements</p>
        </div>
        <select
          className="mps-year-select"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {yearOptions.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* ── Year Summary Cards ── */}
      {!loading && records.length > 0 && (
        <div className="mps-summary-row">
          {[
            { label: `Payslips in ${year}`, value: `${records.length} / 12`, icon: "📄" },
            { label: "Total Gross Earned",  value: fmt(totalGross),           icon: "💰" },
            { label: "Total Net Received",  value: fmt(totalNet),             icon: "💳" },
            { label: "Tax + PF Deducted",   value: fmt(totalTax),             icon: "📊" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="mps-stat-card">
              <div className="mps-stat-icon">{icon}</div>
              <div className="mps-stat-val">{value}</div>
              <div className="mps-stat-lbl">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── States ── */}
      {loading && (
        <div className="mps-state">
          <div className="mps-spinner" />
          <p>Loading payslips...</p>
        </div>
      )}

      {error && !loading && (
        <div className="mps-state mps-state--error">
          <div className="mps-state-icon">⚠️</div>
          <p>{error}</p>
          <button className="mps-retry-btn" onClick={fetchPayroll}>Retry</button>
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="mps-state">
          <div className="mps-state-icon">📭</div>
          <p>No payslips found for {year}.</p>
          <span className="mps-state-sub">Payslips are generated by HR at the end of each month.</span>
        </div>
      )}

      {/* ── Payslip List ── */}
      {!loading && !error && records.length > 0 && (
        <div className="mps-list">
          {MONTHS.map((monthName, idx) => {
            const monthNum = idx + 1;
            const record   = records.find(r => r.month === monthNum);

            if (!record) {
              return (
                <div key={monthName} className="mps-item mps-item--empty">
                  <div className="mps-item__month">{monthName} {year}</div>
                  <div className="mps-item__na">Not generated</div>
                </div>
              );
            }

            return (
              <div key={monthName} className="mps-item mps-item--active">
                <div className="mps-item__left">
                  <div className="mps-item__month-badge">{monthName.slice(0, 3)}</div>
                  <div>
                    <div className="mps-item__month">{monthName} {year}</div>
                    <div className="mps-item__meta">
                      {record.presentDays}d present · {record.leaveDays}d leave
                      {record.absentDays > 0 && ` · ${record.absentDays}d absent`}
                    </div>
                  </div>
                </div>

                <div className="mps-item__right">
                  <div className="mps-item__amounts">
                    <div className="mps-item__net">{fmt(record.netSalary)}</div>
                    <div className="mps-item__gross">Gross {fmt(record.grossSalary)}</div>
                  </div>
                  <span className={`mps-item__badge mps-item__badge--${record.status}`}>
                    {record.status === "paid" ? "✓ Paid" : record.status === "generated" ? "Generated" : "Draft"}
                  </span>
                  <button
                    className="mps-item__view-btn"
                    onClick={(e) => handleViewClick(e, record)}
                  >🔒 View →</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Password Prompt ── */}
      {pendingRecord && (
        <PasswordPrompt
          onConfirm={handlePasswordConfirm}
          onCancel={() => { setPendingRecord(null); setPassError(""); }}
          loading={verifying}
          error={passError}
        />
      )}

      {/* ── Payslip Modal ── */}
      {selected && (
        <PayslipCard
          payroll={selected}
          employee={employee || selected.employee}
          onClose={() => setSelected(null)}
        />
      )}

    </div>
  );
}