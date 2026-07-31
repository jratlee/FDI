import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import pg from "pg";
import { RateLimiterMemory, RateLimiterPostgres } from "rate-limiter-flexible";
import {
  sendConfirmationRequest,
  sendWelcomeEmails,
  sendPendingSignupNotification,
  sendKeyRecoveryEmail,
} from "./email.mjs";
import { runAudit } from "../skillfoundry/engine/audit.mjs";
import { validateReport } from "../skillfoundry/schema/validate.mjs";
import {
  TIERS,
  CommerceError,
  createCheckoutSession,
  fulfillSession,
  getEntitlementBySession,
  constructEvent,
  handleEvent,
  validateKey,
  createPortalSession,
  getEntitlementByKey,
  getEntitlementsByEmail,
  stripeConfigured,
  storageConfigured as commerceStorage,
} from "./commerce.mjs";
import {
  DEFRAG_LIMITS,
  DefragError,
  aiConfigured,
  purgeExpiredReports,
  countReportsToday,
  listReports,
  getReport,
  deleteReport,
  generateReport,
} from "./defrag.mjs";
import { renderReportHTML, renderReportPDF } from "./defrag-report.mjs";
import {
  STAGES,
  SEGMENTS,
  GOAL,
  pipelineConfigured,
  listTargets,
  getTarget,
  saveTarget,
  deleteTarget,
  pipelineStats,
} from "./pipeline.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";
const ADMIN_TOKEN = process.env.WAITLIST_ADMIN_TOKEN || "";
// Canonical site origin used in outbound email links so they can never be
// spoofed via a forged Host / X-Forwarded-Proto header. Set SITE_ORIGIN to
// the production URL (e.g. "https://falsedawn.industries") in the environment.
// Falls back to deriving from the request only for local / dev contexts where
// the env var is not configured.
const SITE_ORIGIN = (process.env.SITE_ORIGIN || "").replace(/\/+$/, "");
// CRON_SECRET protects /api/cron/link-check from arbitrary callers.
// If unset, the endpoint is disabled (404). Set it to any random string and
// pass it as the `secret` query param or Authorization: Bearer header when
// triggering the cron (e.g. from a Replit Scheduled Deployment or cron-job.org).
const CRON_SECRET = (process.env.CRON_SECRET || "").trim();

/* ---------------- waitlist storage (Postgres) ---------------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 })
  : null;

/* ---------------- abuse protection ---------------- */
// Per-IP rate limit: a modest number of signup attempts per IP per hour.
//
// Counters are persisted in Postgres (the same `DATABASE_URL` the waitlist
// uses) so they survive restarts/deploys and are shared across all autoscale
// instances. A determined bot can no longer reset its budget by waiting for a
// restart or spraying different instances. A RateLimiterMemory acts as the
// "insurance" limiter: if Postgres is briefly unreachable, the limiter falls
// back to per-instance in-memory counting instead of failing open entirely.
// When there is no DATABASE_URL at all, we degrade to the memory limiter.
const RL_OPTS = {
  keyPrefix: "wl",
  points: 8, // attempts allowed
  duration: 60 * 60, // per hour (seconds)
  blockDuration: 60 * 60, // stay blocked for an hour once exceeded
};
const waitlistLimiter = pool
  ? new RateLimiterPostgres(
      {
        ...RL_OPTS,
        storeClient: pool,
        storeType: "pool",
        tableName: "rate_limits",
        clearExpiredByTimeout: true, // periodically purge stale rows
        insuranceLimiter: new RateLimiterMemory(RL_OPTS),
      },
      (err) => {
        if (err) {
          console.error("[ratelimit] Postgres store init failed:", err.message);
        } else {
          console.log("[ratelimit] using Postgres-backed store (table: rate_limits)");
        }
      }
    )
  : new RateLimiterMemory(RL_OPTS);

// Per-IP rate limit for the key-recovery manage endpoint: tighter than the
// waitlist limiter to slow down email-enumeration attempts.
const MANAGE_RL_OPTS = {
  keyPrefix: "mgmt",
  points: 5,           // requests allowed
  duration: 60 * 15,  // per 15 minutes (seconds)
  blockDuration: 60 * 60,
};
const manageLimiter = pool
  ? new RateLimiterPostgres(
      {
        ...MANAGE_RL_OPTS,
        storeClient: pool,
        storeType: "pool",
        tableName: "rate_limits",
        clearExpiredByTimeout: true,
        insuranceLimiter: new RateLimiterMemory(MANAGE_RL_OPTS),
      },
      (err) => {
        if (err) console.error("[ratelimit] manage Postgres store init failed:", err.message);
      },
    )
  : new RateLimiterMemory(MANAGE_RL_OPTS);

// Per-IP rate limit for Stripe Checkout session creation.
// Keeps bots from running up Stripe API usage; a real user rarely needs more
// than a handful of checkout attempts in an hour.
const CHECKOUT_RL_OPTS = {
  keyPrefix: "co",
  points: 20,
  duration: 60 * 60,      // per hour
  blockDuration: 60 * 60,
};
const checkoutLimiter = pool
  ? new RateLimiterPostgres(
      {
        ...CHECKOUT_RL_OPTS,
        storeClient: pool,
        storeType: "pool",
        tableName: "rate_limits",
        clearExpiredByTimeout: true,
        insuranceLimiter: new RateLimiterMemory(CHECKOUT_RL_OPTS),
      },
      (err) => {
        if (err) console.error("[ratelimit] checkout Postgres store init failed:", err.message);
      },
    )
  : new RateLimiterMemory(CHECKOUT_RL_OPTS);

// Per-IP rate limit for subscription-key validation.
const VALIDATE_RL_OPTS = {
  keyPrefix: "val",
  points: 15,
  duration: 60 * 15,      // per 15 minutes
  blockDuration: 60 * 60,
};
const validateLimiter = pool
  ? new RateLimiterPostgres(
      {
        ...VALIDATE_RL_OPTS,
        storeClient: pool,
        storeType: "pool",
        tableName: "rate_limits",
        clearExpiredByTimeout: true,
        insuranceLimiter: new RateLimiterMemory(VALIDATE_RL_OPTS),
      },
      (err) => {
        if (err) console.error("[ratelimit] validate Postgres store init failed:", err.message);
      },
    )
  : new RateLimiterMemory(VALIDATE_RL_OPTS);

// Per-IP rate limit for the protected compute run path. Tighter than the
// others because each run invokes the full audit engine.
const RUN_RL_OPTS = {
  keyPrefix: "run",
  points: 10,
  duration: 60 * 60,      // per hour
  blockDuration: 60 * 60,
};
const runLimiter = pool
  ? new RateLimiterPostgres(
      {
        ...RUN_RL_OPTS,
        storeClient: pool,
        storeType: "pool",
        tableName: "rate_limits",
        clearExpiredByTimeout: true,
        insuranceLimiter: new RateLimiterMemory(RUN_RL_OPTS),
      },
      (err) => {
        if (err) console.error("[ratelimit] run Postgres store init failed:", err.message);
      },
    )
  : new RateLimiterMemory(RUN_RL_OPTS);

// Per-IP rate limit for Stripe customer-portal session creation.
const PORTAL_RL_OPTS = {
  keyPrefix: "por",
  points: 10,
  duration: 60 * 15,      // per 15 minutes
  blockDuration: 60 * 60,
};
const portalLimiter = pool
  ? new RateLimiterPostgres(
      {
        ...PORTAL_RL_OPTS,
        storeClient: pool,
        storeType: "pool",
        tableName: "rate_limits",
        clearExpiredByTimeout: true,
        insuranceLimiter: new RateLimiterMemory(PORTAL_RL_OPTS),
      },
      (err) => {
        if (err) console.error("[ratelimit] portal Postgres store init failed:", err.message);
      },
    )
  : new RateLimiterMemory(PORTAL_RL_OPTS);

// Shared helper: consume one point from `limiter` for the request's IP.
// Returns true if the request is allowed; writes 429 + Retry-After and returns
// false if it is blocked. Callers must return immediately on false.
async function consumeRateLimit(limiter, req, res) {
  try {
    await limiter.consume(clientIp(req));
    return true;
  } catch (rl) {
    const retryMs = rl && typeof rl.msBeforeNext === "number" ? rl.msBeforeNext : 3600000;
    const retrySec = Math.ceil(retryMs / 1000);
    res.setHeader("Retry-After", String(retrySec));
    sendJson(res, 429, {
      ok: false,
      error: "rate_limited",
      message: "Too many attempts. Please try again later.",
    });
    return false;
  }
}

// Disposable / throwaway email domains we don't want on the list.
//
// The blocklist is backed by a large, community-maintained public list that is
// refreshed by `site/refresh-disposable-domains.mjs` into a bundled data file
// (`disposable-domains.txt`). We load that file at startup and always merge in
// the hardcoded CORE baseline, so the guard stays effective as new throwaway
// providers appear without touching this code, and never regresses below the
// known-bad core even if the bundled file is missing.
const CORE_DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "sharklasers.com",
  "grr.la",
  "10minutemail.com",
  "trashmail.com",
  "yopmail.com",
  "getnada.com",
  "temp-mail.org",
  "tempmail.com",
  "throwawaymail.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "mailnesia.com",
  "mohmal.com",
  "spam4.me",
  "tempinbox.com",
  "emailondeck.com",
];

function loadDisposableDomains() {
  const set = new Set(CORE_DISPOSABLE_DOMAINS);
  try {
    const file = path.join(__dirname, "disposable-domains.txt");
    const text = fs.readFileSync(file, "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim().toLowerCase();
      if (line && !line.startsWith("#")) set.add(line);
    }
  } catch {
    console.warn(
      "[waitlist] disposable-domains.txt not found; using core baseline only. " +
        "Run `node site/refresh-disposable-domains.mjs` to populate it.",
    );
  }
  return set;
}

const DISPOSABLE_DOMAINS = loadDisposableDomains();
console.log(`[waitlist] disposable-domain blocklist: ${DISPOSABLE_DOMAINS.size} domains`);

// Optional MX-record check: verify the domain actually accepts mail before
// accepting a signup. Opt-in via WAITLIST_MX_CHECK=1 (a DNS lookup adds latency
// to the signup path). Deliberately fails OPEN: transient DNS errors or
// timeouts accept the signup, so we never reject a legitimate address over a
// flaky lookup. We only reject when the domain authoritatively does not exist
// or publishes no way to receive mail. Results are cached to spare repeat work.
const MX_CHECK_ENABLED = /^(1|true|yes)$/i.test(process.env.WAITLIST_MX_CHECK || "");
const mxCache = new Map(); // domain -> { ok: boolean, at: number }
const MX_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function domainAcceptsMail(domain) {
  if (!MX_CHECK_ENABLED) return true;
  const cached = mxCache.get(domain);
  if (cached && Date.now() - cached.at < MX_CACHE_TTL_MS) return cached.ok;

  let ok = true; // fail open by default
  try {
    const mx = await dns.resolveMx(domain);
    if (mx && mx.length > 0) {
      ok = true;
    } else {
      // No MX records: a host with an A/AAAA record can still receive mail
      // (implicit MX), so only reject when there's no address record either.
      try {
        await dns.lookup(domain);
        ok = true;
      } catch {
        ok = false;
      }
    }
  } catch (err) {
    // ENOTFOUND / NXDOMAIN = the domain does not exist -> reject. Any other
    // error (timeout, SERVFAIL, network) -> fail open and accept.
    ok = !(err && (err.code === "ENOTFOUND" || err.code === "NXDOMAIN"));
  }
  mxCache.set(domain, { ok, at: Date.now() });
  return ok;
}

function clientIp(req) {
  // The site runs behind Replit's proxy, so the real client IP is in
  // X-Forwarded-For (first hop). Fall back to the socket address.
  const fwd = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req.socket?.remoteAddress || "unknown";
}
let dbReady = null;

// Unguessable, single-purpose per-signup token used for self-serve deletion.
// Opaque (hex), never derived from the email, so it cannot be guessed or used
// to enumerate other records.
function newUnsubToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Double opt-in confirm tokens use the same opaque-hex shape as unsub tokens.
function newConfirmToken() {
  return crypto.randomBytes(32).toString("hex");
}

