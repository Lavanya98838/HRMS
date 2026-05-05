import Role from "../models/Role.model.js";
import Employee from "../models/Employee.model.js";
import {
  successResponse, badRequest, notFound,
  conflict, serverError,
} from "../utils/response.js";

// ── GET /api/roles ────────────────────────────────────
export const getRoles = async (req, res) => {
  try {
    const { department, isActive, search } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (search) filter.name = { $regex: search, $options: "i" };

    const roles = await Role.find(filter)
      .populate("department", "name code")
      .sort({ level: -1, name: 1 });

    return successResponse(res, 200, "Roles fetched", { roles });
  } catch (error) {
    return serverError(res, "Failed to fetch roles");
  }
};

// ── GET /api/roles/:id ────────────────────────────────
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate("department", "name code");
    if (!role) return notFound(res, "Role not found");
    return successResponse(res, 200, "Role fetched", { role });
  } catch (error) {
    return serverError(res, "Failed to fetch role");
  }
};

// ── POST /api/roles ───────────────────────────────────
export const createRole = async (req, res) => {
  try {
    const { name, department, level, description } = req.body;

    if (!name) return badRequest(res, "Role name is required");

    const existing = await Role.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
      department: department || null,
    });
    if (existing) return conflict(res, "Role with this name already exists in this department");

    const role = await Role.create({
      name: name.trim(),
      department: department || null,
      level: level || 1,
      description: description?.trim() || null,
    });

    await role.populate("department", "name code");
    return successResponse(res, 201, "Role created successfully", { role });
  } catch (error) {
    return serverError(res, "Failed to create role");
  }
};

// ── PUT /api/roles/:id ────────────────────────────────
export const updateRole = async (req, res) => {
  try {
    const { name, department, level, description, isActive } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) return notFound(res, "Role not found");

    if (name)        role.name        = name.trim();
    if (department !== undefined) role.department = department || null;
    if (level)       role.level       = level;
    if (description !== undefined) role.description = description?.trim() || null;
    if (isActive !== undefined) role.isActive = isActive;

    await role.save();
    await role.populate("department", "name code");

    return successResponse(res, 200, "Role updated successfully", { role });
  } catch (error) {
    return serverError(res, "Failed to update role");
  }
};

// ── DELETE /api/roles/:id ─────────────────────────────
export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return notFound(res, "Role not found");

    const count = await Employee.countDocuments({ role: role._id, isActive: true });
    if (count > 0) {
      return badRequest(res, `Cannot delete role assigned to ${count} active employee(s)`);
    }

    await role.deleteOne();
    return successResponse(res, 200, "Role deleted successfully");
  } catch (error) {
    return serverError(res, "Failed to delete role");
  }
};
