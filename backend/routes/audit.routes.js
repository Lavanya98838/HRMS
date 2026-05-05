import express from "express";
import { getAuditLogs, getAuditStats, exportAuditLogs } from "../controllers/audit.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);
router.use(roleGuard("admin")); // Admin only

router.get("/",       getAuditLogs);
router.get("/stats",  getAuditStats);
router.get("/export", exportAuditLogs);

export default router;