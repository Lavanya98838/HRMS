import Employee from "../models/Employee.model.js";

/**
 * Generate Employee ID in format: HRMS-2026-001
 * Auto-increments based on existing count
 */
export const generateEmployeeId = async () => {
  const year = new Date().getFullYear();
  const prefix = `HRMS-${year}-`;

  // Find the latest employee ID for this year
  const latest = await Employee.findOne(
    { employeeId: { $regex: `^${prefix}` } },
    { employeeId: 1 },
    { sort: { employeeId: -1 } }
  );

  let nextNumber = 1;

  if (latest?.employeeId) {
    const parts = latest.employeeId.split("-");
    const lastNumber = parseInt(parts[parts.length - 1], 10);
    nextNumber = lastNumber + 1;
  }

  // Pad to 3 digits: 001, 002, ... 099, 100
  const padded = String(nextNumber).padStart(3, "0");
  return `${prefix}${padded}`;
};
