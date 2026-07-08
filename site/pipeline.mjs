// Revenue pipeline tracker storage (internal admin tool).
// Tracks outreach targets from first touch to close against the bi-weekly
// revenue goal. Reuses the site's DATABASE_URL Postgres; auth is handled by
// the admin routes in serve.mjs (WAITLIST_ADMIN_TOKEN).
import pg from "pg";

const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 })
  : null;

export const pipelineConfigured = Boolean(pool);

// Ordered funnel. Stored values are the slugs; labels are for display.
export const STAGES = [
  ["target", "Target"],
  ["contacted", "Contacted"],
  ["discovery", "Discovery"],
  ["audit_proposal", "Audit/Proposal"],
  ["closed", "Closed"],
  ["lost", "Lost"],
];
const STAGE_SLUGS = new Set(STAGES.map(([s]) => s));

export const SEGMENTS = [
  ["agency-president", "Agency president"],
  ["cmo", "In-house CMO"],
  ["other", "Other"],
];
const SEGMENT_SLUGS = new Set(SEGMENTS.map(([s]) => s));

// Revenue goal the dashboard measures against.
export const GOAL = {
  amount: 5000, // dollars, bi-weekly
  label: "$5,000 bi-weekly",
  deadline: "2026-08-15",
};

let ready = null;
function ensureTable() {
  if (!pool) return Promise.resolve(false);
  if (!ready) {
    ready = pool
      .query(
        `CREATE TABLE IF NOT EXISTS pipeline_targets (
           id BIGSERIAL PRIMARY KEY,
           name TEXT NOT NULL,
           org TEXT NOT NULL DEFAULT '',
           segment TEXT NOT NULL DEFAULT 'other',
           stage TEXT NOT NULL DEFAULT 'target',
           value_usd INTEGER NOT NULL DEFAULT 0,
           next_action TEXT NOT NULL DEFAULT '',
           notes TEXT NOT NULL DEFAULT '',
           created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
           updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
         )`,
      )
      .then(() => true)
      .catch((err) => {
        console.error("[pipeline] table init failed:", err.message);
        ready = null;
        throw err;
      });
  }
  return ready;
}

const clamp = (s, n) => String(s == null ? "" : s).trim().slice(0, n);

// Normalize + validate a submitted target. Throws on hard errors.
export function cleanTarget(input) {
  const name = clamp(input.name, 120);
  if (!name) throw new Error("name_required");
  const stage = STAGE_SLUGS.has(input.stage) ? input.stage : "target";
  const segment = SEGMENT_SLUGS.has(input.segment) ? input.segment : "other";
  let value = Math.round(Number(input.value_usd));
  if (!Number.isFinite(value) || value < 0) value = 0;
  if (value > 10_000_000) value = 10_000_000;
  return {
    name,
    org: clamp(input.org, 120),
    segment,
    stage,
    value_usd: value,
    next_action: clamp(input.next_action, 300),
    notes: clamp(input.notes, 4000),
  };
}

export async function listTargets() {
  await ensureTable();
  const { rows } = await pool.query(
    `SELECT * FROM pipeline_targets
      ORDER BY array_position(ARRAY['audit_proposal','discovery','contacted','target','closed','lost'], stage),
               updated_at DESC`,
  );
  return rows;
}

export async function getTarget(id) {
  await ensureTable();
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  const { rows } = await pool.query(`SELECT * FROM pipeline_targets WHERE id = $1`, [n]);
  return rows[0] || null;
}

export async function saveTarget(id, input) {
  await ensureTable();
  const t = cleanTarget(input);
  const n = Number(id);
  if (Number.isInteger(n) && n > 0) {
    const { rowCount } = await pool.query(
      `UPDATE pipeline_targets
          SET name=$1, org=$2, segment=$3, stage=$4, value_usd=$5,
              next_action=$6, notes=$7, updated_at=now()
        WHERE id=$8`,
      [t.name, t.org, t.segment, t.stage, t.value_usd, t.next_action, t.notes, n],
    );
    return rowCount > 0 ? n : null;
  }
  const { rows } = await pool.query(
    `INSERT INTO pipeline_targets (name, org, segment, stage, value_usd, next_action, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [t.name, t.org, t.segment, t.stage, t.value_usd, t.next_action, t.notes],
  );
  return rows[0].id;
}

export async function deleteTarget(id) {
  await ensureTable();
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return false;
  const { rowCount } = await pool.query(`DELETE FROM pipeline_targets WHERE id = $1`, [n]);
  return rowCount > 0;
}

// Funnel counts + goal progress for the dashboard.
export async function pipelineStats() {
  await ensureTable();
  const { rows } = await pool.query(
    `SELECT stage, COUNT(*)::int AS count, COALESCE(SUM(value_usd),0)::int AS value
       FROM pipeline_targets GROUP BY stage`,
  );
  const byStage = Object.fromEntries(rows.map((r) => [r.stage, r]));
  const closed = byStage.closed || { count: 0, value: 0 };
  const open = rows
    .filter((r) => r.stage !== "closed" && r.stage !== "lost")
    .reduce((s, r) => s + r.value, 0);
  const daysLeft = Math.ceil(
    (new Date(`${GOAL.deadline}T23:59:59Z`) - Date.now()) / 86400000,
  );
  return {
    byStage,
    closedValue: closed.value,
    closedCount: closed.count,
    openValue: open,
    daysLeft,
    pct: Math.max(0, Math.min(100, Math.round((closed.value / GOAL.amount) * 100))),
  };
}
