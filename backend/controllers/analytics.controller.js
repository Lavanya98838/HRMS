import Employee   from "../models/Employee.model.js";
import Department from "../models/Department.model.js";
import Attendance from "../models/Attendance.model.js";
import Leave      from "../models/Leave.model.js";
import Payroll    from "../models/Payroll.model.js";
import User       from "../models/User.model.js";
import { successResponse, serverError } from "../utils/response.js";

// ── GET /api/analytics/overview ──────────────────────────
export const getOverview = async (req, res) => {
  try {
    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      totalDepartments,
      totalRoles,
      newThisMonth,
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ isActive: true }),
      Employee.countDocuments({ isActive: false }),
      Department.countDocuments({ isActive: true }),
      (await import("../models/Role.model.js")).default.countDocuments({ isActive: true }),
      Employee.countDocuments({
        dateOfJoining: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
    ]);

    return successResponse(res, 200, "Overview stats", {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      totalDepartments,
      totalRoles,
      newThisMonth,
    });
  } catch (error) {
    console.error("Overview Error:", error);
    return serverError(res, "Failed to fetch overview");
  }
};

// ── GET /api/analytics/headcount-trends ──────────────────
// Monthly joining trends for the past 12 months
export const getHeadcountTrends = async (req, res) => {
  try {
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const trends = await Promise.all(
      months.map(async ({ year, month }) => {
        const start = new Date(year, month - 1, 1);
        const end   = new Date(year, month, 0, 23, 59, 59);
        const count = await Employee.countDocuments({
          dateOfJoining: { $gte: start, $lte: end },
        });
        const exits = await Employee.countDocuments({
          dateOfLeaving: { $gte: start, $lte: end },
        });
        return {
          label: start.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
          joined: count,
          left: exits,
        };
      })
    );

    return successResponse(res, 200, "Headcount trends", { trends });
  } catch (error) {
    return serverError(res, "Failed to fetch headcount trends");
  }
};

// ── GET /api/analytics/attendance-trends ─────────────────
export const getAttendanceTrends = async (req, res) => {
  try {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const trends = await Promise.all(
      months.map(async ({ year, month }) => {
        const start = new Date(year, month - 1, 1);
        const end   = new Date(year, month, 0, 23, 59, 59);

        const [present, late, absent, onLeave] = await Promise.all([
          Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: "present" }),
          Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: "late" }),
          Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: "absent" }),
          Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: "on_leave" }),
        ]);

        return {
          label: start.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
          present, late, absent, onLeave,
        };
      })
    );

    return successResponse(res, 200, "Attendance trends", { trends });
  } catch (error) {
    return serverError(res, "Failed to fetch attendance trends");
  }
};

// ── GET /api/analytics/department-breakdown ───────────────
export const getDepartmentBreakdown = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).select("name code");

    const breakdown = await Promise.all(
      departments.map(async (dept) => {
        const [total, active] = await Promise.all([
          Employee.countDocuments({ department: dept._id }),
          Employee.countDocuments({ department: dept._id, isActive: true }),
        ]);
        return {
          name:   dept.name,
          code:   dept.code,
          total,
          active,
          inactive: total - active,
        };
      })
    );

    // Sort by total desc
    breakdown.sort((a, b) => b.total - a.total);

    return successResponse(res, 200, "Department breakdown", { breakdown });
  } catch (error) {
    return serverError(res, "Failed to fetch department breakdown");
  }
};

// ── GET /api/analytics/salary-overview ───────────────────
export const getSalaryOverview = async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

    const records = await Payroll.find({
      month: parseInt(month),
      year:  parseInt(year),
    });

    if (records.length === 0) {
      return successResponse(res, 200, "Salary overview", {
        totalGross: 0, totalNet: 0, totalTax: 0, totalPF: 0,
        avgSalary: 0, highestSalary: 0, lowestSalary: 0, count: 0,
        monthlyTrend: [],
      });
    }

    const netSalaries = records.map(r => r.netSalary);

    // Last 6 months trend
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const monthlyTrend = await Promise.all(
      months.map(async ({ year: y, month: m }) => {
        const recs = await Payroll.find({ month: m, year: y });
        const total = recs.reduce((s, r) => s + r.netSalary, 0);
        return {
          label: new Date(y, m - 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
          total,
          count: recs.length,
        };
      })
    );

    return successResponse(res, 200, "Salary overview", {
      totalGross:    records.reduce((s, r) => s + r.grossSalary, 0),
      totalNet:      records.reduce((s, r) => s + r.netSalary,   0),
      totalTax:      records.reduce((s, r) => s + r.taxDeduction, 0),
      totalPF:       records.reduce((s, r) => s + r.pfDeduction,  0),
      avgSalary:     Math.round(netSalaries.reduce((a, b) => a + b, 0) / netSalaries.length),
      highestSalary: Math.max(...netSalaries),
      lowestSalary:  Math.min(...netSalaries),
      count:         records.length,
      monthlyTrend,
    });
  } catch (error) {
    return serverError(res, "Failed to fetch salary overview");
  }
};

// ── GET /api/analytics/leave-summary ─────────────────────
export const getLeaveSummary = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const start = new Date(year, 0, 1);
    const end   = new Date(year, 11, 31, 23, 59, 59);

    const [sick, casual, paid, pending, approved, rejected] = await Promise.all([
      Leave.countDocuments({ startDate: { $gte: start, $lte: end }, leaveType: "sick",   status: "approved" }),
      Leave.countDocuments({ startDate: { $gte: start, $lte: end }, leaveType: "casual", status: "approved" }),
      Leave.countDocuments({ startDate: { $gte: start, $lte: end }, leaveType: "paid",   status: "approved" }),
      Leave.countDocuments({ startDate: { $gte: start, $lte: end }, status: "pending"  }),
      Leave.countDocuments({ startDate: { $gte: start, $lte: end }, status: "approved" }),
      Leave.countDocuments({ startDate: { $gte: start, $lte: end }, status: "rejected" }),
    ]);

    // Monthly leave trend
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const s = new Date(year, m - 1, 1);
      const e = new Date(year, m, 0, 23, 59, 59);
      const count = await Leave.countDocuments({
        startDate: { $gte: s, $lte: e },
        status: "approved",
      });
      months.push({
        label: s.toLocaleDateString("en-IN", { month: "short" }),
        count,
      });
    }

    return successResponse(res, 200, "Leave summary", {
      byType:  { sick, casual, paid },
      byStatus: { pending, approved, rejected },
      monthlyTrend: months,
    });
  } catch (error) {
    return serverError(res, "Failed to fetch leave summary");
  }
};

// ── GET /api/analytics/employment-types ──────────────────
export const getEmploymentTypes = async (req, res) => {
  try {
    const types = ["full_time", "part_time", "contract", "intern"];

    const breakdown = await Promise.all(
      types.map(async (type) => {
        const count = await Employee.countDocuments({ employmentType: type, isActive: true });
        return {
          type,
          label: type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
          count,
        };
      })
    );

    return successResponse(res, 200, "Employment types", { breakdown });
  } catch (error) {
    return serverError(res, "Failed to fetch employment types");
  }
};