// How long a confirmation link stays valid. Default 7 days; override with
// WAITLIST_CONFIRM_DAYS. A value of 0 or below falls back to the default.
const CONFIRM_DAYS = (() => {
  const n = Number(process.env.WAITLIST_CONFIRM_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 7;
})();

// Give any pre-existing rows a deletion token so they can be unsubscribed too.
// Done in JS (per-row crypto token) to avoid depending on a DB crypto extension.
async function backfillTokens() {
  const { rows } = await pool.query(
    `SELECT id FROM waitlist_signups WHERE unsub_token IS NULL`,
  );
  for (const r of rows) {
    await pool.query(
      `UPDATE waitlist_signups SET unsub_token = $1
        WHERE id = $2 AND unsub_token IS NULL`,
      [newUnsubToken(), r.id],
    );
  }
}

function ensureTable() {
  if (!pool) return Promise.resolve(false);
  if (!dbReady) {
    dbReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS waitlist_signups (
           id BIGSERIAL PRIMARY KEY,
           email TEXT NOT NULL UNIQUE,
           source TEXT,
           created_at TIMESTAMPTZ NOT NULL DEFAULT now()
         );
         ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS unsub_token TEXT;
         ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS confirm_token TEXT;
         ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS confirm_sent_at TIMESTAMPTZ;
         ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
         ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS meta JSONB;
         CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_unsub_token_uniq
           ON waitlist_signups (unsub_token);
         CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_confirm_token_uniq
           ON waitlist_signups (confirm_token);`,
      )
      .then(() => backfillTokens())
      .then(() => grandfatherConfirmations())
      .then(() => true)
      .catch((err) => {
        console.error("[waitlist] table init failed:", err.message);
        dbReady = null; // allow a retry on next request
        throw err;
      });
  }
  return dbReady;
}

// One-time grandfather: rows that predate double opt-in have no confirm_token
// and no confirmed_at. They already went through the old (single opt-in) flow
// and got a welcome email, so treat them as confirmed rather than suddenly
// marking every historical signup "pending". This is safe to run repeatedly:
// any genuinely pending row carries a confirm_token, so it is never touched.
async function grandfatherConfirmations() {
  await pool.query(
    `UPDATE waitlist_signups
        SET confirmed_at = created_at
      WHERE confirmed_at IS NULL AND confirm_token IS NULL`,
  );
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let data = "";
    let over = false;
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > limit) {
        over = true;
        req.destroy();
      }
    });
    req.on("end", () => (over ? reject(new Error("payload too large")) : resolve(data)));
    req.on("error", reject);
  });
}

function sendJson(res, status, obj) {
  const payload = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

async function handleWaitlist(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }
  if (!pool) {
    sendJson(res, 503, { ok: false, error: "storage_unavailable" });
    return;
  }
  // Per-IP rate limit before doing any work.
  try {
    await waitlistLimiter.consume(clientIp(req));
  } catch (rl) {
    const retryMs = rl && typeof rl.msBeforeNext === "number" ? rl.msBeforeNext : 3600000;
    const retrySec = Math.ceil(retryMs / 1000);
    res.setHeader("Retry-After", String(retrySec));
    sendJson(res, 429, {
      ok: false,
      error: "rate_limited",
      message: "Too many attempts. Please try again later.",
    });
    return;
  }
  let email;
  let source;
  let honeypot;
  let metaJson = null;
  try {
    const raw = await readBody(req, 16384);
    const parsed = raw ? JSON.parse(raw) : {};
    email = String(parsed.email || "").trim().toLowerCase();
    source = String(parsed.source || "site").trim().slice(0, 64);
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(source)) source = "site";
    // Honeypot: a hidden field real users never fill. Any value = a bot.
    honeypot = String(parsed.company || "").trim();
    // Optional meta JSON payload (engine session parameters, etc.)
    if (parsed.meta && typeof parsed.meta === "object" && !Array.isArray(parsed.meta)) {
      // Truncate to 32 KB when serialized to prevent abuse
      const serialized = JSON.stringify(parsed.meta);
      if (serialized.length <= 32768) metaJson = parsed.meta;
    }
  } catch {
    sendJson(res, 400, { ok: false, error: "bad_request" });
    return;
  }
  if (honeypot) {
    // Pretend success so bots get no useful signal; store nothing.
    sendJson(res, 200, { ok: true, duplicate: false });
    return;
  }
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    sendJson(res, 422, { ok: false, error: "invalid_email" });
    return;
  }
  const domain = email.slice(email.lastIndexOf("@") + 1);
  if (DISPOSABLE_DOMAINS.has(domain)) {
    sendJson(res, 422, {
      ok: false,
      error: "disposable_email",
      message: "Please use a permanent email address.",
    });
    return;
  }
  // Optional deliverability check: reject only domains that authoritatively
  // cannot receive mail. Fails open, so legitimate addresses are never blocked
  // by a transient DNS hiccup.
  if (!(await domainAcceptsMail(domain))) {
    sendJson(res, 422, {
      ok: false,
      error: "undeliverable_email",
      message: "That email domain can't receive mail. Please check the address.",
    });
    return;
  }
  try {
    await ensureTable();
    // Double opt-in: a new signup lands as PENDING (confirmed_at IS NULL) with a
    // fresh confirm token. The only mail it triggers is a "confirm your email"
    // request; the welcome email is held until the link is clicked.
    const result = await pool.query(
      `INSERT INTO waitlist_signups (email, source, unsub_token, confirm_token, confirm_sent_at, meta)
       VALUES ($1, $2, $3, $4, now(), $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING unsub_token, confirm_token`,
      [email, source, newUnsubToken(), newConfirmToken(), metaJson ? JSON.stringify(metaJson) : null],
    );
    const isNew = result.rowCount > 0;

    // Decide what (if anything) to email. For a brand-new row: send the confirm
    // request. For a duplicate that is still UNCONFIRMED: refresh the token +
    // expiry window and resend the confirm request (so a lost link is
    // recoverable). For an already-confirmed duplicate: send nothing.
    let mail = null;
    if (isNew) {
      mail = {
        unsub_token: result.rows[0].unsub_token,
        confirm_token: result.rows[0].confirm_token,
      };
    } else {
      const existing = await pool.query(
        `SELECT id, confirmed_at, unsub_token, confirm_token
           FROM waitlist_signups WHERE email = $1`,
        [email],
      );
      const row = existing.rows[0];
      if (row && !row.confirmed_at) {
        const confirmToken = row.confirm_token || newConfirmToken();
        await pool.query(
          `UPDATE waitlist_signups
              SET confirm_token = $1, confirm_sent_at = now()
            WHERE id = $2`,
          [confirmToken, row.id],
        );
        mail = { unsub_token: row.unsub_token, confirm_token: confirmToken };
      }
    }

    sendJson(res, 200, { ok: true, duplicate: !isNew });

    // Immediate team heads-up for brand-new signups only (not duplicates or
    // confirm-resend paths). Best-effort, after the response.
    if (isNew) {
      sendPendingSignupNotification({ email, source }).catch((err) =>
        console.error("[waitlist] pending-signup notification error:", err.message),
      );
    }

    // Best-effort confirmation email. Runs after the response is sent and never
    // blocks or fails the signup.
    if (mail && mail.confirm_token) {
      const confirmUrl = `${reqOrigin(req)}/api/waitlist/confirm?token=${encodeURIComponent(mail.confirm_token)}`;
      const unsubscribeUrl = mail.unsub_token
        ? `${reqOrigin(req)}/unsubscribe?token=${encodeURIComponent(mail.unsub_token)}`
        : "";
      sendConfirmationRequest({
        email,
        source,
        confirmUrl,
        unsubscribeUrl,
        days: CONFIRM_DAYS,
      }).catch((err) =>
        console.error("[waitlist] confirmation email error:", err.message),
      );
    }
  } catch (err) {
    console.error("[waitlist] insert failed:", err.message);
    sendJson(res, 500, { ok: false, error: "server_error" });
  }
}

/* ---------------- self-serve deletion (unsubscribe) ---------------- */
// Standalone, on-brand, mobile-first confirmation page. Uses the locked FDI
// palette (Signal Orange is reserved for the logo mark, so accents are amber).
function unsubscribeShell(body, title = "Manage your email preferences — False Dawn Industries") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#0D0B08;color:#F0E8D5;font-family:'Inter',system-ui,-apple-system,sans-serif;
    min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;line-height:1.6}
  .card{width:100%;max-width:520px;background:#15120c;border:1px solid #2a2418;border-radius:16px;padding:32px 24px}
  .eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.72rem;letter-spacing:.14em;
    text-transform:uppercase;color:#A8997B;margin:0 0 12px}
  h1{font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.5rem;line-height:1.25;margin:0 0 14px}
  p{font-size:1rem;margin:0 0 16px;color:#F0E8D5}
  .muted{color:#A8997B;font-size:.95rem}
  .btn{display:inline-block;min-height:44px;line-height:44px;padding:0 20px;background:#FFB12B;color:#0D0B08;
    font-weight:600;text-decoration:none;border:0;border-radius:10px;cursor:pointer;font-size:1rem;font-family:inherit}
  .btn.ghost{background:transparent;color:#FFB12B;border:1px solid #2a2418;line-height:42px}
  a{color:#FFB12B}
  a:focus-visible,.btn:focus-visible,button:focus-visible{outline:2px solid #FFCB6B;outline-offset:3px}
  form{margin:0}
  @media (min-width:600px){ .card{padding:40px} h1{font-size:1.75rem} }
</style></head><body><main class="card">${body}</main></body></html>`;
}

function unsubscribeRender(res, status, body, title) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(unsubscribeShell(body, title));
}

// Tokens are 64 hex chars; accept a small range defensively without querying on
// obviously malformed input.
const UNSUB_TOKEN_RE = /^[a-f0-9]{32,128}$/i;

/* ---------------- double opt-in: email confirmation ---------------- */
// Clicking the link in the confirmation email lands here. We validate the
// opaque token, mark the row confirmed (idempotently), and only then send the
// welcome email + team notification. Reuses the on-brand, noindex shell.
async function handleConfirm(req, res, urlObj) {
  const CONFIRM_TITLE = "Confirm your email — False Dawn Industries";
  const back = `<p class="muted" style="margin-top:22px"><a href="/">Return to False Dawn Industries</a></p>`;
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("405 Method Not Allowed");
    return;
  }
  if (!pool) {
    unsubscribeRender(
      res,
      503,
      `<p class="eyebrow">Email confirmation</p><h1>Temporarily unavailable</h1><p class="muted">We can't confirm your email right now. Please try again later.</p>${back}`,
      CONFIRM_TITLE,
    );
    return;
  }

  const token = (urlObj.searchParams.get("token") || "").trim();
  const invalid = () =>
    unsubscribeRender(
      res,
      400,
      `<p class="eyebrow">Email confirmation</p><h1>Link no longer active</h1><p>This confirmation link is invalid or has already been used. If you signed up recently, request a fresh link by joining again.</p>${back}`,
      CONFIRM_TITLE,
    );

  if (!UNSUB_TOKEN_RE.test(token)) {
    invalid();
    return;
  }

  let row;
  try {
    await ensureTable();
    const result = await pool.query(
      `SELECT id, email, source, confirmed_at, confirm_sent_at, unsub_token, meta
         FROM waitlist_signups WHERE confirm_token = $1`,
      [token],
    );
    row = result.rows[0];
  } catch (err) {
    console.error("[confirm] lookup failed:", err.message);
    unsubscribeRender(
      res,
      500,
      `<p class="eyebrow">Email confirmation</p><h1>Something went wrong</h1><p class="muted">We couldn't confirm your email. Please try again later.</p>${back}`,
      CONFIRM_TITLE,
    );
    return;
  }

  if (!row) {
    invalid();
    return;
  }

  // Already confirmed: idempotent, friendly acknowledgement.
  if (row.confirmed_at) {
    unsubscribeRender(
      res,
      200,
      `<p class="eyebrow">Email confirmation</p><h1>You're already confirmed</h1><p>Your email is confirmed and you're on the list. There's nothing more to do.</p>${back}`,
      CONFIRM_TITLE,
    );
    return;
  }

  // Expired link: confirm_sent_at older than the allowed window.
  const sentAt = row.confirm_sent_at ? new Date(row.confirm_sent_at).getTime() : 0;
  const ageMs = Date.now() - sentAt;
  if (!sentAt || ageMs > CONFIRM_DAYS * 24 * 60 * 60 * 1000) {
    unsubscribeRender(
      res,
      400,
      `<p class="eyebrow">Email confirmation</p><h1>This link has expired</h1><p>Confirmation links are valid for ${CONFIRM_DAYS} days. Please <a href="/">sign up again</a> to get a fresh link.</p>${back}`,
      CONFIRM_TITLE,
    );
    return;
  }

  // Mark confirmed. Guard on confirmed_at IS NULL so a double-click never fires
  // the welcome email twice.
  let confirmed = false;
  try {
    const upd = await pool.query(
      `UPDATE waitlist_signups
          SET confirmed_at = now()
        WHERE id = $1 AND confirmed_at IS NULL
        RETURNING id`,
      [row.id],
    );
    confirmed = upd.rowCount > 0;
  } catch (err) {
    console.error("[confirm] update failed:", err.message);
    unsubscribeRender(
      res,
      500,
      `<p class="eyebrow">Email confirmation</p><h1>Something went wrong</h1><p class="muted">We couldn't confirm your email. Please try again later.</p>${back}`,
      CONFIRM_TITLE,
    );
    return;
  }

  if (confirmed) {
    const unsubscribeUrl = row.unsub_token
      ? `${reqOrigin(req)}/unsubscribe?token=${encodeURIComponent(row.unsub_token)}`
      : "";
    // Welcome email + team notification only fire now, on a proven address.
    sendWelcomeEmails({ email: row.email, source: row.source, unsubscribeUrl, meta: row.meta || null }).catch(
      (err) => console.error("[confirm] welcome email error:", err.message),
    );
  }

  unsubscribeRender(
    res,
    200,
    `<p class="eyebrow">Email confirmation</p><h1>You're confirmed</h1><p>Thanks for confirming. Your email is verified and you're on the list. We'll be in touch.</p>${back}`,
    CONFIRM_TITLE,
  );
}

async function handleUnsubscribe(req, res, urlObj) {
  const back = `<p class="muted" style="margin-top:22px"><a href="/">Return to False Dawn Industries</a></p>`;
  if (req.method !== "GET" && req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("405 Method Not Allowed");
    return;
  }
  if (!pool) {
    unsubscribeRender(
      res,
      503,
      `<p class="eyebrow">Email preferences</p><h1>Temporarily unavailable</h1><p class="muted">We can't process this request right now. Please try again later.</p>${back}`,
    );
    return;
  }

  let token = (urlObj.searchParams.get("token") || "").trim();
  if (req.method === "POST") {
    // Supports both an in-page form POST and RFC 8058 one-click unsubscribe.
    try {
      const raw = await readBody(req);
      const params = new URLSearchParams(raw);
      token = (params.get("token") || token).trim();
    } catch {
      // fall through with whatever query token we have
    }
  }

  let removed = false;
  if (UNSUB_TOKEN_RE.test(token)) {
    try {
      await ensureTable();
      // Hard delete, scoped to this token only — a token can never touch
      // another person's record. The email is never read back or logged.
      const result = await pool.query(
        `DELETE FROM waitlist_signups WHERE unsub_token = $1 RETURNING id`,
        [token],
      );
      removed = result.rowCount > 0;
    } catch (err) {
      console.error("[unsubscribe] delete failed:", err.message);
      unsubscribeRender(
        res,
        500,
        `<p class="eyebrow">Email preferences</p><h1>Something went wrong</h1><p class="muted">We couldn't process this request. Please try again later.</p>${back}`,
      );
      return;
    }
  }

  // RFC 8058 one-click POST expects a 200 regardless.
  if (removed) {
    unsubscribeRender(
      res,
      200,
      `<p class="eyebrow">Email preferences</p><h1>You have been removed</h1><p>Your email address has been deleted from our list. You will no longer receive messages from False Dawn Industries.</p><p class="muted">Changed your mind? You can sign up again any time.</p>${back}`,
    );
    return;
  }
  // Generic response for invalid/expired/already-used tokens. Reveals nothing
  // about whether any given email exists on the list.
  unsubscribeRender(
    res,
    req.method === "POST" ? 200 : 400,
    `<p class="eyebrow">Email preferences</p><h1>Link no longer active</h1><p>This link is invalid or has already been used. If you were on our list, you may already have been removed.</p>${back}`,
  );
}

/* ---------------- Davos demo page: password gate ---------------- */
// Runtime-managed access code stored in davos-config.json next to serve.mjs.
// The file is seeded from DAVOS_DEMO_PASSWORD at first boot but can be rotated
// via POST /admin/davos/set-code while the server is running — no redeploy or
// restart needed. All existing sessions are instantly revoked when the code
// changes because the HMAC signing key changes.
//
// Token format (v2): "{expiry}.{hmac}"
//   expiry — Unix timestamp (seconds) when this session expires.
//   hmac   — HMAC-SHA256 of "davos-demo-gate-v2:{expiry}" keyed by the
//             current access code, so expiry cannot be tampered with.
//
// Revocation paths:
//   (a) POST /admin/davos/set-code — takes effect immediately, no restart.
//   (b) Rotate DAVOS_DEMO_PASSWORD env secret and restart the server.

// Allow test harnesses to supply their own isolated config path via env var.
const DAVOS_CONFIG_FILE = process.env.DAVOS_CONFIG_FILE || path.join(__dirname, "davos-config.json");
const DAVOS_SESSION_TTL = 12 * 60 * 60; // 12 hours in seconds

// Seed the config file from the env var at first boot if the file does not
// yet exist. After that the file is the authoritative source — read fresh on
// every gate check so the code can be rotated live without a restart.
(function seedDavosConfig() {
  if (fs.existsSync(DAVOS_CONFIG_FILE)) return;
  const envPw = (process.env.DAVOS_DEMO_PASSWORD || "").trim();
  if (envPw) {
    try {
      fs.writeFileSync(DAVOS_CONFIG_FILE, JSON.stringify({ password: envPw }), "utf8");
    } catch (err) {
      console.error("[davos] could not seed config file:", err.message);
    }
  }
})();

/** Read the current access code fresh from disk. Falls back to env var. */
function readDavosPassword() {
  try {
    const raw = fs.readFileSync(DAVOS_CONFIG_FILE, "utf8");
    return (JSON.parse(raw).password || "").trim();
  } catch {
    return (process.env.DAVOS_DEMO_PASSWORD || "").trim();
  }
}

/** Persist a new access code. All existing sessions become invalid immediately. */
function writeDavosPassword(pw) {
  fs.writeFileSync(DAVOS_CONFIG_FILE, JSON.stringify({ password: pw.trim() }), "utf8");
}

function davosSessionToken(pw) {
  const expiry = Math.floor(Date.now() / 1000) + DAVOS_SESSION_TTL;
  const sig = crypto
    .createHmac("sha256", pw)
    .update(`davos-demo-gate-v2:${expiry}`)
    .digest("hex");
  return `${expiry}.${sig}`;
}

function davosCookieAttrs(req) {
  const proto =
    (req.headers["x-forwarded-proto"] || "").split(",")[0].trim() || "http";
  const secure = proto === "https" ? " Secure;" : "";
  // Path=/ so the browser also sends the cookie for the gated screenshot
  // assets under /assets/davos-demo/ (a /davos-kit-demo scope would not).
  return `Path=/; HttpOnly; SameSite=Strict;${secure}`;
}

function hasDavosAccess(req) {
  const pw = readDavosPassword();
  if (!pw) return false;
  const cookie = parseCookies(req).dk_demo || "";
  if (!cookie) return false;
  const dot = cookie.indexOf(".");
  if (dot === -1) return false;
  const expiry = parseInt(cookie.slice(0, dot), 10);
  // Reject missing, non-numeric, or already-expired timestamps.
  if (!Number.isFinite(expiry) || Math.floor(Date.now() / 1000) >= expiry) return false;
  const supplied = cookie.slice(dot + 1);
  const expected = crypto
    .createHmac("sha256", pw)
    .update(`davos-demo-gate-v2:${expiry}`)
    .digest("hex");
  return timingSafeEqual(supplied, expected);
}

function davosGateShell(inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Private demonstration · False Dawn Industries</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:#0D0B08;color:#F0E8D5;font-family:'Inter',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .box{max-width:420px;width:100%;background:#141009;border:1px solid #2A2015;border-radius:14px;padding:40px 36px}
  .eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.7rem;letter-spacing:.22em;text-transform:uppercase;color:#A8997B;margin:0 0 18px;display:flex;align-items:center;gap:12px}
  .eyebrow::before{content:"";width:22px;border-top:2px solid #FFB12B}
  h1{font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.45rem;margin:0 0 10px;letter-spacing:-.01em}
  p{color:#A8997B;font-size:.92rem;line-height:1.6;margin:0 0 22px}
  label{display:block;font-size:.85rem;color:#A8997B;margin:0 0 6px}
  input{width:100%;box-sizing:border-box;background:#1C160D;border:1px solid #3A2D1C;border-radius:8px;color:#F0E8D5;padding:11px 13px;font-size:1rem;margin:0 0 16px}
  input:focus{border-color:#FFB12B;outline:none}
  .btn{display:inline-block;width:100%;box-sizing:border-box;text-align:center;background:#FFB12B;color:#1a1206;font-family:'Space Grotesk',system-ui,sans-serif;font-weight:600;padding:12px 16px;border-radius:8px;border:0;cursor:pointer;font-size:.95rem}
  .btn:hover{background:#FFCB6B}
  .err{color:#E0920C;font-size:.85rem;margin:0 0 16px}
  .foot{color:#7A6A50;font-size:.78rem;margin:22px 0 0}
</style></head><body><div class="box">${inner}</div></body></html>`;
}

function davosGatePage(res, status, error) {
  const inner = `<p class="eyebrow">Private demonstration</p>
<h1>This page is access-protected.</h1>
<p>A working demonstration prepared for a specific client. Enter the access code you were given to continue.</p>
${error ? `<p class="err">${esc(error)}</p>` : ""}
<form method="POST" action="/davos-kit-demo">
  <label for="dk-pass">Access code</label>
  <input id="dk-pass" name="password" type="password" autocomplete="off" autofocus required>
  <button class="btn" type="submit">Enter</button>
</form>
<p class="foot">False Dawn Industries · Growth Cartography</p>`;
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
  });
  res.end(davosGateShell(inner));
}

function serveDavosDemoFile(res) {
  const file = path.join(DIST, "davos-kit-demo.html");
  if (!fs.existsSync(file)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    // Never cache the gated page (shared caches must not hold a copy).
    "Cache-Control": "no-store, private",
    "X-Robots-Tag": "noindex, nofollow",
  });
  fs.createReadStream(file).pipe(res);
}

async function handleDavosDemo(req, res) {
  const pw = readDavosPassword();
  if (!pw) {
    res.writeHead(503, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    res.end(
      davosGateShell(
        `<p class="eyebrow">Private demonstration</p><h1>Not available.</h1><p>This demonstration is not currently enabled. Set the access secret to activate it.</p>`,
      ),
    );
    return;
  }
  if (req.method === "POST") {
    const raw = await readBody(req, 4096).catch(() => "");
    const params = new URLSearchParams(String(raw));
    const supplied = params.get("password") || "";
    if (supplied && timingSafeEqual(supplied, pw)) {
      res.writeHead(303, {
        Location: "/davos-kit-demo",
        "Set-Cookie": `dk_demo=${davosSessionToken(pw)}; ${davosCookieAttrs(req)} Max-Age=43200`,
        "Cache-Control": "no-store",
      });
      res.end();
      return;
    }
    davosGatePage(res, 401, "That code did not work. Check it and try again.");
    return;
  }
  if (hasDavosAccess(req)) {
    serveDavosDemoFile(res);
    return;
  }
  davosGatePage(res, 401);
}

/* ---------------- admin: view + export signups ---------------- */
function timingSafeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) {
      // Malformed percent-encoding in a cookie value must never throw
      // (parseCookies runs on public routes); fall back to the raw value.
      try {
        out[k] = decodeURIComponent(v);
      } catch {
        out[k] = v;
      }
    }
  }
  return out;
}

function isAdmin(req, urlObj) {
  if (!ADMIN_TOKEN) return false;
  const cookies = parseCookies(req);
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const supplied =
    cookies.wl_admin ||
    bearer ||
    (urlObj && urlObj.searchParams.get("token")) ||
    "";
  return supplied ? timingSafeEqual(supplied, ADMIN_TOKEN) : false;
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvField(s) {
  const v = String(s == null ? "" : s);
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function adminShell(body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Waitlist signups — FDI</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:#0D0B08;color:#F0E8D5;font-family:'Inter',system-ui,sans-serif;padding:48px 24px}
  .wrap{max-width:960px;margin:0 auto}
  h1{font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.6rem;margin:0 0 4px}
  .eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#A8997B;margin:0 0 24px}
  a{color:#FFB12B}
  .bar{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin:0 0 20px}
  .btn{display:inline-block;background:#FFB12B;color:#0D0B08;font-weight:600;text-decoration:none;padding:9px 16px;border-radius:8px;border:0;cursor:pointer;font-size:.9rem}
  .count{color:#A8997B;font-size:.85rem}
  .chips{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 20px}
  .chip{display:inline-flex;align-items:center;gap:8px;text-decoration:none;background:#15120c;border:1px solid #2a2418;border-radius:999px;padding:6px 14px;font-size:.85rem;color:#A8997B;font-family:'JetBrains Mono',ui-monospace,monospace}
  .chip .n{background:#0D0B08;color:#FFCB6B;border-radius:999px;padding:1px 8px;font-size:.78rem}
  .chip.on{border-color:#E0920C;color:#F0E8D5}
  .chip.on .n{color:#FFB12B}
  .chip:hover{border-color:#E0920C}
  table{border-collapse:collapse;width:100%;font-size:.88rem}
  th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #2a2418}
  th{color:#A8997B;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase}
  tr:hover td{background:#15120c}
  .tag{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.78rem;color:#FFCB6B}
  .status{display:inline-block;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:2px 9px;border:1px solid #2a2418}
  .status.ok{color:#FFCB6B;border-color:#E0920C}
  .status.pending{color:#A8997B}
  .empty{color:#7A6A50;padding:40px 0}
  form.login{max-width:340px}
  label{display:block;font-size:.85rem;color:#A8997B;margin:0 0 6px}
  input{width:100%;box-sizing:border-box;background:#15120c;border:1px solid #2a2418;border-radius:8px;color:#F0E8D5;padding:10px 12px;font-size:.95rem;margin:0 0 14px}
  .err{color:#E0920C;font-size:.85rem;margin:0 0 14px}
  .btn:focus-visible,input:focus-visible,a:focus-visible{outline:2px solid #FFCB6B;outline-offset:2px}
  .notice{border-radius:8px;padding:10px 14px;font-size:.9rem;margin:0 0 20px}
  .notice.ok{background:#15120c;border:1px solid #E0920C;color:#FFCB6B}
  .notice.warn{background:#15120c;border:1px solid #2a2418;color:#A8997B}
  .ops{margin-top:40px;padding-top:28px;border-top:1px solid #2a2418}
  .ops h2{font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.15rem;margin:0 0 18px}
  .ops-form{margin:0 0 20px}
  .ops-form label{margin:0 0 8px}
  .ops-row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start}
  .ops-row input{flex:1 1 220px;margin:0}
  .btn.ghost{background:transparent;color:#FFB12B;border:1px solid #2a2418}
  .btn.danger{background:transparent;color:#E0920C;border:1px solid #E0920C}
</style></head><body><div class="wrap">${body}</div></body></html>`;
}

function loginPage(res, status, error) {
  const body = `<p class="eyebrow">Growth Cartography — Internal</p>
<h1>Waitlist signups</h1>
<p style="color:#A8997B;margin:0 0 24px">Protected. Enter the access token to continue.</p>
${error ? `<p class="err">${esc(error)}</p>` : ""}
<form class="login" method="POST" action="/admin/waitlist">
  <label for="token">Access token</label>
  <input id="token" name="token" type="password" autocomplete="off" autofocus required>
  <button class="btn" type="submit">Unlock</button>
</form>`;
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(adminShell(body));
}

function cookieAttrs(req) {
  const proto =
    (req.headers["x-forwarded-proto"] || "").split(",")[0].trim() || "http";
  const secure = proto === "https" ? " Secure;" : "";
  return `Path=/admin; HttpOnly; SameSite=Strict;${secure}`;
}

// Normalize a ?source= filter the same way signups are sanitized on insert.
// Returns "" (no filter) if missing or invalid.
function cleanSourceFilter(value) {
  const s = String(value || "").trim().slice(0, 64);
  return /^[a-z0-9][a-z0-9._-]*$/i.test(s) ? s : "";
}

async function fetchSignups(source = "") {
  await ensureTable();
  if (source) {
    const { rows } = await pool.query(
      `SELECT email, source, created_at, confirmed_at
         FROM waitlist_signups
        WHERE source = $1
        ORDER BY created_at DESC`,
      [source],
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT email, source, created_at, confirmed_at
       FROM waitlist_signups
      ORDER BY created_at DESC`,
  );
  return rows;
}

// Signup counts grouped by source, most signups first.
async function fetchSourceCounts() {
  await ensureTable();
  const { rows } = await pool.query(
    `SELECT COALESCE(NULLIF(source, ''), 'site') AS source, COUNT(*)::int AS count
       FROM waitlist_signups
      GROUP BY 1
      ORDER BY count DESC, source ASC`,
  );
  return rows;
}

async function handleAdmin(req, res, urlObj) {
  if (!ADMIN_TOKEN) {
    res.writeHead(503, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(
      adminShell(
        `<h1>Not configured</h1><p style="color:#A8997B">Set the <code>WAITLIST_ADMIN_TOKEN</code> secret to enable the signups view.</p>`,
      ),
    );
    return;
  }
  // Davos demo access-code management — file-based, no DB required.
  // Protected by the same ADMIN_TOKEN / wl_admin cookie as other admin routes.
  const davosPathname = urlObj.pathname;
  if (davosPathname === "/admin/davos" || davosPathname.startsWith("/admin/davos/")) {
    if (req.method === "POST" && davosPathname === "/admin/davos/set-code") {
      if (!isAdmin(req, urlObj)) { loginPage(res, 401); return; }
      let code = "";
      try {
        const raw = await readBody(req, 512);
        code = (new URLSearchParams(raw).get("code") || "").trim();
      } catch {
        res.writeHead(303, { Location: "/admin/davos?msg=bad", "Cache-Control": "no-store" });
        res.end(); return;
      }
      if (!code) {
        res.writeHead(303, { Location: "/admin/davos?msg=empty", "Cache-Control": "no-store" });
        res.end(); return;
      }
      try { writeDavosPassword(code); } catch (err) {
        console.error("[davos] failed to write config:", err.message);
        res.writeHead(303, { Location: "/admin/davos?msg=error", "Cache-Control": "no-store" });
        res.end(); return;
      }
      res.writeHead(303, { Location: "/admin/davos?msg=updated", "Cache-Control": "no-store" });
      res.end(); return;
    }
    if (!isAdmin(req, urlObj)) { loginPage(res, 401); return; }
    const curPw = readDavosPassword();
    const dmsg = urlObj.searchParams.get("msg") || "";
    const dnotice = dmsg === "updated"
      ? `<p class="notice ok">Access code updated. All existing client sessions are now invalid.</p>`
      : dmsg === "empty" ? `<p class="notice warn">Code cannot be empty.</p>`
      : dmsg === "bad"   ? `<p class="notice warn">Bad request.</p>`
      : dmsg === "error" ? `<p class="notice warn">Failed to save — check server logs.</p>`
      : "";
    const dbody = `<p class="eyebrow">Growth Cartography — Internal</p>
<h1>Davos demo access code</h1>
${dnotice}
<p style="color:#A8997B;margin:0 0 24px;font-size:.9rem">
  The access code is currently <strong style="color:#FFCB6B">${curPw ? "set" : "not set"}</strong>.
  Updating it takes effect immediately — all existing client sessions are revoked.
</p>
<form method="POST" action="/admin/davos/set-code" style="max-width:400px">
  <label for="dk-code">New access code</label>
  <input id="dk-code" name="code" type="text" autocomplete="off" autofocus required placeholder="new-access-code">
  <button class="btn" type="submit">Update access code</button>
</form>
<p style="margin:28px 0 0"><a href="/admin/waitlist">← Back to signups</a></p>`;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(adminShell(dbody));
    return;
  }

  if (!pool) {
    res.writeHead(503, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(
      adminShell(
        `<h1>Storage unavailable</h1><p style="color:#A8997B">No <code>DATABASE_URL</code> is configured.</p>`,
      ),
    );
    return;
  }

  const pathname = urlObj.pathname;

  // Login submission
  if (req.method === "POST" && pathname === "/admin/waitlist") {
    let token = "";
    try {
      const raw = await readBody(req);
      const params = new URLSearchParams(raw);
      token = (params.get("token") || "").trim();
    } catch {
      loginPage(res, 400, "Bad request.");
      return;
    }
    if (!token || !timingSafeEqual(token, ADMIN_TOKEN)) {
      loginPage(res, 401, "Invalid token.");
      return;
    }
    res.writeHead(303, {
      Location: "/admin/waitlist",
      "Set-Cookie": `wl_admin=${encodeURIComponent(token)}; ${cookieAttrs(req)} Max-Age=43200`,
      "Cache-Control": "no-store",
    });
    res.end();
    return;
  }

  // Delete a single signup by email (support / right-to-erasure request).
  if (req.method === "POST" && pathname === "/admin/waitlist/delete") {
    if (!isAdmin(req, urlObj)) {
      loginPage(res, 401);
      return;
    }
    let email = "";
    try {
      const raw = await readBody(req);
      const params = new URLSearchParams(raw);
      email = String(params.get("email") || "").trim().toLowerCase();
    } catch {
      res.writeHead(303, { Location: "/admin/waitlist?msg=bad", "Cache-Control": "no-store" });
      res.end();
      return;
    }
    let deleted = 0;
    if (email) {
      try {
        await ensureTable();
        const result = await pool.query(
          `DELETE FROM waitlist_signups WHERE email = $1 RETURNING id`,
          [email],
        );
        deleted = result.rowCount;
      } catch (err) {
        // Never log the email itself.
        console.error("[admin] delete failed:", err.message);
        res.writeHead(303, { Location: "/admin/waitlist?msg=error", "Cache-Control": "no-store" });
        res.end();
        return;
      }
    }
    res.writeHead(303, {
      Location: `/admin/waitlist?msg=${deleted ? "deleted" : "notfound"}`,
      "Cache-Control": "no-store",
    });
    res.end();
    return;
  }

  // Resend confirmation email for a pending signup.
  if (req.method === "POST" && pathname === "/admin/waitlist/resend") {
    if (!isAdmin(req, urlObj)) {
      loginPage(res, 401);
      return;
    }
    let email = "";
    try {
      const raw = await readBody(req);
      const params = new URLSearchParams(raw);
      email = String(params.get("email") || "").trim().toLowerCase();
    } catch {
      res.writeHead(303, { Location: "/admin/waitlist?msg=bad", "Cache-Control": "no-store" });
      res.end();
      return;
    }
    if (!email) {
      res.writeHead(303, { Location: "/admin/waitlist?msg=bad", "Cache-Control": "no-store" });
      res.end();
      return;
    }
    try {
      await ensureTable();
      const existing = await pool.query(
        `SELECT id, confirmed_at, unsub_token, confirm_token
           FROM waitlist_signups WHERE email = $1`,
        [email],
      );
      const row = existing.rows[0];
      if (!row) {
        res.writeHead(303, { Location: "/admin/waitlist?msg=notfound", "Cache-Control": "no-store" });
        res.end();
        return;
      }
      if (row.confirmed_at) {
        res.writeHead(303, { Location: "/admin/waitlist?msg=alreadyconfirmed", "Cache-Control": "no-store" });
        res.end();
        return;
      }
      // Regenerate token and refresh confirm_sent_at so the window resets.
      const confirmToken = newConfirmToken();
      await pool.query(
        `UPDATE waitlist_signups
            SET confirm_token = $1, confirm_sent_at = now()
          WHERE id = $2`,
        [confirmToken, row.id],
      );
      // Best-effort — fire after redirect.
      const confirmUrl = `${reqOrigin(req)}/api/waitlist/confirm?token=${encodeURIComponent(confirmToken)}`;
      const unsubscribeUrl = row.unsub_token
        ? `${reqOrigin(req)}/unsubscribe?token=${encodeURIComponent(row.unsub_token)}`
        : "";
      // Need source for the email copy; fetch it separately.
      const srcRow = await pool.query(`SELECT source FROM waitlist_signups WHERE id = $1`, [row.id]);
      const source = (srcRow.rows[0] && srcRow.rows[0].source) || "site";
      res.writeHead(303, { Location: "/admin/waitlist?msg=resent", "Cache-Control": "no-store" });
      res.end();
      sendConfirmationRequest({ email, source, confirmUrl, unsubscribeUrl, days: CONFIRM_DAYS }).catch(
        (err) => console.error("[admin] resend confirm email failed:", err.message),
      );
    } catch (err) {
      console.error("[admin] resend failed:", err.message);
      res.writeHead(303, { Location: "/admin/waitlist?msg=error", "Cache-Control": "no-store" });
      res.end();
    }
    return;
  }

  // Manually confirm a pending signup (fires welcome email once, idempotent).
  if (req.method === "POST" && pathname === "/admin/waitlist/confirm") {
    if (!isAdmin(req, urlObj)) {
      loginPage(res, 401);
      return;
    }
    let email = "";
    try {
      const raw = await readBody(req);
      const params = new URLSearchParams(raw);
      email = String(params.get("email") || "").trim().toLowerCase();
    } catch {
      res.writeHead(303, { Location: "/admin/waitlist?msg=bad", "Cache-Control": "no-store" });
      res.end();
      return;
    }
    if (!email) {
      res.writeHead(303, { Location: "/admin/waitlist?msg=bad", "Cache-Control": "no-store" });
      res.end();
      return;
    }
    try {
      await ensureTable();
      const existing = await pool.query(
        `SELECT id, confirmed_at, unsub_token, source
           FROM waitlist_signups WHERE email = $1`,
        [email],
      );
      const row = existing.rows[0];
      if (!row) {
        res.writeHead(303, { Location: "/admin/waitlist?msg=notfound", "Cache-Control": "no-store" });
        res.end();
        return;
      }
      if (row.confirmed_at) {
        res.writeHead(303, { Location: "/admin/waitlist?msg=alreadyconfirmed", "Cache-Control": "no-store" });
        res.end();
        return;
      }
      // Mark confirmed, idempotently (guard on IS NULL).
      const upd = await pool.query(
        `UPDATE waitlist_signups
            SET confirmed_at = now(), confirm_token = NULL
          WHERE id = $1 AND confirmed_at IS NULL
          RETURNING id`,
        [row.id],
      );
      const didConfirm = upd.rowCount > 0;
      res.writeHead(303, {
        Location: `/admin/waitlist?msg=${didConfirm ? "confirmed" : "alreadyconfirmed"}`,
        "Cache-Control": "no-store",
      });
      res.end();
      if (didConfirm) {
        const source = row.source || "site";
        const unsubscribeUrl = row.unsub_token
          ? `${reqOrigin(req)}/unsubscribe?token=${encodeURIComponent(row.unsub_token)}`
          : "";
        sendWelcomeEmails({ email, source, unsubscribeUrl }).catch(
          (err) => console.error("[admin] manual confirm welcome email failed:", err.message),
        );
      }
    } catch (err) {
      console.error("[admin] manual confirm failed:", err.message);
      res.writeHead(303, { Location: "/admin/waitlist?msg=error", "Cache-Control": "no-store" });
      res.end();
    }
    return;
  }

  // Generate a Process Defragmentation Report (authed, quota-capped).
  if (req.method === "POST" && pathname === "/admin/defrag/generate") {
    if (!isAdmin(req, urlObj)) {
      loginPage(res, 401);
      return;
    }
    let fields;
    try {
      // The workflow doc can be long; allow up to 128 KiB of form data.
      const raw = await readBody(req, 128 * 1024);
      fields = new URLSearchParams(raw);
    } catch {
      res.writeHead(303, { Location: "/admin/defrag?msg=toolong", "Cache-Control": "no-store" });
      res.end();
      return;
    }
    try {
      const id = await generateReport(pool, {
        prospect: fields.get("prospect"),
        note: fields.get("note"),
        doc: fields.get("doc"),
      });
      res.writeHead(303, {
        Location: `/admin/defrag/report?id=${id}`,
        "Cache-Control": "no-store",
      });
      res.end();
    } catch (err) {
      if (err instanceof DefragError) {
        res.writeHead(303, {
          Location: `/admin/defrag?msg=err&detail=${encodeURIComponent(err.message)}`,
          "Cache-Control": "no-store",
        });
        res.end();
        return;
      }
      console.error("[defrag] generate failed:", err.message);
      res.writeHead(303, { Location: "/admin/defrag?msg=error", "Cache-Control": "no-store" });
      res.end();
    }
    return;
  }

  // Delete a stored report (per-report deletion, part of the data posture).
  if (req.method === "POST" && pathname === "/admin/defrag/delete") {
    if (!isAdmin(req, urlObj)) {
      loginPage(res, 401);
      return;
    }
    let id = "";
    try {
      const raw = await readBody(req);
      id = new URLSearchParams(raw).get("id") || "";
    } catch {
      // fall through: treated as not found
    }
    let removed = false;
    try {
      removed = await deleteReport(pool, id);
    } catch (err) {
      console.error("[defrag] delete failed:", err.message);
    }
    res.writeHead(303, {
      Location: `/admin/defrag?msg=${removed ? "deleted" : "notfound"}`,
      "Cache-Control": "no-store",
    });
    res.end();
    return;
  }

  // Add or edit a pipeline target (authed).
  if (req.method === "POST" && pathname === "/admin/pipeline/save") {
    if (!isAdmin(req, urlObj)) {
      loginPage(res, 401);
      return;
    }
    let fields;
    try {
      const raw = await readBody(req, 16 * 1024);
      fields = new URLSearchParams(raw);
    } catch {
      res.writeHead(303, { Location: "/admin/pipeline?msg=bad", "Cache-Control": "no-store" });
      res.end();
      return;
    }
    try {
      const id = await saveTarget(fields.get("id"), {
        name: fields.get("name"),
        org: fields.get("org"),
        segment: fields.get("segment"),
        stage: fields.get("stage"),
        value_usd: fields.get("value_usd"),
        next_action: fields.get("next_action"),
        notes: fields.get("notes"),
      });
      res.writeHead(303, {
        Location: `/admin/pipeline?msg=${id ? "saved" : "notfound"}`,
        "Cache-Control": "no-store",
      });
      res.end();
    } catch (err) {
      const msg = err.message === "name_required" ? "noname" : "error";
      if (msg === "error") console.error("[pipeline] save failed:", err.message);
      res.writeHead(303, { Location: `/admin/pipeline?msg=${msg}`, "Cache-Control": "no-store" });
      res.end();
    }
    return;
  }

  // Delete a pipeline target (authed).
  if (req.method === "POST" && pathname === "/admin/pipeline/delete") {
    if (!isAdmin(req, urlObj)) {
      loginPage(res, 401);
      return;
    }
    let removed2 = false;
    try {
      const raw = await readBody(req);
      removed2 = await deleteTarget(new URLSearchParams(raw).get("id"));
    } catch (err) {
      console.error("[pipeline] delete failed:", err.message);
    }
    res.writeHead(303, {
      Location: `/admin/pipeline?msg=${removed2 ? "deleted" : "notfound"}`,
      "Cache-Control": "no-store",
    });
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("405 Method Not Allowed");
    return;
  }

  // Logout
  if (pathname === "/admin/logout") {
    res.writeHead(303, {
      Location: "/admin/waitlist",
      "Set-Cookie": `wl_admin=; ${cookieAttrs(req)} Max-Age=0`,
      "Cache-Control": "no-store",
    });
    res.end();
    return;
  }

  if (!isAdmin(req, urlObj)) {
    loginPage(res, 401);
    return;
  }

  // CSV export (optionally filtered by ?source=)
  if (pathname === "/admin/waitlist.csv") {
    const sourceFilter = cleanSourceFilter(urlObj.searchParams.get("source"));
    let rows;
    try {
      rows = await fetchSignups(sourceFilter);
    } catch (err) {
      console.error("[admin] csv query failed:", err.message);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("500 Server Error");
      return;
    }
    const lines = ["email,source,created_at,status,confirmed_at"];
    for (const r of rows) {
      const ts =
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at);
      const confTs = r.confirmed_at
        ? r.confirmed_at instanceof Date
          ? r.confirmed_at.toISOString()
          : String(r.confirmed_at)
        : "";
      const status = r.confirmed_at ? "confirmed" : "pending";
      lines.push(
        [
          csvField(r.email),
          csvField(r.source),
          csvField(ts),
          csvField(status),
          csvField(confTs),
        ].join(","),
      );
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const suffix = sourceFilter ? `-${sourceFilter}` : "";
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="waitlist-signups${suffix}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    });
    res.end(lines.join("\r\n") + "\r\n");
    return;
  }

  // Single-record data-access export (right-to-access request).
  if (pathname === "/admin/waitlist/record") {
    const email = String(urlObj.searchParams.get("email") || "")
      .trim()
      .toLowerCase();
    if (!email) {
      res.writeHead(303, {
        Location: "/admin/waitlist?msg=needemail",
        "Cache-Control": "no-store",
      });
      res.end();
      return;
    }
    let row;
    try {
      await ensureTable();
      const result = await pool.query(
        `SELECT email, source, created_at, confirmed_at
           FROM waitlist_signups
          WHERE email = $1`,
        [email],
      );
      row = result.rows[0];
    } catch (err) {
      console.error("[admin] record query failed:", err.message);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("500 Server Error");
      return;
    }
    if (!row) {
      res.writeHead(303, {
        Location: "/admin/waitlist?msg=notfound",
        "Cache-Control": "no-store",
      });
      res.end();
      return;
    }
    const ts =
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at);
    const confTs = row.confirmed_at
      ? row.confirmed_at instanceof Date
        ? row.confirmed_at.toISOString()
        : String(row.confirmed_at)
      : null;
    // Deliberately omits unsub_token/confirm_token — those are credentials,
    // not user data.
    const record = {
      email: row.email,
      source: row.source,
      created_at: ts,
      status: row.confirmed_at ? "confirmed" : "pending",
      confirmed_at: confTs,
    };
    const stamp = new Date().toISOString().slice(0, 10);
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="signup-record-${stamp}.json"`,
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(record, null, 2) + "\n");
    return;
  }

  // Table view
  if (pathname === "/admin/waitlist") {
    const sourceFilter = cleanSourceFilter(urlObj.searchParams.get("source"));
    let rows;
    let counts;
    try {
      [rows, counts] = await Promise.all([
        fetchSignups(sourceFilter),
        fetchSourceCounts(),
      ]);
    } catch (err) {
      console.error("[admin] view query failed:", err.message);
      res.writeHead(500, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(adminShell(`<h1>Query failed</h1><p style="color:#A8997B">${esc(err.message)}</p>`));
      return;
    }
    const bodyRows = rows.length
      ? rows
          .map((r) => {
            const ts =
              r.created_at instanceof Date
                ? r.created_at.toISOString()
                : String(r.created_at);
            const status = r.confirmed_at
              ? `<span class="status ok">Confirmed</span>`
              : `<span class="status pending">Pending</span>`;
            return `<tr><td>${esc(r.email)}</td><td class="tag">${esc(r.source || "")}</td><td>${status}</td><td>${esc(ts)}</td></tr>`;
          })
          .join("")
      : "";
    const table = rows.length
      ? `<table><thead><tr><th>Email</th><th>Source</th><th>Status</th><th>Signed up</th></tr></thead><tbody>${bodyRows}</tbody></table>`
      : sourceFilter
        ? `<p class="empty">No signups for source "${esc(sourceFilter)}".</p>`
        : `<p class="empty">No signups yet.</p>`;
    const total = counts.reduce((sum, c) => sum + c.count, 0);
    const chips = counts.length
      ? `<div class="chips">
  <a class="chip${sourceFilter ? "" : " on"}" href="/admin/waitlist">All <span class="n">${total}</span></a>${counts
    .map(
      (c) =>
        `<a class="chip${sourceFilter === c.source ? " on" : ""}" href="/admin/waitlist?source=${encodeURIComponent(c.source)}">${esc(c.source)} <span class="n">${c.count}</span></a>`,
    )
    .join("")}
</div>`
      : "";
    const MSGS = {
      deleted: ["ok", "Signup deleted."],
      notfound: ["warn", "No matching signup found."],
      needemail: ["warn", "Enter an email address first."],
      bad: ["warn", "Bad request."],
      error: ["warn", "Something went wrong. Try again."],
      resent: ["ok", "Confirmation email resent."],
      confirmed: ["ok", "Signup manually confirmed. Welcome email sent."],
      alreadyconfirmed: ["warn", "That signup is already confirmed."],
    };
    const msgKey = urlObj.searchParams.get("msg") || "";
    const msg = MSGS[msgKey]
      ? `<p class="notice ${MSGS[msgKey][0]}">${esc(MSGS[msgKey][1])}</p>`
      : "";
    const dataRights = `<section class="ops">
  <h2>Confirmation support</h2>
  <form class="ops-form" method="POST" action="/admin/waitlist/resend">
    <label for="resend-email">Resend confirmation email (pending only)</label>
    <div class="ops-row">
      <input id="resend-email" name="email" type="email" placeholder="person@example.com" autocomplete="off" required>
      <button class="btn ghost" type="submit">Resend</button>
    </div>
  </form>
  <form class="ops-form" method="POST" action="/admin/waitlist/confirm" onsubmit="return confirm('Manually confirm this signup and send the welcome email?')">
    <label for="confirm-email">Manually confirm a signup (pending only — sends welcome email once)</label>
    <div class="ops-row">
      <input id="confirm-email" name="email" type="email" placeholder="person@example.com" autocomplete="off" required>
      <button class="btn ghost" type="submit">Confirm</button>
    </div>
  </form>
  <h2 style="margin-top:28px">Data rights (support)</h2>
  <form class="ops-form" method="POST" action="/admin/waitlist/delete" onsubmit="return confirm('Permanently delete this signup?')">
    <label for="del-email">Delete a signup by email (erasure request)</label>
    <div class="ops-row">
      <input id="del-email" name="email" type="email" placeholder="person@example.com" autocomplete="off" required>
      <button class="btn danger" type="submit">Delete</button>
    </div>
  </form>
  <form class="ops-form" method="GET" action="/admin/waitlist/record">
    <label for="rec-email">Export one person's record (access request)</label>
    <div class="ops-row">
      <input id="rec-email" name="email" type="email" placeholder="person@example.com" autocomplete="off" required>
      <button class="btn ghost" type="submit">Export JSON</button>
    </div>
  </form>
</section>`;
    const csvHref = sourceFilter
      ? `/admin/waitlist.csv?source=${encodeURIComponent(sourceFilter)}`
      : "/admin/waitlist.csv";
    const confirmedCount = rows.filter((r) => r.confirmed_at).length;
    const pendingCount = rows.length - confirmedCount;
    const base = sourceFilter
      ? `${rows.length} in "${esc(sourceFilter)}"`
      : `${rows.length} signup${rows.length === 1 ? "" : "s"}`;
    const shownLabel = `${base} · ${confirmedCount} confirmed, ${pendingCount} pending`;
    const body = `<p class="eyebrow">Growth Cartography — Internal</p>
<h1>Waitlist signups</h1>
${msg}
${chips}
<div class="bar">
  <a class="btn" href="${csvHref}">Download CSV${sourceFilter ? ` (${esc(sourceFilter)})` : ""}</a>
  <span class="count">${shownLabel}</span>
  <a href="/admin/logout" style="margin-left:auto">Log out</a>
</div>
${table}
${dataRights}`;
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(adminShell(body));
    return;
  }

  // Defrag: submission form + report history
  if (pathname === "/admin/defrag") {
    let rows = [];
    let usedToday = 0;
    try {
      await purgeExpiredReports(pool);
      [rows, usedToday] = await Promise.all([listReports(pool), countReportsToday(pool)]);
    } catch (err) {
      console.error("[defrag] list failed:", err.message);
    }
    const MSGS = {
      deleted: ["ok", "Report deleted."],
      notfound: ["warn", "No matching report found."],
      toolong: ["warn", "Submission too large. Trim the document and try again."],
      error: ["warn", "Something went wrong. Try again."],
    };
    const msgKey = urlObj.searchParams.get("msg") || "";
    let msg = MSGS[msgKey]
      ? `<p class="notice ${MSGS[msgKey][0]}">${esc(MSGS[msgKey][1])}</p>`
      : "";
    if (msgKey === "err") {
      const detail = String(urlObj.searchParams.get("detail") || "").slice(0, 300);
      msg = `<p class="notice warn">${esc(detail || "Generation failed. Try again.")}</p>`;
    }
    const aiOk = aiConfigured();
    const quotaLeft = Math.max(0, DEFRAG_LIMITS.DAILY_LIMIT - usedToday);
    const history = rows.length
      ? `<table><thead><tr><th>Prospect</th><th>Note</th><th>Score</th><th>Created</th><th></th></tr></thead><tbody>${rows
          .map((r) => {
            const ts = r.created_at instanceof Date ? r.created_at.toISOString().slice(0, 16).replace("T", " ") : String(r.created_at);
            return `<tr><td>${esc(r.prospect)}</td><td class="tag">${esc(r.note || "")}</td><td>${esc(r.score ?? "")}</td><td>${esc(ts)}</td><td style="white-space:nowrap"><a href="/admin/defrag/report?id=${r.id}">View</a> · <a href="/admin/defrag/report.pdf?id=${r.id}">PDF</a> · <form method="POST" action="/admin/defrag/delete" style="display:inline" onsubmit="return confirm('Delete this report and its source document?')"><input type="hidden" name="id" value="${r.id}"><button class="btn danger" style="padding:2px 10px;font-size:.78rem" type="submit">Delete</button></form></td></tr>`;
          })
          .join("")}</tbody></table>`
      : `<p class="empty">No reports yet.</p>`;
    const body = `<p class="eyebrow">Growth Cartography — Internal</p>
<h1>Process Defragmentation Reports</h1>
<div class="bar">
  <a href="/admin/waitlist">Waitlist signups</a>
  <span class="count">${usedToday}/${DEFRAG_LIMITS.DAILY_LIMIT} generations used in the last 24h (${quotaLeft} left)</span>
  <a href="/admin/logout" style="margin-left:auto">Log out</a>
</div>
${msg}
${aiOk ? "" : `<p class="notice warn">AI backend not configured. Set the OpenAI integration secrets to enable generation.</p>`}
<form class="ops-form" method="POST" action="/admin/defrag/generate" style="max-width:720px">
  <label for="dg-prospect">Prospect / company name</label>
  <input id="dg-prospect" name="prospect" type="text" maxlength="120" autocomplete="off" required>
  <label for="dg-note">Internal note (optional, shows only in this list)</label>
  <input id="dg-note" name="note" type="text" maxlength="200" autocomplete="off">
  <label for="dg-doc">Workflow document (paste text, ${DEFRAG_LIMITS.MIN_DOC_CHARS} to ${DEFRAG_LIMITS.MAX_DOC_CHARS} characters)</label>
  <textarea id="dg-doc" name="doc" rows="12" minlength="${DEFRAG_LIMITS.MIN_DOC_CHARS}" maxlength="${DEFRAG_LIMITS.MAX_DOC_CHARS}" required style="width:100%;box-sizing:border-box;background:#15120c;border:1px solid #2a2418;border-radius:8px;color:#F0E8D5;padding:10px 12px;font-size:.9rem;font-family:inherit;margin:0 0 14px"></textarea>
  <p style="color:#7A6A50;font-size:.8rem;margin:0 0 14px">Data handling: the document is analyzed by an LLM backend, treated strictly as data, and never used to train models. The document and report are stored for ${DEFRAG_LIMITS.RETENTION_DAYS} days, then deleted automatically. You can delete any report immediately from the list below. The generated report is advisory and is not legal, financial, or compliance advice.</p>
  <button class="btn" type="submit"${aiOk ? "" : " disabled"}>Generate report</button>
  <span class="count" style="margin-left:12px">Takes up to a minute.</span>
</form>
<h2 style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.15rem;margin:36px 0 14px">Report history</h2>
${history}`;
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(adminShell(body));
    return;
  }

  // Defrag: branded HTML report view
  if (pathname === "/admin/defrag/report") {
    const row = await getReport(pool, urlObj.searchParams.get("id"));
    if (!row) {
      res.writeHead(303, { Location: "/admin/defrag?msg=notfound", "Cache-Control": "no-store" });
      res.end();
      return;
    }
    const toolbar = `<div style="position:sticky;top:0;background:#15120c;border-bottom:1px solid #2a2418;padding:10px 24px;display:flex;gap:18px;align-items:center;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px"><a style="color:#FFB12B" href="/admin/defrag">&larr; Back to reports</a><a style="color:#FFB12B" href="/admin/defrag/report.pdf?id=${row.id}">Download PDF</a></div>`;
    const html = renderReportHTML(row, "web").replace("<body>", `<body>${toolbar}`);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(html);
    return;
  }

  // Defrag: PDF export via headless chromium
  if (pathname === "/admin/defrag/report.pdf") {
    const row = await getReport(pool, urlObj.searchParams.get("id"));
    if (!row) {
      res.writeHead(303, { Location: "/admin/defrag?msg=notfound", "Cache-Control": "no-store" });
      res.end();
      return;
    }
    let pdf;
    try {
      pdf = await renderReportPDF(row);
    } catch (err) {
      console.error("[defrag] pdf render failed:", err.message);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("500 PDF export failed");
      return;
    }
    const slug = String(row.prospect || "report")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "report";
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="defrag-report-${slug}-${row.id}.pdf"`,
      "Cache-Control": "no-store",
    });
    res.end(pdf);
    return;
  }

  // Revenue pipeline tracker: targets CRUD + funnel + goal progress.
  if (pathname === "/admin/pipeline") {
    if (!pipelineConfigured) {
      res.writeHead(503, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(adminShell(`<h1>Storage unavailable</h1><p style="color:#A8997B">No <code>DATABASE_URL</code> is configured.</p>`));
      return;
    }
    let rows = [];
    let stats = null;
    let editRow = null;
    try {
      [rows, stats] = await Promise.all([listTargets(), pipelineStats()]);
      const editId = urlObj.searchParams.get("edit");
      if (editId) editRow = await getTarget(editId);
    } catch (err) {
      console.error("[pipeline] list failed:", err.message);
      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(adminShell(`<h1>Query failed</h1><p style="color:#A8997B">${esc(err.message)}</p>`));
      return;
    }
    const MSGS = {
      saved: ["ok", "Target saved."],
      deleted: ["ok", "Target deleted."],
      notfound: ["warn", "No matching target found."],
      noname: ["warn", "A name is required."],
      bad: ["warn", "Bad request."],
      error: ["warn", "Something went wrong. Try again."],
    };
    const msgKey = urlObj.searchParams.get("msg") || "";
    const msg = MSGS[msgKey]
      ? `<p class="notice ${MSGS[msgKey][0]}">${esc(MSGS[msgKey][1])}</p>`
      : "";
    const stageLabel = Object.fromEntries(STAGES);
    const segLabel = Object.fromEntries(SEGMENTS);
    const usd = (n) => `$${Number(n || 0).toLocaleString("en-US")}`;

    // Goal progress line
    const deadlinePassed = stats.daysLeft < 0;
    const goal = `<div style="background:#15120c;border:1px solid #E0920C;border-radius:12px;padding:16px 20px;margin:0 0 20px">
  <p class="eyebrow" style="margin:0 0 8px">Goal: ${esc(GOAL.label)} by ${esc(GOAL.deadline)}</p>
  <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:baseline">
    <span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.5rem;font-weight:700;color:#FFCB6B">${usd(stats.closedValue)} closed</span>
    <span class="count">of ${usd(GOAL.amount)} (${stats.pct}%) · ${usd(stats.openValue)} open in pipeline · ${deadlinePassed ? "deadline passed" : `${stats.daysLeft} days left`}</span>
  </div>
  <div style="background:#0D0B08;border-radius:999px;height:10px;margin-top:12px;overflow:hidden"><div style="background:#FFB12B;height:100%;width:${stats.pct}%"></div></div>
</div>`;

    // Funnel chips
    const funnel = `<div class="chips">${STAGES.map(([slug, label]) => {
      const s = stats.byStage[slug] || { count: 0, value: 0 };
      return `<span class="chip">${esc(label)} <span class="n">${s.count}</span></span>`;
    }).join("")}</div>`;

    // Add / edit form
    const f = editRow || {};
    const opts = (pairs, sel) =>
      pairs.map(([v, l]) => `<option value="${v}"${v === sel ? " selected" : ""}>${esc(l)}</option>`).join("");
    const selStyle = `width:100%;box-sizing:border-box;background:#15120c;border:1px solid #2a2418;border-radius:8px;color:#F0E8D5;padding:10px 12px;font-size:.95rem;margin:0 0 14px`;
    const form = `<form class="ops-form" method="POST" action="/admin/pipeline/save" style="max-width:720px">
  ${editRow ? `<input type="hidden" name="id" value="${editRow.id}"><p class="notice warn">Editing: ${esc(editRow.name)} · <a href="/admin/pipeline">cancel</a></p>` : ""}
  <div class="ops-row">
    <div style="flex:1 1 220px"><label>Name</label><input name="name" maxlength="120" required value="${esc(f.name || "")}"></div>
    <div style="flex:1 1 220px"><label>Organization</label><input name="org" maxlength="120" value="${esc(f.org || "")}"></div>
  </div>
  <div class="ops-row">
    <div style="flex:1 1 160px"><label>Segment</label><select name="segment" style="${selStyle}">${opts(SEGMENTS, f.segment || "other")}</select></div>
    <div style="flex:1 1 160px"><label>Stage</label><select name="stage" style="${selStyle}">${opts(STAGES, f.stage || "target")}</select></div>
    <div style="flex:1 1 160px"><label>Value (USD)</label><input name="value_usd" type="number" min="0" step="1" value="${esc(f.value_usd ?? 0)}"></div>
  </div>
  <label>Next action</label><input name="next_action" maxlength="300" value="${esc(f.next_action || "")}" placeholder="e.g. Send Touch 2 on Thursday">
  <label>Notes</label><textarea name="notes" rows="3" maxlength="4000" style="width:100%;box-sizing:border-box;background:#15120c;border:1px solid #2a2418;border-radius:8px;color:#F0E8D5;padding:10px 12px;font-size:.9rem;font-family:inherit;margin:0 0 14px">${esc(f.notes || "")}</textarea>
  <button class="btn" type="submit">${editRow ? "Save changes" : "Add target"}</button>
</form>`;

    const table = rows.length
      ? `<table><thead><tr><th>Name</th><th>Org</th><th>Segment</th><th>Stage</th><th>Value</th><th>Next action</th><th>Updated</th><th></th></tr></thead><tbody>${rows
          .map((r) => {
            const ts = r.updated_at instanceof Date ? r.updated_at.toISOString().slice(0, 10) : String(r.updated_at);
            const st = r.stage === "closed" ? "ok" : r.stage === "lost" ? "pending" : "";
            return `<tr><td>${esc(r.name)}</td><td>${esc(r.org)}</td><td class="tag">${esc(segLabel[r.segment] || r.segment)}</td><td><span class="status ${st}">${esc(stageLabel[r.stage] || r.stage)}</span></td><td>${usd(r.value_usd)}</td><td>${esc(r.next_action)}</td><td class="count">${esc(ts)}</td><td style="white-space:nowrap"><a href="/admin/pipeline?edit=${r.id}">Edit</a> · <form method="POST" action="/admin/pipeline/delete" style="display:inline" onsubmit="return confirm('Delete this target?')"><input type="hidden" name="id" value="${r.id}"><button class="btn danger" style="padding:2px 10px;font-size:.78rem" type="submit">Delete</button></form></td></tr>`;
          })
          .join("")}</tbody></table>`
      : `<p class="empty">No targets yet. Add the first one above.</p>`;

    const body = `<p class="eyebrow">Growth Cartography — Internal</p>
<h1>Revenue pipeline</h1>
<div class="bar">
  <a href="/admin/waitlist">Waitlist signups</a>
  <a href="/admin/defrag">Defrag reports</a>
  <a href="/admin/logout" style="margin-left:auto">Log out</a>
</div>
${msg}
${goal}
${funnel}
<h2 style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.15rem;margin:8px 0 14px">${editRow ? "Edit target" : "Add a target"}</h2>
${form}
<h2 style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.15rem;margin:36px 0 14px">Targets (${rows.length})</h2>
${table}`;
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(adminShell(body));
    return;
  }

  // Unknown /admin/* path
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Not Found");
}

/* ---------------- Skillfoundry commerce ---------------- */
const PLUGIN_ZIP = path.join(__dirname, "private", "skillfoundry-plugin.zip");
// Gated MarCom OS Tier 1 playbook package (built by build.mjs, outside dist/).
const KIT_ZIP = path.join(__dirname, "private", "marcom-kit-playbook.zip");
// Gated Davos Decision Kit package (built by build.mjs, outside dist/).
const DAVOS_ZIP = path.join(__dirname, "private", "davos-decision-kit.zip");

// Read the raw request body as a Buffer (needed for Stripe signature checks).
function readRawBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let over = false;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        over = true;
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () =>
      over ? reject(new Error("payload too large")) : resolve(Buffer.concat(chunks)),
    );
    req.on("error", reject);
  });
}

/* ---------------- self-serve key recovery (/manage) ---------------- */
// On-brand page reusing the same card shell as the unsubscribe/confirm flows.
function managePage(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
  });
  res.end(unsubscribeShell(body, "Manage your purchase — False Dawn Industries"));
}

async function handleManagePage(req, res) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("405 Method Not Allowed");
    return;
  }
  managePage(
    res,
    200,
    `<p class="eyebrow">Your purchase</p>
<h1>Look up your key</h1>
<p>Enter the email address you used when you purchased. We'll email your key(s) and — for subscribers — a billing-management link.</p>
<form id="manage-form" method="POST" action="/api/manage">
  <label for="mgmt-email" style="display:block;font-size:.88rem;color:#A8997B;margin:0 0 6px">Purchase email</label>
  <input id="mgmt-email" name="email" type="email" autocomplete="email" required
    style="width:100%;box-sizing:border-box;background:#1C160D;border:1px solid #3A2D1C;border-radius:8px;color:#F0E8D5;padding:11px 13px;font-size:1rem;margin:0 0 14px;display:block"
    placeholder="you@example.com">
  <button class="btn" type="submit" style="width:100%">Email my key</button>
</form>
<p class="muted" style="margin-top:20px;font-size:.88rem">If you purchased with a different address, or need further help, reply to your original confirmation email.</p>
<script>
  var f=document.getElementById("manage-form");
  if(f){f.addEventListener("submit",function(ev){
    ev.preventDefault();
    var btn=f.querySelector("button[type=submit]");
    btn.disabled=true;btn.textContent="Sending…";
    var fd=new FormData(f);
    fetch("/api/manage",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:fd.get("email")})})
      .then(function(r){return r.json();})
      .then(function(d){
        f.innerHTML="<h2 style='margin:0 0 10px'>Check your inbox</h2><p class='muted'>If that address has a purchase on file, you'll receive an email with your key(s) shortly.</p><p><a href='/'>Return to False Dawn Industries</a></p>";
      })
      .catch(function(){btn.disabled=false;btn.textContent="Email my key";});
  });}
</script>`,
  );
}

async function handleManageSubmit(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }
  // Rate-limit before doing any work.
  try {
    await manageLimiter.consume(clientIp(req));
  } catch (rl) {
    const retrySec = Math.ceil(
      (rl && typeof rl.msBeforeNext === "number" ? rl.msBeforeNext : 900000) / 1000,
    );
    res.setHeader("Retry-After", String(retrySec));
    sendJson(res, 429, { ok: false, error: "rate_limited" });
    return;
  }
  let email;
  try {
    const raw = await readBody(req);
    const parsed = raw ? JSON.parse(raw) : {};
    email = String(parsed.email || "").trim().toLowerCase();
  } catch {
    sendJson(res, 400, { ok: false, error: "bad_request" });
    return;
  }
  if (!email || !EMAIL_RE.test(email)) {
    sendJson(res, 422, { ok: false, error: "invalid_email" });
    return;
  }
  if (!commerceStorage()) {
    sendJson(res, 503, { ok: false, error: "storage_unavailable" });
    return;
  }
  // Always return 200 regardless of whether the email matched — prevents
  // enumeration of which addresses have purchases on file.
  sendJson(res, 200, { ok: true });
  // Look up entitlements and email them. Best-effort: never blocks the response.
  try {
    const entitlements = await getEntitlementsByEmail(email);
    if (entitlements.length > 0) {
      // Use the configured canonical origin for email links so a spoofed
      // Host or X-Forwarded-Proto header cannot redirect keys to an attacker.
      sendKeyRecoveryEmail({
        email,
        entitlements,
        origin: SITE_ORIGIN || reqOrigin(req),
      }).catch((err) => console.error("[manage] recovery email failed:", err.message));
    }
  } catch (err) {
    console.error("[manage] entitlement lookup failed:", err.message);
  }
}

// Accepts ?key=... and creates a fresh Stripe portal session then redirects.
// This is the target of the "Manage billing" link in the recovery email, so
// the link itself never expires — a fresh session is created on each click.
async function handleManagePortal(req, res, urlObj) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("405 Method Not Allowed");
    return;
  }
  const key = (urlObj.searchParams.get("key") || "").trim();
  if (!key) {
    managePage(
      res,
      400,
      `<p class="eyebrow">Your purchase</p><h1>Missing key</h1><p class="muted">No key was supplied. <a href="/manage">Try the key lookup</a> to get a new link.</p>`,
    );
    return;
  }
  if (!stripeConfigured() || !commerceStorage()) {
    managePage(
      res,
      503,
      `<p class="eyebrow">Your purchase</p><h1>Temporarily unavailable</h1><p class="muted">The billing portal isn't reachable right now. Please try again later.</p>`,
    );
    return;
  }
  try {
    const { url } = await createPortalSession({ key, origin: reqOrigin(req) });
    res.writeHead(303, { Location: url, "Cache-Control": "no-store" });
    res.end();
  } catch (err) {
    if (err instanceof CommerceError && err.code === "unknown_key") {
      managePage(
        res,
        404,
        `<p class="eyebrow">Your purchase</p><h1>Key not found</h1><p class="muted">That key wasn't recognised. <a href="/manage">Look up your key</a> with your purchase email.</p>`,
      );
      return;
    }
    if (err instanceof CommerceError && err.code === "no_customer") {
      managePage(
        res,
        400,
        `<p class="eyebrow">Your purchase</p><h1>No billing account</h1><p class="muted">This key doesn't have an associated billing account. Perpetual licenses don't have a billing portal.</p>`,
      );
      return;
    }
    console.error("[manage] portal redirect failed:", err.message);
    managePage(
      res,
      500,
      `<p class="eyebrow">Your purchase</p><h1>Something went wrong</h1><p class="muted">We couldn't open the billing portal. Please try again later.</p>`,
    );
  }
}

