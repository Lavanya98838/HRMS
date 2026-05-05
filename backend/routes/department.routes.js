// ═══════════════════════════════════════════════
//  DEPARTMENT ROUTES
//  File: routes/department.routes.js
// ═══════════════════════════════════════════════
import express from "express";
import {
  getDepartments, getDepartmentById,
  createDepartment, updateDepartment, deleteDepartment,
} from "../controllers/department.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";

const router = express.Router();

// All department routes require auth
router.use(verifyToken);

router.get("/",     getDepartments);
router.get("/:id",  getDepartmentById);

// Only admin & HR can create/update/delete
router.post("/",    roleGuard("admin", "hr"), createDepartment);
router.put("/:id",  roleGuard("admin", "hr"), updateDepartment);
router.delete("/:id", roleGuard("admin"),     deleteDepartment);

export default router;
