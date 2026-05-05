/**
 * ─────────────────────────────────────────────────────────────
 *  PHASE 2 SEEDER
 *  Seeds default departments and roles
 *
 *  Usage: node utils/seedDepartments.js
 *  Run once after Phase 2 setup
 * ─────────────────────────────────────────────────────────────
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import Department from "../models/Department.model.js";
import Role from "../models/Role.model.js";

dotenv.config();

const DEFAULT_DEPARTMENTS = [
  { name: "Human Resources",       code: "HR",      description: "Manages employee relations, hiring, and company culture" },
  { name: "Engineering",           code: "ENG",     description: "Software development, architecture, and technical operations" },
  { name: "Sales",                 code: "SALES",   description: "Revenue generation, client relations, and business development" },
  { name: "Marketing",             code: "MKT",     description: "Brand management, campaigns, and market research" },
  { name: "Finance",               code: "FIN",     description: "Financial planning, accounting, and budget management" },
  { name: "Operations",            code: "OPS",     description: "Day-to-day business operations and process management" },
  { name: "Product Management",    code: "PM",      description: "Product strategy, roadmap, and cross-team coordination" },
  { name: "Customer Support",      code: "CS",      description: "Customer service, issue resolution, and satisfaction" },
  { name: "Legal & Compliance",    code: "LEGAL",   description: "Legal affairs, contracts, and regulatory compliance" },
  { name: "Information Technology",code: "IT",      description: "IT infrastructure, security, and systems management" },
];

const DEFAULT_ROLES = [
  // ── HR ──────────────────────────────────────────────
  { name: "HR Manager",        level: 7, description: "Leads HR operations and team" },
  { name: "HR Executive",      level: 4, description: "Handles recruitment and employee relations" },
  { name: "HR Intern",         level: 1, description: "Entry-level HR position" },

  // ── Engineering ─────────────────────────────────────
  { name: "CTO",                level: 10, description: "Chief Technology Officer" },
  { name: "Engineering Manager",level: 8,  description: "Leads engineering teams" },
  { name: "Senior Developer",   level: 6,  description: "Senior software engineer" },
  { name: "Developer",          level: 4,  description: "Software engineer" },
  { name: "Junior Developer",   level: 2,  description: "Entry-level developer" },
  { name: "Intern Developer",   level: 1,  description: "Development intern" },

  // ── Sales ────────────────────────────────────────────
  { name: "Sales Director",    level: 9, description: "Leads sales strategy" },
  { name: "Sales Manager",     level: 7, description: "Manages sales team" },
  { name: "Sales Executive",   level: 4, description: "Handles client accounts" },
  { name: "Sales Intern",      level: 1, description: "Sales intern" },

  // ── Finance ──────────────────────────────────────────
  { name: "CFO",               level: 10, description: "Chief Financial Officer" },
  { name: "Finance Manager",   level: 7,  description: "Manages financial operations" },
  { name: "Accountant",        level: 4,  description: "Handles accounts and bookkeeping" },

  // ── Management ───────────────────────────────────────
  { name: "CEO",               level: 10, description: "Chief Executive Officer" },
  { name: "COO",               level: 10, description: "Chief Operating Officer" },
  { name: "Department Head",   level: 8,  description: "Leads a department" },
  { name: "Team Lead",         level: 6,  description: "Leads a team within a department" },
  { name: "Project Manager",   level: 6,  description: "Manages projects and timelines" },

  // ── Product ───────────────────────────────────────────
  { name: "Product Manager",   level: 7, description: "Owns product roadmap and strategy" },
  { name: "Product Designer",  level: 5, description: "UX/UI design and user research" },

  // ── General ───────────────────────────────────────────
  { name: "Analyst",           level: 3, description: "Data and business analysis" },
  { name: "Consultant",        level: 5, description: "Domain expert and advisor" },
  { name: "Intern",            level: 1, description: "General internship role" },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "hrms_db" });
    console.log("✅ Connected to MongoDB\n");

    // ── Seed Departments ──────────────────────────────
    console.log("📁 Seeding departments...");
    let deptCreated = 0;
    let deptSkipped = 0;

    for (const dept of DEFAULT_DEPARTMENTS) {
      const existing = await Department.findOne({ code: dept.code });
      if (existing) {
        console.log(`   ⏭  Skipped: ${dept.name} (already exists)`);
        deptSkipped++;
      } else {
        await Department.create(dept);
        console.log(`   ✅ Created: ${dept.name} (${dept.code})`);
        deptCreated++;
      }
    }

    // ── Seed Roles ────────────────────────────────────
    console.log("\n🎭 Seeding roles...");
    let roleCreated = 0;
    let roleSkipped = 0;

    for (const role of DEFAULT_ROLES) {
      const existing = await Role.findOne({ name: role.name, department: null });
      if (existing) {
        console.log(`   ⏭  Skipped: ${role.name} (already exists)`);
        roleSkipped++;
      } else {
        await Role.create({ ...role, department: null });
        console.log(`   ✅ Created: ${role.name} (Level ${role.level})`);
        roleCreated++;
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  ✅ Departments: ${deptCreated} created, ${deptSkipped} skipped`);
    console.log(`  ✅ Roles:       ${roleCreated} created, ${roleSkipped} skipped`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeder Error:", error.message);
    process.exit(1);
  }
};

seed();
