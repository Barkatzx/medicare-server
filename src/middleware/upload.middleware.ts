// src/middleware/upload.middleware.ts
import multer from "multer";
import path from "path";

// Configure storage (memory storage for Supabase upload)
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// For multiple images
export const uploadMultiple = upload.array("images", 10); // Max 10 images
export const uploadSingle = upload.single("image");

// Wrapper to handle Multer errors
export const handleMulterError = (middleware: any) => {
  return (req: any, res: any, next: any) => {
    middleware(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            success: false,
            error: `Unexpected field: "${err.field}". Please use "images" as the field name for multiple uploads.`,
          });
        }
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: err.message,
        });
      }
      next();
    });
  };
};
