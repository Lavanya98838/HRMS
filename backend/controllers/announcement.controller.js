import Announcement from "../models/Announcement.model.js";
import Employee     from "../models/Employee.model.js";
import {
  successResponse, badRequest, notFound,
  forbidden, serverError,
} from "../utils/response.js";

// ── POST /api/announcements ───────────────────────────────
export const createAnnouncement = async (req, res) => {
  try {
    const {
      title, content, targetType, targetDepartments,
      targetRoles, priority, isPinned, expiresAt,
    } = req.body;

    if (!title || !content) {
      return badRequest(res, "Title and content are required");
    }

    const announcement = await Announcement.create({
      title, content,
      author:            req.user.id,
      targetType:        targetType        || "all",
      targetDepartments: targetDepartments || [],
      targetRoles:       targetRoles       || [],
      priority:          priority          || "normal",
      isPinned:          isPinned          || false,
      expiresAt:         expiresAt         || null,
    });

    await announcement.populate("author", "name role");

    return successResponse(res, 201, "Announcement created", { announcement });
  } catch (error) {
    return serverError(res, "Failed to create announcement");
  }
};

// ── GET /api/announcements ────────────────────────────────
// All users see announcements targeted to them
export const getAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Build visibility filter — all roles see announcements targeted to them
    const employee = await Employee.findOne({ user: req.user.id });
    const userDept = employee?.department?.toString();

    // Everyone sees: targetType=all, or their role, or their department
    // AND not expired — isActive removed from filter to avoid missing records
    const now = new Date();
    const visibilityFilter = {
      $and: [
        // Not explicitly deactivated
        { $or: [{ isActive: { $exists: false } }, { isActive: true }] },
        // Targeted to this user
        {
          $or: [
            { targetType: "all" },
            { targetType: "role", targetRoles: { $in: [req.user.role] } },
            ...(userDept ? [{ targetType: "department", targetDepartments: { $in: [userDept] } }] : []),
          ],
        },
        // Not expired
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: now } },
          ],
        },
      ],
    };

    // Admin/HR see everything; others use visibility filter
    const filter = ["admin", "hr"].includes(req.user.role)
      ? { $or: [{ isActive: { $exists: false } }, { isActive: true }] }
      : visibilityFilter;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Announcement.countDocuments(filter);

    const announcements = await Announcement.find(filter)
      .populate("author", "name role")
      .populate("targetDepartments", "name")
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add isRead flag for current user
    const withReadStatus = announcements.map(a => ({
      ...a.toObject(),
      isRead: a.readBy.includes(req.user.id),
    }));

    const unreadCount = announcements.filter(a => !a.readBy.includes(req.user.id)).length;

    return successResponse(res, 200, "Announcements", {
      announcements: withReadStatus,
      unreadCount,
      pagination: {
        total, page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    return serverError(res, "Failed to fetch announcements");
  }
};

// ── PUT /api/announcements/:id/read ──────────────────────
export const markAnnouncementRead = async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { readBy: req.user.id } }
    );
    return successResponse(res, 200, "Marked as read");
  } catch (error) {
    return serverError(res, "Failed to mark as read");
  }
};

// ── PUT /api/announcements/:id ────────────────────────────
export const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return notFound(res, "Announcement not found");

    // Only author or admin can update
    if (
      announcement.author.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return forbidden(res, "Access denied");
    }

    const { title, content, priority, isPinned, isActive, expiresAt,
            targetType, targetDepartments, targetRoles } = req.body;

    if (title !== undefined)             announcement.title             = title;
    if (content !== undefined)           announcement.content           = content;
    if (priority !== undefined)          announcement.priority          = priority;
    if (isPinned !== undefined)          announcement.isPinned          = isPinned;
    if (isActive !== undefined)          announcement.isActive          = isActive;
    if (expiresAt !== undefined)         announcement.expiresAt         = expiresAt;
    if (targetType !== undefined)        announcement.targetType        = targetType;
    if (targetDepartments !== undefined) announcement.targetDepartments = targetDepartments;
    if (targetRoles !== undefined)       announcement.targetRoles       = targetRoles;

    await announcement.save();
    await announcement.populate("author", "name role");

    return successResponse(res, 200, "Announcement updated", { announcement });
  } catch (error) {
    return serverError(res, "Failed to update announcement");
  }
};

// ── DELETE /api/announcements/:id ────────────────────────
export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return notFound(res, "Announcement not found");

    if (
      announcement.author.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return forbidden(res, "Access denied");
    }

    await announcement.deleteOne();
    return successResponse(res, 200, "Announcement deleted");
  } catch (error) {
    return serverError(res, "Failed to delete announcement");
  }
};