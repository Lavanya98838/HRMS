import Leave        from "../models/Leave.model.js";
import LeaveBalance  from "../models/LeaveBalance.model.js";
import Employee      from "../models/Employee.model.js";
import Attendance    from "../models/Attendance.model.js";
import User          from "../models/User.model.js";
import {
  successResponse, badRequest, notFound,
  forbidden, conflict, serverError,
} from "../utils/response.js";
import { createNotification } from "./notification.controller.js";
import { auditLog } from "../utils/auditLogger.js";

// ── Helper: get or create leave balance ──────────────────
const getOrCreateBalance = async (employeeId, year) => {
  let balance = await LeaveBalance.findOne({ employee: employeeId, year });
  if (!balance) {
    balance = await LeaveBalance.create({
      employee: employeeId,
      year,
      sick:   { total: 12, used: 0, remaining: 12 },
      casual: { total: 12, used: 0, remaining: 12 },
      paid:   { total: 15, used: 0, remaining: 15 },
    });
  }
  return balance;
};

// ── Helper: check overlapping leaves ─────────────────────
const hasOverlap = async (employeeId, startDate, endDate, excludeId = null) => {
  const filter = {
    employee: employeeId,
    status: { $in: ["pending", "approved"] },
    $or: [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
    ],
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return await Leave.exists(filter);
};

// ── POST /api/leave ───────────────────────────────────────
export const applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, isHalfDay } = req.body;

    if (!leaveType || !startDate || !reason) {
      return badRequest(res, "Leave type, start date, and reason are required");
    }

    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) return notFound(res, "Employee profile not found");

    const start = new Date(startDate);
    const end   = endDate ? new Date(endDate) : new Date(startDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start > end) return badRequest(res, "End date cannot be before start date");
    if (start < new Date()) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (start < today) return badRequest(res, "Cannot apply leave for past dates");
    }

    // Check overlap
    const overlap = await hasOverlap(employee._id, start, end);
    if (overlap) return conflict(res, "You already have a leave application for these dates");

    // Calculate days
    const totalDays = isHalfDay ? 0.5 :
      Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Check balance
    const year    = start.getFullYear();
    const balance = await getOrCreateBalance(employee._id, year);

    if (balance[leaveType].remaining < totalDays) {
      return badRequest(
        res,
        `Insufficient ${leaveType} leave balance. Available: ${balance[leaveType].remaining} days, Requested: ${totalDays} days`
      );
    }

    const leave = await Leave.create({
      employee:  employee._id,
      leaveType,
      startDate: start,
      endDate:   end,
      totalDays,
      isHalfDay: isHalfDay || false,
      reason:    reason.trim(),
      status:    "pending",
    });

    await leave.populate("employee", "firstName lastName employeeId department");

    // ── Notify employee: submission confirmed ─────────────
    await createNotification({
      recipient: req.user.id,
      type:      "leave_submitted",
      title:     "Leave Request Submitted",
      message:   `Your ${leaveType} leave request for ${totalDays} day(s) has been submitted and is pending approval.`,
      link:      `/employee/leave`,
      meta:      { leaveId: leave._id },
    });

    // ── Notify all HR and Admin users ─────────────────────
    const hrAdminUsers = await User.find({ role: { $in: ["hr", "admin"] } }).select("_id");
    for (const u of hrAdminUsers) {
      await createNotification({
        recipient: u._id,
        type:      "leave_submitted",
        title:     "New Leave Request",
        message:   `${employee.firstName} ${employee.lastName} has submitted a ${leaveType} leave request for ${totalDays} day(s).`,
        link:      `/hr/leave`,
        meta:      { leaveId: leave._id },
      });
    }

    await auditLog(req, { action: "LEAVE_APPLIED", category: "leave", targetEmployee: employee._id, details: { leaveType, totalDays, startDate, endDate } });
    return successResponse(res, 201, "Leave application submitted successfully", { leave });
  } catch (error) {
    console.error("Apply Leave Error:", error);
    return serverError(res, "Failed to apply for leave");
  }
};

