import Employee          from "../models/Employee.model.js";
import Attendance        from "../models/Attendance.model.js";
import Leave             from "../models/Leave.model.js";
import PerformanceReview from "../models/PerformanceReview.model.js";
import { successResponse, serverError } from "../utils/response.js";

// ── Helpers ───────────────────────────────────────────────────
const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};

const tenureMonths = (dateOfJoining) => {
  const diff = new Date() - new Date(dateOfJoining);
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
};

// ── GET /api/predictive/attrition ─────────────────────────────
export const getAttritionRisk = async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true })
      .populate("department", "name")
      .populate("role", "name")
      .lean();

    const since90 = monthsAgo(3);
    const since180 = monthsAgo(6);

    const results = await Promise.all(employees.map(async (emp) => {
      // 1. Late arrivals in last 90 days
      const lateCount = await Attendance.countDocuments({
        employee: emp._id,
        isLate: true,
        date: { $gte: since90 },
      });

      // 2. Absences in last 90 days
      const absentCount = await Attendance.countDocuments({
        employee: emp._id,
        status: "absent",
        date: { $gte: since90 },
      });

      // 3. Leave applications in last 180 days
      const leaveCount = await Leave.countDocuments({
        employee: emp._id,
        createdAt: { $gte: since180 },
      });

      // 4. Latest performance rating
      const latestReview = await PerformanceReview.findOne({
        employee: emp._id,
      }).sort({ createdAt: -1 }).lean();

      const perfScore = latestReview?.overallRating || null;

      // 5. Tenure in months
      const tenure = tenureMonths(emp.dateOfJoining);

      // ── Scoring (weighted) ────────────────────────
      let score = 0;

      // Late arrivals (max 25 pts)
      if (lateCount >= 10) score += 25;
      else if (lateCount >= 6) score += 18;
      else if (lateCount >= 3) score += 10;

      // Absences (max 25 pts)
      if (absentCount >= 8) score += 25;
      else if (absentCount >= 4) score += 16;
      else if (absentCount >= 2) score += 8;

      // Leave frequency (max 20 pts)
      if (leaveCount >= 8) score += 20;
      else if (leaveCount >= 5) score += 13;
      else if (leaveCount >= 3) score += 7;

      // Low performance (max 20 pts)
      if (perfScore !== null) {
        if (perfScore <= 2)   score += 20;
        else if (perfScore <= 3) score += 10;
        else if (perfScore <= 3.5) score += 5;
      }

      // Short tenure < 6 months (max 10 pts)
      if (tenure < 3)  score += 10;
      else if (tenure < 6)  score += 6;
      else if (tenure < 12) score += 3;

      const risk = score >= 60 ? "high" : score >= 35 ? "medium" : "low";

      return {
        _id:        emp._id,
        name:       `${emp.firstName} ${emp.lastName}`,
        employeeId: emp.employeeId,
        department: emp.department?.name || "—",
        role:       emp.role?.name || "—",
        tenure,
        lateCount,
        absentCount,
        leaveCount,
        perfScore,
        score,
        risk,
      };
    }));

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    const summary = {
      high:   results.filter(r => r.risk === "high").length,
      medium: results.filter(r => r.risk === "medium").length,
      low:    results.filter(r => r.risk === "low").length,
      total:  results.length,
    };

    return successResponse(res, 200, "Attrition risk data", { employees: results, summary });
  } catch (error) {
    console.error("Attrition Risk Error:", error);
    return serverError(res, "Failed to calculate attrition risk");
  }
};

// ── GET /api/predictive/department-health ─────────────────────
export const getDepartmentHealth = async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true })
      .populate("department", "name code")
      .lean();

    // Group employees by department
    const deptMap = {};
    employees.forEach(emp => {
      if (!emp.department) return;
      const id = emp.department._id.toString();
      if (!deptMap[id]) {
        deptMap[id] = { name: emp.department.name, employees: [] };
      }
      deptMap[id].employees.push(emp._id);
    });

    const since30 = monthsAgo(1);
    const since90 = monthsAgo(3);

    const results = await Promise.all(
      Object.entries(deptMap).map(async ([deptId, dept]) => {
        const empIds = dept.employees;
        const count  = empIds.length;
        if (count === 0) return null;

        // Attendance this month
        const [present, late, absent, totalAttendance] = await Promise.all([
          Attendance.countDocuments({ employee: { $in: empIds }, status: { $in: ["present", "late"] }, date: { $gte: since30 } }),
          Attendance.countDocuments({ employee: { $in: empIds }, isLate: true, date: { $gte: since30 } }),
          Attendance.countDocuments({ employee: { $in: empIds }, status: "absent", date: { $gte: since30 } }),
          Attendance.countDocuments({ employee: { $in: empIds }, date: { $gte: since30 } }),
        ]);

        // Leave last 90 days
        const leaveApps = await Leave.countDocuments({
          employee: { $in: empIds },
          createdAt: { $gte: since90 },
          status: "approved",
        });

        // Avg performance
        const reviews = await PerformanceReview.find({
          employee: { $in: empIds },
          year: new Date().getFullYear(),
        }).lean();

        const avgPerf = reviews.length
          ? reviews.reduce((s, r) => s + (r.overallRating || 0), 0) / reviews.length
          : null;

        // Health score (0-100)
        const attendanceRate = totalAttendance > 0 ? (present / totalAttendance) * 100 : 100;
        const lateRate       = totalAttendance > 0 ? (late / totalAttendance) * 100 : 0;
        const leaveRate      = (leaveApps / (count * 3)) * 100; // vs 3 leaves per person per 90 days

        let healthScore = 100;
        healthScore -= Math.min(30, (100 - attendanceRate) * 1.5); // attendance penalty
        healthScore -= Math.min(20, lateRate * 0.8);               // late penalty
        healthScore -= Math.min(20, leaveRate * 0.5);              // leave penalty
        if (avgPerf !== null) {
          healthScore -= Math.min(30, (5 - avgPerf) * 10);         // performance penalty
        }
        healthScore = Math.max(0, Math.round(healthScore));

        const status = healthScore >= 75 ? "healthy" : healthScore >= 50 ? "moderate" : "attention";

        return {
          department:    dept.name,
          employeeCount: count,
          attendanceRate: Math.round(attendanceRate),
          lateRate:       Math.round(lateRate),
          leaveCount:     leaveApps,
          avgPerformance: avgPerf ? Math.round(avgPerf * 10) / 10 : null,
          healthScore,
          status,
        };
      })
    );

    const departments = results.filter(Boolean).sort((a, b) => b.healthScore - a.healthScore);
    return successResponse(res, 200, "Department health data", { departments });
  } catch (error) {
    console.error("Department Health Error:", error);
    return serverError(res, "Failed to calculate department health");
  }
};

