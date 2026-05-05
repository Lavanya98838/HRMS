import express from "express";
import {
  getRoles, getRoleById,
  createRole, updateRole, deleteRole,
} from "../controllers/role.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);

router.get("/",     getRoles);
router.get("/:id",  getRoleById);

router.post("/",    roleGuard("admin", "hr"), createRole);
router.put("/:id",  roleGuard("admin", "hr"), updateRole);
router.delete("/:id", roleGuard("admin"),     deleteRole);

export default router;
