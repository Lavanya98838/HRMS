import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/Employee.model.js';
import User from './models/User.model.js';
import { generateEmployeeId } from './utils/employeeId.js';

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
console.log('✅ Connected');

// Find the user account created during registration
const user = await User.findOne({ email: 'lavanya.ha02@gmail.com' });
if (!user) {
  console.log('❌ User not found');
  process.exit(1);
}

// Check if employee profile already exists
const existing = await Employee.findOne({ user: user._id });
if (existing) {
  console.log('⚠️  Employee profile already exists:', existing.employeeId);
  process.exit(0);
}

const employeeId = await generateEmployeeId();

const employee = await Employee.create({
  user: user._id,
  employeeId,
  firstName: 'Lavanya',   // ← change to your actual first name
  lastName: 'Ha',          // ← change to your actual last name
  email: user.email,
  employmentType: 'full_time',
  dateOfJoining: new Date(),
  gender: 'prefer_not_to_say',
  isActive: true,
});

// Link employeeId back to User
await User.findByIdAndUpdate(user._id, { employeeId });

console.log('✅ Employee profile created:', employee.employeeId);
await mongoose.disconnect();
process.exit(0);