// ── GET /api/leave/my ─────────────────────────────────────
export const getMyLeaves = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });

    if (!employee) {
      return successResponse(res, 200, "Leave history", { leaves: [] });
    }

    const { status } = req.query;
    const filter = { employee: employee._id };
    if (status) filter.status = status;

    const leaves = await Leave.find(filter)
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    return successResponse(res, 200, "Leave history", { leaves });
  } catch (error) {
    return serverError(res, "Failed to fetch leaves");
  }
};

// ── GET /api/leave/balance ────────────────────────────────
export const getLeaveBalance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });

    if (!employee) {
      return successResponse(res, 200, "Leave balance", {
        balance: {
          sick:   { total: 0, used: 0, remaining: 0 },
          casual: { total: 0, used: 0, remaining: 0 },
          paid:   { total: 0, used: 0, remaining: 0 },
        },
        year: new Date().getFullYear(),
      });
    }

    const year    = parseInt(req.query.year) || new Date().getFullYear();
    const balance = await getOrCreateBalance(employee._id, year);

    return successResponse(res, 200, "Leave balance", { balance, year });
  } catch (error) {
    return serverError(res, "Failed to fetch leave balance");
  }
};

// ── GET /api/leave ────────────────────────────────────────
export const getAllLeaves = async (req, res) => {
  try {
    const { status, leaveType, department, page = 1, limit = 20 } = req.query;

    let employeeFilter = {};

    if (req.user.role === "manager") {
      const mgr = await Employee.findOne({ user: req.user.id });
      if (mgr?.department) employeeFilter.department = mgr.department;
    }

    if (department) employeeFilter.department = department;

    let employeeIds;
    if (Object.keys(employeeFilter).length > 0) {
      const emps = await Employee.find(employeeFilter).select("_id");
      employeeIds = emps.map(e => e._id);
    }

    const filter = {
      ...(employeeIds && { employee: { $in: employeeIds } }),
      ...(status    && { status }),
      ...(leaveType && { leaveType }),
    };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Leave.countDocuments(filter);

    const leaves = await Leave.find(filter)
      .populate({
        path: "employee",
        select: "firstName lastName employeeId department",
        populate: { path: "department", select: "name" },
      })
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, "Leave applications", {
      leaves,
      pagination: {
        total, page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    return serverError(res, "Failed to fetch leaves");
  }
};

// ── GET /api/leave/pending ────────────────────────────────
export const getPendingLeaves = async (req, res) => {
  try {
    let employeeFilter = {};

    if (req.user.role === "manager") {
      const mgr = await Employee.findOne({ user: req.user.id });
      if (mgr?.department) employeeFilter.department = mgr.department;
    }

    let employeeIds;
    if (Object.keys(employeeFilter).length > 0) {
      const emps = await Employee.find(employeeFilter).select("_id");
      employeeIds = emps.map(e => e._id);
    }

    const filter = {
      status: "pending",
      ...(employeeIds && { employee: { $in: employeeIds } }),
    };

    const leaves = await Leave.find(filter)
      .populate({
        path: "employee",
        select: "firstName lastName employeeId department profilePicture",
        populate: { path: "department", select: "name" },
      })
      .sort({ createdAt: 1 });

    return successResponse(res, 200, "Pending leave applications", {
      leaves,
      count: leaves.length,
    });
  } catch (error) {
    return serverError(res, "Failed to fetch pending leaves");
  }
};

// ── PUT /api/leave/:id/approve ────────────────────────────
export const approveLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate("employee");

    if (!leave) return notFound(res, "Leave application not found");
    if (leave.status !== "pending") {
      return badRequest(res, `Cannot approve a leave that is already ${leave.status}`);
    }

    // Deduct balance
    const year    = new Date(leave.startDate).getFullYear();
    const balance = await getOrCreateBalance(leave.employee._id, year);
    balance.deductLeave(leave.leaveType, leave.totalDays);
    await balance.save();

    // Update leave
    leave.status      = "approved";
    leave.approvedBy  = req.user.id;
    leave.approvedAt  = new Date();
    leave.balanceDeducted = true;
    await leave.save();

    // Mark attendance as on_leave for those days
    const current = new Date(leave.startDate);
    const end     = new Date(leave.endDate);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        await Attendance.findOneAndUpdate(
          { employee: leave.employee._id, date: new Date(current.setHours(0,0,0,0)) },
          { status: "on_leave", markedBy: req.user.id },
          { upsert: true, new: true }
        );
      }
      current.setDate(current.getDate() + 1);
    }

    // ── Notify employee: leave approved ──────────────────
    if (leave.employee?.user) {
      await createNotification({
        recipient: leave.employee.user,
        type:      "leave_approved",
        title:     "Leave Approved ✓",
        message:   `Your ${leave.leaveType} leave request for ${leave.totalDays} day(s) has been approved.`,
        link:      `/employee/leave`,
        meta:      { leaveId: leave._id },
      });
    }

    await leave.populate("approvedBy", "name email");
    await auditLog(req, { action: "LEAVE_APPROVED", category: "leave", targetEmployee: leave.employee._id, details: { leaveType: leave.leaveType, totalDays: leave.totalDays } });
    return successResponse(res, 200, "Leave approved successfully", { leave });
  } catch (error) {
    console.error("Approve Leave Error:", error);
    if (error.message.includes("Insufficient")) return badRequest(res, error.message);
    return serverError(res, "Failed to approve leave");
  }
};