// ── GET /api/predictive/leave-forecast ────────────────────────
export const getLeaveForecast = async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear  = new Date().getFullYear();

    // Get monthly leave counts for last 12 months
    const since12 = monthsAgo(12);
    const leaves  = await Leave.find({
      createdAt: { $gte: since12 },
      status: "approved",
    }).lean();

    // Group by month
    const monthlyData = {};
    leaves.forEach(leave => {
      const d   = new Date(leave.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyData[key] = (monthlyData[key] || 0) + leave.totalDays;
    });

    // Build last 12 months array
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const trend = [];
    for (let i = 11; i >= 0; i--) {
      const d   = monthsAgo(i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      trend.push({
        label:  MONTHS[d.getMonth()],
        month:  d.getMonth() + 1,
        year:   d.getFullYear(),
        actual: monthlyData[key] || 0,
      });
    }

    // Simple forecast: avg of same month last 2 years + trend
    const avg = trend.reduce((s, t) => s + t.actual, 0) / trend.length;
    const nextMonths = [];
    for (let i = 1; i <= 3; i++) {
      const d          = new Date();
      d.setMonth(d.getMonth() + i);
      const monthIdx   = d.getMonth();
      // Find historical data for same month
      const historical = trend.filter(t => t.month === monthIdx + 1);
      const forecast   = historical.length
        ? Math.round(historical.reduce((s, t) => s + t.actual, 0) / historical.length * 1.05)
        : Math.round(avg);
      nextMonths.push({
        label:    MONTHS[monthIdx],
        forecast,
        isForecast: true,
      });
    }

    // Peak month analysis
    const peakMonth = trend.reduce((a, b) => a.actual > b.actual ? a : b);

    return successResponse(res, 200, "Leave forecast data", {
      trend,
      forecast: nextMonths,
      peakMonth: peakMonth.label,
      avgMonthlyLeaves: Math.round(avg),
    });
  } catch (error) {
    console.error("Leave Forecast Error:", error);
    return serverError(res, "Failed to generate leave forecast");
  }
};

// ── GET /api/predictive/performance-insights ──────────────────
export const getPerformanceInsights = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    const reviews = await PerformanceReview.find({ year: currentYear })
      .populate({ path: "employee", select: "firstName lastName employeeId department", populate: { path: "department", select: "name" } })
      .lean();

    if (reviews.length === 0) {
      return successResponse(res, 200, "Performance insights", {
        topPerformers: [], needsAttention: [], avgRating: 0, ratingDistribution: [],
      });
    }

    // Group by employee — take latest review
    const empMap = {};
    reviews.forEach(r => {
      const id = r.employee?._id?.toString();
      if (!id) return;
      if (!empMap[id] || new Date(r.createdAt) > new Date(empMap[id].createdAt)) {
        empMap[id] = r;
      }
    });

    const all = Object.values(empMap).filter(r => r.employee);
    all.sort((a, b) => b.overallRating - a.overallRating);

    const topPerformers   = all.slice(0, 5).map(r => ({
      name:       `${r.employee.firstName} ${r.employee.lastName}`,
      employeeId: r.employee.employeeId,
      department: r.employee.department?.name || "—",
      rating:     r.overallRating,
      ratings:    r.ratings,
    }));

    const needsAttention = all.slice(-5).reverse().filter(r => r.overallRating < 3.5).map(r => ({
      name:       `${r.employee.firstName} ${r.employee.lastName}`,
      employeeId: r.employee.employeeId,
      department: r.employee.department?.name || "—",
      rating:     r.overallRating,
      ratings:    r.ratings,
    }));

    const avgRating = all.reduce((s, r) => s + r.overallRating, 0) / all.length;

    // Rating distribution
    const dist = [
      { label: "⭐ 1-2", count: all.filter(r => r.overallRating < 2).length, color: "#ef4444" },
      { label: "⭐⭐ 2-3", count: all.filter(r => r.overallRating >= 2 && r.overallRating < 3).length, color: "#f97316" },
      { label: "⭐⭐⭐ 3-4", count: all.filter(r => r.overallRating >= 3 && r.overallRating < 4).length, color: "#f59e0b" },
      { label: "⭐⭐⭐⭐ 4-5", count: all.filter(r => r.overallRating >= 4).length, color: "#10b981" },
    ];

    return successResponse(res, 200, "Performance insights", {
      topPerformers, needsAttention,
      avgRating: Math.round(avgRating * 10) / 10,
      ratingDistribution: dist,
      totalReviewed: all.length,
    });
  } catch (error) {
    console.error("Performance Insights Error:", error);
    return serverError(res, "Failed to fetch performance insights");
  }
};