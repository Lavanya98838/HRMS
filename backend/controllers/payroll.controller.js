import Payroll    from "../models/Payroll.model.js";
import Employee   from "../models/Employee.model.js";
import Attendance from "../models/Attendance.model.js";
import Leave      from "../models/Leave.model.js";
import { generatePayslipPDF } from "../utils/payslipPDF.js";
import {
  successResponse, badRequest, notFound,
  conflict, serverError, forbidden,
} from "../utils/response.js";
import { createNotification } from "./notification.controller.js";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Helper: calculate working days in a month ─────────────
const getWorkingDays = (year, month) => {
  let count = 0;
  const days = new Date(year, month, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
};

// ── POST /api/payroll/generate/:employeeId ────────────────
export const generatePayroll = async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear(), notes } = req.body;

    const employee = await Employee.findById(req.params.employeeId)
      .populate("department", "name")
      .populate("role", "name");

    if (!employee) return notFound(res, "Employee not found");

    const existing = await Payroll.findOne({ employee: employee._id, month, year });
    if (existing) return conflict(res, `Payroll for ${month}/${year} already exists for this employee`);

    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0, 23, 59, 59);

    const attendanceRecords = await Attendance.find({
      employee: employee._id,
      date: { $gte: startDate, $lte: endDate },
    });

    const workingDays = getWorkingDays(year, month);
    const presentDays = attendanceRecords.filter(r => ["present", "late"].includes(r.status)).length;
    const leaveDays   = attendanceRecords.filter(r => r.status === "on_leave").length;
    const absentDays  = workingDays - presentDays - leaveDays;
    const lateDays    = attendanceRecords.filter(r => r.isLate).length;

    const basic      = employee.salary?.basic      || 0;
    const hra        = employee.salary?.hra        || 0;
    const allowances = employee.salary?.allowances || 0;
    const deductions = employee.salary?.deductions || 0;

    const grossSalary   = basic + hra + allowances;
    const pfDeduction   = Math.round(basic * 0.12);
    const taxDeduction  = Math.round(grossSalary * 0.1);
    const dailyRate     = grossSalary / workingDays;
    const absentDeduct  = Math.round(absentDays > 2 ? (absentDays - 2) * dailyRate : 0);
    const lateDeduction = Math.round(lateDays > 3 ? (lateDays - 3) * 100 : 0);

    const payroll = await Payroll.create({
      employee:    employee._id,
      month, year,
      basic, hra, allowances,
      deductions:  deductions + absentDeduct,
      taxDeduction,
      pfDeduction,
      lateDeduction,
      workingDays,
      presentDays,
      leaveDays,
      absentDays:  Math.max(0, absentDays),
      status:      "generated",
      generatedBy: req.user.id,
      notes,
    });

    await payroll.populate("employee");

    // ── Notify employee: payslip ready ────────────────────
    if (employee.user) {
      await createNotification({
        recipient: employee.user,
        type:      "payroll_generated",
        title:     "Payslip Generated",
        message:   `Your payslip for ${MONTH_NAMES[month - 1]} ${year} is ready. Net salary: ₹${payroll.netSalary.toLocaleString("en-IN")}.`,
        link:      `/employee/payslips`,
        meta:      { payrollId: payroll._id, month, year },
      });
    }

    return successResponse(res, 201, "Payroll generated successfully", { payroll });
  } catch (error) {
    console.error("Generate Payroll Error:", error);
    return serverError(res, "Failed to generate payroll");
  }
};

// ── GET /api/payroll/my ───────────────────────────────────
export const getMyPayroll = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) return notFound(res, "Employee profile not found");

    const { year = new Date().getFullYear() } = req.query;

    const records = await Payroll.find({
      employee: employee._id,
      year: parseInt(year),
    })
    .populate({
      path: "employee",
      populate: { path: "department", select: "name" },
    })
    .sort({ month: -1 });

    return successResponse(res, 200, "Payroll records", { records });
  } catch (error) {
    return serverError(res, "Failed to fetch payroll");
  }
};

