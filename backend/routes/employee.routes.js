import express from "express";
import {
  getEmployees, getEmployeeById,
  createEmployee, updateEmployee, deleteEmployee,
  uploadAvatar, uploadDocument, deleteDocument,
  bulkUpload, downloadCSVTemplate,
} from "../controllers/employee.controller.js";
import { verifyToken, roleGuard } from "../middleware/verifyToken.js";
import { avatarUpload, documentUpload, csvUpload } from "../utils/cloudinary.js";

const router = express.Router();

router.use(verifyToken);

// ── CSV Template & Bulk Upload ────────────────────────────
router.get("/csv-template", roleGuard("admin", "hr"), downloadCSVTemplate);
router.post(
  "/bulk-upload",
  roleGuard("admin", "hr"),
  csvUpload.single("file"),
  bulkUpload
);

// ── Employee CRUD ─────────────────────────────────────────
// ALL roles can list employees (controller filters by role)
router.get("/",      getEmployees);
// ALL roles can view a profile (controller handles own-only for employee)
router.get("/:id",   getEmployeeById);

router.post("/",     roleGuard("admin", "hr"), createEmployee);
router.put("/:id",   updateEmployee);
router.delete("/:id", roleGuard("admin"), deleteEmployee);

// ── File Uploads ──────────────────────────────────────────
router.post("/:id/avatar",    avatarUpload.single("avatar"),    uploadAvatar);
router.post("/:id/documents", documentUpload.single("document"), uploadDocument);
router.delete("/:id/documents/:docId", deleteDocument);

export default router;
