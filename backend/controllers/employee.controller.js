import Employee from "../models/Employee.model.js";
import Department from "../models/Department.model.js";
import Role from "../models/Role.model.js";
import User from "../models/User.model.js";
import { generateEmployeeId } from "../utils/employeeId.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../utils/cloudinary.js";
import { parseEmployeeCSV, getCSVTemplate } from "../utils/csvParser.js";
import bcrypt from "bcryptjs";
import {
  successResponse, badRequest, notFound,
  conflict, serverError, forbidden,
} from "../utils/response.js";
import { createNotification } from "./notification.controller.js";
import { auditLog } from "../utils/auditLogger.js";

// ── GET /api/employees ────────────────────────────────
export const getEmployees = async (req, res) => {
  try {
    const {
      search, department, role, employmentType,
      isActive = "true", page = 1, limit = 10,
      sortBy = "createdAt", sortOrder = "desc",
    } = req.query;

    const filter = {};

    if (req.user.role === "manager") {
      const managerEmployee = await Employee.findOne({ user: req.user.id });
      if (managerEmployee?.department) {
        filter.department = managerEmployee.department;
      }
    }

    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (department) filter.department = department;
    if (role) filter.role = role;
    if (employmentType) filter.employmentType = employmentType;

    if (search) {
      filter.$or = [
        { firstName:   { $regex: search, $options: "i" } },
        { lastName:    { $regex: search, $options: "i" } },
        { email:       { $regex: search, $options: "i" } },
        { employeeId:  { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;
    const sort     = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .populate("department", "name code")
        .populate("role", "name level")
        .populate("user", "name email isActive lastLogin")
        .select("-documents -salary -address -emergencyContact")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Employee.countDocuments(filter),
    ]);

    return successResponse(res, 200, "Employees fetched", {
      employees,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Get Employees Error:", error);
    return serverError(res, "Failed to fetch employees");
  }
};

// ── GET /api/employees/:id ────────────────────────────
export const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate("department", "name code description")
      .populate("role", "name level description")
      .populate("user", "name email isActive lastLogin createdAt")
      .populate("reportingTo", "firstName lastName designation employeeId profilePicture");

    if (!employee) return notFound(res, "Employee not found");

    if (req.user.role === "employee") {
      const self = await Employee.findOne({ user: req.user.id });
      if (!self || self._id.toString() !== employee._id.toString()) {
        return forbidden(res, "You can only view your own profile");
      }
    }

    return successResponse(res, 200, "Employee fetched", { employee });
  } catch (error) {
    console.error("Get Employee Error:", error);
    return serverError(res, "Failed to fetch employee");
  }
};

// ── POST /api/employees ───────────────────────────────
export const createEmployee = async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone,
      department, role, designation, employmentType,
      dateOfJoining, dateOfBirth, gender,
      address, salary, emergencyContact,
      reportingTo, password,
    } = req.body;

    if (!firstName || !lastName || !email) {
      return badRequest(res, "First name, last name, and email are required");
    }

    const existingEmployee = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmployee) return conflict(res, "An employee profile with this email already exists");

    let userAccount = await User.findOne({ email: email.toLowerCase() });
    let defaultPassword = null;

    if (userAccount) {
      const alreadyLinked = await Employee.findOne({ user: userAccount._id });
      if (alreadyLinked) {
        return conflict(res, "An employee profile is already linked to this account");
      }
    } else {
      defaultPassword = password || `HRMS@${new Date().getFullYear()}`;
      userAccount = await User.create({
        name: `${firstName} ${lastName}`,
        email: email.toLowerCase().trim(),
        password: defaultPassword,
        role: "employee",
        roleLevel: 1,  // default level — updated below if role is assigned
        isVerified: true,
        isActive: true,
        employeeId: await generateEmployeeId(),
      });
    }

    // ── Sync roleLevel from assigned Role on creation ──
    if (role && userAccount) {
      const roleDoc = await Role.findById(role).select("level name");
      if (roleDoc) {
        const level = roleDoc.level;
        let portalRole = "employee";
        if (level >= 10)     portalRole = "employee"; // subadmin via roleLevel
        else if (level >= 8) portalRole = "hr";
        else if (level >= 6) portalRole = "manager";
        else                 portalRole = "employee";
        await User.findByIdAndUpdate(userAccount._id, {
          roleLevel: level,
          role: portalRole,
        });
      }
    }

    const employeeId = await generateEmployeeId();

    const employee = await Employee.create({
      user: userAccount._id,
      employeeId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      department: department || null,
      role: role || null,
      designation: designation?.trim() || null,
      employmentType: employmentType || "full_time",
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender || "prefer_not_to_say",
      address: address || {},
      salary: salary || {},
      emergencyContact: emergencyContact || {},
      reportingTo: reportingTo || null,
    });

    await employee.populate([
      { path: "department", select: "name code" },
      { path: "role", select: "name level" },
      { path: "user", select: "name email isActive" },
    ]);

    await auditLog(req, { action: "EMPLOYEE_CREATED", category: "employee", targetEmployee: employee._id, details: { name: `${firstName} ${lastName}`, email, employeeId } });
    return successResponse(res, 201, "Employee created successfully", {
      employee,
      loginCredentials: defaultPassword ? {
        email: email.toLowerCase(),
        password: defaultPassword,
        note: "Please share these credentials securely with the employee",
      } : {
        note: "Employee profile linked to existing account. They can use their current password to login.",
      },
    });
  } catch (error) {
    console.error("Create Employee Error:", error);
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => e.message);
      return badRequest(res, "Validation failed", errors);
    }
    return serverError(res, "Failed to create employee");
  }
};