function reqOrigin(req) {
  const proto =
    (req.headers["x-forwarded-proto"] || "").split(",")[0].trim() || "http";
  const host = req.headers.host || `${HOST}:${PORT}`;
  return `${proto}://${host}`;
}

async function handleCheckout(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }
  if (!await consumeRateLimit(checkoutLimiter, req, res)) return;
  if (!stripeConfigured() || !commerceStorage()) {
    sendJson(res, 503, {
      ok: false,
      error: "commerce_unavailable",
      message: "Checkout isn't live yet. Join the waitlist and we'll email you.",
    });
    return;
  }
  let tierId;
  try {
    const raw = await readBody(req);
    const parsed = raw ? JSON.parse(raw) : {};
    tierId = String(parsed.tier || "").trim();
  } catch {
    sendJson(res, 400, { ok: false, error: "bad_request" });
    return;
  }
  if (!TIERS[tierId]) {
    sendJson(res, 400, { ok: false, error: "unknown_tier" });
    return;
  }
  try {
    const { url } = await createCheckoutSession({
      tierId,
      origin: reqOrigin(req),
    });
    sendJson(res, 200, { ok: true, url });
  } catch (err) {
    if (err instanceof CommerceError) {
      sendJson(res, err.status, {
        ok: false,
        error: err.code,
        message:
          "Checkout isn't live yet. Join the waitlist and we'll email you.",
      });
      return;
    }
    console.error("[commerce] checkout failed:", err.message);
    sendJson(res, 500, { ok: false, error: "server_error" });
  }
}

