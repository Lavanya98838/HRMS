import AuditLog from "../models/AuditLog.model.js";
import { successResponse, serverError } from "../utils/response.js";

// ── GET /api/audit ────────────────────────────────────────
export const getAuditLogs = async (req, res) => {
  try {
    const {
      category, action, performedBy,
      startDate, endDate,
      status, page = 1, limit = 20,
    } = req.query;

    const filter = {};
    if (category)    filter.category    = category;
    if (action)      filter.action      = action;
    if (performedBy) filter.performedBy = performedBy;
    if (status)      filter.status      = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments(filter);

    const logs = await AuditLog.find(filter)
      .populate("performedBy",   "name email role")
      .populate("targetEmployee", "firstName lastName employeeId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, "Audit logs", {
      logs,
      pagination: {
        total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get Audit Logs Error:", error);
    return serverError(res, "Failed to fetch audit logs");
  }
};

// ── GET /api/audit/stats ──────────────────────────────────
export const getAuditStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayCount, byCategory, byAction, recentFailures] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: today } }),
      AuditLog.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      AuditLog.countDocuments({ status: "failure" }),
    ]);

    return successResponse(res, 200, "Audit stats", {
      total, todayCount, recentFailures, byCategory, byAction,
    });
  } catch (error) {
    return serverError(res, "Failed to fetch audit stats");
  }
};

// ── GET /api/audit/export ─────────────────────────────────
// Export logs as CSV
export const exportAuditLogs = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const filter = {};
    if (category)  filter.category  = category;
    if (startDate) filter.createdAt = { ...filter.createdAt, $gte: new Date(startDate) };
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { ...filter.createdAt, $lte: end };
    }

    const logs = await AuditLog.find(filter)
      .populate("performedBy",    "name email role")
      .populate("targetEmployee", "firstName lastName employeeId")
      .sort({ createdAt: -1 })
      .limit(5000);

    const rows = [
      ["Timestamp", "Action", "Category", "Performed By", "Role", "Target Employee", "Status", "IP Address"],
      ...logs.map(l => [
        new Date(l.createdAt).toISOString(),
        l.action,
        l.category,
        l.performedBy?.name  || "—",
        l.performedByRole    || "—",
        l.targetEmployee
          ? `${l.targetEmployee.firstName} ${l.targetEmployee.lastName} (${l.targetEmployee.employeeId})`
          : "—",
        l.status,
        l.ipAddress || "—",
      ]),
    ];

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    return serverError(res, "Failed to export audit logs");
  }
};