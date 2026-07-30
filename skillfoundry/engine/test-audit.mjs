#!/usr/bin/env node
/**
 * Audit engine regression test.
 *
 * Proves that runAudit() produces schema-valid, internally consistent reports
 * across a spread of asset types, and that it is deterministic.
 *
 * Run:
 *   node skillfoundry/engine/test-audit.mjs
 *
 * Exits 0 if all assertions pass, 1 if any fail.
 */

import { runAudit } from "./audit.mjs";
import { validateReport } from "../schema/validate.mjs";

// ── helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function assertErrors(label, errors) {
  assert(label, errors.length === 0, errors.join("; "));
}

/**
 * Strip audited_at so two reports from the same asset can be compared for
 * determinism without caring about the wall-clock timestamp.
 */
function stripAuditedAt(report) {
  const copy = JSON.parse(JSON.stringify(report));
  if (copy.asset) delete copy.asset.audited_at;
  return copy;
}

// ── fixtures ─────────────────────────────────────────────────────────────────

const ASSETS = {
  empty: {
    text: "",
    meta: { title: "Empty asset" },
    label: "empty asset",
  },

  tiny: {
    text: "Revenue grows when CAC falls.",
    meta: { title: "Tiny one-liner" },
    label: "tiny asset (1 sentence)",
  },

  long_high_quality: {
    text: `
CMOs who renewed 2026 budgets on commoditized reach are the ones explaining the
miss in Q4 board reviews. According to Forrester (2025), companies that shifted
15% of media spend toward owned corpus and agent-callable interfaces saw 22%
lower CAC and 18% higher LTV within three quarters.

I ran this experiment at a mid-market B2B firm before the platform opacity hit.
We cut Facebook spend by $400k, built a structured content corpus, and shipped
a thin JSON API our sales engineers could query. Within six months, CAC dropped
from $3,200 to $2,100. That is not a model output — it's a P&L line.

The mechanism: when reach is commoditized, the only durable marketing assets are
the ones you own and can prove — a corpus, an identity, an interface an agent
can call. Every quarter you spend buying impressions raises the CAC you can't
lower and builds nothing you keep. That trade-off compounds negatively.

Before your next planning cycle, audit one asset you claim to own and ask
whether a competitor with a $10M LLM budget could replicate it in 30 days. If
yes, it is not yours — it is rented air. Start there.
    `.trim(),
    meta: { title: "Owned-asset thesis", source: "drafts/owned-asset.md" },
    label: "long high-quality asset",
  },

  spammy_llm_tells: {
    text: `
It's important to note that in today's fast-paced digital world, leveraging
cutting-edge, game-changing solutions is key to unlocking robust, seamless
growth. When it comes to marketing, everyone can benefit. Not only do
revolutionary campaigns elevate your brand, but they also delve into the realm
of transformative engagement. At the end of the day, this tapestry of insights
is a testament to the power of innovation. In conclusion, the landscape is ripe
for disruption. Follow me to get more.
    `.trim(),
    meta: { title: "LLM-tell spam" },
    label: "spammy AI-tell-laden asset",
  },

  cfr_with_vanity: {
    text: `
Our campaign generated 2 million impressions, massive reach, and incredible
engagement across social channels. Everyone loves our brand. We are the
best-in-class, world-class, revolutionary leader in the industry. Our
guaranteed results are unmatched.
    `.trim(),
    meta: { title: "Vanity metrics pitch" },
    label: "vanity-metric heavy asset",
  },

  contrarian_with_data: {
    text: `
The conventional wisdom is wrong. Studies show that more budget always helps —
but actually, the research (Binet & Field, 2013) shows that increasing reach
beyond an effective frequency threshold delivers diminishing returns. I measured
this directly: $200k of incremental spend above the 6-impression threshold
returned $0 in attributable pipeline, confirmed across three Q4 campaigns.

Contrary to the playbook, the 2024 Ebiquity attention study found the average
digital ad earns 2.5 seconds of active attention. However, a structured owned
corpus generated 8 minutes of active reading per session at a tenth of the cost.

CMOs defending budgets at board level should bring the CAC delta, not
impressions — the CFO already knows impressions don't close deals.
    `.trim(),
    meta: { title: "Contrarian media efficiency" },
    label: "contrarian data-backed asset",
  },
};

// ── gate order & names (must be stable) ─────────────────────────────────────

const EXPECTED_GATES = ["relevance", "performance", "signal"];

const GATE_WEIGHTS = { relevance: 0.4, performance: 0.35, signal: 0.25 };

