import express from "express";
import {
  generatePayroll, generateBulkPayroll,
  getMyPayroll, getAllPayroll,
  getEmployeePayroll, downloadPayslip,
  updatePayroll,
} from "../controllers/payroll.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

// ── Employee self-service ─────────────────────────────────
router.get("/my", getMyPayroll);

// ── Admin / HR ────────────────────────────────────────────
router.get("/",                          roleGuard("admin", "subadmin", "hr"), getAllPayroll);
router.post("/generate/:employeeId",     roleGuard("admin", "subadmin", "hr"), generatePayroll);
router.post("/generate-all",             roleGuard("admin", "subadmin", "hr"), generateBulkPayroll);
router.get("/employee/:employeeId",      roleGuard("admin", "subadmin", "hr", "employee"), getEmployeePayroll);
router.put("/:id",                       roleGuard("admin", "subadmin", "hr"), updatePayroll);

// ── Download — all roles (controller enforces self-only for employee) ──
router.get("/:id/download", downloadPayslip);

export default router;