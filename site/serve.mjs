import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { sendSignupEmails } from "./email.mjs";
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
  stripeConfigured,
  storageConfigured as commerceStorage,
} from "./commerce.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";
const ADMIN_TOKEN = process.env.WAITLIST_ADMIN_TOKEN || "";

/* ---------------- waitlist storage (Postgres) ---------------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 })
  : null;

/* ---------------- abuse protection ---------------- */
// Per-IP rate limit: a modest number of signup attempts per IP per hour.
// In-memory store is fine for the single-instance Node server; can later be
// pointed at Postgres/Redis without changing call sites.
const waitlistLimiter = new RateLimiterMemory({
  keyPrefix: "wl",
  points: 8, // attempts allowed
  duration: 60 * 60, // per hour (seconds)
  blockDuration: 60 * 60, // stay blocked for an hour once exceeded
});

// Disposable / throwaway email domains we don't want on the list. Not
// exhaustive — a light guard against the most common junk providers.
const DISPOSABLE_DOMAINS = new Set([
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
]);

function clientIp(req) {
  // The site runs behind Replit's proxy, so the real client IP is in
  // X-Forwarded-For (first hop). Fall back to the socket address.
  const fwd = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req.socket?.remoteAddress || "unknown";
}
let dbReady = null;

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
         )`,
      )
      .then(() => true)
      .catch((err) => {
        console.error("[waitlist] table init failed:", err.message);
        dbReady = null; // allow a retry on next request
        throw err;
      });
  }
  return dbReady;
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
  try {
    const raw = await readBody(req);
    const parsed = raw ? JSON.parse(raw) : {};
    email = String(parsed.email || "").trim().toLowerCase();
    source = String(parsed.source || "site").trim().slice(0, 64);
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(source)) source = "site";
    // Honeypot: a hidden field real users never fill. Any value = a bot.
    honeypot = String(parsed.company || "").trim();
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
  try {
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO waitlist_signups (email, source)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email, source],
    );
    const isNew = result.rowCount > 0;
    sendJson(res, 200, { ok: true, duplicate: !isNew });
    // Best-effort welcome/notification email for genuinely new signups only.
    // Runs after the response is sent and never blocks or fails the signup.
    if (isNew) {
      sendSignupEmails({ email, source }).catch((err) =>
        console.error("[waitlist] signup email error:", err.message),
      );
    }
  } catch (err) {
    console.error("[waitlist] insert failed:", err.message);
    sendJson(res, 500, { ok: false, error: "server_error" });
  }
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
    if (k) out[k] = decodeURIComponent(v);
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
  table{border-collapse:collapse;width:100%;font-size:.88rem}
  th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #2a2418}
  th{color:#A8997B;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase}
  tr:hover td{background:#15120c}
  .tag{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.78rem;color:#FFCB6B}
  .empty{color:#7A6A50;padding:40px 0}
  form.login{max-width:340px}
  label{display:block;font-size:.85rem;color:#A8997B;margin:0 0 6px}
  input{width:100%;box-sizing:border-box;background:#15120c;border:1px solid #2a2418;border-radius:8px;color:#F0E8D5;padding:10px 12px;font-size:.95rem;margin:0 0 14px}
  .err{color:#E0920C;font-size:.85rem;margin:0 0 14px}
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

async function fetchSignups() {
  await ensureTable();
  const { rows } = await pool.query(
    `SELECT email, source, created_at
       FROM waitlist_signups
      ORDER BY created_at DESC`,
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

  // CSV export
  if (pathname === "/admin/waitlist.csv") {
    let rows;
    try {
      rows = await fetchSignups();
    } catch (err) {
      console.error("[admin] csv query failed:", err.message);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("500 Server Error");
      return;
    }
    const lines = ["email,source,created_at"];
    for (const r of rows) {
      const ts =
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at);
      lines.push(
        [csvField(r.email), csvField(r.source), csvField(ts)].join(","),
      );
    }
    const stamp = new Date().toISOString().slice(0, 10);
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="waitlist-signups-${stamp}.csv"`,
      "Cache-Control": "no-store",
    });
    res.end(lines.join("\r\n") + "\r\n");
    return;
  }

  // Table view
  if (pathname === "/admin/waitlist") {
    let rows;
    try {
      rows = await fetchSignups();
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
            return `<tr><td>${esc(r.email)}</td><td class="tag">${esc(r.source || "")}</td><td>${esc(ts)}</td></tr>`;
          })
          .join("")
      : "";
    const table = rows.length
      ? `<table><thead><tr><th>Email</th><th>Source</th><th>Signed up</th></tr></thead><tbody>${bodyRows}</tbody></table>`
      : `<p class="empty">No signups yet.</p>`;
    const body = `<p class="eyebrow">Growth Cartography — Internal</p>
<h1>Waitlist signups</h1>
<div class="bar">
  <a class="btn" href="/admin/waitlist.csv">Download CSV</a>
  <span class="count">${rows.length} signup${rows.length === 1 ? "" : "s"}</span>
  <a href="/admin/logout" style="margin-left:auto">Log out</a>
</div>
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
  // The subscription gate is subscription-only: a Tier 1 perpetual LICENSE key
  // must NOT pass here even when "active" — only Tier 2/3 subscription keys do.
  const active = result.active && result.keyType === "subscription";
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
  if (!commerceStorage()) {
    sendJson(res, 503, { ok: false, error: "storage_unavailable" });
    return;
  }
  let key;
  let asset;
  try {
    const raw = await readBody(req);
    const parsed = raw ? JSON.parse(raw) : {};
    key = String(parsed.key || "").trim();
    asset = String(parsed.asset || "").trim();
  } catch {
    sendJson(res, 400, { ok: false, error: "bad_request" });
    return;
  }
  if (!key) {
    sendJson(res, 400, { ok: false, error: "missing_key" });
    return;
  }
  const result = await validateKey(key);
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
  // Entitlement gate passed. In this commerce-layer task the protected compute
  // is a minimal stub (see task non-goals) — the point is that access is gated.
  sendJson(res, 200, {
    ok: true,
    active: true,
    tier: result.tier,
    result: {
      note: "Skillfoundry latest gate logic ran server-side (stub).",
      assetChars: asset.length,
      ranAt: new Date().toISOString(),
    },
  });
}

async function handlePortal(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }
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
  const ok =
    row && row.key_type === "license" && row.status === "active";
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

async function handleSuccess(req, res, urlObj) {
  res.setHeader("Cache-Control", "no-store");
  const sessionId = (urlObj.searchParams.get("session_id") || "").trim();
  const back = `<p style="margin-top:26px"><a href="/skillfoundry">← Back to Skillfoundry</a></p>`;

  if (!sessionId) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      commercePage(
        `<p class="eyebrow">Skillfoundry</p><h1>Missing order reference</h1><p class="muted">We couldn't find a checkout session in this link.</p>${back}`,
      ),
    );
    return;
  }
  if (!stripeConfigured() || !commerceStorage()) {
    res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      commercePage(
        `<p class="eyebrow">Skillfoundry</p><h1>Checkout isn't live yet</h1><p class="muted">Commerce isn't configured on this deployment.</p>${back}`,
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
        `<p class="eyebrow">Skillfoundry</p><h1>Finishing your order…</h1><p class="muted">Your payment is being confirmed. Refresh this page in a moment — your key will appear here and land in your inbox.</p>${back}`,
      ),
    );
    return;
  }

  const e = outcome.entitlement;
  const isLicense = e.key_type === "license";
  const keyLabel = isLicense ? "Your license key" : "Your subscription key";
  const download = isLicense
    ? `<a class="btn" href="/api/skillfoundry/download?key=${encodeURIComponent(e.key_value)}">Download the plugin</a>`
    : "";
  const manage = !isLicense
    ? `<button class="btn ghost" id="manage" data-key="${esc(e.key_value)}">Manage subscription</button>`
    : "";
  const onboard = e.needs_onboarding
    ? `<p class="muted" style="margin-top:18px">A strategist will reach out shortly to schedule your hands-on onboarding.</p>`
    : "";
  const lede = isLicense
    ? "Thanks for your purchase. Your perpetual license key is below — keep it safe. Use it to download the plugin now or any time."
    : "Thanks for subscribing. Your subscription key is below. The thin client sends it to our backend, which validates it before every run.";

  const body = `<p class="eyebrow">Skillfoundry · Order confirmed</p>
<h1>You're all set.</h1>
<p>${lede}</p>
<div class="keybox">
  <p class="keylbl">${keyLabel}</p>
  <p class="keyval">${esc(e.key_value)}</p>
</div>
${onboard}
<div style="margin-top:8px">${download}${manage}</div>
<p class="muted" style="margin-top:22px;font-size:.9rem">We've also emailed this to ${esc(e.email || "your inbox")}.</p>
${back}
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
  try {
    decodeURIComponent(rawPath);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("400 Bad Request");
    return;
  }
  if (rawPath === "/api/waitlist") {
    handleWaitlist(req, res);
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
  if (rawPath === "/api/portal") {
    handlePortal(req, res).catch((err) => {
      console.error("[commerce] portal error:", err.message);
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: "server_error" });
    });
    return;
  }
  if (rawPath === "/skillfoundry/success") {
    const urlObj = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    handleSuccess(req, res, urlObj).catch((err) => {
      console.error("[commerce] success error:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end("500 Server Error");
      }
    });
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
