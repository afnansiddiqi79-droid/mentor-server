import { ApiError } from "../utils/http.js";

/**
 * Validates req.body / req.query / req.params with a Zod schema.
 * On success the parsed (and coerced) value replaces the original.
 */
export function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || source,
        message: issue.message,
      }));
      return next(new ApiError(422, "Please check the submitted values", details));
    }
    if (source === "query") {
      // Express 5 exposes req.query as a getter; store parsed data separately.
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }
    next();
  };
}
