/**
 * site/cron-silence-check.mjs
 *
 * Standalone silence monitor for the link-check cron job.
 *
 * Queries cron_runs to find the last recorded link-check run. If more than
 * SILENCE_THRESHOLD hours have passed with no run, atomically claims a
 * cooldown slot in cron_alerts (a single Postgres conditional upsert that is
 * safe under concurrent invocations), then sends a warning email. If the
 * email fails to deliver, the claim is reset so the next invocation retries.
 *
 * Concurrency safety
 * ──────────────────
 * The cooldown claim uses a conditional INSERT … ON CONFLICT DO UPDATE …
 * WHERE clause that Postgres evaluates atomically under a row lock. Two
 * simultaneous processes that both see a stale alerted_at will race for the
 * row; only the one that actually updates (the first to acquire the lock)
 * gets a RETURNING row back. The second sees 0 rows and skips. This
 * guarantees at-most-one alert per cooldown window regardless of concurrency.
 *
 * Design
 * ───────
 * - Never exits non-zero — a DB or email hiccup must not break any caller.
 * - Cooldown is stored in Postgres (cron_alerts table), not in process memory,
 *   so it is durable across deployments and consistent across instances.
 * - Meant to be triggered independently (separate cron job, Replit Scheduled
 *   Deployment, or via POST /api/cron/silence-check with CRON_SECRET), NOT
 *   as a timer inside the web server process.
 *
 * Environment
 * ────────────
 *   DATABASE_URL           Postgres connection string
 *   WAITLIST_NOTIFY_EMAIL  (via email.mjs) team alert destination
 *   RESEND_FROM            (via email.mjs) sender address
 *
 * Flags (override via env)
 *   SILENCE_THRESHOLD_H    Hours of silence before an alert fires (default 48)
 *   ALERT_COOLDOWN_H       Min hours between consecutive alerts (default 24)
 */

import pg from "pg";
import { sendCronSilenceAlert } from "./email.mjs";

const JOB_NAME = "link-check";
const SILENCE_THRESHOLD_MS = (Number(process.env.SILENCE_THRESHOLD_H) || 48) * 3_600_000;
const ALERT_COOLDOWN_MS    = (Number(process.env.ALERT_COOLDOWN_H)    || 24) * 3_600_000;

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[cron-silence-check] DATABASE_URL not set — skipping run.");
    return;
  }

  const pool = new pg.Pool({ connectionString: dbUrl, max: 1 });
  try {
    /* ---- ensure tables ---- */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cron_runs (
        id               BIGSERIAL PRIMARY KEY,
        job_name         TEXT NOT NULL,
        ran_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
        failures_found   INT NOT NULL DEFAULT 0,
        pages_checked    INT NOT NULL DEFAULT 0,
        external_checked INT NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS cron_runs_job_ran_idx
        ON cron_runs (job_name, ran_at DESC);

      CREATE TABLE IF NOT EXISTS cron_alerts (
        job_name   TEXT PRIMARY KEY,
        alerted_at TIMESTAMPTZ NOT NULL
      );
    `);

    /* ---- check last run ---- */
    const { rows: runRows } = await pool.query(
      `SELECT ran_at FROM cron_runs
        WHERE job_name = $1
        ORDER BY ran_at DESC LIMIT 1`,
      [JOB_NAME],
    );
    const lastRunAt = runRows[0]?.ran_at ?? null;
    const nowMs  = Date.now();
    const lastMs = lastRunAt ? new Date(lastRunAt).getTime() : null;
    const ageMs  = lastMs !== null ? nowMs - lastMs : Infinity;

    if (ageMs <= SILENCE_THRESHOLD_MS) {
      console.log(
        `[cron-silence-check] ${JOB_NAME} ran ${Math.round(ageMs / 3_600_000)}h ago — OK.`,
      );
      return;
    }

    /* ---- atomically claim the alert slot ----
     *
     * INSERT or UPDATE alerted_at ONLY when the existing value is older than
     * the cooldown window. Postgres evaluates the WHERE clause while holding
     * the row lock, so two concurrent invocations that both see a stale row
     * will race: only the first to acquire the lock succeeds (RETURNING has 1
     * row); the second sees alerted_at is now fresh and gets 0 rows back.
     *
     * We record the claim BEFORE sending the email so that even a timeout on
     * the Resend API cannot cause a second concurrent process to also claim
     * and double-send. If delivery fails, we reset the claim so it retries.
     */
    const cooldownInterval = `${ALERT_COOLDOWN_MS} milliseconds`;
    const { rows: claimed } = await pool.query(
      `INSERT INTO cron_alerts (job_name, alerted_at)
       VALUES ($1, now())
       ON CONFLICT (job_name) DO UPDATE
         SET alerted_at = EXCLUDED.alerted_at
         WHERE cron_alerts.alerted_at < now() - $2::interval
       RETURNING job_name`,
      [JOB_NAME, cooldownInterval],
    );

    if (!claimed.length) {
      // Another instance already claimed this window, or cooldown still active.
      const { rows: alertRows } = await pool.query(
        `SELECT alerted_at FROM cron_alerts WHERE job_name = $1`,
        [JOB_NAME],
      );
      const alertAgeMs = alertRows[0]?.alerted_at
        ? nowMs - new Date(alertRows[0].alerted_at).getTime()
        : 0;
      console.log(
        `[cron-silence-check] cooldown active ` +
        `(${Math.round(alertAgeMs / 3_600_000)}h since last alert) — skipping.`,
      );
      return;
    }

    /* ---- send alert ---- */
    const hoursSince = ageMs / 3_600_000;
    console.warn(
      `[cron-silence-check] no ${JOB_NAME} run recorded for ` +
      `${Math.round(hoursSince)}h — sending silence alert.`,
    );
    const delivered = await sendCronSilenceAlert({ lastRunAt, hoursSince });

    if (!delivered) {
      /* Email was suppressed (missing credentials) or failed (Resend error).
       * Reset the claim so the next scheduled invocation retries delivery
       * rather than sitting inside a cooldown window with no alert sent.
       */
      await pool.query(
        `UPDATE cron_alerts
            SET alerted_at = now() - $1::interval
          WHERE job_name = $2`,
        [cooldownInterval, JOB_NAME],
      );
      console.warn(
        "[cron-silence-check] alert delivery failed/skipped — claim reset for retry.",
      );
      return;
    }

    console.log("[cron-silence-check] alert sent and cooldown recorded in cron_alerts.");
  } catch (err) {
    console.error("[cron-silence-check] error:", err.message);
  } finally {
    try { await pool.end(); } catch { /* ignore */ }
  }
}

console.log(`[cron-silence-check] starting — ${new Date().toISOString()}`);
await run();
// Advisory: always exit 0
process.exit(0);
