#!/usr/bin/env node
/**
 * check-pdf.mjs — Guard against a clipped or blank competitive-analysis PDF.
 *
 * What it checks:
 *   1. Builds the PDF fresh via build-pdf.mjs.
 *   2. Asserts the PDF has exactly EXPECTED_PAGES pages (pdfinfo).
 *   3. Renders every page to PNG at 72 dpi (pdftoppm) and asserts each PNG
 *      is larger than MIN_PAGE_BYTES.  A blank or near-blank page (white
 *      background, overflow:hidden clip) compresses to ≪5 KB at this
 *      resolution; a real content page is ≫20 KB.
 *
 * Exit 0 → all good.  Exit 1 → failure with a clear message.
 */

import { execSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PDF_PATH = path.join(
  __dirname,
  "SkillFoundry-Competitive-Analysis.pdf",
);

// ── tuneable constants ──────────────────────────────────────────────────────

/** Number of pages the PDF must have. Fail hard if this changes. */
const EXPECTED_PAGES = 9;

/**
 * Minimum acceptable PNG byte-size per rendered page (72 dpi).
 * Real content pages in the current build range from ~34 KB to ~73 KB.
 * A fully-blank page with the cream background compresses to ≈ 3–6 KB.
 * 15 KB gives a comfortable buffer while still catching a clipped/blank page.
 */
const MIN_PAGE_BYTES = 15_000;

// ── helpers ─────────────────────────────────────────────────────────────────

function fail(msg) {
  console.error("\n❌  PDF check FAILED: " + msg);
  process.exit(1);
}

function ok(msg) {
  console.log("  ✓  " + msg);
}

// ── step 1: build the PDF ────────────────────────────────────────────────────

console.log("\n▶  Building PDF …");
try {
  execFileSync(process.execPath, ["build-pdf.mjs"], {
    cwd: __dirname,
    stdio: "inherit",
  });
} catch (err) {
  fail("build-pdf.mjs exited with a non-zero status — " + err.message);
}

if (!fs.existsSync(PDF_PATH)) {
  fail("build-pdf.mjs finished but the PDF file was not created at:\n   " + PDF_PATH);
}
ok("PDF built at " + PDF_PATH);

// ── step 2: page count ───────────────────────────────────────────────────────

console.log("\n▶  Checking page count …");

let pageCount;
try {
  const info = execSync(`pdfinfo "${PDF_PATH}"`, { encoding: "utf8" });
  const m = info.match(/^Pages:\s+(\d+)/m);
  if (!m) fail("pdfinfo output did not contain a Pages line:\n" + info);
  pageCount = parseInt(m[1], 10);
} catch (err) {
  fail("pdfinfo failed — is poppler-utils installed? " + err.message);
}

if (pageCount !== EXPECTED_PAGES) {
  fail(
    `Page count is ${pageCount} but expected ${EXPECTED_PAGES}.\n` +
    "  This usually means content overflowed a page or a page was dropped.\n" +
    "  If the page count intentionally changed, update EXPECTED_PAGES in check-pdf.mjs.",
  );
}
ok(`${pageCount} pages — matches expected ${EXPECTED_PAGES}`);

// ── step 3: render pages and check sizes ─────────────────────────────────────

console.log("\n▶  Rendering pages and checking for blank/clipped content …");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ca-pdf-check-"));
const prefix = path.join(tmpDir, "page");

try {
  execSync(`pdftoppm -r 72 -png "${PDF_PATH}" "${prefix}"`, {
    encoding: "utf8",
  });
} catch (err) {
  fail("pdftoppm failed — " + err.message);
}

const pngs = fs
  .readdirSync(tmpDir)
  .filter((f) => f.endsWith(".png"))
  .sort();

if (pngs.length !== pageCount) {
  fail(
    `pdftoppm produced ${pngs.length} PNGs but PDF has ${pageCount} pages.`,
  );
}

const failures = [];
for (const png of pngs) {
  const fullPath = path.join(tmpDir, png);
  const bytes = fs.statSync(fullPath).size;
  // Derive 1-based page number from filename suffix (e.g. page-01.png → 1)
  const numMatch = png.match(/(\d+)\.png$/);
  const pageNum = numMatch ? parseInt(numMatch[1], 10) : "?";
  if (bytes < MIN_PAGE_BYTES) {
    failures.push({ pageNum, bytes, file: png });
    console.error(
      `  ✗  Page ${pageNum}: ${bytes} bytes — BELOW threshold of ${MIN_PAGE_BYTES} (likely blank or clipped)`,
    );
  } else {
    ok(`Page ${pageNum}: ${bytes.toLocaleString()} bytes`);
  }
}

// ── cleanup ──────────────────────────────────────────────────────────────────

fs.rmSync(tmpDir, { recursive: true, force: true });

// ── final result ─────────────────────────────────────────────────────────────

if (failures.length > 0) {
  const list = failures
    .map((f) => `  • Page ${f.pageNum}: ${f.bytes} bytes (threshold: ${MIN_PAGE_BYTES})`)
    .join("\n");
  fail(
    `${failures.length} page(s) appear blank or severely clipped:\n${list}\n\n` +
    "  Check for overflow in report-template.js or a missing font/asset.",
  );
}

console.log(
  `\n✅  All ${pageCount} pages look healthy — PDF is ready to ship.\n`,
);
