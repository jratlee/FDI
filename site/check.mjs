import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Smoke check for the built site.
 *
 * Builds the site, then verifies:
 *  - all three routes (/, /field-guide, /skillfoundry) resolve to real pages
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

const EXPECTED_ROUTES = ["/", "/field-guide", "/skillfoundry"];
const EXPECTED_SLIDES = 13;

const errors = [];
const fail = (msg) => errors.push(msg);

/* Resolve a site path to a file on disk, mirroring serve.mjs routing:
 *  - trailing "/" -> index.html
 *  - extensionless -> try "<path>.html"
 * Returns the resolved absolute path, or null if nothing matches. */
function resolveFile(urlPath) {
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
  fail("dist/index.html missing — build did not produce output");
}

/* 1. the three routes resolve */
for (const route of EXPECTED_ROUTES) {
  if (!resolveFile(route)) fail(`route does not resolve: ${route}`);
}

/* 2. deck PDF + 13 slides present */
const deckPdf = path.join(DIST, "assets", "fdi-field-guide-deck.pdf");
if (!fs.existsSync(deckPdf)) fail("missing deck PDF: /assets/fdi-field-guide-deck.pdf");

const slidesDir = path.join(DIST, "assets", "deck-slides");
const slideCount = fs.existsSync(slidesDir)
  ? fs.readdirSync(slidesDir).filter((f) => f.endsWith(".png")).length
  : 0;
if (slideCount !== EXPECTED_SLIDES) {
  fail(`expected ${EXPECTED_SLIDES} deck slides, found ${slideCount}`);
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
  `\n[check] OK — ${EXPECTED_ROUTES.length} routes, ${slideCount} slides, ${refCount} references all resolve.`,
);
