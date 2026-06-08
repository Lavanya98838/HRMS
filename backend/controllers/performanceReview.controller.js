import PerformanceReview from "../models/PerformanceReview.model.js";
import Employee          from "../models/Employee.model.js";
import { createNotification } from "./notification.controller.js";
import {
  successResponse, badRequest, notFound,
  forbidden, serverError,
} from "../utils/response.js";

// ── helpers ───────────────────────────────────────────────

// Get the employee record for the logged-in user
const getSelfEmployee = (userId) => Employee.findOne({ user: userId });

// Get all employees whose reportingTo matches the manager's Employee _id
// Step 1: find the manager's own Employee record via their User id
// Step 2: find all employees who report to that Employee _id
const getTeamEmployeeIds = async (managerUserId) => {
  const managerEmployee = await Employee.findOne({ user: managerUserId }).select("_id");
  if (!managerEmployee) return [];
  const employees = await Employee.find({
    reportingTo: managerEmployee._id,
    isActive: true,
  }).select("_id");
  return employees.map(e => e._id);
};

// ── POST /api/performance ─────────────────────────────────
// HR: creates review shell → status = pending_manager
// Admin: creates and submits immediately (with ratings) → status = submitted
// Manager: NOT allowed to create (they fill, not create)
export const createReview = async (req, res) => {
  try {
    const { role } = req.user;

    if (role === "manager") {
      return forbidden(res, "Managers cannot create reviews. HR initiates reviews.");
    }

    const {
      employeeId, quarter, year,
      ratings, comments, strengths, improvements,
    } = req.body;

    if (!employeeId || !year || !quarter) {
      return badRequest(res, "Employee, year, and quarter are required");
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return notFound(res, "Employee not found");

    // Duplicate check
    const existing = await PerformanceReview.findOne({
      employee: employeeId, year, quarter, period: "quarterly",
    });
    if (existing) {
      return badRequest(res, `A Q${quarter} ${year} review already exists for this employee`);
    }

    let status = "pending_manager";
    let reviewer = null;

    // Admin submits directly with ratings (no manager step needed)
    if (role === "admin" && ratings) {
      status   = "submitted";
      reviewer = req.user.id;
    }

    const review = await PerformanceReview.create({
      employee:        employeeId,
      createdBy:       req.user.id,
      reviewer,
      reviewerRole:    role,
      period:          "quarterly",
      quarter:         Number(quarter),
      year:            Number(year),
      ratings:         role === "admin" ? ratings : undefined,
      comments:        comments  || "",
      strengths:       strengths || "",
      improvements:    improvements || "",
      status,
      submittedAt:     status === "submitted" ? new Date() : undefined,
    });

    await review.populate([
      { path: "employee",        select: "firstName lastName employeeId department" },
      { path: "assignedManager", select: "firstName lastName" },
      { path: "createdBy",       select: "name email" },
      { path: "reviewer",        select: "name email" },
    ]);

    const empName     = `${employee.firstName} ${employee.lastName}`;
    const managerName = "the assigned manager";

    // ── Notify HR — confirmation with both names ──────────
    await createNotification({
      recipient: req.user.id,
      type:      "task_assigned",
      title:     "Review Initiated",
      message:   `Performance review for ${empName} working under ${managerName} has been initiated for Q${quarter} ${year}.`,
      link:      `/hr/performance`,
      meta:      { reviewId: review._id },
    });

    // ── Notify employee only when admin submits directly ──
    if (status === "submitted" && employee.user) {
      await createNotification({
        recipient: employee.user,
        type:      "profile_updated",
        title:     "Performance Review Submitted",
        message:   `Your Q${quarter} ${year} performance review has been submitted. Overall rating: ${review.overallRating}/5.`,
        link:      `/employee/performance`,
        meta:      { reviewId: review._id },
      });
    }

    return successResponse(res, 201, "Performance review created", { review });
  } catch (error) {
    console.error("Create Review Error:", error);
    return serverError(res, "Failed to create review");
  }
};

// ── GET /api/performance ──────────────────────────────────
// Admin/HR: all reviews
// Manager: only their team's reviews
export const getAllReviews = async (req, res) => {
  try {
    const { role } = req.user;
    const { year, quarter, status, department, page = 1, limit = 20 } = req.query;

    let employeeIds;

    if (role === "manager") {
      // Manager sees only their direct reports
      employeeIds = await getTeamEmployeeIds(req.user.id);
      if (employeeIds.length === 0) {
        return successResponse(res, 200, "Performance reviews", {
          reviews: [],
          pagination: { total: 0, page: 1, limit: parseInt(limit), totalPages: 0 },
        });
      }
    } else if (department) {
      // Admin/HR can filter by department
      const emps = await Employee.find({ department, isActive: true }).select("_id");
      employeeIds = emps.map(e => e._id);
    }

    const filter = {
      ...(employeeIds                && { employee: { $in: employeeIds } }),
      ...(year                       && { year:    parseInt(year)    }),
      ...(quarter                    && { quarter: parseInt(quarter) }),
      ...(status                     && { status }),
    };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await PerformanceReview.countDocuments(filter);

    const reviews = await PerformanceReview.find(filter)
      .populate({
        path: "employee",
        select: "firstName lastName employeeId department",
        populate: { path: "department", select: "name" },
      })
      .populate("createdBy", "name")
      .populate("reviewer",  "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, "Performance reviews", {
      reviews,
      pagination: {
        total, page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    return serverError(res, "Failed to fetch reviews");
  }
};

// ── GET /api/performance/my ───────────────────────────────
// Employee sees their own submitted/acknowledged reviews only
export const getMyReviews = async (req, res) => {
  try {
    const employee = await getSelfEmployee(req.user.id);
    if (!employee) return successResponse(res, 200, "My reviews", { reviews: [] });

    const { year } = req.query;
    const filter = {
      employee: employee._id,
      status:   { $in: ["submitted", "acknowledged"] }, // employee can't see pending_manager
    };
    if (year) filter.year = parseInt(year);

    const reviews = await PerformanceReview.find(filter)
      .populate("reviewer",  "name")
      .populate("createdBy", "name")
      .sort({ year: -1, quarter: -1 });

    return successResponse(res, 200, "My reviews", { reviews });
  } catch (error) {
    return serverError(res, "Failed to fetch reviews");
  }
};

// ── GET /api/performance/pending ─────────────────────────
// Manager: list reviews where assignedManager matches their Employee _id
// HR/Admin: all pending reviews
export const getPendingReviews = async (req, res) => {
  try {
    const { role } = req.user;
    if (!["manager", "admin", "hr"].includes(role)) {
      return forbidden(res, "Access denied");
    }

    let filter = { status: "pending_manager" };

    if (role === "manager") {
      // Find the manager's own Employee record
      const managerEmployee = await Employee.findOne({ user: req.user.id }).select("_id");
      if (!managerEmployee) {
        return successResponse(res, 200, "Pending reviews", { reviews: [] });
      }
      // Match reviews where HR assigned this manager
      filter.assignedManager = managerEmployee._id;
    }

    const reviews = await PerformanceReview.find(filter)
      .populate({
        path: "employee",
        select: "firstName lastName employeeId department",
        populate: { path: "department", select: "name" },
      })
      .populate("assignedManager", "firstName lastName")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    return successResponse(res, 200, "Pending reviews", { reviews });
  } catch (error) {
    return serverError(res, "Failed to fetch pending reviews");
  }
};

// ── GET /api/performance/employee/:employeeId ─────────────
export const getEmployeeReviews = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return notFound(res, "Employee not found");

    // Employee can only view their own
    if (req.user.role === "employee") {
      const self = await getSelfEmployee(req.user.id);
      if (!self || self._id.toString() !== employee._id.toString()) {
        return forbidden(res, "Access denied");
      }
    }

    // Manager can only view their team
    if (req.user.role === "manager") {
      const teamIds = await getTeamEmployeeIds(req.user.id);
      const inTeam  = teamIds.some(id => id.toString() === employee._id.toString());
      if (!inTeam) return forbidden(res, "This employee is not in your team");
    }

    const reviews = await PerformanceReview.find({ employee: employee._id })
      .populate("reviewer",  "name")
      .populate("createdBy", "name")
      .sort({ year: -1, quarter: -1 });

    return successResponse(res, 200, "Employee reviews", { reviews, employee });
  } catch (error) {
    return serverError(res, "Failed to fetch reviews");
  }
};

// ── PUT /api/performance/:id/fill ────────────────────────
// Manager fills in the ratings → status: submitted
// Admin can also use this to fill/edit
export const fillReview = async (req, res) => {
  try {
    const { role } = req.user;

    if (!["manager", "admin"].includes(role)) {
      return forbidden(res, "Only managers or admins can fill reviews");
    }

    const review = await PerformanceReview.findById(req.params.id)
      .populate("employee");
    if (!review) return notFound(res, "Review not found");

    if (review.status !== "pending_manager" && role === "manager") {
      return badRequest(res, "This review has already been filled");
    }

    // Any manager can fill any review (single manager setup)
    // Team restriction removed — can be re-enabled later when reportingTo is populated

    const { ratings, comments, strengths, improvements } = req.body;

    if (!ratings || !ratings.workQuality || !ratings.communication ||
        !ratings.punctuality || !ratings.teamwork || !ratings.initiative) {
      return badRequest(res, "All 5 rating categories are required");
    }

    review.ratings      = ratings;
    review.comments     = comments     || review.comments;
    review.strengths    = strengths    || review.strengths;
    review.improvements = improvements || review.improvements;
    review.reviewer     = req.user.id;
    review.reviewerRole = role;
    review.status       = "submitted";
    review.submittedAt  = new Date();

    await review.save();

    // Notify employee their review is ready
    if (review.employee?.user) {
      await createNotification({
        recipient: review.employee.user,
        type:      "profile_updated",
        title:     "Performance Review Ready",
        message:   `Your Q${review.quarter} ${review.year} performance review is now available. Overall rating: ${review.overallRating}/5.`,
        link:      `/employee/performance`,
        meta:      { reviewId: review._id },
      });
    }

    // Notify HR that manager has filled the review
    if (role === "manager" && review.createdBy) {
      await createNotification({
        recipient: review.createdBy,
        type:      "task_completed",
        title:     "Review Filled by Manager",
        message:   `Q${review.quarter} ${review.year} review for ${review.employee?.firstName} ${review.employee?.lastName} has been completed by the manager.`,
        link:      `/hr/performance`,
        meta:      { reviewId: review._id },
      });
    }

    await review.populate([
      { path: "employee",  select: "firstName lastName employeeId department" },
      { path: "createdBy", select: "name" },
      { path: "reviewer",  select: "name" },
    ]);

    return successResponse(res, 200, "Review filled successfully", { review });
  } catch (error) {
    console.error("Fill Review Error:", error);
    return serverError(res, "Failed to fill review");
  }
};

// ── PUT /api/performance/:id/acknowledge ─────────────────
// Employee acknowledges their review
export const acknowledgeReview = async (req, res) => {
  try {
    const review = await PerformanceReview.findById(req.params.id)
      .populate("employee");
    if (!review) return notFound(res, "Review not found");

    if (review.status !== "submitted") {
      return badRequest(res, "Only submitted reviews can be acknowledged");
    }

    // Verify the employee owns this review
    const self = await getSelfEmployee(req.user.id);
    if (!self || self._id.toString() !== review.employee._id.toString()) {
      return forbidden(res, "You can only acknowledge your own reviews");
    }

    review.status         = "acknowledged";
    review.acknowledgedAt = new Date();
    await review.save();

    // Notify reviewer/HR
    if (review.createdBy) {
      await createNotification({
        recipient: review.createdBy,
        type:      "profile_updated",
        title:     "Review Acknowledged",
        message:   `${review.employee?.firstName} ${review.employee?.lastName} has acknowledged their Q${review.quarter} ${review.year} performance review.`,
        link:      `/hr/performance`,
        meta:      { reviewId: review._id },
      });
    }

    return successResponse(res, 200, "Review acknowledged", { review });
  } catch (error) {
    return serverError(res, "Failed to acknowledge review");
  }
};

// ── PUT /api/performance/:id ──────────────────────────────
// Admin/HR: edit review metadata (not ratings — use /fill for that)
export const updateReview = async (req, res) => {
  try {
    const { role } = req.user;
    if (!["admin", "hr"].includes(role)) {
      return forbidden(res, "Only admin or HR can edit review details");
    }

    const review = await PerformanceReview.findById(req.params.id);
    if (!review) return notFound(res, "Review not found");

    const { comments, strengths, improvements, status } = req.body;

    if (comments     !== undefined) review.comments     = comments;
    if (strengths    !== undefined) review.strengths    = strengths;
    if (improvements !== undefined) review.improvements = improvements;
    if (status       !== undefined) review.status       = status;

    await review.save();
    return successResponse(res, 200, "Review updated", { review });
  } catch (error) {
    return serverError(res, "Failed to update review");
  }
};

// ── DELETE /api/performance/:id ───────────────────────────
export const deleteReview = async (req, res) => {
  try {
    const review = await PerformanceReview.findById(req.params.id);
    if (!review) return notFound(res, "Review not found");
    await review.deleteOne();
    return successResponse(res, 200, "Review deleted");
  } catch (error) {
    return serverError(res, "Failed to delete review");
  }
};