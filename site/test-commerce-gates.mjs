#!/usr/bin/env node
/**
 * site/test-commerce-gates.mjs
 *
 * Regression test for cross-product key-boundary enforcement.
 *
 * Self-contained: boots serve.mjs on a throwaway port (5092), seeds minimal
 * entitlement rows directly in the DB (no Stripe round-trip), runs every gate
 * assertion via HTTP, tests webhook-event idempotency via the commerce module,
 * then tears down both the server and the temp DB rows — guaranteed via
 * try/finally regardless of failures.
 *
 * Denial matrix asserted
 * ──────────────────────
 *   MK license key  → POST /api/skillfoundry/validate      → 402
 *   MK sub key      → POST /api/skillfoundry/validate      → 402
 *   MK license key  → POST /api/skillfoundry/run           → 402
 *   MK sub key      → POST /api/skillfoundry/run           → 402
 *   MK license key  → GET  /api/skillfoundry/download      → 403
 *   MK sub key      → GET  /api/skillfoundry/download      → 403
 *   SF license key  → GET  /api/marcom-kit/download        → 403
 *   SF sub key      → GET  /api/marcom-kit/download        → 403
 *   SF license key  → POST /api/skillfoundry/validate      → 402 (not subscription)
 *   SF license key  → POST /api/skillfoundry/run           → 402 (not subscription)
 *
 * Positive smoke
 * ──────────────
 *   SF sub key      → POST /api/skillfoundry/validate      → 200 + ok:true
 *
 * Idempotency
 * ───────────
 *   Same checkout.session.completed event replayed twice →
 *     entitlement row count for that session_id = exactly 1
 *
 * Prerequisites
 * ─────────────
 *   DATABASE_URL must be set (Postgres). No Stripe key required.
 *
 * Usage
 *   node site/test-commerce-gates.mjs
 */

import crypto from "node:crypto";
import { spawn }  from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { handleEvent } from "./commerce.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────────────────────

const PORT = 5092;                         // throwaway port, never conflicts
const BASE = `http://127.0.0.1:${PORT}`;

if (!process.env.DATABASE_URL) {
  console.error("[gate-test] DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

// ── DB ───────────────────────────────────────────────────────────────────────

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

// ── Server lifecycle ─────────────────────────────────────────────────────────

const server = spawn(process.execPath, [path.join(__dirname, "serve.mjs")], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "ignore", "inherit"],
});

const stopServer = () => { try { server.kill(); } catch {} };
// Belt-and-suspenders: always kill on process exit.
process.on("exit", stopServer);
process.on("SIGINT",  () => { stopServer(); process.exit(130); });
process.on("SIGTERM", () => { stopServer(); process.exit(143); });

async function waitUp(timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { await fetch(`${BASE}/`); return; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server did not start on port ${PORT} within ${timeoutMs}ms`);
}

// ── Seeding helpers ───────────────────────────────────────────────────────────

function uid() { return crypto.randomBytes(6).toString("hex"); }
function fakeSessionId() { return `cs_test_gate_${uid()}`; }

// Human-readable keys carrying a "GATE" segment so they're easy to spot in logs.
const SF_SUB_KEY = `SFS-GATE-${uid().toUpperCase()}-TSTONL`;
const SF_LIC_KEY = `SF1-GATE-${uid().toUpperCase()}-TSTONL`;
const MK_LIC_KEY = `MK1-GATE-${uid().toUpperCase()}-TSTONL`;
const MK_SUB_KEY = `MKS-GATE-${uid().toUpperCase()}-TSTONL`;

const seededSessions = [];

async function seedEntitlement({ key, keyType, tier, product }) {
  const session = fakeSessionId();
  await pool.query(
    `INSERT INTO skillfoundry_entitlements
       (key_value, key_type, tier, status, email,
        stripe_checkout_session_id, needs_onboarding, product, white_label)
     VALUES ($1,$2,$3,'active','gate-test@example.com',$4,false,$5,false)
     ON CONFLICT (key_value) DO NOTHING`,
    [key, keyType, tier, session, product],
  );
  seededSessions.push(session);
  return session;
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function cleanup() {
  try {
    if (seededSessions.length > 0) {
      await pool.query(
        `DELETE FROM skillfoundry_entitlements
          WHERE stripe_checkout_session_id = ANY($1::text[])`,
        [seededSessions],
      );
    }
    // Purge any webhook-ledger entries seeded by the idempotency test.
    await pool.query(
      `DELETE FROM stripe_processed_events WHERE event_id LIKE 'evt_gate_%'`,
    );
  } catch (err) {
    console.error("[gate-test][cleanup] warning:", err.message);
  } finally {
    await pool.end().catch(() => {});
    stopServer();
  }
}

// ── Assertion harness ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓  ${name} → ${actual}`);
    passed++;
  } else {
    const msg = `${name}: expected ${expected}, got ${actual}`;
    console.error(`  ✗  ${msg}`);
    failures.push(msg);
    failed++;
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

// Use a unique per-run fake IP so the Postgres-backed rate limiter never
// mistakes this test run for the previous one (both use the same DB).
// 198.51.100.x is TEST-NET-2 (RFC 5737) — never a real client address.
const TEST_IP = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;

const BASE_HEADERS = {
  "Content-Type": "application/json",
  "X-Forwarded-For": TEST_IP,
};

async function post(path, body) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: BASE_HEADERS,
    body: JSON.stringify(body),
  });
}

