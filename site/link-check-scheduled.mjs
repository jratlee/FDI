/**
 * Advisory scheduled link checker for the live False Dawn Industries site.
 *
 * Crawls every page at SITE_BASE_URL, probes all external/outbound URLs, and
 * emails a failure digest to WAITLIST_NOTIFY_EMAIL when any links are broken.
 *
 * Design:
 *   - Never exits non-zero — a flaky third-party host must never page anyone
 *     or break a deploy. This is advisory-only.
 *   - Does NOT require a local build. It fetches real HTML from the live site,
 *     so it tests exactly what visitors see.
 *   - Skips links back to the site's own hostname (those are tested by
 *     site/check.mjs in the deploy gate).
 *
 * Environment:
 *   SITE_BASE_URL          Canonical origin, e.g. "https://falsedawn.industries"
 *   WAITLIST_NOTIFY_EMAIL  (via email.mjs) where failure digests are sent
 *   RESEND_FROM            (via email.mjs) sender address
 *
 * Flags:
 *   --timeout=<ms>      per-request timeout (default 12000)
 *   --concurrency=<n>   max parallel external probes (default 6)
 *   --max-pages=<n>     crawl limit — give up after this many internal pages (default 80)
 */

import pg from "pg";
import { sendLinkCheckReport } from "./email.mjs";

/* ---------------- config ---------------- */
const argv = process.argv.slice(2);
const flagVal = (name, def) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : def;
};

const BASE_URL = (process.env.SITE_BASE_URL || "").replace(/\/+$/, "");
const TIMEOUT = Number(flagVal("timeout", 12000));
const CONCURRENCY = Math.max(1, Number(flagVal("concurrency", 6)));
const MAX_PAGES = Math.max(1, Number(flagVal("max-pages", 80)));

if (!BASE_URL) {
  console.warn(
    "[link-check-scheduled] SITE_BASE_URL not set — skipping run.\n" +
    "  Set it to the production origin, e.g. https://falsedawn.industries",
  );
  process.exit(0);
}

let siteHostname;
try {
  siteHostname = new URL(BASE_URL).hostname;
} catch {
  console.error("[link-check-scheduled] SITE_BASE_URL is not a valid URL:", BASE_URL);
  process.exit(0);
}

/* ---------------- HTTP helpers ---------------- */
async function fetchHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "user-agent": "FDI-link-check/1.0 (+https://falsedawn.industries)",
        accept: "text/html,*/*",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("html")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function probeExternal(url) {
  const attempt = async (method) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: ctrl.signal,
        headers: {
          "user-agent": "FDI-link-check/1.0 (+https://falsedawn.industries)",
          accept: "*/*",
        },
      });
      return res.status;
    } finally {
      clearTimeout(t);
    }
  };
  try {
    let status = await attempt("HEAD");
    if (status >= 400) status = await attempt("GET");
    return { url, ok: status < 400, status };
  } catch (err) {
    return { url, ok: false, status: 0, error: err.message || String(err) };
  }
}

async function runPool(items, worker) {
  const results = [];
  let i = 0;
  const runners = Array.from(
    { length: Math.min(CONCURRENCY, items.length) },
    async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await worker(items[idx]);
      }
    },
  );
  await Promise.all(runners);
  return results;
}

/* ---------------- href extraction ---------------- */
function extractHrefs(html) {
  const out = new Set();
  const re = /(?:href|src)\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) out.add(m[1]);
  return [...out];
}

