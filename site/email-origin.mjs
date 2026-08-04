/**
 * site/email-origin.mjs
 *
 * Canonical origin for outbound email URLs.
 *
 * Priority:
 *   1. siteOrigin (SITE_ORIGIN env var) — always preferred, immune to Host spoofing.
 *   2. Throw in production (isProduction=true) when siteOrigin is absent — fail closed.
 *   3. Derive from request headers in local dev only — with a loud console warning.
 *
 * The exported function takes explicit parameters so it is pure and unit-testable
 * without booting a server.
 */

/**
 * Returns the canonical origin string for use in outbound email URLs.
 *
 * @param {object} req - Node.js IncomingMessage (or any object with a `headers` map)
 * @param {string} siteOrigin - Pre-trimmed value of SITE_ORIGIN (empty string if unset)
 * @param {boolean} isProduction - True when running in a deployed/production environment
 * @returns {string} Origin string, e.g. "https://falsedawn.industries"
 * @throws {Error} When isProduction is true and siteOrigin is empty
 */
export function safeEmailOrigin(req, siteOrigin, isProduction) {
  // 1. Configured canonical origin — always safe.
  if (siteOrigin) return siteOrigin;

  // 2. Production without SITE_ORIGIN: fail closed rather than trust the Host header.
  if (isProduction) {
    throw new Error(
      "SITE_ORIGIN must be set in a production deployment. " +
        "Email URLs cannot fall back to request headers when deployed. " +
        "Set SITE_ORIGIN=https://falsedawn.industries in the environment secrets."
    );
  }

  // 3. Local development only: derive from request headers with a visible warning.
  const proto =
    (req.headers["x-forwarded-proto"] || "").split(",")[0].trim() || "http";
  const host = req.headers.host || "localhost";
  console.warn(
    "[email-origin] SITE_ORIGIN is not set — deriving origin from request headers. " +
      "This is only safe in local development."
  );
  return `${proto}://${host}`;
}
