import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Advisory outbound + anchor link check for the built site.
 *
 * This is deliberately NOT the deploy gate. `site/check.mjs` remains the
 * authoritative, deploy-blocking check for internal links and local assets.
 * This script covers the two things check.mjs intentionally skips:
 *
 *  1. External / outbound URLs (footer GitHub links, MCP citation, stat
 *     source citations, etc.) — fetched over the network.
 *  2. In-page anchor fragments (#foo) and internal cross-page fragments
 *     (/page#foo) — verified against real id/name targets in the built HTML.
 *
 * Network hosts are flaky, so by default this NEVER exits non-zero: it prints
 * a report and returns 0 so it can run as an advisory / scheduled step without
 * ever blocking a deploy. Flags:
 *
 *   --strict           exit non-zero if any DETERMINISTIC check fails:
 *                        • anchor targets missing from built HTML
 *                        • a citation URL no longer appears in built HTML
 *                          (config drift — check is testing a stale URL)
 *                        • a citation URL redirects to a materially different
 *                          page after following the real GET redirect chain
 *                        • a citation page was fetched OK but required
 *                          claim-specific keywords are absent (wrong content)
 *                      Non-citation redirect mismatches are always advisory.
 *   --strict-external  also exit non-zero on failed external URLs (opt-in;
 *                      intended for manual runs, not CI)
 *   --no-build         scan the existing dist/ without rebuilding first
 *   --timeout=<ms>     per-request timeout (default 12000)
 *   --concurrency=<n>  max in-flight external requests (default 8)
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");

const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const flagVal = (name, def) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : def;
};

const STRICT = hasFlag("--strict");
const STRICT_EXTERNAL = hasFlag("--strict-external");
const NO_BUILD = hasFlag("--no-build");
const TIMEOUT = Number(flagVal("timeout", 12000));
const CONCURRENCY = Math.max(1, Number(flagVal("concurrency", 8)));

/*
 * Citation registry: mirrors the CITE constants in site/build.mjs.
 *
 * Each URL must appear in the built HTML — if it doesn't, the check is
 * testing a stale URL (config drift, --strict).
 *
 * Citations are always probed via GET (not HEAD) so that:
 *  a) the final URL after redirects reflects the browser-facing destination,
 *  b) the response body is available for keyword assertions in the same request.
 *
 * `requiredTerms`: ALL terms must appear (case-insensitive) in the page body.
 *   Use claim-specific figures or phrases that are unique to the cited content
 *   (not just the publisher domain). A page that passes reachability but fails
 *   any required term is flagged as wrong content (--strict).
 *   Bot-block / paywall / timeout on body fetch stays advisory only.
 */
const CITATION_CHECKS = new Map([
  [
    // WARC Dec 2025 forecast: $1.19trn in 2025 growing 9.1% in 2026 ≈ $1.30trn.
    // The growth rate "9.1" and the base figure "1.19" are specific to this article.
    "https://www.warc.com/en/article/warc-global-ad-forecasts-upgraded-but-growth-concentrated-within-big-tech-9ed8089870e64fbe84b6bf2b1f8d6442",
    {
      label: "WARC global ad-spend forecast (9.1% growth, $1.19trn base)",
      // Require BOTH the base figure and the growth rate — neither appears on
      // an unrelated WARC page, so both must match to confirm the right article.
      requiredTerms: ["9.1", "1.19"],
    },
  ],
  [
    // Dr Karen Nelson-Field / Amplified: 2.5s attention-memory threshold;
    // ~85% of digital ads never reach it.
    "https://www.amplified.co/insight/why-does-the-attention-memory-threshold-matter",
    {
      label: "Amplified — 2.5s attention-memory threshold, ~85% below it",
      // The specific claim is 2.5 seconds AND the ~85% figure.
      // "attention-memory" is the coined phrase unique to this research.
      requiredTerms: ["2.5", "attention-memory"],
    },
  ],
  [
    // Sapiens (Harari). /book/sapiens-2/ silently redirected to the 21 Lessons page.
    // The real Sapiens page has the subtitle "A Brief History of Humankind".
    "https://www.ynharari.com/book/sapiens/",
    {
      label: "Sapiens — A Brief History of Humankind (Harari)",
      // "brief history of humankind" is the subtitle of Sapiens specifically —
      // it does not appear on the 21 Lessons page (the old redirect destination).
      requiredTerms: ["brief history of humankind"],
    },
  ],
]);

/* ---------------- build (unless skipped) ---------------- */
if (!NO_BUILD) {
  console.log("[link-check] building site…");
  execFileSync("node", [path.join(__dirname, "build.mjs")], { stdio: "inherit" });
}

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error("[link-check] dist/index.html missing — build did not produce output");
  process.exit(1);
}