async function handleStripeWebhook(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }
  const sig = req.headers["stripe-signature"];
  if (!sig) {
    sendJson(res, 400, { ok: false, error: "missing_signature" });
    return;
  }
  let raw;
  try {
    raw = await readRawBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "bad_request" });
    return;
  }
  let event;
  try {
    event = constructEvent(raw, sig);
  } catch (err) {
    if (err instanceof CommerceError) {
      sendJson(res, err.status, { ok: false, error: err.code });
      return;
    }
    // Signature verification failed — reject.
    console.error("[commerce] webhook signature failed:", err.message);
    sendJson(res, 400, { ok: false, error: "invalid_signature" });
    return;
  }
  try {
    await handleEvent(event);
    sendJson(res, 200, { received: true });
  } catch (err) {
    console.error("[commerce] webhook handler error:", err.message);
    // 500 tells Stripe to retry (the ledger claim was released on failure).
    sendJson(res, 500, { ok: false, error: "handler_error" });
  }
}

async function handleValidate(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }
  if (!await consumeRateLimit(validateLimiter, req, res)) return;
  if (!commerceStorage()) {
    sendJson(res, 503, { ok: false, error: "storage_unavailable" });
    return;
  }
  let key;
  try {
    const raw = await readBody(req);
    const parsed = raw ? JSON.parse(raw) : {};
    key = String(parsed.key || "").trim();
  } catch {
    sendJson(res, 400, { ok: false, error: "bad_request" });
    return;
  }
  if (!key) {
    sendJson(res, 400, { ok: false, error: "missing_key" });
    return;
  }
  const result = await validateKey(key);
  // The subscription gate is subscription-only AND SkillFoundry-only: a Tier 1
  // perpetual LICENSE key must NOT pass here even when "active", and a
  // MarCom OS key never unlocks the SkillFoundry run path.
  const active =
    result.active &&
    result.keyType === "subscription" &&
    result.product === "skillfoundry";
  // 402 (payment required) is a clear, machine-actionable refusal for clients.
  const status = active ? 200 : 402;
  sendJson(res, status, {
    ok: active,
    active,
    tier: result.tier || null,
    status: result.status || "unknown",
  });
}