// ── PUT /api/employees/:id ────────────────────────────
export const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return notFound(res, "Employee not found");

    const isOwnProfile = req.user.role === "employee";

    if (isOwnProfile) {
      const self = await Employee.findOne({ user: req.user.id });
      if (!self || self._id.toString() !== employee._id.toString()) {
        return forbidden(res, "You can only update your own profile");
      }
      const { phone, address, emergencyContact, dateOfBirth, gender } = req.body;
      if (phone !== undefined)           employee.phone = phone;
      if (address)                       employee.address = { ...employee.address, ...address };
      if (emergencyContact)              employee.emergencyContact = { ...employee.emergencyContact, ...emergencyContact };
      if (dateOfBirth !== undefined)     employee.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (gender !== undefined)          employee.gender = gender;
    } else {
      const {
        firstName, lastName, phone, department, role,
        designation, employmentType, dateOfJoining, dateOfBirth,
        gender, address, salary, emergencyContact, reportingTo,
        isActive, dateOfLeaving,
      } = req.body;

      if (firstName !== undefined)       employee.firstName = firstName.trim();
      if (lastName !== undefined)        employee.lastName = lastName.trim();
      if (phone !== undefined)           employee.phone = phone;
      if (department !== undefined)      employee.department = department || null;
      if (role !== undefined)            employee.role = role || null;
      if (designation !== undefined)     employee.designation = designation?.trim() || null;
      if (employmentType !== undefined)  employee.employmentType = employmentType;
      if (dateOfJoining !== undefined)   employee.dateOfJoining = dateOfJoining ? new Date(dateOfJoining) : employee.dateOfJoining;
      if (dateOfBirth !== undefined)     employee.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (gender !== undefined)          employee.gender = gender;
      if (address)                       employee.address = { ...employee.address, ...address };
      if (salary)                        employee.salary = { ...employee.salary, ...salary };
      if (emergencyContact)              employee.emergencyContact = { ...employee.emergencyContact, ...emergencyContact };
      if (reportingTo !== undefined)     employee.reportingTo = reportingTo || null;
      if (isActive !== undefined)        employee.isActive = isActive;
      if (dateOfLeaving !== undefined)   employee.dateOfLeaving = dateOfLeaving ? new Date(dateOfLeaving) : null;

      if (firstName || lastName) {
        await User.findByIdAndUpdate(employee.user, {
          name: `${employee.firstName} ${employee.lastName}`,
        });
      }

      // ── Sync role level to User when role changes ──────
      // This is what controls which portal the user lands on after login
      if (role !== undefined && role && employee.user) {
        const roleDoc = await Role.findById(role).select("level name");
        if (roleDoc) {
          const level = roleDoc.level;
          // Map level → portal role string
          let portalRole = "employee";
          if (level >= 10)     portalRole = "employee"; // subadmin handled by roleLevel
          else if (level >= 8) portalRole = "hr";
          else if (level >= 6) portalRole = "manager";
          else                 portalRole = "employee";

          await User.findByIdAndUpdate(employee.user, {
            roleLevel: level,
            // Only update role string if not admin (protect admin account)
            ...(req.user.role !== "admin" || portalRole !== "admin"
              ? { role: portalRole }
              : {}),
          });
        }
      }

      if (isActive === false) {
        await User.findByIdAndUpdate(employee.user, { isActive: false });
      } else if (isActive === true) {
        await User.findByIdAndUpdate(employee.user, { isActive: true });
      }
    }

    await employee.save();
    await employee.populate([
      { path: "department", select: "name code" },
      { path: "role", select: "name level" },
      { path: "user", select: "name email isActive" },
    ]);

    if (!isOwnProfile && employee.user) {
      await createNotification({
        recipient: employee.user,
        type:      "profile_updated",
        title:     "Profile Updated",
        message:   "Your employee profile has been updated by HR/Admin.",
        link:      `/employee/profile`,
        meta:      { employeeId: employee._id },
      });
    }

    await auditLog(req, { action: "EMPLOYEE_UPDATED", category: "employee", targetEmployee: employee._id, details: { updatedFields: Object.keys(req.body) } });
    return successResponse(res, 200, "Employee updated successfully", { employee });
  } catch (error) {
    console.error("Update Employee Error:", error);
    return serverError(res, "Failed to update employee");
  }
};

