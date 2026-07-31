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
//   - expired token (valid HMAC but past expiry) -> 401
//
// If DAVOS_DEMO_PASSWORD is unset the demo must be fully unavailable (503),
// and the positive-path checks are skipped. Exits non-zero on any failure.

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = 5091;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = process.env.DAVOS_DEMO_PASSWORD || "";

// Gate-check owns its own isolated config file so it never reads or pollutes
// the persistent site/davos-config.json left over from a prior run.
const TEMP_CONFIG = path.join(os.tmpdir(), `davos-gate-check-${process.pid}.json`);
if (PASSWORD) {
  fs.writeFileSync(TEMP_CONFIG, JSON.stringify({ password: PASSWORD }), "utf8");
}

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
// Expired token: valid HMAC over a past expiry — must be rejected even though
// the signature is cryptographically correct for the right password.
if (PASSWORD) {
  const pastExpiry = Math.floor(Date.now() / 1000) - 1; // 1 second ago
  const sig = crypto
    .createHmac("sha256", PASSWORD)
    .update(`davos-demo-gate-v2:${pastExpiry}`)
    .digest("hex");
  const expiredToken = `${pastExpiry}.${sig}`;
  const res = await fetch(`${BASE}/davos-kit-demo`, {
    headers: { cookie: `dk_demo=${expiredToken}` },
    redirect: "manual",
  });
  check("expired token -> 401", res.status === 401, `got ${res.status}`);
}

// Live rotation: change the access code while the server is running;
// the prior session must be revoked and the new code must unlock the gate.
const ADMIN_TOK = process.env.WAITLIST_ADMIN_TOKEN || "";
if (PASSWORD && ADMIN_TOK) {
  // Capture a live session under the current password.
  const preLogin = await fetch(`${BASE}/davos-kit-demo`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: PASSWORD }),
    redirect: "manual",
  });
  const preM = (preLogin.headers.get("set-cookie") || "").match(/dk_demo=([^;]+)/);
  check("pre-rotation login succeeds", !!preM);
  if (preM) {
    const rotated = `gate-check-rotated-${Date.now()}`;
    // Change the code via the admin endpoint using a Bearer token.
    const rotateRes = await fetch(`${BASE}/admin/davos/set-code`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Bearer ${ADMIN_TOK}`,
      },
      body: new URLSearchParams({ code: rotated }),
      redirect: "manual",
    });
    check("rotation endpoint -> 303", rotateRes.status === 303, `got ${rotateRes.status}`);

    // Old session must now be refused.
    const oldRes = await fetch(`${BASE}/davos-kit-demo`, {
      headers: { cookie: `dk_demo=${preM[1]}` },
      redirect: "manual",
    });
    check("old session rejected after rotation", oldRes.status !== 200, `got ${oldRes.status}`);

    // New code must unlock the gate.
    const newLogin = await fetch(`${BASE}/davos-kit-demo`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ password: rotated }),
      redirect: "manual",
    });
    const newM = (newLogin.headers.get("set-cookie") || "").match(/dk_demo=([^;]+)/);
    check("new code issues a valid session", !!newM);
    if (newM) {
      const newRes = await fetch(`${BASE}/davos-kit-demo`, {
        headers: { cookie: `dk_demo=${newM[1]}` },
      });
      check("new session -> 200", newRes.status === 200, `got ${newRes.status}`);
    }

    // Restore original password so later checks continue to work.
    await fetch(`${BASE}/admin/davos/set-code`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Bearer ${ADMIN_TOK}`,
      },
      body: new URLSearchParams({ code: PASSWORD }),
      redirect: "manual",
    });
  }
} else {
  console.log(`  --  ${!PASSWORD ? "DAVOS_DEMO_PASSWORD" : "WAITLIST_ADMIN_TOKEN"} unset; live-rotation checks skipped.`);
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
