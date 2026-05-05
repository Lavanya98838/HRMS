import {cloudinary} from "../utils/cloudinary.js";
import Document   from "../models/Document.model.js";
import Employee   from "../models/Employee.model.js";
import User       from "../models/User.model.js";
import { createNotification } from "./notification.controller.js";
import {
  successResponse, badRequest, notFound,
  forbidden, serverError,
} from "../utils/response.js";
import multer from "multer";

// ── Multer — memory storage (we stream to Cloudinary) ─────
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files are allowed"), false);
    }
  },
});

// ── Helper: upload buffer to Cloudinary ───────────────────
const uploadToCloudinary = (buffer, mimetype, folder) => {
  return new Promise((resolve, reject) => {
    const resourceType = mimetype === "application/pdf" ? "raw" : "image";
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// ── POST /api/documents/upload ────────────────────────────
export const uploadDocument = async (req, res) => {
  try {
    const { name, description, category, employeeId, isGlobal } = req.body;

    if (!req.file) return badRequest(res, "No file uploaded");
    if (!name)     return badRequest(res, "Document name is required");

    // Determine if global or per-employee
    const global = isGlobal === "true" || isGlobal === true;

    let employee = null;
    if (!global) {
      if (req.user.role === "employee") {
        // Auto-resolve from JWT — employees always upload to their own profile
        employee = await Employee.findOne({ user: req.user.id });
        if (!employee) return notFound(res, "Employee profile not found");
      } else {
        // Admin/HR/Manager must supply employeeId explicitly
        if (!employeeId) return badRequest(res, "Employee ID is required for non-global documents");
        employee = await Employee.findById(employeeId);
        if (!employee) return notFound(res, "Employee not found");
      }
    } else {
      // Only admin/hr can upload global docs
      if (!["admin", "hr"].includes(req.user.role)) {
        return forbidden(res, "Only Admin and HR can upload global documents");
      }
    }

    const folder = global
      ? "hrms/global-documents"
      : `hrms/employee-documents/${employee.employeeId}`;

    const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype, folder);

    const fileType = req.file.mimetype === "application/pdf" ? "pdf" : "image";

    const doc = await Document.create({
      employee:    employee?._id || null,
      isGlobal:    global,
      name,
      description: description || "",
      category:    category    || "other",
      fileUrl:     result.secure_url,
      publicId:    result.public_id,
      fileType,
      mimeType:    req.file.mimetype,
      fileSize:    req.file.size,
      uploadedBy:  req.user.id,
    });

    await doc.populate("uploadedBy", "name email");

    // ── Notify ────────────────────────────────────────────
    if (!global && employee?.user) {
      await createNotification({
        recipient: employee.user,
        type:      "document_uploaded",
        title:     "New Document Uploaded",
        message:   `A new document "${name}" has been added to your profile.`,
        link:      `/employee/documents`,
        meta:      { documentId: doc._id },
      });
    }

    return successResponse(res, 201, "Document uploaded successfully", { document: doc });
  } catch (error) {
    console.error("Upload Document Error:", error);
    return serverError(res, error.message || "Failed to upload document");
  }
};

// ── GET /api/documents/employee/:employeeId ───────────────
export const getEmployeeDocuments = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return notFound(res, "Employee not found");

    // Employees can only view their own
    if (req.user.role === "employee") {
      const self = await Employee.findOne({ user: req.user.id });
      if (!self || self._id.toString() !== employee._id.toString()) {
        return forbidden(res, "Access denied");
      }
    }

    const documents = await Document.find({ employee: employee._id })
      .populate("uploadedBy", "name role")
      .sort({ createdAt: -1 });

    return successResponse(res, 200, "Employee documents", { documents });
  } catch (error) {
    return serverError(res, "Failed to fetch documents");
  }
};

// ── GET /api/documents/my ─────────────────────────────────
export const getMyDocuments = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) return notFound(res, "Employee profile not found");

    const documents = await Document.find({ employee: employee._id })
      .populate("uploadedBy", "name role")
      .sort({ createdAt: -1 });

    return successResponse(res, 200, "My documents", { documents, employee });
  } catch (error) {
    return serverError(res, "Failed to fetch documents");
  }
};

// ── GET /api/documents/global ─────────────────────────────
export const getGlobalDocuments = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isGlobal: true };
    if (category) filter.category = category;

    const documents = await Document.find(filter)
      .populate("uploadedBy", "name role")
      .sort({ createdAt: -1 });

    return successResponse(res, 200, "Global documents", { documents });
  } catch (error) {
    return serverError(res, "Failed to fetch global documents");
  }
};

// ── GET /api/documents/all ────────────────────────────────
// Admin/HR — all documents across the system
export const getAllDocuments = async (req, res) => {
  try {
    const { type, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type === "global")   filter.isGlobal = true;
    if (type === "personal") filter.isGlobal = false;
    if (category)            filter.category = category;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Document.countDocuments(filter);

    const documents = await Document.find(filter)
      .populate("uploadedBy", "name role")
      .populate({ path: "employee", select: "firstName lastName employeeId" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, "All documents", {
      documents,
      pagination: {
        total, page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    return serverError(res, "Failed to fetch documents");
  }
};

// ── DELETE /api/documents/:id ─────────────────────────────
export const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate({ path: "employee", select: "firstName lastName user" });

    if (!doc) return notFound(res, "Document not found");

    // Employees can only delete their own documents
    if (req.user.role === "employee") {
      const self = await Employee.findOne({ user: req.user.id });
      if (!self || !doc.employee || self._id.toString() !== doc.employee._id.toString()) {
        return forbidden(res, "Access denied");
      }
    }

    // Delete from Cloudinary
    const resourceType = doc.fileType === "pdf" ? "raw" : "image";
    await cloudinary.uploader.destroy(doc.publicId, { resource_type: resourceType });

    await doc.deleteOne();

    // ── Notify ────────────────────────────────────────────
    if (!doc.isGlobal && doc.employee?.user) {
      await createNotification({
        recipient: doc.employee.user,
        type:      "document_deleted",
        title:     "Document Removed",
        message:   `The document "${doc.name}" has been removed from your profile.`,
        link:      `/employee/documents`,
      });
    }

    return successResponse(res, 200, "Document deleted successfully");
  } catch (error) {
    console.error("Delete Document Error:", error);
    return serverError(res, "Failed to delete document");
  }
};