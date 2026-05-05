import Attendance from "../models/Attendance.model.js";
import Employee   from "../models/Employee.model.js";
import {
  successResponse, badRequest, notFound,
  forbidden, serverError,
} from "../utils/response.js";

// ── Office hours config ───────────────────────────────────
const OFFICE_START = { hour: 11, minute: 0 };  // 11:00 AM
const OFFICE_END   = { hour: 18, minute: 0 };  // 6:00 PM

const getDateOnly = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isLateCheckIn = (checkInTime) => {
  const limit = new Date(checkInTime);
  limit.setHours(OFFICE_START.hour, OFFICE_START.minute + 15, 0, 0); // 15 min grace
  return new Date(checkInTime) > limit;
};

const getLateMinutes = (checkInTime) => {
  const limit = new Date(checkInTime);
  limit.setHours(OFFICE_START.hour, OFFICE_START.minute, 0, 0);
  const diff = new Date(checkInTime) - limit;
  return diff > 0 ? Math.floor(diff / 60000) : 0;
};

// ── GET /api/attendance/today ─────────────────────────────
export const getTodayAttendance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });

    // No employee profile (admin/hr without profile) — return empty
    if (!employee) {
      return successResponse(res, 200, "Today's attendance", {
        attendance: null,
        noProfile: true,
        officeStart: `${OFFICE_START.hour}:${String(OFFICE_START.minute).padStart(2, "0")} AM`,
        officeEnd:   `${OFFICE_END.hour - 12}:${String(OFFICE_END.minute).padStart(2, "0")} PM`,
        serverTime:  new Date(),
      });
    }

    const today = getDateOnly();
    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: today,
    });

    return successResponse(res, 200, "Today's attendance", {
      attendance,
      officeStart: `${OFFICE_START.hour}:${String(OFFICE_START.minute).padStart(2, "0")} AM`,
      officeEnd:   `${OFFICE_END.hour - 12}:${String(OFFICE_END.minute).padStart(2, "0")} PM`,
      serverTime:  new Date(),
    });
  } catch (error) {
    return serverError(res, "Failed to get today's attendance");
  }
};

// ── POST /api/attendance/checkin ──────────────────────────
export const checkIn = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return badRequest(
        res,
        "No employee profile found for your account. Please ask Admin/HR to create your employee profile first."
      );
    }

    const today = getDateOnly();
    const now   = new Date();

    // Check if already checked in today
    const existing = await Attendance.findOne({
      employee: employee._id,
      date: today,
    });

    if (existing?.checkIn?.time) {
      return badRequest(res, "You have already checked in today");
    }

    const late        = isLateCheckIn(now);
    const lateMinutes = getLateMinutes(now);

    const attendance = existing
      ? await Attendance.findByIdAndUpdate(
          existing._id,
          {
            checkIn:       { time: now, note: req.body.note || null },
            status:        late ? "late" : "present",
            isLate:        late,
            lateByMinutes: lateMinutes,
            markedBy:      req.user.id,
          },
          { new: true }
        )
      : await Attendance.create({
          employee:      employee._id,
          date:          today,
          checkIn:       { time: now, note: req.body.note || null },
          status:        late ? "late" : "present",
          isLate:        late,
          lateByMinutes: lateMinutes,
          markedBy:      req.user.id,
        });

    return successResponse(res, 200, "Checked in successfully", {
      attendance,
      message: late
        ? `You are ${lateMinutes} minute(s) late today`
        : "On time! Have a great day 🎉",
    });
  } catch (error) {
    console.error("CheckIn Error:", error);
    return serverError(res, "Check-in failed");
  }
};

// ── POST /api/attendance/checkout ─────────────────────────
export const checkOut = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return badRequest(res, "No employee profile found for your account.");
    }

    const today = getDateOnly();
    const now   = new Date();

    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: today,
    });

    if (!attendance?.checkIn?.time) {
      return badRequest(res, "You have not checked in today");
    }

    if (attendance.checkOut?.time) {
      return badRequest(res, "You have already checked out today");
    }

    attendance.checkOut = { time: now, note: req.body.note || null };
    await attendance.save(); // pre-save hook calculates workingHours

    return successResponse(res, 200, "Checked out successfully", {
      attendance,
      workingHours: attendance.workingHours,
      message: `Total working hours today: ${attendance.workingHours} hrs`,
    });
  } catch (error) {
    console.error("CheckOut Error:", error);
    return serverError(res, "Check-out failed");
  }
};

// ── GET /api/attendance/my ────────────────────────────────
export const getMyAttendance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });

    // No employee profile — return empty records
    if (!employee) {
      return successResponse(res, 200, "Attendance records", {
        records: [],
        summary: {
          present: 0, absent: 0, late: 0,
          halfDay: 0, onLeave: 0, totalWorkingHours: "0.00",
        },
      });
    }

    const {
      month = new Date().getMonth() + 1,
      year  = new Date().getFullYear(),
      page  = 1,
      limit = 31,
    } = req.query;

    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0, 23, 59, 59);

    const records = await Attendance.find({
      employee: employee._id,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });

    // Summary stats
    const summary = {
      present:  records.filter(r => r.status === "present").length,
      absent:   records.filter(r => r.status === "absent").length,
      late:     records.filter(r => r.status === "late").length,
      halfDay:  records.filter(r => r.status === "half_day").length,
      onLeave:  records.filter(r => r.status === "on_leave").length,
      totalWorkingHours: records.reduce((s, r) => s + (r.workingHours || 0), 0).toFixed(2),
    };

    return successResponse(res, 200, "Attendance records", { records, summary });
  } catch (error) {
    return serverError(res, "Failed to fetch attendance");
  }
};

