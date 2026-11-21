import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { jwt } from "better-auth/plugins";
import { getClient, getDB } from "./db.js";
import { resolveOrigins } from "./origins.js";

/**
 * Better Auth instance. Must be created after the MongoDB connection is ready.
 * The `users` collection is shared with the rest of the application and is
 * extended with the business fields required by MentorLagbe.
 */
export function createAuth() {
  const isProduction = process.env.NODE_ENV === "production";
  const db = getDB();
  const client = getClient();
  const { authBaseUrl, signInUrl, googleCallbackUrl, trustedOrigins } =
    resolveOrigins();

  return betterAuth({
    appName: "MentorLagbe",
    baseURL: authBaseUrl,
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET,
    database: mongodbAdapter(db, { client }),
    trustedOrigins,
    // OAuth failures must return to the frontend, never the API's /error page.
    onAPIError: {
      errorURL: signInUrl,
    },
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
        // Google must return to the API's Better Auth callback. The callback
        // handler then redirects to CLIENT_URL (the frontend) using callbackURL.
        redirectURI: googleCallbackUrl,
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
