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

router.get("/overview",              roleGuard("admin", "subadmin", "hr", "manager", "employee"), getOverview);
router.get("/headcount-trends",      roleGuard("admin", "subadmin", "hr", "manager"), getHeadcountTrends);
router.get("/attendance-trends",     roleGuard("admin", "subadmin", "hr", "manager"), getAttendanceTrends);
router.get("/department-breakdown",  roleGuard("admin", "subadmin", "hr", "manager"), getDepartmentBreakdown);
router.get("/salary-overview",       roleGuard("admin", "subadmin", "hr"), getSalaryOverview);
router.get("/leave-summary",         roleGuard("admin", "subadmin", "hr", "manager"), getLeaveSummary);
router.get("/employment-types",      roleGuard("admin", "subadmin", "hr", "manager"), getEmploymentTypes);

export default router;