async function get(urlPath) {
  return fetch(`${BASE}${urlPath}`, { headers: { "X-Forwarded-For": TEST_IP } });
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(64)}`);
console.log("Cross-product key boundary — regression test");
console.log("═".repeat(64));

console.log(`\nStarting isolated server on port ${PORT} …`);

// try/finally wraps EVERYTHING from here — including startup — so the child
// process and DB pool are always released even when waitUp() throws.
try {
  await waitUp();
  console.log("Server ready.");

  // ── Seed ──────────────────────────────────────────────────────────────────

  console.log("\n── Seeding test entitlements …");
  await seedEntitlement({ key: SF_SUB_KEY, keyType: "subscription", tier: "tier2",  product: "skillfoundry" });
  await seedEntitlement({ key: SF_LIC_KEY, keyType: "license",      tier: "tier1",  product: "skillfoundry" });
  await seedEntitlement({ key: MK_LIC_KEY, keyType: "license",      tier: "mk1",    product: "marcom-kit"   });
  await seedEntitlement({ key: MK_SUB_KEY, keyType: "subscription", tier: "mk2",    product: "marcom-kit"   });

  console.log(`  SF subscription : ${SF_SUB_KEY}`);
  console.log(`  SF license      : ${SF_LIC_KEY}`);
  console.log(`  MK license      : ${MK_LIC_KEY}`);
  console.log(`  MK subscription : ${MK_SUB_KEY}`);

  // ── Section 1: Denial matrix ───────────────────────────────────────────────

  console.log("\n── 1 · Cross-product denial matrix");

  assert("MK-lic  → /api/skillfoundry/validate",
    (await post("/api/skillfoundry/validate", { key: MK_LIC_KEY })).status, 402);

  assert("MK-sub  → /api/skillfoundry/validate",
    (await post("/api/skillfoundry/validate", { key: MK_SUB_KEY })).status, 402);

  assert("MK-lic  → /api/skillfoundry/run",
    (await post("/api/skillfoundry/run", { key: MK_LIC_KEY, asset: "test" })).status, 402);

  assert("MK-sub  → /api/skillfoundry/run",
    (await post("/api/skillfoundry/run", { key: MK_SUB_KEY, asset: "test" })).status, 402);

  assert("MK-lic  → /api/skillfoundry/download",
    (await get(`/api/skillfoundry/download?key=${encodeURIComponent(MK_LIC_KEY)}`)).status, 403);

  assert("MK-sub  → /api/skillfoundry/download",
    (await get(`/api/skillfoundry/download?key=${encodeURIComponent(MK_SUB_KEY)}`)).status, 403);

  assert("SF-lic  → /api/marcom-kit/download",
    (await get(`/api/marcom-kit/download?key=${encodeURIComponent(SF_LIC_KEY)}`)).status, 403);

  assert("SF-sub  → /api/marcom-kit/download",
    (await get(`/api/marcom-kit/download?key=${encodeURIComponent(SF_SUB_KEY)}`)).status, 403);

  // ── Section 2: Same-product wrong-key-type gates ───────────────────────────

  console.log("\n── 2 · Same-product wrong-key-type (license ≠ subscription)");

  assert("SF-lic  → /api/skillfoundry/validate",
    (await post("/api/skillfoundry/validate", { key: SF_LIC_KEY })).status, 402);

  assert("SF-lic  → /api/skillfoundry/run",
    (await post("/api/skillfoundry/run", { key: SF_LIC_KEY, asset: "test" })).status, 402);

  // ── Section 3: Positive smoke ──────────────────────────────────────────────

  console.log("\n── 3 · Positive smoke (SF sub key must validate OK)");

  {
    const r   = await post("/api/skillfoundry/validate", { key: SF_SUB_KEY });
    const body = await r.json().catch(() => ({}));
    assert("SF-sub  → /api/skillfoundry/validate status", r.status,  200);
    assert("SF-sub  → /api/skillfoundry/validate ok    ", body.ok, true);
  }

  // ── Section 4: Webhook idempotency ────────────────────────────────────────

  console.log("\n── 4 · Webhook idempotency (same event replayed → exactly 1 row)");

  const idempSession = fakeSessionId();
  seededSessions.push(idempSession);   // ensure cleanup even if test fails mid-way

  const fakeEvent = {
    id:   `evt_gate_${uid()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id:             idempSession,
        object:         "checkout.session",
        payment_status: "paid",
        status:         "complete",
        metadata:       { tier: "mk1", product: "marcom-kit" },
        customer_details: { email: "idempotency-gate-test@example.com" },
        customer:        null,
        subscription:    null,
        payment_intent:  null,
      },
    },
  };

  try {
    await handleEvent(fakeEvent);
  } catch (err) {
    const msg = `handleEvent (first): ${err.message}`;
    console.error(`  ✗  ${msg}`);
    failures.push(msg);
    failed++;
  }

  let secondResult;
  try {
    secondResult = await handleEvent(fakeEvent);
  } catch (err) {
    const msg = `handleEvent (second): ${err.message}`;
    console.error(`  ✗  ${msg}`);
    failures.push(msg);
    failed++;
  }

  if (secondResult) {
    assert("Second handleEvent returns duplicate:true", secondResult.duplicate, true);
  }

  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM skillfoundry_entitlements
      WHERE stripe_checkout_session_id = $1`,
    [idempSession],
  );
  assert("Row count after 2 replays = exactly 1", rows[0]?.n ?? 0, 1);

} finally {
  console.log("\n── Cleaning up test rows and stopping server …");
  await cleanup();
  console.log("  Done.");
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(64)}`);
console.log(`RESULT: ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.error("\nFailed assertions:");
  for (const f of failures) console.error(`  · ${f}`);
  console.error("");
  process.exit(1);
}

console.log("\nAll assertions passed ✅");
console.log("Cross-product key boundary is correctly enforced.\n");
process.exit(0);