/* ---------------- collect pages ---------------- */
const pages = fs
  .readdirSync(DIST)
  .filter((f) => f.endsWith(".html"))
  .map((f) => path.join(DIST, f));

function routeForFile(file) {
  const base = path.basename(file, ".html");
  return base === "index" ? "/" : `/${base}`;
}
const fileForRoute = new Map();
for (const p of pages) fileForRoute.set(routeForFile(p), p);

function anchorTargets(html) {
  const ids = new Set();
  const idRe = /\bid\s*=\s*"([^"]+)"/gi;
  const nameRe = /\bname\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = idRe.exec(html))) ids.add(m[1]);
  while ((m = nameRe.exec(html))) ids.add(m[1]);
  return ids;
}

function extractHrefs(html) {
  const out = new Set();
  const re = /(?:href|src)\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) out.add(m[1]);
  return [...out];
}

/* ---------------- classify links ---------------- */
const externalUrls = new Map(); // url -> Set<route>
const anchorRefs = [];

for (const page of pages) {
  const html = fs.readFileSync(page, "utf8");
  const fromRoute = routeForFile(page);
  for (const raw of extractHrefs(html)) {
    if (!raw) continue;
    if (/^(?:mailto:|tel:|data:|javascript:)/i.test(raw)) continue;

    if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) {
      const url = raw.startsWith("//") ? `https:${raw}` : raw;
      if (!externalUrls.has(url)) externalUrls.set(url, new Set());
      externalUrls.get(url).add(fromRoute);
      continue;
    }

    const hashIdx = raw.indexOf("#");
    if (hashIdx === -1) continue;
    const fragment = raw.slice(hashIdx + 1);
    if (!fragment) continue;
    const before = raw.slice(0, hashIdx);
    let targetRoute;
    if (before === "" || before === ".") {
      targetRoute = fromRoute;
    } else {
      const cleaned = before.replace(/\/$/, "") || "/";
      const ext = path.extname(cleaned).toLowerCase();
      if (ext && ext !== ".html") continue;
      targetRoute = cleaned;
    }
    anchorRefs.push({ fromRoute, targetRoute, fragment, raw });
  }
}

/* ---------------- citation config-drift check (deterministic, no network) ---- */
/*
 * Each CITATION_CHECKS URL must appear in at least one built HTML file.
 * If it doesn't, build.mjs changed the URL without updating CITATION_CHECKS —
 * the checker would silently test a stale URL. Included in --strict.
 */
const citationDriftProblems = [];
for (const [url, { label }] of CITATION_CHECKS) {
  if (!externalUrls.has(url)) {
    citationDriftProblems.push(
      `Not found in any built page — CITATION_CHECKS may be stale: ${label}\n  ${url}`,
    );
  }
}

/* ---------------- check anchors (deterministic, no network) ---------------- */
const anchorCache = new Map();
function targetsForRoute(route) {
  if (anchorCache.has(route)) return anchorCache.get(route);
  const file = fileForRoute.get(route);
  const set = file ? anchorTargets(fs.readFileSync(file, "utf8")) : null;
  anchorCache.set(route, set);
  return set;
}

