import Goal     from "../models/Goal.model.js";
import Employee  from "../models/Employee.model.js";
import { createNotification } from "./notification.controller.js";
import {
  successResponse, badRequest, notFound,
  forbidden, serverError,
} from "../utils/response.js";

// ── POST /api/goals ───────────────────────────────────────
export const createGoal = async (req, res) => {
  try {
    const {
      employeeId, title, description, category,
      target, priority, dueDate, quarter, year,
    } = req.body;

    if (!employeeId || !title || !year) {
      return badRequest(res, "Employee, title, and year are required");
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return notFound(res, "Employee not found");

    const goal = await Goal.create({
      employee:   employeeId,
      assignedBy: req.user.id,
      title, description, category,
      target, priority, dueDate,
      quarter, year,
      status:   "not_started",
      progress: 0,
    });

    await goal.populate([
      { path: "employee",   select: "firstName lastName employeeId" },
      { path: "assignedBy", select: "name" },
    ]);

    // ── Notify employee ───────────────────────────────────
    if (employee.user) {
      await createNotification({
        recipient: employee.user,
        type:      "profile_updated",
        title:     "New Goal Assigned",
        message:   `A new goal has been assigned to you: "${title}". Due: ${dueDate ? new Date(dueDate).toLocaleDateString("en-IN") : "No deadline"}.`,
        link:      `/employee/goals`,
        meta:      { goalId: goal._id },
      });
    }

    return successResponse(res, 201, "Goal created", { goal });
  } catch (error) {
    console.error("Create Goal Error:", error);
    return serverError(res, "Failed to create goal");
  }
};

// ── GET /api/goals ────────────────────────────────────────
// HR/Admin/Manager: all goals
export const getAllGoals = async (req, res) => {
  try {
    const { year, quarter, status, department, page = 1, limit = 20 } = req.query;

    let empFilter = {};
    if (department) empFilter.department = department;

    // Manager sees only their department
    if (req.user.role === "manager") {
      const mgr = await Employee.findOne({ user: req.user.id });
      if (mgr?.department) empFilter.department = mgr.department;
    }

    let employeeIds;
    if (Object.keys(empFilter).length > 0) {
      const emps = await Employee.find(empFilter).select("_id");
      employeeIds = emps.map(e => e._id);
    }

    const filter = {
      ...(employeeIds && { employee: { $in: employeeIds } }),
      ...(year    && { year:    parseInt(year)    }),
      ...(quarter && { quarter: parseInt(quarter) }),
      ...(status  && { status }),
    };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Goal.countDocuments(filter);

    const goals = await Goal.find(filter)
      .populate({
        path: "employee",
        select: "firstName lastName employeeId department",
        populate: { path: "department", select: "name" },
      })
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, "Goals", {
      goals,
      pagination: {
        total, page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    return serverError(res, "Failed to fetch goals");
  }
};

// ── GET /api/goals/my ─────────────────────────────────────
export const getMyGoals = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) return successResponse(res, 200, "My goals", { goals: [] });

    const { year, status } = req.query;
    const filter = { employee: employee._id };
    if (year)   filter.year   = parseInt(year);
    if (status) filter.status = status;

    const goals = await Goal.find(filter)
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 });

    return successResponse(res, 200, "My goals", { goals });
  } catch (error) {
    return serverError(res, "Failed to fetch goals");
  }
};

// ── GET /api/goals/employee/:employeeId ───────────────────
export const getEmployeeGoals = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return notFound(res, "Employee not found");

    if (req.user.role === "employee") {
      const self = await Employee.findOne({ user: req.user.id });
      if (!self || self._id.toString() !== employee._id.toString()) {
        return forbidden(res, "Access denied");
      }
    }

    const goals = await Goal.find({ employee: employee._id })
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 });

    return successResponse(res, 200, "Employee goals", { goals, employee });
  } catch (error) {
    return serverError(res, "Failed to fetch goals");
  }
};

// ── PUT /api/goals/:id ────────────────────────────────────
export const updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id).populate("employee");
    if (!goal) return notFound(res, "Goal not found");

    const { title, description, target, priority, dueDate,
            status, progress, feedback, category, quarter } = req.body;

    // Employees can only update progress
    if (req.user.role === "employee") {
      const self = await Employee.findOne({ user: req.user.id });
      if (!self || self._id.toString() !== goal.employee._id.toString()) {
        return forbidden(res, "Access denied");
      }
      if (progress !== undefined) goal.progress = progress;
      // Auto-update status based on progress
      if (progress === 100) {
        goal.status      = "completed";
        goal.completedAt = new Date();
      } else if (progress > 0 && goal.status === "not_started") {
        goal.status = "in_progress";
      }
    } else {
      // HR/Admin/Manager can update everything
      if (title !== undefined)       goal.title       = title;
      if (description !== undefined) goal.description = description;
      if (target !== undefined)      goal.target      = target;
      if (priority !== undefined)    goal.priority    = priority;
      if (dueDate !== undefined)     goal.dueDate     = dueDate;
      if (status !== undefined)      goal.status      = status;
      if (progress !== undefined)    goal.progress    = progress;
      if (feedback !== undefined)    goal.feedback    = feedback;
      if (category !== undefined)    goal.category    = category;
      if (quarter !== undefined)     goal.quarter     = quarter;
      if (status === "completed")    goal.completedAt = new Date();
    }

    await goal.save();

    return successResponse(res, 200, "Goal updated", { goal });
  } catch (error) {
    return serverError(res, "Failed to update goal");
  }
};

// ── DELETE /api/goals/:id ─────────────────────────────────
export const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return notFound(res, "Goal not found");
    await goal.deleteOne();
    return successResponse(res, 200, "Goal deleted");
  } catch (error) {
    return serverError(res, "Failed to delete goal");
  }
};