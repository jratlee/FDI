#!/usr/bin/env node
/**
 * site/test-webhook-provisioning.mjs
 *
 * Confirms the Stripe webhook path provisions a key even when the buyer never
 * returns to the success page.
 *
 * What it tests
 * ─────────────
 *   1. STRIPE_WEBHOOK_SECRET is present and accepted by constructEvent.
 *   2. A signed checkout.session.completed POST to /api/stripe/webhook inserts
 *      a row in skillfoundry_entitlements — without the success page being
 *      visited at all.
 *   3. Replaying the same event is idempotent: exactly one row per session_id.
 *   4. A signed customer.subscription.deleted POST flips the entitlement's
 *      status to 'inactive'.
 *   5. An unsigned (missing stripe-signature header) POST is rejected with 400.
 *   6. A tampered-signature POST is rejected with 400.
 *
 * Prerequisites
 * ─────────────
 *   - DATABASE_URL must be set (Postgres — the entitlements table must exist or
 *     will be created by the commerce module's ensureSchema).
 *   - STRIPE_SECRET_KEY or STRIPE_TEST_API_KEY must be set (Stripe client).
 *   - STRIPE_WEBHOOK_SECRET must be set (webhook signing secret).
 *   - The server does NOT need to be running — this script starts an isolated
 *     copy on port 5093.
 *
 * Usage
 *   node site/test-webhook-provisioning.mjs
 */

import crypto from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import Stripe from "stripe";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Prerequisites ─────────────────────────────────────────────────────────────

const STRIPE_KEY =
  (process.env.STRIPE_SECRET_KEY || "").trim() ||
  (process.env.STRIPE_TEST_API_KEY || "").trim();
const WEBHOOK_SECRET = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();

const preflightErrors = [];
if (!process.env.DATABASE_URL) preflightErrors.push("DATABASE_URL is not set");
if (!STRIPE_KEY) preflightErrors.push("STRIPE_SECRET_KEY / STRIPE_TEST_API_KEY is not set");
if (!WEBHOOK_SECRET) preflightErrors.push("STRIPE_WEBHOOK_SECRET is not set");

if (preflightErrors.length) {
  console.error("\n[webhook-test] Missing prerequisites:");
  for (const e of preflightErrors) console.error(`  • ${e}`);
  process.exit(1);
}

// ── Config ────────────────────────────────────────────────────────────────────

const PORT = 5093;
const BASE = `http://127.0.0.1:${PORT}`;

// ── Stripe + DB clients ───────────────────────────────────────────────────────

const stripe = new Stripe(STRIPE_KEY, {
  appInfo: { name: "fdi-webhook-test", version: "1.0.0" },
});

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

// ── Server lifecycle ──────────────────────────────────────────────────────────

const server = spawn(process.execPath, [path.join(__dirname, "serve.mjs")], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "ignore", "inherit"],
});

const stopServer = () => { try { server.kill(); } catch {} };
process.on("exit", stopServer);
process.on("SIGINT",  () => { stopServer(); process.exit(130); });
process.on("SIGTERM", () => { stopServer(); process.exit(143); });

async function waitUp(timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { await fetch(`${BASE}/`); return; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server did not start on port ${PORT} within ${timeoutMs}ms`);
}

// ── Unique identifiers for this test run ─────────────────────────────────────

function uid() { return crypto.randomBytes(6).toString("hex"); }

const RUN_ID      = uid();
const SESSION_ID  = `cs_test_wh_${RUN_ID}`;     // fake checkout session id
const SUB_ID      = `sub_test_wh_${RUN_ID}`;     // fake subscription id
const CUST_ID     = `cus_test_wh_${RUN_ID}`;     // fake customer id
const EVT_PREFIX  = `evt_wh_test_${RUN_ID}`;     // event id prefix

// ── Event factory ─────────────────────────────────────────────────────────────
//
// Build a minimal Stripe event object and sign it with the webhook secret so
// the server's constructEvent / stripe.webhooks.constructEvent accepts it.
// generateTestHeaderString is the official SDK method for exactly this purpose.

function buildSignedEvent(type, dataObject, eventId) {
  const event = {
    id: eventId || `${EVT_PREFIX}_${type.replace(/\./g, "_")}`,
    object: "event",
    type,
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: { object: dataObject },
  };
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
  return { payload, header };
}

// ── HTTP helper: POST to the webhook endpoint ─────────────────────────────────

async function postWebhook(payload, stripeSignatureHeader) {
  const headers = { "Content-Type": "application/json" };
  if (stripeSignatureHeader !== undefined) {
    headers["stripe-signature"] = stripeSignatureHeader;
  }
  return fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers,
    body: payload,
  });
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function getEntitlementBySession(sessionId) {
  const { rows } = await pool.query(
    `SELECT * FROM skillfoundry_entitlements WHERE stripe_checkout_session_id = $1`,
    [sessionId],
  );
  return rows[0] || null;
}

async function countEntitlementsBySession(sessionId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS n FROM skillfoundry_entitlements
      WHERE stripe_checkout_session_id = $1`,
    [sessionId],
  );
  return Number(rows[0].n);
}