// ── GET /api/payroll ──────────────────────────────────────
export const getAllPayroll = async (req, res) => {
  try {
    const {
      month = new Date().getMonth() + 1,
      year  = new Date().getFullYear(),
      department, status,
      page = 1, limit = 20,
    } = req.query;

    let employeeFilter = {};
    if (department) employeeFilter.department = department;

    let employeeIds;
    if (Object.keys(employeeFilter).length > 0) {
      const emps = await Employee.find(employeeFilter).select("_id");
      employeeIds = emps.map(e => e._id);
    }

    const filter = {
      month: parseInt(month),
      year:  parseInt(year),
      ...(employeeIds && { employee: { $in: employeeIds } }),
      ...(status && { status }),
    };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Payroll.countDocuments(filter);

    const records = await Payroll.find(filter)
      .populate({
        path: "employee",
        select: "firstName lastName employeeId department designation",
        populate: { path: "department", select: "name" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const allRecords = await Payroll.find(filter);
    const summary = {
      totalGross: allRecords.reduce((s, r) => s + r.grossSalary, 0),
      totalNet:   allRecords.reduce((s, r) => s + r.netSalary,   0),
      totalTax:   allRecords.reduce((s, r) => s + r.taxDeduction, 0),
      totalPF:    allRecords.reduce((s, r) => s + r.pfDeduction,  0),
      count:      allRecords.length,
    };

    return successResponse(res, 200, "Payroll records", {
      records, summary,
      pagination: {
        total, page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    return serverError(res, "Failed to fetch payroll");
  }
};

// ── GET /api/payroll/employee/:employeeId ─────────────────
export const getEmployeePayroll = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return notFound(res, "Employee not found");

    if (req.user.role === "employee") {
      const self = await Employee.findOne({ user: req.user.id });
      if (!self || self._id.toString() !== employee._id.toString()) {
        return forbidden(res, "Access denied");
      }
    }

    const records = await Payroll.find({ employee: employee._id })
      .sort({ year: -1, month: -1 });

    return successResponse(res, 200, "Employee payroll", { records, employee });
  } catch (error) {
    return serverError(res, "Failed to fetch payroll");
  }
};

// ── GET /api/payroll/:id/download ─────────────────────────
export const downloadPayslip = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate({
        path: "employee",
        populate: { path: "department", select: "name" },
      });

    if (!payroll) return notFound(res, "Payroll record not found");

    if (req.user.role === "employee") {
      const self = await Employee.findOne({ user: req.user.id });
      if (!self || self._id.toString() !== payroll.employee._id.toString()) {
        return forbidden(res, "Access denied");
      }
    }

    const filename = `Payslip_${payroll.employee.employeeId}_${MONTH_NAMES[payroll.month - 1]}_${payroll.year}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const pdfDoc = generatePayslipPDF(payroll, payroll.employee);
    pdfDoc.pipe(res);
  } catch (error) {
    console.error("Download Payslip Error:", error);
    return serverError(res, "Failed to generate PDF");
  }
};

// ── PUT /api/payroll/:id ──────────────────────────────────
export const updatePayroll = async (req, res) => {
  try {
    const { status, notes, basic, hra, allowances, deductions, taxDeduction, pfDeduction } = req.body;

    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return notFound(res, "Payroll record not found");

    if (status !== undefined)       payroll.status       = status;
    if (notes !== undefined)        payroll.notes        = notes;
    if (basic !== undefined)        payroll.basic        = basic;
    if (hra !== undefined)          payroll.hra          = hra;
    if (allowances !== undefined)   payroll.allowances   = allowances;
    if (deductions !== undefined)   payroll.deductions   = deductions;
    if (taxDeduction !== undefined) payroll.taxDeduction = taxDeduction;
    if (pfDeduction !== undefined)  payroll.pfDeduction  = pfDeduction;
    if (status === "paid")          payroll.paidAt       = new Date();

    await payroll.save();

    return successResponse(res, 200, "Payroll updated", { payroll });
  } catch (error) {
    return serverError(res, "Failed to update payroll");
  }
};

// ── POST /api/payroll/generate-all ───────────────────────
export const generateBulkPayroll = async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.body;

    const employees = await Employee.find({ isActive: true });
    const results = { generated: [], skipped: [], failed: [] };

    for (const employee of employees) {
      try {
        const existing = await Payroll.findOne({ employee: employee._id, month, year });
        if (existing) {
          results.skipped.push(employee.employeeId);
          continue;
        }

        const workingDays = getWorkingDays(year, month);
        const startDate   = new Date(year, month - 1, 1);
        const endDate     = new Date(year, month, 0, 23, 59, 59);

        const attendanceRecords = await Attendance.find({
          employee: employee._id,
          date: { $gte: startDate, $lte: endDate },
        });

        const presentDays = attendanceRecords.filter(r => ["present", "late"].includes(r.status)).length;
        const leaveDays   = attendanceRecords.filter(r => r.status === "on_leave").length;
        const absentDays  = Math.max(0, workingDays - presentDays - leaveDays);
        const lateDays    = attendanceRecords.filter(r => r.isLate).length;

        const basic      = employee.salary?.basic      || 0;
        const hra        = employee.salary?.hra        || 0;
        const allowances = employee.salary?.allowances || 0;
        const deductions = employee.salary?.deductions || 0;
        const grossSalary = basic + hra + allowances;

        const pfDeduction   = Math.round(basic * 0.12);
        const taxDeduction  = Math.round(grossSalary * 0.1);
        const dailyRate     = workingDays > 0 ? grossSalary / workingDays : 0;
        const absentDeduct  = Math.round(absentDays > 2 ? (absentDays - 2) * dailyRate : 0);
        const lateDeduction = Math.round(lateDays > 3 ? (lateDays - 3) * 100 : 0);

        const payroll = await Payroll.create({
          employee: employee._id,
          month, year,
          basic, hra, allowances,
          deductions: deductions + absentDeduct,
          taxDeduction, pfDeduction, lateDeduction,
          workingDays, presentDays, leaveDays,
          absentDays,
          status: "generated",
          generatedBy: req.user.id,
        });

        // ── Notify employee: payslip ready ────────────────
        if (employee.user) {
          await createNotification({
            recipient: employee.user,
            type:      "payroll_generated",
            title:     "Payslip Generated",
            message:   `Your payslip for ${MONTH_NAMES[month - 1]} ${year} is ready. Net salary: ₹${payroll.netSalary.toLocaleString("en-IN")}.`,
            link:      `/employee/payslips`,
            meta:      { month, year },
          });
        }

        results.generated.push(employee.employeeId);
      } catch (err) {
        results.failed.push({ id: employee.employeeId, reason: err.message });
      }
    }

    return successResponse(res, 200, "Bulk payroll generation complete", {
      summary: {
        total: employees.length,
        generated: results.generated.length,
        skipped: results.skipped.length,
        failed: results.failed.length,
      },
      results,
    });
  } catch (error) {
    console.error("Bulk Payroll Error:", error);
    return serverError(res, "Bulk payroll generation failed");
  }
};
