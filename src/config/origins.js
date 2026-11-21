const DEFAULT_CLIENT_URL = "http://localhost:3000";
const DEFAULT_AUTH_URL = "http://localhost:5000";

/**
 * Normalizes an origin by trimming whitespace and trailing slashes.
 * Origins are compared exactly by Better Auth and CORS, so a trailing slash
 * would otherwise make a valid deployment origin look untrusted.
 */
export function normalizeOrigin(value, fallback) {
  const candidate =
    typeof value === "string" && value.trim() ? value.trim() : fallback;
  return candidate.replace(/\/+$/, "");
}

/**
 * Resolves the two public origins used by the API.
 *
 * - CLIENT_URL is always the deployed frontend origin. Browser redirects after
 *   authentication (including OAuth success and error redirects) must use it.
 * - BETTER_AUTH_URL is always the deployed API origin. Google's OAuth callback
 *   goes to this origin, while the final post-login redirect goes to CLIENT_URL.
 */
export function resolveOrigins(env = process.env) {
  const clientUrl = normalizeOrigin(env.CLIENT_URL, DEFAULT_CLIENT_URL);
  const authBaseUrl = normalizeOrigin(env.BETTER_AUTH_URL, DEFAULT_AUTH_URL);

  return {
    clientUrl,
    authBaseUrl,
    signInUrl: `${clientUrl}/sign-in`,
    googleCallbackUrl: `${authBaseUrl}/api/auth/callback/google`,
    trustedOrigins: [clientUrl],
  };
}
