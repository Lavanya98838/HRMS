import express from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  verifyOTP,
  resetPassword,
  getMe,
  updateActivity,
  sendInvite,
  setupAccount,
  verifyPassword,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";




const router = express.Router();

// ─────────────────────────────────────────────────────────────
//  RATE LIMITERS
// ─────────────────────────────────────────────────────────────

// Strict limit for login attempts (prevent brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,                   // max 50 attempts per 15 min
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP rate limit (prevent spam)
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,                    // max 3 OTP requests per 10 min
  message: {
    success: false,
    message: "Too many OTP requests. Please wait 10 minutes.",
  },
});

// General auth limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

// ─────────────────────────────────────────────────────────────
//  PUBLIC ROUTES (no auth required)
// ─────────────────────────────────────────────────────────────

// Registration
// POST /api/auth/register
// Body: { name, email, password, role: "hr"|"manager"|"employee" }
router.post("/register", authLimiter, register);

// Login (role-specific — role sent in body from the correct portal)
// POST /api/auth/login
// Body: { email, password, role }
router.post("/login", loginLimiter, login);

// Refresh Token (uses HttpOnly cookie automatically)
// POST /api/auth/refresh
router.post("/refresh", refreshToken);

// Forgot Password — sends OTP to email
// POST /api/auth/forgot-password
// Body: { email }
router.post("/forgot-password", otpLimiter, forgotPassword);

// Verify OTP
// POST /api/auth/verify-otp
// Body: { email, otp }
router.post("/verify-otp", authLimiter, verifyOTP);

// Reset Password
// POST /api/auth/reset-password
// Body: { email, otp, newPassword }
router.post("/reset-password", authLimiter, resetPassword);

// ─────────────────────────────────────────────────────────────
//  PROTECTED ROUTES (auth required)
// ─────────────────────────────────────────────────────────────

// Logout
// POST /api/auth/logout
router.post("/logout", verifyToken, logout);

// Get current user profile
// GET /api/auth/me
router.get("/me", verifyToken, getMe);

// Update last activity (called every few minutes by frontend)
// POST /api/auth/activity
router.post("/activity", verifyToken, updateActivity);

// Account setup (invite flow)
// POST /api/auth/setup-account
router.post("/setup-account", setupAccount);

// Send invite to employee (HR/Admin only)
// POST /api/auth/invite/:employeeId
router.post("/invite/:employeeId", verifyToken, sendInvite);

router.post("/verify-password", verifyToken, verifyPassword);

export default router;