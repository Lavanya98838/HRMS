import mongoose from "mongoose";

const performanceReviewSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },

  // Manager assigned by HR to fill this review
  assignedManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null,
  },

  // Who created the review shell (HR)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Who filled in the ratings (Manager)
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  // Role of the person who last acted
  reviewerRole: {
    type: String,
    enum: ["admin", "hr", "manager"],
  },

  period: {
    type: String,
    enum: ["quarterly"],
    default: "quarterly",
  },
  quarter: { type: Number, min: 1, max: 4 },
  year:    { type: Number, required: true },

  // Ratings (1-5) — optional until manager fills them
  ratings: {
    workQuality:   { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    punctuality:   { type: Number, min: 1, max: 5 },
    teamwork:      { type: Number, min: 1, max: 5 },
    initiative:    { type: Number, min: 1, max: 5 },
  },

  overallRating:  { type: Number, min: 1, max: 5 },
  comments:       { type: String, default: "" },
  strengths:      { type: String, default: "" },
  improvements:   { type: String, default: "" },

  // HR creates → pending_manager
  // Manager fills → submitted
  // Employee acknowledges → acknowledged
  status: {
    type: String,
    enum: ["pending_manager", "submitted", "acknowledged"],
    default: "pending_manager",
  },

  acknowledgedAt: { type: Date },
  submittedAt:    { type: Date },
}, { timestamps: true });

// Auto-calculate overall rating before save (only if all ratings present)
performanceReviewSchema.pre("save", function (next) {
  const r = this.ratings;
  if (r && r.workQuality && r.communication && r.punctuality && r.teamwork && r.initiative) {
    const avg = (r.workQuality + r.communication + r.punctuality + r.teamwork + r.initiative) / 5;
    this.overallRating = Math.round(avg * 10) / 10;
  }
  next();
});

performanceReviewSchema.index({ employee: 1, year: 1, quarter: 1 });
performanceReviewSchema.index({ status: 1 });

export default mongoose.model("PerformanceReview", performanceReviewSchema);