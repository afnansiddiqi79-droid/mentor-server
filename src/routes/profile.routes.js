import { Router } from "express";
import { getDB } from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { profileUpdateSchema } from "../validators/schemas.js";
import { asyncHandler, sendSuccess, serialize, toObjectId } from "../utils/http.js";

const router = Router();

// Only expose the fields the profile UI needs. Auth internals (verification
// flags, ban state, provider metadata, etc.) stay server-side.
const PROFILE_PROJECTION = {
  name: 1,
  email: 1,
  image: 1,
  role: 1,
  plan: 1,
  phone: 1,
  bio: 1,
  createdAt: 1,
  updatedAt: 1,
};

// GET /api/profile/me
router.get(
  "/me",
  verifyToken,
  asyncHandler(async (req, res) => {
    const db = getDB();
    const user = await db
      .collection("users")
      .findOne({ _id: toObjectId(req.user.id) }, { projection: PROFILE_PROJECTION });
    return sendSuccess(res, serialize(user));
  })
);

// PATCH /api/profile/me
router.patch(
  "/me",
  verifyToken,
  validate(profileUpdateSchema),
  asyncHandler(async (req, res) => {
    const db = getDB();
    const id = toObjectId(req.user.id);
    const update = { ...req.body, updatedAt: new Date() };

    await db.collection("users").updateOne({ _id: id }, { $set: update });
    const user = await db
      .collection("users")
      .findOne({ _id: id }, { projection: PROFILE_PROJECTION });
    return sendSuccess(res, serialize(user));
  })
);

export default router;