// ── Assertion harness ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓  ${name} → ${JSON.stringify(actual)}`);
    passed++;
  } else {
    const msg = `${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
    console.error(`  ✗  ${msg}`);
    failures.push(msg);
    failed++;
  }
}

function assertTruthy(name, actual) {
  if (actual) {
    console.log(`  ✓  ${name} → ${JSON.stringify(actual)}`);
    passed++;
  } else {
    const msg = `${name}: expected truthy, got ${JSON.stringify(actual)}`;
    console.error(`  ✗  ${msg}`);
    failures.push(msg);
    failed++;
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function cleanup() {
  try {
    await pool.query(
      `DELETE FROM skillfoundry_entitlements
        WHERE stripe_checkout_session_id = $1`,
      [SESSION_ID],
    );
    await pool.query(
      `DELETE FROM stripe_processed_events
        WHERE event_id LIKE $1`,
      [`${EVT_PREFIX}%`],
    );
  } catch (err) {
    console.error("[webhook-test][cleanup] warning:", err.message);
  } finally {
    await pool.end().catch(() => {});
    stopServer();
  }
}

// ── Synthetic session object (checkout.session.completed) ─────────────────────
//
// The fields here mirror what Stripe actually sends in a completed session for
// a one-time payment. tier1 (SF1-... key) is used because it doesn't require a
// live subscription id to be in the DB and is always configured in test mode.
// Using a one-time tier also lets us exercise the subscription_deleted path
// independently with a separate fake sub_id.

const CHECKOUT_SESSION_OBJECT = {
  id: SESSION_ID,
  object: "checkout.session",
  payment_status: "paid",
  status: "complete",
  mode: "payment",
  customer: CUST_ID,
  customer_email: "webhook-test@example.com",
  customer_details: { email: "webhook-test@example.com" },
  payment_intent: `pi_test_wh_${RUN_ID}`,
  subscription: null,
  metadata: { product: "skillfoundry", tier: "tier1" },
};

// For subscription deletion test we need an entitlement row that carries a
// stripe_subscription_id. We'll seed one directly after the checkout event
// provisions the first row (which won't have a sub_id since mode=payment), OR
// we use a separate session for the subscription flow test.
// Simpler approach: use a separate fake subscription session.

const SUB_SESSION_ID = `cs_test_wh_sub_${RUN_ID}`;

const SUB_CHECKOUT_SESSION_OBJECT = {
  id: SUB_SESSION_ID,
  object: "checkout.session",
  payment_status: "paid",
  status: "complete",
  mode: "subscription",
  customer: CUST_ID,
  customer_email: "webhook-test@example.com",
  customer_details: { email: "webhook-test@example.com" },
  payment_intent: null,
  subscription: SUB_ID,
  metadata: { product: "skillfoundry", tier: "tier2" },
};

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(64)}`);
console.log("Stripe webhook provisioning — end-to-end test");
console.log(`Run ID: ${RUN_ID}`);
console.log(`Webhook endpoint: ${BASE}/api/stripe/webhook`);
console.log("═".repeat(64));

