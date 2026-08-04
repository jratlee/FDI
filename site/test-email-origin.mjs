#!/usr/bin/env node
/**
 * site/test-email-origin.mjs
 *
 * Unit tests for safeEmailOrigin — proves that a forged Host / X-Forwarded-Proto
 * header cannot poison outbound email URLs when SITE_ORIGIN is configured, and
 * that the server fails closed (throws) in production when SITE_ORIGIN is absent.
 *
 * No server boot, no network, no DB — pure unit tests.
 *
 * Usage
 *   node site/test-email-origin.mjs
 */

import assert from "node:assert/strict";
import { safeEmailOrigin } from "./email-origin.mjs";

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${label}`);
    console.error(`      ${err.message}`);
    failed++;
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const forgedReq = {
  headers: { host: "attacker.com", "x-forwarded-proto": "https" },
};
const devReq = {
  headers: { host: "localhost:5000" },
};
const CANONICAL = "https://falsedawn.industries";

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log("\nsite/email-origin.mjs — unit tests\n");

test("SITE_ORIGIN overrides a forged Host header (production)", () => {
  const result = safeEmailOrigin(forgedReq, CANONICAL, true);
  assert.equal(result, CANONICAL);
});

test("SITE_ORIGIN overrides a forged Host header (dev)", () => {
  const result = safeEmailOrigin(forgedReq, CANONICAL, false);
  assert.equal(result, CANONICAL);
});

test("SITE_ORIGIN overrides a forged X-Forwarded-Proto header (production)", () => {
  const req = { headers: { host: "falsedawn.industries", "x-forwarded-proto": "http" } };
  const result = safeEmailOrigin(req, CANONICAL, true);
  assert.equal(result, CANONICAL, "proto from header must not override SITE_ORIGIN");
});

test("Production without SITE_ORIGIN throws (fail-closed)", () => {
  assert.throws(
    () => safeEmailOrigin(forgedReq, "", true),
    /SITE_ORIGIN must be set in a production deployment/
  );
});

test("Production without SITE_ORIGIN throws even with benign Host", () => {
  const req = { headers: { host: "falsedawn.industries" } };
  assert.throws(
    () => safeEmailOrigin(req, "", true),
    /SITE_ORIGIN must be set in a production deployment/,
    "Must not trust Host even when it looks correct"
  );
});

test("Dev without SITE_ORIGIN falls back to request headers (local dev only)", () => {
  const result = safeEmailOrigin(devReq, "", false);
  assert.equal(result, "http://localhost:5000");
});

test("Dev without SITE_ORIGIN uses X-Forwarded-Proto when present", () => {
  const req = { headers: { host: "localhost:5000", "x-forwarded-proto": "https" } };
  const result = safeEmailOrigin(req, "", false);
  assert.equal(result, "https://localhost:5000");
});

test("SITE_ORIGIN trailing slashes are handled (caller pre-strips)", () => {
  // serve.mjs strips trailing slashes from SITE_ORIGIN at parse time; confirm
  // safeEmailOrigin returns whatever siteOrigin it receives unchanged.
  const result = safeEmailOrigin(forgedReq, "https://falsedawn.industries", false);
  assert.equal(result, "https://falsedawn.industries");
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
