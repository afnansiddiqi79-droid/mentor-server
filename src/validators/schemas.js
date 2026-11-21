import { z } from "zod";

export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

// Keep image URLs aligned with next.config.ts. This blocks arbitrary remote
// hosts (tracking pixels, mixed content, broken images) while still accepting
// ImgBB uploads, seeded Unsplash banners and Google profile photos.
export const ALLOWED_IMAGE_HOSTS = new Set([
  "i.ibb.co",
  "ibb.co",
  "images.unsplash.com",
  "lh3.googleusercontent.com",
]);

const imageUrlSchema = z
  .string()
  .trim()
  .url("Image must be a valid URL")
  .refine((value) => {
    try {
      return ALLOWED_IMAGE_HOSTS.has(new URL(value).hostname.toLowerCase());
    } catch {
      return false;
    }
  }, "Image must be hosted on ImgBB, Unsplash or Google");

export const tuitionCreateSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(140),
  subject: z.string().trim().min(2, "Subject is required").max(60),
  classLevel: z.string().trim().min(1, "Class level is required").max(60),
  mode: z.enum(["Online", "Offline"]),
  location: z.string().trim().min(2, "Location is required").max(160),
  monthlyFee: z.coerce
    .number()
    .min(0, "Fee cannot be negative")
    .max(1_000_000, "Fee is too large"),
  daysPerWeek: z.coerce
    .number()
    .int("Days per week must be a whole number")
    .min(1, "At least 1 day per week")
    .max(7, "At most 7 days per week"),
  bannerImage: imageUrlSchema,
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(4000),
});

export const tuitionUpdateSchema = tuitionCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update"
);

export const applicationCreateSchema = z.object({
  tuitionId: objectIdSchema,
  phone: z
    .string()
    .trim()
    .min(6, "Phone number is too short")
    .max(24, "Phone number is too long"),
  preferredSchedule: z
    .string()
    .trim()
    .min(3, "Preferred schedule is required")
    .max(160),
  studentNote: z.string().trim().max(1000, "Note is too long").optional().default(""),
});

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(80).optional(),
    phone: z.string().trim().max(24, "Phone number is too long").optional(),
    bio: z.string().trim().max(600, "Bio must be under 600 characters").optional(),
    image: z.union([imageUrlSchema, z.literal("")]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field");

export const roleUpdateSchema = z.object({
  role: z.enum(["student", "tutor", "admin"]),
});

export const approvalUpdateSchema = z.object({
  approvalStatus: z.enum(["approved", "rejected"]),
});

export const applicationStatusSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
});

export const activeStatusSchema = z.object({
  isActive: z.boolean(),
});

export const checkoutSchema = z.object({
  planName: z.literal("pro").optional(),
});

export const tuitionQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  subject: z.string().trim().max(60).optional().default(""),
  classLevel: z.string().trim().max(60).optional().default(""),
  mode: z.enum(["", "Online", "Offline"]).optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(9),
  sort: z.enum(["newest", "fee-asc", "fee-desc"]).optional().default("newest"),
});