/* ---------------- crawl internal pages, collect external URLs ---------------- */
async function crawl() {
  const visitedRoutes = new Set();
  const queue = ["/"];
  visitedRoutes.add("/");

  // url -> Set of page routes that reference it
  const externalUrls = new Map();

  console.log(`[link-check-scheduled] crawling ${BASE_URL} …`);

  while (queue.length && visitedRoutes.size <= MAX_PAGES) {
    const route = queue.shift();
    const pageUrl = `${BASE_URL}${route}`;
    const html = await fetchHtml(pageUrl);
    if (!html) continue;

    for (const raw of extractHrefs(html)) {
      if (!raw) continue;
      if (/^(?:mailto:|tel:|data:|javascript:)/i.test(raw)) continue;

      // Absolute URLs
      if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) {
        const absUrl = raw.startsWith("//") ? `https:${raw}` : raw;
        let parsed;
        try { parsed = new URL(absUrl); } catch { continue; }

        if (parsed.hostname === siteHostname) {
          // Own-host link: queue the path for crawling
          const internalPath = parsed.pathname.replace(/\/$/, "") || "/";
          if (!visitedRoutes.has(internalPath) && visitedRoutes.size < MAX_PAGES) {
            visitedRoutes.add(internalPath);
            queue.push(internalPath);
          }
        } else {
          // External: record for probing
          if (!externalUrls.has(absUrl)) externalUrls.set(absUrl, new Set());
          externalUrls.get(absUrl).add(route);
        }
        continue;
      }

      // Relative internal path (skip anchor-only, query-only, asset extensions)
      if (raw.startsWith("/")) {
        const pathOnly = raw.split("?")[0].split("#")[0];
        // Skip asset-like paths (images, fonts, scripts, etc.)
        const ext = pathOnly.split(".").pop().toLowerCase();
        const assetExts = new Set([
          "css","js","mjs","png","jpg","jpeg","gif","webp","svg","ico",
          "woff","woff2","ttf","otf","pdf","zip","mp4","mp3","json","xml","txt","map",
        ]);
        if (assetExts.has(ext)) continue;
        if (pathOnly && !visitedRoutes.has(pathOnly) && visitedRoutes.size < MAX_PAGES) {
          visitedRoutes.add(pathOnly);
          queue.push(pathOnly);
        }
      }
    }
  }

  return { pages: [...visitedRoutes], externalUrls };
}

/* ---------------- DB: record run ---------------- */
// Write a row to cron_runs so the admin panel and silence monitor know the
// cron is still alive. Best-effort — a DB failure never affects the exit code.
async function recordRun({ failuresFound, pagesChecked, externalChecked }) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  let pool;
  try {
    pool = new pg.Pool({ connectionString: dbUrl, max: 1 });
    // Ensure the table exists (idempotent)
    await pool.query(
      `CREATE TABLE IF NOT EXISTS cron_runs (
         id              BIGSERIAL PRIMARY KEY,
         job_name        TEXT NOT NULL,
         ran_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
         failures_found  INT NOT NULL DEFAULT 0,
         pages_checked   INT NOT NULL DEFAULT 0,
         external_checked INT NOT NULL DEFAULT 0
       );
       CREATE INDEX IF NOT EXISTS cron_runs_job_ran_idx
         ON cron_runs (job_name, ran_at DESC);`,
    );
    await pool.query(
      `INSERT INTO cron_runs (job_name, failures_found, pages_checked, external_checked)
       VALUES ('link-check', $1, $2, $3)`,
      [failuresFound, pagesChecked, externalChecked],
    );
    console.log("[link-check-scheduled] run recorded in cron_runs.");
  } catch (err) {
    console.error("[link-check-scheduled] failed to record run:", err.message);
  } finally {
    try { await pool?.end(); } catch { /* ignore */ }
  }
}

/* ---------------- main ---------------- */
console.log(`[link-check-scheduled] starting — ${new Date().toISOString()}`);

const { pages, externalUrls } = await crawl();
console.log(
  `[link-check-scheduled] crawled ${pages.length} page(s), found ${externalUrls.size} external URL(s)`,
);

const urls = [...externalUrls.keys()];
console.log(`[link-check-scheduled] probing ${urls.length} external URL(s) …`);
const results = urls.length ? await runPool(urls, probeExternal) : [];
const failures = results.filter((r) => !r.ok);

if (failures.length) {
  console.warn(`[link-check-scheduled] ${failures.length} external URL(s) failed:`);
  for (const r of failures) {
    const detail = r.error ? r.error : `HTTP ${r.status}`;
    const where = [...(externalUrls.get(r.url) || [])].join(", ");
    console.warn(`  ✗ ${r.url}  [${detail}]  (on ${where})`);
  }
  console.warn("[link-check-scheduled] sending failure report …");
  await sendLinkCheckReport({ failures, externalUrls, pagesChecked: pages.length, baseUrl: BASE_URL });
  console.log("[link-check-scheduled] done — report sent.");
} else {
  console.log(
    `[link-check-scheduled] all ${urls.length} external link(s) OK across ${pages.length} page(s) — no report needed.`,
  );
}

// Record this run in the DB so the admin panel and silence monitor know the
// cron is still alive regardless of whether any links were broken.
await recordRun({
  failuresFound: failures.length,
  pagesChecked: pages.length,
  externalChecked: urls.length,
});

// Advisory: always exit 0
process.exit(0);
