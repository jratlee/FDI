import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Smoke check for the built site.
 *
 * Builds the site, then verifies:
 *  - all public routes resolve to real pages
 *  - the /llms.txt AI-crawler guide is present
 *  - every referenced /assets and /fonts file exists on disk
 *  - the deck PDF and all 13 deck slides are present
 *  - every internal nav/href link resolves to a real page or file, using the
 *    same extensionless routing as serve.mjs
 *
 * Exits non-zero (with a report) when anything is missing, so it can be wired
 * as a validation step and fail fast before deploy.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");

const EXPECTED_ROUTES = [
  "/",
  "/field-guide",
  "/field-guide-002",
  "/field-guide-003",
  "/field-guide-004",
  "/fdcp",
  "/hourglass",
  "/skillfoundry",
  "/marcom-kit",
  "/topcall",
  "/series",
  "/aggregated",
  "/decentralized",
  "/autonomous",
  "/roadmap",
  "/community",
  "/workshop",
  "/engine",
];
const EXPECTED_SLIDES = 13;
const EXPECTED_SLIDES_FDCP = 12;
const EXPECTED_SLIDES_004 = 13;
const EXPECTED_SLIDES_PT01 = 12;

const errors = [];
const fail = (msg) => errors.push(msg);

/* Server-rendered dynamic routes that have no file in dist/ but are valid
 * targets (handled directly by serve.mjs). Referenced e.g. from emails. */
const DYNAMIC_ROUTES = new Set([
  "/unsubscribe",
  "/api/waitlist",
  "/admin/waitlist",
  "/admin/waitlist.csv",
]);

/* Resolve a site path to a file on disk, mirroring serve.mjs routing:
 *  - trailing "/" -> index.html
 *  - extensionless -> try "<path>.html"
 * Returns the resolved absolute path, or null if nothing matches. */
function resolveFile(urlPath) {
  const bare = urlPath.split("?")[0].split("#")[0];
  if (DYNAMIC_ROUTES.has(bare)) return bare;
  let p;
  try {
    p = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  } catch {
    return null;
  }
  if (p.endsWith("/")) p += "index.html";
  const candidates = [p];
  if (!path.extname(p)) candidates.push(p + ".html");
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

/* Pull every internal reference out of an HTML string: href/src attributes and
 * url(...) values. External (http, mailto, tel, data), protocol-relative, and
 * pure in-page anchors (#foo) are dropped — only same-site paths remain. */
function extractRefs(html) {
  const refs = new Set();
  const attrRe = /(?:href|src)\s*=\s*"([^"]+)"/gi;
  const urlRe = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  let m;
  while ((m = attrRe.exec(html))) refs.add(m[1]);
  while ((m = urlRe.exec(html))) refs.add(m[1]);
  return [...refs].filter((r) => {
    if (!r) return false;
    if (/^(?:https?:|mailto:|tel:|data:|\/\/)/i.test(r)) return false;
    if (r.startsWith("#")) return false; // in-page anchor
    return r.startsWith("/");
  });
}

/* ---------------- run ---------------- */
console.log("[check] building site…");
execFileSync("node", [path.join(__dirname, "build.mjs")], {
  stdio: "inherit",
});

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  fail("dist/index.html missing, build did not produce output");
}

/* 1. every public route resolves */
for (const route of EXPECTED_ROUTES) {
  if (!resolveFile(route)) fail(`route does not resolve: ${route}`);
}

/* 1b. the /llms.txt AI-crawler guide is present */
if (!resolveFile("/llms.txt")) fail("missing /llms.txt AI-crawler guide");

