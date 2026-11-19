import { Router } from "express";
import multer from "multer";
import { verifyToken } from "../middleware/auth.js";
import { ApiError, asyncHandler, sendSuccess } from "../utils/http.js";

const router = Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(
        new ApiError(400, "Unsupported image type. Use JPG, PNG, WebP or GIF.")
      );
    }
    cb(null, true);
  },
});

// POST /api/uploads/image  (multipart/form-data, field name: "image")
router.post(
  "/image",
  verifyToken,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "Please choose an image to upload");

    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      throw new ApiError(
        503,
        "Image uploads are not configured. Add IMGBB_API_KEY to the server environment."
      );
    }

    const form = new FormData();
    form.append("image", req.file.buffer.toString("base64"));
    form.append(
      "name",
      `mentorlagbe-${Date.now()}-${req.user.id.slice(-6)}`
    );

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
      { method: "POST", body: form }
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      throw new ApiError(
        502,
        payload?.error?.message || "ImgBB could not process this image"
      );
    }

    return sendSuccess(res, {
      url: payload.data.url,
      displayUrl: payload.data.display_url,
      thumbnailUrl: payload.data.thumb?.url || payload.data.display_url,
      deleteUrl: payload.data.delete_url,
    });
  })
);

export default router;
