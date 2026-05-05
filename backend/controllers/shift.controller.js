import { ShiftType, ShiftAssignment } from "../models/Shift.model.js";
import Employee from "../models/Employee.model.js";
import Role from "../models/Role.model.js";
import {
  successResponse, badRequest, notFound, forbidden, serverError,
} from "../utils/response.js";

// Role hierarchy levels — mirrors verifyToken.js ROLE_HIERARCHY
const ROLE_HIERARCHY = {
  admin:    4,
  hr:       3,
  manager:  2,
  employee: 1,
};

// ── Helper: get Monday of a week ──────────────────────────
const getWeekStart = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust for Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// ══ SHIFT TYPES ═══════════════════════════════════════════

// ── POST /api/shifts/types ────────────────────────────────
export const createShiftType = async (req, res) => {
  try {
    const { name, startTime, endTime, color } = req.body;
    if (!name || !startTime || !endTime) {
      return badRequest(res, "Name, start time, and end time are required");
    }
    const shiftType = await ShiftType.create({ name, startTime, endTime, color });
    return successResponse(res, 201, "Shift type created", { shiftType });
  } catch (error) {
    return serverError(res, "Failed to create shift type");
  }
};

// ── GET /api/shifts/types ─────────────────────────────────
export const getShiftTypes = async (req, res) => {
  try {
    const shiftTypes = await ShiftType.find({ isActive: true }).sort({ startTime: 1 });
    return successResponse(res, 200, "Shift types", { shiftTypes });
  } catch (error) {
    return serverError(res, "Failed to fetch shift types");
  }
};

// ── PUT /api/shifts/types/:id ─────────────────────────────
export const updateShiftType = async (req, res) => {
  try {
    const shiftType = await ShiftType.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!shiftType) return notFound(res, "Shift type not found");
    return successResponse(res, 200, "Shift type updated", { shiftType });
  } catch (error) {
    return serverError(res, "Failed to update shift type");
  }
};

// ── DELETE /api/shifts/types/:id ──────────────────────────
export const deleteShiftType = async (req, res) => {
  try {
    const shiftType = await ShiftType.findByIdAndUpdate(
      req.params.id, { isActive: false }, { new: true }
    );
    if (!shiftType) return notFound(res, "Shift type not found");
    return successResponse(res, 200, "Shift type deactivated");
  } catch (error) {
    return serverError(res, "Failed to delete shift type");
  }
};

// ══ SHIFT ASSIGNMENTS ═════════════════════════════════════

// ── POST /api/shifts/assign ───────────────────────────────
export const assignShift = async (req, res) => {
  try {
    const { employeeId, shiftTypeId, dayOfWeek, weekStart, notes } = req.body;

    if (!employeeId || !shiftTypeId || dayOfWeek === undefined || !weekStart) {
      return badRequest(res, "Employee, shift type, day of week, and week start are required");
    }

    const employee  = await Employee.findById(employeeId).populate("user", "role");
    if (!employee) return notFound(res, "Employee not found");

    // ── Role-level guard: manager cannot assign shifts to equal/higher roles ──
    const assignerLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const targetRole    = employee.user?.role || "employee";
    const targetLevel   = ROLE_HIERARCHY[targetRole] || 0;

    if (assignerLevel <= targetLevel && req.user.role !== "admin") {
      return forbidden(
        res,
        `You cannot assign shifts to a user with an equal or higher role (your role: ${req.user.role}, target role: ${targetRole}).`
      );
    }

    const shiftType = await ShiftType.findById(shiftTypeId);
    if (!shiftType) return notFound(res, "Shift type not found");

    const weekStartDate = getWeekStart(weekStart);

    // Upsert — one shift per employee per day per week
    const assignment = await ShiftAssignment.findOneAndUpdate(
      { employee: employeeId, dayOfWeek, weekStart: weekStartDate },
      {
        shiftType: shiftTypeId,
        notes:     notes || "",
        assignedBy: req.user.id,
      },
      { upsert: true, new: true }
    );

    await assignment.populate([
      { path: "employee", select: "firstName lastName employeeId" },
      { path: "shiftType", select: "name startTime endTime color" },
    ]);

    return successResponse(res, 201, "Shift assigned", { assignment });
  } catch (error) {
    console.error("Assign Shift Error:", error);
    return serverError(res, "Failed to assign shift");
  }
};

// ── GET /api/shifts/week ──────────────────────────────────
// Get all assignments for a given week
export const getWeeklySchedule = async (req, res) => {
  try {
    const { weekStart, department } = req.query;
    if (!weekStart) return badRequest(res, "weekStart is required");

    const weekStartDate = getWeekStart(weekStart);

    // Use $ne: false to include employees where isActive is true or undefined
    let employeeFilter = { isActive: { $ne: false } };
    if (department) employeeFilter.department = department;

    const employees = await Employee.find(employeeFilter)
      .populate("department", "name")
      .select("firstName lastName employeeId department");

    const assignments = await ShiftAssignment.find({ weekStart: weekStartDate })
      .populate("shiftType", "name startTime endTime color");

    // Build a map: employeeId -> { 0: shift, 1: shift, ... }
    const scheduleMap = {};
    for (const a of assignments) {
      const empId = a.employee.toString();
      if (!scheduleMap[empId]) scheduleMap[empId] = {};
      scheduleMap[empId][a.dayOfWeek] = {
        _id:       a._id,
        shiftType: a.shiftType,
        notes:     a.notes,
      };
    }

    const schedule = employees.map(emp => ({
      employee: emp,
      shifts:   scheduleMap[emp._id.toString()] || {},
    }));

    return successResponse(res, 200, "Weekly schedule", {
      schedule,
      weekStart: weekStartDate,
    });
  } catch (error) {
    return serverError(res, "Failed to fetch schedule");
  }
};

// ── GET /api/shifts/my ────────────────────────────────────
export const getMyShifts = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) return successResponse(res, 200, "My shifts", { assignments: [] });

    const { weekStart } = req.query;
    const filter = { employee: employee._id };

    if (weekStart) {
      filter.weekStart = getWeekStart(weekStart);
    } else {
      // Default: current week
      filter.weekStart = getWeekStart(new Date().toISOString());
    }

    const assignments = await ShiftAssignment.find(filter)
      .populate("shiftType", "name startTime endTime color")
      .sort({ dayOfWeek: 1 });

    return successResponse(res, 200, "My shifts", { assignments });
  } catch (error) {
    return serverError(res, "Failed to fetch shifts");
  }
};

// ── DELETE /api/shifts/assign/:id ─────────────────────────
export const removeShiftAssignment = async (req, res) => {
  try {
    const assignment = await ShiftAssignment.findByIdAndDelete(req.params.id);
    if (!assignment) return notFound(res, "Shift assignment not found");
    return successResponse(res, 200, "Shift assignment removed");
  } catch (error) {
    return serverError(res, "Failed to remove shift");
  }
};