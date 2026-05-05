import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    checkIn: {
      time:  { type: Date, default: null },
      note:  { type: String, default: null },
    },

    checkOut: {
      time:  { type: Date, default: null },
      note:  { type: String, default: null },
    },

    // Auto-calculated in hours (e.g. 8.5)
    workingHours: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["present", "absent", "late", "half_day", "holiday", "weekend", "on_leave"],
      default: "absent",
    },

    isLate: {
      type: Boolean,
      default: false,
    },

    lateByMinutes: {
      type: Number,
      default: 0,
    },

    // Who marked this (self-service or admin override)
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Admin override note
    adminNote: {
      type: String,
      default: null,
    },

    isManualEntry: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// One record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

// Auto-calculate working hours when checkOut is set
attendanceSchema.pre("save", function (next) {
  if (this.checkIn?.time && this.checkOut?.time) {
    const diffMs = new Date(this.checkOut.time) - new Date(this.checkIn.time);
    this.workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    // Half day if < 4 hours
    if (this.workingHours < 4 && this.status === "present") {
      this.status = "half_day";
    }
  }
  next();
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
