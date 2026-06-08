import express from "express";
import {
  getAttritionRisk,
  getDepartmentHealth,
  getLeaveForecast,
  getPerformanceInsights,
} from "../controllers/predictive.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);
router.use(roleGuard("admin", "subadmin", "hr"));

router.get("/attrition",            getAttritionRisk);
router.get("/department-health",    getDepartmentHealth);
router.get("/leave-forecast",       getLeaveForecast);
router.get("/performance-insights", getPerformanceInsights);

export default router;