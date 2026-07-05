import pg from "pg";

/*
 * Retention purge for the waitlist.
 *
 * Retention policy: waitlist email addresses are kept for a bounded window and
 * then removed by default, so personal data is not held indefinitely. A signup
 * is exempt from the purge if it has "converted" — i.e. the same email appears
 * in the Skillfoundry entitlements table (a paying customer, kept as a
 * business record). Everything else older than the window is hard-deleted.
 *
 * Window: RETENTION_DAYS (default 730 days ~= 24 months). Override with the
 * WAITLIST_RETENTION_DAYS env var.
 *
 * Usage:
 *   node site/purge.mjs            # delete stale, unconverted signups
 *   node site/purge.mjs --dry-run  # report the count only, delete nothing
 *
 * Safe to run on a schedule (cron / Replit Scheduled Deployment). Logs counts
 * and the window only — never emails, tokens, or request bodies.
 */

const DEFAULT_RETENTION_DAYS = 730;
const retentionDays =
  Number(process.env.WAITLIST_RETENTION_DAYS) > 0
    ? Math.floor(Number(process.env.WAITLIST_RETENTION_DAYS))
    : DEFAULT_RETENTION_DAYS;

const dryRun = process.argv.includes("--dry-run");

export async function purgeStaleSignups({ pool, days = retentionDays, dry = false }) {
  // Conversion = the email exists in skillfoundry_entitlements (a paying
  // customer, kept as a business record). Check that the commerce table exists
  // first — Postgres parses the whole statement at plan time, so we can't
  // reference a missing table even behind a runtime guard.
  const reg = await pool.query(
    `SELECT to_regclass('public.skillfoundry_entitlements') AS t`,
  );
  const hasEntitlements = Boolean(reg.rows[0].t);

  // Only purge rows that (a) are older than the window AND (b) have NOT
  // converted.
  const convertedClause = hasEntitlements
    ? `AND NOT EXISTS (
         SELECT 1 FROM skillfoundry_entitlements e
          WHERE lower(e.email) = lower(waitlist_signups.email)
       )`
    : "";
  const where = `
    created_at < now() - ($1 || ' days')::interval
    ${convertedClause}`;

  if (dry) {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM waitlist_signups WHERE ${where}`,
      [String(days)],
    );
    return { deleted: 0, wouldDelete: rows[0].n, dryRun: true };
  }

  const result = await pool.query(
    `DELETE FROM waitlist_signups WHERE ${where}`,
    [String(days)],
  );
  return { deleted: result.rowCount, dryRun: false };
}

// Run directly (not when imported).
const isMain =
  process.argv[1] && process.argv[1].endsWith("purge.mjs");

if (isMain) {
  if (!process.env.DATABASE_URL) {
    console.error("[purge] DATABASE_URL is not set — nothing to do.");
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  try {
    const out = await purgeStaleSignups({ pool, days: retentionDays, dry: dryRun });
    if (out.dryRun) {
      console.log(
        `[purge] dry run: ${out.wouldDelete} stale, unconverted signup(s) older than ${retentionDays} days would be deleted.`,
      );
    } else {
      console.log(
        `[purge] deleted ${out.deleted} stale, unconverted signup(s) older than ${retentionDays} days.`,
      );
    }
  } catch (err) {
    console.error("[purge] failed:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
