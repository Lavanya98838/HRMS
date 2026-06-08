import { useState } from "react";
import { downloadPayslip } from "../../services/payrollService";
import "./PayslipCard.css";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const fmt = (n) =>
  `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const StatusBadge = ({ status }) => (
  <span className={`ps-badge ps-badge--${status}`}>
    {status === "paid" ? "✓ Paid" : status === "generated" ? "⏳ Generated" : "Draft"}
  </span>
);

export default function PayslipCard({ payroll, employee, onClose }) {
  const [downloading, setDownloading] = useState(false);

  if (!payroll || !employee) return null;

  const monthLabel = `${MONTHS[payroll.month - 1]} ${payroll.year}`;
  const filename   = `Payslip_${employee.employeeId}_${MONTHS[payroll.month - 1]}_${payroll.year}.pdf`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadPayslip(payroll._id, filename);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const earnings = [
    { label: "Basic Salary", value: payroll.basic },
    { label: "HRA",          value: payroll.hra },
    { label: "Allowances",   value: payroll.allowances },
  ];

  const deductions = [
    { label: "Deductions",     value: payroll.deductions },
    { label: "Tax (TDS 10%)",  value: payroll.taxDeduction },
    { label: "Provident Fund", value: payroll.pfDeduction },
    { label: "Late Deduction", value: payroll.lateDeduction },
  ];

  const totalDeductions =
    (payroll.deductions    || 0) +
    (payroll.taxDeduction  || 0) +
    (payroll.pfDeduction   || 0) +
    (payroll.lateDeduction || 0);

  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="ps-header">
          <div className="ps-header__left">
            <div className="ps-header__logo">HRMS</div>
            <div>
              <div className="ps-header__title">Payslip</div>
              <div className="ps-header__sub">For the month of {monthLabel}</div>
            </div>
          </div>
          <div className="ps-header__right">
            <StatusBadge status={payroll.status} />
            {payroll.paidAt && (
              <div className="ps-header__paid-on">
                Paid on {new Date(payroll.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            )}
            <button className="ps-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="ps-body">

          {/* ── Employee Details ── */}
          <section className="ps-section">
            <h3 className="ps-section__title">Employee Details</h3>
            <div className="ps-info-grid">
              <div className="ps-info-item">
                <span className="ps-info-label">Full Name</span>
                <span className="ps-info-value">{employee.firstName} {employee.lastName}</span>
              </div>
              <div className="ps-info-item">
                <span className="ps-info-label">Employee ID</span>
                <span className="ps-info-value ps-info-value--mono">{employee.employeeId}</span>
              </div>
              <div className="ps-info-item">
                <span className="ps-info-label">Designation</span>
                <span className="ps-info-value">{employee.designation || "—"}</span>
              </div>
              <div className="ps-info-item">
                <span className="ps-info-label">Department</span>
                <span className="ps-info-value">{employee.department?.name || "—"}</span>
              </div>
              <div className="ps-info-item">
                <span className="ps-info-label">Employment Type</span>
                <span className="ps-info-value">
                  {employee.employmentType?.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()) || "—"}
                </span>
              </div>
              <div className="ps-info-item">
                <span className="ps-info-label">Pay Period</span>
                <span className="ps-info-value">{monthLabel}</span>
              </div>
            </div>
          </section>

          {/* ── Attendance Summary ── */}
          <section className="ps-section">
            <h3 className="ps-section__title">Attendance Summary</h3>
            <div className="ps-attendance-row">
              {[
                { label: "Working Days", value: payroll.workingDays, color: "blue"  },
                { label: "Present",      value: payroll.presentDays, color: "green" },
                { label: "On Leave",     value: payroll.leaveDays,   color: "amber" },
                { label: "Absent",       value: payroll.absentDays,  color: "red"   },
              ].map(({ label, value, color }) => (
                <div key={label} className={`ps-att-card ps-att-card--${color}`}>
                  <div className="ps-att-val">{value}</div>
                  <div className="ps-att-lbl">{label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Salary Breakdown ── */}
          <section className="ps-section">
            <h3 className="ps-section__title">Salary Breakdown</h3>
            <div className="ps-salary-grid">
              <div className="ps-sal-col">
                <div className="ps-sal-col-header ps-sal-col-header--earn">Earnings</div>
                {earnings.map(({ label, value }) => (
                  <div key={label} className="ps-sal-row">
                    <span className="ps-sal-label">{label}</span>
                    <span className="ps-sal-amount ps-sal-amount--earn">{fmt(value)}</span>
                  </div>
                ))}
                <div className="ps-sal-row ps-sal-row--total">
                  <span className="ps-sal-label">Gross Salary</span>
                  <span className="ps-sal-amount ps-sal-amount--earn">{fmt(payroll.grossSalary)}</span>
                </div>
              </div>
              <div className="ps-sal-col">
                <div className="ps-sal-col-header ps-sal-col-header--ded">Deductions</div>
                {deductions.map(({ label, value }) => (
                  <div key={label} className="ps-sal-row">
                    <span className="ps-sal-label">{label}</span>
                    <span className="ps-sal-amount ps-sal-amount--ded">{fmt(value)}</span>
                  </div>
                ))}
                <div className="ps-sal-row ps-sal-row--total">
                  <span className="ps-sal-label">Total Deductions</span>
                  <span className="ps-sal-amount ps-sal-amount--ded">{fmt(totalDeductions)}</span>
                </div>
              </div>
            </div>
            <div className="ps-net">
              <div className="ps-net__label">Net Salary (Take Home)</div>
              <div className="ps-net__amount">{fmt(payroll.netSalary)}</div>
            </div>
          </section>

          {payroll.notes && (
            <section className="ps-section">
              <h3 className="ps-section__title">Notes</h3>
              <p className="ps-notes">{payroll.notes}</p>
            </section>
          )}

          {/* ── Footer ── */}
          <div className="ps-footer">
            <p className="ps-footer__text">
              This is a system-generated payslip and does not require a physical signature.
            </p>
            <button
              className="ps-download-btn"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <><span className="ps-btn-spinner" />Generating PDF...</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}