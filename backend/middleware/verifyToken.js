import { verifyAccessToken } from "../utils/generateToken.js";
import { unauthorized, forbidden, serverError } from "../utils/response.js";
import User from "../models/User.model.js";

// ─────────────────────────────────────────────────────────────
//  VERIFY TOKEN MIDDLEWARE
//  Protects any route that requires authentication
// ─────────────────────────────────────────────────────────────
export const verifyToken = async (req, res, next) => {
  try {
    // Get token from Authorization header: "Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return unauthorized(res, "Access token missing. Please login.");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return unauthorized(res, "Access token missing.");
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return unauthorized(res, "Session expired. Please refresh your token.");
      }
      return unauthorized(res, "Invalid access token. Please login again.");
    }

    // Check user still exists and is active
    const user = await User.findById(decoded.id).select("isActive role name email");

    if (!user) {
      return unauthorized(res, "Account not found. Please login again.");
    }

    if (!user.isActive) {
      return forbidden(res, "Your account has been deactivated. Contact HR.");
    }

    // ── 30-Minute Session Timeout Check ───────────
    // If lastActivity was more than 30 min ago, reject
    // (Frontend should auto-logout, this is server-side safety net)
    if (user.lastActivity) {
      const timeout = parseInt(process.env.SESSION_TIMEOUT_MS) || 1800000;
      const timeSinceActivity = Date.now() - new Date(user.lastActivity).getTime();

      if (timeSinceActivity > timeout) {
        return unauthorized(
          res,
          "Session timed out due to inactivity. Please login again."
        );
      }
    }

    // Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };

    next();
  } catch (error) {
    console.error("VerifyToken Middleware Error:", error);
    return serverError(res, "Authentication failed.");
  }
};

// ─────────────────────────────────────────────────────────────
//  ROLE GUARD MIDDLEWARE
//  Usage: roleGuard("admin", "hr") → only admin & hr allowed
// ─────────────────────────────────────────────────────────────
export const roleGuard = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, "Authentication required.");
    }

    if (!allowedRoles.includes(req.user.role)) {
      return forbidden(
        res,
        `Access denied. This resource requires one of: [${allowedRoles.join(", ")}] role.`
      );
    }

    next();
  };
};

// ─────────────────────────────────────────────────────────────
//  ROLE HIERARCHY
//  Admin > HR > Manager > Employee
// ─────────────────────────────────────────────────────────────
const ROLE_HIERARCHY = {
  admin: 5,
  subadmin: 4,
  hr: 3,
  manager: 2,
  employee: 1,
};

/**
 * Require minimum role level
 * Usage: requireMinRole("manager") → manager and above
 */
export const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, "Authentication required.");
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      return forbidden(
        res,
        `Access denied. Minimum required role: ${minRole}.`
      );
    }

    next();
  };
};

// ─────────────────────────────────────────────────────────────
//  SELF OR ADMIN GUARD
//  Allows user to access their own data, or admin to access any
// ─────────────────────────────────────────────────────────────
export const selfOrAdmin = (req, res, next) => {
  const { id } = req.params;

  if (req.user.role === "admin" || req.user.id === id) {
    return next();
  }

  return forbidden(res, "You can only access your own data.");
};