import User from "../models/User.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  generateOTP,
  getOTPExpiry,
} from "../utils/generateToken.js";
import { sendOTPEmail, sendWelcomeEmail } from "../utils/mailer.js";
import { auditLog } from "../utils/auditLogger.js";
import {
  successResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
} from "../utils/response.js";

// ─────────────────────────────────────────────────────────────
//  REGISTER
//  POST /api/auth/register
//  Body: { name, email, password, role }
//  Note: Admin can only be created via seeder or manually
// ─────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // ── Validation ────────────────────────────────
    if (!name || !email || !password || !role) {
      return badRequest(res, "All fields are required: name, email, password, role");
    }

    // Block direct admin registration from public API
    if (role === "admin") {
      return forbidden(res, "Admin accounts cannot be created via registration. Contact system administrator.");
    }

    // Validate role
    const allowedRoles = ["hr", "manager", "employee"];
    if (!allowedRoles.includes(role)) {
      return badRequest(res, `Invalid role. Allowed: ${allowedRoles.join(", ")}`);
    }

    // Password strength check
    if (password.length < 8) {
      return badRequest(res, "Password must be at least 8 characters");
    }

    // ── Duplicate check ───────────────────────────
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return conflict(res, "An account with this email already exists");
    }

    // ── Create user ───────────────────────────────
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      isVerified: true, // auto-verified for now; add email verification in Phase 5
    });

    // ── Generate tokens ───────────────────────────
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to DB (hashed in production — plain for now)
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Set refresh token cookie
    setRefreshTokenCookie(res, refreshToken);

    // ── Send welcome email (non-blocking) ─────────
    sendWelcomeEmail(user.email, user.name, user.role).catch(console.warn);

    // ── Audit log ─────────────────────────────────
    req.user = { id: user._id, role: user.role };
    await auditLog(req, { action: "REGISTER", category: "auth", details: { name: user.name, email: user.email, role: user.role } });

    return successResponse(res, 201, "Account created successfully", {
      user: user.toSafeObject(),
      accessToken,
    });
  } catch (error) {
    console.error("Register Error:", error);

    // Mongoose validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => e.message);
      return badRequest(res, "Validation failed", errors);
    }

    return serverError(res, "Registration failed. Please try again.");
  }
};

// ─────────────────────────────────────────────────────────────
//  LOGIN
//  POST /api/auth/login
//  Body: { email, password, role }
// ─────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Validation ────────────────────────────────
    if (!email || !password) {
      return badRequest(res, "Email and password are required");
    }

    // ── Find user (include password for comparison) ─
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password +refreshToken");

    if (!user) {
      return unauthorized(res, "Invalid email or password");
    }

    // ── Account active check ──────────────────────
    if (!user.isActive) {
      return forbidden(res, "Your account has been deactivated. Contact HR.");
    }

    // ── Password check ────────────────────────────
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
    // ── Audit failed login ──────────────────────
    req.user = { id: user._id, role: user.role };
    await auditLog(req, { action: "LOGIN_FAILED", category: "auth", details: { email: user.email }, status: "failure" });
    return unauthorized(res, "Invalid email or password");
    }

    // ── Generate tokens ───────────────────────────
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token + update last login
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    user.lastActivity = new Date();
    await user.save();

    // Set refresh token in HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    // ── Audit log ─────────────────────────────────
    req.user = { id: user._id, role: user.role };
    await auditLog(req, { action: "LOGIN", category: "auth", details: { email: user.email, role: user.role } });
    return successResponse(res, 200, "Login successful", {
      user: user.toSafeObject(),
      accessToken,
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_MS) || 1800000,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return serverError(res, "Login failed. Please try again.");
  }
};

// ─────────────────────────────────────────────────────────────
//  LOGOUT
//  POST /api/auth/logout
//  Requires: valid access token
// ─────────────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      // Clear refresh token from DB
      await User.findByIdAndUpdate(userId, {
        refreshToken: null,
        lastActivity: new Date(),
      });
    }

    // Clear cookie
    clearRefreshTokenCookie(res);

    await auditLog(req, { action: "LOGOUT", category: "auth", details: {} });
    return successResponse(res, 200, "Logged out successfully");
  } catch (error) {
    console.error("Logout Error:", error);
    // Still clear cookie even on error
    clearRefreshTokenCookie(res);
    return successResponse(res, 200, "Logged out");
  }
};

