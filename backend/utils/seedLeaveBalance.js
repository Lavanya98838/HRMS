/**
 * ─────────────────────────────────────────────────────────────
 *  PHASE 3 SEEDER — Leave Balance
 *  Creates leave balance records for all existing employees
 *
 *  Usage: node utils/seedLeaveBalance.js
 * ─────────────────────────────────────────────────────────────
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import Employee     from "../models/Employee.model.js";
import LeaveBalance from "../models/LeaveBalance.model.js";

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "hrms_db" });
    console.log("✅ Connected to MongoDB\n");

    const year      = new Date().getFullYear();
    const employees = await Employee.find({ isActive: true });

    console.log(`📋 Found ${employees.length} active employees\n`);

    let created = 0;
    let skipped = 0;

    for (const emp of employees) {
      const existing = await LeaveBalance.findOne({ employee: emp._id, year });
      if (existing) {
        console.log(`   ⏭  Skipped: ${emp.firstName} ${emp.lastName} (balance exists)`);
        skipped++;
      } else {
        await LeaveBalance.create({
          employee: emp._id,
          year,
          sick:   { total: 12, used: 0, remaining: 12 },
          casual: { total: 12, used: 0, remaining: 12 },
          paid:   { total: 15, used: 0, remaining: 15 },
        });
        console.log(`   ✅ Created: ${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
        created++;
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  ✅ Leave balances created: ${created}`);
    console.log(`  ⏭  Skipped (already exist): ${skipped}`);
    console.log(`  📅 Year: ${year}`);
    console.log(`  🏖  Sick: 12 | Casual: 12 | Paid: 15`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeder Error:", error.message);
    process.exit(1);
  }
};

seed();