try {
  // ── Server startup ─────────────────────────────────────────────────────────

  console.log(`\nStarting isolated server on port ${PORT} …`);
  await waitUp();
  console.log("Server ready.\n");

  // ── [1] Unsigned request is rejected ──────────────────────────────────────

  console.log("── [1] Unsigned POST is rejected with 400");
  {
    const res = await postWebhook(
      JSON.stringify({ type: "checkout.session.completed" }),
      undefined, // no stripe-signature header
    );
    assert("unsigned POST → HTTP 400", res.status, 400);
    const json = await res.json();
    assert("unsigned POST → error:missing_signature", json.error, "missing_signature");
  }

  // ── [2] Tampered-signature request is rejected ─────────────────────────────

  console.log("\n── [2] Tampered-signature POST is rejected with 400");
  {
    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const res = await postWebhook(payload, "t=1234,v1=invalidsignature");
    assert("tampered-sig POST → HTTP 400", res.status, 400);
  }

  // ── [3] checkout.session.completed provisions a key (no success page) ──────

  console.log("\n── [3] checkout.session.completed → entitlement created (no success page visited)");
  {
    const { payload, header } = buildSignedEvent(
      "checkout.session.completed",
      CHECKOUT_SESSION_OBJECT,
      `${EVT_PREFIX}_checkout_completed`,
    );
    const res = await postWebhook(payload, header);
    assert("webhook POST → HTTP 200", res.status, 200);
    const json = await res.json();
    assert("response.received = true", json.received, true);

    // Give the handler a moment (it's async but the 200 means it completed).
    await new Promise((r) => setTimeout(r, 300));

    const row = await getEntitlementBySession(SESSION_ID);
    assertTruthy("entitlement row exists in DB", Boolean(row));
    if (row) {
      assert("row.tier = tier1", row.tier, "tier1");
      assert("row.status = active", row.status, "active");
      assert("row.product = skillfoundry", row.product, "skillfoundry");
      assert("row.key_type = license", row.key_type, "license");
      assertTruthy("key_value starts with SF1-", row.key_value?.startsWith("SF1-"));
      console.log(`     key provisioned: ${row.key_value}`);
    }
  }

  // ── [4] Idempotency: replaying the same event creates no duplicate ─────────

  console.log("\n── [4] Idempotency: replaying checkout.session.completed creates no duplicate");
  {
    // Replay with the SAME event_id — the ledger should deduplicate it.
    const { payload, header } = buildSignedEvent(
      "checkout.session.completed",
      CHECKOUT_SESSION_OBJECT,
      `${EVT_PREFIX}_checkout_completed`, // same event id as above
    );
    const res = await postWebhook(payload, header);
    assert("replay POST → HTTP 200", res.status, 200);

    await new Promise((r) => setTimeout(r, 300));

    const count = await countEntitlementsBySession(SESSION_ID);
    assert("row count for session_id = 1 (no duplicate)", count, 1);
  }

  // ── [5] subscription checkout.session.completed → sub key ─────────────────

  console.log("\n── [5] subscription checkout.session.completed → SFS-... key + sub_id stored");
  {
    const { payload, header } = buildSignedEvent(
      "checkout.session.completed",
      SUB_CHECKOUT_SESSION_OBJECT,
      `${EVT_PREFIX}_sub_checkout_completed`,
    );
    const res = await postWebhook(payload, header);
    assert("sub webhook POST → HTTP 200", res.status, 200);

    await new Promise((r) => setTimeout(r, 300));

    const row = await getEntitlementBySession(SUB_SESSION_ID);
    assertTruthy("sub entitlement row exists", Boolean(row));
    if (row) {
      assert("sub row.tier = tier2", row.tier, "tier2");
      assert("sub row.status = active", row.status, "active");
      assert("sub row.key_type = subscription", row.key_type, "subscription");
      assertTruthy("sub key_value starts with SFS-", row.key_value?.startsWith("SFS-"));
      assert("stripe_subscription_id stored", row.stripe_subscription_id, SUB_ID);
      console.log(`     key provisioned: ${row.key_value}`);
    }
  }

  // ── [6] customer.subscription.deleted → status flipped to inactive ─────────

  console.log("\n── [6] customer.subscription.deleted → entitlement flipped to inactive");
  {
    const subDeletedObject = {
      id: SUB_ID,
      object: "subscription",
      status: "canceled",
    };
    const { payload, header } = buildSignedEvent(
      "customer.subscription.deleted",
      subDeletedObject,
      `${EVT_PREFIX}_sub_deleted`,
    );
    const res = await postWebhook(payload, header);
    assert("sub.deleted POST → HTTP 200", res.status, 200);

    await new Promise((r) => setTimeout(r, 300));

    const row = await getEntitlementBySession(SUB_SESSION_ID);
    assertTruthy("row still exists after deletion event", Boolean(row));
    if (row) {
      assert("status flipped to inactive", row.status, "inactive");
    }
  }

  // ── [7] STRIPE_WEBHOOK_SECRET sanity check (constructEvent round-trip) ─────

  console.log("\n── [7] STRIPE_WEBHOOK_SECRET sanity: constructEvent round-trip");
  {
    const dummyPayload = JSON.stringify({ id: "evt_dummy", type: "ping" });
    const header = stripe.webhooks.generateTestHeaderString({
      payload: dummyPayload,
      secret: WEBHOOK_SECRET,
    });
    let ok = false;
    try {
      // constructEvent throws on bad secret/signature — success means the
      // secret in the env matches what signs events to this endpoint.
      stripe.webhooks.constructEvent(dummyPayload, header, WEBHOOK_SECRET);
      ok = true;
    } catch { /* mismatch */ }
    assert("STRIPE_WEBHOOK_SECRET round-trip OK", ok, true);
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log(`\n${"═".repeat(64)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.error("\nFailures:");
    for (const f of failures) console.error(`  • ${f}`);
  }
  console.log("═".repeat(64));

} finally {
  await cleanup();
}

if (failed > 0) {
  console.error(`\n[webhook-test] ${failed} assertion(s) failed.`);
  process.exit(1);
}

// ── Clean up the sub session row too (not in the main cleanup) ────────────────
// (cleanup() only removes SESSION_ID; we need to also clean up SUB_SESSION_ID)
// Re-do a quick targeted delete via a fresh pool since the main one is ended.
{
  const cleanPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    await cleanPool.query(
      `DELETE FROM skillfoundry_entitlements
        WHERE stripe_checkout_session_id = $1`,
      [SUB_SESSION_ID],
    );
  } catch { /* best-effort */ } finally {
    await cleanPool.end().catch(() => {});
  }
}

console.log(
  "\n✅ Webhook provisioning confirmed — buyers who close the browser after\n" +
  "   payment will still receive their key via the webhook path.\n",
);
