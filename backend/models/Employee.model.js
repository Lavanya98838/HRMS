import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ["resume", "id_proof", "contract", "certificate", "other"],
    default: "other",
  },
  url: { type: String, required: true },        // Cloudinary URL
  publicId: { type: String, required: true },   // Cloudinary public_id for deletion
  uploadedAt: { type: Date, default: Date.now },
});

const employeeSchema = new mongoose.Schema(
  {
    // ── Link to User account ──────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // ── Auto-generated ID ─────────────────────────────
    employeeId: {
      type: String,
      unique: true,
      // Format: HRMS-2026-001
    },

    // ── Personal Info ─────────────────────────────────
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },

    // ── Address ───────────────────────────────────────
    address: {
      street:  { type: String, default: null },
      city:    { type: String, default: null },
      state:   { type: String, default: null },
      country: { type: String, default: "India" },
      pincode: { type: String, default: null },
    },

    // ── Work Info ─────────────────────────────────────
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null,
    },

    designation: {
      type: String,
      trim: true,
      default: null,
    },

    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "intern"],
      default: "full_time",
    },

    dateOfJoining: {
      type: Date,
      default: Date.now,
    },

    dateOfLeaving: {
      type: Date,
      default: null,
    },

    reportingTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    // ── Media ─────────────────────────────────────────
    profilePicture: {
      url:      { type: String, default: null },
      publicId: { type: String, default: null },
    },

    documents: [documentSchema],

    // ── Salary (basic info — detailed in Phase 4) ─────
    salary: {
      basic:      { type: Number, default: 0 },
      hra:        { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
    },

    // ── Status ────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Emergency Contact ─────────────────────────────
    emergencyContact: {
      name:         { type: String, default: null },
      relationship: { type: String, default: null },
      phone:        { type: String, default: null },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: full name ────────────────────────────────
employeeSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Virtual: gross salary ─────────────────────────────
employeeSchema.virtual("grossSalary").get(function () {
  const { basic, hra, allowances, deductions } = this.salary;
  return basic + hra + allowances - deductions;
});

// ── Indexes ───────────────────────────────────────────
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ email: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ role: 1 });
employeeSchema.index({ isActive: 1 });
employeeSchema.index({ firstName: "text", lastName: "text", email: "text" });

const Employee = mongoose.model("Employee", employeeSchema);
export default Employee;
