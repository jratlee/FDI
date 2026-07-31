#!/usr/bin/env node
// Smoke check for the outreach-kit PDFs + /admin/pipeline gate.
//
// Runs export-outreach.mjs, then verifies:
//   - all 4 PDFs exist and are non-trivially sized (>= MIN_KB each)
//   - each PDF has exactly 1 page
//   - GET /admin/pipeline without auth -> 401 (gate holds even after future
//     server changes)
//
// Exits non-zero (with a report) when anything fails, so it can be wired as
// a CI / validation step. Run from the repo root:
//   node site/check-outreach.mjs

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "exports", "outreach-kit");

// A real PDF with embedded fonts and brand CSS must comfortably exceed this.
// Anything smaller is almost certainly blank, clipped, or failed to render.
const MIN_KB = 30;

const EXPECTED_PDFS = [
  { file: "fdi-marcom-kit-onepager.pdf",         pages: 1 },
  { file: "transformation-sprint-proposal.pdf",  pages: 1 },
  { file: "davos-kit-proposal.pdf",              pages: 2 },
  { file: "davos-kit-expertise-map.pdf",         pages: 1 },
];

const errors = [];
const ok    = (msg) => console.log(`  ok  ${msg}`);
const fail  = (msg) => { errors.push(msg); console.error(`FAIL  ${msg}`); };

// Count PDF pages by searching the raw bytes for indirect objects that carry
// /Type /Page (not /Pages — the page-tree root node).  Chromium's PDF printer
// emits one such object per logical page, so this gives a reliable page count
// without pulling in a full PDF parser.
function countPages(buf) {
  const text = buf.toString("latin1"); // latin1 maps all byte values 1-to-1
  const re = /\/Type\s*\/Page(?!s)/g;
  let count = 0;
  while (re.exec(text) !== null) count++;
  return count;
}

/* ------------------------------------------------------------------ */
/* 1. Generate the PDFs                                                */
/* ------------------------------------------------------------------ */
console.log("[outreach-check] generating PDFs…");
try {
  execFileSync(process.execPath, [path.join(__dirname, "export-outreach.mjs")], {
    stdio: "inherit",
  });
} catch (err) {
  // If the exporter itself crashes, record the failure and keep going so we
  // can still report which files are missing rather than stopping cold.
  fail(`export-outreach.mjs exited non-zero: ${err.message}`);
}

/* ------------------------------------------------------------------ */
/* 2. Assert each PDF: exists, non-trivially sized, correct page count */
/* ------------------------------------------------------------------ */
for (const { file, pages } of EXPECTED_PDFS) {
  const full = path.join(OUT_DIR, file);
  if (!fs.existsSync(full)) {
    fail(`missing PDF: ${file}`);
    continue;
  }

  const kb = Math.round(fs.statSync(full).size / 1024);
  if (kb < MIN_KB) {
    fail(`${file} is suspiciously small (${kb} KB < ${MIN_KB} KB min) — likely blank or failed render`);
  } else {
    ok(`${file}  ${kb} KB`);
  }

  const found = countPages(fs.readFileSync(full));
  if (found !== pages) {
    fail(`${file}: expected ${pages} page(s), found ${found}`);
  } else {
    ok(`${file}  ${found} page(s)`);
  }
}

/* ------------------------------------------------------------------ */
/* 3. /admin/pipeline gate: must reject unauthenticated requests       */
/* ------------------------------------------------------------------ */
const PORT = 5093;
const BASE = `http://127.0.0.1:${PORT}`;
// Use a fixed dummy token so ADMIN_TOKEN is always "set" in the test server:
// with no token at all the server returns 503 (not configured) instead of 401
// (token wrong / missing), and we specifically want to exercise the auth gate.
const DUMMY_TOKEN = "check-outreach-test-token-do-not-use";

const server = spawn(
  process.execPath,
  [path.join(__dirname, "serve.mjs")],
  {
    env: { ...process.env, PORT: String(PORT), WAITLIST_ADMIN_TOKEN: DUMMY_TOKEN },
    stdio: ["ignore", "ignore", "inherit"],
  },
);
const stopServer = () => { try { server.kill(); } catch {} };
process.on("exit", stopServer);

async function waitUp(tries = 50, delayMs = 200) {
  for (let i = 0; i < tries; i++) {
    try { await fetch(`${BASE}/`); return; } catch {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("server did not start within timeout");
}

console.log("\n[outreach-check] starting server for gate check…");
await waitUp();

// Unauthenticated GET /admin/pipeline must be rejected (401 login page).
const gateRes = await fetch(`${BASE}/admin/pipeline`, { redirect: "manual" });
if (gateRes.status === 401) {
  ok("GET /admin/pipeline without auth -> 401");
} else {
  fail(`GET /admin/pipeline without auth: expected 401, got ${gateRes.status}`);
}

stopServer();

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */
if (errors.length) {
  console.error(`\n[outreach-check] FAILED — ${errors.length} problem(s) above`);
  process.exit(1);
}
console.log("\n[outreach-check] OK — all PDFs present, sized, and paged correctly; /admin/pipeline gate holds.");
process.exit(0);
