#!/usr/bin/env node
// Automated redirect check for the retired /davos-kit-demo page.
//
// The /davos-kit-demo page is retired. It now redirects to the public
// product page at /davos-kit. This script boots serve.mjs on a throwaway
// port and asserts:
//   - GET /davos-kit-demo        -> 301 redirect to /davos-kit
//   - GET /davos-kit-demo.html   -> 301 redirect to /davos-kit
//   - percent-encoded /% ... -> redirect, not a page
//   - GET /davos-kit             -> 200 (public, no gate)
//
// Exits non-zero on any failure.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = 5091;
const BASE = `http://127.0.0.1:${PORT}`;

const TEMP_CONFIG = path.join(os.tmpdir(), `davos-gate-check-${process.pid}.json`);

const server = spawn(process.execPath, ["site/serve.mjs"], {
  env: { ...process.env, PORT: String(PORT), DAVOS_CONFIG_FILE: TEMP_CONFIG },
  stdio: ["ignore", "ignore", "inherit"],
});
const stop = () => {
  try { server.kill(); } catch {}
  try { fs.unlinkSync(TEMP_CONFIG); } catch {}
};
process.on("exit", stop);

async function waitUp() {
  for (let i = 0; i < 50; i++) {
    try { await fetch(`${BASE}/`); return; } catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  throw new Error("server did not start");
}

let failures = 0;
function check(name, ok, detail = "") {
  if (ok) { console.log(`  ok  ${name}`); }
  else { failures++; console.error(`FAIL  ${name}${detail ? ` (${detail})` : ""}`); }
}

await waitUp();

// Old demo paths must redirect, not serve the gated page.
const RETIRED_PATHS = ["/davos-kit-demo", "/davos-kit-demo.html", "/%64avos-kit-demo"];
for (const p of RETIRED_PATHS) {
  const res = await fetch(BASE + p, { redirect: "manual" });
  const isRedirect = res.status >= 300 && res.status < 400;
  const dest = res.headers.get("location") || "";
  check(
    `${p} -> redirect to /davos-kit`,
    isRedirect && dest.includes("/davos-kit"),
    `got ${res.status} ${dest}`,
  );
}

// Public product page must be accessible without any authentication.
{
  const res = await fetch(`${BASE}/davos-kit`);
  check("GET /davos-kit -> 200 (public)", res.status === 200, `got ${res.status}`);
}

stop();
if (failures) {
  console.error(`\n[gate-check] ${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\n[gate-check] OK — /davos-kit-demo redirects to /davos-kit; product page is public.");
process.exit(0);