// The Tier 2 protected run path. The latest gate logic stays server-side; the
// thin client only gets a result after the subscription key validates active.
async function handleRun(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }
  if (!await consumeRateLimit(runLimiter, req, res)) return;
  if (!commerceStorage()) {
    sendJson(res, 503, { ok: false, error: "storage_unavailable" });
    return;
  }
  let key;
  let asset;
  let assetTitle;
  let assetSource;
  try {
    const raw = await readBody(req);
    const parsed = raw ? JSON.parse(raw) : {};
    key = String(parsed.key || "").trim();
    asset = String(parsed.asset || "").trim();
    assetTitle = parsed.title ? String(parsed.title).trim() : "";
    assetSource = parsed.source ? String(parsed.source).trim() : "";
  } catch {
    sendJson(res, 400, { ok: false, error: "bad_request" });
    return;
  }
  if (!key) {
    sendJson(res, 400, { ok: false, error: "missing_key" });
    return;
  }
  if (!asset) {
    sendJson(res, 400, {
      ok: false,
      error: "missing_asset",
      message: "Provide the content asset to audit in the 'asset' field.",
    });
    return;
  }
  const result = await validateKey(key);
  // Product gate first: only SkillFoundry keys may reach the SkillFoundry run
  // path. A MarCom OS key (any tier) is refused with the same 402 shape.
  if (result.found && result.product !== "skillfoundry") {
    sendJson(res, 402, {
      ok: false,
      active: false,
      error: "wrong_product",
      message:
        "This key is not a Skillfoundry key. The run endpoint requires a Living Brain (Tier 2) or Advisory (Tier 3) Skillfoundry subscription.",
    });
    return;
  }
  // Subscription-only gate: a Tier 1 perpetual LICENSE key must be refused here
  // even if active — the server-side run path belongs to Tier 2/3 subscribers.
  if (result.keyType && result.keyType !== "subscription") {
    sendJson(res, 402, {
      ok: false,
      active: false,
      error: "not_a_subscription",
      message:
        "This is a perpetual license key. The over-the-wire run requires a Living Brain (Tier 2) or Advisory (Tier 3) subscription.",
    });
    return;
  }
  if (!result.active || result.keyType !== "subscription") {
    sendJson(res, 402, {
      ok: false,
      active: false,
      error: "subscription_inactive",
      message:
        "This Skillfoundry subscription key is not active. Renew or update billing to continue.",
    });
    return;
  }
  // Entitlement gate passed — run the REAL three-gate Skillfoundry audit
  // server-side (Relevance / Performance / Algorithmic Signal). The gate logic
  // stays on the server; the thin client only ever gets the finished report.
  let report;
  try {
    report = runAudit(asset, { title: assetTitle, source: assetSource });
  } catch (err) {
    console.error("skillfoundry audit failed:", err);
    sendJson(res, 500, { ok: false, error: "audit_failed" });
    return;
  }
  // Guarantee the output conforms to the deterministic audit contract before it
  // leaves the server. A conformance miss is a server bug, not the buyer's, so
  // we log it and still return the report (never fail a paid run over a nit).
  const errors = validateReport(report);
  if (errors.length > 0) {
    console.error("skillfoundry audit report failed schema validation:", errors);
  }
  sendJson(res, 200, {
    ok: true,
    active: true,
    tier: result.tier,
    result: report,
  });
}

