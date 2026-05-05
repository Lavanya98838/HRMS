/**
 * ─────────────────────────────────────────────────────────────
 *  ADMIN SEEDER
 *  Creates the first admin account in the system
 *
 *  Usage:
 *    node utils/seedAdmin.js
 *
 *  Run this ONCE after setting up the backend to create admin
 * ─────────────────────────────────────────────────────────────
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.model.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "hrms_db" });
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("⚠️  Admin already exists:", existingAdmin.email);
      process.exit(0);
    }

    // Create default admin
    const admin = await User.create({
      name: "System Administrator",
      email: "lavanyahardas7@gmail.com",         // ← Change this
      password: "Lavanya98838@",          // ← Change this immediately after first login
      role: "admin",
      isVerified: true,
      isActive: true,
    });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  ✅ Admin account created successfully!");
    console.log(`  📧 Email:    ${admin.email}`);
    console.log(`  🔑 Password: Admin@12345`);
    console.log("  ⚠️  CHANGE THE PASSWORD IMMEDIATELY AFTER LOGIN!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeder Error:", error.message);
    process.exit(1);
  }
};

seedAdmin();
