import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null, // null = applies to all departments
    },

    level: {
      type: Number,
      default: 1,
      min: [1, "Level must be at least 1"],
      max: [10, "Level cannot exceed 10"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

roleSchema.index({ name: 1, department: 1 });
roleSchema.index({ isActive: 1 });

const Role = mongoose.model("Role", roleSchema);
export default Role;