const anchorProblems = [];
for (const ref of anchorRefs) {
  const targets = targetsForRoute(ref.targetRoute);
  if (targets === null) {
    anchorProblems.push(`${ref.fromRoute}: anchor points at unknown page → ${ref.raw}`);
  } else if (!targets.has(ref.fragment)) {
    anchorProblems.push(`${ref.fromRoute}: no matching id/name for fragment → ${ref.raw}`);
  }
}

/* ---------------- redirect-mismatch helpers ---------------- */
function normaliseUrl(raw) {
  try {
    const u = new URL(raw);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    u.protocol = u.protocol.toLowerCase();
    if (u.pathname.endsWith("/") && u.pathname.length > 1) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return raw;
  }
}

/*
 * Returns true when the redirect from `requested` to `final` is a material
 * cross-page change (path or host changed beyond harmless normalisation).
 * Harmless: trailing slash, www. prefix, http→https, fragment, case.
 */
function isMaterialRedirect(requested, final) {
  if (!final || final === requested) return false;
  if (normaliseUrl(requested) === normaliseUrl(final)) return false;
  try {
    const req = new URL(requested);
    const fin = new URL(final);
    const reqHost = req.hostname.replace(/^www\./, "");
    const finHost = fin.hostname.replace(/^www\./, "");
    const reqPath = req.pathname.replace(/\/$/, "") || "/";
    const finPath = fin.pathname.replace(/\/$/, "") || "/";
    if (reqHost === finHost && reqPath === finPath) return false;
    return true;
  } catch {
    return false;
  }
}

/* ---------------- network probing ---------------- */

const FETCH_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (compatible; FDI-link-check/1.0; +https://falsedawn.industries)",
  accept: "text/html,*/*",
};

/*
 * Probe a non-citation URL: HEAD first, fall back to GET on 4xx/5xx.
 * Returns { url, ok, status, finalUrl, error? }.
 * finalUrl comes from response.url (the effective URL after all redirects).
 */
async function probe(url) {
  const doFetch = async (method) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: ctrl.signal,
        headers: FETCH_HEADERS,
      });
      return { status: res.status, finalUrl: res.url };
    } finally {
      clearTimeout(t);
    }
  };

  try {
    let { status, finalUrl } = await doFetch("HEAD");
    if (status >= 400) ({ status, finalUrl } = await doFetch("GET"));
    return { url, ok: status < 400, status, finalUrl };
  } catch (err) {
    return { url, ok: false, status: 0, finalUrl: null, error: err.message || String(err) };
  }
}

/*
 * Probe a citation URL: always GET so that:
 *  • finalUrl reflects the browser-facing redirect chain (HEAD and GET can
 *    differ — some servers accept HEAD but 302-redirect GET to a different page)
 *  • body is captured in the same request for keyword assertions
 *
 * Returns { url, ok, status, finalUrl, body (lowercase string or null), error? }.
 */
async function probeCitation(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: FETCH_HEADERS,
    });
    let body = null;
    if (res.ok) {
      try { body = (await res.text()).toLowerCase(); } catch { /* ignore */ }
    }
    return { url, ok: res.ok, status: res.status, finalUrl: res.url, body };
  } catch (err) {
    return { url, ok: false, status: 0, finalUrl: null, body: null, error: err.message || String(err) };
  } finally {
    clearTimeout(t);
  }
}

