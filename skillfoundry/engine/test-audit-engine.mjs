#!/usr/bin/env node
/**
 * Audit-engine regression tests.
 *
 * Verifies that the value-driver / vanity-metric heuristic correctly
 * distinguishes assets that *critique* vanity metrics from those that
 * rely on them, and that the LinkedIn thesis article scores defensibly.
 *
 * Run:
 *   node skillfoundry/engine/test-audit-engine.mjs
 *
 * Exits 0 if all assertions pass, 1 if any fail.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAudit } from "./audit.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "..", "examples", "fixtures");
const examplesDir = join(__dirname, "..", "examples");

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

function perfGate(report) {
  return report.gates.find((g) => g.gate === "performance");
}

function valueDriverScore(report) {
  return perfGate(report).subscores.find((s) => s.criterion === "value-driver linkage").points;
}

function hasHighVanityFinding(report) {
  return perfGate(report).ranked_reasons.some(
    (r) =>
      r.severity === "high" &&
      r.finding.includes("vanity metrics")
  );
}

// ── Test 1: thesis article ────────────────────────────────────────────────────
console.log("\nTest 1 — LinkedIn thesis article (critiques vanity metrics)");
{
  const text = readFileSync(
    join(__dirname, "..", "..", "exports", "field-guide-launch", "linkedin-thesis-article.md"),
    "utf8"
  );
  const report = runAudit(text, { title: "LinkedIn Thesis Article", source: "test" });
  const perf = perfGate(report);
  const vd = valueDriverScore(report);

  assert("Performance gate scores ≥ 65 (not unfairly failed)", perf.score >= 65, `got ${perf.score}`);
  assert("Value-driver linkage ≥ 50 (critique credit applied)", vd >= 50, `got ${vd}`);
  assert("No high 'vanity metrics' finding (article argues against them)", !hasHighVanityFinding(report));
  assert("Composite score ≥ 70", report.rollup.composite_score >= 70, `got ${report.rollup.composite_score}`);
}

// ── Test 2: explicit vanity-critique fixture ──────────────────────────────────
console.log("\nTest 2 — vanity-critique-asset fixture (argues against vanity metrics)");
{
  const text = readFileSync(join(fixturesDir, "vanity-critique-asset.md"), "utf8");
  const report = runAudit(text, { title: "Vanity Critique Asset", source: "test" });
  const vd = valueDriverScore(report);

  assert("Value-driver linkage ≥ 40 (critique not penalised)", vd >= 40, `got ${vd}`);
  assert("No high 'vanity metrics' finding", !hasHighVanityFinding(report));
}

// ── Test 3: genuinely vanity-framed fixture ───────────────────────────────────
console.log("\nTest 3 — vanity-approving-asset fixture (actually relies on vanity metrics)");
{
  const text = readFileSync(join(fixturesDir, "vanity-approving-asset.md"), "utf8");
  const report = runAudit(text, { title: "Vanity Approving Asset", source: "test" });
  const vd = valueDriverScore(report);

  assert("Value-driver linkage ≤ 35 (correctly penalised)", vd <= 35, `got ${vd}`);
  assert("High 'vanity metrics' finding fires", hasHighVanityFinding(report));
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed\n`);
process.exitCode = failed > 0 ? 1 : 0;
