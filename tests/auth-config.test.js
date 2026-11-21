import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeOrigin, resolveOrigins } from "../src/config/origins.js";

test("production origins are normalized without trailing slashes", () => {
  const origins = resolveOrigins({
    CLIENT_URL: "https://mentor-app-snowy.vercel.app/",
    BETTER_AUTH_URL: "https://mentor-server-three.vercel.app/",
  });

  assert.equal(origins.clientUrl, "https://mentor-app-snowy.vercel.app");
  assert.equal(origins.authBaseUrl, "https://mentor-server-three.vercel.app");
  assert.equal(
    origins.googleCallbackUrl,
    "https://mentor-server-three.vercel.app/api/auth/callback/google"
  );
  assert.equal(origins.signInUrl, "https://mentor-app-snowy.vercel.app/sign-in");
});

test("post-login and error redirects always use the frontend origin", () => {
  const origins = resolveOrigins({
    CLIENT_URL: "https://frontend.example.com",
    BETTER_AUTH_URL: "https://api.example.com",
  });

  assert.equal(origins.signInUrl, "https://frontend.example.com/sign-in");
  assert.ok(origins.signInUrl.startsWith(origins.clientUrl));
  assert.ok(!origins.signInUrl.includes("/api/auth"));
});

test("Google OAuth callback always uses the backend Better Auth endpoint", () => {
  const origins = resolveOrigins({
    CLIENT_URL: "https://frontend.example.com",
    BETTER_AUTH_URL: "https://api.example.com",
  });

  assert.equal(
    origins.googleCallbackUrl,
    "https://api.example.com/api/auth/callback/google"
  );
  assert.ok(origins.googleCallbackUrl.startsWith(origins.authBaseUrl));
  assert.ok(!origins.googleCallbackUrl.startsWith(origins.clientUrl));
});

test("trustedOrigins contains only the frontend for cross-origin auth", () => {
  const origins = resolveOrigins({
    CLIENT_URL: "https://frontend.example.com",
    BETTER_AUTH_URL: "https://api.example.com",
  });

  assert.deepEqual(origins.trustedOrigins, ["https://frontend.example.com"]);
});

test("local development falls back to localhost origins", () => {
  const origins = resolveOrigins({});

  assert.equal(origins.clientUrl, "http://localhost:3000");
  assert.equal(origins.authBaseUrl, "http://localhost:5000");
  assert.equal(
    origins.googleCallbackUrl,
    "http://localhost:5000/api/auth/callback/google"
  );
  assert.deepEqual(origins.trustedOrigins, ["http://localhost:3000"]);
});

test("normalizeOrigin trims whitespace and ignores blank values", () => {
  assert.equal(
    normalizeOrigin("  https://app.example.com/  ", "fallback"),
    "https://app.example.com"
  );
  assert.equal(
    normalizeOrigin("", "http://localhost:3000"),
    "http://localhost:3000"
  );
  assert.equal(
    normalizeOrigin(undefined, "http://localhost:5000"),
    "http://localhost:5000"
  );
});
