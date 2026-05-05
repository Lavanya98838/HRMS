// ── performanceReview.routes.js ───────────────────────────
import express from "express";
import {
  createReview, getAllReviews, getMyReviews,
  getEmployeeReviews, updateReview, deleteReview,
} from "../controllers/performanceReview.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

router.get("/my",                    getMyReviews);
router.get("/",                      roleGuard("admin", "hr", "manager"), getAllReviews);
router.get("/employee/:employeeId",  roleGuard("admin", "hr", "manager", "employee"), getEmployeeReviews);
router.post("/",                     roleGuard("admin", "hr", "manager"), createReview);
router.put("/:id",                   roleGuard("admin", "hr", "manager", "employee"), updateReview);
router.delete("/:id",                roleGuard("admin", "hr"), deleteReview);

export default router;