async function handlePortal(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }
  if (!await consumeRateLimit(portalLimiter, req, res)) return;
  if (!stripeConfigured() || !commerceStorage()) {
    sendJson(res, 503, { ok: false, error: "commerce_unavailable" });
    return;
  }
  let key;
  try {
    const raw = await readBody(req);
    const parsed = raw ? JSON.parse(raw) : {};
    key = String(parsed.key || "").trim();
  } catch {
    sendJson(res, 400, { ok: false, error: "bad_request" });
    return;
  }
  try {
    const { url } = await createPortalSession({ key, origin: reqOrigin(req) });
    sendJson(res, 200, { ok: true, url });
  } catch (err) {
    if (err instanceof CommerceError) {
      sendJson(res, err.status, { ok: false, error: err.code });
      return;
    }
    console.error("[commerce] portal failed:", err.message);
    sendJson(res, 500, { ok: false, error: "server_error" });
  }
}

async function handleDownload(req, res, urlObj) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("405 Method Not Allowed");
    return;
  }
  const key = (urlObj.searchParams.get("key") || "").trim();
  const row = key ? await getEntitlementByKey(key) : null;
  // SkillFoundry download: an active Tier 1 SkillFoundry license only. Kit
  // keys (even active licenses) must never unlock this package.
  const ok =
    row &&
    row.key_type === "license" &&
    row.status === "active" &&
    (row.product || "skillfoundry") === "skillfoundry" &&
    row.tier === "tier1";
  if (!ok) {
    res.writeHead(403, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end("403 — a valid, active Skillfoundry license key is required.");
    return;
  }
  if (!fs.existsSync(PLUGIN_ZIP)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("503 — plugin package not built yet.");
    return;
  }
  res.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-Disposition": 'attachment; filename="skillfoundry-plugin.zip"',
    "Cache-Control": "no-store",
  });
  fs.createReadStream(PLUGIN_ZIP).pipe(res);
}

