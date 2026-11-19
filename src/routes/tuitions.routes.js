import { Router } from "express";
import { getTuitionFilterOptions, getPublicTuition, listPublicTuitions } from "../services/tuitions.service.js";
import { asyncHandler, paginationMeta, sendSuccess, toObjectId } from "../utils/http.js";
import { validate } from "../middleware/validate.js";
import { tuitionQuerySchema } from "../validators/schemas.js";

const router = Router();

// GET /api/tuitions?search=&subject=&classLevel=&mode=&page=&limit=&sort=
router.get(
  "/",
  validate(tuitionQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery;
    const { items, total } = await listPublicTuitions(query);
    return sendSuccess(res, items, 200, paginationMeta(total, query.page, query.limit));
  })
);

// GET /api/tuitions/filters — options for the browse filters
router.get(
  "/filters",
  asyncHandler(async (_req, res) => {
    const options = await getTuitionFilterOptions();
    return sendSuccess(res, options);
  })
);

// GET /api/tuitions/:id — public details (approved + active only)
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = toObjectId(req.params.id, "tuition id");
    const tuition = await getPublicTuition(id);
    if (!tuition) {
      return res.status(404).json({ success: false, message: "Tuition not found" });
    }
    return sendSuccess(res, tuition);
  })
);

export default router;
