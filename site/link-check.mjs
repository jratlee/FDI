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
 *   --strict           exit non-zero if any DETERMINISTIC anchor target is
 *                      missing (anchors are local, so they are never flaky)
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

/* Map a built html file back to the extensionless route serve.mjs exposes,
 * so /page and /page#frag can be matched to the right file. */
function routeForFile(file) {
  const base = path.basename(file, ".html");
  return base === "index" ? "/" : `/${base}`;
}
const fileForRoute = new Map();
for (const p of pages) fileForRoute.set(routeForFile(p), p);

/* Extract the set of anchor targets (id="..." / name="...") declared in an
 * HTML string. These are the valid destinations for a #fragment. */
function anchorTargets(html) {
  const ids = new Set();
  const idRe = /\bid\s*=\s*"([^"]+)"/gi;
  const nameRe = /\bname\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = idRe.exec(html))) ids.add(m[1]);
  while ((m = nameRe.exec(html))) ids.add(m[1]);
  return ids;
}

/* Pull every href/src value out of an HTML string. */
function extractHrefs(html) {
  const out = new Set();
  const re = /(?:href|src)\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) out.add(m[1]);
  return [...out];
}

/* ---------------- classify links ---------------- */
const externalUrls = new Map(); // url -> Set of pages that reference it
const anchorRefs = []; // { fromRoute, target, fragment, raw }

for (const page of pages) {
  const html = fs.readFileSync(page, "utf8");
  const fromRoute = routeForFile(page);
  for (const raw of extractHrefs(html)) {
    if (!raw) continue;
    if (/^(?:mailto:|tel:|data:|javascript:)/i.test(raw)) continue;

    if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) {
      const url = raw.startsWith("//") ? `https:${raw}` : raw;
      // only probe our own hosts + real off-site links, skip nothing here
      if (!externalUrls.has(url)) externalUrls.set(url, new Set());
      externalUrls.get(url).add(fromRoute);
      continue;
    }

    // in-page or internal cross-page fragment
    const hashIdx = raw.indexOf("#");
    if (hashIdx === -1) continue; // internal non-anchor links are check.mjs's job
    const fragment = raw.slice(hashIdx + 1);
    if (!fragment) continue; // bare "#" is a no-op
    const before = raw.slice(0, hashIdx);
    // target route: same page if href starts with "#", else the linked route
    let targetRoute;
    if (before === "" || before === ".") {
      targetRoute = fromRoute;
    } else {
      const cleaned = before.replace(/\/$/, "") || "/";
      // fragments on non-HTML assets (e.g. a PDF #view=FitH viewer directive)
      // are not HTML anchors — skip them.
      const ext = path.extname(cleaned).toLowerCase();
      if (ext && ext !== ".html") continue;
      targetRoute = cleaned;
    }
    anchorRefs.push({ fromRoute, targetRoute, fragment, raw });
  }
}

/* ---------------- check anchors (deterministic) ---------------- */
const anchorCache = new Map(); // route -> Set(targets)
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
    anchorProblems.push(
      `${ref.fromRoute}: anchor points at unknown page → ${ref.raw}`,
    );
  } else if (!targets.has(ref.fragment)) {
    anchorProblems.push(
      `${ref.fromRoute}: no matching id/name for fragment → ${ref.raw}`,
    );
  }
}

/* ---------------- check external URLs (flaky) ---------------- */
async function probe(url) {
  const attempt = async (method) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: ctrl.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; FDI-link-check/1.0; +https://falsedawn.industries)",
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
    // many hosts refuse HEAD; retry with GET on 4xx/5xx
    if (status >= 400) status = await attempt("GET");
    return { url, ok: status < 400, status };
  } catch (err) {
    return { url, ok: false, status: 0, error: err.message || String(err) };
  }
}

async function runPool(urls, worker) {
  const results = [];
  let i = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, urls.length) }, async () => {
    while (i < urls.length) {
      const idx = i++;
      results[idx] = await worker(urls[idx]);
    }
  });
  await Promise.all(runners);
  return results;
}

const urls = [...externalUrls.keys()];
console.log(`[link-check] probing ${urls.length} external URL(s)…`);
const externalResults = urls.length ? await runPool(urls, probe) : [];
const externalProblems = externalResults.filter((r) => !r.ok);

/* ---------------- report ---------------- */
console.log("");
if (anchorProblems.length) {
  console.error(`[link-check] anchor problems — ${anchorProblems.length}:`);
  for (const p of anchorProblems) console.error(`  ✗ ${p}`);
} else {
  console.log(`[link-check] anchors OK — ${anchorRefs.length} fragment link(s) all resolve.`);
}

console.log("");
if (externalProblems.length) {
  console.warn(`[link-check] external URL problems — ${externalProblems.length} (advisory):`);
  for (const r of externalProblems) {
    const detail = r.error ? `${r.error}` : `HTTP ${r.status}`;
    const where = [...(externalUrls.get(r.url) || [])].join(", ");
    console.warn(`  ⚠ ${r.url}  [${detail}]  (on ${where})`);
  }
  console.warn(
    "[link-check] external failures can be transient (rate limits, timeouts, bot blocks). Re-run to confirm before acting.",
  );
} else {
  console.log(`[link-check] external URLs OK — ${urls.length} link(s) reachable.`);
}

/* ---------------- exit code ---------------- */
let code = 0;
if (STRICT && anchorProblems.length) code = 1;
if (STRICT_EXTERNAL && externalProblems.length) code = 1;
if (code === 0 && (anchorProblems.length || externalProblems.length)) {
  console.log("\n[link-check] advisory run — reporting only, exit 0 (not a deploy gate).");
}
process.exit(code);
