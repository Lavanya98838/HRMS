import express from "express";
import {
  uploadDocument,
  getMyDocuments,
  getEmployeeDocuments,
  getGlobalDocuments,
  getAllDocuments,
  deleteDocument,
  upload,
} from "../controllers/document.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

// ── Employee self-service ─────────────────────────────────
router.get("/my",     getMyDocuments);

// ── All roles — global company docs ──────────────────────
router.get("/global", getGlobalDocuments);

// ── Admin / HR ────────────────────────────────────────────
router.get("/all",    roleGuard("admin", "hr"), getAllDocuments);
router.get("/employee/:employeeId", roleGuard("admin", "hr", "employee"), getEmployeeDocuments);

// ── Upload — admin/hr/employee (controller enforces ownership) ──
router.post("/upload", upload.single("file"), uploadDocument);

// ── Delete — admin/hr/employee (controller enforces ownership) ──
router.delete("/:id", deleteDocument);

export default router;
