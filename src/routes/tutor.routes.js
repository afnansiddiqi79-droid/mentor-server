import { Router } from "express";
import { getDB } from "../config/db.js";
import { verifyTutor } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  activeStatusSchema,
  applicationStatusSchema,
  tuitionCreateSchema,
  tuitionUpdateSchema,
} from "../validators/schemas.js";
import {
  ApiError,
  asyncHandler,
  sendSuccess,
  serialize,
  toObjectId,
} from "../utils/http.js";

const router = Router();

const FREE_PLAN_TUITION_LIMIT = 2;

async function findOwnedTuition(db, id, tutorEmail) {
  const tuition = await db.collection("tuitions").findOne({ _id: id });
  if (!tuition) throw new ApiError(404, "Tuition not found");
  if (tuition.tutorEmail !== tutorEmail) {
    throw new ApiError(403, "You can only manage tuitions that you posted");
  }
  return tuition;
}

// POST /api/tutor/tuitions
router.post(
  "/tuitions",
  verifyTutor,
  validate(tuitionCreateSchema),
  asyncHandler(async (req, res) => {
    const db = getDB();
    const user = req.user;

    if (user.plan !== "pro") {
      const count = await db
        .collection("tuitions")
        .countDocuments({ tutorEmail: user.email });
      if (count >= FREE_PLAN_TUITION_LIMIT) {
        throw new ApiError(
          403,
          `The Free plan allows ${FREE_PLAN_TUITION_LIMIT} tuition posts. Upgrade to Pro for unlimited posts.`
        );
      }
    }

    const doc = {
      ...req.body,
      tutorName: user.name,
      tutorEmail: user.email,
      approvalStatus: "pending",
      isActive: true,
      createdAt: new Date(),
    };

    const result = await db.collection("tuitions").insertOne(doc);
    return sendSuccess(res, serialize({ ...doc, _id: result.insertedId }), 201);
  })
);

// GET /api/tutor/tuitions
router.get(
  "/tuitions",
  verifyTutor,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const tuitions = await db
      .collection("tuitions")
      .find({ tutorEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();

    const tuitionIds = tuitions.map((item) => item._id);
    const counts = tuitionIds.length
      ? await db
          .collection("applications")
          .aggregate([
            { $match: { tuitionId: { $in: tuitionIds } } },
            { $group: { _id: "$tuitionId", count: { $sum: 1 } } },
          ])
          .toArray()
      : [];

    const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));
    return sendSuccess(
      res,
      tuitions.map((tuition) => ({
        ...serialize(tuition),
        applicantCount: countMap.get(tuition._id.toString()) || 0,
      }))
    );
  })
);

// GET /api/tutor/tuitions/:id — ownership-aware details for the edit form
router.get(
  "/tuitions/:id",
  verifyTutor,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const id = toObjectId(req.params.id, "tuition id");
    const tuition = await findOwnedTuition(db, id, req.user.email);
    return sendSuccess(res, serialize(tuition));
  })
);

// PATCH /api/tutor/tuitions/:id — edit content (approval status is admin-only)
router.patch(
  "/tuitions/:id",
  verifyTutor,
  validate(tuitionUpdateSchema),
  asyncHandler(async (req, res) => {
    const db = getDB();
    const id = toObjectId(req.params.id, "tuition id");
    await findOwnedTuition(db, id, req.user.email);

    const update = { ...req.body, updatedAt: new Date() };
    await db.collection("tuitions").updateOne({ _id: id }, { $set: update });
    const updated = await db.collection("tuitions").findOne({ _id: id });
    return sendSuccess(res, serialize(updated));
  })
);

// PATCH /api/tutor/tuitions/:id/status — open / close a listing
router.patch(
  "/tuitions/:id/status",
  verifyTutor,
  validate(activeStatusSchema),
  asyncHandler(async (req, res) => {
    const db = getDB();
    const id = toObjectId(req.params.id, "tuition id");
    await findOwnedTuition(db, id, req.user.email);

    await db
      .collection("tuitions")
      .updateOne({ _id: id }, { $set: { isActive: req.body.isActive, updatedAt: new Date() } });
    const updated = await db.collection("tuitions").findOne({ _id: id });
    return sendSuccess(res, serialize(updated));
  })
);

// DELETE /api/tutor/tuitions/:id
router.delete(
  "/tuitions/:id",
  verifyTutor,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const id = toObjectId(req.params.id, "tuition id");
    await findOwnedTuition(db, id, req.user.email);

    await Promise.all([
      db.collection("tuitions").deleteOne({ _id: id }),
      db.collection("applications").deleteMany({ tuitionId: id }),
    ]);
    return sendSuccess(res, { id: req.params.id, deleted: true });
  })
);

// GET /api/tutor/applications — applicants for this tutor's posts
router.get(
  "/applications",
  verifyTutor,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const applications = await db
      .collection("applications")
      .find({ tutorEmail: req.user.email })
      .sort({ appliedAt: -1 })
      .toArray();
    return sendSuccess(res, applications.map(serialize));
  })
);

// PATCH /api/tutor/applications/:id — accept / reject (ownership enforced)
router.patch(
  "/applications/:id",
  verifyTutor,
  validate(applicationStatusSchema),
  asyncHandler(async (req, res) => {
    const db = getDB();
    const id = toObjectId(req.params.id, "application id");
    const application = await db.collection("applications").findOne({ _id: id });

    if (!application) throw new ApiError(404, "Application not found");
    if (application.tutorEmail !== req.user.email) {
      throw new ApiError(403, "You can only review applications for your own tuitions");
    }
    if (application.status !== "pending") {
      throw new ApiError(400, "This application has already been reviewed");
    }

    await db
      .collection("applications")
      .updateOne(
        { _id: id },
        { $set: { status: req.body.status, reviewedAt: new Date() } }
      );
    const updated = await db.collection("applications").findOne({ _id: id });
    return sendSuccess(res, serialize(updated));
  })
);

// GET /api/tutor/stats
router.get(
  "/stats",
  verifyTutor,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const tuitions = db.collection("tuitions");
    const applications = db.collection("applications");

    const [totalTuitions, approved, pendingApproval, active, totalApplicants, newApplicants, recent] =
      await Promise.all([
        tuitions.countDocuments({ tutorEmail: req.user.email }),
        tuitions.countDocuments({ tutorEmail: req.user.email, approvalStatus: "approved" }),
        tuitions.countDocuments({ tutorEmail: req.user.email, approvalStatus: "pending" }),
        tuitions.countDocuments({ tutorEmail: req.user.email, isActive: true }),
        applications.countDocuments({ tutorEmail: req.user.email }),
        applications.countDocuments({ tutorEmail: req.user.email, status: "pending" }),
        applications
          .find({ tutorEmail: req.user.email })
          .sort({ appliedAt: -1 })
          .limit(5)
          .toArray(),
      ]);

    return sendSuccess(res, {
      totalTuitions,
      approvedTuitions: approved,
      pendingApproval,
      activeTuitions: active,
      totalApplicants,
      pendingApplicants: newApplicants,
      plan: req.user.plan,
      recentApplicants: recent.map(serialize),
    });
  })
);

export default router;
