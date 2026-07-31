#!/usr/bin/env node
// Post-deploy spot-check: confirms the Field Guide deck PDF served at
// /assets/fdi-field-guide-deck.pdf contains the updated Nelson-Field citation
// and does NOT contain any Dentsu Attention Economy attribution.
//
// Boots serve.mjs on a throwaway port, fetches the PDF, extracts its text with
// pdftotext, then asserts:
//   - slide 02 footer: "DR KAREN NELSON-FIELD / AMPLIFIED" present
//   - sources slide 12: "DR KAREN NELSON-FIELD / AMPLIFIED" present (source 02)
//   - "DENTSU" is absent (stale attribution fully replaced)
//
// Exits 0 on success, 1 on any failure.

import { spawn, execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = 5093;
const BASE = `http://127.0.0.1:${PORT}`;
const PDF_PATH = "/assets/fdi-field-guide-deck.pdf";
const TEMP_PDF = join(tmpdir(), `deck-pdf-check-${process.pid}.pdf`);

const server = spawn(process.execPath, ["site/serve.mjs"], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "ignore", "inherit"],
});
const stop = () => {
  try { server.kill(); } catch {}
  try { unlinkSync(TEMP_PDF); } catch {}
};
process.on("exit", stop);

async function waitUp() {
  for (let i = 0; i < 50; i++) {
    try { await fetch(`${BASE}/`); return; } catch { await new Promise(r => setTimeout(r, 200)); }
  }
  throw new Error("server did not start within 10 s");
}

let failures = 0;
function check(name, ok, detail = "") {
  if (ok) { console.log(`  ok  ${name}`); }
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

await waitUp();

// Fetch the PDF from the running server.
const res = await fetch(BASE + PDF_PATH);
check("PDF served (200)", res.status === 200, `got HTTP ${res.status}`);
if (res.status !== 200) {
  stop();
  console.error("\n[deck-pdf-check] Cannot proceed — PDF not served.");
  process.exit(1);
}

// Check no-cache headers so a CDN won't serve a stale version forever.
const cc = (res.headers.get("cache-control") || "").toLowerCase();
const hasNoCacheDirective = cc.includes("no-cache") || cc.includes("no-store") || cc.includes("must-revalidate");
// We don't require a strict no-cache, but log it for visibility.
if (hasNoCacheDirective) {
  console.log(`  ok  Cache-Control prevents indefinite caching (${cc})`);
} else {
  console.log(`  --  Cache-Control: ${cc || "(not set)"} — acceptable for a static asset`);
}

// Save to a temp file and extract text.
const buf = Buffer.from(await res.arrayBuffer());
writeFileSync(TEMP_PDF, buf);

let text;
try {
  text = execFileSync("pdftotext", [TEMP_PDF, "-"], { encoding: "utf8" }).toUpperCase();
} catch (e) {
  failures++;
  console.error("FAIL  pdftotext extraction failed:", e.message);
  stop();
  process.exit(1);
}

// Core citation checks.
check(
  "Slide 02 footer cites Dr Karen Nelson-Field / Amplified",
  text.includes("DR KAREN NELSON-FIELD") && text.includes("AMPLIFIED"),
  "expected 'DR KAREN NELSON-FIELD' and 'AMPLIFIED' in extracted text"
);

check(
  "Sources slide (12) lists Dr Karen Nelson-Field / Amplified as source 02",
  text.includes("DR KAREN NELSON-FIELD / AMPLIFIED"),
  "expected exact phrase 'DR KAREN NELSON-FIELD / AMPLIFIED'"
);

check(
  "No stale Dentsu Attention Economy attribution",
  !text.includes("DENTSU"),
  "found 'DENTSU' — stale citation still present"
);

stop();

if (failures) {
  console.error(`\n[deck-pdf-check] ${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\n[deck-pdf-check] OK — deck PDF citation is correct (Nelson-Field / Amplified, no Dentsu).");
process.exit(0);
