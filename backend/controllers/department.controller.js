import Department from "../models/Department.model.js";
import Employee from "../models/Employee.model.js";
import {
  successResponse, badRequest, notFound,
  conflict, serverError, forbidden,
} from "../utils/response.js";

// ── GET /api/departments ──────────────────────────────
export const getDepartments = async (req, res) => {
  try {
    const { isActive, search } = req.query;

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (search) filter.name = { $regex: search, $options: "i" };

    const departments = await Department.find(filter)
      .populate("head", "name email")
      .populate("employeeCount")
      .sort({ name: 1 });

    return successResponse(res, 200, "Departments fetched", { departments });
  } catch (error) {
    console.error("Get Departments Error:", error);
    return serverError(res, "Failed to fetch departments");
  }
};

// ── GET /api/departments/:id ──────────────────────────
export const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate("head", "name email profilePicture");

    if (!department) return notFound(res, "Department not found");

    // Get employees in this department
    const employees = await Employee.find({ department: department._id, isActive: true })
      .populate("user", "name email")
      .select("employeeId firstName lastName designation employmentType profilePicture")
      .limit(10);

    return successResponse(res, 200, "Department fetched", { department, employees });
  } catch (error) {
    console.error("Get Department Error:", error);
    return serverError(res, "Failed to fetch department");
  }
};

// ── POST /api/departments ─────────────────────────────
export const createDepartment = async (req, res) => {
  try {
    const { name, code, description, head } = req.body;

    if (!name || !code) return badRequest(res, "Name and code are required");

    // Check duplicates
    const existing = await Department.findOne({
      $or: [
        { name: { $regex: `^${name}$`, $options: "i" } },
        { code: code.toUpperCase() },
      ],
    });
    if (existing) return conflict(res, "Department with this name or code already exists");

    const department = await Department.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description?.trim() || null,
      head: head || null,
    });

    await department.populate("head", "name email");

    return successResponse(res, 201, "Department created successfully", { department });
  } catch (error) {
    console.error("Create Department Error:", error);
    return serverError(res, "Failed to create department");
  }
};

// ── PUT /api/departments/:id ──────────────────────────
export const updateDepartment = async (req, res) => {
  try {
    const { name, code, description, head, isActive } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department) return notFound(res, "Department not found");

    // Check duplicate name/code (excluding current)
    if (name || code) {
      const conditions = [];
      if (name) conditions.push({ name: { $regex: `^${name}$`, $options: "i" } });
      if (code) conditions.push({ code: code.toUpperCase() });

      const existing = await Department.findOne({
        $or: conditions,
        _id: { $ne: req.params.id },
      });
      if (existing) return conflict(res, "Another department with this name or code exists");
    }

    if (name)        department.name        = name.trim();
    if (code)        department.code        = code.toUpperCase().trim();
    if (description !== undefined) department.description = description?.trim() || null;
    if (head !== undefined) department.head = head || null;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();
    await department.populate("head", "name email");

    return successResponse(res, 200, "Department updated successfully", { department });
  } catch (error) {
    console.error("Update Department Error:", error);
    return serverError(res, "Failed to update department");
  }
};

// ── DELETE /api/departments/:id ───────────────────────
export const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return notFound(res, "Department not found");

    // Check if employees exist in this department
    const employeeCount = await Employee.countDocuments({
      department: department._id,
      isActive: true,
    });

    if (employeeCount > 0) {
      return badRequest(
        res,
        `Cannot delete department with ${employeeCount} active employee(s). Reassign them first.`
      );
    }

    await department.deleteOne();
    return successResponse(res, 200, "Department deleted successfully");
  } catch (error) {
    console.error("Delete Department Error:", error);
    return serverError(res, "Failed to delete department");
  }
};
