import express from "express";
import {
  checkIn, checkOut,
  getTodayAttendance, getMyAttendance,
  getAllAttendance, getEmployeeAttendance,
  updateAttendance, getAttendanceSummary,
} from "../controllers/attendance.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

// ── Employee self-service ─────────────────────────────────
router.post("/checkin",             checkIn);
router.post("/checkout",            checkOut);
router.get("/today",                getTodayAttendance);
router.get("/my",                   getMyAttendance);

// ── Admin/HR/Manager ──────────────────────────────────────
router.get("/summary",              roleGuard("admin", "hr", "manager"), getAttendanceSummary);
router.get("/",                     roleGuard("admin", "hr", "manager"), getAllAttendance);
router.get("/employee/:id",         roleGuard("admin", "hr", "manager"), getEmployeeAttendance);
router.put("/:id",                  roleGuard("admin", "hr"),            updateAttendance);

export default router;