async function runPool(items, worker) {
  const results = [];
  let i = 0;
  const runners = Array.from(
    { length: Math.min(CONCURRENCY, items.length || 1) },
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

/* Probe non-citation external URLs and citation URLs in parallel. */
const nonCitationUrls = [...externalUrls.keys()].filter((u) => !CITATION_CHECKS.has(u));
const citationUrls = [...CITATION_CHECKS.keys()].filter((u) => externalUrls.has(u));

console.log(
  `[link-check] probing ${nonCitationUrls.length} external URL(s) + ${citationUrls.length} citation URL(s)…`,
);

const [nonCitationResults, citationResults] = await Promise.all([
  nonCitationUrls.length ? runPool(nonCitationUrls, probe) : Promise.resolve([]),
  citationUrls.length ? runPool(citationUrls, probeCitation) : Promise.resolve([]),
]);

const externalProblems = nonCitationResults.filter((r) => !r.ok);

/* Also flag citation reachability failures in the general external report. */
const citationReachabilityProblems = citationResults.filter((r) => !r.ok);

/*
 * Redirect analysis — scoped separately:
 *
 *  citationRedirectProblems  — citation GET lands on a different page.
 *    Deterministic (not transient). Included in --strict.
 *
 *  nonCitationRedirectWarnings — non-citation URLs that redirect somewhere else.
 *    Always advisory; never affect the exit code, even under --strict.
 *    (Unrelated links such as a docs site that versioned its URLs should not
 *    block citation-quality gates.)
 */
const citationRedirectProblems = [];
for (const r of citationResults) {
  if (!r.ok || !r.finalUrl) continue;
  if (isMaterialRedirect(r.url, r.finalUrl)) {
    const where = [...(externalUrls.get(r.url) || [])].join(", ");
    citationRedirectProblems.push({ requested: r.url, final: r.finalUrl, pages: where });
  }
}

const nonCitationRedirectWarnings = [];
for (const r of nonCitationResults) {
  if (!r.ok || !r.finalUrl) continue;
  if (isMaterialRedirect(r.url, r.finalUrl)) {
    const where = [...(externalUrls.get(r.url) || [])].join(", ");
    nonCitationRedirectWarnings.push({ requested: r.url, final: r.finalUrl, pages: where });
  }
}

/*
 * Citation keyword/content assertions.
 * Uses the body already captured by probeCitation — no second fetch.
 *
 * ALL `requiredTerms` must appear (AND logic) in the lowercase body.
 * A page that loads successfully but fails any required term is definitive
 * wrong content → included in --strict.
 * Body null (bot-block / timeout / non-ok status) → advisory skip.
 */
const citationContentProblems = []; // body fetched OK, term(s) absent — deterministic
const citationBodySkips = [];       // body unavailable — advisory only

for (const r of citationResults) {
  const { label, requiredTerms } = CITATION_CHECKS.get(r.url);
  if (r.body === null) {
    citationBodySkips.push({ url: r.url, label });
    continue;
  }
  const missing = requiredTerms.filter((t) => !r.body.includes(t.toLowerCase()));
  if (missing.length) {
    citationContentProblems.push({ url: r.url, label, missing, requiredTerms });
  }
}

/* ---------------- report ---------------- */
console.log("");

// Anchors (deterministic)
if (anchorProblems.length) {
  console.error(`[link-check] anchor problems — ${anchorProblems.length}:`);
  for (const p of anchorProblems) console.error(`  ✗ ${p}`);
} else {
  console.log(`[link-check] anchors OK — ${anchorRefs.length} fragment link(s) all resolve.`);
}
console.log("");

// General external reachability (advisory)
const allExternalProblems = [...externalProblems, ...citationReachabilityProblems];
if (allExternalProblems.length) {
  console.warn(`[link-check] external URL problems — ${allExternalProblems.length} (advisory):`);
  for (const r of allExternalProblems) {
    const detail = r.error ? r.error : `HTTP ${r.status}`;
    const where = [...(externalUrls.get(r.url) || [])].join(", ");
    console.warn(`  ⚠ ${r.url}  [${detail}]  (on ${where})`);
  }
  console.warn(
    "[link-check] external failures can be transient (rate limits, timeouts, bot blocks). Re-run to confirm before acting.",
  );
} else {
  const total = nonCitationUrls.length + citationUrls.length;
  console.log(`[link-check] external URLs OK — ${total} link(s) reachable.`);
}
console.log("");

// Citation config-drift (deterministic — under --strict)
if (citationDriftProblems.length) {
  const tag = STRICT ? " [STRICT]" : " (advisory)";
  console.error(`[link-check] citation config drift — ${citationDriftProblems.length}${tag}:`);
  for (const p of citationDriftProblems) console.error(`  ✗ ${p}`);
  console.error(
    "[link-check] update CITATION_CHECKS in link-check.mjs to match the URLs emitted by build.mjs.",
  );
} else {
  console.log(
    `[link-check] citation URLs in built HTML — all ${CITATION_CHECKS.size} found.`,
  );
}
console.log("");

// Citation cross-page redirects (deterministic — under --strict)
if (citationRedirectProblems.length) {
  const tag = STRICT ? " [STRICT]" : " (advisory)";
  console.error(
    `[link-check] citation cross-page redirects — ${citationRedirectProblems.length}${tag}:`,
  );
  for (const r of citationRedirectProblems) {
    console.error(`  ✗ ${r.requested}`);
    console.error(`    → redirected to: ${r.final}`);
    if (r.pages) console.error(`    (cited on: ${r.pages})`);
  }
  console.error(
    "[link-check] citation GET lands on a different page — update the href in build.mjs.",
  );
} else {
  const checked = citationUrls.filter((u) => citationResults.find((r) => r.url === u && r.ok)).length;
  console.log(
    `[link-check] citation redirects OK — ${checked} citation URL(s) land on the expected page.`,
  );
}
console.log("");

// Non-citation redirect mismatches (always advisory — never affect exit code)
if (nonCitationRedirectWarnings.length) {
  console.warn(
    `[link-check] non-citation redirect mismatches — ${nonCitationRedirectWarnings.length} (advisory, never a gate failure):`,
  );
  for (const r of nonCitationRedirectWarnings) {
    console.warn(`  ⚠ ${r.requested}`);
    console.warn(`    → redirected to: ${r.final}`);
    if (r.pages) console.warn(`    (on: ${r.pages})`);
  }
  console.warn(
    "[link-check] consider updating these hrefs to their final URLs.",
  );
  console.log("");
}

// Citation content / keyword assertions (deterministic when body available — under --strict)
if (citationContentProblems.length) {
  const tag = STRICT ? " [STRICT]" : " (advisory)";
  console.error(
    `[link-check] citation content mismatches — ${citationContentProblems.length}${tag}:`,
  );
  for (const p of citationContentProblems) {
    console.error(`  ✗ ${p.label}`);
    console.error(`    ${p.url}`);
    console.error(
      `    page loaded OK but missing required term(s): ${p.missing.map((t) => `"${t}"`).join(", ")}`,
    );
    console.error(`    (all required: ${p.requiredTerms.map((t) => `"${t}"`).join(", ")})`);
  }
  console.error(
    "[link-check] the page was fetched but does not contain the expected claim-specific content — the URL may point at the wrong resource.",
  );
} else if (citationBodySkips.length) {
  const verified = citationUrls.length - citationBodySkips.length;
  console.log(
    `[link-check] citations — ${verified} content assertion(s) passed; ${citationBodySkips.length} skipped (body fetch blocked by remote):`,
  );
  for (const s of citationBodySkips) console.log(`    ↷ ${s.label}`);
} else {
  console.log(
    `[link-check] citations OK — all ${citationUrls.length} content assertion(s) passed.`,
  );
}

/* ---------------- exit code ---------------- */
let code = 0;

// --strict: deterministic checks only
if (STRICT && anchorProblems.length) code = 1;
if (STRICT && citationDriftProblems.length) code = 1;
if (STRICT && citationRedirectProblems.length) code = 1;
if (STRICT && citationContentProblems.length) code = 1;

// --strict-external: flaky network failures (opt-in)
if (STRICT_EXTERNAL && allExternalProblems.length) code = 1;

const hasAdvisoryIssues =
  anchorProblems.length ||
  allExternalProblems.length ||
  citationDriftProblems.length ||
  citationRedirectProblems.length ||
  citationContentProblems.length ||
  nonCitationRedirectWarnings.length;

if (code === 0 && hasAdvisoryIssues) {
  console.log("\n[link-check] advisory run — reporting only, exit 0 (not a deploy gate).");
}
process.exit(code);
