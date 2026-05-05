import express from "express";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../controllers/notification.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

router.get("/",               getMyNotifications);
router.get("/unread-count",   getUnreadCount);
router.put("/mark-all-read",  markAllAsRead);
router.delete("/clear-all",   clearAllNotifications);
router.put("/:id/read",       markAsRead);
router.delete("/:id",         deleteNotification);

export default router;
