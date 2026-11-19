import { Router } from "express";
import { getDB } from "../config/db.js";
import { asyncHandler, sendSuccess } from "../utils/http.js";

const router = Router();

// GET /api/stats/public — real platform statistics for the landing page
router.get(
  "/public",
  asyncHandler(async (_req, res) => {
    const db = getDB();
    const users = db.collection("users");
    const tuitions = db.collection("tuitions");
    const applications = db.collection("applications");

    const [totalStudents, totalTutors, totalTuitions, totalApplications, acceptedApplications] =
      await Promise.all([
        users.countDocuments({ role: "student" }),
        users.countDocuments({ role: "tutor" }),
        tuitions.countDocuments({ approvalStatus: "approved", isActive: true }),
        applications.countDocuments({}),
        applications.countDocuments({ status: "accepted" }),
      ]);

    const successRate = totalApplications
      ? Math.round((acceptedApplications / totalApplications) * 100)
      : 0;

    return sendSuccess(res, {
      totalStudents,
      totalTutors,
      totalTuitions,
      totalApplications,
      successRate,
    });
  })
);

export default router;
