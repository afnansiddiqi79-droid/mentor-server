import { ApiError } from "../utils/http.js";

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, _req, res, _next) {
  // Multer upload errors
  if (err?.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image is too large. Maximum size is 5 MB."
        : `Upload failed: ${err.message}`;
    return res.status(400).json({ success: false, message });
  }

  const status = err instanceof ApiError ? err.status : err.status || 500;

  if (status >= 500) {
    console.error("[server error]", err);
  }

  const body = {
    success: false,
    message:
      status >= 500
        ? "Something went wrong on the server. Please try again."
        : err.message || "Request failed",
  };

  if (err.details) body.errors = err.details;
  if (process.env.NODE_ENV !== "production" && status >= 500) {
    body.debug = err.message;
  }

  res.status(status).json(body);
}
