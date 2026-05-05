import mongoose from "mongoose";

const performanceReviewSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  period: {
    type: String,
    enum: ["monthly", "quarterly", "yearly"],
    default: "quarterly",
  },
  month:  { type: Number },  // 1-12
  quarter:{ type: Number },  // 1-4
  year:   { type: Number, required: true },

  // Ratings (1-5)
  ratings: {
    workQuality:   { type: Number, min: 1, max: 5, required: true },
    communication: { type: Number, min: 1, max: 5, required: true },
    punctuality:   { type: Number, min: 1, max: 5, required: true },
    teamwork:      { type: Number, min: 1, max: 5, required: true },
    initiative:    { type: Number, min: 1, max: 5, required: true },
  },

  overallRating: { type: Number, min: 1, max: 5 }, // auto-calculated
  comments:      { type: String, default: "" },
  strengths:     { type: String, default: "" },
  improvements:  { type: String, default: "" },

  status: {
    type: String,
    enum: ["draft", "submitted", "acknowledged"],
    default: "submitted",
  },
  acknowledgedAt: { type: Date },
}, { timestamps: true });

// Auto-calculate overall rating before save
performanceReviewSchema.pre("save", function (next) {
  const r = this.ratings;
  const avg = (r.workQuality + r.communication + r.punctuality + r.teamwork + r.initiative) / 5;
  this.overallRating = Math.round(avg * 10) / 10;
  next();
});

performanceReviewSchema.index({ employee: 1, year: 1, quarter: 1 });

export default mongoose.model("PerformanceReview", performanceReviewSchema);