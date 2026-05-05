import mongoose from "mongoose";

const leaveBalanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
    },

    sick: {
      total:     { type: Number, default: 12 },
      used:      { type: Number, default: 0  },
      remaining: { type: Number, default: 12 },
    },

    casual: {
      total:     { type: Number, default: 12 },
      used:      { type: Number, default: 0  },
      remaining: { type: Number, default: 12 },
    },

    paid: {
      total:     { type: Number, default: 15 },
      used:      { type: Number, default: 0  },
      remaining: { type: Number, default: 15 },
    },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ employee: 1, year: 1 }, { unique: true });

// Method to deduct leave days
leaveBalanceSchema.methods.deductLeave = function (leaveType, days) {
  if (!this[leaveType]) throw new Error(`Invalid leave type: ${leaveType}`);
  if (this[leaveType].remaining < days) {
    throw new Error(`Insufficient ${leaveType} leave balance. Available: ${this[leaveType].remaining} days`);
  }
  this[leaveType].used      += days;
  this[leaveType].remaining -= days;
};

// Method to restore leave days (on rejection/cancellation)
leaveBalanceSchema.methods.restoreLeave = function (leaveType, days) {
  if (!this[leaveType]) return;
  this[leaveType].used      = Math.max(0, this[leaveType].used - days);
  this[leaveType].remaining = Math.min(
    this[leaveType].total,
    this[leaveType].remaining + days
  );
};

const LeaveBalance = mongoose.model("LeaveBalance", leaveBalanceSchema);
export default LeaveBalance;
