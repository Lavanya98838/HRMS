import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    // ── Basic Info ──────────────────────────────
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: validator.isEmail,
        message: "Please provide a valid email address",
      },
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // never returned in queries by default
    },

    // ── Role ────────────────────────────────────
    role: {
      type: String,
      enum: {
        values: ["admin", "subadmin", "hr", "manager", "employee"],
        message: "Role must be admin, subadmin, hr, manager, or employee",
      },
      default: "employee",
    },

    // ── Role Level (from Role model — drives portal detection) ──
    // L1-5 → employee, L6-7 → manager, L8-9 → hr, L10 → subadmin
    roleLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },

    // ── Account Status ───────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // ── OTP (Password Reset) ─────────────────────
    otp: {
      type: String,
      select: false,
    },

    otpExpiry: {
      type: Date,
      select: false,
    },

    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    // ── Account Setup (Invite Flow) ─────────────
    inviteToken: {
      type: String,
      select: false,
    },

    inviteExpiry: {
      type: Date,
      select: false,
    },

    isAccountSetup: {
      type: Boolean,
      default: false, // true once employee sets their password via invite link
    },

    // ── Refresh Token ────────────────────────────
    refreshToken: {
      type: String,
      select: false,
    },

    // ── Session Tracking ─────────────────────────
    lastLogin: {
      type: Date,
    },

    lastActivity: {
      type: Date,
    },

    // ── Profile ──────────────────────────────────
    profilePicture: {
      type: String,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    employeeId: {
      type: String,
      unique: true,
      sparse: true, // allows null for non-employees
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ── Pre-save: Hash password ───────────────────────
userSchema.pre("save", async function (next) {
  // only hash if password was modified
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Method: Compare password ──────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ── Method: Check OTP valid ───────────────────────
userSchema.methods.isOTPValid = function (inputOTP) {
  if (!this.otp || !this.otpExpiry) return false;
  if (new Date() > this.otpExpiry) return false;
  return this.otp === inputOTP;
};

// ── Method: Safe user object (no sensitive fields) ─
userSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    roleLevel: this.roleLevel,   // ← needed for portal detection in AuthContext
    isActive: this.isActive,
    isVerified: this.isVerified,
    profilePicture: this.profilePicture,
    phone: this.phone,
    employeeId: this.employeeId,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);
export default User;