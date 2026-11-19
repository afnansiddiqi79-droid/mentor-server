import { Router } from "express";
import { getDB } from "../config/db.js";
import { verifyAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { approvalUpdateSchema, roleUpdateSchema } from "../validators/schemas.js";
import {
  ApiError,
  asyncHandler,
  paginationMeta,
  parsePagination,
  sendSuccess,
  serialize,
  toObjectId,
} from "../utils/http.js";

const router = Router();

// GET /api/admin/stats
router.get(
  "/stats",
  verifyAdmin,
  asyncHandler(async (_req, res) => {
    const db = getDB();
    const users = db.collection("users");
    const tuitions = db.collection("tuitions");
    const applications = db.collection("applications");
    const payments = db.collection("payments");

    const [totalUsers, totalTutors, totalStudents, pendingTuitions, approvedTuitions, totalTuitions, totalApplications, revenueAgg, totalTransactions] =
      await Promise.all([
        users.countDocuments({}),
        users.countDocuments({ role: "tutor" }),
        users.countDocuments({ role: "student" }),
        tuitions.countDocuments({ approvalStatus: "pending" }),
        tuitions.countDocuments({ approvalStatus: "approved" }),
        tuitions.countDocuments({}),
        applications.countDocuments({}),
        payments
          .aggregate([
            { $match: { paymentStatus: "paid" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ])
          .toArray(),
        payments.countDocuments({ paymentStatus: "paid" }),
      ]);

    const recentPending = await tuitions
      .find({ approvalStatus: "pending" })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return sendSuccess(res, {
      totalUsers,
      totalTutors,
      totalStudents,
      totalTuitions,
      pendingTuitions,
      approvedTuitions,
      totalApplications,
      totalRevenue: revenueAgg[0]?.total || 0,
      totalTransactions,
      recentPendingTuitions: recentPending.map(serialize),
    });
  })
);

// GET /api/admin/users?search=&role=&page=&limit=
router.get(
  "/users",
  verifyAdmin,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const { page, limit, skip } = parsePagination(req.query, 10, 100);
    const search = String(req.query.search || "").trim();
    const role = String(req.query.role || "").trim();

    const filter = {};
    if (role && ["student", "tutor", "admin"].includes(role)) filter.role = role;
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      db
        .collection("users")
        .find(filter, {
          projection: { name: 1, email: 1, image: 1, role: 1, phone: 1, plan: 1, createdAt: 1 },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("users").countDocuments(filter),
    ]);

    return sendSuccess(res, items.map(serialize), 200, paginationMeta(total, page, limit));
  })
);

// PATCH /api/admin/users/:id/role
router.patch(
  "/users/:id/role",
  verifyAdmin,
  validate(roleUpdateSchema),
  asyncHandler(async (req, res) => {
    const db = getDB();
    const id = toObjectId(req.params.id, "user id");
    const { role } = req.body;

    const target = await db.collection("users").findOne({ _id: id });
    if (!target) throw new ApiError(404, "User not found");

    if (target._id.toString() === req.user.id && role !== "admin") {
      throw new ApiError(400, "You cannot remove your own admin role");
    }

    if (target.role === "admin" && role !== "admin") {
      const adminCount = await db.collection("users").countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        throw new ApiError(400, "At least one admin account must remain");
      }
    }

    await db
      .collection("users")
      .updateOne({ _id: id }, { $set: { role, updatedAt: new Date() } });
    const updated = await db.collection("users").findOne({ _id: id });
    return sendSuccess(res, serialize(updated));
  })
);

// GET /api/admin/tuitions?status=&search=&page=&limit=
router.get(
  "/tuitions",
  verifyAdmin,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const { page, limit, skip } = parsePagination(req.query, 10, 100);
    const status = String(req.query.status || "").trim();
    const search = String(req.query.search || "").trim();

    const filter = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      filter.approvalStatus = status;
    }
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: safe, $options: "i" } },
        { tutorEmail: { $regex: safe, $options: "i" } },
        { subject: { $regex: safe, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      db
        .collection("tuitions")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("tuitions").countDocuments(filter),
    ]);

    return sendSuccess(res, items.map(serialize), 200, paginationMeta(total, page, limit));
  })
);

// PATCH /api/admin/tuitions/:id/approval
router.patch(
  "/tuitions/:id/approval",
  verifyAdmin,
  validate(approvalUpdateSchema),
  asyncHandler(async (req, res) => {
    const db = getDB();
    const id = toObjectId(req.params.id, "tuition id");

    const tuition = await db.collection("tuitions").findOne({ _id: id });
    if (!tuition) throw new ApiError(404, "Tuition not found");

    await db.collection("tuitions").updateOne(
      { _id: id },
      {
        $set: {
          approvalStatus: req.body.approvalStatus,
          reviewedAt: new Date(),
          reviewedBy: req.user.email,
        },
      }
    );
    const updated = await db.collection("tuitions").findOne({ _id: id });
    return sendSuccess(res, serialize(updated));
  })
);

// GET /api/admin/transactions?page=&limit=
router.get(
  "/transactions",
  verifyAdmin,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const { page, limit, skip } = parsePagination(req.query, 10, 100);

    const [items, total, revenueAgg] = await Promise.all([
      db
        .collection("payments")
        .find({})
        .sort({ paidAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("payments").countDocuments({}),
      db
        .collection("payments")
        .aggregate([
          { $match: { paymentStatus: "paid" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
        .toArray(),
    ]);

    return sendSuccess(res, items.map(serialize), 200, {
      ...paginationMeta(total, page, limit),
      revenue: revenueAgg[0]?.total || 0,
    });
  })
);

export default router;
