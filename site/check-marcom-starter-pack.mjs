#!/usr/bin/env node
/**
 * site/check-marcom-starter-pack.mjs
 *
 * Verifies that dist/assets/fdi-marcom-starter-pack.zip was built correctly
 * after a build.  Run this as a deploy gate or CI step.
 *
 * Checks
 * ──────
 *   1. dist/assets/fdi-marcom-starter-pack.zip exists and is non-empty.
 *   2. The zip contains every .md file currently in exports/marcom-kit-lead-magnet/.
 *
 * Usage
 *   node site/build.mjs && node site/check-marcom-starter-pack.mjs
 *
 * Exits 0 on success, 1 on any failure.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ZIP_PATH = path.join(__dirname, "dist", "assets", "fdi-marcom-starter-pack.zip");
const SRC_DIR = path.join(ROOT, "exports", "marcom-kit-lead-magnet");

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
check("zip file exists at dist/assets/fdi-marcom-starter-pack.zip", exists);

if (!exists) {
  console.error("\n[starter-pack-check] zip not found; was `node site/build.mjs` run first?");
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
  console.error("\n[starter-pack-check] 1 check(s) FAILED");
  process.exit(1);
}

// ── 3. expected .md files present ────────────────────────────────────────────

// Derive the expected set from the source directory so the check stays in sync
// automatically when files are added or renamed.
let expectedMdFiles;
try {
  expectedMdFiles = fs
    .readdirSync(SRC_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();
} catch (err) {
  failures++;
  console.error(`FAIL  could not read source dir ${SRC_DIR} — ${err.message}`);
  console.error("\n[starter-pack-check] 1 check(s) FAILED");
  process.exit(1);
}

check(
  `source directory exports/marcom-kit-lead-magnet/ contains at least one .md file`,
  expectedMdFiles.length > 0,
  `found ${expectedMdFiles.length} .md file(s)`,
);

for (const file of expectedMdFiles) {
  check(
    `zip contains ${file}`,
    zipEntries.includes(file),
    zipEntries.filter((e) => e.endsWith(".md")).join(", ") || "no .md entries found",
  );
}

// ── result ────────────────────────────────────────────────────────────────────

if (failures) {
  console.error(`\n[starter-pack-check] ${failures} check(s) FAILED`);
  process.exit(1);
}

console.log(
  `\n[starter-pack-check] OK — fdi-marcom-starter-pack.zip is correct (${expectedMdFiles.length} .md file(s)).`,
);
process.exit(0);
