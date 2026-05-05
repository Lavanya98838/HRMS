import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  title:   { type: String, required: true },
  content: { type: String, required: true },
  author:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Target audience
  targetType: {
    type: String,
    enum: ["all", "department", "role"],
    default: "all",
  },
  targetDepartments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Department" }],
  targetRoles: [{ type: String }], // "employee", "manager", etc.

  priority: {
    type: String,
    enum: ["normal", "important", "urgent"],
    default: "normal",
  },

  isPinned:  { type: Boolean, default: false },
  isActive:  { type: Boolean, default: true },
  expiresAt: { type: Date }, // optional expiry

  // Track who has read it
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

announcementSchema.index({ isActive: 1, createdAt: -1 });
announcementSchema.index({ isPinned: 1, createdAt: -1 });

export default mongoose.model("Announcement", announcementSchema);
