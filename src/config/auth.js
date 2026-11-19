import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { jwt } from "better-auth/plugins";
import { getClient, getDB } from "./db.js";

/**
 * Better Auth instance. Must be created after the MongoDB connection is ready.
 * The `users` collection is shared with the rest of the application and is
 * extended with the business fields required by MentorLagbe.
 */
export function createAuth() {
  const isProduction = process.env.NODE_ENV === "production";
  const db = getDB();
  const client = getClient();

  return betterAuth({
    appName: "MentorLagbe",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET,
    database: mongodbAdapter(db, { client }),
    trustedOrigins: [process.env.CLIENT_URL || "http://localhost:3000"],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      },
    },
    user: {
      modelName: "users",
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "student",
          input: true,
        },
        phone: {
          type: "string",
          required: false,
          defaultValue: "",
          input: true,
        },
        bio: {
          type: "string",
          required: false,
          defaultValue: "",
          input: true,
        },
        plan: {
          type: "string",
          required: false,
          defaultValue: "free",
          input: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      useSecureCookies: isProduction,
      defaultCookieAttributes: {
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
        httpOnly: true,
        path: "/",
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            // Public signup may only ever create students or tutors.
            const requestedRole = user.role;
            const safeRole =
              requestedRole === "tutor" || requestedRole === "student"
                ? requestedRole
                : "student";

            return {
              data: {
                ...user,
                role: safeRole,
                plan: "free",
                phone: typeof user.phone === "string" ? user.phone : "",
                bio: typeof user.bio === "string" ? user.bio : "",
              },
            };
          },
        },
      },
    },
    plugins: [
      jwt({
        jwt: {
          issuer: process.env.JWT_ISSUER || process.env.BETTER_AUTH_URL,
          audience: process.env.JWT_AUDIENCE || process.env.BETTER_AUTH_URL,
          expirationTime: "7d",
          definePayload: ({ user }) => ({
            email: user.email,
            name: user.name,
            role: user.role,
            plan: user.plan,
            image: user.image ?? null,
          }),
        },
      }),
    ],
  });
}
