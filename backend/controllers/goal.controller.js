import Goal     from "../models/Goal.model.js";
import Employee  from "../models/Employee.model.js";
import User      from "../models/User.model.js";
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
        title:     "New Task Assigned",
        message:   `A new task has been assigned to you: "${title}". Due: ${dueDate ? new Date(dueDate).toLocaleDateString("en-IN") : "No deadline"}.`,
        link:      `/employee/goals`,
        meta:      { goalId: goal._id },
      });
    }

    return successResponse(res, 201, "Task created", { goal });
  } catch (error) {
    console.error("Create Goal Error:", error);
    return serverError(res, "Failed to create task");
  }
};

// ── GET /api/goals ────────────────────────────────────────
export const getAllGoals = async (req, res) => {
  try {
    const { year, quarter, status, department, page = 1, limit = 20 } = req.query;

    let empFilter = {};
    if (department) empFilter.department = department;

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

    return successResponse(res, 200, "Tasks", {
      goals,
      pagination: {
        total, page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    return serverError(res, "Failed to fetch tasks");
  }
};

// ── GET /api/goals/my ─────────────────────────────────────
export const getMyGoals = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) return successResponse(res, 200, "My tasks", { goals: [] });

    const { year, status } = req.query;
    const filter = { employee: employee._id };
    if (year)   filter.year   = parseInt(year);
    if (status) filter.status = status;

    const goals = await Goal.find(filter)
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 });

    return successResponse(res, 200, "My tasks", { goals });
  } catch (error) {
    return serverError(res, "Failed to fetch tasks");
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

    return successResponse(res, 200, "Employee tasks", { goals, employee });
  } catch (error) {
    return serverError(res, "Failed to fetch tasks");
  }
};

// ── PUT /api/goals/:id ────────────────────────────────────
export const updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id)
      .populate("employee")
      .populate("assignedBy", "name");
    if (!goal) return notFound(res, "Task not found");

    // ── LOCK: completed tasks cannot be edited ────────────
    if (goal.status === "completed") {
      return forbidden(res, "This task is completed and locked from further edits.");
    }

    const { title, description, target, priority, dueDate,
            status, progress, feedback, category, quarter } = req.body;

    if (req.user.role === "employee") {
      const self = await Employee.findOne({ user: req.user.id });
      if (!self || self._id.toString() !== goal.employee._id.toString()) {
        return forbidden(res, "Access denied");
      }

      // Employees can only update progress
      if (progress !== undefined) goal.progress = Number(progress);

      if (Number(progress) === 100) {
        goal.status      = "completed";
        goal.completedAt = new Date();

        // ── Notify manager on completion ──────────────────
        try {
          const employee = await Employee.findById(goal.employee._id);
          const empUser  = await User.findById(employee.user);

          // Find manager of this employee's department
          const managers = await Employee.find({ department: employee.department })
            .populate({ path: "user", match: { role: "manager" } });

          for (const mgr of managers) {
            if (mgr.user) {
              await createNotification({
                recipient: mgr.user._id,
                type:      "goal_completed",
                title:     "Task Completed ✅",
                message:   `${empUser?.name || "An employee"} has completed the task: "${goal.title}" successfully.`,
                link:      `/manager/goals`,
                meta:      { goalId: goal._id },
              });
            }
          }

          // Also notify HR and Admin
          const hrAdmins = await User.find({ role: { $in: ["hr", "admin"] } });
          for (const u of hrAdmins) {
            await createNotification({
              recipient: u._id,
              type:      "goal_completed",
              title:     "Task Completed ✅",
              message:   `${empUser?.name || "An employee"} has completed the task: "${goal.title}".`,
              link:      `/hr/goals`,
              meta:      { goalId: goal._id },
            });
          }
        } catch (notifErr) {
          console.warn("Notification error:", notifErr.message);
        }

      } else if (Number(progress) > 0 && goal.status === "not_started") {
        goal.status = "in_progress";
      }

    } else {
      // HR/Admin/Manager can update everything
      if (title !== undefined)       goal.title       = title;
      if (description !== undefined) goal.description = description;
      if (target !== undefined)      goal.target      = target;
      if (priority !== undefined)    goal.priority    = priority;
      if (dueDate !== undefined)     goal.dueDate     = dueDate;
      if (feedback !== undefined)    goal.feedback    = feedback;
      if (category !== undefined)    goal.category    = category;
      if (quarter !== undefined)     goal.quarter     = quarter;

      if (status !== undefined) {
        goal.status = status;
        if (status === "completed") goal.completedAt = new Date();
      }

      if (progress !== undefined) {
        goal.progress = Number(progress);
        if (Number(progress) === 100) {
          goal.status      = "completed";
          goal.completedAt = new Date();
        }
      }
    }

    await goal.save();
    return successResponse(res, 200, "Task updated", { goal });
  } catch (error) {
    console.error("Update Goal Error:", error);
    return serverError(res, "Failed to update task");
  }
};

// ── DELETE /api/goals/:id ─────────────────────────────────
export const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return notFound(res, "Task not found");
    await goal.deleteOne();
    return successResponse(res, 200, "Task deleted");
  } catch (error) {
    return serverError(res, "Failed to delete task");
  }
};