// ─────────────────────────────────────────────────────────────
//  REFRESH TOKEN
//  POST /api/auth/refresh
//  Uses: refreshToken cookie (automatic, no body needed)
// ─────────────────────────────────────────────────────────────
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return unauthorized(res, "No refresh token found. Please login again.");
    }

    // ── Verify refresh token ──────────────────────
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      clearRefreshTokenCookie(res);
      return unauthorized(res, "Invalid or expired session. Please login again.");
    }

    // ── Find user & match stored token ────────────
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== token) {
      clearRefreshTokenCookie(res);
      return unauthorized(res, "Session invalid. Please login again.");
    }

    if (!user.isActive) {
      clearRefreshTokenCookie(res);
      return forbidden(res, "Account deactivated.");
    }

    // ── Issue new tokens (rotation) ───────────────
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    user.lastActivity = new Date();
    await user.save();

    setRefreshTokenCookie(res, newRefreshToken);

    return successResponse(res, 200, "Token refreshed", {
      accessToken: newAccessToken,
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_MS) || 1800000,
    });
  } catch (error) {
    console.error("Refresh Token Error:", error);
    return serverError(res, "Token refresh failed.");
  }
};

// ─────────────────────────────────────────────────────────────
//  FORGOT PASSWORD — Send OTP
//  POST /api/auth/forgot-password
//  Body: { email }
// ─────────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return badRequest(res, "Email is required");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+otp +otpExpiry +otpAttempts"
    );

    // Security: don't reveal if email exists or not
    if (!user) {
      return successResponse(
        res,
        200,
        "If an account with this email exists, an OTP has been sent."
      );
    }

    // ── Rate limiting: max 3 OTP requests per 10 min ─
    if (user.otpAttempts >= 3 && user.otpExpiry && new Date() < user.otpExpiry) {
      return badRequest(
        res,
        "Too many OTP requests. Please wait 10 minutes before trying again."
      );
    }

    // ── Generate OTP ──────────────────────────────
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();

    // ── Send OTP email ────────────────────────────
    await sendOTPEmail(user.email, user.name, otp);

    return successResponse(
      res,
      200,
      "OTP sent to your registered email address. Valid for 10 minutes."
    );
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return serverError(res, "Failed to send OTP. Please try again.");
  }
};

// ─────────────────────────────────────────────────────────────
//  VERIFY OTP
//  POST /api/auth/verify-otp
//  Body: { email, otp }
// ─────────────────────────────────────────────────────────────
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return badRequest(res, "Email and OTP are required");
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+otp +otpExpiry"
    );

    if (!user) {
      return badRequest(res, "Invalid OTP or email");
    }

    if (!user.isOTPValid(otp)) {
      return badRequest(res, "Invalid or expired OTP. Please request a new one.");
    }

    // OTP is valid — issue a short-lived reset token
    const resetToken = generateAccessToken({
      _id: user._id,
      email: user.email,
      role: "password_reset", // special role for reset only
      name: user.name,
    });

    return successResponse(res, 200, "OTP verified successfully", {
      resetToken, // frontend uses this to call reset-password
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return serverError(res, "OTP verification failed.");
  }
};

// ─────────────────────────────────────────────────────────────
//  RESET PASSWORD
//  POST /api/auth/reset-password
//  Body: { email, otp, newPassword }
// ─────────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return badRequest(res, "Email, OTP, and new password are required");
    }

    if (newPassword.length < 8) {
      return badRequest(res, "Password must be at least 8 characters");
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+otp +otpExpiry +otpAttempts +password"
    );

    if (!user) {
      return badRequest(res, "Invalid request");
    }

    if (!user.isOTPValid(otp)) {
      return badRequest(res, "Invalid or expired OTP. Please request a new one.");
    }

    // ── Update password & clear OTP ───────────────
    user.password = newPassword; // pre-save hook will hash it
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    user.refreshToken = null; // invalidate all existing sessions
    await user.save();

    // Clear any existing session cookie
    clearRefreshTokenCookie(res);

    req.user = { id: user._id, role: user.role };
    await auditLog(req, { action: "PASSWORD_RESET", category: "auth", details: { email: user.email } });

    return successResponse(
      res,
      200,
      "Password reset successful. Please login with your new password."
    );
  } catch (error) {
    console.error("Reset Password Error:", error);
    return serverError(res, "Password reset failed. Please try again.");
  }
};