// ── tests per asset ──────────────────────────────────────────────────────────

for (const [key, { text, meta, label }] of Object.entries(ASSETS)) {
  console.log(`\n── ${label} ──`);

  const report = runAudit(text, meta);

  // 1. Schema validity
  assertErrors(`schema valid`, validateReport(report));

  // 2. Exactly 3 gates in fixed order
  assert(
    `exactly 3 gates`,
    Array.isArray(report.gates) && report.gates.length === 3,
    `got ${report.gates?.length}`
  );
  for (let i = 0; i < EXPECTED_GATES.length; i++) {
    assert(
      `gate[${i}] is '${EXPECTED_GATES[i]}'`,
      report.gates[i]?.gate === EXPECTED_GATES[i],
      `got '${report.gates[i]?.gate}'`
    );
  }

  // 3. Each gate: verdict matches score threshold
  for (const g of report.gates ?? []) {
    const expectedVerdict =
      g.score >= 75 ? "PASS" : g.score >= 50 ? "REVISE" : "BLOCK";
    assert(
      `${g.gate} verdict matches score (score=${g.score} → ${expectedVerdict})`,
      g.verdict === expectedVerdict,
      `got verdict='${g.verdict}'`
    );
  }

  // 4. Composite uses 0.40/0.35/0.25 weights
  const [rel, perf, sig] = (report.gates ?? []).map((g) => g.score);
  const expectedComposite = Math.round(
    0.4 * rel + 0.35 * perf + 0.25 * sig
  );
  assert(
    `composite_score uses correct weights (expected ${expectedComposite})`,
    report.rollup?.composite_score === expectedComposite,
    `got ${report.rollup?.composite_score}`
  );

  // 5. ship_recommendation consistent with gate verdicts
  const gates = report.gates ?? [];
  const anyBlock = gates.some((g) => g.verdict === "BLOCK");
  const allPass = gates.every((g) => g.verdict === "PASS");
  const expectedRec = anyBlock ? "BLOCK" : allPass ? "SHIP" : "REVISE";
  assert(
    `ship_recommendation is '${expectedRec}'`,
    report.rollup?.ship_recommendation === expectedRec,
    `got '${report.rollup?.ship_recommendation}'`
  );

  // 6. top_moves has 3-5 entries
  const moves = report.rollup?.top_moves ?? [];
  assert(
    `top_moves has 3-5 entries (got ${moves.length})`,
    moves.length >= 3 && moves.length <= 5
  );

  // 7. top_moves ranks are 1-based and sequential
  const ranks = moves.map((m) => m.rank);
  const expectedRanks = ranks.map((_, i) => i + 1);
  assert(
    `top_moves ranks are sequential starting at 1`,
    JSON.stringify(ranks) === JSON.stringify(expectedRanks),
    `got [${ranks.join(",")}]`
  );

  // 8. Determinism — run a second time and compare (ignore audited_at)
  const report2 = runAudit(text, meta);
  assert(
    `deterministic (same input → same output)`,
    JSON.stringify(stripAuditedAt(report)) ===
      JSON.stringify(stripAuditedAt(report2))
  );
}

// ── determinism across distinct calls also checks meta edge cases ────────────

console.log("\n── meta edge cases ──");

{
  // No meta at all
  const r1 = runAudit("Revenue drives retention.", undefined);
  const r2 = runAudit("Revenue drives retention.", undefined);
  assertErrors("no meta — schema valid", validateReport(r1));
  assert(
    "no meta — deterministic",
    JSON.stringify(stripAuditedAt(r1)) === JSON.stringify(stripAuditedAt(r2))
  );
  assert(
    "no meta — title defaults to Untitled asset",
    r1.asset.title === "Untitled asset"
  );
}

{
  // Source present vs absent — must not crash
  const withSource = runAudit("CAC dropped 30%.", { title: "Test", source: "test.md" });
  const withoutSource = runAudit("CAC dropped 30%.", { title: "Test" });
  assertErrors("with source — schema valid", validateReport(withSource));
  assertErrors("without source — schema valid", validateReport(withoutSource));
  assert("with source — source in asset", withSource.asset.source === "test.md");
  assert("without source — source absent", !("source" in withoutSource.asset));
}

// ── summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(
    "\nFAIL — audit engine regression detected. A paying subscriber would receive a broken report."
  );
  process.exit(1);
}

console.log("\nPASS — audit engine produces schema-valid, consistent reports across all fixtures.");