// MarCom OS gated playbook download. Unlocked by: an active Tier 1 kit
// license (mk1) OR any active kit subscription that carries download rights
// (mk2 / mk2-annual / mk2-agency). Sprint/audit order keys and Tier 3 do not
// unlock a self-serve download; SkillFoundry keys never do.
const KIT_DOWNLOAD_TIERS = new Set(["mk1", "mk2", "mk2-annual", "mk2-agency"]);
async function handleKitDownload(req, res, urlObj) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("405 Method Not Allowed");
    return;
  }
  const key = (urlObj.searchParams.get("key") || "").trim();
  const row = key ? await getEntitlementByKey(key) : null;
  const ok =
    row &&
    row.status === "active" &&
    row.product === "marcom-kit" &&
    KIT_DOWNLOAD_TIERS.has(row.tier);
  if (!ok) {
    res.writeHead(403, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end("403 — a valid, active MarCom OS key with download rights is required.");
    return;
  }
  if (!fs.existsSync(KIT_ZIP)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("503 — playbook package not built yet.");
    return;
  }
  res.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-Disposition": 'attachment; filename="marcom-kit-playbook.zip"',
    "Cache-Control": "no-store",
  });
  fs.createReadStream(KIT_ZIP).pipe(res);
}

// Davos Decision Kit gated download. Unlocked ONLY by an active dk1 license.
// SkillFoundry and MarCom OS keys never unlock this package, and a Davos key
// never unlocks theirs (the product column is the gate).
async function handleDavosDownload(req, res, urlObj) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("405 Method Not Allowed");
    return;
  }
  const key = (urlObj.searchParams.get("key") || "").trim();
  const row = key ? await getEntitlementByKey(key) : null;
  const ok =
    row &&
    row.key_type === "license" &&
    row.status === "active" &&
    row.product === "davoskit" &&
    row.tier === "dk1";
  if (!ok) {
    res.writeHead(403, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end("403 — a valid, active Davos Decision Kit license key is required.");
    return;
  }
  if (!fs.existsSync(DAVOS_ZIP)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("503 — kit package not built yet.");
    return;
  }
  res.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-Disposition": 'attachment; filename="davos-decision-kit.zip"',
    "Cache-Control": "no-store",
  });
  fs.createReadStream(DAVOS_ZIP).pipe(res);
}

