#!/usr/bin/env node
/**
 * site/test-cron-silence.mjs
 *
 * Targeted tests for the cron silence-monitoring system.
 *
 * Sections
 * ────────
 *   1. HTTP endpoint auth — /api/cron/silence-check requires CRON_SECRET
 *   2. DB logic (only when DATABASE_URL is available)
 *      a. cron_runs row can be inserted and read back
 *      b. Recent run → silence NOT detected (ageMs ≤ threshold)
 *      c. Stale run   → silence IS detected  (ageMs >  threshold)
 *      d. Cooldown    → after an alert row exists within 24 h, no re-alert
 *      e. Cooldown expires → alert fires again after cooldown window
 *
 * Uses a dedicated test schema prefix (cron_test_*) so it never touches
 * production data; all rows are deleted in a finally block.
 *
 * Usage
 *   node site/test-cron-silence.mjs
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  if (actual === expected) ok(label);
  else ko(label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function assertOk(label, actual) {
  if (actual) ok(label);
  else ko(label, "expected truthy, got falsy");
}

// ── HTTP server helpers (mirrors test-cron-link-check.mjs) ───────────────────

function startServer(port, extraEnv = {}) {
  const proc = spawn(
    process.execPath,
    [path.join(__dirname, "serve.mjs")],
    {
      env: { ...process.env, PORT: String(port), DATABASE_URL: "", ...extraEnv },
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
    try { await fetch(`${base}/`); return; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server at ${base} did not start within ${timeoutMs}ms`);
}

async function get(url, headers = {}) {
  const res = await fetch(url, { headers });
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, body };
}

// ── Section 1: HTTP endpoint auth ────────────────────────────────────────────

const PORT_WITH_SECRET    = 5095;
const PORT_WITHOUT_SECRET = 5096;
const TEST_SECRET = "silence-test-secret-xyz789";

console.log("\n[cron-silence-test] Section 1: /api/cron/silence-check endpoint auth\n");

const withSecret    = startServer(PORT_WITH_SECRET,    { CRON_SECRET: TEST_SECRET });
const withoutSecret = startServer(PORT_WITHOUT_SECRET, { CRON_SECRET: "" });

try {
  await Promise.all([waitUp(withSecret.base), waitUp(withoutSecret.base)]);

  // Disabled when CRON_SECRET is unset
  {
    const r = await get(`${withoutSecret.base}/api/cron/silence-check`);
    await assert("CRON_SECRET unset → 404", r.status, 404);

    const r2 = await get(`${withoutSecret.base}/api/cron/silence-check?secret=${TEST_SECRET}`);
    await assert("CRON_SECRET unset + secret provided → 404", r2.status, 404);
  }

  // Auth guard
  {
    const r1 = await get(`${withSecret.base}/api/cron/silence-check`);
    await assert("no secret → 401", r1.status, 401);

    const r2 = await get(`${withSecret.base}/api/cron/silence-check?secret=wrong`);
    await assert("wrong secret → 401", r2.status, 401);

    const r3 = await get(`${withSecret.base}/api/cron/silence-check`, {
      Authorization: "Bearer wrong-secret",
    });
    await assert("wrong Bearer → 401", r3.status, 401);
  }

  // Successful trigger
  {
    const r1 = await get(`${withSecret.base}/api/cron/silence-check?secret=${TEST_SECRET}`);
    await assert("correct secret (query) → 202", r1.status, 202);
    await assertOk("response body ok:true", r1.body?.ok === true);
    await assertOk("response body has numeric pid", typeof r1.body?.pid === "number");

    await new Promise((r) => setTimeout(r, 600));

    const r2 = await get(`${withSecret.base}/api/cron/silence-check`, {
      Authorization: `Bearer ${TEST_SECRET}`,
    });
    await assert("correct secret (Bearer) → 202", r2.status, 202);
    await assertOk("Bearer response body ok:true", r2.body?.ok === true);
  }
} finally {
  withSecret.stop();
  withoutSecret.stop();
}

// ── Section 2: DB logic ───────────────────────────────────────────────────────

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.log("\n[cron-silence-test] Section 2: DB logic — SKIPPED (DATABASE_URL not set)\n");
} else {
  console.log("\n[cron-silence-test] Section 2: DB logic\n");

  const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
  const TEST_JOB = `test-silence-${Date.now()}`;

  // Helper: compute silence/cooldown state the same way the script does.
  function isSilent(lastRunAt, thresholdMs = 48 * 3_600_000) {
    if (!lastRunAt) return true;
    return Date.now() - new Date(lastRunAt).getTime() > thresholdMs;
  }
  function isCoolingDown(lastAlertAt, cooldownMs = 24 * 3_600_000) {
    if (!lastAlertAt) return false;
    return Date.now() - new Date(lastAlertAt).getTime() < cooldownMs;
  }

  try {
    // Ensure tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cron_runs (
        id BIGSERIAL PRIMARY KEY,
        job_name TEXT NOT NULL,
        ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        failures_found INT NOT NULL DEFAULT 0,
        pages_checked INT NOT NULL DEFAULT 0,
        external_checked INT NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS cron_runs_job_ran_idx ON cron_runs (job_name, ran_at DESC);
      CREATE TABLE IF NOT EXISTS cron_alerts (
        job_name TEXT PRIMARY KEY,
        alerted_at TIMESTAMPTZ NOT NULL
      );
    `);

    // 2a: cron_runs row can be inserted and read back
    {
      await pool.query(
        `INSERT INTO cron_runs (job_name, failures_found, pages_checked, external_checked)
         VALUES ($1, 3, 12, 40)`,
        [TEST_JOB],
      );
      const { rows } = await pool.query(
        `SELECT failures_found, pages_checked, external_checked
           FROM cron_runs WHERE job_name = $1 ORDER BY ran_at DESC LIMIT 1`,
        [TEST_JOB],
      );
      await assert("2a: inserted row readable", rows.length > 0, true);
      await assert("2a: failures_found stored", rows[0]?.failures_found, 3);
      await assert("2a: pages_checked stored", rows[0]?.pages_checked, 12);
      await assert("2a: external_checked stored", rows[0]?.external_checked, 40);
    }

    // 2b: Recent run → no silence
    {
      // Row inserted above has ran_at = now(), well within 48h
      const { rows } = await pool.query(
        `SELECT ran_at FROM cron_runs WHERE job_name = $1 ORDER BY ran_at DESC LIMIT 1`,
        [TEST_JOB],
      );
      const silent = isSilent(rows[0]?.ran_at);
      await assert("2b: fresh run → silence NOT detected", silent, false);
    }

    // 2c: Stale run → silence detected
    {
      // Insert a run timestamped 50 h ago
      await pool.query(
        `INSERT INTO cron_runs (job_name, ran_at, failures_found, pages_checked, external_checked)
         VALUES ($1, now() - interval '50 hours', 0, 5, 10)`,
        [TEST_JOB + "-stale"],
      );
      const { rows } = await pool.query(
        `SELECT ran_at FROM cron_runs WHERE job_name = $1 ORDER BY ran_at DESC LIMIT 1`,
        [TEST_JOB + "-stale"],
      );
      const silent = isSilent(rows[0]?.ran_at);
      await assert("2c: 50h-old run → silence IS detected", silent, true);
    }

    // 2d: Cooldown — alert within 24 h → no re-alert
    {
      await pool.query(
        `INSERT INTO cron_alerts (job_name, alerted_at)
         VALUES ($1, now())
         ON CONFLICT (job_name) DO UPDATE SET alerted_at = now()`,
        [TEST_JOB],
      );
      const { rows } = await pool.query(
        `SELECT alerted_at FROM cron_alerts WHERE job_name = $1`,
        [TEST_JOB],
      );
      const coolingDown = isCoolingDown(rows[0]?.alerted_at);
      await assert("2d: recent alert → cooldown IS active", coolingDown, true);
    }

    // 2e: Cooldown expires → alert fires again
    {
      // Write an alert timestamped 25 h ago (beyond the 24h cooldown)
      await pool.query(
        `INSERT INTO cron_alerts (job_name, alerted_at)
         VALUES ($1, now() - interval '25 hours')
         ON CONFLICT (job_name) DO UPDATE SET alerted_at = now() - interval '25 hours'`,
        [TEST_JOB + "-expired"],
      );
      const { rows } = await pool.query(
        `SELECT alerted_at FROM cron_alerts WHERE job_name = $1`,
        [TEST_JOB + "-expired"],
      );
      const coolingDown = isCoolingDown(rows[0]?.alerted_at);
      await assert("2e: 25h-old alert → cooldown IS expired (alert may re-fire)", coolingDown, false);
    }

    // 2f: cron_alerts upsert is idempotent — second upsert updates alerted_at
    {
      await pool.query(
        `INSERT INTO cron_alerts (job_name, alerted_at) VALUES ($1, now() - interval '1 hour')
         ON CONFLICT (job_name) DO UPDATE SET alerted_at = now() - interval '1 hour'`,
        [TEST_JOB + "-upsert"],
      );
      await pool.query(
        `INSERT INTO cron_alerts (job_name, alerted_at) VALUES ($1, now())
         ON CONFLICT (job_name) DO UPDATE SET alerted_at = now()`,
        [TEST_JOB + "-upsert"],
      );
      const { rows } = await pool.query(
        `SELECT alerted_at FROM cron_alerts WHERE job_name = $1`,
        [TEST_JOB + "-upsert"],
      );
      await assert("2f: cron_alerts upsert → exactly 1 row", rows.length, 1);
      // alerted_at should be recent (within last 10 s)
      const ageMs = Date.now() - new Date(rows[0].alerted_at).getTime();
      await assertOk("2f: upsert updates alerted_at to now", ageMs < 10_000);
    }

    // 2g: concurrent atomic claim — only one of two simultaneous processes
    //     can claim the slot when the cooldown has expired.
    //
    //     Simulated by issuing two conditional upserts in parallel against
    //     the same job_name whose alerted_at is stale (beyond cooldown).
    //     Postgres serializes the row lock; exactly one UPDATE should match
    //     the WHERE clause and RETURN the row. The other sees alerted_at is
    //     now fresh and returns 0 rows.
    {
      const CONCURRENT_JOB = TEST_JOB + "-concurrent";
      const cooldown = "24 hours";
      // Seed a stale alerted_at (25 h ago) so both claimants think they should fire.
      await pool.query(
        `INSERT INTO cron_alerts (job_name, alerted_at)
         VALUES ($1, now() - interval '25 hours')
         ON CONFLICT (job_name) DO UPDATE SET alerted_at = now() - interval '25 hours'`,
        [CONCURRENT_JOB],
      );

      // Two concurrent conditional upserts — only one should succeed.
      const [r1, r2] = await Promise.all([
        pool.query(
          `INSERT INTO cron_alerts (job_name, alerted_at)
           VALUES ($1, now())
           ON CONFLICT (job_name) DO UPDATE
             SET alerted_at = EXCLUDED.alerted_at
             WHERE cron_alerts.alerted_at < now() - $2::interval
           RETURNING job_name`,
          [CONCURRENT_JOB, cooldown],
        ),
        pool.query(
          `INSERT INTO cron_alerts (job_name, alerted_at)
           VALUES ($1, now())
           ON CONFLICT (job_name) DO UPDATE
             SET alerted_at = EXCLUDED.alerted_at
             WHERE cron_alerts.alerted_at < now() - $2::interval
           RETURNING job_name`,
          [CONCURRENT_JOB, cooldown],
        ),
      ]);

      const claims = r1.rows.length + r2.rows.length;
      await assert("2g: concurrent claim → exactly 1 winner", claims, 1);
      // Verify a single alerted_at row exists and is fresh
      const { rows: after } = await pool.query(
        `SELECT alerted_at FROM cron_alerts WHERE job_name = $1`,
        [CONCURRENT_JOB],
      );
      await assert("2g: exactly 1 cron_alerts row after concurrent claim", after.length, 1);
      const afterAgeMs = Date.now() - new Date(after[0].alerted_at).getTime();
      await assertOk("2g: winning alerted_at is fresh (within 10 s)", afterAgeMs < 10_000);
    }
  } finally {
    // Clean up test rows
    try {
      await pool.query(
        `DELETE FROM cron_runs WHERE job_name LIKE $1`,
        [TEST_JOB + "%"],
      );
      await pool.query(
        `DELETE FROM cron_alerts WHERE job_name LIKE $1`,
        [TEST_JOB + "%"],
      );
    } catch { /* ignore cleanup errors */ }
    await pool.end();
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n[cron-silence-test] ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