// ── DELETE /api/employees/:id ─────────────────────────
export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return notFound(res, "Employee not found");

    if (employee.profilePicture?.publicId) {
      await deleteFromCloudinary(employee.profilePicture.publicId);
    }

    for (const doc of employee.documents) {
      if (doc.publicId) {
        await deleteFromCloudinary(doc.publicId, "raw");
      }
    }

    await User.findByIdAndUpdate(employee.user, {
      isActive: false,
      refreshToken: null,
    });
    await employee.deleteOne();

    await auditLog(req, { action: "EMPLOYEE_DELETED", category: "employee", details: { employeeId: employee.employeeId, name: `${employee.firstName} ${employee.lastName}` } });
    return successResponse(res, 200, "Employee deleted successfully");
  } catch (error) {
    console.error("Delete Employee Error:", error);
    return serverError(res, "Failed to delete employee");
  }
};

// ── POST /api/employees/:id/avatar ────────────────────
export const uploadAvatar = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return notFound(res, "Employee not found");

    if (!req.file) return badRequest(res, "No image file provided");

    // Delete old avatar from Cloudinary
    if (employee.profilePicture?.publicId) {
      await deleteFromCloudinary(employee.profilePicture.publicId);
    }

    // Upload new avatar to Cloudinary via buffer
    const result = await uploadToCloudinary(
      req.file.buffer,
      req.file.mimetype,
      "hrms/avatars",
      `avatar-${employee._id}-${Date.now()}`
    );

    employee.profilePicture = {
      url:      result.secure_url,
      publicId: result.public_id,
    };
    await employee.save();

    await User.findByIdAndUpdate(employee.user, {
      profilePicture: result.secure_url,
    });

    return successResponse(res, 200, "Profile picture updated", {
      profilePicture: employee.profilePicture,
    });
  } catch (error) {
    console.error("Upload Avatar Error:", error);
    return serverError(res, "Failed to upload profile picture");
  }
};

