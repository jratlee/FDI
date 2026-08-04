#!/usr/bin/env node
/**
 * site/check-field-guide-bundle.mjs
 *
 * Verifies that dist/assets/fdi-field-guide-launch-bundle.zip was built
 * correctly after a build.  Run this as a deploy gate or CI step.
 *
 * Checks
 * ──────
 *   1. dist/assets/fdi-field-guide-launch-bundle.zip exists and is non-empty.
 *   2. The zip contains fdi-field-guide-deck.pdf.
 *   3. The zip contains exactly 13 deck-slides/slide-*.png entries.
 *
 * Usage
 *   node site/build.mjs && node site/check-field-guide-bundle.mjs
 *
 * Exits 0 on success, 1 on any failure.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ZIP_PATH = path.join(__dirname, "dist", "assets", "fdi-field-guide-launch-bundle.zip");

const EXPECTED_SLIDE_COUNT = 13;
const EXPECTED_PDF = "fdi-field-guide-deck.pdf";

let failures = 0;

function check(name, ok, detail = "") {
  if (ok) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ── 1. zip exists and is non-empty ───────────────────────────────────────────

const exists = fs.existsSync(ZIP_PATH);
check("zip file exists at dist/assets/fdi-field-guide-launch-bundle.zip", exists);

if (!exists) {
  console.error("\n[bundle-check] zip not found; was `node site/build.mjs` run first?");
  process.exit(1);
}

const size = fs.statSync(ZIP_PATH).size;
check("zip is non-empty", size > 0, `size=${size} bytes`);

// ── 2. list zip contents ──────────────────────────────────────────────────────

let zipEntries;
try {
  // `unzip -Z1` prints one entry path per line, no headers — portable and fast.
  const out = execFileSync("unzip", ["-Z1", ZIP_PATH], { encoding: "utf8" });
  zipEntries = out.split("\n").map((l) => l.trim()).filter(Boolean);
} catch (err) {
  failures++;
  console.error(`FAIL  could not list zip contents — ${err.message}`);
  console.error("\n[bundle-check] 1 check(s) FAILED");
  process.exit(1);
}

// ── 3. PDF present ────────────────────────────────────────────────────────────

check(
  `zip contains ${EXPECTED_PDF}`,
  zipEntries.includes(EXPECTED_PDF),
  zipEntries.filter((e) => e.endsWith(".pdf")).join(", ") || "no PDF entries found",
);

// ── 4. exactly 13 deck-slides/slide-*.png entries ────────────────────────────

const slideEntries = zipEntries.filter((e) => /^deck-slides\/slide-.+\.png$/.test(e));
check(
  `zip contains exactly ${EXPECTED_SLIDE_COUNT} deck-slides/slide-*.png entries`,
  slideEntries.length === EXPECTED_SLIDE_COUNT,
  `found ${slideEntries.length}: ${slideEntries.join(", ") || "(none)"}`,
);

// ── result ────────────────────────────────────────────────────────────────────

if (failures) {
  console.error(`\n[bundle-check] ${failures} check(s) FAILED`);
  process.exit(1);
}

console.log("\n[bundle-check] OK — the Field Guide bundle zip is correct.");
process.exit(0);
