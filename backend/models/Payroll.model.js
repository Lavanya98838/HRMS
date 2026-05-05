import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  month: { type: Number, required: true },   // 1–12
  year:  { type: Number, required: true },

  // ── Earnings ──────────────────────────────────────────
  basic:       { type: Number, default: 0 },
  hra:         { type: Number, default: 0 },
  allowances:  { type: Number, default: 0 },

  // ── Deductions ────────────────────────────────────────
  deductions:      { type: Number, default: 0 },
  taxDeduction:    { type: Number, default: 0 },
  pfDeduction:     { type: Number, default: 0 },  // Provident Fund

  // ── Computed ──────────────────────────────────────────
  grossSalary: { type: Number, default: 0 },  // basic + hra + allowances
  netSalary:   { type: Number, default: 0 },  // gross - all deductions

  // ── Attendance adjustment ─────────────────────────────
  workingDays:  { type: Number, default: 0 },
  presentDays:  { type: Number, default: 0 },
  leaveDays:    { type: Number, default: 0 },
  absentDays:   { type: Number, default: 0 },
  lateDeduction:{ type: Number, default: 0 },

  // ── Status ────────────────────────────────────────────
  status: {
    type: String,
    enum: ["draft", "generated", "paid"],
    default: "generated",
  },

  paidAt:      { type: Date },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  notes:       { type: String },
}, { timestamps: true });

// Unique constraint — one payroll per employee per month/year
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

// Auto-calculate gross and net before save
payrollSchema.pre("save", function (next) {
  this.grossSalary = this.basic + this.hra + this.allowances;
  this.netSalary   = this.grossSalary - this.deductions - this.taxDeduction - this.pfDeduction - this.lateDeduction;
  if (this.netSalary < 0) this.netSalary = 0;
  next();
});

export default mongoose.model("Payroll", payrollSchema);
