import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        // Auth
        "LOGIN", "LOGOUT", "LOGIN_FAILED", "PASSWORD_RESET", "REGISTER",
        // Employee
        "EMPLOYEE_CREATED", "EMPLOYEE_UPDATED", "EMPLOYEE_DELETED",
        "EMPLOYEE_BULK_UPLOAD", "AVATAR_UPDATED", "DOCUMENT_UPLOADED", "DOCUMENT_DELETED",
        // Leave
        "LEAVE_APPLIED", "LEAVE_APPROVED", "LEAVE_REJECTED", "LEAVE_CANCELLED",
        // Payroll
        "PAYROLL_GENERATED", "PAYSLIP_VIEWED",
        // Document
        "GLOBAL_DOCUMENT_UPLOADED", "GLOBAL_DOCUMENT_DELETED",
        // Performance
        "REVIEW_CREATED", "REVIEW_UPDATED",
        // Goals
        "GOAL_CREATED", "GOAL_UPDATED", "GOAL_DELETED",
        // Announcements
        "ANNOUNCEMENT_CREATED", "ANNOUNCEMENT_DELETED",
        // Shifts
        "SHIFT_ASSIGNED", "SHIFT_UPDATED",
        // System
        "SETTINGS_UPDATED",
      ],
    },
    category: {
      type: String,
      required: true,
      enum: ["auth", "employee", "leave", "payroll", "document", "performance", "goal", "announcement", "shift", "system"],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedByRole: { type: String },
    targetEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress:  { type: String, default: null },
    userAgent:  { type: String, default: null },
    status:     { type: String, enum: ["success", "failure"], default: "success" },
  },
  { timestamps: true }
);

// Indexes for fast filtering
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ targetEmployee: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;