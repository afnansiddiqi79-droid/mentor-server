import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

dotenv.config({ quiet: true });

const { connectDB, getDB, closeDB } = await import("./src/config/db.js");
const { createAuth } = await import("./src/config/auth.js");
const { errorHandler, notFoundHandler } = await import("./src/middleware/error.js");
const { securityHeaders } = await import("./src/middleware/security.js");
const { stripeWebhookHandler } = await import("./src/routes/payments.routes.js");

const { default: tuitionsRouter } = await import("./src/routes/tuitions.routes.js");
const { default: studentRouter } = await import("./src/routes/student.routes.js");
const { default: tutorRouter } = await import("./src/routes/tutor.routes.js");
const { default: adminRouter } = await import("./src/routes/admin.routes.js");
const { default: profileRouter } = await import("./src/routes/profile.routes.js");
const { default: paymentsRouter } = await import("./src/routes/payments.routes.js");
const { default: uploadsRouter } = await import("./src/routes/uploads.routes.js");
const { default: statsRouter } = await import("./src/routes/stats.routes.js");

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(securityHeaders);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:5000";

const allowedOrigins = new Set(
  [CLIENT_URL, BETTER_AUTH_URL, "http://localhost:3000", "http://127.0.0.1:3000"].filter(
    Boolean
  )
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (
        process.env.NODE_ENV !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "stripe-signature"],
    exposedHeaders: ["set-auth-token"],
  })
);

// ---------------------------------------------------------------------------
// Start the database, then mount Better Auth. The auth handler must be
// registered before express.json() so it can read the raw request body.
// ---------------------------------------------------------------------------
await connectDB();

const auth = createAuth();
app.locals.auth = auth;

app.all("/api/auth/*splat", toNodeHandler(auth));

// Stripe webhook needs the raw body for signature verification.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await getDB().command({ ping: 1 });
    res.json({
      success: true,
      data: {
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      message: "Database is not reachable",
    });
  }
});

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "MentorLagbe API is running",
    docs: "/api/health",
  });
});

app.use("/api/tuitions", tuitionsRouter);
app.use("/api/student", studentRouter);
app.use("/api/tutor", tutorRouter);
app.use("/api/admin", adminRouter);
app.use("/api/profile", profileRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/stats", statsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, () => {
  console.log(`MentorLagbe API listening on ${BETTER_AUTH_URL} (port ${PORT})`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received. Shutting down...`);

  // Do not let a stuck connection keep the process alive forever.
  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async () => {
    await closeDB();
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
  void shutdown("uncaughtException");
});

export default app;