/* 1c. crawler discovery files: sitemap.xml + robots.txt */
const SITE_URL = "https://falsedawn.industries";
const sitemapPath = path.join(DIST, "sitemap.xml");
if (!fs.existsSync(sitemapPath)) {
  fail("missing /sitemap.xml");
} else {
  const xml = fs.readFileSync(sitemapPath, "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (locs.length === 0) fail("sitemap.xml contains no <loc> entries");
  for (const loc of locs) {
    if (!loc.startsWith(`${SITE_URL}/`)) {
      fail(`sitemap.xml <loc> is not on ${SITE_URL}: ${loc}`);
      continue;
    }
    const route = loc.slice(SITE_URL.length) || "/";
    if (!resolveFile(route)) fail(`sitemap.xml lists unresolvable route: ${route}`);
    /* Verify every sitemap URL is actually indexable (no noindex tag).
     * A noindex page in the sitemap sends contradictory signals to crawlers. */
    const file = resolveFile(route);
    if (file && typeof file === "string" && file.endsWith(".html") && fs.existsSync(file)) {
      const html = fs.readFileSync(file, "utf8");
      if (html.includes('content="noindex')) {
        fail(`sitemap.xml lists ${route} but that page carries a noindex meta tag — remove it from SITEMAP_ROUTES or un-noindex the page`);
      }
    }
  }
  /* Also confirm that known noindex pages are absent from the sitemap. */
  const NOINDEX_ROUTES = ["/topcall", "/roadmap", "/davos-kit-demo"];
  for (const nr of NOINDEX_ROUTES) {
    const fullUrl = `${SITE_URL}${nr}`;
    if (locs.includes(fullUrl)) {
      fail(`sitemap.xml must not list noindex page: ${nr} — remove it from SITEMAP_ROUTES`);
    }
  }
}
const robotsPath = path.join(DIST, "robots.txt");
if (!fs.existsSync(robotsPath)) {
  fail("missing /robots.txt");
} else {
  const robots = fs.readFileSync(robotsPath, "utf8");
  if (!robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`))
    fail("robots.txt does not point at the sitemap");
}

/* 1d. gated-page leak guard
 * These routes must render the holding page (noindex, neutral copy) and must
 * NOT contain any of the known internal markers from their full page builders.
 * Mirrors the GATED set in build.mjs; update both together when a page is
 * ungated or a new marker is added. */
const GATED_CHECKS = [
  {
    route: "/topcall",
    /* Unique strings that appear in the full topcall() builder but never in
     * the neutral holding page. If any appear in the built HTML the full page
     * was accidentally rendered instead of the holding page. */
    leakMarkers: [
      "topcall:exec-move-scan",          // MCP slash-command listed in the module table
      "$5,000 to $50,000 a year",        // price-anchor paragraph
      "signal as code",                  // page tagline / hero copy (lower-case)
    ],
  },
  {
    route: "/roadmap",
    leakMarkers: [
      "August 15, 2026",                 // internal revenue-goal deadline
      "$5,000/month in revenue",         // internal monthly revenue target
    ],
  },
];

const HOLDING_SENTINEL = "Coming back";   // text present in every holding page

for (const { route, leakMarkers } of GATED_CHECKS) {
  const file = resolveFile(route);
  if (!file) {
    fail(`gated route does not resolve: ${route}`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");

  /* Must carry noindex so it cannot be indexed by crawlers */
  if (!html.includes('content="noindex')) {
    fail(`${route}: gated page is missing the noindex meta tag`);
  }

  /* Must show the holding-page copy, not the real page */
  if (!html.includes(HOLDING_SENTINEL)) {
    fail(`${route}: gated page is missing the holding-page sentinel ("${HOLDING_SENTINEL}") — the full page may have been rendered instead`);
  }

  /* Must not contain any internal marker from the real page builder */
  for (const marker of leakMarkers) {
    if (html.toLowerCase().includes(marker.toLowerCase())) {
      fail(`${route}: gated page leaks internal content — found marker: "${marker}"`);
    }
  }
}

/* 2. deck PDFs + 13 slides present for each guide */
const deckPdf = path.join(DIST, "assets", "fdi-field-guide-deck.pdf");
if (!fs.existsSync(deckPdf)) fail("missing deck PDF: /assets/fdi-field-guide-deck.pdf");
const deckPdf002 = path.join(DIST, "assets", "fdi-field-guide-002-deck.pdf");
if (!fs.existsSync(deckPdf002))
  fail("missing deck PDF: /assets/fdi-field-guide-002-deck.pdf");

const slidesDir = path.join(DIST, "assets", "deck-slides");
const slideCount = fs.existsSync(slidesDir)
  ? fs.readdirSync(slidesDir).filter((f) => f.endsWith(".png")).length
  : 0;
if (slideCount !== EXPECTED_SLIDES) {
  fail(`expected ${EXPECTED_SLIDES} deck slides, found ${slideCount}`);
}
const slidesDir002 = path.join(DIST, "assets", "deck-slides-002");
const slideCount002 = fs.existsSync(slidesDir002)
  ? fs.readdirSync(slidesDir002).filter((f) => f.endsWith(".png")).length
  : 0;
if (slideCount002 !== EXPECTED_SLIDES) {
  fail(`expected ${EXPECTED_SLIDES} Field Guide 002 deck slides, found ${slideCount002}`);
}
const deckPdf003 = path.join(DIST, "assets", "fdi-field-guide-003-deck.pdf");
if (!fs.existsSync(deckPdf003))
  fail("missing deck PDF: /assets/fdi-field-guide-003-deck.pdf");
const slidesDir003 = path.join(DIST, "assets", "deck-slides-003");
const slideCount003 = fs.existsSync(slidesDir003)
  ? fs.readdirSync(slidesDir003).filter((f) => f.endsWith(".png")).length
  : 0;
if (slideCount003 !== EXPECTED_SLIDES) {
  fail(`expected ${EXPECTED_SLIDES} Field Guide 003 deck slides, found ${slideCount003}`);
}

const deckPdfFdcp = path.join(DIST, "assets", "fdi-fdcp-deck.pdf");
if (!fs.existsSync(deckPdfFdcp)) fail("missing deck PDF: /assets/fdi-fdcp-deck.pdf");
const slidesDirFdcp = path.join(DIST, "assets", "deck-slides-fdcp");
const slideCountFdcp = fs.existsSync(slidesDirFdcp)
  ? fs.readdirSync(slidesDirFdcp).filter((f) => f.endsWith(".png")).length
  : 0;
if (slideCountFdcp !== EXPECTED_SLIDES_FDCP) {
  fail(`expected ${EXPECTED_SLIDES_FDCP} FDCP deck slides, found ${slideCountFdcp}`);
}
const deckPdfPt01 = path.join(DIST, "assets", "fdi-performance-thinking-01-deck.pdf");
if (!fs.existsSync(deckPdfPt01))
  fail("missing deck PDF: /assets/fdi-performance-thinking-01-deck.pdf");
const slidesDirPt01 = path.join(DIST, "assets", "deck-slides-pt01");
const slideCountPt01 = fs.existsSync(slidesDirPt01)
  ? fs.readdirSync(slidesDirPt01).filter((f) => f.endsWith(".png")).length
  : 0;
if (slideCountPt01 !== EXPECTED_SLIDES_PT01) {
  fail(`expected ${EXPECTED_SLIDES_PT01} Hourglass Bet deck slides, found ${slideCountPt01}`);
}
const deckPdf004 = path.join(DIST, "assets", "fdi-field-guide-004-deck.pdf");
if (!fs.existsSync(deckPdf004)) fail("missing deck PDF: /assets/fdi-field-guide-004-deck.pdf");
const slidesDir004 = path.join(DIST, "assets", "deck-slides-004");
const slideCount004 = fs.existsSync(slidesDir004)
  ? fs.readdirSync(slidesDir004).filter((f) => f.endsWith(".png")).length
  : 0;
if (slideCount004 !== EXPECTED_SLIDES_004) {
  fail(`expected ${EXPECTED_SLIDES_004} Field Guide 004 deck slides, found ${slideCount004}`);
}

/* 3. every referenced /assets, /fonts, and internal link resolves */
const pages = fs
  .readdirSync(DIST)
  .filter((f) => f.endsWith(".html"))
  .map((f) => path.join(DIST, f));

let refCount = 0;
for (const page of pages) {
  const html = fs.readFileSync(page, "utf8");
  const rel = path.relative(DIST, page);
  const cssRefs = [];
  for (const ref of extractRefs(html)) {
    refCount++;
    if (!resolveFile(ref)) fail(`${rel}: broken reference → ${ref}`);
    // follow referenced local stylesheets to check their url(...) refs too
    if (ref.endsWith(".css")) cssRefs.push(ref);
  }
  for (const cssRef of cssRefs) {
    const cssFile = resolveFile(cssRef);
    if (!cssFile) continue;
    const css = fs.readFileSync(cssFile, "utf8");
    for (const ref of extractRefs(css)) {
      refCount++;
      if (!resolveFile(ref)) fail(`${cssRef}: broken reference → ${ref}`);
    }
  }
}

/* ---------------- report ---------------- */
if (errors.length) {
  console.error(`\n[check] FAILED — ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(
  `\n[check] OK — ${EXPECTED_ROUTES.length} routes, ${slideCount}+${slideCount002}+${slideCount003}+${slideCountFdcp}+${slideCount004} slides, ${refCount} references all resolve.`,
);
