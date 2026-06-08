import express from "express";
import {
  applyLeave, getMyLeaves, getLeaveBalance,
  getAllLeaves, getPendingLeaves,
  approveLeave, rejectLeave, cancelLeave,
  getEmployeeLeaves,
} from "../controllers/leave.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

// ── Employee self-service ─────────────────────────────────
router.post("/",                    applyLeave);
router.get("/my",                   getMyLeaves);
router.get("/balance",              getLeaveBalance);
router.put("/:id/cancel",           cancelLeave);

// ── Admin/HR/Manager ──────────────────────────────────────
router.get("/pending",              roleGuard("admin", "subadmin", "hr", "manager"), getPendingLeaves);
router.get("/",                     roleGuard("admin", "subadmin", "hr", "manager"), getAllLeaves);
router.get("/employee/:id",         roleGuard("admin", "subadmin", "hr", "manager"), getEmployeeLeaves);
router.put("/:id/approve",          roleGuard("admin", "subadmin", "hr", "manager"), approveLeave);
router.put("/:id/reject",           roleGuard("admin", "subadmin", "hr", "manager"), rejectLeave);

export default router;