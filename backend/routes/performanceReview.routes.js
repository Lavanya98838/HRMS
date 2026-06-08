// ── performanceReview.routes.js ───────────────────────────
import express from "express";
import {
  createReview,
  getAllReviews,
  getMyReviews,
  getPendingReviews,
  getEmployeeReviews,
  fillReview,
  acknowledgeReview,
  updateReview,
  deleteReview,
} from "../controllers/performanceReview.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

// ── Employee routes ───────────────────────────────────────
router.get("/my",                     getMyReviews);
router.put("/:id/acknowledge",        roleGuard("employee"), acknowledgeReview);

// ── Manager routes ────────────────────────────────────────
router.get("/pending",                roleGuard("admin", "hr", "manager"), getPendingReviews);
router.put("/:id/fill",               roleGuard("admin", "manager"), fillReview);

// ── HR / Admin routes ─────────────────────────────────────
router.get("/",                       roleGuard("admin", "hr", "manager"), getAllReviews);
router.get("/employee/:employeeId",   roleGuard("admin", "hr", "manager", "employee"), getEmployeeReviews);
router.post("/",                      roleGuard("admin", "hr"), createReview);
router.put("/:id",                    roleGuard("admin", "hr"), updateReview);
router.delete("/:id",                 roleGuard("admin", "hr"), deleteReview);

export default router;