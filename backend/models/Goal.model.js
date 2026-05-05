import mongoose from "mongoose";

const goalSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  title:       { type: String, required: true },
  description: { type: String, default: "" },

  category: {
    type: String,
    enum: ["performance", "learning", "project", "personal", "other"],
    default: "performance",
  },

  // OKR fields
  target:   { type: String, default: "" },   // "Achieve 95% customer satisfaction"
  progress: { type: Number, min: 0, max: 100, default: 0 }, // percentage

  status: {
    type: String,
    enum: ["not_started", "in_progress", "on_track", "at_risk", "completed", "cancelled"],
    default: "not_started",
  },

  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },

  dueDate:     { type: Date },
  completedAt: { type: Date },

  quarter: { type: Number, min: 1, max: 4 },
  year:    { type: Number, required: true },

  // Manager notes/feedback
  feedback: { type: String, default: "" },
}, { timestamps: true });

goalSchema.index({ employee: 1, year: 1, quarter: 1 });
goalSchema.index({ employee: 1, status: 1 });

export default mongoose.model("Goal", goalSchema);