// ── POST /api/employees/:id/documents ─────────────────
export const uploadDocument = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return notFound(res, "Employee not found");

    if (!req.file) return badRequest(res, "No document file provided");

    const { name, type } = req.body;
    if (!name) return badRequest(res, "Document name is required");

    // Upload to Cloudinary via buffer
    const result = await uploadToCloudinary(
      req.file.buffer,
      req.file.mimetype,
      "hrms/documents",
      `doc-${employee._id}-${Date.now()}`
    );

    const document = {
      name:       name.trim(),
      type:       type || "other",
      url:        result.secure_url,
      publicId:   result.public_id,
      uploadedAt: new Date(),
    };

    employee.documents.push(document);
    await employee.save();

    return successResponse(res, 201, "Document uploaded successfully", {
      document: employee.documents[employee.documents.length - 1],
    });
  } catch (error) {
    console.error("Upload Document Error:", error);
    return serverError(res, "Failed to upload document");
  }
};

// ── DELETE /api/employees/:id/documents/:docId ────────
export const deleteDocument = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return notFound(res, "Employee not found");

    const doc = employee.documents.id(req.params.docId);
    if (!doc) return notFound(res, "Document not found");

    if (doc.publicId) {
      await deleteFromCloudinary(doc.publicId, "raw");
    }

    doc.deleteOne();
    await employee.save();

    return successResponse(res, 200, "Document deleted successfully");
  } catch (error) {
    console.error("Delete Document Error:", error);
    return serverError(res, "Failed to delete document");
  }
};

// ── POST /api/employees/bulk-upload ───────────────────
export const bulkUpload = async (req, res) => {
  try {
    if (!req.file) return badRequest(res, "No CSV file provided");

    const { valid, errors, total } = parseEmployeeCSV(req.file.buffer);

    if (valid.length === 0) {
      return badRequest(res, "No valid records found in CSV", errors);
    }

    const results = { created: [], failed: [], skipped: [] };

    for (const record of valid) {
      try {
        const existing = await User.findOne({ email: record.email });
        if (existing) {
          results.skipped.push({ email: record.email, reason: "Email already exists" });
          continue;
        }

        let departmentId = null;
        if (record._departmentName) {
          const dept = await Department.findOne({
            name: { $regex: `^${record._departmentName}$`, $options: "i" },
          });
          departmentId = dept?._id || null;
        }

        const employeeId = await generateEmployeeId();
        const defaultPassword = `HRMS@${new Date().getFullYear()}`;

        const userAccount = await User.create({
          name: `${record.firstName} ${record.lastName}`,
          email: record.email,
          password: defaultPassword,
          role: "employee",
          isVerified: true,
          employeeId,
        });

        const employee = await Employee.create({
          ...record,
          user: userAccount._id,
          employeeId,
          department: departmentId,
          _departmentName: undefined,
        });

        results.created.push({
          employeeId,
          name: `${record.firstName} ${record.lastName}`,
          email: record.email,
          password: defaultPassword,
        });
      } catch (err) {
        results.failed.push({ email: record.email, reason: err.message });
      }
    }

    return successResponse(res, 200, "Bulk upload completed", {
      summary: {
        total,
        created: results.created.length,
        skipped: results.skipped.length,
        failed: results.failed.length,
        csvErrors: errors.length,
      },
      results,
      csvErrors: errors,
    });
  } catch (error) {
    console.error("Bulk Upload Error:", error);
    return serverError(res, "Bulk upload failed");
  }
};

// ── GET /api/employees/csv-template ──────────────────
export const downloadCSVTemplate = async (req, res) => {
  try {
    const template = getCSVTemplate();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=employee-upload-template.csv");
    res.send(template);
  } catch (error) {
    return serverError(res, "Failed to generate template");
  }
};