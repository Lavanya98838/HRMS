import PerformanceReview from "../models/PerformanceReview.model.js";
import Employee          from "../models/Employee.model.js";
import { createNotification } from "./notification.controller.js";
import {
  successResponse, badRequest, notFound,
  forbidden, serverError,
} from "../utils/response.js";

// ── POST /api/performance ─────────────────────────────────
export const createReview = async (req, res) => {
  try {
    const {
      employeeId, period, month, quarter, year,
      ratings, comments, strengths, improvements,
    } = req.body;

    if (!employeeId || !year || !ratings) {
      return badRequest(res, "Employee, year, and ratings are required");
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return notFound(res, "Employee not found");

    // Check duplicate for same period
    const dupFilter = { employee: employeeId, year, period };
    if (period === "quarterly" && quarter) dupFilter.quarter = quarter;
    if (period === "monthly"   && month)   dupFilter.month   = month;

    const existing = await PerformanceReview.findOne(dupFilter);
    if (existing) {
      return badRequest(res, `A ${period} review already exists for this employee for this period`);
    }

    const review = await PerformanceReview.create({
      employee:    employeeId,
      reviewer:    req.user.id,
      period, month, quarter, year,
      ratings, comments, strengths, improvements,
      status: "submitted",
    });

    await review.populate([
      { path: "employee", select: "firstName lastName employeeId department" },
      { path: "reviewer", select: "name email" },
    ]);

    // ── Notify employee ───────────────────────────────────
    if (employee.user) {
      await createNotification({
        recipient: employee.user,
        type:      "profile_updated",
        title:     "Performance Review Submitted",
        message:   `Your ${period} performance review for ${year} has been submitted. Overall rating: ${review.overallRating}/5.`,
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
// HR/Admin: all reviews
export const getAllReviews = async (req, res) => {
  try {
    const { year, quarter, period, department, page = 1, limit = 20 } = req.query;

    let empFilter = {};
    if (department) empFilter.department = department;

    let employeeIds;
    if (Object.keys(empFilter).length > 0) {
      const emps = await Employee.find(empFilter).select("_id");
      employeeIds = emps.map(e => e._id);
    }

    const filter = {
      ...(employeeIds && { employee: { $in: employeeIds } }),
      ...(year    && { year:    parseInt(year)    }),
      ...(quarter && { quarter: parseInt(quarter) }),
      ...(period  && { period }),
    };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await PerformanceReview.countDocuments(filter);

    const reviews = await PerformanceReview.find(filter)
      .populate({
        path: "employee",
        select: "firstName lastName employeeId department",
        populate: { path: "department", select: "name" },
      })
      .populate("reviewer", "name")
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
export const getMyReviews = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) return successResponse(res, 200, "My reviews", { reviews: [] });

    const { year } = req.query;
    const filter = { employee: employee._id };
    if (year) filter.year = parseInt(year);

    const reviews = await PerformanceReview.find(filter)
      .populate("reviewer", "name")
      .sort({ year: -1, quarter: -1, month: -1 });

    return successResponse(res, 200, "My reviews", { reviews });
  } catch (error) {
    return serverError(res, "Failed to fetch reviews");
  }
};

// ── GET /api/performance/employee/:employeeId ─────────────
export const getEmployeeReviews = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return notFound(res, "Employee not found");

    if (req.user.role === "employee") {
      const self = await Employee.findOne({ user: req.user.id });
      if (!self || self._id.toString() !== employee._id.toString()) {
        return forbidden(res, "Access denied");
      }
    }

    const reviews = await PerformanceReview.find({ employee: employee._id })
      .populate("reviewer", "name")
      .sort({ year: -1, quarter: -1 });

    return successResponse(res, 200, "Employee reviews", { reviews, employee });
  } catch (error) {
    return serverError(res, "Failed to fetch reviews");
  }
};

// ── PUT /api/performance/:id ──────────────────────────────
export const updateReview = async (req, res) => {
  try {
    const review = await PerformanceReview.findById(req.params.id);
    if (!review) return notFound(res, "Review not found");

    const { ratings, comments, strengths, improvements, status } = req.body;

    if (ratings)      review.ratings      = { ...review.ratings, ...ratings };
    if (comments !== undefined)    review.comments    = comments;
    if (strengths !== undefined)   review.strengths   = strengths;
    if (improvements !== undefined) review.improvements = improvements;
    if (status)       review.status       = status;
    if (status === "acknowledged") review.acknowledgedAt = new Date();

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