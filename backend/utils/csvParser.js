import { parse } from "csv-parse/sync";

/**
 * Parse CSV buffer into employee data array
 * Expected CSV columns:
 * firstName, lastName, email, phone, department, designation,
 * employmentType, dateOfJoining, gender, basic, hra, allowances
 */
export const parseEmployeeCSV = (buffer) => {
  const records = parse(buffer, {
    columns: true,           // use first row as headers
    skip_empty_lines: true,
    trim: true,
    cast: true,
  });

  const errors = [];
  const valid = [];

  records.forEach((record, index) => {
    const row = index + 2; // +2 because row 1 is headers

    // Required field validation
    if (!record.firstName) errors.push(`Row ${row}: firstName is required`);
    if (!record.lastName)  errors.push(`Row ${row}: lastName is required`);
    if (!record.email)     errors.push(`Row ${row}: email is required`);
    if (!/\S+@\S+\.\S+/.test(record.email)) {
      errors.push(`Row ${row}: invalid email format`);
    }

    // Validate employment type
    const validTypes = ["full_time", "part_time", "contract", "intern"];
    if (record.employmentType && !validTypes.includes(record.employmentType)) {
      errors.push(`Row ${row}: invalid employmentType. Use: ${validTypes.join(", ")}`);
    }

    if (errors.length === 0 || !errors.some(e => e.startsWith(`Row ${row}`))) {
      valid.push({
        firstName:      record.firstName || "",
        lastName:       record.lastName || "",
        email:          record.email?.toLowerCase()?.trim() || "",
        phone:          record.phone?.toString() || null,
        designation:    record.designation || null,
        employmentType: record.employmentType || "full_time",
        gender:         record.gender || "prefer_not_to_say",
        dateOfJoining:  record.dateOfJoining ? new Date(record.dateOfJoining) : new Date(),
        salary: {
          basic:      Number(record.basic) || 0,
          hra:        Number(record.hra) || 0,
          allowances: Number(record.allowances) || 0,
          deductions: Number(record.deductions) || 0,
        },
        _departmentName: record.department || null, // resolved later
      });
    }
  });

  return { valid, errors, total: records.length };
};

/**
 * Generate a CSV template for bulk upload
 */
export const getCSVTemplate = () => {
  const headers = [
    "firstName", "lastName", "email", "phone",
    "department", "designation", "employmentType",
    "gender", "dateOfJoining",
    "basic", "hra", "allowances", "deductions",
  ];

  const sample = [
    "John", "Doe", "john.doe@company.com", "9876543210",
    "Engineering", "Software Developer", "full_time",
    "male", "2026-01-15",
    "50000", "20000", "5000", "2000",
  ];

  return `${headers.join(",")}\n${sample.join(",")}`;
};
