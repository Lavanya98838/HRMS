import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "../models/Employee.model.js";
import Payroll  from "../models/Payroll.model.js";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
console.log("✅ Connected to MongoDB");

const employees = await Employee.find({ isActive: true });
console.log(`📋 Found ${employees.length} active employees`);

const now   = new Date();
const month = now.getMonth() + 1;
const year  = now.getFullYear();

let created = 0, skipped = 0;

for (const emp of employees) {
  const exists = await Payroll.findOne({ employee: emp._id, month, year });
  if (exists) { skipped++; continue; }

  const basic      = emp.salary?.basic      || 30000;
  const hra        = emp.salary?.hra        || 12000;
  const allowances = emp.salary?.allowances || 5000;
  const deductions = emp.salary?.deductions || 0;

  await Payroll.create({
    employee:     emp._id,
    month, year,
    basic, hra, allowances,
    deductions,
    taxDeduction:  Math.round((basic + hra + allowances) * 0.1),
    pfDeduction:   Math.round(basic * 0.12),
    lateDeduction: 0,
    workingDays:   22,
    presentDays:   20,
    leaveDays:     1,
    absentDays:    1,
    status:       "generated",
  });
  created++;
}

console.log(`✅ Payroll seeded: ${created} created, ${skipped} skipped`);
await mongoose.disconnect();
process.exit(0);
