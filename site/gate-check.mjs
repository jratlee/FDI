#!/usr/bin/env node
// Automated lock check for the password-gated /davos-kit-demo page.
//
// Boots serve.mjs on a throwaway port and asserts the gate holds:
//   - unauthenticated GET /davos-kit-demo        -> 401 (gate page)
//   - unauthenticated GET /davos-kit-demo.html   -> 401
//   - percent-encoded bypass /%64avos-kit-demo   -> 401 (never 200)
//   - unauthenticated gated asset                -> 404
//   - wrong password POST                        -> 401, no cookie
//   - correct password POST                      -> cookie; authed GET -> 200
//     with Cache-Control no-store/private and X-Robots-Tag noindex
//   - garbage cookie                             -> 401
//
// If DAVOS_DEMO_PASSWORD is unset the demo must be fully unavailable (503),
// and the positive-path checks are skipped. Exits non-zero on any failure.

import { spawn } from "node:child_process";

const PORT = 5091;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = process.env.DAVOS_DEMO_PASSWORD || "";

const server = spawn(process.execPath, ["site/serve.mjs"], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "ignore", "inherit"],
});
const stop = () => { try { server.kill(); } catch {} };
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

const GATED_PATHS = ["/davos-kit-demo", "/davos-kit-demo.html", "/%64avos-kit-demo"];
const expectNoAuth = PASSWORD ? 401 : 503;
for (const p of GATED_PATHS) {
  const res = await fetch(BASE + p, { redirect: "manual" });
  check(`unauth ${p} -> ${expectNoAuth}`, res.status === expectNoAuth, `got ${res.status}`);
}
{
  const res = await fetch(`${BASE}/assets/davos-demo/journey-1-product-page.png`);
  check("unauth gated asset -> 404", res.status === 404, `got ${res.status}`);
}
{
  const res = await fetch(`${BASE}/davos-kit-demo`, {
    headers: { cookie: "dk_demo=deadbeef%zz" },
    redirect: "manual",
  });
  check("garbage cookie -> not 200", res.status !== 200 && res.status !== 500, `got ${res.status}`);
}

if (PASSWORD) {
  const bad = await fetch(`${BASE}/davos-kit-demo`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: "wrong-password" }),
    redirect: "manual",
  });
  check("wrong password -> 401, no cookie",
    bad.status === 401 && !(bad.headers.get("set-cookie") || "").includes("dk_demo="),
    `got ${bad.status}`);

  const good = await fetch(`${BASE}/davos-kit-demo`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: PASSWORD }),
    redirect: "manual",
  });
  const m = (good.headers.get("set-cookie") || "").match(/dk_demo=([^;]+)/);
  check("correct password issues cookie", !!m);
  if (m) {
    const authed = await fetch(`${BASE}/davos-kit-demo`, { headers: { cookie: `dk_demo=${m[1]}` } });
    const cc = (authed.headers.get("cache-control") || "").toLowerCase();
    const robots = (authed.headers.get("x-robots-tag") || "").toLowerCase();
    check("authed GET -> 200", authed.status === 200, `got ${authed.status}`);
    check("authed response is no-store + private", cc.includes("no-store") && cc.includes("private"), cc);
    check("authed response is noindex", robots.includes("noindex"), robots);
    const asset = await fetch(`${BASE}/assets/davos-demo/journey-1-product-page.png`, {
      headers: { cookie: `dk_demo=${m[1]}` },
    });
    check("authed gated asset -> 200", asset.status === 200, `got ${asset.status}`);
  }
} else {
  console.log("  --  DAVOS_DEMO_PASSWORD unset; positive-path checks skipped (503 lockout verified).");
}

stop();
if (failures) {
  console.error(`\n[gate-check] ${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\n[gate-check] OK — the Davos demo gate holds.");
process.exit(0);
