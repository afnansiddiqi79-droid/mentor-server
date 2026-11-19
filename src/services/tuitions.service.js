import { getDB } from "../config/db.js";
import { serialize } from "../utils/http.js";

const TUITION_PUBLIC_PROJECTION = {
  title: 1,
  subject: 1,
  classLevel: 1,
  mode: 1,
  location: 1,
  monthlyFee: 1,
  daysPerWeek: 1,
  bannerImage: 1,
  description: 1,
  tutorName: 1,
  tutorEmail: 1,
  approvalStatus: 1,
  isActive: 1,
  createdAt: 1,
};

/**
 * Builds the public tuition filter. Only approved + active listings are ever
 * visible through public endpoints.
 */
export function buildPublicTuitionFilter({ search = "", subject = "", classLevel = "", mode = "" } = {}) {
  const filter = { approvalStatus: "approved", isActive: true };

  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: safe, $options: "i" } },
      { subject: { $regex: safe, $options: "i" } },
    ];
  }
  if (subject) filter.subject = subject;
  if (classLevel) filter.classLevel = classLevel;
  if (mode) filter.mode = mode;

  return filter;
}

export async function listPublicTuitions(query) {
  const db = getDB();
  const tuitions = db.collection("tuitions");

  const filter = buildPublicTuitionFilter(query);
  const skip = (query.page - 1) * query.limit;

  const sort =
    query.sort === "fee-asc"
      ? { monthlyFee: 1, createdAt: -1 }
      : query.sort === "fee-desc"
        ? { monthlyFee: -1, createdAt: -1 }
        : { createdAt: -1 };

  const [items, total] = await Promise.all([
    tuitions
      .find(filter, { projection: TUITION_PUBLIC_PROJECTION })
      .sort(sort)
      .skip(skip)
      .limit(query.limit)
      .toArray(),
    tuitions.countDocuments(filter),
  ]);

  return { items: items.map(serialize), total };
}

export async function getPublicTuition(id) {
  const db = getDB();
  const tuition = await db.collection("tuitions").findOne(
    { _id: id, approvalStatus: "approved", isActive: true },
    { projection: TUITION_PUBLIC_PROJECTION }
  );
  return serialize(tuition);
}

export async function getTuitionFilterOptions() {
  const db = getDB();
  const [subjects, classLevels] = await Promise.all([
    db.collection("tuitions").distinct("subject", { approvalStatus: "approved", isActive: true }),
    db.collection("tuitions").distinct("classLevel", { approvalStatus: "approved", isActive: true }),
  ]);
  return {
    subjects: subjects.filter(Boolean).sort(),
    classLevels: classLevels.filter(Boolean).sort(),
  };
}
