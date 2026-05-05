import express from "express";
import {
  createGoal, getAllGoals, getMyGoals,
  getEmployeeGoals, updateGoal, deleteGoal,
} from "../controllers/goal.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

router.get("/my",                   getMyGoals);
router.get("/",                     roleGuard("admin", "hr", "manager"), getAllGoals);
router.get("/employee/:employeeId", roleGuard("admin", "hr", "manager", "employee"), getEmployeeGoals);
router.post("/",                    roleGuard("admin", "hr", "manager"), createGoal);
router.put("/:id",                  updateGoal);
router.delete("/:id",               roleGuard("admin", "hr", "manager"), deleteGoal);

export default router;