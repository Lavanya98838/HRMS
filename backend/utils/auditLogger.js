import AuditLog from "../models/AuditLog.model.js";

/**
 * Log an audit event — non-blocking, never throws
 * Usage: await auditLog(req, { action, category, targetEmployee, details, status })
 */
export const auditLog = async (req, { action, category, targetEmployee = null, details = {}, status = "success" }) => {
  try {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
      || req.socket?.remoteAddress
      || null;

    const ua = req.headers["user-agent"] || null;

    await AuditLog.create({
      action,
      category,
      performedBy:     req.user?.id || req.user?._id,
      performedByRole: req.user?.role,
      targetEmployee:  targetEmployee || null,
      details,
      ipAddress: ip,
      userAgent: ua,
      status,
    });
  } catch (err) {
    // Never crash the main request due to audit log failure
    console.warn("⚠️  Audit log failed:", err.message);
  }
};