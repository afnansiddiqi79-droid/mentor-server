import { ObjectId } from "mongodb";

export class ApiError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/** Wraps async route handlers so rejected promises reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function sendSuccess(res, data, status = 200, meta = undefined) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function toObjectId(id, label = "id") {
  if (typeof id !== "string" || !ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return new ObjectId(id);
}

/** Converts Mongo _id to a string `id` and keeps everything else. */
export function serialize(doc) {
  if (!doc) return null;
  if (Array.isArray(doc)) return doc.map(serialize);
  const { _id, ...rest } = doc;
  return { ...rest, id: _id ? _id.toString() : rest.id };
}

export function parsePagination(query, defaultLimit = 9, maxLimit = 50) {
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const rawLimit = Number.parseInt(query.limit ?? String(defaultLimit), 10) || defaultLimit;
  const limit = Math.min(Math.max(1, rawLimit), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function paginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  };
}
