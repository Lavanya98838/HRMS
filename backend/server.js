import "./env.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import connectDB from "./config/db.js";
import { verifyMailer } from "./utils/mailer.js";
import authRoutes from "./routes/auth.routes.js";
import employeeRoutes   from "./routes/employee.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import roleRoutes       from "./routes/role.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import leaveRoutes      from "./routes/leave.routes.js";
import payrollRoutes   from "./routes/payroll.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import documentRoutes     from "./routes/document.routes.js";
import performanceRoutes  from "./routes/performanceReview.routes.js";
import shiftRoutes        from "./routes/shift.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import goalRoutes         from "./routes/goal.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import predictiveRoutes from "./routes/predictive.routes.js";
import aiRoutes from "./routes/ai.routes.js";

// ── Initialize Express ────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────────────────────
//  MIDDLEWARE
// ─────────────────────────────────────────────────────────────

// ── Helmet — secure HTTP headers ─────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // allow Cloudinary images
  contentSecurityPolicy: false, // disabled — frontend handles its own CSP
}));

// ── Rate Limiting ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,                  // max 500 requests per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 auth attempts per IP per 15 min (login/register)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
});

// Separate, lenient limiter for token refresh — must not block legitimate multi-tab users
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 120,                  // 120 refresh calls per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failed refresh attempts toward limit
  message: { success: false, message: "Too many token refresh attempts. Please login again." },
});

app.use("/api", globalLimiter);           // apply globally to all API routes
app.use("/api/auth/refresh", refreshLimiter); // lenient limit for token refresh only
app.use("/api/auth", authLimiter);        // stricter limit on all other auth routes

// ── NoSQL Injection Prevention ────────────────────────────────
app.use(mongoSanitize({
  replaceWith: "_",           // replace $ and . in keys with _
}));

// CORS — allow frontend origin with credentials
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,       // required for HttpOnly cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON bodies
app.use(express.json({ limit: "10mb" }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── HTTP Parameter Pollution Prevention ──────────────────────
app.use(hpp());

// Parse cookies (needed for refresh token HttpOnly cookie)
app.use(cookieParser());

// ─────────────────────────────────────────────────────────────
//  ROUTES
// ─────────────────────────────────────────────────────────────

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 HRMS Backend API is running",
    version: "1.0.0",
    phase: "Phase 1 — Authentication System",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Auth routes
app.use("/api/auth", authRoutes);
app.use("/api/employees",   employeeRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/roles",       roleRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave",      leaveRoutes);
app.use("/api/payroll",    payrollRoutes);
app.use("/api/analytics",  analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/documents",     documentRoutes);
app.use("/api/performance",    performanceRoutes);
app.use("/api/shifts",         shiftRoutes);
app.use("/api/announcements",  announcementRoutes);
app.use("/api/goals",          goalRoutes);
app.use("/api/audit", auditRoutes); 
app.use("/api/predictive", predictiveRoutes);
app.use("/api/ai", aiRoutes); 

// ─────────────────────────────────────────────────────────────
//  FUTURE ROUTES (uncomment as phases are built)
// ─────────────────────────────────────────────────────────────
// app.use("/api/employees", employeeRoutes);     // Phase 2
// app.use("/api/departments", departmentRoutes); // Phase 2
// app.use("/api/attendance", attendanceRoutes);  // Phase 3
// app.use("/api/leaves", leaveRoutes);           // Phase 3
// app.use("/api/payroll", payrollRoutes);        // Phase 4
// app.use("/api/notifications", notifRoutes);    // Phase 5
// app.use("/api/documents", documentRoutes);     // Phase 5
// app.use("/api/performance", performanceRoutes);// Phase 6

// ─────────────────────────────────────────────────────────────
//  404 HANDLER
// ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─────────────────────────────────────────────────────────────
//  GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    success: false,
    message: "Something went wrong on the server",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
});

// ─────────────────────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Verify mailer connection
    await verifyMailer();

    // Start listening
    app.listen(PORT, () => {
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`  🚀 HRMS Backend running on port ${PORT}`);
      console.log(`  🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`  🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`  📧 Mailer: Gmail (Nodemailer)`);
      console.log(`  🔒 Security: Helmet + Rate Limit + Sanitize`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();