import express from "express";
import {
  getOverview,
  getHeadcountTrends,
  getAttendanceTrends,
  getDepartmentBreakdown,
  getSalaryOverview,
  getLeaveSummary,
  getEmploymentTypes,
} from "../controllers/analytics.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

// All analytics endpoints — admin, hr, manager can view
// Employees get limited access via DashboardHome

router.get("/overview",              roleGuard("admin", "hr", "manager", "employee"), getOverview);
router.get("/headcount-trends",      roleGuard("admin", "hr", "manager"), getHeadcountTrends);
router.get("/attendance-trends",     roleGuard("admin", "hr", "manager"), getAttendanceTrends);
router.get("/department-breakdown",  roleGuard("admin", "hr", "manager"), getDepartmentBreakdown);
router.get("/salary-overview",       roleGuard("admin", "hr"), getSalaryOverview);
router.get("/leave-summary",         roleGuard("admin", "hr", "manager"), getLeaveSummary);
router.get("/employment-types",      roleGuard("admin", "hr", "manager"), getEmploymentTypes);

export default router;
