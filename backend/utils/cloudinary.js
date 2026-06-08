import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

// ── Configure Cloudinary ──────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Memory storage — files go into buffer, we upload manually ──
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for profile pictures"), false);
    }
  },
});

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/jpg",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed. Use PDF, DOC, DOCX, or images."), false);
    }
  },
});

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed for bulk upload"), false);
    }
  },
});

// ── Upload buffer to Cloudinary ───────────────────────
export const uploadToCloudinary = (buffer, mimetype, folder, publicId) => {
  return new Promise((resolve, reject) => {
    const resourceType = mimetype === "application/pdf" ||
      mimetype === "application/msword" ||
      mimetype.includes("wordprocessingml") ? "raw" : "image";

    const options = {
      folder,
      resource_type: resourceType,
      ...(publicId && { public_id: publicId }),
    };

    if (resourceType === "image") {
      options.transformation = [
        { quality: "auto", fetch_format: "auto" },
      ];
    }

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });

    stream.end(buffer);
  });
};

// ── Delete file from Cloudinary ───────────────────────
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.warn("⚠️ Cloudinary delete failed:", error.message);
  }
};

export { cloudinary, avatarUpload, documentUpload, csvUpload };