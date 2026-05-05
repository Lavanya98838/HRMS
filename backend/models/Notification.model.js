import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: [
      "leave_submitted",
      "leave_approved",
      "leave_rejected",
      "payroll_generated",
      "document_uploaded",
      "document_deleted",
      "profile_updated",
    ],
    required: true,
  },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  isRead:  { type: Boolean, default: false },
  link:    { type: String }, // optional frontend route to navigate to
  meta:    { type: mongoose.Schema.Types.Mixed }, // extra data (leaveId, payrollId etc.)
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export default mongoose.model("Notification", notificationSchema);