// ── GET /api/attendance ───────────────────────────────────
// Admin/HR/Manager: get all or filtered attendance
export const getAllAttendance = async (req, res) => {
  try {
    const {
      employeeId, department,
      month = new Date().getMonth() + 1,
      year  = new Date().getFullYear(),
      status, page = 1, limit = 20,
    } = req.query;

    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0, 23, 59, 59);

    let employeeFilter = {};

    // Manager sees only their direct reports
    if (req.user.role === "manager") {
      const mgr = await Employee.findOne({ user: req.user.id });
      if (mgr) employeeFilter.manager = mgr._id;
    }

    // Department filter (all roles)
    if (department) employeeFilter.department = department;

    let employeeIds;
    if (employeeId) {
      // Specific employee lookup
      const emp = await Employee.findOne({ employeeId });
      employeeIds = emp ? [emp._id] : [];
    } else if (req.user.role === "manager" || department) {
      // Manager or dept filter — scope to filtered employees
      const emps = await Employee.find(employeeFilter).select("_id");
      employeeIds = emps.map(e => e._id);
    }
    // Admin/HR with no specific filter: employeeIds stays undefined → fetch ALL

    const filter = {
      date: { $gte: startDate, $lte: endDate },
      ...(employeeIds && { employee: { $in: employeeIds } }),
      ...(status && { status }),
    };

    const skip   = (parseInt(page) - 1) * parseInt(limit);
    const total  = await Attendance.countDocuments(filter);
    const records = await Attendance.find(filter)
      .populate({
        path: "employee",
        select: "firstName lastName employeeId department",
        populate: { path: "department", select: "name" },
      })
      .sort({ date: -1, "employee.firstName": 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Overall summary
    const allRecords = await Attendance.find(filter);
    const summary = {
      present: allRecords.filter(r => r.status === "present").length,
      absent:  allRecords.filter(r => r.status === "absent").length,
      late:    allRecords.filter(r => r.status === "late").length,
      halfDay: allRecords.filter(r => r.status === "half_day").length,
      onLeave: allRecords.filter(r => r.status === "on_leave").length,
    };

    return successResponse(res, 200, "Attendance records", {
      records, summary,
      pagination: {
        total, page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get All Attendance Error:", error);
    return serverError(res, "Failed to fetch attendance");
  }
};

// ── GET /api/attendance/employee/:id ─────────────────────
export const getEmployeeAttendance = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return notFound(res, "Employee not found");

    const {
      month = new Date().getMonth() + 1,
      year  = new Date().getFullYear(),
    } = req.query;

    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0, 23, 59, 59);

    const records = await Attendance.find({
      employee: employee._id,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    const summary = {
      present: records.filter(r => r.status === "present").length,
      absent:  records.filter(r => r.status === "absent").length,
      late:    records.filter(r => r.status === "late").length,
      halfDay: records.filter(r => r.status === "half_day").length,
      totalWorkingHours: records.reduce((s, r) => s + (r.workingHours || 0), 0).toFixed(2),
    };

    return successResponse(res, 200, "Employee attendance", { records, summary, employee });
  } catch (error) {
    return serverError(res, "Failed to fetch employee attendance");
  }
};

// ── PUT /api/attendance/:id ───────────────────────────────
// Admin/HR manual override
export const updateAttendance = async (req, res) => {
  try {
    const { status, checkIn, checkOut, adminNote } = req.body;

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return notFound(res, "Attendance record not found");

    if (status)   attendance.status    = status;
    if (adminNote) attendance.adminNote = adminNote;
    attendance.isManualEntry = true;
    attendance.markedBy      = req.user.id;

    if (checkIn?.time)  attendance.checkIn  = { time: new Date(checkIn.time),  note: checkIn.note  || null };
    if (checkOut?.time) attendance.checkOut = { time: new Date(checkOut.time), note: checkOut.note || null };

    // Recalculate late status
    if (attendance.checkIn?.time) {
      attendance.isLate        = isLateCheckIn(attendance.checkIn.time);
      attendance.lateByMinutes = getLateMinutes(attendance.checkIn.time);
      if (status !== "absent" && status !== "on_leave" && status !== "holiday") {
        attendance.status = attendance.isLate ? "late" : "present";
      }
    }

    await attendance.save();
    return successResponse(res, 200, "Attendance updated", { attendance });
  } catch (error) {
    return serverError(res, "Failed to update attendance");
  }
};

// ── GET /api/attendance/summary ───────────────────────────
export const getAttendanceSummary = async (req, res) => {
  try {
    const today = getDateOnly();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayStats, monthStats] = await Promise.all([
      Attendance.aggregate([
        { $match: { date: today } },
        { $group: {
          _id: "$status",
          count: { $sum: 1 },
        }},
      ]),
      Attendance.aggregate([
        { $match: { date: { $gte: startOfMonth, $lte: today } } },
        { $group: {
          _id: "$status",
          count: { $sum: 1 },
        }},
      ]),
    ]);

    const toMap = (arr) => arr.reduce((m, i) => { m[i._id] = i.count; return m; }, {});

    return successResponse(res, 200, "Attendance summary", {
      today: toMap(todayStats),
      month: toMap(monthStats),
    });
  } catch (error) {
    return serverError(res, "Failed to get summary");
  }
};