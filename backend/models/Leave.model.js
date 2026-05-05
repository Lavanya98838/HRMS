import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    leaveType: {
      type: String,
      enum: ["sick", "casual", "paid"],
      required: [true, "Leave type is required"],
    },

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },

    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },

    totalDays: {
      type: Number,
      default: 1,
    },

    isHalfDay: {
      type: Boolean,
      default: false,
    },

    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },

    // Approval info
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: null,
    },

    // Track if balance was already deducted
    balanceDeducted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

leaveSchema.index({ employee: 1, status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });
leaveSchema.index({ status: 1 });

// Auto-calculate total days before save
leaveSchema.pre("save", function (next) {
  if (this.startDate && this.endDate) {
    if (this.isHalfDay) {
      this.totalDays = 0.5;
    } else {
      const diffMs   = new Date(this.endDate) - new Date(this.startDate);
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      this.totalDays = diffDays;
    }
  }
  next();
});

const Leave = mongoose.model("Leave", leaveSchema);
export default Leave;
