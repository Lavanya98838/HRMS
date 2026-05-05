import express from "express";
import {
  createShiftType, getShiftTypes, updateShiftType, deleteShiftType,
  assignShift, getWeeklySchedule, getMyShifts, removeShiftAssignment,
} from "../controllers/shift.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

// Shift types
router.get("/types",         getShiftTypes);
router.post("/types",        roleGuard("admin", "hr"), createShiftType);
router.put("/types/:id",     roleGuard("admin", "hr"), updateShiftType);
router.delete("/types/:id",  roleGuard("admin", "hr"), deleteShiftType);

// Assignments
router.get("/my",            getMyShifts);
router.get("/week",          roleGuard("admin", "hr", "manager"), getWeeklySchedule);
router.post("/assign",       roleGuard("admin", "hr", "manager"), assignShift);
router.delete("/assign/:id", roleGuard("admin", "hr", "manager"), removeShiftAssignment);

export default router;