function commercePage(body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Skillfoundry — Order confirmation | False Dawn Industries</title>
<link rel="stylesheet" href="/site.css" />
<style>
  body{background:#0D0B08;color:#F0E8D5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:48px 20px}
  .card{max-width:560px;width:100%;background:#15120c;border:1px solid #2a2418;border-radius:16px;padding:40px}
  .eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#A8997B;margin:0 0 10px}
  h1{font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.7rem;margin:0 0 14px;line-height:1.2}
  p{line-height:1.6;color:#F0E8D5}
  .muted{color:#A8997B}
  .keybox{margin:22px 0;padding:16px 18px;background:#0D0B08;border:1px solid #2a2418;border-radius:10px}
  .keylbl{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:#A8997B;margin:0 0 6px}
  .keyval{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:1.25rem;letter-spacing:.06em;color:#FFCB6B;word-break:break-all;margin:0}
  .btn{display:inline-block;background:#FFB12B;color:#0D0B08;font-weight:600;text-decoration:none;padding:11px 18px;border-radius:9px;border:0;cursor:pointer;font-size:.95rem;margin:6px 8px 6px 0}
  .btn.ghost{background:transparent;color:#FFB12B;border:1px solid #2a2418}
  a{color:#FFB12B}
</style></head><body><div class="card">${body}</div></body></html>`;
}

// Per-product presentation for the shared success page. `productHint` comes
// from the route (/skillfoundry/success vs /marcom-kit/success) and only
// drives the pre-entitlement states; once the row is loaded, its `product`
// column is authoritative.
const SUCCESS_META = {
  skillfoundry: {
    label: "Skillfoundry",
    backHref: "/skillfoundry",
    backText: "← Back to Skillfoundry",
    downloadPath: "/api/skillfoundry/download",
    downloadText: "Download the plugin",
    licenseLede:
      "Thanks for your purchase. Your perpetual license key is below — keep it safe. Use it to download the plugin now or any time.",
    subLede:
      "Thanks for subscribing. Your subscription key is below. The thin client sends it to our backend, which validates it before every run.",
  },
  "marcom-kit": {
    label: "MarCom OS",
    backHref: "/marcom-kit",
    backText: "← Back to MarCom OS",
    downloadPath: "/api/marcom-kit/download",
    downloadText: "Download the playbook",
    licenseLede:
      "Thanks for your purchase. Your license key is below. Keep it safe: use it to download the playbook package now or any time.",
    subLede:
      "Thanks for subscribing. Your subscription key is below. It unlocks the playbook download and every update we ship.",
  },
  davoskit: {
    label: "Davos Decision Kit",
    backHref: "/davos-kit-demo",
    backText: "← Back to the Davos Decision Kit",
    downloadPath: "/api/davos-kit/download",
    downloadText: "Download the kit",
    licenseLede:
      "Thanks for your purchase. Your license key is below. Keep it safe: use it to download the Davos Decision Kit now or any time.",
    subLede:
      "Thanks for subscribing. Your subscription key is below.",
  },
};

async function handleSuccess(req, res, urlObj, productHint = "skillfoundry") {
  res.setHeader("Cache-Control", "no-store");
  const sessionId = (urlObj.searchParams.get("session_id") || "").trim();
  let sm = SUCCESS_META[productHint] || SUCCESS_META.skillfoundry;
  const backLink = () =>
    `<p style="margin-top:26px"><a href="${sm.backHref}">${sm.backText}</a></p>`;

  if (!sessionId) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      commercePage(
        `<p class="eyebrow">${sm.label}</p><h1>Missing order reference</h1><p class="muted">We couldn't find a checkout session in this link.</p>${backLink()}`,
      ),
    );
    return;
  }
  if (!stripeConfigured() || !commerceStorage()) {
    res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      commercePage(
        `<p class="eyebrow">${sm.label}</p><h1>Checkout isn't live yet</h1><p class="muted">Commerce isn't configured on this deployment.</p>${backLink()}`,
      ),
    );
    return;
  }

  let outcome;
  try {
    outcome = await fulfillSession(sessionId);
  } catch (err) {
    console.error("[commerce] success fulfillment failed:", err.message);
    // Fall back to a lookup in case the webhook already provisioned it.
    const row = await getEntitlementBySession(sessionId).catch(() => null);
    outcome = { paid: Boolean(row), entitlement: row, session: null };
  }

  if (!outcome.paid || !outcome.entitlement) {
    res.writeHead(202, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      commercePage(
        `<p class="eyebrow">${sm.label}</p><h1>Finishing your order…</h1><p class="muted">Your payment is being confirmed. Refresh this page in a moment — your key will appear here and land in your inbox.</p>${backLink()}`,
      ),
    );
    return;
  }

  const e = outcome.entitlement;
  // The stored product wins over the route hint (covers hand-edited URLs).
  sm = SUCCESS_META[e.product] || sm;
  const isLicense = e.key_type === "license";
  const keyLabel = isLicense ? "Your license key" : "Your subscription key";
  const canDownload =
    e.product === "marcom-kit"
      ? KIT_DOWNLOAD_TIERS.has(e.tier)
      : e.product === "davoskit"
        ? isLicense && e.tier === "dk1"
        : isLicense && e.tier === "tier1";
  const download = canDownload
    ? `<a class="btn" href="${sm.downloadPath}?key=${encodeURIComponent(e.key_value)}">${sm.downloadText}</a>`
    : "";
  const manage = !isLicense
    ? `<button class="btn ghost" id="manage" data-key="${esc(e.key_value)}">Manage subscription</button>`
    : "";
  const onboard = e.needs_onboarding
    ? `<p class="muted" style="margin-top:18px">We will reach out shortly to schedule your hands-on onboarding.</p>`
    : "";
  const lede = isLicense ? sm.licenseLede : sm.subLede;

  const body = `<p class="eyebrow">${sm.label} · Order confirmed</p>
<h1>You're all set.</h1>
<p>${lede}</p>
<div class="keybox">
  <p class="keylbl">${keyLabel}</p>
  <p class="keyval">${esc(e.key_value)}</p>
</div>
${onboard}
<div style="margin-top:8px">${download}${manage}</div>
<p class="muted" style="margin-top:22px;font-size:.9rem">We've also emailed this to ${esc(e.email || "your inbox")}.</p>
${backLink()}
<script>
  var m=document.getElementById("manage");
  if(m){m.addEventListener("click",function(){
    m.disabled=true;
    fetch("/api/portal",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({key:m.getAttribute("data-key")})})
      .then(function(r){return r.json();})
      .then(function(d){ if(d&&d.url){window.location.href=d.url;} else {m.disabled=false;m.textContent="Couldn't open portal — try again";}})
      .catch(function(){m.disabled=false;m.textContent="Couldn't open portal — try again";});
  });}
</script>`;
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(commercePage(body));
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error(
    "[serve] dist/ not built. Run `node build.mjs` first (or `npm run build`).",
  );
  process.exit(1);
}

function resolveFile(urlPath) {
  // strip query/hash, decode, prevent traversal
  let p;
  try {
    p = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  } catch {
    return null; // malformed URI encoding -> treat as bad request
  }
  if (p.endsWith("/")) p += "index.html";
  const candidates = [p];
  if (!path.extname(p)) candidates.push(p + ".html"); // /field-guide -> field-guide.html
  for (const c of candidates) {
    const full = path.normalize(path.join(DIST, c));
    if (
      (full === DIST || full.startsWith(DIST + path.sep)) &&
      fs.existsSync(full) &&
      fs.statSync(full).isFile()
    )
      return full;
  }
  return null;
}

const server = http.createServer((req, res) => {
  const rawPath = (req.url || "/").split("?")[0].split("#")[0];
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("400 Bad Request");
    return;
  }
  if (rawPath === "/api/waitlist") {
    handleWaitlist(req, res);
    return;
  }
  if (rawPath === "/api/waitlist/confirm") {
    const urlObj = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    handleConfirm(req, res, urlObj).catch((err) => {
      console.error("[confirm] handler error:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("500 Server Error");
      }
    });
    return;
  }
  if (rawPath === "/unsubscribe") {
    const urlObj = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    handleUnsubscribe(req, res, urlObj).catch((err) => {
      console.error("[unsubscribe] handler error:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("500 Server Error");
      }
    });
    return;
  }
  if (rawPath === "/api/checkout") {
    handleCheckout(req, res).catch((err) => {
      console.error("[commerce] checkout error:", err.message);
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: "server_error" });
    });
    return;
  }
  if (rawPath === "/api/stripe/webhook") {
    handleStripeWebhook(req, res).catch((err) => {
      console.error("[commerce] webhook error:", err.message);
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: "server_error" });
    });
    return;
  }
  if (rawPath === "/api/skillfoundry/validate") {
    handleValidate(req, res).catch((err) => {
      console.error("[commerce] validate error:", err.message);
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: "server_error" });
    });
    return;
  }
  if (rawPath === "/api/skillfoundry/run") {
    handleRun(req, res).catch((err) => {
      console.error("[commerce] run error:", err.message);
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: "server_error" });
    });
    return;
  }
  if (rawPath === "/api/skillfoundry/download") {
    const urlObj = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    handleDownload(req, res, urlObj).catch((err) => {
      console.error("[commerce] download error:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("500 Server Error");
      }
    });
    return;
  }
  if (rawPath === "/api/marcom-kit/download") {
    const urlObj = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    handleKitDownload(req, res, urlObj).catch((err) => {
      console.error("[commerce] kit download error:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("500 Server Error");
      }
    });
    return;
  }
  if (rawPath === "/api/davos-kit/download") {
    const urlObj = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    handleDavosDownload(req, res, urlObj).catch((err) => {
      console.error("[commerce] davos download error:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("500 Server Error");
      }
    });
    return;
  }
  if (rawPath === "/api/portal") {
    handlePortal(req, res).catch((err) => {
      console.error("[commerce] portal error:", err.message);
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: "server_error" });
    });
    return;
  }
  if (rawPath === "/manage") {
    handleManagePage(req, res).catch((err) => {
      console.error("[manage] page error:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("500 Server Error");
      }
    });
    return;
  }
  if (rawPath === "/api/manage") {
    handleManageSubmit(req, res).catch((err) => {
      console.error("[manage] submit error:", err.message);
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: "server_error" });
    });
    return;
  }
  if (rawPath === "/manage/portal") {
    const urlObj = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    handleManagePortal(req, res, urlObj).catch((err) => {
      console.error("[manage] portal error:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("500 Server Error");
      }
    });
    return;
  }
  if (rawPath === "/marcom-kit/success") {
    const urlObj = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    handleSuccess(req, res, urlObj, "marcom-kit").catch((err) => {
      console.error("[commerce] success error:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end("500 Server Error");
      }
    });
    return;
  }
  if (rawPath === "/davos-kit/success") {
    const urlObj = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    handleSuccess(req, res, urlObj, "davoskit").catch((err) => {
      console.error("[commerce] success error:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end("500 Server Error");
      }
    });
    return;
  }
  if (rawPath === "/skillfoundry/success") {
    const urlObj = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    handleSuccess(req, res, urlObj, "skillfoundry").catch((err) => {
      console.error("[commerce] success error:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end("500 Server Error");
      }
    });
    return;
  }
  // Davos gate routes on the DECODED path so percent-encoded variants
  // (e.g. /%64avos-kit-demo, /davos-kit-demo%2ehtml) cannot slip past the
  // gate into the static resolver, which also decodes. The demo's journey
  // screenshots under /assets/davos-demo/ are gated the same way.
  if (decodedPath === "/davos-kit-demo" || decodedPath === "/davos-kit-demo.html") {
    handleDavosDemo(req, res).catch((err) => {
      console.error("[davos-demo] gate error:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("500 Server Error");
      }
    });
    return;
  }
  if (decodedPath.startsWith("/assets/davos-demo/")) {
    if (!hasDavosAccess(req)) {
      res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end("404 Not Found");
      return;
    }
    // Authed: serve directly with no-store (never the long-cache static
    // headers, so shared caches can't replay a gated image to anon users).
    const assetFile = resolveFile(req.url || "/");
    if (!assetFile) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(assetFile).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
    });
    fs.createReadStream(assetFile).pipe(res);
    return;
  }
  if (rawPath === "/admin" || rawPath.startsWith("/admin/")) {
    const urlObj = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    handleAdmin(req, res, urlObj).catch((err) => {
      console.error("[admin] handler error:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("500 Server Error");
      }
    });
    return;
  }
  // Advisory scheduled link check — triggered by an external cron caller.
  // Returns 202 immediately and runs the check in a detached child process.
  // Protected by CRON_SECRET (disabled when unset). Pass the secret as:
  //   ?secret=<value>  or  Authorization: Bearer <value>
  if (rawPath === "/api/cron/link-check") {
    if (!CRON_SECRET) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    const urlObj = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    const querySecret = urlObj.searchParams.get("secret") || "";
    const authHeader = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
    const provided = querySecret || authHeader;
    if (!provided || provided !== CRON_SECRET) {
      res.writeHead(401, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("401 Unauthorized");
      return;
    }
    // Spawn the scheduler script detached so it outlives this request.
    const child = spawn(
      process.execPath,
      [path.join(__dirname, "link-check-scheduled.mjs")],
      { detached: true, stdio: "inherit", env: process.env },
    );
    child.unref();
    console.log(`[cron/link-check] spawned pid ${child.pid}`);
    res.writeHead(202, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, message: "Link check started", pid: child.pid }));
    return;
  }

  const file = resolveFile(req.url || "/");
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<!doctype html><meta charset=utf-8><title>404</title><body style='background:#0D0B08;color:#F0E8D5;font-family:system-ui;padding:60px'><h1>404 — not found</h1><p><a style='color:#FFB12B' href='/'>Back to False Dawn Industries</a></p>",
    );
    return;
  }
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const immutable = ["/fonts/", "/assets/"].some((d) =>
    req.url.startsWith(d),
  );
  const headers = { "Content-Type": type };
  headers["Cache-Control"] = immutable
    ? "public, max-age=31536000, immutable"
    : "public, max-age=300";
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`[serve] False Dawn Industries site on http://${HOST}:${PORT}`);
});