// ─────────────────────────────────────────────────────────────
//  GET CURRENT USER
//  GET /api/auth/me
//  Requires: valid access token
// ─────────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return notFound(res, "User not found");
    }

    // Update last activity
    user.lastActivity = new Date();
    await user.save();

    return successResponse(res, 200, "User data retrieved", {
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Get Me Error:", error);
    return serverError(res, "Failed to get user data.");
  }
};

// ─────────────────────────────────────────────────────────────
//  UPDATE ACTIVITY (Session Keep-Alive)
//  POST /api/auth/activity
//  Called by frontend every few minutes to track last activity
// ─────────────────────────────────────────────────────────────
export const updateActivity = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      lastActivity: new Date(),
    });

    return successResponse(res, 200, "Activity updated", {
      lastActivity: new Date(),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_MS) || 1800000,
    });
  } catch (error) {
    return serverError(res, "Failed to update activity.");
  }
};
// ── POST /api/auth/invite/:employeeId ────────────────────
// HR/Admin sends invite to an employee to set up their account
export const sendInvite = async (req, res) => {
  try {
    const Employee = (await import("../models/Employee.model.js")).default;
    const crypto   = (await import("crypto")).default;
    const { sendInviteEmail } = await import("../utils/mailer.js");

    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return notFound(res, "Employee not found");

    // Find or create user account for this employee
    let user = await User.findOne({ email: employee.email });
    if (!user) {
      return badRequest(res, "No user account linked to this employee. Please ensure the employee has an email set.");
    }

    // Generate secure invite token — always allowed, resets account setup if needed
    const inviteToken  = crypto.randomBytes(32).toString("hex");
    const inviteExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    user.inviteToken    = inviteToken;
    user.inviteExpiry   = inviteExpiry;
    user.isAccountSetup = false; // reset so they can set a new password
    await user.save();

    // Build setup URL
    const clientUrl  = process.env.CLIENT_URL || "http://localhost:3000";
    const setupUrl   = `${clientUrl}/setup-account?token=${inviteToken}&email=${encodeURIComponent(employee.email)}`;

    // Get inviter name
    const inviter = await User.findById(req.user.id).select("name");

    await sendInviteEmail(
      employee.email,
      `${employee.firstName} ${employee.lastName}`,
      setupUrl,
      inviter?.name || "HR Team",
      user.role
    );

    return successResponse(res, 200, "Invite sent successfully", {
      email: employee.email,
      expiresAt: inviteExpiry,
    });
  } catch (error) {
    console.error("Send Invite Error:", error);
    return serverError(res, "Failed to send invite");
  }
};

// ── POST /api/auth/setup-account ─────────────────────────
// Employee clicks invite link and sets their password
export const setupAccount = async (req, res) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return badRequest(res, "Token, email and password are required");
    }

    if (password.length < 8) {
      return badRequest(res, "Password must be at least 8 characters");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select("+inviteToken +inviteExpiry +password +refreshToken");

    if (!user) return notFound(res, "Account not found");
    if (user.isAccountSetup) return badRequest(res, "Account already set up. Please login.");
    if (!user.inviteToken || user.inviteToken !== token) {
      return unauthorized(res, "Invalid invite link");
    }
    if (new Date() > user.inviteExpiry) {
      return unauthorized(res, "Invite link has expired. Please ask HR to resend the invite.");
    }

    // Set password and mark account as set up
    user.password       = password; // pre-save hook hashes it
    user.isAccountSetup = true;
    user.isVerified     = true;
    user.isActive       = true;
    user.inviteToken    = undefined;
    user.inviteExpiry   = undefined;
    await user.save();

    return successResponse(res, 200, "Account set up successfully! You can now login.", {
      email: user.email,
      name:  user.name,
    });
  } catch (error) {
    console.error("Setup Account Error:", error);
    return serverError(res, "Failed to set up account");
  }
};

// ── Add this to backend/controllers/authController.js ────
// POST /api/auth/verify-password
export const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return badRequest(res, "Password is required");

    const user = await User.findById(req.user.id).select("+password");
    if (!user) return notFound(res, "User not found");

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return unauthorized(res, "Incorrect password");

    return successResponse(res, 200, "Password verified");
  } catch (error) {
    console.error("Verify Password Error:", error);
    return serverError(res, "Failed to verify password");
  }
};

// ── Add this line to backend/routes/auth.routes.js ───────
// router.post("/verify-password", verifyToken, verifyPassword);