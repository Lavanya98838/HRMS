import mongoose from "mongoose";

// ── Shift Type (Morning / Afternoon / Night) ──────────────
const shiftTypeSchema = new mongoose.Schema({
  name:      { type: String, required: true },       // "Morning Shift"
  startTime: { type: String, required: true },       // "09:00"
  endTime:   { type: String, required: true },       // "17:00"
  color:     { type: String, default: "#7c3aed" },   // for UI display
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

export const ShiftType = mongoose.model("ShiftType", shiftTypeSchema);

// ── Weekly Schedule ───────────────────────────────────────
const shiftAssignmentSchema = new mongoose.Schema({
  employee:  { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  shiftType: { type: mongoose.Schema.Types.ObjectId, ref: "ShiftType", required: true },
  dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0=Sun, 1=Mon...6=Sat
  weekStart: { type: Date, required: true },  // Monday of that week (normalized)
  notes:     { type: String, default: "" },
  assignedBy:{ type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

shiftAssignmentSchema.index({ employee: 1, weekStart: 1 });
shiftAssignmentSchema.index({ weekStart: 1, dayOfWeek: 1 });

export const ShiftAssignment = mongoose.model("ShiftAssignment", shiftAssignmentSchema);