// ── PUT /api/leave/:id/reject ─────────────────────────────
export const rejectLeave = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) return badRequest(res, "Rejection reason is required");

    const leave = await Leave.findById(req.params.id).populate("employee");
    if (!leave) return notFound(res, "Leave application not found");
    if (leave.status !== "pending") {
      return badRequest(res, `Cannot reject a leave that is already ${leave.status}`);
    }

    leave.status          = "rejected";
    leave.approvedBy      = req.user.id;
    leave.approvedAt      = new Date();
    leave.rejectionReason = rejectionReason;
    await leave.save();

    // ── Notify employee: leave rejected ──────────────────
    if (leave.employee?.user) {
      await createNotification({
        recipient: leave.employee.user,
        type:      "leave_rejected",
        title:     "Leave Rejected",
        message:   `Your ${leave.leaveType} leave request has been rejected. Reason: ${rejectionReason}`,
        link:      `/employee/leave`,
        meta:      { leaveId: leave._id },
      });
    }

    await leave.populate("approvedBy", "name email");
    await auditLog(req, { action: "LEAVE_REJECTED", category: "leave", targetEmployee: leave.employee._id, details: { leaveType: leave.leaveType, rejectionReason } });
    return successResponse(res, 200, "Leave rejected", { leave });
  } catch (error) {
    return serverError(res, "Failed to reject leave");
  }
};

// ── PUT /api/leave/:id/cancel ─────────────────────────────
export const cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate("employee");

    if (!leave) return notFound(res, "Leave application not found");

    const employee = await Employee.findOne({ user: req.user.id });
    if (
      req.user.role === "employee" &&
      leave.employee._id.toString() !== employee?._id.toString()
    ) {
      return forbidden(res, "You can only cancel your own leave");
    }

    if (!["pending", "approved"].includes(leave.status)) {
      return badRequest(res, "This leave cannot be cancelled");
    }

    if (leave.status === "approved" && leave.balanceDeducted) {
      const year    = new Date(leave.startDate).getFullYear();
      const balance = await getOrCreateBalance(leave.employee._id, year);
      balance.restoreLeave(leave.leaveType, leave.totalDays);
      await balance.save();

      await Attendance.updateMany(
        {
          employee: leave.employee._id,
          date: { $gte: leave.startDate, $lte: leave.endDate },
          status: "on_leave",
        },
        { status: "absent" }
      );
    }

    leave.status = "cancelled";
    await leave.save();

    await auditLog(req, { action: "LEAVE_CANCELLED", category: "leave", targetEmployee: leave.employee._id, details: { leaveType: leave.leaveType, totalDays: leave.totalDays } });
    return successResponse(res, 200, "Leave cancelled successfully", { leave });
  } catch (error) {
    return serverError(res, "Failed to cancel leave");
  }
};

// ── GET /api/leave/employee/:id ───────────────────────────
export const getEmployeeLeaves = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return notFound(res, "Employee not found");

    const year    = parseInt(req.query.year) || new Date().getFullYear();
    const leaves  = await Leave.find({ employee: employee._id })
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 });

    const balance = await getOrCreateBalance(employee._id, year);

    return successResponse(res, 200, "Employee leaves", { leaves, balance, employee });
  } catch (error) {
    return serverError(res, "Failed to fetch employee leaves");
  }
};