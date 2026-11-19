import { fromNodeHeaders } from "better-auth/node";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getDB } from "../config/db.js";
import { ApiError, asyncHandler, toObjectId } from "../utils/http.js";

let jwks = null;

function getJwks() {
  if (!jwks) {
    const base = process.env.BETTER_AUTH_URL || "http://localhost:5000";
    jwks = createRemoteJWKSet(new URL("/api/auth/jwks", base));
  }
  return jwks;
}

async function findUserById(id) {
  const users = getDB().collection("users");
  if (typeof id === "string" && /^[a-f\d]{24}$/i.test(id)) {
    return users.findOne({ _id: toObjectId(id) });
  }
  return users.findOne({ _id: id });
}

/**
 * Authenticates a request using either:
 *  1. A Better Auth JWT (Authorization: Bearer ...) verified against the
 *     plugin's public JWKS (signature + issuer + audience), or
 *  2. The Better Auth session cookie (used by the browser on reload).
 *
 * The role/plan are always re-read from MongoDB, never trusted from the token
 * or from request body/headers.
 */
export const verifyToken = asyncHandler(async (req, _res, next) => {
  const auth = req.app.locals.auth;
  let subject = null;

  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    try {
      const { payload } = await jwtVerify(token, getJwks(), {
        issuer: process.env.JWT_ISSUER || process.env.BETTER_AUTH_URL,
        audience: process.env.JWT_AUDIENCE || process.env.BETTER_AUTH_URL,
      });
      subject = payload.sub;
    } catch {
      // Invalid/expired JWT: fall through to the cookie session.
    }
  }

  if (!subject) {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      subject = session?.user?.id ?? null;
    } catch {
      subject = null;
    }
  }

  if (!subject) throw new ApiError(401, "Authentication required. Please sign in.");

  const user = await findUserById(subject);
  if (!user) throw new ApiError(401, "Account no longer exists.");

  req.user = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    role: user.role || "student",
    phone: user.phone || "",
    bio: user.bio || "",
    plan: user.plan || "free",
    createdAt: user.createdAt,
  };

  next();
});

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, "Authentication required."));
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, "You do not have permission to perform this action.")
      );
    }
    next();
  };
}

// Composite middlewares: verify the identity first, then the role.
export const verifyStudent = [verifyToken, requireRole("student")];
export const verifyTutor = [verifyToken, requireRole("tutor")];
export const verifyAdmin = [verifyToken, requireRole("admin")];
export const verifyAnyUser = [verifyToken];
