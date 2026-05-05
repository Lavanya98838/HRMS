import Notification from "../models/Notification.model.js";
import { successResponse, serverError, notFound } from "../utils/response.js";

// ── Utility: create a notification (called from other controllers) ──
export const createNotification = async ({ recipient, type, title, message, link, meta }) => {
  try {
    await Notification.create({ recipient, type, title, message, link, meta });
  } catch (err) {
    console.error("Notification creation failed:", err.message);
  }
};

// ── GET /api/notifications ────────────────────────────────
// Admin/HR see ALL notifications; others see only their own
export const getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, unreadOnly } = req.query;

    const isAdminOrHR = ["admin", "hr"].includes(req.user.role);

    // Admin and HR see all notifications in the system
    const filter = isAdminOrHR ? {} : { recipient: req.user.id };
    if (unreadOnly === "true") filter.isRead = false;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Notification.countDocuments(filter);

    // Unread count always scoped to own notifications
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false,
    });

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("recipient", "name email role");

    return successResponse(res, 200, "Notifications fetched", {
      notifications,
      unreadCount,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    return serverError(res, "Failed to fetch notifications");
  }
};

// ── GET /api/notifications/unread-count ──────────────────
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false,
    });
    return successResponse(res, 200, "Unread count", { count });
  } catch (error) {
    return serverError(res, "Failed to fetch unread count");
  }
};

// ── PUT /api/notifications/:id/read ──────────────────────
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return notFound(res, "Notification not found");
    return successResponse(res, 200, "Marked as read", { notification });
  } catch (error) {
    return serverError(res, "Failed to mark as read");
  }
};

// ── PUT /api/notifications/mark-all-read ─────────────────
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true }
    );
    return successResponse(res, 200, "All notifications marked as read");
  } catch (error) {
    return serverError(res, "Failed to mark all as read");
  }
};

// ── DELETE /api/notifications/:id ────────────────────────
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id,
    });
    if (!notification) return notFound(res, "Notification not found");
    return successResponse(res, 200, "Notification deleted");
  } catch (error) {
    return serverError(res, "Failed to delete notification");
  }
};

// ── DELETE /api/notifications/clear-all ──────────────────
export const clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });
    return successResponse(res, 200, "All notifications cleared");
  } catch (error) {
    return serverError(res, "Failed to clear notifications");
  }
};