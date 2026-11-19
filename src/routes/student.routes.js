import { Router } from "express";
import { getDB } from "../config/db.js";
import { verifyStudent } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { applicationCreateSchema } from "../validators/schemas.js";
import {
  ApiError,
  asyncHandler,
  sendSuccess,
  serialize,
  toObjectId,
} from "../utils/http.js";

const router = Router();

// POST /api/student/applications
router.post(
  "/applications",
  verifyStudent,
  validate(applicationCreateSchema),
  asyncHandler(async (req, res) => {
    const db = getDB();
    const user = req.user;
    const tuitionId = toObjectId(req.body.tuitionId, "tuition id");

    const tuition = await db.collection("tuitions").findOne({ _id: tuitionId });
    if (!tuition) throw new ApiError(404, "Tuition not found");
    if (tuition.approvalStatus !== "approved" || !tuition.isActive) {
      throw new ApiError(400, "This tuition is not currently open for applications");
    }
    if (tuition.tutorEmail === user.email) {
      throw new ApiError(400, "You cannot apply to your own tuition");
    }

    const existing = await db.collection("applications").findOne({
      tuitionId,
      studentEmail: user.email,
    });
    if (existing) {
      throw new ApiError(409, "You have already applied to this tuition");
    }

    const doc = {
      tuitionId,
      tuitionTitle: tuition.title,
      subject: tuition.subject,
      monthlyFee: tuition.monthlyFee,
      tutorEmail: tuition.tutorEmail,
      studentName: user.name,
      studentEmail: user.email,
      studentPhone: req.body.phone,
      preferredSchedule: req.body.preferredSchedule,
      studentNote: req.body.studentNote || "",
      status: "pending",
      appliedAt: new Date(),
    };

    try {
      const result = await db.collection("applications").insertOne(doc);
      return sendSuccess(
        res,
        serialize({ ...doc, _id: result.insertedId }),
        201
      );
    } catch (error) {
      if (error?.code === 11000) {
        throw new ApiError(409, "You have already applied to this tuition");
      }
      throw error;
    }
  })
);

// GET /api/student/applications
router.get(
  "/applications",
  verifyStudent,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const applications = await db
      .collection("applications")
      .find({ studentEmail: req.user.email })
      .sort({ appliedAt: -1 })
      .toArray();

    const tuitionIds = applications
      .map((item) => item.tuitionId)
      .filter(Boolean);

    const tuitions = tuitionIds.length
      ? await db
          .collection("tuitions")
          .find({ _id: { $in: tuitionIds } })
          .project({ tutorName: 1, isActive: 1, approvalStatus: 1 })
          .toArray()
      : [];

    const tuitionMap = new Map(tuitions.map((item) => [item._id.toString(), item]));

    const data = applications.map((application) => {
      const tuition = tuitionMap.get(application.tuitionId?.toString());
      return {
        ...serialize(application),
        tutorName: tuition?.tutorName || "",
        tuitionIsActive: Boolean(tuition?.isActive),
        tuitionApprovalStatus: tuition?.approvalStatus || "",
      };
    });

    return sendSuccess(res, data);
  })
);

// DELETE /api/student/applications/:id — only pending applications may be cancelled
router.delete(
  "/applications/:id",
  verifyStudent,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const id = toObjectId(req.params.id, "application id");

    const application = await db.collection("applications").findOne({ _id: id });
    if (!application) throw new ApiError(404, "Application not found");
    if (application.studentEmail !== req.user.email) {
      throw new ApiError(403, "You can only cancel your own applications");
    }
    if (application.status !== "pending") {
      throw new ApiError(400, "Only pending applications can be cancelled");
    }

    await db.collection("applications").deleteOne({ _id: id });
    return sendSuccess(res, { id: req.params.id, deleted: true });
  })
);

// GET /api/student/stats
router.get(
  "/stats",
  verifyStudent,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const applications = db.collection("applications");

    const [total, accepted, pending, rejected, recent] = await Promise.all([
      applications.countDocuments({ studentEmail: req.user.email }),
      applications.countDocuments({ studentEmail: req.user.email, status: "accepted" }),
      applications.countDocuments({ studentEmail: req.user.email, status: "pending" }),
      applications.countDocuments({ studentEmail: req.user.email, status: "rejected" }),
      applications
        .find({ studentEmail: req.user.email })
        .sort({ appliedAt: -1 })
        .limit(5)
        .toArray(),
    ]);

    return sendSuccess(res, {
      totalApplications: total,
      accepted,
      pending,
      rejected,
      plan: req.user.plan,
      recentApplications: recent.map(serialize),
    });
  })
);

export default router;
