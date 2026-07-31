#!/usr/bin/env node
/**
 * site/test-fulfillment-alert.mjs
 *
 * Confirms that sendPurchaseNotification delivers a fulfillment alert email to
 * WAITLIST_NOTIFY_EMAIL via Resend for every manual-fulfillment MarCom OS tier
 * (mk3 Architecture Partner, mk-sprint Transformation Sprint, mk-audit
 * Governance Risk Audit).
 *
 * The test calls sendPurchaseNotification directly with synthetic purchase data
 * so it runs without Stripe, a database, or a running server. It verifies the
 * Resend API accepts each message (HTTP 200) rather than just checking that the
 * code path is reached.
 *
 * Prerequisites
 * ─────────────
 *   RESEND_FROM          — verified sender address, e.g. "Team <hello@domain.com>"
 *   WAITLIST_NOTIFY_EMAIL — internal address that receives fulfillment alerts
 *   RESEND_REPLY_TO      — optional reply-to address
 *
 * Usage
 *   node site/test-fulfillment-alert.mjs
 */

import crypto from "node:crypto";
import { sendPurchaseNotification } from "./email.mjs";

// ── Config ────────────────────────────────────────────────────────────────────

const RESEND_FROM  = (process.env.RESEND_FROM  || "").trim();
const NOTIFY_EMAIL = (process.env.WAITLIST_NOTIFY_EMAIL || "").trim();

// Manual-fulfillment tiers that trigger a team notification.
const MANUAL_TIERS = [
  {
    id:       "mk3",
    product:  "marcom-kit",
    tierLabel: "Architecture Partner (retainer)",
  },
  {
    id:       "mk-sprint",
    product:  "marcom-kit",
    tierLabel: "Transformation Sprint (fixed four weeks)",
  },
  {
    id:       "mk-audit",
    product:  "marcom-kit",
    tierLabel: "Governance Risk Audit",
  },
];

// ── Assertion harness ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓  ${name}`);
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
    console.log(`  ✓  ${name}`);
    passed++;
  } else {
    const msg = `${name}: expected truthy, got ${JSON.stringify(actual)}`;
    console.error(`  ✗  ${msg}`);
    failures.push(msg);
    failed++;
  }
}

// ── Preflight ─────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(64)}`);
console.log("MarCom OS — fulfillment alert email test");
console.log("═".repeat(64));

const preflightErrors = [];
if (!RESEND_FROM)  preflightErrors.push("RESEND_FROM is not set");
if (!NOTIFY_EMAIL) preflightErrors.push("WAITLIST_NOTIFY_EMAIL is not set");

if (preflightErrors.length) {
  console.error("\n[fulfillment-alert-test] Missing prerequisites:");
  for (const e of preflightErrors) console.error(`  • ${e}`);
  console.error(
    "\nSet these env vars then re-run.\n" +
    "RESEND_FROM must be an address on a domain verified in your Resend account.\n" +
    "WAITLIST_NOTIFY_EMAIL is the internal inbox that receives fulfillment alerts.",
  );
  process.exit(1);
}

console.log(`\nSender:   ${RESEND_FROM}`);
console.log(`Notify:   ${NOTIFY_EMAIL}`);
console.log();

// ── Tests ─────────────────────────────────────────────────────────────────────

for (const tier of MANUAL_TIERS) {
  const runId = crypto.randomBytes(4).toString("hex").toUpperCase();
  const fakeKey = `MKS-TEST-${runId}-ALRT-0001`;
  const fakeEmail = `testbuyer+${runId.toLowerCase()}@example.com`;

  console.log(`── [${tier.id}] ${tier.tierLabel}`);
  console.log(`   buyer: ${fakeEmail}   key: ${fakeKey}`);

  let result;
  try {
    result = await sendPurchaseNotification({
      email:     fakeEmail,
      tierLabel: tier.tierLabel,
      product:   tier.product,
      key:       fakeKey,
    });
  } catch (err) {
    // sendPurchaseNotification should never throw — this would be a bug.
    result = { ok: false, error: `unexpected throw: ${err.message}` };
  }

  assertTruthy(`[${tier.id}] result returned`, result !== undefined && result !== null);
  assert(`[${tier.id}] Resend accepted the message (ok: true)`, result?.ok, true);

  if (!result?.ok) {
    console.error(`   error detail: ${result?.error || "(none)"}`);
  }
  console.log();
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log("═".repeat(64));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailures:");
  for (const f of failures) console.error(`  • ${f}`);
}
console.log("═".repeat(64));

if (failed > 0) {
  console.error(
    "\n[fulfillment-alert-test] One or more notification emails failed to deliver.\n" +
    "Check that RESEND_FROM is on a verified domain in Resend and that\n" +
    "WAITLIST_NOTIFY_EMAIL is a real, reachable address.\n",
  );
  process.exit(1);
}

console.log(
  "\n✅ All fulfillment alert emails delivered — the team will be notified\n" +
  "   when mk3, mk-sprint, or mk-audit purchases land.\n",
);
