import express from "express";
import {
  createAnnouncement, getAnnouncements,
  markAnnouncementRead, updateAnnouncement, deleteAnnouncement,
} from "../controllers/announcement.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

router.get("/",          getAnnouncements);
router.post("/",         roleGuard("admin", "hr"), createAnnouncement);
router.put("/:id/read",  markAnnouncementRead);
router.put("/:id",       roleGuard("admin", "hr"), updateAnnouncement);
router.delete("/:id",    roleGuard("admin", "hr"), deleteAnnouncement);

export default router;