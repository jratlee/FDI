#!/usr/bin/env node
/**
 * site/test-cron-link-check.mjs
 *
 * Smoke test for the /api/cron/link-check HTTP trigger endpoint.
 *
 * Self-contained: boots serve.mjs on a throwaway port twice — once with
 * CRON_SECRET set and once without — and asserts:
 *
 *   Auth guard
 *   ──────────
 *     No secret supplied          → 401
 *     Wrong secret supplied       → 401
 *     Correct secret (query param)→ 202 + { ok: true, pid: <number> }
 *     Correct secret (Bearer hdr) → 202 + { ok: true, pid: <number> }
 *
 *   Disabled guard (CRON_SECRET unset)
 *   ───────────────────────────────────
 *     Any request                 → 404
 *
 * Does NOT exercise the full crawl or email delivery (those require a live
 * deployed site and Resend credentials). This test confirms the gate and
 * spawn plumbing are wired correctly.
 *
 * Prerequisites
 * ─────────────
 *   None beyond what serve.mjs needs — DATABASE_URL is optional (site
 *   gracefully degrades without it).
 *
 * Usage
 *   node site/test-cron-link-check.mjs
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────────────────────

const PORT_WITH_SECRET    = 5093;
const PORT_WITHOUT_SECRET = 5094;
const TEST_SECRET = "cron-smoke-test-secret-abc123";

// ── Helpers ───────────────────────────────────────────────────────────────────

let pass = 0;
let fail = 0;

function ok(label) {
  console.log(`  ✓  ${label}`);
  pass++;
}

function ko(label, detail = "") {
  console.error(`  ✗  ${label}${detail ? `\n     ${detail}` : ""}`);
  fail++;
}

async function assert(label, actual, expected) {
  if (actual === expected) {
    ok(label);
  } else {
    ko(label, `expected ${expected}, got ${actual}`);
  }
}

// ── Server lifecycle ──────────────────────────────────────────────────────────

function startServer(port, extraEnv = {}) {
  const proc = spawn(
    process.execPath,
    [path.join(__dirname, "serve.mjs")],
    {
      env: { ...process.env, PORT: String(port), ...extraEnv },
      stdio: ["ignore", "ignore", "inherit"],
    },
  );
  const stop = () => { try { proc.kill(); } catch {} };
  process.on("exit", stop);
  return { proc, stop, base: `http://127.0.0.1:${port}` };
}

async function waitUp(base, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(`${base}/`);
      return;
    } catch {
      // not yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not start at ${base} within ${timeoutMs}ms`);
}

// ── Request helper ────────────────────────────────────────────────────────────

async function get(url, headers = {}) {
  const res = await fetch(url, { headers });
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, body };
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("\n[cron-link-check-test] booting test servers …\n");

const withSecret    = startServer(PORT_WITH_SECRET,    { CRON_SECRET: TEST_SECRET });
const withoutSecret = startServer(PORT_WITHOUT_SECRET, { CRON_SECRET: "" });

try {
  await Promise.all([
    waitUp(withSecret.base),
    waitUp(withoutSecret.base),
  ]);
  console.log("[cron-link-check-test] servers ready\n");

  // ── Section 1: endpoint disabled when CRON_SECRET is unset ─────────────────
  console.log("Section 1: CRON_SECRET unset → endpoint disabled");
  {
    const r = await get(`${withoutSecret.base}/api/cron/link-check`);
    await assert("no secret env + no provided secret → 404", r.status, 404);

    const r2 = await get(
      `${withoutSecret.base}/api/cron/link-check?secret=${TEST_SECRET}`,
    );
    await assert(
      "no secret env + correct secret query → 404 (endpoint disabled)",
      r2.status,
      404,
    );
  }

  // ── Section 2: auth guard when CRON_SECRET is set ──────────────────────────
  console.log("\nSection 2: CRON_SECRET set — auth guard");
  {
    // No credentials
    const r1 = await get(`${withSecret.base}/api/cron/link-check`);
    await assert("no secret provided → 401", r1.status, 401);

    // Wrong query param
    const r2 = await get(
      `${withSecret.base}/api/cron/link-check?secret=wrong-secret`,
    );
    await assert("wrong secret (query) → 401", r2.status, 401);

    // Wrong Bearer header
    const r3 = await get(`${withSecret.base}/api/cron/link-check`, {
      Authorization: "Bearer wrong-secret",
    });
    await assert("wrong secret (Bearer) → 401", r3.status, 401);
  }

  // ── Section 3: successful trigger ──────────────────────────────────────────
  console.log("\nSection 3: CRON_SECRET set — successful trigger");
  {
    // Correct secret via query param
    const r1 = await get(
      `${withSecret.base}/api/cron/link-check?secret=${TEST_SECRET}`,
    );
    await assert("correct secret (query) → 202", r1.status, 202);
    if (r1.body && r1.body.ok === true) {
      ok("response body has ok:true");
    } else {
      ko("response body has ok:true", JSON.stringify(r1.body));
    }
    if (r1.body && typeof r1.body.pid === "number") {
      ok(`response body has numeric pid (${r1.body.pid})`);
    } else {
      ko("response body has numeric pid", JSON.stringify(r1.body));
    }

    // Allow spawned child a moment to start and fail gracefully (SITE_BASE_URL
    // is not set, so it exits 0 immediately — that is intentional advisory
    // behaviour and must not surface as a test failure).
    await new Promise((r) => setTimeout(r, 800));

    // Correct secret via Authorization: Bearer header
    const r2 = await get(`${withSecret.base}/api/cron/link-check`, {
      Authorization: `Bearer ${TEST_SECRET}`,
    });
    await assert("correct secret (Bearer) → 202", r2.status, 202);
    if (r2.body && r2.body.ok === true) {
      ok("Bearer response body has ok:true");
    } else {
      ko("Bearer response body has ok:true", JSON.stringify(r2.body));
    }
  }
} finally {
  withSecret.stop();
  withoutSecret.stop();
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n[cron-link-check-test] ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
