import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  // If null → global company document
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null,
  },
  isGlobal: { type: Boolean, default: false },

  name:        { type: String, required: true },       // display name
  description: { type: String, default: "" },
  category: {
    type: String,
    enum: ["contract", "resume", "id_proof", "policy", "handbook", "other"],
    default: "other",
  },

  // Cloudinary fields
  fileUrl:      { type: String, required: true },
  publicId:     { type: String, required: true },      // cloudinary public_id for deletion
  fileType:     { type: String, required: true },      // "pdf" | "image"
  mimeType:     { type: String },
  fileSize:     { type: Number },                      // bytes

  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { timestamps: true });

documentSchema.index({ employee: 1, createdAt: -1 });
documentSchema.index({ isGlobal: 1, createdAt: -1 });

export default mongoose.model("Document", documentSchema);
